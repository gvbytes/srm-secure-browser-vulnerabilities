

(function() {
    console.log("[PoC] Dispatching mock termination event to preload handler...");
    
    const payload = {
        msg: "stop",
        Action: "stop"
    };

    window.postMessage(payload, "*");
    
    console.log("[PoC] Event dispatched. Proctoring termination call initiated.");
})();
