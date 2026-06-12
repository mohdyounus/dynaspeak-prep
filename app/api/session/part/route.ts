import { NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/ielts/store';
import type { SpeakingPart } from '@/lib/ielts/types';

const allowedParts: SpeakingPart[] = ['part1', 'part2', 'part3'];

export async function POST(req: Request) {
  let body: { sessionId?: string; part?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const sessionId = (body.sessionId || '').trim();
  const part = (body.part || '').trim() as SpeakingPart;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
  }
  if (!allowedParts.includes(part)) {
    return NextResponse.json({ error: 'Invalid part value.' }, { status: 400 });
  }

  const current = getSession(sessionId);
  if (!current) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const updated = updateSession(sessionId, { part, status: 'live' });
  return NextResponse.json({ ok: true, session: updated });
}
