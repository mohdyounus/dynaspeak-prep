---
layout: default
title: AI Settings
nav_order: 4
description: "Save your Claude API key once for all AI quiz pages in this browser."
---

# AI Settings

Save your Claude API key once, and all AI quiz pages will use it automatically in this browser.

<div class="ais-card">
  <label for="sharedApiKey"><strong>Claude API Key</strong></label>
  <input type="password" id="sharedApiKey" class="ais-input" placeholder="sk-ant-api03-..." autocomplete="off">

  <div class="ais-actions">
    <button id="saveSharedKeyBtn" class="ais-btn" onclick="saveSharedKey()">Save Key</button>
    <button class="ais-btn-secondary" onclick="clearSharedKey()">Clear Key</button>
  </div>

  <p id="aisStatus" class="ais-status"></p>

  <p class="ais-note">
    This key is saved in your browser local storage on this device only.
    It is not encrypted and is accessible to scripts running on this site.
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
.ais-input {
  width: 100%;
  margin-top: .4rem;
  padding: .55rem .75rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 5px;
  font-size: .95rem;
  box-sizing: border-box;
}
.ais-actions {
  margin-top: .9rem;
  display: flex;
  gap: .7rem;
  flex-wrap: wrap;
}
.ais-btn,
.ais-btn-secondary {
  padding: .55rem 1.15rem;
  border-radius: 5px;
  font-size: .93rem;
  font-weight: 600;
  cursor: pointer;
}
.ais-btn {
  border: none;
  background: var(--link-color, #7253ed);
  color: #fff;
}
.ais-btn-secondary {
  border: 1px solid var(--link-color, #7253ed);
  background: transparent;
  color: var(--link-color, #7253ed);
}
.ais-status {
  margin-top: .8rem;
  min-height: 1.2rem;
  font-weight: 600;
}
.ais-note {
  margin-top: .9rem;
  color: var(--body-text-color, #555);
  font-size: .9rem;
}
</style>

<script>
(function () {
  const STORAGE_KEY = 'dynaspeak_claude_api_key';

  function loadSharedKey() {
    const saved = localStorage.getItem(STORAGE_KEY) || '';
    const input = document.getElementById('sharedApiKey');
    const status = document.getElementById('aisStatus');
    if (!input || !status) return;

    if (saved) {
      input.value = saved;
      status.textContent = 'Key loaded from browser storage.';
      status.style.color = '#2da44e';
    } else {
      status.textContent = 'No shared key saved yet.';
      status.style.color = '#555';
    }
  }

  window.saveSharedKey = function saveSharedKey() {
    const input = document.getElementById('sharedApiKey');
    const status = document.getElementById('aisStatus');
    if (!input || !status) return;

    const key = input.value.trim();
    if (!key) {
      status.textContent = 'Please enter a valid key first.';
      status.style.color = '#a51d1d';
      return;
    }

    localStorage.setItem(STORAGE_KEY, key);
    status.textContent = 'Saved. AI quiz pages can now use this key automatically.';
    status.style.color = '#2da44e';
  };

  window.clearSharedKey = function clearSharedKey() {
    const input = document.getElementById('sharedApiKey');
    const status = document.getElementById('aisStatus');
    if (!input || !status) return;

    localStorage.removeItem(STORAGE_KEY);
    input.value = '';
    status.textContent = 'Shared key removed from this browser.';
    status.style.color = '#a51d1d';
  };

  document.addEventListener('DOMContentLoaded', loadSharedKey);
})();
</script>
