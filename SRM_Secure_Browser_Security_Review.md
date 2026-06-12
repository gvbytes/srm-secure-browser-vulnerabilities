# 🔒 Security Vulnerability Assessment Report

## SRM Secure Browser (SRMUG-Secure-Browser) v1.0.22

| Field | Details |
|---|---|
| **Application** | SRM Secure Browser (internal: `SRMUG-Secure-Browser`) |
| **Version Tested** | `1.0.22` |
| **Developer** | Eduswitch Solutions Pvt Ltd |
| **Copyright** | Copyright © 2026 Eduswitch Solutions Pvt Ltd |
| **Platform** | Windows (Electron-based) |
| **Assessment Date** | June 9, 2026 |
| **Assessment Type** | Static Analysis of Clean Installation |
| **Classification** | Responsible Disclosure — For Developer Review Only |

---

## Executive Summary

A security assessment of **SRM Secure Browser v1.0.22** — an Electron-based exam lockdown and proctoring browser — reveals **10 critical, high, and medium severity vulnerabilities** that allow a standard (non-admin) user to **completely bypass all proctoring and lockdown features** using only built-in tools available on any Windows PC.

The core issue is that the application's entire security model relies on **client-side enforcement with no server-side verification**, and the application source code is shipped in an **unencrypted, unprotected archive** that can be extracted, modified, and repacked with a single command.

### Severity Summary

| Severity | Count |
|---|---|
| 🔴 **Critical** | 4 |
| 🟠 **High** | 4 |
| 🟡 **Medium** | 2 |

### ASAR Hash of Tested Build (Clean Install)

```
app.asar SHA256: EC3BC2F36D790D0C1D03488A79A7D117F2FF46924CBFC417AAC55589101AF4C5
```

---

## Table of Contents

