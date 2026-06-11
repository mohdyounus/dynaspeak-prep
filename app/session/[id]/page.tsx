'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { SpeakingPart, SpeakingSession, TranscriptEntry } from '@/lib/ielts/types';
import MicButton from '@/components/MicButton';
import Waveform from '@/components/Waveform';
import LiveCaptions from '@/components/LiveCaptions';
import CueCard from '@/components/CueCard';
import { BrowserVoiceSession, MockVoiceSession, VoiceSession } from '@/lib/realtime';
import { getSilenceThreshold } from '@/lib/turnDetection';

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
  const [localTranscript, setLocalTranscript] = useState<TranscriptEntry[]>([]);
  const [part, setPart] = useState<SpeakingPart>('part1');
  const [micEnabled, setMicEnabled] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'browser' | 'mock'>('browser');

  const voiceRef = useRef<VoiceSession | null>(null);
  const greetedRef = useRef(false);
  const cueCompleteRef = useRef(false);

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

  const transcript = useMemo(() => {
    if (localTranscript.length) return localTranscript;
    if (session?.transcript?.length) return session.transcript;
    return SAMPLE_TRANSCRIPT;
  }, [localTranscript, session]);

  useEffect(() => {
    if (!session) return;
    if (!voiceRef.current) {
      let voice: VoiceSession;
      try {
        voice = new BrowserVoiceSession();
        setVoiceMode('browser');
      } catch {
        voice = new MockVoiceSession();
        setVoiceMode('mock');
      }
      voice.onTranscript((entry) => {
        setLocalTranscript((prev) => [...prev, entry]);

        if (entry.role === 'student') {
          const normalized = entry.text.toLowerCase();
          if (
            normalized.includes("i'm done")
            || normalized.includes('end interview')
            || normalized.includes('goodbye')
          ) {
            endSession();
            return;
          }

          void respondToStudent(entry.text);
        }
      });
      voice.onStateChange((next) => {
        if (next !== 'ended') {
          setState(next as 'listening' | 'speaking' | 'thinking');
        }
      });
      voiceRef.current = voice;
    }
  }, [session]);

  useEffect(() => {
    if (!micEnabled || !voiceRef.current || greetedRef.current) return;
    greetedRef.current = true;
    void voiceRef.current.speak('Welcome to your IELTS speaking practice. Let us begin with Part 1. Could you introduce yourself?');
  }, [micEnabled]);

  async function respondToStudent(answer: string) {
    if (!voiceRef.current) return;

    if (part === 'part1') {
      const questions = [
        'Thank you. What kind of work or study do you do at the moment?',
        'How often do you use English in your daily life?'
      ];
      const studentTurns = transcript.filter((t) => t.role === 'student').length;
      if (studentTurns >= 3) {
        setPart('part2');
        cueCompleteRef.current = false;
        await voiceRef.current.speak('Now we will move to Part 2. Please read the cue card, prepare for one minute, then speak for one to two minutes.');
        return;
      }
      await voiceRef.current.speak(questions[Math.min(studentTurns - 1, questions.length - 1)] || 'Could you expand that with an example?');
      return;
    }

    if (part === 'part2') {
      if (!cueCompleteRef.current) {
        cueCompleteRef.current = true;
        await voiceRef.current.speak('Thank you for your long turn. I have one follow-up question: what was the most difficult part for you?');
        return;
      }

      setPart('part3');
      await voiceRef.current.speak('Great. We are now in Part 3. Do you think technology has made communication better or worse in society?');
      return;
    }

    const followUps = [
      'That is an interesting point. Could you compare this with the past? ',
      'What changes do you predict in the next ten years?',
      'Thank you. We can finish here when you are ready. You can say I am done.'
    ];
    const part3StudentTurns = transcript.filter((t) => t.role === 'student').length;
    await voiceRef.current.speak(followUps[Math.min(part3StudentTurns - 1, followUps.length - 1)] || 'Please continue with one clear example.');
    void answer;
  }

  async function toggleMic() {
    if (!voiceRef.current) return;

    if (!micEnabled) {
      setError('');
      setMicEnabled(true);
      try {
        await voiceRef.current.start('IELTS speaking live prompt.');
      } catch {
        setError('Browser speech recognition is not available, switching to mock mode.');
        const fallback = new MockVoiceSession();
        fallback.onTranscript((entry) => {
          setLocalTranscript((prev) => [...prev, entry]);
          if (entry.role === 'student') {
            const normalized = entry.text.toLowerCase();
            if (normalized.includes("i'm done") || normalized.includes('end interview') || normalized.includes('goodbye')) {
              endSession();
              return;
            }
            void respondToStudent(entry.text);
          }
        });
        fallback.onStateChange((next) => {
          if (next !== 'ended') {
            setState(next as 'listening' | 'speaking' | 'thinking');
          }
        });
        voiceRef.current = fallback;
        setVoiceMode('mock');
        await fallback.start('IELTS speaking mock prompt.');
      }
      return;
    }

    setMicEnabled(false);
    const endedTranscript = await voiceRef.current.end();
    setLocalTranscript(endedTranscript);
    setState('thinking');
  }

  function partLabel(current: SpeakingPart): string {
    if (current === 'part1') return 'Part 1 · Warm-up';
    if (current === 'part2') return 'Part 2 · Long Turn';
    return 'Part 3 · Discussion';
  }

  async function endSession() {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    setState('thinking');

    try {
      const capturedTranscript = voiceRef.current ? await voiceRef.current.end() : transcript;

      const endRes = await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript: capturedTranscript,
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
        <p className="speaking-muted">Voice mode: {voiceMode === 'browser' ? 'Browser Speech (live)' : 'Mock fallback'}</p>
        <p className="part-chip">{partLabel(part)}</p>
        <p className="speaking-muted">Turn detection: {getSilenceThreshold(part === 'part2' ? 'monologue' : 'normal')}ms silence threshold</p>

        <div className="speaking-toolbar">
          <MicButton state={state} disabled={busy} onToggle={toggleMic} />
          <Waveform active={state === 'speaking'} />
          <div className={`speaking-state speaking-${state}`}>
            {state === 'listening' ? 'Listening' : state === 'speaking' ? 'Examiner Speaking' : 'Thinking'}
          </div>
        </div>

        <div className="speaking-actions">
          <button type="button" onClick={() => setPart('part1')} disabled={busy}>
            Part 1
          </button>
          <button type="button" onClick={() => setPart('part2')} disabled={busy}>
            Part 2
          </button>
          <button type="button" onClick={() => setPart('part3')} disabled={busy}>
            Part 3
          </button>
          <button type="button" onClick={endSession} disabled={busy}>
            {busy ? 'Ending...' : 'End Interview'}
          </button>
        </div>

        {error ? <p className="speaking-error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Live Captions</h2>
        <LiveCaptions transcript={transcript} />
      </section>

      <section className="card">
        <CueCard
          active={part === 'part2'}
          topic="Describe a project you are proud of"
          bullets={[
            'What the project was about',
            'What your role was',
            'What challenges you faced',
            'Why you are proud of it'
          ]}
        />
      </section>
    </div>
  );
}
