import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/ielts/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, transcript, durationSec, finalLetter } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const updated = await updateSession(sessionId, {
      status: 'ended',
      transcript: transcript || [],
      durationSec: durationSec || 0,
      part: 'part1'
    });

    if (!updated) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error('Arabic session end error:', err);
    return NextResponse.json(
      { error: 'Failed to end lesson session.' },
      { status: 500 }
    );
  }
}
