'use client';
// ── SESSION PAGE — PTT (push-to-talk) mode ──────────────────────────────────
// Student clicks "Start Answer" to open mic, "End Answer" to close it.
// Claude evaluation runs automatically after each answer is submitted.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { SpeakingPart, SpeakingSession, TranscriptEntry } from '@/lib/ielts/types';
import LiveCaptions from '@/components/LiveCaptions';
import CueCard from '@/components/CueCard';
import { BrowserVoiceSession, MockVoiceSession, OpenAIRealtimeVoiceSession, VoiceSession } from '@/lib/realtime';

type AnswerState = 'idle' | 'connected' | 'ready_to_answer' | 'recording' | 'evaluating';

function SessionContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params?.id;

  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [voiceState, setVoiceState] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localTranscript, setLocalTranscript] = useState<TranscriptEntry[]>([]);
  const [part, setPart] = useState<SpeakingPart>('part1');
  const [sessionActive, setSessionActive] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'realtime' | 'browser' | 'mock'>('realtime');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [autoEnding, setAutoEnding] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [turnEvaluating, setTurnEvaluating] = useState(false);
  const [answerState, setAnswerStateRaw] = useState<AnswerState>('idle');
  const [currentQuestion, setCurrentQuestion] = useState('');

  const voiceRef = useRef<VoiceSession | null>(null);
  const greetedRef = useRef(false);
  const cueCompleteRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const reconnectAttemptedRef = useRef(false);
  const voiceStartedRef = useRef(false);
  const studentSilenceTimerRef = useRef<number | null>(null);
  const answerStateRef = useRef<AnswerState>('idle');
  const pendingTextRef = useRef<string[]>([]);
  const partRef = useRef<SpeakingPart>('part1');

  function updateAnswerState(next: AnswerState) {
    answerStateRef.current = next;
    setAnswerStateRaw(next);
  }

  // Keep partRef in sync for stale-closure-safe access
  useEffect(() => {
    partRef.current = part;
  }, [part]);

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
    return [];
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

      if (entry.role === 'examiner') {
        // Show latest examiner message as the current question
        setCurrentQuestion(entry.text);
        // Transition to ready_to_answer after connecting or after evaluating
        if (answerStateRef.current === 'connected' || answerStateRef.current === 'evaluating') {
          updateAnswerState('ready_to_answer');
        }
        return;
      }

      if (entry.role === 'student') {
        // Only accumulate text during explicit PTT recording phase
        if (answerStateRef.current === 'recording') {
          pendingTextRef.current.push(entry.text);
        }
        // Voice commands to end session always work
        const normalized = entry.text.toLowerCase();
        if (
          normalized.includes("i'm done") ||
          normalized.includes('end interview') ||
          normalized.includes('goodbye')
        ) {
          endSession();
        }
      }
    });
    voice.onStateChange((next) => {
      if (next !== 'ended') {
        setVoiceState(next as 'listening' | 'speaking' | 'thinking');
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
      partRef.current = session.part;
    } else {
      // Read startPart from URL query param set by the setup page
      const sp = searchParams?.get('startPart') as SpeakingPart | null;
      if (sp && (['part1', 'part2', 'part3'] as string[]).includes(sp)) {
        setPart(sp);
        partRef.current = sp;
      }
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

  // Auto-reconnect on unexpected realtime drop
  useEffect(() => {
    if (!sessionActive) return;
    if (busy) return;
    if (voiceMode !== 'realtime') return;
    if (reconnecting) return;
    if (voiceState !== 'thinking') return;
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
    setError('Realtime connection dropped. Attempting one reconnect…');

    const reconnect = async () => {
      try {
        const nextVoice = new OpenAIRealtimeVoiceSession('/api/session/token');
        attachVoiceHandlers(nextVoice);
        voiceRef.current = nextVoice;
        await nextVoice.start(effectiveExaminerPrompt);
        await nextVoice.setTurnMode(partRef.current === 'part2' ? 'monologue' : 'normal');
        await nextVoice.speak('We are back online. Please continue where you left off.');
        setError('');
      } catch {
        setError('Reconnect failed. Ending session and saving partial transcript.');
        void endSession();
      } finally {
        setReconnecting(false);
      }
    };

    void reconnect();
  }, [busy, effectiveExaminerPrompt, sessionActive, part, reconnecting, sessionId, voiceState, voiceMode]);

  // Session timer with 18-min hard cap
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
      if (next >= 1080 && !endingRef.current) {
        setAutoEnding(true);
        void endSession(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionActive, sessionId]);

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

  // Opening greeting — fires once after session activates
  useEffect(() => {
    if (!sessionActive || !voiceRef.current || greetedRef.current) return;
    greetedRef.current = true;
    updateAnswerState('connected');

    const p = partRef.current;
    let greeting: string;
    if (p === 'part2') {
      greeting = 'Welcome. We will start directly with Part 2. Here is your cue card topic. Please take one minute to prepare, then speak for one to two minutes.';
      void voiceRef.current.setTurnMode('monologue');
    } else if (p === 'part3') {
      greeting = 'Welcome. We will jump straight to Part 3 discussion. Do you think technology has improved or harmed society overall? Please share your opinion with reasons.';
    } else {
      greeting = `Welcome to your IELTS speaking practice. Let us begin with Part 1. Could you tell me your full name and what you currently do for work or study?${focusHint ? ' ' + focusHint : ''}`;
    }
    void voiceRef.current.speak(greeting);
  }, [sessionActive]);

  // PTT: student starts recording their answer
  async function startAnswer() {
    if (!voiceRef.current) return;
    if (answerStateRef.current !== 'ready_to_answer') return;
    pendingTextRef.current = [];
    updateAnswerState('recording');
    if (studentSilenceTimerRef.current) {
      window.clearTimeout(studentSilenceTimerRef.current);
      studentSilenceTimerRef.current = null;
    }
    await voiceRef.current.resumeListening();
  }

  // PTT: student finishes recording — commit and evaluate
  async function endAnswer() {
    if (!voiceRef.current) return;
    if (answerStateRef.current !== 'recording') return;
    updateAnswerState('evaluating');
    await voiceRef.current.pauseListening();
    await voiceRef.current.commitAnswer();
    const answer = pendingTextRef.current.join(' ').trim();
    if (answer) {
      await processStudentAnswer(answer);
    } else {
      setCurrentQuestion('I did not catch that. Please click “Start Answer” and try again.');
      updateAnswerState('ready_to_answer');
    }
  }

  // Core answer processing: LLM evaluator then scripted fallback
  async function processStudentAnswer(answer: string) {
    setTurnEvaluating(true);
    const llmResult = await evaluateStudentTurn(answer);
    setTurnEvaluating(false);
    if (llmResult) return; // evaluateStudentTurn handles state transition via onTranscript

    const p = partRef.current;
    if (p === 'part1') {
      const studentTurns = transcript.filter((t) => t.role === 'student').length;
      if (studentTurns >= 3) {
        setPart('part2');
        partRef.current = 'part2';
        void persistPart('part2');
        await voiceRef.current?.setTurnMode('monologue');
        cueCompleteRef.current = false;
        await voiceRef.current?.speak('Now we will move to Part 2. Please read the cue card, prepare for one minute, then speak for one to two minutes.');
        updateAnswerState('ready_to_answer');
        return;
      }
      const questions = [
        `Thank you. What kind of work or study do you do at the moment? ${focusHint}`,
        `How often do you use English in your daily life? ${focusHint}`
      ];
      await voiceRef.current?.speak(questions[Math.min(studentTurns - 1, questions.length - 1)] || 'Could you expand on that with an example?');
      updateAnswerState('ready_to_answer');
      return;
    }
    if (p === 'part2') {
      if (!cueCompleteRef.current) {
        cueCompleteRef.current = true;
        await voiceRef.current?.speak('Thank you for your long turn. What was the most challenging part for you?');
        updateAnswerState('ready_to_answer');
        return;
      }
      setPart('part3');
      partRef.current = 'part3';
      void persistPart('part3');
      await voiceRef.current?.setTurnMode('normal');
      await voiceRef.current?.speak('Great. We are now in Part 3. Do you think technology has made communication better or worse in society?');
      updateAnswerState('ready_to_answer');
      return;
    }
    const part3Turns = transcript.filter((t) => t.role === 'student').length;
    const followUps = [
      `That is interesting. Could you compare this with the past? ${focusHint}`,
      `What changes do you predict in the next ten years? ${focusHint}`,
      'Thank you. We can finish whenever you are ready. You can say “I am done”.'
    ];
    await voiceRef.current?.speak(followUps[Math.min(part3Turns - 1, followUps.length - 1)] || 'Could you give a specific example?');
    updateAnswerState('ready_to_answer');
  }

  async function evaluateStudentTurn(answer: string): Promise<boolean> {
    if (!sessionId) return false;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 320,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: `You are tutoring an IELTS speaking student.

Return strict JSON only with this exact shape:
{
  "evaluation": "one short sentence of feedback",
  "nextQuestion": "one next speaking question"
}

Rules:
- Keep evaluation short and supportive.
- nextQuestion must continue the IELTS speaking flow.
- Do not include markdown fences or extra text.

Question part: ${part}
Student answer: ${answer}
Focus hint: ${focusHint || 'none'}`
            }
          ]
        })
      });

      if (!res.ok) return false;

      const data = await res.json();
      const llmText = String(data?.text || '').trim();
      let parsed: { evaluation?: string; nextQuestion?: string } | null = null;

      try {
        const cleaned = llmText.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
        parsed = JSON.parse(cleaned) as { evaluation?: string; nextQuestion?: string };
      } catch {
        const evaluationLine = llmText.match(/Evaluation:\s*(.+)/i)?.[1]?.trim();
        const nextQuestionLine = llmText.match(/Next question:\s*(.+)/i)?.[1]?.trim();
        parsed = {
          evaluation: evaluationLine,
          nextQuestion: nextQuestionLine
        };
      }

      const evaluationLine = String(parsed?.evaluation || '').trim();
      const nextQuestionLine = String(parsed?.nextQuestion || '').trim();

      if (!evaluationLine && !nextQuestionLine) return false;

      if (evaluationLine) {
        setLocalTranscript((prev) => [...prev, { role: 'examiner', text: evaluationLine, ts: Date.now() }]);
        await voiceRef.current?.speak(evaluationLine);
      }

      if (nextQuestionLine) {
        setLocalTranscript((prev) => [...prev, { role: 'examiner', text: nextQuestionLine, ts: Date.now() }]);
        await voiceRef.current?.speak(nextQuestionLine);
        setCurrentQuestion(nextQuestionLine);
        updateAnswerState('ready_to_answer');
      }

      return true;
    } catch {
      return false;
    }
  }

  // Connect / disconnect the voice session
  async function toggleSession() {
    if (!voiceRef.current) return;

    if (!sessionActive) {
      setError('');
      setSessionActive(true);
      reconnectAttemptedRef.current = false;
      try {
        await voiceRef.current.start(effectiveExaminerPrompt);
        voiceStartedRef.current = true;
      } catch {
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

    setSessionActive(false);
    if (studentSilenceTimerRef.current) {
      window.clearTimeout(studentSilenceTimerRef.current);
      studentSilenceTimerRef.current = null;
    }
    const endedTranscript = await voiceRef.current.end();
    setLocalTranscript(endedTranscript);
    setVoiceState('thinking');
    voiceStartedRef.current = false;
    updateAnswerState('idle');
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
    setVoiceState('thinking');

    try {
      const capturedTranscript = voiceRef.current ? await voiceRef.current.end() : transcript;

      if (studentSilenceTimerRef.current) {
        window.clearTimeout(studentSilenceTimerRef.current);
        studentSilenceTimerRef.current = null;
      }

      const endRes = await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript: capturedTranscript,
          durationSec: elapsedSec,
          part,
          targetScore: session?.targetScore,
          background: session?.background,
          interests: session?.interests,
          examinerPrompt: session?.examinerPrompt,
          githubUsername: session?.githubUsername,
          profileSummary: session?.profileSummary,
          focus: session?.focus
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
      setError(fromAutoCap ? 'Session reached the 18-minute cap, but network failed. Please try End Interview again.' : 'Network error while ending session.');
    } finally {
      setBusy(false);
      setVoiceState('listening');
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

  const voiceStateLabel =
    voiceState === 'speaking' ? '🔵 Examiner Speaking' : voiceState === 'thinking' ? '🟡 Thinking…' : '🟢 Listening';

  return (
    <div className="list-grid">
      {/* Compact info bar */}
      <section className="card session-info-card">
        <div className="session-info-bar">
          <span className="part-chip">{partLabel(part)}</span>
          <span className="speaking-muted">Target: {session?.targetScore || '6.5'}</span>
          <span className="speaking-muted">⏱ {fmtDuration(elapsedSec)} / 18:00</span>
          {sessionActive ? <span className={`speaking-state speaking-${voiceState}`}>{voiceStateLabel}</span> : null}
          <span className="speaking-muted session-mode-badge">
            {voiceMode === 'realtime' ? 'OpenAI Realtime' : voiceMode === 'browser' ? 'Browser Speech' : 'Mock'}
          </span>
        </div>
        {autoEnding ? <p className="speaking-error">Maximum session time reached. Ending automatically…</p> : null}
        {reconnecting ? <p className="speaking-muted">Reconnecting…</p> : null}
        {error ? <p className="speaking-error">{error}</p> : null}
      </section>

      {/* Current question — shown while session is active */}
      {sessionActive && currentQuestion ? (
        <section className="card question-card">
          <p className="question-label">Examiner</p>
          <p className="question-text">{currentQuestion}</p>
        </section>
      ) : null}

      {/* Main PTT controls */}
      <section className="card ptt-controls-card">
        {!sessionActive ? (
          <div className="ptt-connect-area">
            <h2 className="ptt-connect-heading">Ready to start?</h2>
            <p className="speaking-muted">
              The examiner will ask a question. Click <strong>Start Answer</strong> when you want to speak,
              then <strong>End Answer</strong> when you finish. Evaluation and the next question come automatically.
            </p>
            <button
              type="button"
              className="session-connect-btn"
              onClick={() => void toggleSession()}
              disabled={busy || !session}
            >
              {busy ? 'Connecting…' : '▶ Begin Session'}
            </button>
          </div>
        ) : (
          <div className="ptt-controls">
            {(answerState === 'idle' || answerState === 'connected') ? (
              <p className="speaking-muted ptt-hint">
                {answerState === 'connected' ? '⏳ Waiting for examiner…' : 'Session starting…'}
              </p>
            ) : null}

            {answerState === 'ready_to_answer' ? (
              <button
                type="button"
                className="ptt-btn ptt-btn-start"
                onClick={() => void startAnswer()}
                disabled={busy}
              >
                🎙 Start Answer
              </button>
            ) : null}

            {answerState === 'recording' ? (
              <>
                <p className="ptt-recording-hint">🔴 Recording — speak your answer now</p>
                <button
                  type="button"
                  className="ptt-btn ptt-btn-end"
                  onClick={() => void endAnswer()}
                >
                  ⏹ End Answer
                </button>
              </>
            ) : null}

            {answerState === 'evaluating' ? (
              <p className="speaking-muted ptt-hint">
                {turnEvaluating ? '⏳ Evaluating your answer…' : '⏳ Preparing next question…'}
              </p>
            ) : null}

            <div className="ptt-secondary-actions">
              <button
                type="button"
                className="ptt-end-session-btn"
                onClick={() => void endSession()}
                disabled={busy}
              >
                {busy ? 'Ending…' : '⏏ End Interview'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Live captions */}
      {transcript.length > 0 ? (
        <section className="card">
          <h2>Live Captions</h2>
          <LiveCaptions transcript={transcript} />
        </section>
      ) : null}

      {/* Cue card for Part 2 */}
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

      {/* Part jump controls */}
      {sessionActive ? (
        <section className="card">
          <p className="speaking-muted" style={{ marginBottom: '0.5rem' }}>Jump to part:</p>
          <div className="speaking-actions">
            <button type="button" onClick={() => { setPart('part1'); partRef.current = 'part1'; void persistPart('part1'); void voiceRef.current?.setTurnMode('normal'); }} disabled={busy}>Part 1</button>
            <button type="button" onClick={() => { setPart('part2'); partRef.current = 'part2'; void persistPart('part2'); void voiceRef.current?.setTurnMode('monologue'); }} disabled={busy}>Part 2</button>
            <button type="button" onClick={() => { setPart('part3'); partRef.current = 'part3'; void persistPart('part3'); void voiceRef.current?.setTurnMode('normal'); }} disabled={busy}>Part 3</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="card speaking-shell">
          <p className="speaking-muted">Loading session…</p>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
