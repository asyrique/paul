import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Haptics from 'expo-haptics';

import {
  DEFAULT_SETTINGS,
  Phrase,
  Settings,
  loadPhrases,
  loadSettings,
  savePhrases,
  saveSettings,
} from '../storage/store';
import { systemEngine } from './systemEngine';
import { SpeechEngine, SpeechVoice } from './types';
import { VoiceHealth, describeVoice } from './voiceRanking';

type SpeechContextValue = {
  ready: boolean;
  speaking: boolean;
  /** Set when the engine reports a failure, so the UI can say so instead of going quiet. */
  lastError: string | undefined;

  voices: SpeechVoice[];
  activeVoice: SpeechVoice | undefined;
  voiceHealth: VoiceHealth;
  refreshVoices: () => Promise<void>;

  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;

  phrases: Phrase[];
  setPhrases: (phrases: Phrase[]) => void;

  speak: (text: string) => void;
  stop: () => void;
  maxInputLength: number;
};

const SpeechContext = createContext<SpeechContextValue | undefined>(undefined);

export function useSpeech(): SpeechContextValue {
  const value = useContext(SpeechContext);
  if (!value) throw new Error('useSpeech must be used inside <SpeechProvider>');
  return value;
}

type Props = {
  children: React.ReactNode;
  /** Injectable so the engine can be swapped (bundled neural voice) or faked in tests. */
  engine?: SpeechEngine;
};

export function SpeechProvider({ children, engine = systemEngine }: Props) {
  const [ready, setReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>();
  const [voices, setVoices] = useState<SpeechVoice[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phrases, setPhrasesState] = useState<Phrase[]>([]);

  // Guards against a late onDone from an utterance the user already replaced.
  const utteranceRef = useRef(0);

  const refreshVoices = useCallback(async () => {
    const list = await engine.listVoices();
    setVoices(list);
  }, [engine]);

  useEffect(() => {
    // The voice lookup retries on a timer, so unmounting has to actually cancel it
    // rather than just ignoring the result.
    const controller = new AbortController();
    (async () => {
      const [storedSettings, storedPhrases, voiceList] = await Promise.all([
        loadSettings(),
        loadPhrases(),
        engine.listVoices(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setSettings(storedSettings);
      setPhrasesState(storedPhrases);
      setVoices(voiceList);
      setReady(true);
    })();
    return () => controller.abort();
  }, [engine]);

  // Never leave the phone talking after the app is torn down.
  useEffect(() => () => void engine.stop(), [engine]);

  const activeVoice = useMemo(() => {
    if (settings.voiceId) {
      const pinned = voices.find((voice) => voice.id === settings.voiceId);
      if (pinned) return pinned;
      // Pinned voice has since been uninstalled — fall through to the automatic pick
      // rather than leaving the app mute.
    }
    return voices[0];
  }, [voices, settings.voiceId]);

  const voiceHealth = useMemo(() => describeVoice(activeVoice), [activeVoice]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const setPhrases = useCallback((next: Phrase[]) => {
    setPhrasesState(next);
    void savePhrases(next);
  }, []);

  const stop = useCallback(() => {
    utteranceRef.current += 1;
    setSpeaking(false);
    void engine.stop();
  }, [engine]);

  const speak = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Tapping Speak twice should restart, not queue two overlapping sentences.
      utteranceRef.current += 1;
      const token = utteranceRef.current;
      void engine.stop();

      if (settings.haptics) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setLastError(undefined);
      setSpeaking(true);

      engine.speak(trimmed.slice(0, engine.maxInputLength), activeVoice, {
        rate: settings.rate,
        pitch: settings.pitch,
        overrideSilentSwitch: settings.speakOverSilentSwitch,
        onDone: () => {
          if (utteranceRef.current === token) setSpeaking(false);
        },
        onStopped: () => {
          if (utteranceRef.current === token) setSpeaking(false);
        },
        onError: (error) => {
          if (utteranceRef.current !== token) return;
          setSpeaking(false);
          setLastError(
            error?.message ??
              'Your phone could not speak that. Check the voice in Settings.',
          );
        },
      });
    },
    [
      engine,
      activeVoice,
      settings.rate,
      settings.pitch,
      settings.haptics,
      settings.speakOverSilentSwitch,
    ],
  );

  const value = useMemo<SpeechContextValue>(
    () => ({
      ready,
      speaking,
      lastError,
      voices,
      activeVoice,
      voiceHealth,
      refreshVoices,
      settings,
      updateSettings,
      phrases,
      setPhrases,
      speak,
      stop,
      maxInputLength: engine.maxInputLength,
    }),
    [
      ready,
      speaking,
      lastError,
      voices,
      activeVoice,
      voiceHealth,
      refreshVoices,
      settings,
      updateSettings,
      phrases,
      setPhrases,
      speak,
      stop,
      engine.maxInputLength,
    ],
  );

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}
