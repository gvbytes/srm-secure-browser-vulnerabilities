# SRM Secure Browser — Security Notes
**App:** SRMUG-Secure-Browser v1.0.22 by Eduswitch Solutions  
**Analyzed:** app.asar extracted — 890 files, 416 JS, 25 Win32 EXEs

---

## Quick overview of what this app actually is

It's an Electron wrapper around a Chromium shell. The exam runs inside a `<webview>` tag. Around that webview sits a bunch of "security" — a preload script that bridges IPC between the exam page and the main process, several obfuscated JS renderers that handle webcam capture, screen recording, face detection (TensorFlow BlazeFace + Coco-SSD), Firebase connectivity, WebRTC to proctors, and a handful of Win32 native EXEs spawned as child processes for things like keyboard hooking and VM detection.

The core logic that matters sits in three layers:

- `preload.js` — plaintext, injects functions into the exam page's window, listens for postMessages
- `renderer.js` + `renderer-WebRtc.js` — obfuscated with a simple string-array shuffle (not hard to deobfuscate)
- `renderer-Exam.js` + `renderer-Login.js` — completely readable plaintext

`main.jsc` is compiled V8 bytecode via bytenode — that's the one I couldn't fully read without a decompiler.

---

## The actual problems

---

### 1. The encryption keys are just sitting there in the source

This was the first thing I noticed after deobfuscating `renderer.js`. The app encrypts the Firebase config and the ICE server credentials in transit — okay, fine — but then decrypts them right there in the renderer using **hardcoded AES-128 keys**:

```
REDACTED_FIREBASE_KEY   <- decrypts Firebase API keys / auth config
REDACTED_ICE_KEY        <- decrypts TURN/STUN ICE server credentials
```

Both are sitting in the obfuscated string table `_0x2d70`, recoverable in about 30 seconds by just running the deobfuscation loop in a browser console. To make it worse, the mode is **AES-ECB** — no IV, fully deterministic. Even if you didn't know the key, ECB leaks block structure patterns. But you do know the key, because it's in the app.

Once an attacker recovers the Firebase config and token flow, they can potentially initialize their own Firebase client and interact with the Realtime Database that stores proctoring state, student session metadata, and exam assignments. The public copy of this review intentionally redacts working key material and exploit-ready initialization code.

```js
// Redacted public example:
// 1. Remove hardcoded client-side keys.
// 2. Do not decrypt privileged service configuration in renderer code.
// 3. Enforce scoped Firebase security rules server-side.
```

---

### 2. The postMessage handler accepts commands from literally any origin

`preload.js` lines 101–122. The app listens for `window.postMessage` events from the exam page's iframe chain, which makes sense — it needs to receive signals like "start exam" or "stop exam" from the exam website. The problem is there's no origin check whatsoever:

```js
window.addEventListener('message', function (event) {
    // event.origin is never touched
    if (event.data.msg == "stop" || event.data.Action == "stop") {
        ipcRenderer.sendToHost('stop-proctoring');
    }
    if (event.data.msg == "start" || event.data.Action == "start") {
        ipcRenderer.sendToHost('start-proctoring', event.data);
    }
    // also handles "actualstart" and "opentab"
}, false);
```

So any script running anywhere in the page — a reflected XSS on the exam portal, a rogue iframe, or an injected script — can send a matching message and silently stop webcam/screen recording. The proctor's feed just goes dead. No error, no alert, nothing logged on the student side either.

The same trust issue also affects other lifecycle actions, including exam-start state and navigation commands. The fix is to validate `event.origin`, define a strict message schema, and reject all commands that do not come from the expected exam origin.

---

### 3. `window.StartTest` and `window.EndTest` are public globals

This is related to the above but distinct. In `preload.js` lines 6–15, the app does:

```js
window.StartTest = function (StudentInfoJSON) {
    ipcRenderer.sendToHost('start-proctoring', StudentInfoJSON);
}
window.EndTest = function () {
    ipcRenderer.sendToHost('stop-proctoring');
}
```

These get attached to the exam page's `window` before the page even loads. That exposes privileged proctoring controls to page-level scripts. A safer design would keep these controls inside the preload's isolated context and expose only a narrow, validated API.

---

### 4. The correct answers are on the client — all of them

This is the most straightforward one and honestly the most damaging from an exam integrity standpoint. Open `renderer-Exam.js`, look at lines 300–313:

```js
if (QuestionObj.CorrectAns == selectedOpt) {
    isAnswerCorrect = true;
} else {
    isAnswerCorrect = false;
}
QuestionObj.selectedOpt = selectedOpt;
QuestionObj.isAnswerCorrect = isAnswerCorrect;
```

The entire question object, including `CorrectAns`, is loaded from the server at exam start and stored in `localStorage` as `ExamQuestionsObj`. Correctness is then evaluated right here on the client. The `isAnswerCorrect` flag is set by the student's own browser and gets submitted back to the server inside `ExamAnswersJSON` — the server appears to trust it as-is.

At a high level, any client-side script with access to that local state can inspect answer metadata before submission:
```js
// Redacted: do not expose correct-answer fields to the client.
// The server should grade submissions independently.
```

The dangerous part is not only exposure; it is trust. If the server accepts correctness flags calculated by the browser, a manipulated client can submit forged scoring metadata. The fix is to keep correct answers and grading logic server-side:
```js
// Server-side grading model:
// client submits selected option IDs only
// server compares those selections against answer keys stored on the backend
```

---

### 5. DevTools aren't properly locked

There's a global called `DisableForegroundingFromMainForDebugging` that gates the blur-detection handler in `renderer-Login.js`:

```js
window.onblur = function () {
    if (DisableForegroundingFromMainForDebugging === false) {
        ipcRenderer.send('blur:application', true);
    }
}
```

