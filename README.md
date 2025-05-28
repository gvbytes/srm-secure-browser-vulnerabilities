# srm secure browser security review

notes and bypass scripts for `SRMUG-Secure-Browser v1.0.22` (electron-based exam client by eduswitch solutions). focuses on implementation flaws affecting exam integrity and student privacy.

## scope
based on an extracted `app.asar` bundle. checked the renderer preload script, bundled js files, native helper binaries, and WebRTC/Firebase integration. 

since `main.jsc` was compiled with v8 bytecode, main-process decompilation was limited.

## key findings
tracked 13 issues across trust boundaries, exposed configs, and client-writable state.

| severity | count | main themes |
|---|---:|---|
| critical | 3 | exposed client secrets, unauthenticated message control, local answer keys |
| high | 5 | privileged globals, weak devtools block, outdated electron, client-writable firebase |
| medium | 4 | weak VM checks, deprecated requests, geolocation collection, hardcoded storage |
| low | 1 | printscreen handling |

## repo structure
- `SRM_Secure_Browser_Security_Review.md` - detailed vulnerability report detailing findings 1-13
- `poc/` - proof of concept scripts and binaries

## proof of concept scripts
exploit scripts for the verified flaws are in the `poc/` folder:
- **poc1-extract-answers.js** - dumps plaintext answer key (`CorrectAns`) from localStorage
- **poc2-autosubmit-score.js** - modifies answers in localStorage to auto-submit a 100% score
- **poc3-proctoring-kill.js** - kills webcam/screen sharing by posting a stop message to the preload listener
- **poc4-window-globals-abuse.js** - calls privileged window functions to stop proctoring or alter test state
- **poc5-decrypt-config.js** - decrypts firebase and TURN credentials using recovered AES keys (`keysefghijkldesk`, `icesefghijklmnop`)
- **poc6-disable-blur-detection.js** - disables focus loss and alt-tab reporting using debug flags
- **poc7-firebase-state-manipulation.js** - modifies student telemetry directly in realtime database
- **poc8-silent-gps-extraction.js** - extracts location silently without trigger permission prompts
- **poc9-fake-vmdetect.cs** - dummy executable replacing `VMDetect.exe` to bypass VM detection
- **poc10-full-bypass-chain.js** - runs the full chain (disable blur -> extract answers -> kill proctoring -> submit)

## responsible disclosure
reached out to multiple university contacts (COE, CSE HOD, admissions) with the full report before making this public. received no response.

screenshot of the disclosure email:

![disclosure email](disclosure-email.png)

## recommended fix order
1. keep answer keys and grading logic server-side.
2. remove hardcoded secrets and rotate credentials.
3. validate `postMessage` origins and payloads.
4. remove privileged globals from the window context.
