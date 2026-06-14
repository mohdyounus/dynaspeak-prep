import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/ielts/store';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: sessionId } = context.params;

  try {
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session: {
        id: session.id,
        childName: session.profileSummary || 'Student',
        currentLetter: 1,
        transcript: session.transcript,
        voiceMode: 'realtime'
      }
    });
  } catch (err) {
    console.error('Arabic session get error:', err);
    return NextResponse.json(
      { error: 'Failed to load lesson session.' },
      { status: 500 }
    );
  }
}
