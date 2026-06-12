import type { TranscriptEntry } from '@/lib/ielts/types';

export type VoiceState = 'listening' | 'speaking' | 'thinking' | 'ended';
export type TurnMode = 'normal' | 'monologue';

export interface VoiceSession {
  start(systemPrompt: string): Promise<void>;
  speak(text: string): Promise<void>;
  setTurnMode(mode: TurnMode): Promise<void>;
  onTranscript(cb: (entry: TranscriptEntry) => void): void;
  onStateChange(cb: (state: VoiceState) => void): void;
  end(): Promise<TranscriptEntry[]>;
}

type RealtimeTokenResponse = {
  enabled?: boolean;
  token?: string;
  error?: string;
};

export class OpenAIRealtimeVoiceSession implements VoiceSession {
  private transcript: TranscriptEntry[] = [];
  private transcriptHandlers: Array<(entry: TranscriptEntry) => void> = [];
  private stateHandlers: Array<(state: VoiceState) => void> = [];
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private turnMode: TurnMode = 'normal';
  private started = false;
  private closed = false;

  constructor(private readonly tokenEndpoint = '/api/session/token') {}

  async start(systemPrompt: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Realtime session must run in browser context.');
    }

    const tokenRes = await fetch(this.tokenEndpoint, { method: 'POST' });
    const tokenBody = (await tokenRes.json()) as RealtimeTokenResponse;
    if (!tokenRes.ok || !tokenBody?.token) {
      throw new Error(tokenBody?.error || 'Failed to obtain realtime token.');
    }

    const pc = new RTCPeerConnection();
    this.pc = pc;
    this.closed = false;

    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;
      if (state === 'connected') {
        this.emitState('listening');
      }
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (!this.closed) {
          this.emitState('thinking');
        }
      }
    };

    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    pc.ontrack = (e) => {
      if (this.remoteAudio) {
        this.remoteAudio.srcObject = e.streams[0];
      }
      this.emitState('speaking');
    };

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream as MediaStream));

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.onmessage = (ev) => {
      this.handleRealtimeEvent(ev.data);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const model = 'gpt-4o-realtime-preview';
    const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBody.token}`,
        'Content-Type': 'application/sdp'
      },
      body: offer.sdp || ''
    });

    if (!sdpRes.ok) {
      throw new Error(`Realtime SDP negotiation failed (${sdpRes.status}).`);
    }

    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    this.started = true;
    this.emitState('thinking');

    await this.waitForDataChannelOpen();
    this.sendEvent({
      type: 'session.update',
      session: {
        instructions: systemPrompt,
        modalities: ['audio', 'text'],
        turn_detection: {
          type: 'server_vad',
          silence_duration_ms: this.turnMode === 'monologue' ? 2500 : 1000
        }
      }
    });
    this.emitState('listening');
  }

  async speak(text: string): Promise<void> {
    const line = text.trim();
    if (!line || !this.started) return;

    this.emitState('speaking');

    this.sendEvent({
      type: 'response.create',
      response: {
        instructions: line,
        modalities: ['audio', 'text']
      }
    });
  }

  async setTurnMode(mode: TurnMode): Promise<void> {
    this.turnMode = mode;
    if (!this.started) return;
    this.sendEvent({
      type: 'session.update',
      session: {
        turn_detection: {
          type: 'server_vad',
          silence_duration_ms: mode === 'monologue' ? 2500 : 1000
        }
      }
    });
  }

  onTranscript(cb: (entry: TranscriptEntry) => void): void {
    this.transcriptHandlers.push(cb);
  }

  onStateChange(cb: (state: VoiceState) => void): void {
    this.stateHandlers.push(cb);
  }

  async end(): Promise<TranscriptEntry[]> {
    this.started = false;
    this.closed = true;
    try {
      this.dc?.close();
    } catch {
      // ignore
    }
    try {
      this.pc?.close();
    } catch {
      // ignore
    }
    try {
      this.localStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }
    this.emitState('ended');
    return this.transcript;
  }

  private sendEvent(payload: unknown) {
    if (!this.dc || this.dc.readyState !== 'open') return;
    this.dc.send(JSON.stringify(payload));
  }

  private async waitForDataChannelOpen(): Promise<void> {
    if (!this.dc) throw new Error('Realtime data channel is unavailable.');
    if (this.dc.readyState === 'open') return;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Realtime data channel open timeout.')), 10000);
      this.dc!.onopen = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      this.dc!.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Realtime data channel failed to open.'));
      };
    });
  }

  private handleRealtimeEvent(raw: string) {
    try {
      const event = JSON.parse(raw) as {
        type?: string;
        transcript?: string;
        item?: { role?: string; content?: Array<{ type?: string; text?: string; transcript?: string }> };
      };

      if (!event?.type) return;

      if (event.type === 'response.output_audio_transcript.done') {
        const examinerText = String(event.transcript || '').trim();
        if (examinerText) {
          this.pushTranscript({ role: 'examiner', text: examinerText, ts: Date.now() });
        }
        this.emitState('listening');
        return;
      }

      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const studentText = String(event.transcript || '').trim();
        if (studentText) {
          this.pushTranscript({ role: 'student', text: studentText, ts: Date.now() });
        }
        this.emitState('thinking');
        return;
      }

      if (event.type === 'response.completed') {
        this.emitState('listening');
      }
    } catch {
      // ignore malformed realtime events
    }
  }

  private pushTranscript(entry: TranscriptEntry) {
    this.transcript.push(entry);
    this.transcriptHandlers.forEach((h) => h(entry));
  }

  private emitState(state: VoiceState) {
    this.stateHandlers.forEach((h) => h(state));
  }
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

  async setTurnMode(_mode: TurnMode): Promise<void> {
    // Web Speech API does not expose configurable server-side VAD.
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

  async setTurnMode(_mode: TurnMode): Promise<void> {
    // No-op for mock mode.
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
