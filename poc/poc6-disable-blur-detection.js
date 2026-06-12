/**
 * PoC 6: Disable Blur Detection via Debug Flag
 * Target: chrome-tabs/Renderer/renderer-Login.js (lines 149-153)
 * Impact: Sets production debug flag to true, disabling window.onblur alt-tab reporting.
 */

(function() {
    window.DisableForegroundingFromMainForDebugging = true;
    console.log("[PoC 6] DisableForegroundingFromMainForDebugging set to true.");
    console.log("[PoC 6] Window blur and application focus loss will no longer be reported to main process.");
})();
