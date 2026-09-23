# exploit scripts

quick scripts and templates to verify the 10 bypasses found in the secure browser.

---

### poc1-extract-answers.js
dumps the correct answers (`CorrectAns`) stored in `localStorage.getItem("ExamQuestionsObj")`.

### poc2-autosubmit-score.js
updates localStorage answers to correct and submits to get a perfect score.

### poc3-proctoring-kill.js
sends a "stop" postMessage to the unvalidated preload listener, killing camera and screen sharing feeds.

### poc4-window-globals-abuse.js
abuses global window functions (like StartTest/EndTest) to manipulate exam state.

### poc5-decrypt-config.js
decrypts the hardcoded firebase credentials and TURN server configs using the static AES keys.

### poc6-disable-blur-detection.js
sets the debug flag to bypass window blur and alt-tab detection.

### poc7-firebase-state-manipulation.js
writes directly to firebase realtime database to hide offline state and block recording alerts.

### poc8-silent-gps-extraction.js
grabs geolocation silently inside the electron shell without prompting the user.

### poc9-fake-vmdetect.cs
dummy C# template to spoof VMDetect.exe and bypass VM checks. compile with:
`csc /target:exe /out:VMDetect.exe poc9-fake-vmdetect.cs`

### poc10-full-bypass-chain.js
executes the full chain (kill blur -> load answers -> kill proctoring -> auto-submit).
