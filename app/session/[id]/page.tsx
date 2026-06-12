'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { SpeakingPart, SpeakingSession, TranscriptEntry } from '@/lib/ielts/types';
import MicButton from '@/components/MicButton';
import Waveform from '@/components/Waveform';
import LiveCaptions from '@/components/LiveCaptions';
import CueCard from '@/components/CueCard';
import { BrowserVoiceSession, MockVoiceSession, OpenAIRealtimeVoiceSession, VoiceSession } from '@/lib/realtime';
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
  const [voiceMode, setVoiceMode] = useState<'realtime' | 'browser' | 'mock'>('realtime');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [autoEnding, setAutoEnding] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const voiceRef = useRef<VoiceSession | null>(null);
  const greetedRef = useRef(false);
  const cueCompleteRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const reconnectAttemptedRef = useRef(false);
  const voiceStartedRef = useRef(false);

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

  const effectiveExaminerPrompt = useMemo(() => {
    return session?.examinerPrompt || 'You are an IELTS speaking examiner. Keep responses short, supportive, and exam-structured.';
  }, [session?.examinerPrompt]);

  const focusHint = useMemo(() => {
    const items = session?.focus?.filter(Boolean) || [];
    if (!items.length) return '';
    return `Focus on: ${items.slice(0, 3).join(', ')}.`;
  }, [session?.focus]);

  function attachVoiceHandlers(voice: VoiceSession) {
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
    voice.onToolCall(async (tool) => {
      if (tool.name === 'display_cue_card') {
        const { topic, bullets } = tool.arguments as { topic?: string; bullets?: string[] };
        if (topic && bullets) {
          setPart('part2');
          await persistPart('part2');
          return `Cue card displayed: ${topic}. Student has 1 minute to prepare, then 1-2 minutes to speak.`;
        }
        return 'Error: invalid cue card parameters';
      }
      if (tool.name === 'set_turn_detection') {
        const { mode } = tool.arguments as { mode?: string };
        if (mode === 'monologue' || mode === 'normal') {
          await voiceRef.current?.setTurnMode(mode);
          return `VAD mode set to ${mode} (silence threshold ${mode === 'monologue' ? '2500ms' : '1000ms'}).`;
        }
        return 'Error: invalid turn detection mode';
      }
      return 'Unknown tool';
    });
  }

  useEffect(() => {
    if (!session) return;
    if (session.part) {
      setPart(session.part);
    }
    if (!voiceRef.current) {
      let voice: VoiceSession | null = null;

      try {
        voice = new OpenAIRealtimeVoiceSession('/api/session/token');
        setVoiceMode('realtime');
      } catch {
        // Defer to browser fallback below.
      }

      if (!voice) {
        try {
          voice = new BrowserVoiceSession();
          setVoiceMode('browser');
        } catch {
          voice = new MockVoiceSession();
          setVoiceMode('mock');
        }
      }

      attachVoiceHandlers(voice);
      voiceRef.current = voice;
    }
  }, [session]);

  useEffect(() => {
    if (!micEnabled) return;
    if (busy) return;
    if (voiceMode !== 'realtime') return;
    if (reconnecting) return;
    if (state !== 'thinking') return;
    if (!sessionId) return;
    if (!voiceStartedRef.current) return;
    if (endingRef.current) return;

    if (reconnectAttemptedRef.current) {
      setError('Realtime connection dropped again. Ending session and saving partial transcript.');
      void endSession();
      return;
    }

    reconnectAttemptedRef.current = true;
    setReconnecting(true);
    setError('Realtime connection dropped. Attempting one reconnect...');

    const reconnect = async () => {
      try {
        const nextVoice = new OpenAIRealtimeVoiceSession('/api/session/token');
        attachVoiceHandlers(nextVoice);
        voiceRef.current = nextVoice;
            await nextVoice.start(effectiveExaminerPrompt);
        await nextVoice.setTurnMode(part === 'part2' ? 'monologue' : 'normal');
        await nextVoice.speak('We are back online. Please continue your answer.');
        setError('');
      } catch {
        setError('Reconnect failed. Ending session and saving partial transcript.');
        void endSession();
      } finally {
        setReconnecting(false);
      }
    };

    void reconnect();
  }, [busy, effectiveExaminerPrompt, micEnabled, part, reconnecting, sessionId, state, voiceMode]);

  useEffect(() => {
    if (!sessionId) return;
    if (!micEnabled) return;

    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }

    const timer = setInterval(() => {
      if (!startedAtRef.current) return;
      const next = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      setElapsedSec(next);

      // Hard cap at 18 minutes (1080 sec) to manage realtime cost and long sessions.
      if (next >= 1080 && !endingRef.current) {
        setAutoEnding(true);
        void endSession(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [micEnabled, sessionId]);

  async function persistPart(nextPart: SpeakingPart) {
    if (!sessionId) return;
    try {
      await fetch('/api/session/part', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, part: nextPart })
      });
    } catch {
      // keep UI responsive even if this best-effort update fails
    }
  }

  useEffect(() => {
    if (!micEnabled || !voiceRef.current || greetedRef.current) return;
    greetedRef.current = true;
    void voiceRef.current.speak('Welcome to your IELTS speaking practice. Let us begin with Part 1. Could you introduce yourself?');
  }, [micEnabled]);

  async function respondToStudent(answer: string) {
    if (!voiceRef.current) return;

    if (part === 'part1') {
      const questions = [
        `Thank you. What kind of work or study do you do at the moment? ${focusHint}`,
        `How often do you use English in your daily life? ${focusHint}`
      ];
      const studentTurns = transcript.filter((t) => t.role === 'student').length;
      if (studentTurns >= 3) {
        setPart('part2');
        void persistPart('part2');
        await voiceRef.current.setTurnMode('monologue');
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
      void persistPart('part3');
      await voiceRef.current.setTurnMode('normal');
      await voiceRef.current.speak('Great. We are now in Part 3. Do you think technology has made communication better or worse in society?');
      return;
    }

    const followUps = [
      `That is an interesting point. Could you compare this with the past? ${focusHint}`,
      `What changes do you predict in the next ten years? ${focusHint}`,
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
      reconnectAttemptedRef.current = false;
      try {
        await voiceRef.current.start(effectiveExaminerPrompt);
        voiceStartedRef.current = true;
      } catch {
        // Realtime failed at runtime: try browser speech, then mock as last fallback.
        try {
          const browserFallback = new BrowserVoiceSession();
          attachVoiceHandlers(browserFallback);
          voiceRef.current = browserFallback;
          setVoiceMode('browser');
          await browserFallback.start(effectiveExaminerPrompt);
          voiceStartedRef.current = true;
        } catch {
          setError('Realtime voice failed and browser speech is unavailable, switching to mock mode.');
          const mockFallback = new MockVoiceSession();
          attachVoiceHandlers(mockFallback);
          voiceRef.current = mockFallback;
          setVoiceMode('mock');
          await mockFallback.start(effectiveExaminerPrompt);
          voiceStartedRef.current = true;
        }
      }
      return;
    }

    setMicEnabled(false);
    const endedTranscript = await voiceRef.current.end();
    setLocalTranscript(endedTranscript);
    setState('thinking');
    voiceStartedRef.current = false;
  }

  function partLabel(current: SpeakingPart): string {
    if (current === 'part1') return 'Part 1 · Warm-up';
    if (current === 'part2') return 'Part 2 · Long Turn';
    return 'Part 3 · Discussion';
  }

  async function endSession(fromAutoCap = false) {
    if (!sessionId) return;
    if (endingRef.current) return;
    endingRef.current = true;
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
          durationSec: elapsedSec,
          part
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
      setError(fromAutoCap ? 'Session reached the 18-minute cap, but network failed while ending. Please try End Interview again.' : 'Network error while ending session.');
    } finally {
      setBusy(false);
      setState('listening');
      endingRef.current = false;
      setAutoEnding(false);
      setReconnecting(false);
      voiceStartedRef.current = false;
    }
  }

  function fmtDuration(totalSec: number): string {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <div className="list-grid">
      <section className="card speaking-header">
        <h1>Live Speaking Session</h1>
        <p className="speaking-muted">Session ID: {sessionId}</p>
        <p className="speaking-muted">Target: {session?.targetScore || '6.5'} | Status: {session?.status || 'loading'}</p>
        <p className="speaking-muted">
          Voice mode: {voiceMode === 'realtime' ? 'OpenAI Realtime' : voiceMode === 'browser' ? 'Browser Speech (fallback)' : 'Mock fallback'}
        </p>
        <p className="speaking-muted">Session timer: {fmtDuration(elapsedSec)} / 18:00</p>
        <p className="part-chip">{partLabel(part)}</p>
        <p className="speaking-muted">Turn detection: {getSilenceThreshold(part === 'part2' ? 'monologue' : 'normal')}ms silence threshold</p>
        {autoEnding ? <p className="speaking-error">Maximum session time reached. Ending interview automatically...</p> : null}
        {reconnecting ? <p className="speaking-muted">Reconnecting realtime session...</p> : null}

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
          <button
            type="button"
            onClick={() => {
              void persistPart('part1');
              setPart('part1');
            }}
            disabled={busy}
          >
            Save Part 1
          </button>
          <button
            type="button"
            onClick={() => {
              void persistPart('part2');
              setPart('part2');
            }}
            disabled={busy}
          >
            Save Part 2
          </button>
          <button
            type="button"
            onClick={() => {
              void persistPart('part3');
              setPart('part3');
            }}
            disabled={busy}
          >
            Save Part 3
          </button>
          <button type="button" onClick={() => void endSession()} disabled={busy}>
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
