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
  } catch {
    return { studentBackground: '', technicalInterests: '' };
  }
}

export async function POST(req: Request) {
  let body: { targetScore?: string; githubUsername?: string; profileSummary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const targetScore = (body.targetScore || '').trim() || '6.5';
  const githubUsername = (body.githubUsername || '').trim();
  const profileSummary = (body.profileSummary || '').trim();

  const github = githubUsername ? await fetchGithubBackground(githubUsername) : { studentBackground: '', technicalInterests: '' };

  const background = [profileSummary, github.studentBackground]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Adult learner preparing for IELTS speaking test in New Zealand.';

  const interests = github.technicalInterests || 'work, study, daily life, technology';

  const session = createSession({
    targetScore,
    background,
    interests,
    githubUsername: githubUsername || undefined,
    profileSummary: profileSummary || undefined,
    part: 'part1'
  });

  const examinerPrompt = buildExaminerPrompt({
    studentBackground: background,
    targetScore,
    technicalInterests: interests
  });

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
}
