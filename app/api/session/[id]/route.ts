import { NextResponse } from 'next/server';
import { getSession } from '@/lib/ielts/store';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }
  return NextResponse.json({ session });
}
