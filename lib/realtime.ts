import type { TranscriptEntry } from '@/lib/ielts/types';

export type VoiceState = 'listening' | 'speaking' | 'thinking' | 'ended';

export interface VoiceSession {
  start(systemPrompt: string): Promise<void>;
  speak(text: string): Promise<void>;
  onTranscript(cb: (entry: TranscriptEntry) => void): void;
  onStateChange(cb: (state: VoiceState) => void): void;
  end(): Promise<TranscriptEntry[]>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    isFinal?: boolean;
    0?: { transcript?: string };
  }>;
}

export class BrowserVoiceSession implements VoiceSession {
  private transcript: TranscriptEntry[] = [];
  private transcriptHandlers: Array<(entry: TranscriptEntry) => void> = [];
  private stateHandlers: Array<(state: VoiceState) => void> = [];
  private recognition: SpeechRecognitionLike | null = null;
  private active = false;

  async start(_systemPrompt: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Browser voice is only available in the browser runtime.');
    }

    const ctor = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition
      || (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!ctor) {
      throw new Error('Speech recognition is not supported in this browser.');
    }

    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      this.emitState('listening');
    };

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = String(last?.[0]?.transcript || '').trim();
      if (!transcript) return;

      if (window.speechSynthesis?.speaking) {
        // Barge-in support: learner starts speaking while examiner TTS is active.
        window.speechSynthesis.cancel();
      }

      this.pushTranscript({
        role: 'student',
        text: transcript,
        ts: Date.now()
      });
      this.emitState('listening');
    };

    recognition.onend = () => {
      if (this.active) {
        try {
          recognition.start();
        } catch {
          this.emitState('ended');
        }
      }
    };

    recognition.onerror = () => {
      this.emitState('thinking');
    };

    this.recognition = recognition;
    this.active = true;
    recognition.start();
  }

  async speak(text: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const line = text.trim();
    if (!line) return;

    this.pushTranscript({ role: 'examiner', text: line, ts: Date.now() });

    if (!window.speechSynthesis) {
      this.emitState('listening');
      return;
    }

    this.emitState('speaking');
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = 'en-US';
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.onend = () => {
        this.emitState('listening');
        resolve();
      };
      utterance.onerror = () => {
        this.emitState('listening');
        resolve();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  onTranscript(cb: (entry: TranscriptEntry) => void): void {
    this.transcriptHandlers.push(cb);
  }

  onStateChange(cb: (state: VoiceState) => void): void {
    this.stateHandlers.push(cb);
  }

  async end(): Promise<TranscriptEntry[]> {
    this.active = false;
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
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

  async speak(text: string): Promise<void> {
    const line = text.trim();
    if (!line) return;
    this.emitState('speaking');
    this.pushTranscript({ role: 'examiner', text: line, ts: Date.now() });
    this.emitState('listening');
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
