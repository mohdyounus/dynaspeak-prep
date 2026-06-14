'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LiveCaptions from '@/components/LiveCaptions';
import { BrowserVoiceSession, MockVoiceSession, OpenAIRealtimeVoiceSession, VoiceSession } from '@/lib/realtime';
import { ArabicLetters, getLetterByPosition, getTotalLetters } from '@/lib/ielts/arabic-letters';
import type { TranscriptEntry } from '@/lib/ielts/types';

type LessonState = 'idle' | 'connected' | 'ready_to_repeat' | 'recording' | 'evaluating' | 'completed';

interface ArabicSession {
  id: string;
  childName: string;
  currentLetter: number;
  transcript?: TranscriptEntry[];
  voiceMode?: 'realtime' | 'browser' | 'mock';
}

function SessionContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params?.id;

  const [session, setSession] = useState<ArabicSession | null>(null);
  const [voiceState, setVoiceState] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [lessonState, setLessonState] = useState<LessonState>('idle');
  const [error, setError] = useState('');
  const [localTranscript, setLocalTranscript] = useState<TranscriptEntry[]>([]);
  const [currentLetter, setCurrentLetter] = useState(1);
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'realtime' | 'browser' | 'mock'>('realtime');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [evaluating, setEvaluating] = useState(false);

  const voiceRef = useRef<VoiceSession | null>(null);
  const greetedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const reconnectAttemptedRef = useRef(false);
  const voiceStartedRef = useRef(false);
  const lessonStateRef = useRef<LessonState>('idle');
  const currentLetterRef = useRef(1);
  const pendingTextRef = useRef<string>('');

  function updateLessonState(next: LessonState) {
    lessonStateRef.current = next;
    setLessonState(next);
  }

  useEffect(() => {
    currentLetterRef.current = currentLetter;
  }, [currentLetter]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/arabic/session/${sessionId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to load session.');
          return;
        }
        if (active) {
          setSession(data.session);
          setCurrentLetter(data.session.currentLetter || 1);
          currentLetterRef.current = data.session.currentLetter || 1;
        }
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
    return [];
  }, [localTranscript, session?.transcript]);

  const currentLetterData = useMemo(() => {
    return getLetterByPosition(currentLetter);
  }, [currentLetter]);

  function attachVoiceHandlers(voice: VoiceSession) {
    voice.onTranscript((entry) => {
      setLocalTranscript((prev) => [...prev, entry]);

      if (entry.role === 'examiner') {
        // Update UI with teacher message
        if (lessonStateRef.current === 'connected' || lessonStateRef.current === 'evaluating') {
          updateLessonState('ready_to_repeat');
        }
        return;
      }

      if (entry.role === 'student') {
        // Capture student's letter repeat
        if (lessonStateRef.current === 'recording') {
          pendingTextRef.current = entry.text;
        }
        // Voice commands to end session always work
        const normalized = entry.text.toLowerCase();
        if (
          normalized.includes('done') ||
          normalized.includes('bas') ||
          normalized.includes('thik') ||
          normalized.includes('bose')
        ) {
          void endLesson();
        }
      }
    });

    voice.onStateChange((next) => {
      if (next !== 'ended') {
        setVoiceState(next as 'listening' | 'speaking' | 'thinking');
      }
    });

    voice.onToolCall(async () => {
      return 'OK';
    });
  }

  useEffect(() => {
    if (!session) return;
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

  async function speakOpeningGreeting() {
    if (!voiceRef.current || greetedRef.current) return;
    greetedRef.current = true;
    updateLessonState('connected');

    const greeting = `Salaam, ${session?.childName}! Main aapka Arabic teacher hun. Kaise ho aap aaj? Chalo, hum aaj Arabic qaida sikhenge! Bahut maza ayega!`;
    await voiceRef.current.speak(greeting);
    // Strict PTT: keep mic off until the student taps Start Repeat.
    await voiceRef.current.pauseListening();
  }

  // Session timer
  useEffect(() => {
    if (!sessionId) return;
    if (!sessionActive) return;
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    const timer = setInterval(() => {
      if (!startedAtRef.current) return;
      const next = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
      setElapsedSec(next);
      // Auto-end after 30 minutes
      if (next >= 1800 && !endingRef.current) {
        void endLesson(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionActive, sessionId]);

  async function toggleSession() {
    if (!voiceRef.current) return;

    if (!sessionActive) {
      setError('');
      setVoiceState('thinking');
      setSessionActive(true);
      reconnectAttemptedRef.current = false;
      try {
        const arabicTutorPrompt = `You are a warm Arabic teacher for a 4-year-old in Hyderabadi Hindi. Greet warmly, teach letters one by one. Current letter: ${currentLetterData?.name} (${currentLetterData?.arabicChar}). Be very encouraging.`;
        await voiceRef.current.start(arabicTutorPrompt);
        await voiceRef.current.pauseListening();
        voiceStartedRef.current = true;
        await speakOpeningGreeting();
      } catch {
        try {
          const browserFallback = new BrowserVoiceSession();
          attachVoiceHandlers(browserFallback);
          voiceRef.current = browserFallback;
          setVoiceMode('browser');
          await browserFallback.start('Arabic teacher greeting');
          await browserFallback.pauseListening();
          voiceStartedRef.current = true;
          await speakOpeningGreeting();
        } catch {
          setError('Voice failed. Using mock mode.');
          const mockFallback = new MockVoiceSession();
          attachVoiceHandlers(mockFallback);
          voiceRef.current = mockFallback;
          setVoiceMode('mock');
          await mockFallback.start('Arabic teacher');
          await mockFallback.pauseListening();
          voiceStartedRef.current = true;
          await speakOpeningGreeting();
        }
      }
      return;
    }

    setSessionActive(false);
    setVoiceState('thinking');
    voiceStartedRef.current = false;
    updateLessonState('idle');
  }

  async function startRepeat() {
    if (!voiceRef.current) return;
    if (lessonStateRef.current !== 'ready_to_repeat') return;
    pendingTextRef.current = '';
    updateLessonState('recording');
    await voiceRef.current.resumeListening();
  }

  async function endRepeat() {
    if (!voiceRef.current) return;
    if (lessonStateRef.current !== 'recording') return;
    updateLessonState('evaluating');
    await voiceRef.current.pauseListening();
    await voiceRef.current.commitAnswer();
    setEvaluating(true);
    const studentSaid = pendingTextRef.current.trim();

    // After a short delay, move to next letter or replay current
    setTimeout(() => {
      setEvaluating(false);
      if (currentLetterRef.current < getTotalLetters()) {
        const nextLetter = currentLetterRef.current + 1;
        setCurrentLetter(nextLetter);
        void voiceRef.current?.speak(
          `Shabash! Bahut acha! Ab chalo agle letter. ${getLetterByPosition(nextLetter)?.name}. Suno: ${getLetterByPosition(nextLetter)?.name}, ${getLetterByPosition(nextLetter)?.name}. Aap bhi kaho!`
        );
        updateLessonState('ready_to_repeat');
      } else {
        void voiceRef.current?.speak(
          'Bahut acha! Aapne sab letters seekh liye! Allah aapko khush rakhe. Shabash!'
        );
        updateLessonState('completed');
        setTimeout(() => void endLesson(), 3000);
      }
    }, 2000);
  }

  async function endLesson(autoEnd = false) {
    if (!sessionId) return;
    if (endingRef.current) return;
    endingRef.current = true;

    setSessionActive(false);
    setVoiceState('thinking');
    try {
      const endedTranscript = voiceRef.current ? await voiceRef.current.end() : transcript;
      setLocalTranscript(endedTranscript);

      const res = await fetch('/api/arabic/session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript: endedTranscript,
          durationSec: elapsedSec,
          finalLetter: currentLetter
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || `API error: ${res.status}`);
      }

      const data = await res.json();
      if (data?.session) {
        // Success - redirect to home
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('End lesson error:', err);
      setError(`Error ending lesson: ${err instanceof Error ? err.message : 'Unknown error'}`);
      endingRef.current = false; // Reset so they can retry
    }
  }

  function fmtDuration(totalSec: number): string {
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(totalSec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  const voiceStateLabel =
    voiceState === 'speaking'
      ? '🔵 Teacher Speaking'
      : voiceState === 'thinking'
        ? '🟡 Thinking…'
        : '🟢 Listening';

  return (
    <div className="list-grid">
      {/* Info bar */}
      <section className="card session-info-card">
        <div className="session-info-bar">
          <span className="part-chip" style={{ backgroundColor: '#2d5016', color: 'white' }}>
            Letter {currentLetter} of {getTotalLetters()}
          </span>
          <span className="speaking-muted">
            {currentLetterData?.name} • {currentLetterData?.arabicChar}
          </span>
          <span className="speaking-muted">⏱ {fmtDuration(elapsedSec)}</span>
          {sessionActive ? <span className={`speaking-state speaking-${voiceState}`}>{voiceStateLabel}</span> : null}
        </div>
        {error ? <p className="speaking-error">{error}</p> : null}
      </section>

      {/* Current letter display */}
      {sessionActive && currentLetterData ? (
        <section className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{currentLetterData.arabicChar}</div>
          <h2 style={{ fontSize: '1.5rem', color: '#2d5016', marginBottom: '0.5rem' }}>
            {currentLetterData.name}
          </h2>
          <p style={{ fontSize: '1rem', color: '#666' }}>Listen to teacher and repeat</p>
        </section>
      ) : null}

      {/* Main controls */}
      <section className="card ptt-controls-card">
        {!sessionActive ? (
          <div className="ptt-connect-area">
            <h2 className="ptt-connect-heading">Ready to learn Arabic letters?</h2>
            <p className="speaking-muted">
              Teacher will greet you in Hyderabadi Hindi, introduce each letter, and you repeat after listening.
            </p>
            <button
              type="button"
              className="session-connect-btn"
              onClick={() => void toggleSession()}
              disabled={!session}
            >
              ▶ Begin Lesson
            </button>
          </div>
        ) : (
          <div className="ptt-controls">
            {(lessonState === 'idle' || lessonState === 'connected') ? (
              <p className="speaking-muted ptt-hint">⏳ Starting lesson…</p>
            ) : null}

            {lessonState === 'ready_to_repeat' ? (
              <button
                type="button"
                className="ptt-btn ptt-btn-start"
                onClick={() => void startRepeat()}
              >
                🎙 Start Repeat
              </button>
            ) : null}

            {lessonState === 'recording' ? (
              <>
                <p className="ptt-recording-hint">🔴 Recording — repeat the letter now</p>
                <button type="button" className="ptt-btn ptt-btn-end" onClick={() => void endRepeat()}>
                  ⏹ End Repeat
                </button>
              </>
            ) : null}

            {lessonState === 'evaluating' || evaluating ? (
              <p className="speaking-muted ptt-hint">⏳ Checking your answer…</p>
            ) : null}

            {lessonState === 'completed' ? (
              <p className="speaking-muted ptt-hint">✅ Lesson complete! Redirecting…</p>
            ) : null}

            <div className="ptt-secondary-actions">
              <button
                type="button"
                className="ptt-end-session-btn"
                onClick={() => void endLesson()}
              >
                ⏏ End Lesson
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Live captions */}
      {transcript.length > 0 ? (
        <section className="card">
          <h2>Transcript</h2>
          <LiveCaptions transcript={transcript} />
        </section>
      ) : null}
    </div>
  );
}

export default function ArabicSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="card speaking-shell">
          <p className="speaking-muted">Loading lesson…</p>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
