import { NextResponse } from 'next/server';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel Project Settings -> Environment Variables.' },
      { status: 500 }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();

  if (!response.ok) {
    let errorMessage = `Anthropic API error ${response.status}`;
    try {
      const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
      if (parsed?.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // Keep fallback message when response body is non-JSON.
    }
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  try {
    const parsed = JSON.parse(bodyText) as { content?: Array<{ text?: string }> };
    const text = parsed?.content?.[0]?.text || '';
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: 'Unexpected response format from Anthropic.' }, { status: 502 });
  }
}
