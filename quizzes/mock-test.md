---
layout: default
title: "Final Mock Test - All Skills"
nav_order: 99
---

# Final Mock Test - All Skills

Covers all key skills (grammar, vocabulary, reading, writing) in one full attempt.

- Format: Freshly generated each time with AI
- Questions: 30 multiple choice + 2 writing tasks
- Time: 45-60 minutes recommended

Click Generate New Final Mock Test to create a new paper every attempt, then submit for AI evaluation.

---

<div class="mt-shell">
  <div class="mt-setup-card">
    <div class="mt-row">
      <label for="mockLevel"><strong>Difficulty Profile</strong></label>
      <select id="mockLevel" class="mt-select">
        <option value="Beginner to Elementary">Beginner to Elementary</option>
        <option value="Elementary to Intermediate" selected>Elementary to Intermediate</option>
        <option value="Intermediate">Intermediate</option>
      </select>
    </div>
    <button id="generateMockBtn" class="mt-btn" onclick="generateMockTest()">Generate New Final Mock Test</button>
  </div>

  <div id="mockTestContainer" style="display:none;margin-top:1.2rem"></div>
</div>

---

Home: [Back to home](/)

<style>
.mt-shell {
  margin-top: 1rem;
}
.mt-setup-card {
  background: var(--sidebar-color, #f5f6fa);
  border: 1px solid var(--border-color, #dce0e8);
  border-radius: 8px;
  padding: 1.2rem;
  max-width: 760px;
}
.mt-row {
  margin-bottom: 0.9rem;
}
.mt-row label {
  display: block;
  margin-bottom: 0.4rem;
}
.mt-select {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 5px;
  box-sizing: border-box;
  font-size: 0.95rem;
}
.mt-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  background: var(--link-color, #2563eb);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.mt-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.mt-btn-secondary {
  background: #fff;
  color: #1e293b;
  border: 1px solid #94a3b8;
}
.mt-loading {
  text-align: center;
  padding: 2rem 1rem;
}
.mt-spinner {
  display: inline-block;
  width: 34px;
  height: 34px;
  border: 4px solid #dce0e8;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: mt-spin 0.8s linear infinite;
  margin-bottom: 0.8rem;
}
@keyframes mt-spin {
  to { transform: rotate(360deg); }
}
.mt-error {
  margin-top: 1rem;
  background: #fff3f3;
  border: 1px solid #f5c6c6;
  border-radius: 6px;
  padding: 0.9rem 1rem;
  color: #a51d1d;
}
.mt-note {
  margin-top: 1rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.9rem 1rem;
  color: #334155;
}
.mt-header {
  margin-bottom: 1rem;
}
.mt-sub {
  margin-top: 0.2rem;
  color: #555;
}
.mt-progress-wrap {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.mt-progress-track {
  flex: 1;
  height: 9px;
  border-radius: 99px;
  background: #e2e8f0;
  overflow: hidden;
}
.mt-progress-track > div {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #2563eb);
  transition: width 0.2s ease;
}
.mt-mcq,
.mt-writing {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.mt-writing {
  margin-top: 1.4rem;
}
.mt-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 0.9rem 1rem;
}
.mt-card h4 {
  margin: 0 0 0.45rem;
}
.mt-skill {
  font-size: 0.87rem;
  color: #475569;
  margin-bottom: 0.6rem;
}
.mt-options {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.mt-option {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border: 1.5px solid #dce0e8;
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  cursor: pointer;
}
.mt-option.selected {
  border-color: #2563eb;
  background: #eff6ff;
}
.mt-option.mt-correct {
  border-color: #15803d;
  background: #f0fff4;
}
.mt-option.mt-incorrect {
  border-color: #b91c1c;
  background: #fff1f2;
}
.mt-textarea {
  width: 100%;
  min-height: 150px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.7rem;
  line-height: 1.5;
  font-size: 0.95rem;
  box-sizing: border-box;
  resize: vertical;
}
.mt-actions {
  margin-top: 1.2rem;
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}
.mt-result {
  margin-top: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 1rem;
}
.mt-feedback {
  margin-top: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  padding: 0.75rem;
}
</style>

