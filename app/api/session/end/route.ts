import { NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/ielts/store';
import type { SpeakingPart, TranscriptEntry } from '@/lib/ielts/types';

export async function POST(req: Request) {
  let body: {
    sessionId?: string;
    transcript?: TranscriptEntry[];
    durationSec?: number;
    part?: SpeakingPart;
    targetScore?: string;
    background?: string;
    interests?: string;
    examinerPrompt?: string;
    githubUsername?: string;
    profileSummary?: string;
    focus?: string[];
  };
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

  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  const durationSec = Number.isFinite(body.durationSec) ? Number(body.durationSec) : undefined;
  const part = body.part;

  // In serverless environments, a fresh function instance may not have access
  // to the same file-store fallback snapshot. If lookup misses, reconstruct a
  // minimal patch from client-provided session context instead of hard-failing.
  const basePatch = session
    ? {}
    : {
        targetScore: String(body.targetScore || '').trim() || '6.5',
        background: String(body.background || '').trim() || 'Adult learner preparing for IELTS speaking test.',
        interests: String(body.interests || '').trim() || 'work, study, daily life',
        examinerPrompt: String(body.examinerPrompt || '').trim() || undefined,
        githubUsername: String(body.githubUsername || '').trim() || undefined,
        profileSummary: String(body.profileSummary || '').trim() || undefined,
        focus: Array.isArray(body.focus) ? body.focus.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 8) : undefined
      };

  const updated = await updateSession(sessionId, {
    ...basePatch,
    transcript,
    durationSec,
    part,
    status: 'ended'
  });

  if (!updated) {
    return NextResponse.json({ error: 'Failed to end session.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    session: updated,
    next: `/report/${sessionId}`
  });
}
