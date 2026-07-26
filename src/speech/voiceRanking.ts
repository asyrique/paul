import { SpeechVoice, VoiceOfflineStatus } from './types';

/**
 * Turning a raw platform voice list into "the best Australian voice that will still
 * work on a plane" is fiddly enough to deserve its own file, and it is the one piece
 * of logic here that is worth unit testing.
 */

/** Android reports `en_AU`; iOS reports `en-AU`. Normalise to `en-AU`. */
export function normaliseLanguage(raw: string): string {
  const parts = raw.replace(/_/g, '-').split('-');
  if (parts.length === 0) return raw;
  const [language, ...rest] = parts;
  const region = rest.pop();
  const normalisedRest = rest.map((part) => part.toLowerCase());
  return [language.toLowerCase(), ...normalisedRest, region?.toUpperCase()]
    .filter(Boolean)
    .join('-');
}

/**
 * Google's Android TTS engine names its voices `en-au-x-aua-local` and
 * `en-au-x-aua-network`. That suffix is the only reliable offline signal any platform
 * gives us — expo-speech does not surface Android's `Voice.isNetworkConnectionRequired`
 * — so we read it off the identifier and admit ignorance otherwise.
 */
export function detectOfflineStatus(identifier: string, name: string): VoiceOfflineStatus {
  const haystack = `${identifier} ${name}`.toLowerCase();
  // The delimiter classes must include whitespace: we search the identifier and the
  // display name joined by a space, so a trailing `-local` sits before a space, not
  // at end-of-string.
  if (/(^|[-_#\s])network([-_#\s]|$)/.test(haystack)) return 'network';
  if (/(^|[-_#\s])local([-_#\s]|$)/.test(haystack)) return 'offline';
  return 'unknown';
}

/**
 * Preference order, most to least wanted:
 *   en-AU  >  en-NZ  >  en-GB  >  en-IE  >  any other English  >  everything else
 *
 * New Zealand sits above British because it is the closest-sounding fallback to an
 * Australian ear, and it is far more likely than en-IE to be present on a Samsung.
 */
function languageScore(language: string): number {
  const lower = language.toLowerCase();
  if (lower === 'en-au') return 6000;
  if (lower === 'en-nz') return 5000;
  if (lower === 'en-gb') return 4000;
  if (lower === 'en-ie') return 3000;
  if (lower.startsWith('en')) return 2000;
  return 0;
}

function offlineScore(offline: VoiceOfflineStatus): number {
  switch (offline) {
    // A guaranteed-offline voice beats a nicer-sounding one that dies without wi-fi.
    case 'offline':
      return 800;
    case 'unknown':
      return 400;
    case 'network':
      return 0;
  }
}

export function scoreVoice(voice: SpeechVoice): number {
  return (
    languageScore(voice.language) + offlineScore(voice.offline) + (voice.enhanced ? 100 : 0)
  );
}

/** Sorts best-first. Ties break on identifier so the chosen voice is stable across launches. */
export function rankVoices(voices: SpeechVoice[]): SpeechVoice[] {
  return [...voices].sort((a, b) => {
    const delta = scoreVoice(b) - scoreVoice(a);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}

/**
 * What we tell the user about the voice we ended up with. Deliberately blunt: an
 * older user needs to know "this will stop working on the plane" in those words, not
 * as a yellow dot.
 */
export type VoiceHealth = {
  level: 'good' | 'warn' | 'bad';
  headline: string;
  detail: string;
};

export function describeVoice(voice: SpeechVoice | undefined): VoiceHealth {
  if (!voice) {
    return {
      level: 'bad',
      headline: 'No voice found yet',
      detail:
        'Your phone has not reported any speech voices. Tap "Fix the voice" below to open your phone\'s speech settings.',
    };
  }

  if (voice.isAustralian && voice.offline !== 'network') {
    return {
      level: 'good',
      headline: 'Australian voice ready',
      detail:
        voice.offline === 'offline'
          ? `Using ${voice.name}. It is stored on your phone, so it works with no internet.`
          : `Using ${voice.name}. It should work with no internet.`,
    };
  }

  if (voice.isAustralian && voice.offline === 'network') {
    return {
      level: 'warn',
      headline: 'Australian voice needs internet',
      detail: `Using ${voice.name}, but this voice is downloaded from the internet each time. Tap "Fix the voice" to install the offline Australian voice.`,
    };
  }

  if (voice.offline === 'network') {
    return {
      level: 'bad',
      headline: 'Voice needs internet',
      detail: `Using ${voice.name} (${voice.language}). It is not Australian and it will not work without internet. Tap "Fix the voice" below.`,
    };
  }

  return {
    level: 'warn',
    headline: 'Not an Australian voice',
    detail: `Using ${voice.name} (${voice.language}). It will still speak, but it will not sound Australian. Tap "Fix the voice" to add the Australian voice.`,
  };
}
