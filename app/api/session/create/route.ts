import { NextResponse } from 'next/server';
import { createSession } from '@/lib/ielts/store';
import { buildExaminerPrompt } from '@/lib/prompts/examiner';

async function fetchGithubBackground(githubUsername: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/scrape/github`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ githubUsername })
    });
    if (!res.ok) return { studentBackground: '', technicalInterests: '' };
    return (await res.json()) as { studentBackground: string; technicalInterests: string };
  } catch (err) {
    console.warn('GitHub scraping error:', err);
    return { studentBackground: '', technicalInterests: '' };
  }
}

export async function POST(req: Request) {
  let body: { targetScore?: string; githubUsername?: string; profileSummary?: string; focus?: string[] };
  try {
    body = await req.json();
  } catch (err) {
    console.error('Failed to parse request JSON:', err);
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const targetScore = (body.targetScore || '').trim() || '6.5';
  const githubUsername = (body.githubUsername || '').trim();
  const profileSummary = (body.profileSummary || '').trim();
  const focus = Array.isArray(body.focus)
    ? body.focus.map((f) => String(f || '').trim()).filter(Boolean).slice(0, 8)
    : [];

  try {
    const github = githubUsername ? await fetchGithubBackground(githubUsername) : { studentBackground: '', technicalInterests: '' };

    const focusLine = focus.length ? `Focus areas for this session: ${focus.join(', ')}.` : '';

    const background = [profileSummary, github.studentBackground, focusLine]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Adult learner preparing for IELTS speaking test in New Zealand.';

    const interests = github.technicalInterests || 'work, study, daily life, technology';

    const examinerPrompt = buildExaminerPrompt({
      studentBackground: background,
      targetScore,
      technicalInterests: interests
    });

    console.log(`Creating session for target ${targetScore}, background length: ${background.length}`);

    const session = await createSession({
      targetScore,
      background,
      interests,
      examinerPrompt,
      githubUsername: githubUsername || undefined,
      profileSummary: profileSummary || undefined,
      focus: focus.length ? focus : undefined,
      part: 'part1'
    });

    console.log(`Session created: ${session.id}`);

    const realtimeEnabled = Boolean(process.env.OPENAI_API_KEY);

    return NextResponse.json({
      sessionId: session.id,
      session,
      voice: {
        provider: 'openai-realtime',
        enabled: realtimeEnabled,
        reason: realtimeEnabled ? undefined : 'OPENAI_API_KEY is not configured for realtime tokens.'
      },
      examinerPrompt
    });
  } catch (err) {
    console.error('Session creation error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create session: ${message}` },
      { status: 500 }
    );
  }
}
