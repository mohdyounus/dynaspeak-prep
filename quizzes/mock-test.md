---
layout: default
title: "🏁 Final mock test — all skills"
nav_order: 99
---

# 🏁 Final mock test — all skills

**Covers:** All lessons (grammar, vocabulary, reading, writing)  
**Questions:** 30 multiple choice + 2 written tasks  
**Time:** Allow 45-60 minutes

This version is interactive: select one answer for each question, track your progress, and see your final result when finished.

---

<div class="quiz-shell">
  <div class="quiz-topbar">
    <div>
      <strong>Progress:</strong>
      <span id="progressText">0 / 30 completed</span>
    </div>
    <div>
      <strong>Score so far:</strong>
      <span id="scoreText">0</span>
    </div>
  </div>

  <div class="progress-track" aria-label="Quiz progress">
    <div id="progressBar" class="progress-fill" style="width: 0%;"></div>
  </div>

  <div id="quizContainer"></div>

  <div class="quiz-actions">
    <button id="submitBtn" class="btn" disabled>Submit quiz</button>
    <button id="resetBtn" class="btn btn-secondary" type="button">Reset answers</button>
  </div>

  <div id="resultBox" class="result-box hidden" aria-live="polite"></div>
</div>

---

## Written tasks

> ✏️ Complete these in your notebook after finishing the multiple-choice section.

### Written task 1 — About yourself (8-10 sentences)

Write a paragraph about yourself. Include:
- Your name, age, and country of origin
- How long you have been in New Zealand and where you live
- Your family
- What you do (work / study / home duties)
- Why you are learning English
- One thing you enjoy about Auckland and one thing you miss about your home country

### Written task 2 — A short letter (8-10 sentences)

Write a short letter to a friend back in your home country. Tell them:
- How long you have been in Auckland
- What your life is like now (home, family, work, study)
- Something you enjoy here
- Something you find difficult
- Your plans for the future

Start with: *Dear [name],*  
End with: *With warm wishes, [your name]*

---

🏠 [Back to home](../README.md)

<style>
.quiz-shell {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  background: #ffffff;
}

.quiz-topbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.6rem;
}

.progress-track {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #2563eb);
  transition: width 0.25s ease;
}

.quiz-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.9rem;
  margin-bottom: 0.8rem;
  background: #fafcff;
}

.quiz-card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.option {
  display: block;
  margin: 0.35rem 0;
  padding: 0.35rem 0.45rem;
  border-radius: 6px;
}

.option:hover {
  background: #f1f5f9;
}

.quiz-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  background: #ffffff;
  color: #1e293b;
  border-color: #94a3b8;
}

.result-box {
  margin-top: 1rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.9rem;
}

.result-box h2 {
  margin-top: 0;
}

.hidden {
  display: none;
}

.correct-row {
  color: #166534;
}

.incorrect-row {
  color: #991b1b;
}
</style>

