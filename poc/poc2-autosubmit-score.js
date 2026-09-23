

(function() {
    const exam = JSON.parse(localStorage.getItem("ExamQuestionsObj"));
    if (!exam || !exam.QuestionsJSON) {
        console.log("[PoC 2] No active exam data found in localStorage.");
        return;
    }

    let corrected = 0;
    exam.QuestionsJSON.forEach(q => {
        if (q.CorrectAns) {
            q.selectedOpt = q.CorrectAns;
            q.isAnswerCorrect = true;
            corrected++;
        }
    });

    localStorage.setItem("ExamQuestionsObj", JSON.stringify(exam));
    console.log(`[PoC 2] ${corrected}/${exam.QuestionsJSON.length} questions set to correct answers in localStorage.`);
    console.log("[PoC 2] Click 'Submit' in the exam interface to send all-correct flags to backend.");
})();
