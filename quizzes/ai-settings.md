---
layout: default
title: AI Settings
nav_order: 4
description: "Claude key is now configured securely on the server via Vercel environment variables."
---

# AI Settings

Claude is now configured server-side. You do not need to paste your API key on this site anymore.

<div class="ais-card">
  <h3 class="ais-heading">Secure Mode Enabled</h3>
  <p class="ais-note">
    AI quiz requests now go through a Next.js server endpoint that reads
    <code>ANTHROPIC_API_KEY</code> from Vercel environment variables.
  </p>
  <p class="ais-note">
    This keeps your key out of the browser and avoids entering it repeatedly.
  </p>
</div>

<style>
.ais-card {
  background: var(--sidebar-color, #f5f6fa);
  border: 1px solid var(--border-color, #dce0e8);
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 640px;
}
.ais-heading {
  margin-top: 0;
}
.ais-note {
  margin-top: .4rem;
  color: var(--body-text-color, #555);
  font-size: .9rem;
}
</style>

---

Back to [AI quiz](/quizzes/ai-quiz) or [Home](/).
