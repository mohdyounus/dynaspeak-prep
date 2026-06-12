'use client';

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    let active = true;
    async function load() {
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
