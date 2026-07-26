import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Everything the app remembers lives on the device. There is no account, no sync and
 * no network call anywhere in this app.
 */

const KEYS = {
  settings: 'sayit.settings.v1',
  phrases: 'sayit.phrases.v1',
} as const;

export type Settings = {
  /** Multiplier passed straight to the TTS engine. 1.0 is the engine's normal pace. */
  rate: number;
  pitch: number;
  /** Voice the user pinned in Settings. Undefined means "let the app pick the best one". */
  voiceId?: string;
  /** Vibrate on button presses. Some users find it reassuring, others find it startling. */
  haptics: boolean;
  /** Speak the text as soon as the keyboard's done/return key is pressed. */
  speakOnDone: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  rate: 0.9,
  pitch: 1.0,
  voiceId: undefined,
  haptics: true,
  speakOnDone: true,
};

export type Phrase = {
  id: string;
  text: string;
};

export const DEFAULT_PHRASES: Phrase[] = [
  { id: 'p1', text: 'Hello, how are you?' },
  { id: 'p2', text: 'Yes, please.' },
  { id: 'p3', text: 'No, thank you.' },
  { id: 'p4', text: 'Could you say that again, please?' },
  { id: 'p5', text: 'I need some help.' },
  { id: 'p6', text: 'Just a moment, please.' },
];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // A corrupt value should never stop the app from talking. Fall back and move on.
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Losing a preference is survivable; crashing mid-sentence is not.
  }
}

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: Settings): Promise<void> {
  return writeJson(KEYS.settings, settings);
}

export function loadPhrases(): Promise<Phrase[]> {
  return readJson<Phrase[]>(KEYS.phrases, DEFAULT_PHRASES);
}

export function savePhrases(phrases: Phrase[]): Promise<void> {
  return writeJson(KEYS.phrases, phrases);
}

let phraseCounter = 0;
export function newPhraseId(): string {
  phraseCounter += 1;
  return `p${Date.now().toString(36)}${phraseCounter}`;
}
