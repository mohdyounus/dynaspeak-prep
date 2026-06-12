import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildExaminerPrompt } from '@/lib/prompts/examiner';
import { buildFallbackReport } from '@/lib/prompts/evaluator';
import { getSilenceThreshold } from '@/lib/turnDetection';
import { POST as scrapeGithub } from '@/app/api/scrape/github/route';
import type { ToolCall } from '@/lib/realtime';

describe('examiner prompt', () => {
  it('includes student context and IELTS constraints', () => {
    const prompt = buildExaminerPrompt({
      studentBackground: 'Works as a software engineer.',
      targetScore: '7.0',
      technicalInterests: 'TypeScript, React'
    });

    expect(prompt).toContain('software engineer');
    expect(prompt).toContain('7.0');
    expect(prompt).toContain('TypeScript, React');
    expect(prompt).toContain('No scoring during conversation.');
  });

  it('instructs model to use tool calls for Part 2 transitions', () => {
    const prompt = buildExaminerPrompt({
      studentBackground: 'Software engineer',
      targetScore: '7.0',
      technicalInterests: 'TypeScript'
    });

    expect(prompt).toContain('display_cue_card');
    expect(prompt).toContain('set_turn_detection');
    expect(prompt).toContain('monologue');
    expect(prompt).toContain('TOOL USAGE');
  });
});

describe('fallback report', () => {
  it('returns a complete evaluation shape', () => {
    const report = buildFallbackReport('7.0');
    expect(report.overallBand).toBeGreaterThan(0);
    expect(report.criteria.fluencyCoherence.tips.length).toBeGreaterThan(0);
    expect(report.criteria.pronunciation.confidence).toBe('low');
    expect(report.nextSessionFocus.length).toBeGreaterThan(0);
  });
});

describe('turn detection', () => {
  it('uses a longer silence threshold for monologue mode', () => {
    expect(getSilenceThreshold('normal')).toBe(1000);
    expect(getSilenceThreshold('monologue')).toBe(2500);
  });

  it('supports tool call arguments for turn detection mode', () => {
    const cueCardTool: ToolCall = {
      id: 'call_001',
      name: 'display_cue_card',
      arguments: { topic: 'Favourite Hobby', bullets: ['What is it?', 'Why do you like it?', 'How often do you do it?'] }
    };

    expect(cueCardTool.name).toBe('display_cue_card');
    expect((cueCardTool.arguments as Record<string, unknown>).topic).toBe('Favourite Hobby');
    expect(Array.isArray((cueCardTool.arguments as Record<string, unknown>).bullets)).toBe(true);

    const turnTool: ToolCall = {
      id: 'call_002',
      name: 'set_turn_detection',
      arguments: { mode: 'monologue' }
    };

    expect(turnTool.name).toBe('set_turn_detection');
    expect((turnTool.arguments as Record<string, unknown>).mode).toBe('monologue');
  });
});

describe('github personalization route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('falls back gracefully when github lookup fails', async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response);

    const res = await scrapeGithub(new Request('http://localhost/api/scrape/github', {
      method: 'POST',
      body: JSON.stringify({ githubUsername: 'missing-user' })
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.studentBackground).toContain('missing-user');
    expect(data.technicalInterests).toContain('technology');
  });

  it('summarizes repos into interests when github is available', async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Alex',
          bio: 'Builds language learning apps',
          company: 'Dynaspeak',
          location: 'Auckland',
          public_repos: 12
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { name: 'lesson-app', description: 'IELTS trainer', language: 'TypeScript', topics: ['nextjs', 'tailwind'] },
          { name: 'voice-lab', description: 'Realtime practice', language: 'JavaScript', topics: ['openai', 'realtime'] }
        ])
      } as Response);

    const res = await scrapeGithub(new Request('http://localhost/api/scrape/github', {
      method: 'POST',
      body: JSON.stringify({ githubUsername: 'alex' })
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.studentBackground).toContain('Alex');
    expect(data.studentBackground).toContain('Dynaspeak');
    expect(data.technicalInterests).toContain('TypeScript');
    expect(data.technicalInterests).toContain('openai');
  });
});
