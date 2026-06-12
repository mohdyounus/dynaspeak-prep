import { NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/ielts/store';
import { buildEvaluatorPrompt, buildFallbackReport } from '@/lib/prompts/evaluator';
import type { EvaluationReport, TranscriptEntry } from '@/lib/ielts/types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1800,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  try {
    const parsed = JSON.parse(text) as { content?: Array<{ text?: string }> };
    return parsed?.content?.[0]?.text || '';
  } catch {
    throw new Error('Invalid Claude response format');
  }
}

function parseReport(raw: string): EvaluationReport {
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as EvaluationReport;
}

function normalizeTranscript(entries: TranscriptEntry[]): TranscriptEntry[] {
  const filtered = entries
    .map((e): TranscriptEntry => ({
      role: e.role === 'examiner' ? 'examiner' : 'student',
      text: String(e.text || '').replace(/\s+/g, ' ').trim(),
      ts: Number.isFinite(e.ts) ? e.ts : Date.now()
    }))
    .filter((e) => e.text.length > 0)
    .sort((a, b) => a.ts - b.ts);

  const deduped: TranscriptEntry[] = [];
  for (const entry of filtered) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.role === entry.role && prev.text.toLowerCase() === entry.text.toLowerCase()) {
      continue;
    }
    deduped.push(entry);
  }
  return deduped;
}

export async function POST(req: Request) {
  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const sessionId = (body.sessionId || '').trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const transcript = normalizeTranscript((session.transcript || []) as TranscriptEntry[]);
  if (!transcript.length) {
    return NextResponse.json({ error: 'Session transcript is empty. End session first.' }, { status: 400 });
  }

  let report: EvaluationReport;
  try {
    const prompt = buildEvaluatorPrompt({ transcript, targetScore: session.targetScore });
    const raw = await callClaude(prompt);
    try {
      report = parseReport(raw);
    } catch {
      const retryRaw = await callClaude(`${prompt}\n\nReturn strict JSON only. No markdown fences.`);
      report = parseReport(retryRaw);
    }
  } catch {
    report = buildFallbackReport(session.targetScore);
  }

  const updated = await updateSession(sessionId, {
    report,
    status: 'evaluated'
  });

  return NextResponse.json({ ok: true, session: updated, report });
}