This is a developer toggle that was left in. More importantly, nowhere in the readable source is there `webPreferences: { devTools: false }` in the BrowserWindow constructor. The actual window setup is in `main.jsc` which is bytecode, so I can't confirm either way — but the fact that this debug flag exists and is readable at runtime suggests DevTools is soft-blocked at best. On most older Electron builds, F12 or Ctrl+Shift+I will just open it.

---

### 6. They're running an old Electron

`preload.js` line 2:

```js
const remote = require('electron').remote;
```

`electron.remote` was deprecated in Electron 14 and fully removed in Electron 21. This app uses it, which pins it to Electron ≤20. That's a build from before 2023, which means it's carrying unpatched Chromium CVEs — there were several critical ones in 2022–2024 for Electron's age range.

On top of that, `remote.getGlobal('ProcessesRunning')` pulls a main-process global directly into the renderer. If you get XSS in the webview, that's a free read of whatever `ProcessesRunning` contains from the privileged main process context.

---

### 7. Firebase field writes aren't validated server-side

The renderer updates the student WebRTC/session record in Firebase, and that payload includes fields like `isExamEnded`, `isOnline`, `AllowScreenRecord`, and `proctorId`. These are all set by the client and written directly to the DB.

If the Firebase security rules are broad, a client could directly modify session-state fields that should be controlled by the backend:

```js
// Redacted public example:
// session visibility, recording permission, proctor assignment,
// and exam-ended flags must not be writable by the student client.
```

If rules are not scoped per user/session, the impact can extend beyond one student record. This should be enforced with least-privilege database rules and server-side validation.

---

### 8. VMDetect.exe is a toy

It's 15KB. Checks three things: CPUID hypervisor bit, SMBIOS/BIOS vendor strings, and presence of VM driver files on disk. Every single one of these is trivially spoofable:

- VMware, VirtualBox, QEMU — all have settings to mask the hypervisor CPUID bit
- Custom SMBIOS strings are supported by all major hypervisors
- Minimal VM installs don't have the guest driver files anyway

And even if the binary detects a VM, it is still just a child process whose result is consumed by the Electron app. Without stronger attestation, this kind of check should be treated as a weak signal rather than a security boundary.

---

### 9. The PrintScreen "protection" does nothing useful

`renderer-Login.js` lines 116–119 listens for keyCode 44 (PrintScreen) and overwrites the clipboard with an empty string. Two obvious problems: Win+Shift+S (Snipping Tool) doesn't produce keyCode 44. And the clipboard clear happens *after* the screenshot was already taken — whatever was captured is already in RAM, the clipboard is just one way to retrieve it. OBS, ShareX, a phone pointed at the screen, a second monitor — all bypass this completely.

---

### 10. The `request` module is deprecated and they're using it for token fetching

`package.json` lists `"request": "^2.87.0"`. This package has been deprecated since 2020 and has unresolved issues. More practically — it's used in `main/main-getallexamkeys.js` to pull Firebase tokens from the backend server over the network. If that endpoint is HTTP (no TLS, or TLS with a misconfigured cert), a MITM can serve a fake Firebase config pointing to an attacker-controlled project. Student logs into attacker's Firebase, attacker controls the session.

---

### 11. GPS location is collected silently in the background

Inside `renderer-WebRtc.js`, during WebRTC initialization, the app calls `navigator.geolocation.getCurrentPosition()` and POSTs the coordinates to `AssessmentConfig.SetStudentLocation`. It also writes them directly into Firebase under the student's UUID. No visible prompt, no disclosure in the UI, no mention in any obvious terms flow. The Electron shell can grant geolocation permission without the browser's normal permission dialog since it controls the window flags.

---

## Risk chaining scenario

Several of the findings become more serious when combined. Client-side answer exposure, weak renderer trust boundaries, unvalidated messaging, and client-writable session state can undermine both exam integrity and proctoring visibility. This public report intentionally avoids publishing a step-by-step bypass chain. The defensive takeaway is direct:

1. Keep answer keys and scoring logic on the server.
2. Validate every `postMessage` origin and message schema.
3. Remove privileged globals from the page context.
4. Scope Firebase rules to the authenticated student/session.
5. Disable DevTools and enforce integrity checks from the main process.
6. Treat renderer code as hostile, especially in Electron.

---

## Summary table

| # | Issue | Severity |
|---|-------|----------|
| 1 | Hardcoded AES-ECB keys in renderer (Firebase + ICE) | **Critical** |
| 2 | postMessage accepted from any origin — kills proctoring | **Critical** |
| 3 | StartTest/EndTest on public window global | **High** |
| 4 | Correct answers shipped to client, evaluated client-side | **Critical** |
| 5 | DevTools not hard-disabled, debug flag left in | **High** |
| 6 | Electron ≤20, deprecated remote module | **High** |
| 7 | Firebase fields (isOnline, isExamEnded, etc.) client-writable | **High** |
| 8 | VMDetect.exe — CPUID/SMBIOS/driver checks all bypassable | **Medium** |
| 9 | PrintScreen "wipe" only clears clipboard, not the screenshot | **Low** |
| 10 | Deprecated `request` module for token fetch — MITM risk | **Medium** |
| 11 | GPS collected and uploaded without any visible consent | **Medium** |

---

## What I didn't get to

`main.jsc` is 54KB of compiled V8 bytecode. That's where the kiosk mode setup, BrowserWindow creation, keyboard hooks, and most of the main process control flow lives. I'd need to run it through bytenode's decompiler or write a V8 snapshot extractor to get readable output. There could be more in there — particularly around how the window flags are set and whether there's any integrity checking on the renderer scripts before they load.
