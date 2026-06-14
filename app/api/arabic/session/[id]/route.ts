import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: sessionId } = context.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session: {
        id: session.id,
        childName: session.childName || 'Student',
        currentLetter: session.part === 'arabic_intro' ? 1 : parseInt(session.part || '1', 10),
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
