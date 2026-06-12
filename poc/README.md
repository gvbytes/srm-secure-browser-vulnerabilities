# Vulnerability Proof of Concept (PoC) Tools

This directory contains functional Proof of Concept scripts and stubs for the vulnerabilities identified in the security review.

---

### 1. IPC Origin Bypass
- **File**: [bypass-poc.js](bypass-poc.js)
- **Description**: Demonstrates how a script executing on any origin can post messages to the Electron preload listener to kill webcam and desktop streams.
- **Execution**: Paste the payload into the browser console during an exam session:
  ```javascript
  window.postMessage({ msg: "stop" }, "*");
  ```

---

### 2. Answer Key Extraction and Auto-Scoring
- **File**: [extract-answers.js](extract-answers.js)
- **Description**: Extracts the plaintext answer key from `localStorage.getItem("ExamQuestionsObj")` and mutates answer selection flags to force a 100% score.
- **Execution**: Run in browser DevTools console during an exam session.

---

### 3. Config Decryption Utility
- **File**: [decrypt-config.js](decrypt-config.js)
- **Description**: Demonstrates how the hardcoded keys `keysefghijkldesk` and `icesefghijklmnop` decrypt Firebase endpoints and ICE configurations.
- **Execution**: Run with Node.js:
  ```bash
  node decrypt-config.js
  ```

---

### 4. VMDetect Bypass Stub
- **File**: [fake-vmdetect.cs](fake-vmdetect.cs)
- **Description**: A C# source code template for a dummy executable that replaces `VMDetect.exe` in local program files and mocks an "all-clear" system environment.
- **Compilation**:
  ```bash
  csc /target:exe /out:VMDetect.exe fake-vmdetect.cs
  ```
