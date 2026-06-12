import { NextResponse } from 'next/server';

const OPENAI_REALTIME_TOKEN_ENDPOINTS = [
  'https://api.openai.com/v1/realtime/client_secrets',
  'https://api.openai.com/v1/realtime/sessions'
] as const;

const REALTIME_MODEL = 'gpt-realtime-2';
const REALTIME_VOICE = 'marin';

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
    let lastStatus = 502;
    let lastBody = '';

    for (const endpoint of OPENAI_REALTIME_TOKEN_ENDPOINTS) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: REALTIME_MODEL,
            audio: {
              output: {
                voice: REALTIME_VOICE
              }
            }
          }
        })
      });

      const bodyText = await response.text();
      lastStatus = response.status;
      lastBody = bodyText;

      if (!response.ok) {
        continue;
      }

      const parsed = JSON.parse(bodyText) as { client_secret?: { value?: string }; value?: string };
      const token = parsed?.client_secret?.value || parsed?.value;
      if (!token) {
        continue;
      }

      return NextResponse.json({ enabled: true, token });
    }

    return NextResponse.json(
      {
        enabled: false,
        error: `Realtime session token request failed (${lastStatus}).`,
        details: lastBody
      },
      { status: lastStatus }
    );
  } catch {
    return NextResponse.json(
      { enabled: false, error: 'Failed to request realtime token.' },
      { status: 502 }
    );
  }
}
