

(function() {
    console.log("[PoC 3] Sending stop signal to preload listener...");
    window.postMessage({ msg: "stop", Action: "stop" }, "*");
    console.log("[PoC 3] Signal dispatched. Recording streams terminated silently.");
})();
