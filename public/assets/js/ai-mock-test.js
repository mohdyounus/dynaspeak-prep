// DynaSpeak AI Final Mock Test Engine
// Generates a fresh full mock test and provides AI evaluation.

const MOCK_MODEL = 'claude-haiku-4-5';

let mockTestData = null;
let mockAnswers = [];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripJsonFences(raw) {
  return raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
}

async function callClaude(messages, system) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MOCK_MODEL,
      max_tokens: 3500,
      system,
      messages
    })
  });

  if (!response.ok) {
    let errMsg = `API error ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody.error || errMsg;
    } catch (_) {
      // Ignore parse errors for non-JSON failures.
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.text || '';
}

function buildMockPrompt(level) {
  return `Generate a complete DynaSpeak-style placement mock test for adult migrants in Auckland, New Zealand.

Difficulty profile: ${level}

Return ONLY valid JSON (no markdown fences, no explanation) in this exact shape:
{
  "mcq": [
    {
      "skill": "Grammar|Vocabulary|Reading|Writing",
      "q": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Short reason why answer is correct"
    }
  ],
  "writingTasks": [
    {
      "title": "Task title",
      "prompt": "Task instructions",
      "targetWords": "e.g. 120-160"
    }
  ]
}

Rules:
- Create exactly 30 MCQ items.
- Create exactly 2 writing tasks.
- MCQs must have exactly 4 options each.
- answer must be a 0-based index (0..3).
- Balance MCQ skills approximately: grammar 10, vocabulary 8, reading 8, writing 4.
- Use realistic life/work/study contexts in New Zealand.
- Keep language level aligned with the selected difficulty.
- Avoid duplicate questions.`;
}

function buildMcqFeedbackPrompt(resultData) {
  return `You are an English placement tutor. A learner completed a 30-question mock test.

Result data:
${JSON.stringify(resultData)}

Write concise, supportive feedback with this structure:
1) One-line overall summary
2) Estimated placement band (Level 1-2, Level 2-3, Level 3-4, or Level 4-5)
3) Skill analysis in bullets for Grammar, Vocabulary, Reading, Writing
4) Top 3 actions for improvement this week`;
}

function buildWritingEvalPrompt(writingTasks, responses) {
  return `Evaluate the learner's two writing responses for a placement test.

Tasks:
${JSON.stringify(writingTasks)}

Learner responses:
${JSON.stringify(responses)}

Return plain text with:
1) Score /10 for each task
2) 2 strengths for each task
3) 2 improvements for each task
4) One corrected sample sentence per task
5) Overall writing level estimate (A2/B1/B2)`;
}

function renderLoading(message) {
  const container = document.getElementById('mockTestContainer');
  container.style.display = 'block';
  container.innerHTML = `
    <div class="mt-loading">
      <div class="mt-spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

function renderError(message) {
  const container = document.getElementById('mockTestContainer');
  container.style.display = 'block';
  container.innerHTML = `<div class="mt-error"><strong>Error:</strong> ${escapeHtml(message)}</div>`;
}

function updateProgress() {
  const completed = mockAnswers.filter((a) => a !== null).length;
  const total = mockAnswers.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const progressText = document.getElementById('mockProgressText');
  const progressFill = document.getElementById('mockProgressFill');
  const submitBtn = document.getElementById('submitMockBtn');

  if (progressText) progressText.textContent = `${completed} / ${total} answered`;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (submitBtn) submitBtn.disabled = completed !== total;
}

function handleMockAnswer(qIdx, optIdx) {
  mockAnswers[qIdx] = optIdx;

  for (let i = 0; i < 4; i += 1) {
    const el = document.getElementById(`mock-opt-${qIdx}-${i}`);
    if (el) el.classList.toggle('selected', i === optIdx);
  }

  updateProgress();
}

