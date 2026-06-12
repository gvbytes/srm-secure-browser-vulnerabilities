# Vulnerability Proof of Concept (PoC) Tools Suite

This directory contains functional Proof of Concept scripts and stubs for all 10 verified vulnerability vectors identified in the security assessment.

---

### 1. Extract Answer Key from localStorage
- **File**: [poc1-extract-answers.js](poc1-extract-answers.js)
- **Description**: Dumps all question objects and plaintext correct answers (`CorrectAns`) stored in `localStorage.getItem("ExamQuestionsObj")`.

### 2. Auto-Submit Perfect Score
- **File**: [poc2-autosubmit-score.js](poc2-autosubmit-score.js)
- **Description**: Mutates answer selections in `localStorage` and sets `isAnswerCorrect = true` for all questions prior to AJAX submission.

### 3. Silent Proctoring Kill via postMessage
- **File**: [poc3-proctoring-kill.js](poc3-proctoring-kill.js)
- **Description**: Dispatches `postMessage({ msg: "stop" }, "*")` to the unvalidated `preload.js` listener, terminating webcam and desktop recording feeds.

### 4. Abuse window.StartTest / window.EndTest Globals
- **File**: [poc4-window-globals-abuse.js](poc4-window-globals-abuse.js)
- **Description**: Demonstrates calling pre-attached global functions on the page `window` object to stop proctoring or reinitialize session state with forged metadata.

### 5. Decrypt Firebase Credentials with Hardcoded AES Key
- **File**: [poc5-decrypt-config.js](poc5-decrypt-config.js)
- **Description**: Node.js decryption utility using recovered static AES-128-ECB keys (`keysefghijkldesk` and `icesefghijklmnop`) to decrypt database and TURN configurations.

### 6. Disable Blur Detection via Debug Flag
- **File**: [poc6-disable-blur-detection.js](poc6-disable-blur-detection.js)
- **Description**: Sets `window.DisableForegroundingFromMainForDebugging = true` to neutralize window focus loss and alt-tab reporting.

### 7. Manipulate Firebase Session State
- **File**: [poc7-firebase-state-manipulation.js](poc7-firebase-state-manipulation.js)
- **Description**: Writes directly to Realtime Database nodes (`webrtc/students/{id}`) to set `isOnline: false` and `AllowScreenRecord: false`.

### 8. Silent GPS Location Extraction
- **File**: [poc8-silent-gps-extraction.js](poc8-silent-gps-extraction.js)
- **Description**: Demonstrates client-side geolocation extraction executed without permission dialogs inside the Electron shell.

### 9. VM Detection Bypass Stub
- **File**: [poc9-fake-vmdetect.cs](poc9-fake-vmdetect.cs)
- **Description**: C# source code template for a dummy executable that replaces `VMDetect.exe` in `app.asar.unpacked/` and mocks an "all-clear" JSON response.
- **Compilation**: `csc /target:exe /out:VMDetect.exe poc9-fake-vmdetect.cs`

### 10. Full Exam Integrity Bypass Chain
- **File**: [poc10-full-bypass-chain.js](poc10-full-bypass-chain.js)
- **Description**: Executes the end-to-end chained compromise vector (disable blur -> extract & mutate answers -> kill proctoring -> submit).
