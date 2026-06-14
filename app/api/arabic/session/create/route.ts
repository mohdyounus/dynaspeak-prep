import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/ielts/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childName, startLetter } = body;

    if (!childName) {
      return NextResponse.json({ error: 'Child name is required.' }, { status: 400 });
    }

    const start = Number(startLetter) > 0 ? Number(startLetter) : 1;

    const session = await createSession({
      targetScore: `Letter ${start}`,
      background: `Arabic Qaida Learning for child: ${childName}`,
      interests: 'Arabic alphabet, qaida, kids learning',
      profileSummary: childName,
      part: 'part1'
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('Arabic session create error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create lesson session: ${message}` },
      { status: 500 }
    );
  }
}
