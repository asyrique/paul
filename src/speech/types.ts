/**
 * The app talks to speech through this interface only.
 *
 * Today there is one implementation, `systemEngine`, which drives the phone's own
 * TTS engine via expo-speech. If we later bundle a neural en-AU voice (Piper via
 * sherpa-onnx, say) it becomes a second implementation of this same interface and
 * nothing in the UI changes.
 */

export type VoiceOfflineStatus =
  /** Voice identifier is explicitly marked local by the engine — safe in aeroplane mode. */
  | 'offline'
  /** Voice identifier is explicitly marked as requiring the network. */
  | 'network'
  /** Engine gave us no signal either way. Most likely fine, but we can't promise. */
  | 'unknown';

export type SpeechVoice = {
  id: string;
  name: string;
  /** BCP 47, normalised to hyphens and canonical case, e.g. `en-AU`. */
  language: string;
  /** True when `language` is exactly Australian English. */
  isAustralian: boolean;
  offline: VoiceOfflineStatus;
  enhanced: boolean;
};

export type SpeakOptions = {
  /** 1.0 is the engine's normal rate. */
  rate: number;
  pitch: number;
  /**
   * Play even when the device is switched to silent. Honoured on iOS; Android exposes
   * no equivalent, so implementations there may ignore it.
   */
  overrideSilentSwitch: boolean;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
};

export interface SpeechEngine {
  /**
   * All voices the engine can offer, best-first. May be empty on a cold engine, so an
   * implementation is expected to retry — and to give up promptly when `signal` aborts
   * rather than leaving a timer running past the caller's lifetime.
   */
  listVoices(signal?: AbortSignal): Promise<SpeechVoice[]>;
  speak(text: string, voice: SpeechVoice | undefined, options: SpeakOptions): void;
  stop(): Promise<void>;
  isSpeaking(): Promise<boolean>;
  /** Hard limit on a single utterance, in characters. */
  maxInputLength: number;
}
