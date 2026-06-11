import type { TranscriptEntry } from '@/lib/ielts/types';

export type VoiceState = 'listening' | 'speaking' | 'thinking' | 'ended';

export interface VoiceSession {
  start(systemPrompt: string): Promise<void>;
  onTranscript(cb: (entry: TranscriptEntry) => void): void;
  onStateChange(cb: (state: VoiceState) => void): void;
  end(): Promise<TranscriptEntry[]>;
}

export class MockVoiceSession implements VoiceSession {
  private transcript: TranscriptEntry[] = [];
  private transcriptHandlers: Array<(entry: TranscriptEntry) => void> = [];
  private stateHandlers: Array<(state: VoiceState) => void> = [];

  async start(_systemPrompt: string): Promise<void> {
    this.emitState('listening');
    const greeting: TranscriptEntry = {
      role: 'examiner',
      text: 'Welcome to your IELTS speaking practice. Let us begin with your introduction.',
      ts: Date.now()
    };
    this.pushTranscript(greeting);
  }

  onTranscript(cb: (entry: TranscriptEntry) => void): void {
    this.transcriptHandlers.push(cb);
  }

  onStateChange(cb: (state: VoiceState) => void): void {
    this.stateHandlers.push(cb);
  }

  async end(): Promise<TranscriptEntry[]> {
    this.emitState('ended');
    return this.transcript;
  }

  private pushTranscript(entry: TranscriptEntry) {
    this.transcript.push(entry);
    this.transcriptHandlers.forEach((h) => h(entry));
  }

  private emitState(state: VoiceState) {
    this.stateHandlers.forEach((h) => h(state));
  }
}
