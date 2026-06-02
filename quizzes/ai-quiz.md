---
layout: default
title: AI Practice Quiz
nav_order: 5
description: "Generate custom practice questions for any lesson using AI — powered by Claude."
---

# AI Practice Quiz

Generate fresh multiple-choice questions on any lesson topic, then get personalised feedback on your answers — all powered by the Claude AI.

> **Note:** Questions are created live each time you click **Generate**, so you get a different set every attempt.

---

## Setup

<div class="aiq-setup-card">
  <div class="aiq-setup-row">
    <label for="apiKey"><strong>Claude API Key</strong><br>
    <small>Get yours free at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a> — your key is only used in your browser.</small></label>
    <input type="password" id="apiKey" class="aiq-api-input" placeholder="sk-ant-api03-…" autocomplete="off">
  </div>
  <div class="aiq-setup-row">
    <label for="topicSelect"><strong>Select a Topic</strong></label>
    <select id="topicSelect" class="aiq-topic-select"></select>
  </div>
  <button id="generateBtn" class="aiq-generate-btn" onclick="generateQuiz()">
    ✦ Generate Quiz
  </button>
</div>

<div id="quiz-container" style="display:none;margin-top:2rem"></div>

<style>
/* ── Setup card ──────────────────────────────────────────── */
.aiq-setup-card {
  background: var(--sidebar-color, #f5f6fa);
  border: 1px solid var(--border-color, #dce0e8);
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 640px;
}
.aiq-setup-row {
  margin-bottom: 1rem;
}
.aiq-setup-row label {
  display: block;
  margin-bottom: .4rem;
  font-size: .95rem;
}
.aiq-setup-row small {
  font-weight: 400;
  color: var(--body-text-color, #555);
}
.aiq-api-input,
.aiq-topic-select {
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 5px;
  font-size: .95rem;
  background: var(--body-background-color, #fff);
  color: var(--body-text-color, #333);
  box-sizing: border-box;
}
.aiq-generate-btn {
  margin-top: .5rem;
  padding: .65rem 1.6rem;
  background: var(--link-color, #7253ed);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.aiq-generate-btn:hover { opacity: .88; }
.aiq-generate-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Loading ─────────────────────────────────────────────── */
.aiq-loading {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--body-text-color, #555);
}
.aiq-spinner {
  display: inline-block;
  width: 36px; height: 36px;
  border: 4px solid var(--border-color, #dce0e8);
  border-top-color: var(--link-color, #7253ed);
  border-radius: 50%;
  animation: aiq-spin .8s linear infinite;
  margin-bottom: 1rem;
}
@keyframes aiq-spin { to { transform: rotate(360deg); } }

/* ── Error ───────────────────────────────────────────────── */
.aiq-error {
  background: #fff3f3;
  border: 1px solid #f5c6c6;
  border-radius: 6px;
  padding: 1rem 1.25rem;
  color: #a51d1d;
}
.aiq-error-small {
  font-size: .85rem;
  color: #a51d1d;
}

/* ── Quiz header ─────────────────────────────────────────── */
.aiq-header {
  margin-bottom: 1.5rem;
}
.aiq-header h3 {
  margin-bottom: .25rem;
}
.aiq-level {
  font-size: .9rem;
  color: var(--body-text-color, #555);
  margin-bottom: .75rem;
}
.aiq-progress-wrap {
  display: flex;
  align-items: center;
  gap: .75rem;
}
.aiq-progress-bar {
  flex: 1;
  height: 8px;
  background: var(--border-color, #dce0e8);
  border-radius: 99px;
  overflow: hidden;
}
.aiq-progress-bar > div {
  height: 100%;
  background: var(--link-color, #7253ed);
  border-radius: 99px;
  transition: width .25s ease;
}
#aiqProgressText {
  font-size: .85rem;
  white-space: nowrap;
  color: var(--body-text-color, #555);
}

/* ── Questions ───────────────────────────────────────────── */
.aiq-questions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.aiq-question {
  border: 1px solid var(--border-color, #dce0e8);
  border-radius: 8px;
  padding: 1rem 1.25rem;
}
.aiq-q-text {
  margin-bottom: .75rem;
}
.aiq-options {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.aiq-option {
  display: flex;
  align-items: flex-start;
  gap: .6rem;
  padding: .55rem .85rem;
  border: 1.5px solid var(--border-color, #dce0e8);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  line-height: 1.4;
}
.aiq-option:hover {
  border-color: var(--link-color, #7253ed);
  background: var(--sidebar-color, #f5f6fa);
}
.aiq-option.selected {
  border-color: var(--link-color, #7253ed);
  background: #f0edff;
}
.aiq-option input[type="radio"] {
  margin-top: 3px;
  flex-shrink: 0;
}
.aiq-option.aiq-correct {
  border-color: #2da44e;
  background: #f0fff4;
}
.aiq-option.aiq-incorrect {
  border-color: #cf222e;
  background: #fff0f0;
}

/* ── Submit ──────────────────────────────────────────────── */
.aiq-submit {
  display: block;
  margin: 2rem 0 0;
  padding: .7rem 2rem;
  background: var(--link-color, #7253ed);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.aiq-submit:hover:not(:disabled) { opacity: .88; }
.aiq-submit:disabled {
  opacity: .45;
  cursor: not-allowed;
}

/* ── Score ───────────────────────────────────────────────── */
.aiq-score {
  margin-top: 2.5rem;
  padding: 1.5rem;
  border: 1px solid var(--border-color, #dce0e8);
  border-radius: 8px;
  background: var(--sidebar-color, #f5f6fa);
}
.aiq-score h3 {
  margin-top: 0;
}

/* ── AI Feedback ─────────────────────────────────────────── */
.aiq-feedback-wrap {
  margin: 1rem 0;
  font-style: italic;
  color: var(--body-text-color, #555);
}
.aiq-feedback {
  background: #fffbeb;
  border: 1px solid #f0c040;
  border-radius: 6px;
  padding: 1rem 1.25rem;
  font-style: normal;
  line-height: 1.6;
}

/* ── Review ──────────────────────────────────────────────── */
.aiq-review {
  margin-top: 1.5rem;
}
.aiq-review h4 {
  margin-bottom: .75rem;
}
.aiq-review details {
  border: 1px solid var(--border-color, #dce0e8);
  border-radius: 6px;
  padding: .6rem .9rem;
  margin-bottom: .5rem;
  background: var(--body-background-color, #fff);
}
.aiq-review details summary {
  cursor: pointer;
  font-weight: 500;
  list-style: none;
  outline: none;
}
.aiq-review details summary::-webkit-details-marker { display: none; }
.aiq-review details[open] summary {
  margin-bottom: .5rem;
}
.aiq-review details p {
  margin: .3rem 0;
  font-size: .92rem;
}

/* ── Action buttons ──────────────────────────────────────── */
.aiq-actions {
  display: flex;
  gap: .75rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}
.aiq-btn-secondary {
  padding: .55rem 1.25rem;
  border: 1.5px solid var(--link-color, #7253ed);
  background: transparent;
  color: var(--link-color, #7253ed);
  border-radius: 5px;
  font-size: .95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.aiq-btn-secondary:hover {
  background: var(--link-color, #7253ed);
  color: #fff;
}
</style>

<script src="{{ '/assets/js/ai-quiz.js' | relative_url }}"></script>
