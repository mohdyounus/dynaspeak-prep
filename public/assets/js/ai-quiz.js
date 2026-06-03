// DynaSpeak AI Practice Quiz Engine
// Calls a server-side Next.js API route. Claude API key stays on server (Vercel env).

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
  },
  {
    id: 'parts-of-speech-nouns',
    title: 'Parts of Speech — Nouns',
    level: 'Beginner–Elementary',
    description: 'Identifying common nouns, proper nouns, countable and uncountable nouns, and using plural forms correctly in everyday sentences'
  },
  {
    id: 'parts-of-speech-pronouns',
    title: 'Parts of Speech — Pronouns',
    level: 'Beginner–Elementary',
    description: 'Using subject pronouns, object pronouns, possessive pronouns, and reflexive pronouns correctly in conversation and writing'
  },
  {
    id: 'parts-of-speech-verbs',
    title: 'Parts of Speech — Verbs',
    level: 'Beginner–Intermediate',
    description: 'Recognizing action and state verbs, using helping verbs, and choosing correct verb forms in sentence context'
  },
  {
    id: 'parts-of-speech-adjectives',
    title: 'Parts of Speech — Adjectives',
    level: 'Beginner–Elementary',
    description: 'Describing people, places, and things with adjectives, including adjective order and common comparative forms'
  },
  {
    id: 'parts-of-speech-adverbs',
    title: 'Parts of Speech — Adverbs',
    level: 'Elementary–Intermediate',
    description: 'Using adverbs of frequency, manner, time, and degree to add detail and improve clarity in sentences'
  },
  {
    id: 'parts-of-speech-prepositions',
    title: 'Parts of Speech — Prepositions',
    level: 'Elementary',
    description: 'Choosing correct prepositions of place, time, and movement such as in, on, at, to, from, and through'
  },
  {
    id: 'parts-of-speech-conjunctions',
    title: 'Parts of Speech — Conjunctions',
    level: 'Elementary–Intermediate',
    description: 'Joining ideas with coordinating and subordinating conjunctions like and, but, so, because, although, and while'
  },
  {
    id: 'parts-of-speech-interjections',
    title: 'Parts of Speech — Interjections',
    level: 'Beginner–Elementary',
    description: 'Understanding interjections such as wow, oh, and sorry, and using them naturally and appropriately in spoken English'
  },
  {
    id: 'sentence-formation-basics',
    title: 'Sentence Formation — Basics',
    level: 'Beginner–Elementary',
    description: 'Building clear sentences using correct word order (subject + verb + object), punctuation, and capitalization'
  },
  {
    id: 'sentence-formation-complex',
    title: 'Sentence Formation — Complex Sentences',
    level: 'Elementary–Intermediate',
    description: 'Combining clauses to form compound and complex sentences with correct connectors and punctuation'
  }
];

