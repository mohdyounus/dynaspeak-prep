import { NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/ielts/store';
import type { SpeakingPart, TranscriptEntry } from '@/lib/ielts/types';

export async function POST(req: Request) {
  let body: { sessionId?: string; transcript?: TranscriptEntry[]; durationSec?: number; part?: SpeakingPart };
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

  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  const durationSec = Number.isFinite(body.durationSec) ? Number(body.durationSec) : undefined;
  const part = body.part;

  const updated = await updateSession(sessionId, {
    transcript,
    durationSec,
    part,
    status: 'ended'
  });

  return NextResponse.json({
    ok: true,
    session: updated,
    next: `/report/${sessionId}`
  });
}
