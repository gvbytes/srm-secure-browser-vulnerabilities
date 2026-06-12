# Vulnerability Proof of Concept (PoC) Tools

This directory contains functional Proof of Concept scripts and stubs for the vulnerabilities identified in the security review.

---

### 1. IPC Origin Bypass (VULN-003)
- **File**: [bypass-poc.js](bypass-poc.js)
- **Description**: Demonstrates how a script executing on any origin can post messages to the Electron preload listener to kill webcam and desktop streams.
- **Execution**: Paste the payload into the browser console during an exam session.

---

### 2. Config Decryption Utility (VULN-005)
- **File**: [decrypt-config.js](decrypt-config.js)
- **Description**: Demonstrates how the hardcoded keys `keysefghijkldesk` and `icesefghijklmnop` are used to decrypt Firebase endpoints and ICE configurations.
- **Execution**: Run with Node.js:
  ```bash
  node decrypt-config.js
  ```

---

### 3. VMDetect Bypass Stub (VULN-008)
- **File**: [fake-vmdetect.cs](fake-vmdetect.cs)
- **Description**: A C# source code template for a dummy executable that replaces `VMDetect.exe` in the local program files and mocks an "all-clear" system environment.
- **Compilation**:
  ```bash
  csc /target:exe /out:VMDetect.exe fake-vmdetect.cs
  ```
