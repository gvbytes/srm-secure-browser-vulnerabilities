

(function() {
    const exam = JSON.parse(localStorage.getItem("ExamQuestionsObj"));
    if (!exam || !exam.QuestionsJSON) {
        console.log("[PoC 1] No active exam data found in localStorage. Run within an active exam session.");
        return;
    }

    console.log("=== EXAM ANSWER KEY (PoC 1) ===");
    exam.QuestionsJSON.forEach((q, idx) => {
        console.log(`Q${idx + 1}: ${q.question}`);
        console.log(`   -> Correct Answer: ${q.CorrectAns}`);
    });
    console.log(`=== TOTAL: ${exam.QuestionsJSON.length} questions ===`);
})();
