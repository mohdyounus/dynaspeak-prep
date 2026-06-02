// DynaSpeak AI Practice Quiz Engine
// Calls Claude API directly from the browser to generate and evaluate quiz questions.
// WARNING: The API key is visible in browser DevTools. Only use this on personal/private sites.

// ── Replace this with your Claude API key ──────────────────────────────────────
const CLAUDE_API_KEY = 'sk-ant-YOUR_KEY_HERE';
// ───────────────────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-haiku-4-5';

const TOPICS = [
  {
    id: 'verb-to-be',
    title: 'Lesson 1 — Verb "to be"',
    level: 'Beginner',
    description: 'Using am, is, are in positive sentences, negative sentences (am not / isn\'t / aren\'t), and questions (Am I? / Is he? / Are they?)'
  },
  {
    id: 'present-simple',
    title: 'Lesson 2 — Present Simple',
    level: 'Beginner–Elementary',
    description: 'Habits, routines, and facts using present simple tense — including he/she/it +s rule, negatives with don\'t/doesn\'t, and questions with do/does'
  },
  {
    id: 'present-continuous',
    title: 'Lesson 3 — Present Continuous',
    level: 'Elementary',
    description: 'Actions happening right now using is/are + verb-ing, negatives with is not/are not, and questions like "What are you doing?"'
  },
  {
    id: 'past-simple',
    title: 'Lesson 4 — Past Simple',
    level: 'Elementary',
    description: 'Completed actions using regular verbs (+ed) and common irregular verbs (go→went, have→had, be→was/were), negatives with didn\'t, and questions with did'
  },
  {
    id: 'articles',
    title: 'Lesson 5 — Articles',
    level: 'Elementary',
    description: 'Using a (before consonant sounds), an (before vowel sounds), the (specific/known things), and zero article (general/uncountable nouns)'
  },
  {
    id: 'vocabulary',
    title: 'Lesson 6 — Everyday Vocabulary',
    level: 'Beginner–Intermediate',
    description: 'Key words for personal information (nationality, occupation, marital status), daily activities, feelings and opinions, and linking words (because, but, so, however)'
  },
  {
    id: 'speaking-intro',
    title: 'Lesson 7 — Speaking: Introduction',
    level: 'Beginner–Elementary',
    description: 'Introducing yourself — name, nationality, where you live, occupation, family, hobbies, and reasons for learning English in New Zealand'
  },
  {
    id: 'speaking-questions',
    title: 'Lesson 8 — Speaking: Questions',
    level: 'Elementary',
    description: 'Forming and answering Wh-questions (What, Where, When, Who, Why, How) and Yes/No questions correctly in conversation'
  },
  {
    id: 'reading-strategies',
    title: 'Lesson 9 — Reading Strategies',
    level: 'Elementary–Intermediate',
    description: 'Skimming for main ideas, scanning for specific information, guessing word meaning from context, understanding paragraph structure'
  },
  {
    id: 'writing-structure',
    title: 'Lesson 10 — Writing Structure',
    level: 'Elementary–Intermediate',
    description: 'Writing clear paragraphs with a topic sentence, supporting details, and a concluding sentence — using linking words (first, then, finally, because, however)'
  }
];

const SYSTEM_PROMPT = `You are an experienced English language teacher creating quiz questions for adult migrants living in Auckland, New Zealand who are preparing for a placement test at DynaSpeak language school. Questions should be practical, use real-life New Zealand contexts (work, family, healthcare, community), and be appropriate for the specified English level.`;

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildGeneratePrompt(topic) {
  return `Generate exactly 5 multiple choice questions to test understanding of this English language topic:

Topic: "${topic.description}"
Level: ${topic.level}

Return ONLY a valid JSON array — no explanation, no markdown code fences, just the raw JSON:
[
  {
    "q": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Brief explanation of why the correct answer is right."
  }
]

Rules:
- "answer" must be the 0-based index of the correct option (0, 1, 2, or 3)
- All 4 options must be plausible (avoid obviously wrong distractors)
- Use New Zealand English contexts where possible (e.g. dairy, GP, Work and Income, Kiwi)
- Keep language clear and accessible for the specified level
- Vary question types: fill-in-the-blank, error correction, dialogue completion, choose the correct form`;
}