const WRITING_TOPICS = [
  {
    id: 'essay-life-in-nz',
    title: 'Comprehensive Essay: Life in New Zealand',
    level: 'Intermediate',
    prompt: 'Write a 220-300 word essay about your life in New Zealand. Include work or study, community life, and your goals for the next two years.'
  },
  {
    id: 'essay-benefits-challenges-migration',
    title: 'Comprehensive Essay: Benefits and Challenges of Migration',
    level: 'Intermediate',
    prompt: 'Write a 220-300 word balanced essay discussing both benefits and challenges of moving to a new country. Use clear paragraphs and linking words.'
  },
  {
    id: 'paragraph-local-community',
    title: 'Topic Writing: My Local Community',
    level: 'Elementary-Intermediate',
    prompt: 'Write 140-200 words describing your local community in Auckland. Mention places, people, services, and why this area is good (or difficult) for families.'
  },
  {
    id: 'paragraph-healthy-routine',
    title: 'Topic Writing: A Healthy Weekly Routine',
    level: 'Elementary-Intermediate',
    prompt: 'Write 140-200 words about your healthy weekly routine. Include food, exercise, sleep, and one change you want to make.'
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

function buildWritingEvaluationPrompt(topic, writingText) {
  return `You are assessing writing for an adult English learner preparing for DynaSpeak placement.

Task: ${topic.title}
Target level: ${topic.level}
Prompt given to student: ${topic.prompt}

Student writing:
"""
${writingText}
"""

Give feedback in this exact structure:
1) Overall level estimate (A2/B1/B2) and one-line summary
2) Scores out of 10:
- Task response
- Organization & coherence
- Grammar accuracy
- Vocabulary range
3) Three strengths
4) Three priority improvements
5) Correct 3 specific sentences from the student's text (show Original -> Better)
6) Provide a short improved sample paragraph (80-120 words) on the same topic

Keep tone warm, practical, and encouraging.`;
}

// ── Claude API call ────────────────────────────────────────────────────────────

async function callClaude(messages, system) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
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
  return data.text || '';
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
  select.innerHTML = '';
  TOPICS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
}

function populateWritingTopics() {
  const select = document.getElementById('writingTopicSelect');
  if (!select) return;
  select.innerHTML = '';
  WRITING_TOPICS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
  updateWritingPrompt();
}

function setupPracticeSwitcher() {
  const modeSelect = document.getElementById('practiceType');
  if (!modeSelect) return;

  const applyMode = () => {
    const mode = modeSelect.value;
    const mcqBlock = document.getElementById('mcqSetupBlock');
    const writingBlock = document.getElementById('writingSetupBlock');
    if (mcqBlock) mcqBlock.style.display = mode === 'mcq' ? 'block' : 'none';
    if (writingBlock) writingBlock.style.display = mode === 'writing' ? 'block' : 'none';
  };

  modeSelect.addEventListener('change', applyMode);
  applyMode();
}

function updateWritingPrompt() {
  const topicId = document.getElementById('writingTopicSelect')?.value;
  const promptBox = document.getElementById('writingPromptText');
  const topic = WRITING_TOPICS.find((t) => t.id === topicId);
  if (!promptBox || !topic) return;
  promptBox.textContent = topic.prompt;
}

async function evaluateWriting() {
  const topicId = document.getElementById('writingTopicSelect')?.value;
  const topic = WRITING_TOPICS.find((t) => t.id === topicId);
  const responseText = (document.getElementById('writingResponse')?.value || '').trim();
  const feedbackWrap = document.getElementById('writing-feedback-container');
  const btn = document.getElementById('evaluateWritingBtn');

  if (!topic || !feedbackWrap || !btn) return;
  if (responseText.length < 60) {
    feedbackWrap.style.display = 'block';
    feedbackWrap.innerHTML = '<div class="aiq-error"><strong>⚠ Error:</strong> Please write at least 60 characters so AI can evaluate your writing properly.</div>';
    return;
  }

  btn.disabled = true;
  feedbackWrap.style.display = 'block';
  feedbackWrap.innerHTML = '<div class="aiq-loading"><div class="aiq-spinner"></div><p>Claude is evaluating your writing...</p></div>';

  try {
    const feedback = await callClaude(
      [{ role: 'user', content: buildWritingEvaluationPrompt(topic, responseText) }],
      'You are a supportive English writing assessor for adult learners in New Zealand.'
    );

    feedbackWrap.innerHTML =
      `<div class="aiq-feedback"><strong>AI Writing Evaluation</strong><br><br>${escapeHtml(feedback).replace(/\n/g, '<br>')}</div>`;
    feedbackWrap.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    feedbackWrap.innerHTML = `<div class="aiq-error"><strong>⚠ Error:</strong> ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
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

function initializeAiQuiz() {
  if (!document.getElementById('topicSelect') || !document.getElementById('practiceType')) {
    return false;
  }

  populateTopics();
  populateWritingTopics();
  setupPracticeSwitcher();

  const writingTopicSelect = document.getElementById('writingTopicSelect');
  if (writingTopicSelect) {
    writingTopicSelect.addEventListener('change', updateWritingPrompt);
  }

  return true;
}

function bootAiQuizWithRetry() {
  if (initializeAiQuiz()) return;

  let tries = 0;
  const maxTries = 20;
  const timer = setInterval(() => {
    tries += 1;
    if (initializeAiQuiz() || tries >= maxTries) {
      clearInterval(timer);
    }
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAiQuizWithRetry);
} else {
  bootAiQuizWithRetry();
}
