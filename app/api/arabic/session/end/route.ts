import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, transcript, durationSec, finalLetter } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        transcript: transcript || [],
        part: `arabic_letter_${finalLetter || 1}`,
        durationSec: durationSec || 0
      }
    });

    return NextResponse.json({ session: updated });
  } catch (err) {
    console.error('Arabic session end error:', err);
    return NextResponse.json(
      { error: 'Failed to end lesson session.' },
      { status: 500 }
    );
  }
}