function renderMockTest() {
  const container = document.getElementById('mockTestContainer');
  const mcq = mockTestData.mcq;
  const writingTasks = mockTestData.writingTasks;

  let html = `
    <div class="mt-header">
      <h3>AI-Generated Final Mock Test</h3>
      <p class="mt-sub">Freshly generated for this attempt.</p>
      <div class="mt-progress-wrap">
        <div class="mt-progress-track"><div id="mockProgressFill" style="width:0%"></div></div>
        <span id="mockProgressText">0 / ${mcq.length} answered</span>
      </div>
    </div>
    <div class="mt-mcq">`;

  mcq.forEach((q, i) => {
    html += `
      <section class="mt-card" id="mock-card-${i}">
        <h4>Q${i + 1}. ${escapeHtml(q.q)}</h4>
        <p class="mt-skill">Skill: ${escapeHtml(q.skill || 'General')}</p>
        <div class="mt-options">
          ${q.options.map((opt, j) => `
            <label class="mt-option" id="mock-opt-${i}-${j}">
              <input type="radio" name="mock-q${i}" value="${j}" onchange="handleMockAnswer(${i}, ${j})">
              <span>${escapeHtml(opt)}</span>
            </label>`).join('')}
        </div>
      </section>`;
  });

  html += `</div>
    <div class="mt-writing">
      <h3>Writing Tasks</h3>
      ${writingTasks.map((task, i) => `
        <section class="mt-card">
          <h4>${escapeHtml(task.title)}</h4>
          <p>${escapeHtml(task.prompt)}</p>
          <p class="mt-skill">Target words: ${escapeHtml(task.targetWords || 'N/A')}</p>
          <textarea id="writingTask-${i}" class="mt-textarea" placeholder="Write your response here..."></textarea>
        </section>`).join('')}
    </div>
    <div class="mt-actions">
      <button id="submitMockBtn" class="mt-btn" onclick="submitMockTest()" disabled>Submit and Evaluate</button>
      <button class="mt-btn mt-btn-secondary" onclick="generateMockTest()">Generate New Mock Test</button>
    </div>
    <div id="mockResultBox" style="display:none"></div>`;

  container.innerHTML = html;
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
  updateProgress();
}

async function generateMockTest() {
  const level = document.getElementById('mockLevel').value;
  const btn = document.getElementById('generateMockBtn');
  btn.disabled = true;
  renderLoading('Claude is generating a brand new full mock test...');

  try {
    const raw = await callClaude(
      [{ role: 'user', content: buildMockPrompt(level) }],
      'You are an expert English placement test writer for adult migrants in New Zealand.'
    );

    const parsed = JSON.parse(stripJsonFences(raw));

    const sanitizedMcq = (Array.isArray(parsed.mcq) ? parsed.mcq : [])
      .map((item) => {
        const options = Array.isArray(item?.options) ? item.options.slice(0, 4).map((x) => String(x || '').trim()) : [];
        if (options.length !== 4 || options.some((x) => !x)) return null;

        const answer = Number.isInteger(item?.answer) && item.answer >= 0 && item.answer < 4 ? item.answer : 0;
        return {
          skill: String(item?.skill || 'General'),
          q: String(item?.q || '').trim(),
          options,
          answer,
          explanation: String(item?.explanation || '').trim()
        };
      })
      .filter((x) => x && x.q)
      .slice(0, 30);

    const fallbackWriting = [
      {
        title: 'Task 1: Personal Paragraph',
        prompt: 'Write 120-160 words introducing yourself, your daily routine, and your goals in New Zealand.',
        targetWords: '120-160'
      },
      {
        title: 'Task 2: Short Letter',
        prompt: 'Write 120-160 words to a friend about your life in Auckland, challenges, and future plans.',
        targetWords: '120-160'
      }
    ];

    const sanitizedWriting = (Array.isArray(parsed.writingTasks) ? parsed.writingTasks : [])
      .map((task) => ({
        title: String(task?.title || '').trim(),
        prompt: String(task?.prompt || '').trim(),
        targetWords: String(task?.targetWords || '').trim()
      }))
      .filter((task) => task.title && task.prompt)
      .slice(0, 2);

    if (sanitizedMcq.length < 20) {
      throw new Error('AI returned too few valid questions. Please generate again.');
    }

    mockTestData = {
      mcq: sanitizedMcq,
      writingTasks: sanitizedWriting.length ? sanitizedWriting : fallbackWriting
    };
    mockAnswers = new Array(mockTestData.mcq.length).fill(null);
    renderMockTest();

    if (sanitizedMcq.length < 30) {
      const container = document.getElementById('mockTestContainer');
      const note = document.createElement('div');
      note.className = 'mt-note';
      note.textContent = `AI generated ${sanitizedMcq.length} valid MCQ items this time instead of 30. You can still continue, or generate a new test.`;
      container.prepend(note);
    }
  } catch (e) {
    renderError(e.message);
  } finally {
    btn.disabled = false;
  }
}

