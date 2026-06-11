'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { SpeakingSession, TranscriptEntry } from '@/lib/ielts/types';

const SAMPLE_TRANSCRIPT: TranscriptEntry[] = [
  { role: 'examiner', text: 'Welcome. Could you tell me your full name, please?', ts: Date.now() - 60000 },
  { role: 'student', text: 'My name is Alex. I am preparing for IELTS speaking.', ts: Date.now() - 50000 },
  { role: 'examiner', text: 'Great. Let us begin with Part 1. What kind of work do you do?', ts: Date.now() - 40000 }
];

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params?.id;

  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [state, setState] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to load session.');
          return;
        }
        if (active) setSession(data.session);
      } catch {
        if (active) setError('Network error while loading session.');
      }
    }
    if (sessionId) load();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const transcript = useMemo(() => session?.transcript?.length ? session.transcript : SAMPLE_TRANSCRIPT, [session]);

  async function endSession() {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    setState('thinking');

    try {
      const endRes = await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript,
          durationSec: 600
        })
      });
      const endData = await endRes.json();
      if (!endRes.ok) {
        setError(endData?.error || 'Failed to end session.');
        return;
      }

      await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      router.push(`/report/${sessionId}`);
    } catch {
      setError('Network error while ending session.');
    } finally {
      setBusy(false);
      setState('listening');
    }
  }

  return (
    <div className="list-grid">
      <section className="card speaking-header">
        <h1>Live Speaking Session</h1>
        <p className="speaking-muted">Session ID: {sessionId}</p>
        <p className="speaking-muted">Target: {session?.targetScore || '6.5'} | Status: {session?.status || 'loading'}</p>

        <div className={`speaking-state speaking-${state}`}>
          {state === 'listening' ? 'Listening' : state === 'speaking' ? 'Examiner Speaking' : 'Thinking'}
        </div>

        <div className="speaking-actions">
          <button type="button" onClick={() => setState('listening')} disabled={busy}>
            Set Listening
          </button>
          <button type="button" onClick={() => setState('speaking')} disabled={busy}>
            Set Speaking
          </button>
          <button type="button" onClick={endSession} disabled={busy}>
            {busy ? 'Ending...' : 'End Interview'}
          </button>
        </div>

        {error ? <p className="speaking-error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Live Captions</h2>
        <div className="speaking-captions">
          {transcript.map((item, idx) => (
            <div key={`${item.ts}-${idx}`} className={`cap-row ${item.role}`}>
              <strong>{item.role === 'examiner' ? 'Examiner' : 'Student'}:</strong> {item.text}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Cue Card (Part 2 Preview)</h2>
        <p className="speaking-muted">
          M1 scaffold: cue card timers and turn-detection tools will be added in M4.
        </p>
      </section>
    </div>
  );
}
