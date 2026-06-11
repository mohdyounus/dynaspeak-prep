import { NextResponse } from 'next/server';

const OPENAI_REALTIME_SESSION_URL = 'https://api.openai.com/v1/realtime/sessions';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        enabled: false,
        error: 'Missing OPENAI_API_KEY. Configure it in environment variables to enable live voice sessions.'
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(OPENAI_REALTIME_SESSION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy'
      })
    });

    const bodyText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        {
          enabled: false,
          error: `Realtime session token request failed (${response.status}).`,
          details: bodyText
        },
        { status: response.status }
      );
    }

    const parsed = JSON.parse(bodyText) as { client_secret?: { value?: string } };
    const token = parsed?.client_secret?.value;
    if (!token) {
      return NextResponse.json(
        { enabled: false, error: 'Realtime token missing in provider response.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ enabled: true, token });
  } catch {
    return NextResponse.json(
      { enabled: false, error: 'Failed to request realtime token.' },
      { status: 502 }
    );
  }
}
