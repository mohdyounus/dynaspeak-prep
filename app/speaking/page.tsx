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
  const [startPart, setStartPart] = useState<'part1' | 'part2' | 'part3'>('part1');
  const [attemptNo, setAttemptNo] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function profileAttemptKey(nextTarget: string, nextGithub: string, nextSummary: string) {
    const keyTarget = nextTarget.trim() || '6.5';
    const keyGithub = nextGithub.trim().toLowerCase() || '-';
    const keySummary = nextSummary.trim().slice(0, 80).toLowerCase() || '-';
    return `speaking-attempt:${keyTarget}:${keyGithub}:${keySummary}`;
  }

  useEffect(() => {
    const target = (searchParams.get('target') || '').trim();
    const github = (searchParams.get('github') || '').trim();
    const summary = (searchParams.get('summary') || '').trim();
    const focus = (searchParams.get('focus') || '').trim();

    if (target) setTargetScore(target);
    if (github) setGithubUsername(github);
    if (summary) setProfileSummary(summary);
    if (focus) setFocusInput(focus);

    const effectiveTarget = target || '6.5';
    const key = profileAttemptKey(effectiveTarget, github, summary);
    const stored = typeof window !== 'undefined' ? Number(window.localStorage.getItem(key) || '0') : 0;
    setAttemptNo(Number.isFinite(stored) && stored > 0 ? stored + 1 : 1);
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
      const key = profileAttemptKey(targetScore, githubUsername, profileSummary);
      const current = typeof window !== 'undefined' ? Number(window.localStorage.getItem(key) || '0') : 0;
      const nextAttempt = Number.isFinite(current) ? current + 1 : 1;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, String(nextAttempt));
      }

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

      router.push(`/session/${data.sessionId}?startPart=${startPart}`);
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
      <p className="speaking-muted">Attempt: {attemptNo}</p>

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

        <fieldset className="part-fieldset">
          <legend>Start at</legend>
          <div className="part-selector">
            {([
              { value: 'part1', label: 'Part 1', sub: 'Warm-up questions' },
              { value: 'part2', label: 'Part 2', sub: 'Long turn / Cue card' },
              { value: 'part3', label: 'Part 3', sub: 'Discussion' }
            ] as const).map((p) => (
              <button
                key={p.value}
                type="button"
                className={`part-select-btn${startPart === p.value ? ' active' : ''}`}
                onClick={() => setStartPart(p.value)}
              >
                <strong>{p.label}</strong>
                <span>{p.sub}</span>
              </button>
            ))}
          </div>
        </fieldset>

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