function buildFeedbackPrompt(topic, qaData) {
  const summary = qaData.map((item, i) =>
    `Q${i + 1}: ${item.q}\nStudent answered: "${item.studentAnswer}" — ${item.correct ? 'CORRECT' : `INCORRECT (correct: "${item.correctAnswer}")`}`
  ).join('\n\n');

  return `A student just completed a 5-question quiz on "${topic.title}" (${topic.level} level English).

Results:
${summary}

Score: ${qaData.filter(x => x.correct).length} / ${qaData.length}

Write a short, warm feedback message (3–4 sentences) that:
1. Acknowledges their score positively
2. If they got any wrong, names the specific grammar point or word they should review
3. Gives one concrete, practical tip for improvement

Keep it encouraging — this is an adult learner working hard to improve their English.`;
}

// ── Claude API call ────────────────────────────────────────────────────────────

async function callClaude(messages, system) {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey || apiKey === 'sk-ant-YOUR_KEY_HERE') {
    throw new Error('Please enter your Claude API key at the top of the page.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-ipc': 'true'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: system || SYSTEM_PROMPT,
      messages: messages
    })
  });

  if (!response.ok) {
    let errMsg = `API error ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody.error?.message || errMsg;
    } catch (_) { /* ignore parse errors */ }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── State ──────────────────────────────────────────────────────────────────────

let currentTopic = null;
let currentQuestions = [];
let userAnswers = {};

// ── UI helpers ─────────────────────────────────────────────────────────────────

function showLoading(message) {
  const c = document.getElementById('quiz-container');
  c.style.display = 'block';
  c.innerHTML = `
    <div class="aiq-loading">
      <div class="aiq-spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

function showError(message) {
  const c = document.getElementById('quiz-container');
  c.style.display = 'block';
  c.innerHTML = `<div class="aiq-error"><strong>⚠ Error:</strong> ${escapeHtml(message)}</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Populate topic dropdown ────────────────────────────────────────────────────

function populateTopics() {
  const select = document.getElementById('topicSelect');
  if (!select) return;
  TOPICS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
}

// ── Generate quiz ──────────────────────────────────────────────────────────────

async function generateQuiz() {
  const topicId = document.getElementById('topicSelect').value;
  currentTopic = TOPICS.find(t => t.id === topicId);
  if (!currentTopic) return;

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  showLoading('Claude is writing your questions…');

  try {
    const raw = await callClaude([{ role: 'user', content: buildGeneratePrompt(currentTopic) }]);

    // Strip markdown fences if Claude wrapped the JSON
    const jsonStr = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const questions = JSON.parse(jsonStr);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Received an unexpected response format. Please try again.');
    }

    currentQuestions = questions;
    userAnswers = {};
    renderQuiz(questions);
  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Render quiz ────────────────────────────────────────────────────────────────

function renderQuiz(questions) {
  let html = `
    <div class="aiq-header">
      <h3>${escapeHtml(currentTopic.title)}</h3>
      <p class="aiq-level">Level: ${escapeHtml(currentTopic.level)}</p>
      <div class="aiq-progress-wrap">
        <div class="aiq-progress-bar"><div id="aiqProgressFill" style="width:0%"></div></div>
        <span id="aiqProgressText">0 / ${questions.length} answered</span>
      </div>
    </div>
    <div class="aiq-questions">`;

  questions.forEach((q, i) => {
    html += `
      <div class="aiq-question" id="aiq-q-${i}">
        <p class="aiq-q-text"><strong>Q${i + 1}.</strong> ${escapeHtml(q.q)}</p>
        <div class="aiq-options">
          ${q.options.map((opt, j) => `
            <label class="aiq-option" id="aiq-opt-${i}-${j}">
              <input type="radio" name="aiq-q${i}" value="${j}" onchange="handleAnswer(${i}, ${j})">
              <span>${escapeHtml(opt)}</span>
            </label>`).join('')}
        </div>
      </div>`;
  });

  html += `</div>
    <button id="aiqSubmitBtn" class="aiq-submit" onclick="submitQuiz()" disabled>
      Answer all questions to submit
    </button>`;

  const c = document.getElementById('quiz-container');
  c.innerHTML = html;
  c.style.display = 'block';
  c.scrollIntoView({ behavior: 'smooth' });
}

// ── Handle answer selection ────────────────────────────────────────────────────

function handleAnswer(qIndex, optIndex) {
  userAnswers[qIndex] = optIndex;

  // Highlight selected option
  for (let j = 0; j < 4; j++) {
    const el = document.getElementById(`aiq-opt-${qIndex}-${j}`);
    if (el) el.classList.toggle('selected', j === optIndex);
  }

  // Update progress
  const answered = Object.keys(userAnswers).length;
  const total = currentQuestions.length;
  const pct = Math.round((answered / total) * 100);
  document.getElementById('aiqProgressFill').style.width = pct + '%';
  document.getElementById('aiqProgressText').textContent = `${answered} / ${total} answered`;

  const btn = document.getElementById('aiqSubmitBtn');
  if (answered === total) {
    btn.disabled = false;
    btn.textContent = 'Submit Quiz';
  }
}

// ── Submit and show results ────────────────────────────────────────────────────

async function submitQuiz() {
  const score = currentQuestions.filter((q, i) => userAnswers[i] === q.answer).length;
  const total = currentQuestions.length;

  // Lock all inputs and mark correct/incorrect
  currentQuestions.forEach((q, i) => {
    const selected = userAnswers[i];
    const isCorrect = selected === q.answer;
    const selectedEl = document.getElementById(`aiq-opt-${i}-${selected}`);
    const correctEl = document.getElementById(`aiq-opt-${i}-${q.answer}`);
    if (selectedEl) selectedEl.classList.add(isCorrect ? 'aiq-correct' : 'aiq-incorrect');
    if (!isCorrect && correctEl) correctEl.classList.add('aiq-correct');
    for (let j = 0; j < q.options.length; j++) {
      const inp = document.querySelector(`input[name="aiq-q${i}"][value="${j}"]`);
      if (inp) inp.disabled = true;
    }
  });

  document.getElementById('aiqSubmitBtn').style.display = 'none';

  const pct = Math.round((score / total) * 100);
  const levelMsg = pct >= 80
    ? '🟢 Excellent! You have a strong understanding of this topic.'
    : pct >= 60
      ? '🟡 Good effort! A bit more practice and you will master this.'
      : '🔴 Keep going — review the lesson and try generating a new quiz.';

  const reviewItems = currentQuestions.map((q, i) => {
    const correct = userAnswers[i] === q.answer;
    return `
      <details>
        <summary>${correct ? '✅' : '❌'} Q${i + 1}: ${escapeHtml(q.q)}</summary>
        <p><strong>Your answer:</strong> ${escapeHtml(q.options[userAnswers[i]])}</p>
        ${!correct ? `<p><strong>Correct answer:</strong> ${escapeHtml(q.options[q.answer])}</p>` : ''}
        <p><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>
      </details>`;
  }).join('');

  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'aiq-score';
  scoreDiv.innerHTML = `
    <h3>Score: ${score} / ${total} (${pct}%)</h3>
    <p>${levelMsg}</p>
    <div id="aiqFeedback" class="aiq-feedback-wrap">
      <em>Getting personalised AI feedback…</em>
    </div>
    <div class="aiq-review">
      <h4>Question Review</h4>
      ${reviewItems}
    </div>
    <div class="aiq-actions">
      <button class="aiq-btn-secondary" onclick="generateQuiz()">Regenerate This Topic</button>
      <button class="aiq-btn-secondary" onclick="resetQuiz()">Choose Another Topic</button>
    </div>`;

  document.getElementById('quiz-container').appendChild(scoreDiv);
  scoreDiv.scrollIntoView({ behavior: 'smooth' });

  // Request AI feedback
  try {
    const qaData = currentQuestions.map((q, i) => ({
      q: q.q,
      studentAnswer: q.options[userAnswers[i]],
      correctAnswer: q.options[q.answer],
      correct: userAnswers[i] === q.answer
    }));
    const feedback = await callClaude(
      [{ role: 'user', content: buildFeedbackPrompt(currentTopic, qaData) }]
    );
    document.getElementById('aiqFeedback').innerHTML =
      `<div class="aiq-feedback"><strong>📝 Teacher Feedback</strong><br><br>${feedback.replace(/\n/g, '<br>')}</div>`;
  } catch (e) {
    document.getElementById('aiqFeedback').innerHTML =
      `<p class="aiq-error-small">Could not load AI feedback: ${escapeHtml(e.message)}</p>`;
  }
}

// ── Reset ──────────────────────────────────────────────────────────────────────

function resetQuiz() {
  currentTopic = null;
  currentQuestions = [];
  userAnswers = {};
  const c = document.getElementById('quiz-container');
  c.style.display = 'none';
  c.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', populateTopics);
