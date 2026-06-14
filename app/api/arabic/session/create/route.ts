import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childName, startLetter } = body;

    if (!childName) {
      return NextResponse.json({ error: 'Child name is required.' }, { status: 400 });
    }

    const session = await prisma.session.create({
      data: {
        sessionType: 'arabic',
        childName,
        part: 'arabic_intro',
        targetScore: `Letter ${startLetter}`,
        background: `Arabic Qaida Learning`,
        interests: 'Arabic alphabet',
        status: 'created'
      }
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('Arabic session create error:', err);
    return NextResponse.json(
      { error: 'Failed to create lesson session.' },
      { status: 500 }
    );
  }
}
