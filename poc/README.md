# Vulnerability Proof of Concept (PoC)

This directory contains a benign Proof of Concept script demonstrating the IPC origin bypass vulnerability identified in `preload.js` (Finding 2).

### 1. The Vulnerability
The preload script listens for browser window messages via `window.addEventListener('message')` but performs no verification on `event.origin` or the source window context:

```js
window.addEventListener('message', function (event) {
    if (event.data.msg == "stop" || event.data.Action == "stop") {
        ipcRenderer.sendToHost('stop-proctoring');
    }
});
```

### 2. Execution Flow
The [bypass-poc.js](bypass-poc.js) script constructs a mock payload and dispatches it directly to the active window using `window.postMessage()`. Because there are no origin checks, the preload script captures the message and immediately signals the main process to terminate proctoring.
