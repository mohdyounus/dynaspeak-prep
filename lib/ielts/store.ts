import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SpeakingPart, SpeakingSession } from '@/lib/ielts/types';
import { prisma, getPrismaClient } from '@/lib/db';

// On Vercel (read-only FS), use /tmp which is writable in serverless functions.
// Locally, use .data/ in the project root.
const isVercel = !!process.env.VERCEL;
const dataDir = isVercel
  ? path.join('/tmp', 'dynaspeak-data')
  : path.join(process.cwd(), '.data');
const sessionsFile = path.join(dataDir, 'speaking-sessions.json');

// Check if Prisma is available
function hasPrisma(): boolean {
  return !!getPrismaClient();
}

function ensureStore() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(sessionsFile)) {
      fs.writeFileSync(sessionsFile, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
    }
  } catch {
    // Filesystem unavailable — session data will only persist in Prisma if configured
  }
}

function readAll(): SpeakingSession[] {
  try {
    ensureStore();
    const raw = fs.readFileSync(sessionsFile, 'utf8');
    const parsed = JSON.parse(raw) as { sessions?: SpeakingSession[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: SpeakingSession[]) {
  try {
    ensureStore();
    fs.writeFileSync(sessionsFile, JSON.stringify({ sessions }, null, 2), 'utf8');
  } catch {
    // Filesystem write failed — Prisma is the primary persistence on serverless
  }
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
  const id = randomUUID();
  const session: SpeakingSession = {
    id,
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

  // Try Prisma first; fall back to file store
  if (hasPrisma()) {
    try {
      await prisma.session.upsert({
        where: { id },
        create: {
          id,
          targetScore: input.targetScore,
          background: input.background,
          interests: input.interests,
          examinerPrompt: input.examinerPrompt || null,
          githubUsername: input.githubUsername || null,
          profileSummary: input.profileSummary || null,
          focus: input.focus || [],
          part: input.part || null,
          status: 'created'
        },
        update: {} // Won't be used for fresh create, but required by upsert
      });
    } catch (err) {
      console.warn('Prisma create failed, falling back to file store:', err);
    }
  }

  // Always write to file store as fallback/backup
  const sessions = readAll();
  sessions.unshift(session);
  writeAll(sessions);

  return session;
}

export async function getSession(id: string): Promise<SpeakingSession | null> {
  // Try Prisma first
  if (hasPrisma()) {
    try {
      const result = await prisma.session.findUnique({
        where: { id }
      });
      if (result) {
        return toSession(result as Parameters<typeof toSession>[0]);
      }
    } catch (err) {
      console.warn('Prisma findUnique failed, falling back to file store:', err);
    }
  }

  // Fall back to file store
  const sessions = readAll();
  return sessions.find((s) => s.id === id) || null;
}

export async function updateSession(id: string, patch: Partial<SpeakingSession>): Promise<SpeakingSession | null> {
  // Try Prisma first
  if (hasPrisma()) {
    try {
      const result = await prisma.session.upsert({
        where: { id },
        create: {
          id,
          targetScore: patch.targetScore || '',
          background: patch.background || '',
          interests: patch.interests || '',
          status: patch.status || 'created',
          transcript: patch.transcript,
          report: patch.report,
          durationSec: patch.durationSec,
          examinerPrompt: patch.examinerPrompt || null,
          githubUsername: patch.githubUsername || null,
          profileSummary: patch.profileSummary || null,
          focus: patch.focus || [],
          part: patch.part || null
        },
        update: {
          targetScore: patch.targetScore,
          background: patch.background,
          interests: patch.interests,
          status: patch.status,
          transcript: patch.transcript,
          report: patch.report,
          durationSec: patch.durationSec,
          examinerPrompt: patch.examinerPrompt,
          githubUsername: patch.githubUsername,
          profileSummary: patch.profileSummary,
          focus: patch.focus,
          part: patch.part
        }
      });
      if (result) {
        const updated = toSession(result as Parameters<typeof toSession>[0]);
        // Always write to file store to keep cross-instance fallback consistent
        const sessions = readAll();
        const idx = sessions.findIndex((s) => s.id === id);
        if (idx >= 0) {
          sessions[idx] = updated;
        } else {
          sessions.unshift(updated);
        }
        writeAll(sessions);
        return updated;
      }
    } catch (err) {
      console.warn('Prisma update failed, falling back to file store:', err);
    }
  }

  // Fall back to file store
  const sessions = readAll();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  sessions[idx] = { ...sessions[idx], ...patch };
  writeAll(sessions);
  return sessions[idx];
}