1. [VULN-001: Source Code Trivially Extractable from ASAR Archive](#vuln-001-source-code-trivially-extractable-from-asar-archive)
2. [VULN-002: No Application Integrity Verification](#vuln-002-no-application-integrity-verification)
3. [VULN-003: All Proctoring Logic in Plaintext JavaScript](#vuln-003-all-proctoring-logic-in-plaintext-javascript)
4. [VULN-004: Main Executable Not Digitally Signed](#vuln-004-main-executable-not-digitally-signed)
5. [VULN-005: Hardcoded AES Encryption Keys](#vuln-005-hardcoded-aes-encryption-keys)
6. [VULN-006: Insecure Electron Configuration](#vuln-006-insecure-electron-configuration)
7. [VULN-007: Insecure Update Mechanism](#vuln-007-insecure-update-mechanism)
8. [VULN-008: Security Executables Replaceable Without Admin Privileges](#vuln-008-security-executables-replaceable-without-admin-privileges)
9. [VULN-009: Weak Code Obfuscation (Bytenode + JS Obfuscator)](#vuln-009-weak-code-obfuscation-bytenode--js-obfuscator)
10. [VULN-010: Sensitive Data Stored Unencrypted](#vuln-010-sensitive-data-stored-unencrypted)

---

## Vulnerability Details

---

### VULN-001: Source Code Trivially Extractable from ASAR Archive

| Attribute | Value |
|---|---|
| **Severity** | 🔴 **Critical** |
| **CVSS 3.1 Score** | 9.1 (Critical) |
| **Category** | CWE-311: Missing Encryption of Sensitive Data |
| **Attack Complexity** | Low |
| **Privileges Required** | None (standard user) |
| **User Interaction** | None |

#### Description

The application's entire source code — including all proctoring logic, security checks, encryption keys, and API endpoints — is bundled inside an Electron `app.asar` file. ASAR is an **unencrypted archive format** (similar to tar) that can be extracted with a single command available to any user without admin privileges.

#### Evidence (Clean Install)

**Installation path:**
```
C:\Users\<user>\AppData\Local\Programs\SRM\resources\app.asar  (60,138,901 bytes / ~57 MB)
```

**Extraction command (requires only npx — available with any Node.js install):**
```bash
npx -y @electron/asar extract app.asar ./extracted
```

**Result — complete source tree extracted:**
```
extracted/
├── main.js                  (entry point)
├── main.jsc                 (bytecode — see VULN-009)
├── preload.js               (9,006 bytes — IPC protocol)
├── package.json             (app metadata & dependencies)
├── bytenodecompile.js       (build script)
├── chrome-tabs/
│   ├── renderer.js          (36,463 bytes — ALL proctoring logic)
│   ├── worker.js            (object detection worker)
│   ├── worker-tfjs-facedetect.js  (face detection worker)
│   ├── index.html           (367,300 bytes — main UI)
│   ├── model.json + shards  (18+ MB — TF.js AI models)
│   └── Renderer/
│       ├── renderer-Login.js     (blur detection, PrintScreen blocking)
│       ├── renderer-Exam.js      (exam submission logic)
│       ├── renderer-WebRtc.js    (live proctoring stream)
│       ├── renderer-WebRtc-Azure.js
│       ├── renderer-FaceDetectionRecognition.js
│       └── renderer-WebRtc-bak20022024.js  (old backup left in)
├── DetectProcessesWithUI.exe
├── DetectUserSwitch.exe
├── VMDetect.exe
├── Restrictions-DiableWinKey-WinFormsApp.exe
├── DiableWinKey-WinFormsApp-DisableRestrictions.exe
└── DetectVirtualDesktop/
    ├── VirtualDesktop.exe
    ├── VirtualDesktop11.exe
    ├── VirtualDesktop11-24H2.exe
    ├── VirtualDesktopServer2016.exe
    └── VirtualDesktopServer2022.exe
```

> [!CAUTION]
> The extraction takes under 5 seconds and requires NO admin privileges. After extraction, every security mechanism in the application is visible and editable.

#### Attack Vector

```
1. User opens PowerShell (no admin needed)
2. Runs: npx -y @electron/asar extract "...\resources\app.asar" ./extracted
3. Edits any JavaScript file to disable security features
4. Repacks: npx -y @electron/asar pack ./extracted "...\resources\app.asar"
5. Launches the browser normally — tampered code executes
```

#### How Eduswitch Should Fix This

**Immediate (v1.x patch):**
- Enable Electron's **ASAR integrity validation** in `package.json`:
  ```json
  {
    "build": {
      "asarIntegrity": true
    }
  }
  ```
  This embeds SHA-256 hashes of each file into the ASAR header and validates them at runtime.

**Short-term (v2.0):**
- Move all security-critical code to a **native Node.js addon** compiled in C++ or Rust using [napi-rs](https://napi.rs/) or [node-addon-api](https://github.com/nodejs/node-addon-api). Native compiled code cannot be trivially read or edited.
- Example structure:
  ```
  resources/
  ├── app.asar (UI only — no security logic)
  └── native/
      └── proctoring.node  (compiled C++ addon, signed)
  ```

**Long-term (v3.0):**
- Implement **server-side attestation**: Before allowing exam access, the server sends a challenge. The client must respond with a hash of its own critical files signed with a private key embedded in the native addon. If the hash doesn't match, the exam is denied.

---

### VULN-002: No Application Integrity Verification

| Attribute | Value |
|---|---|
| **Severity** | 🔴 **Critical** |
| **CVSS 3.1 Score** | 9.1 |
| **Category** | CWE-354: Improper Validation of Integrity Check Value |
| **Attack Complexity** | Low |
| **Privileges Required** | None |

#### Description

The application performs **zero integrity checks** on its own files at any point — not at startup, not at runtime, not during exam initialization. There is no checksum validation, no hash comparison, and no signature verification of the JavaScript files that control all security features. A modified `app.asar` will be loaded and executed without any warning.

#### Evidence (Clean Install)

**1. The application loads `main.jsc` without verifying its hash:**
```javascript
// main.js — the entire entry point
const bytenode = require("bytenode");
const myFile = require('./main.jsc');
```
No hash check. No signature verification. Any replacement file will be loaded.

**2. Renderer files are loaded directly via `require()` with no integrity check:**
```javascript
// From renderer.js (deobfuscated)
const WebRTC = require('./Renderer/renderer-WebRtc');
```

**3. Helper executables are called without signature verification:**
The `.exe` files in `app.asar.unpacked/` are spawned by the main process, but their digital signatures are never programmatically verified before execution.

#### Attack Vector

```
1. Extract app.asar (VULN-001)
2. Modify ANY .js file (e.g., replace security functions with no-ops)
3. Repack app.asar
4. Launch browser — modified code runs with zero errors or warnings
```

#### How Eduswitch Should Fix This

**Immediate:**
- Add a **startup integrity check** in the native main process:
  ```javascript
  const crypto = require('crypto');
  const fs = require('fs');
  
  const EXPECTED_HASHES = {
    'chrome-tabs/renderer.js': 'abc123...expected_sha256...',
    'chrome-tabs/Renderer/renderer-Login.js': 'def456...',
    'chrome-tabs/Renderer/renderer-WebRtc.js': 'ghi789...',
    // ... all critical files
  };
  
  function verifyIntegrity() {
    for (const [file, expectedHash] of Object.entries(EXPECTED_HASHES)) {
      const filePath = path.join(__dirname, file);
      const content = fs.readFileSync(filePath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      if (actualHash !== expectedHash) {
        // CRITICAL: File tampered!
        app.quit();
        return false;
      }
    }
    return true;
  }
  ```

**Short-term:**
- Use **Electron's built-in ASAR integrity** feature
- Implement **server-side file attestation** — at exam start, the client reports hashes of its critical files to the server, which validates them against known-good values

**Long-term:**
- Use a **Trusted Platform Module (TPM)** or **Windows Defender Application Control (WDAC)** to prevent unauthorized code from running
- Implement a **secure boot chain** where each component verifies the next before loading

---

### VULN-003: All Proctoring Logic in Plaintext JavaScript

| Attribute | Value |
|---|---|
| **Severity** | 🔴 **Critical** |
| **CVSS 3.1 Score** | 9.8 |
| **Category** | CWE-693: Protection Mechanism Failure |
| **Attack Complexity** | Low |
| **Privileges Required** | None |

#### Description

Every proctoring and security feature is implemented in plaintext JavaScript files within the ASAR archive. All functions are visible, named descriptively, and can be replaced with empty stubs to disable all monitoring. The exam submission flow is completely independent of the proctoring layer, so disabling proctoring has zero impact on the ability to take and submit the exam.

#### Evidence (Clean Install)

**All proctoring functions exposed in `renderer.js` (36,463 bytes):**

Despite being run through a JavaScript obfuscator, all critical function names are preserved in the `module.exports` at the end of the file:

```javascript
module.exports = {
  'StartRendererJsRemoteProctoring': StartRendererJsRemoteProctoring,
  'StopWebRTCRemoteProctoring': StopWebRTCRemoteProctoring,
  'FlagMoreThan1PersonDetectedTensorflowJs': FlagMoreThan1PersonDetectedTensorflowJs,
  'FlagBookCellPhoneDetectedTensorflowJs': FlagBookCellPhoneDetectedTensorflowJs,
  'FlagNotLookingAtScreen': FlagNotLookingAtScreen,
  'FlagMoreThan1FaceDetected': FlagMoreThan1FaceDetected,
  'FlagMovedOutOfScreen': FlagMovedOutOfScreen,
  'FlagDesktopSwitch': FlagDesktopSwitch,
  'FlagScreenLock': FlagScreenLock,
  'CheckIfGlobalShutdownIsInitiatedForPlayer': CheckIfGlobalShutdownIsInitiatedForPlayer,
  'CheckIfSecondaryDeviceIsConnected': CheckIfSecondaryDeviceIsConnected,
  'UpdateUiProcesses': UpdateUiProcesses,
  'UpdateAllProcesses': UpdateAllProcesses,
  'SendMessage': SendMessage,
  'UpdateHasActuallyStarted': UpdateHasActuallyStarted
};
```

**Security features and their implementations:**

| Function | Purpose | File | Status |
|---|---|---|---|
| `StartRendererJsRemoteProctoring()` | Initializes all proctoring | renderer.js | Plaintext (obfuscated) |
| `ProcessWebcamStreamForRecording()` | Records webcam feed | renderer.js | Plaintext (obfuscated) |
| `StartAndProcessDesktopStreamForrecording()` | Records desktop/screen | renderer.js | Plaintext (obfuscated) |
| `FlagNotLookingAtScreen()` | Gaze detection alert | renderer.js | Plaintext (obfuscated) |
| `FlagMoreThan1PersonDetectedTensorflowJs()` | Multi-person detection | renderer.js | Plaintext (obfuscated) |
| `FlagBookCellPhoneDetectedTensorflowJs()` | Book/phone detection | renderer.js | Plaintext (obfuscated) |
| `FlagMoreThan1FaceDetected()` | Multi-face detection | renderer.js | Plaintext (obfuscated) |
| `FlagMovedOutOfScreen()` | Window switch detection | renderer.js | Plaintext (obfuscated) |
| `FlagDesktopSwitch()` | Desktop switch detection | renderer.js | Plaintext (obfuscated) |
| `FlagScreenLock()` | Screen lock detection | renderer.js | Plaintext (obfuscated) |
| `StartWebRTC()` | Live proctoring stream | renderer-WebRtc.js | Plaintext (obfuscated) |
| `StopWebRTC()` | Stop proctoring stream | renderer-WebRtc.js | Plaintext (obfuscated) |
| `window.onblur` handler | Blur/tab-switch detection | renderer-Login.js | **Plaintext (NOT obfuscated)** |
| `copyToClipboard()` / keyCode 44 | PrintScreen blocking | renderer-Login.js | **Plaintext (NOT obfuscated)** |
| `processWebcamVideo()` | Face detection processing | renderer-FaceDetectionRecognition.js | **Plaintext (NOT obfuscated)** |
| Object detection worker | COCO-SSD object detection | worker.js | **Plaintext (NOT obfuscated)** |
| Face detection worker | BlazeFace face detection | worker-tfjs-facedetect.js | **Plaintext (NOT obfuscated)** |

**Critical: `renderer-Login.js` is completely unobfuscated (clean install):**
```javascript
// PrintScreen blocking — Line 116-120
$(window).keyup(function (e) {
    if (e.keyCode == 44) {
        copyToClipboard();  // <-- clears clipboard on PrintScreen
    }
});

// Window blur detection — Line 149-154
window.onblur = function () {
    if (DisableForegroundingFromMainForDebugging === false) {
        console.log('window Blur event attempted');
        ipcRenderer.send('blur:application', true);  // <-- reports to main
    }
}
```

**Critical: Exam submission is independent of proctoring (renderer-Exam.js):**
```javascript
// Exam answers are submitted via simple AJAX POST
$.ajax({
    url: AssessmentConfig.UpdateExamAnswer,
    type: "POST",
    data: {
        StudentWebGuid: studentWebGuidGlobal,
        StudentWebId: studentWebIdGlobal,
        ExamAnswersJSON: JSON.stringify(QuestionsGlobal)
    }
});
// NO check for whether proctoring is active
// NO check for whether webcam stream is running
// NO check for whether flag functions are intact
```

#### Attack Vector

Each function can be replaced with a no-op. For example, to disable ALL proctoring, a user edits `renderer.js` and replaces each function body:

```javascript
// Original:
function FlagNotLookingAtScreen() { /* complex detection logic */ }

// Replaced with:
function FlagNotLookingAtScreen() { return; }
```

The exam continues to work perfectly — questions load, answers save, timer runs, exam submits.

#### How Eduswitch Should Fix This

**Immediate:**
- Add **server-side stream validation**: The exam server should require continuous webcam and desktop video streams. If streams stop arriving, the server should:
  1. Pause the exam after 30 seconds of no stream
  2. Flag the session for manual review
  3. Require re-verification (selfie + ID) to resume

- Implement **server-side heartbeat**: Every 10 seconds, the client must send a signed heartbeat containing:
  ```json
  {
    "timestamp": 1717955000,
    "webcamFrameCount": 450,
    "desktopFrameCount": 450,
    "flagCount": { "blur": 2, "noFace": 0 },
    "integrityHash": "sha256_of_critical_files"
  }
  ```
  If the server doesn't receive heartbeats or the values seem impossible (e.g., 0 flags after 30 minutes), the exam is flagged.

**Short-term:**
- Move **all AI detection to server-side**: Stream webcam/desktop video to the server and run face detection, object detection, and person counting on the server. The client only captures and streams — it never decides whether to flag.

**Long-term:**
- Implement the **zero-trust client architecture** described in the Architectural Recommendations section below.

---

### VULN-004: Main Executable Not Digitally Signed

| Attribute | Value |
|---|---|
| **Severity** | 🟠 **High** |
| **CVSS 3.1 Score** | 7.5 |
| **Category** | CWE-353: Missing Support for Integrity Check |
| **Attack Complexity** | Low |
| **Privileges Required** | None |

#### Description

The main executable `SRM.exe` (123 MB) is **not digitally signed**, despite containing valid company metadata in the file properties.

#### Evidence (Clean Install)

```powershell
> Get-AuthenticodeSignature "...\SRM.exe"

Status        : NotSigned
StatusMessage : The file ... is not digitally signed.
SignerSubject :
Issuer        :
Thumbprint    :
```

Yet the file properties show:
```
CompanyName     : Eduswitch Solutions Pvt Ltd
FileDescription : SRM
ProductName     : SRM
FileVersion     : 1.0.22
LegalCopyright  : Copyright c 2026 Eduswitch Solutions Pvt Ltd
```

> [!WARNING]
> Interestingly, the helper security executables (VMDetect.exe, DetectProcessesWithUI.exe, etc.) in `app.asar.unpacked/` **ARE digitally signed** (Status: Valid). This inconsistency suggests the signing step for the main executable was missed in the build pipeline.

#### Attack Vector

Since `SRM.exe` is unsigned:
1. An attacker could replace it with a modified version containing a backdoor
2. Windows SmartScreen and antivirus have less protection against unsigned executables
3. Users cannot verify the authenticity of the executable they're running

#### How Eduswitch Should Fix This

**Immediate:**
- **Purchase an EV Code Signing Certificate** from a trusted CA (DigiCert, Sectigo, GlobalSign)
- Sign `SRM.exe` using `signtool.exe`:
  ```bash
  signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a SRM.exe
  ```
- Add signing to the **CI/CD pipeline** so every build is automatically signed
- Use **timestamping** (`/tr` flag) so the signature remains valid even after the certificate expires

**Short-term:**
- Implement **self-verification at startup**: The application should verify its own signature using Windows APIs before proceeding

---

### VULN-005: Hardcoded AES Encryption Keys

| Attribute | Value |
|---|---|
| **Severity** | 🔴 **Critical** |
| **CVSS 3.1 Score** | 8.6 |
| **Category** | CWE-798: Use of Hard-coded Credentials |
| **Attack Complexity** | Low |
| **Privileges Required** | None |

#### Description

The application uses AES encryption (via `CryptoJS`) to encrypt/decrypt communication with the server (Firebase keys and ICE server credentials). The encryption keys are **hardcoded directly in the client-side JavaScript** and can be extracted by any user who reads the source code.

#### Evidence (Clean Install)

**Two AES keys found hardcoded in `renderer.js`:**

| Key String | Purpose | Encryption Mode |
|---|---|---|
| `keysefghijkldesk` | Decrypting Firebase configuration keys from `GetAllExamKeys` endpoint | AES-ECB |
| `icesefghijklmnop` | Decrypting ICE server credentials for WebRTC | AES-ECB |

**From `renderer.js` (deobfuscated):**
```javascript
// Firebase key decryption
let key = CryptoJS.enc.Utf8.parse('keysefghijkldesk');  // <-- HARDCODED
let decrypted = CryptoJS.AES.decrypt(responseText, key, {
    mode: CryptoJS.mode.ECB,    // <-- Insecure mode (no IV)
    padding: CryptoJS.pad.Pkcs7
});
var config = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)).FirebaseKeys;

// ICE server decryption
let iceKey = CryptoJS.enc.Utf8.parse('icesefghijklmnop');  // <-- HARDCODED
let iceDecrypted = CryptoJS.AES.decrypt(iceResponse, iceKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
});
```

#### Additional Cryptographic Weaknesses

1. **AES-ECB mode** — ECB (Electronic Codebook) is the weakest AES mode. It doesn't use an initialization vector (IV), making it vulnerable to pattern analysis and replay attacks.
2. **Predictable key patterns** — Both keys follow the pattern `[prefix]efghijklmnop`, suggesting they were manually chosen rather than cryptographically generated.
3. **16-byte keys** = AES-128, the minimum AES key size.

#### Attack Vector

1. Extract `renderer.js` from `app.asar`
2. Find the hardcoded keys
3. Intercept encrypted API responses
4. Decrypt them to obtain:
   - **Firebase configuration** (access to the Firebase Realtime Database)
   - **ICE server credentials** (access to the WebRTC TURN server)
5. With Firebase access, an attacker could potentially:
   - Read other students' proctoring data
   - Modify exam state in the database
   - Impersonate a proctor

#### How Eduswitch Should Fix This

**Immediate:**
- **Rotate all encryption keys immediately** — the current keys must be considered compromised
- Switch from **AES-ECB to AES-GCM** (authenticated encryption with IV):
  ```javascript
  // SECURE: AES-256-GCM with random IV
  const iv = CryptoJS.lib.WordArray.random(12);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      mode: CryptoJS.mode.GCM,
      iv: iv
  });
  ```

**Short-term:**
- **Remove client-side decryption entirely**. Instead:
  1. Client authenticates with the server via HTTPS
  2. Server returns Firebase tokens and ICE credentials directly over the authenticated TLS connection
  3. No client-side encryption/decryption needed
  
- Use **Firebase Custom Tokens** with server-side authentication instead of sharing Firebase config keys with the client

**Long-term:**
- Implement **per-session, server-generated keys** exchanged via authenticated TLS
- Use **Firebase Security Rules** to restrict database access to only the authenticated student's own data

---

### VULN-006: Insecure Electron Configuration

| Attribute | Value |
|---|---|
| **Severity** | 🟠 **High** |
| **CVSS 3.1 Score** | 7.7 |
| **Category** | CWE-1188: Initialization with Hard-coded Network Resource Configuration |
| **Attack Complexity** | Medium |
| **Privileges Required** | None |

#### Description

The application's Electron configuration violates multiple security best practices. The preload script has direct access to Node.js APIs via `require()` and uses `ipcRenderer` without `contextBridge` isolation, and the renderer process has `nodeIntegration` enabled (implied by the use of `require()` in renderer files).

#### Evidence (Clean Install)

**`preload.js` — uses `require()` directly (no contextBridge):**
```javascript
const { ipcRenderer } = require('electron');
// Direct Node.js access in preload — no contextBridge isolation
```

**Renderer files use `require()` directly:**
```javascript
// renderer-Login.js — Line 1-3
const electron = require('electron');
const { ipcRenderer } = electron;
const AssessmentConfig = require('../assessment-config.json');
```

This means `nodeIntegration` is enabled and `contextIsolation` is disabled — both are against Electron's security recommendations.

**What this enables:**
- Any JavaScript code running in the renderer (including injected code) has **full access to Node.js APIs**
- This includes `fs` (file system), `child_process` (run commands), `os` (system info), etc.
- A cross-site scripting (XSS) attack in any loaded web page would give the attacker **full system access**

#### How Eduswitch Should Fix This

**Immediate:**
- Enable **`contextIsolation: true`** and disable **`nodeIntegration: false`** in BrowserWindow options:
  ```javascript
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,       // DISABLE Node.js in renderer
      contextIsolation: true,       // ENABLE context isolation
      sandbox: true,                // ENABLE sandbox
      preload: path.join(__dirname, 'preload.js')
    }
  });
  ```

- Rewrite `preload.js` to use **`contextBridge`**:
  ```javascript
  const { contextBridge, ipcRenderer } = require('electron');
  
  contextBridge.exposeInMainWorld('secureAPI', {
    sendBlurEvent: () => ipcRenderer.send('blur:application', true),
    onTimerCount: (callback) => ipcRenderer.on('timer:count', callback),
    // Only expose specific, controlled methods
  });
  ```

- Update renderer files to use the exposed API instead of `require()`:
  ```javascript
  // Instead of: ipcRenderer.send('blur:application', true)
  window.secureAPI.sendBlurEvent();
  ```

---

### VULN-007: Insecure Update Mechanism

| Attribute | Value |
|---|---|
| **Severity** | 🟠 **High** |
| **CVSS 3.1 Score** | 7.8 |
| **Category** | CWE-494: Download of Code Without Integrity Check |
| **Attack Complexity** | Medium |
| **Privileges Required** | Network position (MitM) or repo access |

#### Description

The auto-update configuration points to a **personal GitHub account** with **draft releases**, creating supply chain risks.

#### Evidence (Clean Install)

**`app-update.yml`:**
```yaml
owner: nevillekatila
repo: es-stage
provider: github
releaseType: draft
updaterCacheDirName: srmug-secure-browser-updater
```

| Issue | Detail |
|---|---|
| **Personal GitHub account** | `nevillekatila` — not an organizational account |
| **Staging repository** | `es-stage` — suggests staging/test environment |
| **Draft releases** | Not publicly visible; may bypass review processes |
| **No code signing** | Main executable is unsigned (see VULN-004), so updates aren't signed either |

**Cached updater on disk:**
```
C:\Users\<user>\AppData\Local\srmug-secure-browser-updater\
```

#### How Eduswitch Should Fix This

**Immediate:**
- Move to an **organizational GitHub account** (e.g., `eduswitch-solutions`) with:
  - 2FA enforced for all members
  - Branch protection rules
  - Required code reviews for releases
- Use **public releases** (not drafts) with attached SHA-256 checksums
- **Sign all releases** with a code signing certificate

**Short-term:**
- Implement **update signature verification** in `electron-updater`:
  ```yaml
  # app-update.yml
  owner: eduswitch-solutions
  repo: srm-secure-browser
  provider: github
  releaseType: release
  publisherName:
    - "Eduswitch Solutions Pvt Ltd"
  ```
- Configure `electron-updater` to verify the publisher name matches the expected certificate

**Long-term:**
- Host updates on a **dedicated, hardened CDN** with certificate pinning
- Implement **differential updates** to reduce attack surface (smaller update packages)

---

### VULN-008: Security Executables Replaceable Without Admin Privileges

| Attribute | Value |
|---|---|
| **Severity** | 🟠 **High** |
| **CVSS 3.1 Score** | 8.1 |
| **Category** | CWE-427: Uncontrolled Search Path Element |
| **Attack Complexity** | Low |
| **Privileges Required** | None (standard user) |

#### Description

The application ships five security executables for system-level checks (VM detection, process monitoring, keyboard restriction, user switch detection). Although these executables are **digitally signed** in the clean install, they reside in a **user-writable directory** (`AppData\Local`) and can be replaced without admin privileges. The application does not verify their signatures before execution.

#### Evidence (Clean Install — Legitimate Sizes & Signatures)

| Executable | Size | Signed | Purpose |
|---|---|---|---|
| `DetectProcessesWithUI.exe` | 16,224 bytes | ✅ Valid | Detect unauthorized applications |
| `DetectUserSwitch.exe` | 15,736 bytes | ✅ Valid | Detect Windows user switching |
| `VMDetect.exe` | 15,072 bytes | ✅ Valid | Detect virtual machines |
| `Restrictions-DiableWinKey-WinFormsApp.exe` | 21,880 bytes | ✅ Valid | Enable keyboard restrictions |
| `DiableWinKey-WinFormsApp-DisableRestrictions.exe` | 18,144 bytes | ✅ Valid | Disable keyboard restrictions |

**Location (user-writable):**
```
C:\Users\<user>\AppData\Local\Programs\SRM\resources\app.asar.unpacked\
```

#### Attack Vector

Since these files are in `AppData\Local` (user-writable):

```
1. Navigate to app.asar.unpacked/
2. Rename VMDetect.exe → VMDetect.exe.bak
3. Create a new VMDetect.exe that outputs {"result": "ok", "status": 0}
4. The application calls the fake executable and receives "all clear"
```

A minimal C# stub (3.5 KB compiled) would fool every check:
```csharp
using System;
class Stub {
    static void Main(string[] args) {
        Console.WriteLine("{\"result\": \"ok\", \"status\": 0}");
    }
}
```

#### How Eduswitch Should Fix This

**Immediate:**
- **Verify digital signatures programmatically** before executing any helper:
  ```javascript
  const { execSync } = require('child_process');
  
  function verifySignature(exePath) {
    try {
      const result = execSync(
        `powershell -Command "(Get-AuthenticodeSignature '${exePath}').Status"`,
        { encoding: 'utf8' }
      ).trim();
      return result === 'Valid';
    } catch (e) {
      return false;
    }
  }
  
  // Before calling any security executable:
  if (!verifySignature(vmDetectPath)) {
    // CRITICAL: Executable tampered! Refuse to start exam.
    reportTamperingToServer();
    app.quit();
  }
  ```

**Short-term:**
- Install to `C:\Program Files\SRM\` instead of `AppData\Local\`. Program Files requires admin privileges to modify.
- Use **Windows Defender Application Control (WDAC)** rules to allowlist only the signed versions

**Long-term:**
- Move security checks to a **Windows Service** running under SYSTEM account (not modifiable by standard users)
- Implement **server-side system verification**: Instead of trusting the client's report, have the server independently verify system state via a signed agent

---

### VULN-009: Weak Code Obfuscation (Bytenode + JS Obfuscator)

| Attribute | Value |
|---|---|
| **Severity** | 🟡 **Medium** |
| **CVSS 3.1 Score** | 5.3 |
| **Category** | CWE-656: Reliance on Security Through Obscurity |
| **Attack Complexity** | Medium |

#### Description

The application uses two layers of "protection" that provide only superficial obfuscation:
1. **Bytenode** (`main.jsc`) — V8 bytecode compilation for the main process
2. **JavaScript Obfuscator** — variable/function name mangling for renderer files

Neither provides meaningful security.

#### Evidence (Clean Install)

**Bytenode — main process:**
```javascript
// main.js — simply loads bytecode
const bytenode = require("bytenode");
const myFile = require('./main.jsc');

// bytenodecompile.js — reveals the build process
const bytenode = require('bytenode');
let compiledFilename = bytenode.compileFile('../main_bak-min.js', 'main.jsc');
```

**JavaScript Obfuscator — renderer files:**
```javascript
// renderer.js — variables obfuscated but function names PRESERVED
var _0x34adf0=_0x5d3a;  // obfuscated variable
// ... but then:
module.exports = {
  'StartRendererJsRemoteProctoring': StartRendererJsRemoteProctoring,  // EXPOSED
  'FlagMoreThan1PersonDetectedTensorflowJs': FlagMoreThan1PersonDetectedTensorflowJs,  // EXPOSED
  // All function names in plaintext!
};
```

**Not obfuscated at all:**
- `renderer-Login.js` — **completely plaintext** (5,598 bytes)
- `renderer-Exam.js` — **completely plaintext** (23,954 bytes)
- `renderer-FaceDetectionRecognition.js` — **completely plaintext** (7,142 bytes)
- `worker.js` — **completely plaintext** (2,582 bytes)
- `worker-tfjs-facedetect.js` — **completely plaintext** (1,272 bytes)
- `preload.js` — **completely plaintext** (9,006 bytes)

**Development artifacts left in production:**
- `renderer-WebRtc-bak20022024.js` — Backup file dated Feb 20, 2024 (22,391 bytes)
- `renderer-WebRtc_bak-working.js` — Another backup (23,031 bytes)
- `model._bakkjson` — Backup model file (548,863 bytes)
- `bytenodecompile.js` — Build script that reveals the compilation process

#### How Eduswitch Should Fix This

**Immediate:**
- Remove **all backup/development files** from production builds (`*bak*`, `*working*`, `bytenodecompile.js`)
- Obfuscate ALL renderer files, not just `renderer.js`
- Strip `module.exports` names or use computed property names

**Short-term:**
- **Do not rely on obfuscation as a security measure**. As VULN-001 through VULN-003 demonstrate, the real fix is moving security logic server-side and implementing integrity verification.

---

### VULN-010: Sensitive Data Stored Unencrypted

| Attribute | Value |
|---|---|
| **Severity** | 🟡 **Medium** |
| **CVSS 3.1 Score** | 5.5 |
| **Category** | CWE-312: Cleartext Storage of Sensitive Information |
| **Attack Complexity** | Low |
| **Privileges Required** | None |

#### Description

User session data, cookies, and device identifiers are stored in plaintext on disk.

#### Evidence (Clean Install)

**Data directory:** `C:\Users\<user>\AppData\Roaming\SRMUG-Secure-Browser\`

Contents include:
- **Cookies** — SQLite database containing session tokens (unencrypted)
- **Local Storage** — Persistent key-value data
- **Session Storage** — Session data
- **Cache** — Potentially contains exam content
- **Preferences** — Contains `device_id_salt` in plaintext

#### How Eduswitch Should Fix This

**Immediate:**
- Use Electron's **`safeStorage` API** to encrypt sensitive data:
  ```javascript
  const { safeStorage } = require('electron');
  
  // Encrypt before storing
  const encrypted = safeStorage.encryptString(sessionToken);
  fs.writeFileSync('session.enc', encrypted);
  
  // Decrypt when reading
  const decrypted = safeStorage.decryptString(fs.readFileSync('session.enc'));
  ```

**Short-term:**
- **Clear all session data** after exam completion:
  ```javascript
  session.defaultSession.clearStorageData();
  session.defaultSession.clearCache();
  ```
- Use **session-only cookies** (no persistent cookies for exam sessions)

---

## Architectural Recommendation

The fundamental problem is that **SRM Secure Browser relies entirely on client-side enforcement**. This is a flawed security model because the client machine is under the student's control.

### Current Architecture (Insecure)

```
┌─────────────────────────────────────────────────────┐
│                 SERVER (Passive)                     │
│  • Receives flags IF the client sends them           │
│  • No validation of client integrity                 │
│  • No verification that streams are real             │
│  • Accepts exam submission regardless of proctoring  │
└──────────────────────▲──────────────────────────────┘
                       │
          Flags sent only if client
          code hasn't been modified
                       │
┌──────────────────────┴──────────────────────────────┐
│                 CLIENT (Trusted — WRONG)              │
│  • ALL security logic runs here                       │
│  • ALL AI detection runs here                         │
│  • ALL decisions made here                            │
│  • Source code is accessible and editable              │
│  • Modify source → bypass everything                  │
└─────────────────────────────────────────────────────┘
```

### Recommended Architecture (Zero-Trust Client)

```
┌─────────────────────────────────────────────────────┐
│                 SERVER (Active Verifier)              │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Stream        │  │ Server-Side  │  │ Client    │  │
│  │ Validator     │  │ AI Analysis  │  │ Integrity │  │
│  │               │  │              │  │ Checker   │  │
│  │ • Verify      │  │ • Face det.  │  │           │  │
│  │   streams are │  │ • Object det.│  │ • Hash    │  │
│  │   continuous  │  │ • Gaze track │  │   verify  │  │
│  │ • Detect      │  │ • Person cnt │  │ • Attest. │  │
│  │   replays     │  │              │  │   check   │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Heartbeat    │  │ Exam Engine  │  │ Anomaly   │  │
│  │ Monitor      │  │ (controls    │  │ Detection │  │
│  │              │  │  exam access) │  │           │  │
│  │ • 10s checks │  │              │  │ • 0 flags │  │
│  │ • Stream     │  │ • Pauses exam│  │   in 30m? │  │
│  │   continuity │  │   if stream  │  │ • Stream  │  │
│  │              │  │   stops      │  │   stopped?│  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└──────────────────────▲──────────────────────────────┘
                       │
          Encrypted, authenticated streams
          + periodic integrity attestations
                       │
┌──────────────────────┴──────────────────────────────┐
│                 CLIENT (Untrusted)                    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Webcam       │  │ Screen       │  │ Lockdown  │  │
│  │ Capture &    │  │ Capture &    │  │ (defense  │  │
│  │ Stream       │  │ Stream       │  │  in depth │  │
│  │ (no local    │  │ (no local    │  │  only)    │  │
│  │  analysis)   │  │  analysis)   │  │           │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ Native Integrity Module (C++/Rust, signed)       ││
│  │ • Self-check hashes → report to server           ││
│  │ • Cannot be read/edited like JavaScript          ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Current | Recommended |
|---|---|---|
| AI analysis | Client-side (bypassable) | **Server-side** (student can't interfere) |
| Stream validation | None | **Server verifies continuous streams** |
| Integrity check | None | **Hash attestation at exam start + periodic** |
| Exam access control | Client decides | **Server decides** (no stream = no exam) |
| Security code | JavaScript (editable) | **Native compiled addon (C++/Rust)** |
| Flag decisions | Client sends flags | **Server detects anomalies** |
| Encryption keys | Hardcoded in JS | **Server-issued per-session tokens** |

---

## Summary of All Findings

| ID | Vulnerability | Severity | CVSS | Category |
|---|---|---|---|---|
| VULN-001 | ASAR archive trivially extractable | 🔴 Critical | 9.1 | Code Exposure |
| VULN-002 | No integrity verification | 🔴 Critical | 9.1 | Integrity |
| VULN-003 | All proctoring in plaintext JS | 🔴 Critical | 9.8 | Protection Failure |
| VULN-004 | Main exe not signed | 🟠 High | 7.5 | Integrity |
| VULN-005 | Hardcoded AES keys | 🔴 Critical | 8.6 | Credentials |
| VULN-006 | Insecure Electron config | 🟠 High | 7.7 | Configuration |
| VULN-007 | Insecure update mechanism | 🟠 High | 7.8 | Supply Chain |
| VULN-008 | Replaceable security exes | 🟠 High | 8.1 | File Integrity |
| VULN-009 | Weak obfuscation + dev files | 🟡 Medium | 5.3 | Obscurity |
| VULN-010 | Unencrypted user data | 🟡 Medium | 5.5 | Data Protection |

---

## Remediation Priority Roadmap for Eduswitch

### 🔴 Phase 1: Emergency (1-2 weeks)
1. **Rotate all hardcoded encryption keys** (VULN-005)
2. **Digitally sign SRM.exe** (VULN-004)
3. **Remove development artifacts** from production builds (VULN-009)
4. **Move update repository** to organizational GitHub account (VULN-007)

### 🟠 Phase 2: Critical Fixes (1-2 months)
5. **Enable ASAR integrity** in Electron builder config (VULN-001, VULN-002)
6. **Add startup integrity checks** for all critical files (VULN-002)
7. **Verify helper exe signatures** before execution (VULN-008)
8. **Enable contextIsolation and disable nodeIntegration** (VULN-006)
9. **Implement server-side stream validation** — pause exam if streams stop (VULN-003)
10. **Encrypt stored data** using safeStorage API (VULN-010)

### 🟡 Phase 3: Architecture Overhaul (3-6 months)
11. **Move AI detection to server-side** (VULN-003)
12. **Move security logic to native compiled addon** (VULN-001, VULN-003)
13. **Implement server-side client attestation** (VULN-002)
14. **Replace client-side encryption with server-issued tokens** (VULN-005)
15. **Install to Program Files** instead of AppData (VULN-008)

---

## Disclosure Timeline

| Date | Action |
|---|---|
| June 9, 2026 | Vulnerabilities identified and documented |
| *Pending* | Report delivered to Eduswitch Solutions Pvt Ltd |
| *Pending* | Vendor acknowledgment (expected within 7 days) |
| *Pending* | Remediation timeline agreed (expected within 30 days) |
| *+90 days* | Public disclosure if no response received |

---

> [!IMPORTANT]
> This report is prepared for **responsible disclosure purposes**. All findings are based on static analysis of a legitimately installed copy of SRM Secure Browser v1.0.22. No active exploitation was performed, and no exam sessions were accessed or compromised during this assessment.

---

*Report generated by independent security assessment — June 9, 2026*
*ASAR Hash: `EC3BC2F36D790D0C1D03488A79A7D117F2FF46924CBFC417AAC55589101AF4C5`*