<script>
(() => {
  const questions = [
    { q: "1. My brother _____ a teacher at a primary school.", options: ["a) am", "b) are", "c) is", "d) be"], answer: 2 },
    { q: "2. Which sentence is correct?", options: ["a) She don't speak Japanese.", "b) She doesn't speaks Japanese.", "c) She doesn't speak Japanese.", "d) She not speak Japanese."], answer: 2 },
    { q: "3. My children _____ to school every morning at 8:30.", options: ["a) goes", "b) go", "c) are going", "d) went"], answer: 1 },
    { q: "4. _____ you from Auckland originally?", options: ["a) Is", "b) Do", "c) Are", "d) Am"], answer: 2 },
    { q: "5. Choose the sentence for something happening right now.", options: ["a) She watches TV right now.", "b) She is watching TV right now.", "c) She watched TV right now.", "d) She watch TV right now."], answer: 1 },
    { q: "6. I _____ to New Zealand three years ago.", options: ["a) come", "b) comes", "c) coming", "d) came"], answer: 3 },
    { q: "7. Which is the correct negative in the past?", options: ["a) She didn't went to the doctor.", "b) She not go to the doctor.", "c) She didn't go to the doctor.", "d) She don't go to the doctor."], answer: 2 },
    { q: "8. I have _____ idea.", options: ["a) a", "b) an", "c) the", "d) no article"], answer: 1 },
    { q: "9. Which sentence is correct?", options: ["a) I am working at the moment - please call me later.", "b) I working at the moment.", "c) I work at the moment right now.", "d) I works at the moment."], answer: 0 },
    { q: "10. Choose the correct sentence.", options: ["a) He works here since 2020.", "b) He has worked here since 2020.", "c) He work here since 2020.", "d) He is work here since 2020."], answer: 1 },
    { q: "11. What is the past tense of 'have'?", options: ["a) haved", "b) has", "c) had", "d) having"], answer: 2 },
    { q: "12. Did she study last night? - No, _____.", options: ["a) she didn't", "b) she don't", "c) she isn't", "d) she hasn't"], answer: 0 },
    { q: "13. I do _____ every morning - cooking, cleaning, and washing clothes.", options: ["a) hobbies", "b) commutes", "c) chores", "d) budgets"], answer: 2 },
    { q: "14. Which word means to officially sign up for a class?", options: ["a) attend", "b) enrol", "c) volunteer", "d) commute"], answer: 1 },
    { q: "15. I enjoy living in Auckland. _____, I miss my family.", options: ["a) Because", "b) So that", "c) Also", "d) However"], answer: 3 },
    { q: "16. I am _____ to start my English class.", options: ["a) worried", "b) bored", "c) excited", "d) confused"], answer: 2 },
    { q: "17. What does 'residence' mean?", options: ["a) Your job", "b) Your country of origin", "c) The place where you live", "d) Your marital status"], answer: 2 },
    { q: "18. Choose the correct sequencing sentence.", options: ["a) I first make breakfast. Finally, I wake up.", "b) First, I wake up. Then, I make breakfast. Finally, I go to work.", "c) Finally, I make breakfast. Also, I wake up.", "d) Then I wake up. Because I make breakfast."], answer: 1 },
    { q: "19. Motivated means:", options: ["a) Tired and discouraged", "b) Confused about something", "c) Eager and determined to do something", "d) Uncertain and nervous"], answer: 2 },
    { q: "20. I am studying English _____ I can find a better job.", options: ["a) although", "b) so that", "c) however", "d) but"], answer: 1 },
    { q: "21. Where is Deepa originally from?", options: ["a) Pakistan", "b) Sri Lanka", "c) Mumbai, India", "d) Bangladesh"], answer: 2 },
    { q: "22. How many children does Deepa have?", options: ["a) One", "b) Two", "c) Three", "d) Four"], answer: 1 },
    { q: "23. Why couldn't Deepa get a job at first?", options: ["a) Qualification not recognized", "b) No jobs available", "c) English not strong enough for interview", "d) Stayed home by choice"], answer: 2 },
    { q: "24. What level did Deepa start at DynaSpeak?", options: ["a) Level 1", "b) Level 2", "c) Level 3", "d) Level 5"], answer: 2 },
    { q: "25. What is Deepa's job now?", options: ["a) Secondary school teacher", "b) Part-time accountant at a small firm", "c) Full-time engineer", "d) Nurse's aide"], answer: 1 },
    { q: "26. 'Progressed' means:", options: ["a) Stopped", "b) Moved forward / improved", "c) Went back", "d) Changed schools"], answer: 1 },
    { q: "27. Deepa's advice to newcomers is:", options: ["a) Give up if your English is not good", "b) Stay home until perfect", "c) Practise every day, join a class, and do not give up", "d) Only speak your own language"], answer: 2 },
    { q: "28. Deepa's overall attitude is best described as:", options: ["a) Angry", "b) Hopeless", "c) Determined and positive", "d) Lazy"], answer: 2 },
    { q: "29. Which paragraph is best written?", options: ["a) all lower-case, no punctuation", "b) Clear sentences with capitals and full stops", "c) many random punctuation marks", "d) one long run-on sentence"], answer: 1 },
    { q: "30. Which sentence best explains why someone wants to learn English?", options: ["a) English is a language.", "b) I want to learn English.", "c) I am studying English so that I can communicate confidently at work, help my children with school, and become more independent.", "d) English is good because people speak it."], answer: 2 }
  ];

  const quizContainer = document.getElementById("quizContainer");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const scoreText = document.getElementById("scoreText");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBox = document.getElementById("resultBox");

  const answers = new Array(questions.length).fill(null);

  function renderQuiz() {
    const html = questions.map((item, i) => {
      const name = `q${i}`;
      const options = item.options
        .map((opt, idx) => `
          <label class="option">
            <input type="radio" name="${name}" value="${idx}" data-q-index="${i}" /> ${opt}
          </label>
        `)
        .join("");

      return `
        <section class="quiz-card" id="card-${i}">
          <h3>${item.q}</h3>
          <div>${options}</div>
        </section>
      `;
    }).join("");

    quizContainer.innerHTML = html;
  }

  function calculateScore() {
    let score = 0;
    answers.forEach((ans, i) => {
      if (ans === questions[i].answer) score += 1;
    });
    return score;
  }

  function getFeedback(score) {
    if (score >= 27) return { level: "Level 4-5", text: "Excellent! Strong grammar, reading, and vocabulary." };
    if (score >= 22) return { level: "Level 3-4", text: "Good work. Some areas to review - check your wrong answers." };
    if (score >= 16) return { level: "Level 2-3", text: "Keep practising. Review the lessons and try again." };
    return { level: "Level 1-2", text: "Focus on grammar basics (Lessons 1-4) and vocabulary (Lesson 6)." };
  }

  function updateProgress() {
    const completed = answers.filter(a => a !== null).length;
    const percent = (completed / questions.length) * 100;
    const score = calculateScore();

    progressText.textContent = `${completed} / ${questions.length} completed`;
    progressBar.style.width = `${percent}%`;
    scoreText.textContent = `${score}`;

    submitBtn.disabled = completed !== questions.length;
  }

  function showResults() {
    const score = calculateScore();
    const feedback = getFeedback(score);

    const detailRows = questions.map((q, i) => {
      const user = answers[i];
      const ok = user === q.answer;
      const userText = user === null ? "No answer" : q.options[user];
      const correctText = q.options[q.answer];
      return `<li class="${ok ? "correct-row" : "incorrect-row"}">Q${i + 1}: ${ok ? "Correct" : "Incorrect"} - Your answer: ${userText} | Correct: ${correctText}</li>`;
    }).join("");

    resultBox.innerHTML = `
      <h2>Final Result</h2>
      <p><strong>Score:</strong> ${score} / ${questions.length}</p>
      <p><strong>Suggested level:</strong> ${feedback.level}</p>
      <p><strong>Feedback:</strong> ${feedback.text}</p>
      <details>
        <summary>Show question-by-question review</summary>
        <ol>${detailRows}</ol>
      </details>
    `;

    resultBox.classList.remove("hidden");
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetQuiz() {
    for (let i = 0; i < answers.length; i += 1) answers[i] = null;
    document.querySelectorAll('input[type="radio"]').forEach((el) => {
      el.checked = false;
    });
    resultBox.classList.add("hidden");
    resultBox.innerHTML = "";
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderQuiz();

  quizContainer.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.matches('input[type="radio"][data-q-index]')) {
      const idx = Number(target.getAttribute("data-q-index"));
      answers[idx] = Number(target.value);
      updateProgress();
    }
  });

  submitBtn.addEventListener("click", showResults);
  resetBtn.addEventListener("click", resetQuiz);

  updateProgress();
})();
</script>
