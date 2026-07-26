import * as Speech from 'expo-speech';

import { SpeakOptions, SpeechEngine, SpeechVoice } from './types';
import { detectOfflineStatus, normaliseLanguage, rankVoices } from './voiceRanking';

/**
 * Speech backed by the phone's own TTS engine (Samsung TTS or Google Speech Services
 * on Android, AVSpeechSynthesizer on iOS).
 */

function toSpeechVoice(voice: Speech.Voice): SpeechVoice {
  const language = normaliseLanguage(voice.language);
  return {
    id: voice.identifier,
    name: voice.name || voice.identifier,
    language,
    isAustralian: language.toLowerCase() === 'en-au',
    offline: detectOfflineStatus(voice.identifier, voice.name ?? ''),
    enhanced: voice.quality === Speech.VoiceQuality.Enhanced,
  };
}

/** A sleep that resolves early when the caller gives up, so no timer outlives it. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/**
 * Android binds to the TTS service asynchronously and returns an empty voice list
 * until that lands, which typically happens a few hundred milliseconds after launch.
 * Without this retry the first render reports "no voices" on a perfectly healthy phone.
 */
async function listVoicesWithRetry(
  signal?: AbortSignal,
  attempts = 5,
  delayMs = 400,
): Promise<Speech.Voice[]> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) return [];
    // Both branches matter: the promise can reject, and some engines resolve with
    // nothing at all before they have finished binding.
    const result = await Speech.getAvailableVoicesAsync().catch(() => undefined);
    const voices = Array.isArray(result) ? result : [];
    if (voices.length > 0) return voices;
    if (attempt < attempts - 1) {
      await sleep(delayMs, signal);
    }
  }
  return [];
}

export const systemEngine: SpeechEngine = {
  async listVoices(signal) {
    const voices = await listVoicesWithRetry(signal);
    return rankVoices(voices.map(toSpeechVoice));
  },

  speak(text, voice, options: SpeakOptions) {
    Speech.speak(text, {
      voice: voice?.id,
      // Passing the language too matters on Android: if `voice` is stale (the user
      // uninstalled that voice data between launches), the engine falls back within
      // the language rather than to the system default, which is usually American.
      language: voice?.language ?? 'en-AU',
      rate: options.rate,
      pitch: options.pitch,
      // Inverted on purpose. `usesApplicationAudioSession = false` hands playback to a
      // system-managed session, which is the one that speaks through the silent switch
      // — the same way VoiceOver does. Leaving it true keeps speech inside our own
      // session, where the switch mutes it. Ignored on Android.
      useApplicationAudioSession: !options.overrideSilentSwitch,
      onStart: options.onStart,
      onDone: options.onDone,
      onStopped: options.onStopped,
      onError: options.onError,
    });
  },

  stop() {
    return Speech.stop();
  },

  isSpeaking() {
    return Speech.isSpeakingAsync();
  },

  maxInputLength: Speech.maxSpeechInputLength,
};
