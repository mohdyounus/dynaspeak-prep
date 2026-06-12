'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { EvaluationReport, SpeakingSession } from '@/lib/ielts/types';
import ReportCard from '@/components/ReportCard';

function fallbackReport(): EvaluationReport {
  return {
    overallBand: 6.0,
    criteria: {
      fluencyCoherence: { band: 6.0, evidence: ['Maintains conversation on familiar topics.'], tips: ['Add longer linked ideas.'] },
      lexicalResource: { band: 6.0, evidence: ['Uses practical daily vocabulary.'], tips: ['Use more precise topic words.'] },
      grammaticalRange: { band: 5.5, evidence: ['Some sentence variety with noticeable errors.'], tips: ['Review tense consistency.'] },
      pronunciation: {
        band: 5.5,
        confidence: 'low',
        evidence: ['Estimated from transcript-level evidence only.'],
        tips: ['Practice stress and intonation with short recordings.']
      }
    },
    errorLog: [{ studentSaid: 'He go office.', correction: 'He goes to the office.', rule: 'Third-person singular agreement.' }],
    gapToTarget: 'Focus on grammar and expansion to reach the target band.',
    nextSessionFocus: ['Part 2 fluency', 'Sentence variety', 'Vocabulary precision']
  };
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;

  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [error, setError] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationAttempted, setEvaluationAttempted] = useState(false);
  const evaluateRequestedRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setSession(null);
      setError('');
      setEvaluating(false);
      setEvaluationAttempted(false);
      evaluateRequestedRef.current = false;
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to load report.');
          return;
        }
        if (active) setSession(data.session);
      } catch {
        if (active) setError('Network error while loading report.');
      }
    }
    if (sessionId) load();
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    if (!session) return;
    if (session.report) return;
    if (session.status !== 'ended') return;
    if (evaluating) return;
    if (evaluationAttempted) return;
    if (evaluateRequestedRef.current) return;

    const runEvaluate = async () => {
      evaluateRequestedRef.current = true;
      setEvaluating(true);
      setEvaluationAttempted(true);
      setError('');
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to evaluate session report.');
          return;
        }
        if (data?.session) {
          setSession(data.session as SpeakingSession);
        }
      } catch {
        setError('Network error while generating report.');
      } finally {
        setEvaluating(false);
      }
    };

    void runEvaluate();
  }, [evaluationAttempted, evaluating, session, sessionId]);

  const report = useMemo(() => session?.report || fallbackReport(), [session]);
  const practiceAgainHref = useMemo(() => {
    const params = new URLSearchParams();
    if (session?.targetScore) params.set('target', session.targetScore);
    if (session?.githubUsername) params.set('github', session.githubUsername);
    if (session?.profileSummary) params.set('summary', session.profileSummary);
    if (report?.nextSessionFocus?.length) params.set('focus', report.nextSessionFocus.join(', '));
    const qs = params.toString();
    return qs ? `/speaking?${qs}` : '/speaking';
  }, [report?.nextSessionFocus, session?.githubUsername, session?.profileSummary, session?.targetScore]);

  return (
    <div className="list-grid">
      <section className="card">
        <h1>IELTS Speaking Report</h1>
        <p className="speaking-muted">Session ID: {sessionId}</p>
        {evaluating ? <p className="speaking-muted">Generating your report...</p> : null}
        {error ? <p className="speaking-error">{error}</p> : null}

        <div className="band-hero">Overall Band: {report.overallBand.toFixed(1)}</div>
        <p className="speaking-muted">{report.gapToTarget}</p>
      </section>

      <section className="card">
        <h2>Criteria Breakdown</h2>
        <div className="criteria-grid">
          <ReportCard title="Fluency & Coherence" criterion={report.criteria.fluencyCoherence} />
          <ReportCard title="Lexical Resource" criterion={report.criteria.lexicalResource} />
          <ReportCard title="Grammar Range & Accuracy" criterion={report.criteria.grammaticalRange} />
          <ReportCard
            title="Pronunciation"
            criterion={report.criteria.pronunciation}
            extra={`${report.criteria.pronunciation.confidence} confidence`}
          />
        </div>
      </section>

      <section className="card">
        <h2>Score Chart</h2>
        <div className="score-bars">
          <div className="score-row">
            <span>Fluency & Coherence</span>
            <div className="score-track"><div style={{ width: `${(report.criteria.fluencyCoherence.band / 9) * 100}%` }} /></div>
            <strong>{report.criteria.fluencyCoherence.band.toFixed(1)}</strong>
          </div>
          <div className="score-row">
            <span>Lexical Resource</span>
            <div className="score-track"><div style={{ width: `${(report.criteria.lexicalResource.band / 9) * 100}%` }} /></div>
            <strong>{report.criteria.lexicalResource.band.toFixed(1)}</strong>
          </div>
          <div className="score-row">
            <span>Grammar Range & Accuracy</span>
            <div className="score-track"><div style={{ width: `${(report.criteria.grammaticalRange.band / 9) * 100}%` }} /></div>
            <strong>{report.criteria.grammaticalRange.band.toFixed(1)}</strong>
          </div>
          <div className="score-row">
            <span>Pronunciation</span>
            <div className="score-track"><div style={{ width: `${(report.criteria.pronunciation.band / 9) * 100}%` }} /></div>
            <strong>{report.criteria.pronunciation.band.toFixed(1)}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Error Log</h2>
        <div className="error-table">
          {report.errorLog.slice(0, 10).map((e, idx) => (
            <div key={idx} className="error-row">
              <p><strong>Student said:</strong> {e.studentSaid}</p>
              <p><strong>Correction:</strong> {e.correction}</p>
              <p><strong>Rule:</strong> {e.rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Next Session Focus</h2>
        <ul>
          {report.nextSessionFocus.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <div className="report-actions">
          <Link className="report-practice-btn" href={practiceAgainHref}>
            Practice Again With This Focus
          </Link>
        </div>
      </section>
    </div>
  );
}
