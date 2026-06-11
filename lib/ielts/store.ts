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

export function createSession(input: {
  targetScore: string;
  background: string;
  interests: string;
  githubUsername?: string;
  profileSummary?: string;
  part?: SpeakingPart;
}): SpeakingSession {
  const sessions = readAll();
  const session: SpeakingSession = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    targetScore: input.targetScore,
    background: input.background,
    interests: input.interests,
    githubUsername: input.githubUsername,
    profileSummary: input.profileSummary,
    part: input.part,
    status: 'created'
  };
  sessions.unshift(session);
  writeAll(sessions);
  return session;
}

export function getSession(id: string): SpeakingSession | null {
  const sessions = readAll();
  return sessions.find((s) => s.id === id) || null;
}

export function updateSession(id: string, patch: Partial<SpeakingSession>): SpeakingSession | null {
  const sessions = readAll();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  sessions[idx] = { ...sessions[idx], ...patch };
  writeAll(sessions);
  return sessions[idx];
}
