import { SpeechVoice } from './types';

/**
 * Narrowing a phone's voice list down to something a person can actually look at.
 *
 * Google's engine on a Samsung reports several hundred voices. Rendering them all costs
 * seconds of blocked JS, and no one scrolls a 400-row radio list anyway — so the screen
 * shows a short, already-ranked list and lets search reach the rest.
 */

/** How many voices the list shows before the user searches. */
export const VOICE_SHORTLIST_SIZE = 6;

/** Cap on search results, so a broad query can never rebuild the slow list. */
export const VOICE_SEARCH_LIMIT = 20;

/**
 * Friendly names for the language tags a voice list actually contains. Android reports
 * names like `en-au-x-aua-local`, which tells an older user nothing and cannot be
 * searched for by the word they would think of ("australian").
 *
 * `Intl.DisplayNames` would cover this generically but is not dependable on Hermes, so
 * this is a plain table: every English variant, then the common base languages.
 */
const REGIONAL_NAMES: Record<string, string> = {
  'en-au': 'Australian English',
  'en-nz': 'New Zealand English',
  'en-gb': 'British English',
  'en-ie': 'Irish English',
  'en-us': 'American English',
  'en-ca': 'Canadian English',
  'en-in': 'Indian English',
  'en-za': 'South African English',
  'en-sg': 'Singapore English',
  'en-ph': 'Philippine English',
  'en-ng': 'Nigerian English',
  'en-ke': 'Kenyan English',
};

const BASE_NAMES: Record<string, string> = {
  en: 'English',
  ar: 'Arabic',
  bn: 'Bengali',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  es: 'Spanish',
  fa: 'Persian',
  fi: 'Finnish',
  fil: 'Filipino',
  fr: 'French',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  ms: 'Malay',
  nb: 'Norwegian',
  nl: 'Dutch',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sv: 'Swedish',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  vi: 'Vietnamese',
  zh: 'Chinese',
};

/** A human-readable name for a BCP 47 tag, falling back to the tag itself. */
export function describeLanguage(tag: string): string {
  const lower = tag.toLowerCase();
  const regional = REGIONAL_NAMES[lower];
  if (regional) return regional;
  const base = BASE_NAMES[lower.split('-')[0]];
  return base ?? tag;
}

/**
 * Everything a voice can be found by. Includes the words a person would reach for
 * ("australian", "offline") rather than only what the engine calls the voice.
 */
export function voiceSearchText(voice: SpeechVoice): string {
  const parts = [voice.name, voice.language, describeLanguage(voice.language)];
  if (voice.isAustralian) parts.push('australian aussie');
  if (voice.offline === 'offline') parts.push('offline local');
  if (voice.offline === 'network') parts.push('online internet network');
  if (voice.enhanced) parts.push('enhanced high quality');
  return parts.join(' ').toLowerCase();
}

/**
 * Filters on every whitespace-separated term, so "australian offline" narrows rather
 * than widening. Order-independent, since nobody guesses the engine's word order.
 */
export function filterVoices(voices: SpeechVoice[], query: string): SpeechVoice[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return voices;
  return voices.filter((voice) => {
    const haystack = voiceSearchText(voice);
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * The default short list: the top of the ranked order, plus the user's own pick if it
 * has fallen outside it. Without that, someone who chose the 200th voice would open
 * Settings and see nothing selected.
 */
export function shortlistVoices(
  voices: SpeechVoice[],
  selectedId: string | undefined,
  size: number = VOICE_SHORTLIST_SIZE,
): SpeechVoice[] {
  const head = voices.slice(0, size);
  if (!selectedId || head.some((voice) => voice.id === selectedId)) return head;
  const selected = voices.find((voice) => voice.id === selectedId);
  return selected ? [...head, selected] : head;
}