async function submitMockTest() {
  if (!mockTestData) return;

  const mcq = mockTestData.mcq;
  const total = mcq.length;
  const score = mcq.filter((q, i) => mockAnswers[i] === q.answer).length;
  const pct = Math.round((score / total) * 100);

  // Lock MCQ options and show correctness markers.
  mcq.forEach((q, i) => {
    const selected = mockAnswers[i];
    const selectedEl = document.getElementById(`mock-opt-${i}-${selected}`);
    const correctEl = document.getElementById(`mock-opt-${i}-${q.answer}`);
    const isCorrect = selected === q.answer;

    if (selectedEl) selectedEl.classList.add(isCorrect ? 'mt-correct' : 'mt-incorrect');
    if (!isCorrect && correctEl) correctEl.classList.add('mt-correct');

    for (let j = 0; j < q.options.length; j += 1) {
      const inp = document.querySelector(`input[name="mock-q${i}"][value="${j}"]`);
      if (inp) inp.disabled = true;
    }
  });

  const writingResponses = mockTestData.writingTasks.map((_, i) => {
    const text = document.getElementById(`writingTask-${i}`)?.value || '';
    return text.trim();
  });

  const weakSkills = {};
  mcq.forEach((q, i) => {
    if (mockAnswers[i] !== q.answer) {
      weakSkills[q.skill] = (weakSkills[q.skill] || 0) + 1;
    }
  });

  const resultBox = document.getElementById('mockResultBox');
  resultBox.style.display = 'block';
  resultBox.innerHTML = `
    <div class="mt-result">
      <h3>Final Mock Result</h3>
      <p><strong>Score:</strong> ${score} / ${total} (${pct}%)</p>
      <div id="mockAiFeedback" class="mt-feedback"><em>Generating AI performance evaluation...</em></div>
      <div id="mockWritingFeedback" class="mt-feedback"><em>Evaluating writing tasks...</em></div>
    </div>`;

  resultBox.scrollIntoView({ behavior: 'smooth' });

  try {
    const aiFeedback = await callClaude(
      [{
        role: 'user',
        content: buildMcqFeedbackPrompt({
          score,
          total,
          percentage: pct,
          weakSkills,
          incorrectCount: total - score
        })
      }],
      'You are a practical and encouraging placement tutor.'
    );
    document.getElementById('mockAiFeedback').innerHTML =
      `<div><strong>AI Test Feedback</strong><br><br>${escapeHtml(aiFeedback).replace(/\n/g, '<br>')}</div>`;
  } catch (e) {
    document.getElementById('mockAiFeedback').innerHTML =
      `<div class="mt-error">Could not generate AI test feedback: ${escapeHtml(e.message)}</div>`;
  }

  try {
    const hasWriting = writingResponses.some((text) => text.length >= 40);
    if (!hasWriting) {
      document.getElementById('mockWritingFeedback').innerHTML =
        '<div class="mt-note">Writing tasks were not completed, so writing evaluation was skipped.</div>';
      return;
    }

    const writingFeedback = await callClaude(
      [{
        role: 'user',
        content: buildWritingEvalPrompt(mockTestData.writingTasks, writingResponses)
      }],
      'You are a supportive writing assessor for adult English learners.'
    );

    document.getElementById('mockWritingFeedback').innerHTML =
      `<div><strong>AI Writing Evaluation</strong><br><br>${escapeHtml(writingFeedback).replace(/\n/g, '<br>')}</div>`;
  } catch (e) {
    document.getElementById('mockWritingFeedback').innerHTML =
      `<div class="mt-error">Could not evaluate writing tasks: ${escapeHtml(e.message)}</div>`;
  }
}

window.generateMockTest = generateMockTest;
window.handleMockAnswer = handleMockAnswer;
window.submitMockTest = submitMockTest;
