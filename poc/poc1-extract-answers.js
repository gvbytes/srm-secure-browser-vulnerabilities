/**
 * PoC 1: Extract Answer Key from localStorage
 * Target: chrome-tabs/Renderer/renderer-Exam.js (line 21)
 * Impact: Dumps all exam questions and their correct answers directly from client storage.
 */

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
