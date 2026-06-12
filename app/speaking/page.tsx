'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SpeakingSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [targetScore, setTargetScore] = useState('6.5');
  const [githubUsername, setGithubUsername] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [focusInput, setFocusInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const target = (searchParams.get('target') || '').trim();
    const github = (searchParams.get('github') || '').trim();
    const summary = (searchParams.get('summary') || '').trim();
    const focus = (searchParams.get('focus') || '').trim();

    if (target) setTargetScore(target);
    if (github) setGithubUsername(github);
    if (summary) setProfileSummary(summary);
    if (focus) setFocusInput(focus);
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const focus = focusInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetScore, githubUsername, profileSummary, focus })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not create session.');
        return;
      }

      router.push(`/session/${data.sessionId}`);
    } catch {
      setError('Network error while creating session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card speaking-shell">
      <h1>IELTS Speaking Tutor</h1>
      <p className="speaking-muted">
        Start a guided IELTS speaking session. This is M1 scaffold with personalization and session persistence.
      </p>

      <form onSubmit={onSubmit} className="speaking-form">
        <label>
          Target Band
          <select value={targetScore} onChange={(e) => setTargetScore(e.target.value)}>
            {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          GitHub Username (optional)
          <input
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="e.g. mohdyounus"
          />
        </label>

        <label>
          Profile Summary (optional)
          <textarea
            value={profileSummary}
            onChange={(e) => setProfileSummary(e.target.value)}
            rows={6}
            placeholder="Paste your work/study summary here to personalize speaking topics."
          />
        </label>

        <label>
          Focus Areas (optional, comma separated)
          <input
            value={focusInput}
            onChange={(e) => setFocusInput(e.target.value)}
            placeholder="e.g. Part 2 fluency, tense consistency, vocabulary precision"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Session...' : 'Start Interview'}
        </button>

        {error ? <p className="speaking-error">{error}</p> : null}
      </form>
    </div>
  );
}

export default function SpeakingSetupPage() {
  return (
    <Suspense fallback={<div className="card speaking-shell"><p className="speaking-muted">Loading speaking setup...</p></div>}>
      <SpeakingSetupContent />
    </Suspense>
  );
}
