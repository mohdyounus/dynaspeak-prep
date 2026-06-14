import type { TranscriptEntry } from '@/lib/ielts/types';

export type VoiceState = 'listening' | 'speaking' | 'thinking' | 'ended';
export type TurnMode = 'normal' | 'monologue';

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export interface VoiceSession {
  start(systemPrompt: string): Promise<void>;
  speak(text: string): Promise<void>;
  setTurnMode(mode: TurnMode): Promise<void>;
  pauseListening(): Promise<void>;
  resumeListening(): Promise<void>;
  commitAnswer(): Promise<void>;
  onTranscript(cb: (entry: TranscriptEntry) => void): void;
  onStateChange(cb: (state: VoiceState) => void): void;
  onToolCall(cb: (tool: ToolCall) => Promise<string>): void;
  submitToolResult(toolCallId: string, result: string): Promise<void>;
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
  private toolHandlers: Array<(tool: ToolCall) => Promise<string>> = [];
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private micSender: RTCRtpSender | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private turnMode: TurnMode = 'normal';
  private started = false;
  private closed = false;
  private state: VoiceState = 'thinking';
  private bargeInCancelling = false;
  private listeningEnabled = false;
  private pendingToolCalls: Map<string, ToolCall> = new Map();

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
    this.remoteAudio.setAttribute('playsinline', 'true');
    // Append to DOM so browser can output audio through speaker
    if (typeof document !== 'undefined') {
      document.body.appendChild(this.remoteAudio);
    }
    pc.ontrack = (e) => {
      if (this.remoteAudio) {
        const remoteStream = e.streams[0] || new MediaStream([e.track]);
        this.remoteAudio.srcObject = remoteStream;
        this.remoteAudio.muted = false;
        this.remoteAudio.volume = 1;
        // Some browsers require an explicit play() call even with autoplay.
        void this.remoteAudio.play().catch(() => {
          // Keep session alive; playback may succeed on the next user interaction.
        });
      }
    };

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, this.localStream as MediaStream);
      if (track.kind === 'audio') {
        this.micSender = sender;
      }
      // PTT default: keep mic muted until student presses "Start Answer".
      track.enabled = false;
    });
    this.listeningEnabled = false;

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.onmessage = (ev) => {
      this.handleRealtimeEvent(ev.data);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
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
        // Enable transcription so student speech arrives as text events
        input_audio_transcription: { model: 'whisper-1' },
        // Server VAD is set to a high threshold by default; PTT mode
        // manually commits audio so the model never auto-responds mid-turn.
        turn_detection: {
          type: 'server_vad',
          silence_duration_ms: this.turnMode === 'monologue' ? 2500 : 1000
        },
        tools: [
          {
            name: 'display_cue_card',
            description:
              'Display the cue card topic and bullet points to the student for Part 2 preparation. Call this when transitioning to Part 2.',
            parameters: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'The main topic for the cue card' },
                bullets: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of bullet points to guide the students response'
                }
              },
              required: ['topic', 'bullets']
            }
          },
          {
            name: 'set_turn_detection',
            description:
              'Control VAD turn detection sensitivity. Use "monologue" mode during Part 2 to prevent interrupting the student during their 1-2 minute long turn. Switch back to "normal" after Part 2.',
            parameters: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  enum: ['normal', 'monologue'],
                  description: 'normal = 1000ms silence threshold; monologue = 2500ms (for Part 2 long turn)'
                }
              },
              required: ['mode']
            }
          }
        ]
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

  async pauseListening(): Promise<void> {
    // Release mic capture so browser tab indicator turns off between turns.
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop failures
        }
      });
      this.localStream = null;
    }
    if (this.micSender) {
      try {
        await this.micSender.replaceTrack(null);
      } catch {
        // ignore replaceTrack failures; session can still continue
      }
    }
    this.listeningEnabled = false;
  }

  async resumeListening(): Promise<void> {
    if (typeof navigator === 'undefined') return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }

    if (this.micSender) {
      try {
        await this.micSender.replaceTrack(audioTrack);
      } catch {
        // Fallback: add track if replace fails
        if (this.pc) {
          this.micSender = this.pc.addTrack(audioTrack, stream);
        }
      }
    } else if (this.pc) {
      this.micSender = this.pc.addTrack(audioTrack, stream);
    }

    audioTrack.enabled = true;
    this.localStream = stream;
    this.listeningEnabled = true;
  }

  async commitAnswer(): Promise<void> {
    // Commit the accumulated audio buffer to trigger transcription.
    // Do NOT send response.create here — the conversation is driven by
    // Claude evaluation (processStudentAnswer). OpenAI Realtime is used
    // only for voice I/O (mic → Whisper STT and TTS ← examiner speech).
    if (!this.started) return;
    this.sendEvent({ type: 'input_audio_buffer.commit' });
  }

  onTranscript(cb: (entry: TranscriptEntry) => void): void {
    this.transcriptHandlers.push(cb);
  }

  onStateChange(cb: (state: VoiceState) => void): void {
    this.stateHandlers.push(cb);
  }

  onToolCall(cb: (tool: ToolCall) => Promise<string>): void {
    this.toolHandlers.push(cb);
  }

  async submitToolResult(toolCallId: string, result: string): Promise<void> {
    if (!this.started) return;
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: toolCallId,
        output: result
      }
    });
    this.sendEvent({
      type: 'response.create'
    });
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
    this.localStream = null;
    this.micSender = null;
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      // Remove from DOM
      try {
        if (this.remoteAudio.parentNode) {
          this.remoteAudio.parentNode.removeChild(this.remoteAudio);
        }
      } catch {
        // ignore
      }
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
        item?: { 
          type?: string; 
          role?: string; 
          content?: Array<{ type?: string; text?: string; transcript?: string }>;
          call_id?: string;
          name?: string;
          arguments?: string;
        };
      };

      if (!event?.type) return;

      if (event.type === 'input_audio_buffer.speech_started') {
        // If the learner starts speaking while assistant audio is active, cancel current output once.
        if (this.state === 'speaking' && !this.bargeInCancelling) {
          this.bargeInCancelling = true;
          this.sendEvent({ type: 'response.cancel' });
        }
        this.emitState('listening');
        return;
      }

      // Handle function/tool calls
      if (event.type === 'response.function_call_arguments.done' && event.item) {
        const { call_id, name, arguments: argsStr } = event.item;
        if (call_id && name && argsStr) {
          try {
            const args = JSON.parse(argsStr) as Record<string, unknown>;
            const tool: ToolCall = { id: call_id, name, arguments: args };
            this.pendingToolCalls.set(call_id, tool);
            
            // Invoke all tool handlers async
            this.toolHandlers.forEach((handler) => {
              handler(tool).then((result) => {
                this.submitToolResult(call_id, result);
              }).catch((err) => {
                console.error(`Tool handler error for ${name}:`, err);
                this.submitToolResult(call_id, `Error: ${String(err)}`);
              });
            });
          } catch {
            // ignore malformed tool arguments
          }
        }
        return;
      }

      if (event.type === 'response.output_audio_transcript.done') {
        const examinerText = String(event.transcript || '').trim();
        if (examinerText) {
          this.pushTranscript({ role: 'examiner', text: examinerText, ts: Date.now() });
        }
        this.bargeInCancelling = false;
        this.emitState('listening');
        return;
      }

      if (event.type === 'response.output_audio.delta') {
        // Mark speaking when actual output audio chunks are flowing.
        this.emitState('speaking');
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
        this.bargeInCancelling = false;
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
    this.state = state;
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

  async pauseListening(): Promise<void> {
    this.active = false;
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
  }

  async resumeListening(): Promise<void> {
    if (!this.recognition || this.active) return;
    this.active = true;
    try {
      this.recognition.start();
    } catch {
      // ignore
    }
  }

  async commitAnswer(): Promise<void> {
    // Browser speech is PTT-via-recognition stop; no explicit commit needed.
  }

  onTranscript(cb: (entry: TranscriptEntry) => void): void {
    this.transcriptHandlers.push(cb);
  }

  onStateChange(cb: (state: VoiceState) => void): void {
    this.stateHandlers.push(cb);
  }

  onToolCall(cb: (tool: ToolCall) => Promise<string>): void {
    // Browser fallback does not support tool calls; register but ignore.
  }

  async submitToolResult(_toolCallId: string, _result: string): Promise<void> {
    // Browser fallback does not support tool calls.
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

  async pauseListening(): Promise<void> {
    // No-op for mock mode.
  }

  async resumeListening(): Promise<void> {
    // No-op for mock mode.
  }

  async commitAnswer(): Promise<void> {
    // No-op for mock mode.
  }

  onTranscript(cb: (entry: TranscriptEntry) => void): void {
    this.transcriptHandlers.push(cb);
  }

  onStateChange(cb: (state: VoiceState) => void): void {
    this.stateHandlers.push(cb);
  }

  onToolCall(cb: (tool: ToolCall) => Promise<string>): void {
    // Mock does not support tool calls; register but ignore.
  }

  async submitToolResult(_toolCallId: string, _result: string): Promise<void> {
    // Mock does not support tool calls.
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
