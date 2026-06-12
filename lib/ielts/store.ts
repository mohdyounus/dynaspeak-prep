import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SpeakingPart, SpeakingSession } from '@/lib/ielts/types';

const dataDir = path.join(process.cwd(), '.data');
const sessionsFile = path.join(dataDir, 'speaking-sessions.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(sessionsFile)) {
    fs.writeFileSync(sessionsFile, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
  }
}

function readAll(): SpeakingSession[] {
  ensureStore();
  const raw = fs.readFileSync(sessionsFile, 'utf8');
  try {
    const parsed = JSON.parse(raw) as { sessions?: SpeakingSession[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: SpeakingSession[]) {
  ensureStore();
  fs.writeFileSync(sessionsFile, JSON.stringify({ sessions }, null, 2), 'utf8');
}

function toSession(row: {
  id: string;
  createdAt: Date;
  targetScore: string;
  background: string;
  interests: string;
  status: string;
  transcript: unknown;
  report: unknown;
  durationSec: number | null;
  examinerPrompt: string | null;
  githubUsername: string | null;
  profileSummary: string | null;
  focus: unknown;
  part: string | null;
}): SpeakingSession {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    targetScore: row.targetScore,
    background: row.background,
    interests: row.interests,
    status: row.status as SpeakingSession['status'],
    transcript: Array.isArray(row.transcript) ? (row.transcript as SpeakingSession['transcript']) : undefined,
    report: row.report as SpeakingSession['report'],
    durationSec: row.durationSec ?? undefined,
    examinerPrompt: row.examinerPrompt ?? undefined,
    githubUsername: row.githubUsername ?? undefined,
    profileSummary: row.profileSummary ?? undefined,
    focus: Array.isArray(row.focus) ? (row.focus as string[]) : undefined,
    part: row.part === 'part1' || row.part === 'part2' || row.part === 'part3' ? row.part : undefined
  };
}

export async function createSession(input: {
  targetScore: string;
  background: string;
  interests: string;
  examinerPrompt?: string;
  githubUsername?: string;
  profileSummary?: string;
  focus?: string[];
  part?: SpeakingPart;
}): Promise<SpeakingSession> {
  const sessions = readAll();
  const session: SpeakingSession = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    targetScore: input.targetScore,
    background: input.background,
    interests: input.interests,
    examinerPrompt: input.examinerPrompt,
    githubUsername: input.githubUsername,
    profileSummary: input.profileSummary,
    focus: input.focus,
    part: input.part,
    status: 'created'
  };
  sessions.unshift(session);
  writeAll(sessions);
  return session;
}

export async function getSession(id: string): Promise<SpeakingSession | null> {
  const sessions = readAll();
  return sessions.find((s) => s.id === id) || null;
}

export async function updateSession(id: string, patch: Partial<SpeakingSession>): Promise<SpeakingSession | null> {
  const sessions = readAll();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  sessions[idx] = { ...sessions[idx], ...patch };
  writeAll(sessions);
  return sessions[idx];
}
