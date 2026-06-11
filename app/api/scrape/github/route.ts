import { NextResponse } from 'next/server';

function toInterests(repos: Array<{ language: string | null; topics?: string[] }>) {
  const langSet = new Set<string>();
  const topicSet = new Set<string>();
  repos.forEach((r) => {
    if (r.language) langSet.add(r.language);
    (r.topics || []).forEach((t) => topicSet.add(t));
  });
  return [...langSet, ...topicSet].slice(0, 12).join(', ');
}

export async function POST(req: Request) {
  let body: { githubUsername?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const username = (body.githubUsername || '').trim();
  if (!username) {
    return NextResponse.json({ studentBackground: '', technicalInterests: '' });
  }

  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'dynaspeak-prep'
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    if (!userRes.ok) {
      return NextResponse.json({
        studentBackground: `Learner with GitHub username ${username}.`,
        technicalInterests: 'technology, communication, learning'
      });
    }

    const user = (await userRes.json()) as {
      name?: string;
      bio?: string;
      company?: string;
      location?: string;
      public_repos?: number;
    };

    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=10`,
      { headers }
    );
    const repos = reposRes.ok
      ? ((await reposRes.json()) as Array<{ name: string; description: string | null; language: string | null; topics?: string[] }>)
      : [];

    const topRepos = repos
      .slice(0, 3)
      .map((r) => `${r.name}${r.description ? ` (${r.description})` : ''}`)
      .join('; ');

    const studentBackground = [
      user.name ? `${user.name} (${username})` : username,
      user.bio || 'English learner preparing for speaking tests.',
      user.company ? `Works at ${user.company}.` : '',
      user.location ? `Based in ${user.location}.` : '',
      user.public_repos ? `Has ${user.public_repos} public repositories.` : '',
      topRepos ? `Recent projects: ${topRepos}.` : ''
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 700);

    const technicalInterests = toInterests(repos) || 'software development, communication, teamwork';

    return NextResponse.json({ studentBackground, technicalInterests });
  } catch {
    return NextResponse.json({
      studentBackground: `Learner with GitHub username ${username}.`,
      technicalInterests: 'technology, communication, learning'
    });
  }
}
