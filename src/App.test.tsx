import React from 'react';
import { Keyboard, Platform, StyleSheet, ViewStyle } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import App from './App';
import { SpeechProvider } from './speech/SpeechProvider';
import { SettingsScreen } from './screens/SettingsScreen';
import { SpeakScreen } from './screens/SpeakScreen';
import { SpeechEngine, SpeechVoice } from './speech/types';
import { touchTarget } from './ui/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  // Has to be require(): jest.mock factories are hoisted above the import statements.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Without real window metrics the provider renders an empty tree under the test renderer.
jest.mock('react-native-safe-area-context', () => {
  // Realistic, non-zero insets: a zero bottom inset would hide any mistake in how the
  // navigation-bar strip under the keyboard is handled. Exposed on the mock so the
  // assertions read the same object rather than repeating the numbers.
  const insets = { top: 44, right: 0, bottom: 34, left: 0 };
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => insets,
    __mockInsets: insets,
  };
});

const INSETS = (
  jest.requireMock('react-native-safe-area-context') as { __mockInsets: { bottom: number } }
).__mockInsets;

const AU_OFFLINE: SpeechVoice = {
  id: 'en-au-x-aua-local',
  name: 'English (Australia)',
  language: 'en-AU',
  isAustralian: true,
  offline: 'offline',
  enhanced: false,
};

const US_NETWORK: SpeechVoice = {
  id: 'en-us-x-sfg-network',
  name: 'English (United States)',
  language: 'en-US',
  isAustralian: false,
  offline: 'network',
  enhanced: false,
};

function fakeEngine(voices: SpeechVoice[] = [AU_OFFLINE]) {
  const speak = jest.fn<void, Parameters<SpeechEngine['speak']>>();
  const stop = jest.fn().mockResolvedValue(undefined);
  const engine: SpeechEngine = {
    listVoices: jest.fn().mockResolvedValue(voices),
    speak,
    stop,
    isSpeaking: jest.fn().mockResolvedValue(false),
    maxInputLength: 4000,
  };
  return { engine, speak, stop };
}

function renderSpeakScreen(engine: SpeechEngine) {
  return render(
    <SpeechProvider engine={engine}>
      <SpeakScreen onOpenSettings={jest.fn()} />
    </SpeechProvider>,
  );
}

describe('App', () => {
  it('renders without crashing and lands on the Speak tab', async () => {
    const view = await render(<App />);
    // The real engine retries the voice lookup for up to ~2s before giving up, which
    // is longer than waitFor's default budget.
    await waitFor(() => expect(view.getByLabelText('Message to speak')).toBeTruthy(), {
      timeout: 5000,
    });
  });

  it('exposes all three tabs to a screen reader', async () => {
    const view = await render(<App />);
    for (const label of ['Speak', 'Phrases', 'Settings']) {
      expect(view.getAllByLabelText(label).length).toBeGreaterThan(0);
    }
  });
});

describe('SpeakScreen', () => {
  it('keeps Speak disabled until there is something to say', async () => {
    const { engine } = fakeEngine();
    const view = await renderSpeakScreen(engine);

    expect(view.getByRole('button', { name: 'Speak' })).toBeDisabled();

    await fireEvent.changeText(view.getByLabelText('Message to speak'), 'Hello there');
    expect(view.getByRole('button', { name: 'Speak' })).toBeEnabled();
  });

  it('speaks the typed text, trimmed, with the chosen voice', async () => {
    const { engine, speak } = fakeEngine();
    const view = await renderSpeakScreen(engine);

    await fireEvent.changeText(view.getByLabelText('Message to speak'), '  Hello there  ');
    await fireEvent.press(view.getByRole('button', { name: 'Speak' }));

    expect(speak).toHaveBeenCalledTimes(1);
    const [text, voice] = speak.mock.calls[0];
    expect(text).toBe('Hello there');
    expect(voice?.id).toBe(AU_OFFLINE.id);
  });

  it('swaps Speak for Stop while talking, and stops on tap', async () => {
    const { engine, stop } = fakeEngine();
    const view = await renderSpeakScreen(engine);

    await fireEvent.changeText(view.getByLabelText('Message to speak'), 'Hello');
    await fireEvent.press(view.getByRole('button', { name: 'Speak' }));

    const stopButton = await view.findByRole('button', { name: 'Stop talking' });
    expect(view.queryByRole('button', { name: 'Speak' })).toBeNull();

    await fireEvent.press(stopButton);
    expect(stop).toHaveBeenCalled();
    await waitFor(() => expect(view.getByRole('button', { name: 'Speak' })).toBeTruthy());
  });

  it('warns in plain words when the only voice needs the internet', async () => {
    const { engine } = fakeEngine([US_NETWORK]);
    const view = await renderSpeakScreen(engine);

    expect(await view.findByText('Voice needs internet')).toBeTruthy();
  });

  it('shows no warning banner when an offline Australian voice is available', async () => {
    const { engine } = fakeEngine([AU_OFFLINE]);
    const view = await renderSpeakScreen(engine);

    expect(view.queryByText('Voice needs internet')).toBeNull();
    expect(view.queryByText('Not an Australian voice')).toBeNull();
  });

  it('stops the previous utterance before starting a new one', async () => {
    const { engine, speak, stop } = fakeEngine();
    const view = await renderSpeakScreen(engine);

    await fireEvent.changeText(view.getByLabelText('Message to speak'), 'Hello');
    await fireEvent.press(view.getByRole('button', { name: 'Speak' }));
    await fireEvent.press(view.getByRole('button', { name: 'Stop talking' }));
    await fireEvent.press(view.getByRole('button', { name: 'Speak' }));

    expect(speak).toHaveBeenCalledTimes(2);
    // Every speak() is preceded by a stop(), so two utterances can never overlap.
    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Keyboard avoidance is a device-visual behaviour, so it is pinned down here rather
 * than left to manual checking. Capturing the listeners lets us drive the exact events
 * each platform emits.
 *
 * Listeners are kept per event *as a list*: both the app shell and the Speak screen
 * subscribe, and React Native delivers to every subscriber.
 */
function captureKeyboard() {
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  jest
    .spyOn(Keyboard, 'addListener')
    .mockImplementation(((event: string, callback: (event: unknown) => void) => {
      listeners[event] = [...(listeners[event] ?? []), callback];
      return {
        remove: () => {
          listeners[event] = (listeners[event] ?? []).filter((entry) => entry !== callback);
        },
      };
    }) as unknown as typeof Keyboard.addListener);

  return {
    subscribed: (event: string) => (listeners[event]?.length ?? 0) > 0,
    emit: async (event: string) => {
      await act(async () => {
        for (const callback of listeners[event] ?? []) callback({});
      });
    },
  };
}

function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
}

const EVENTS = {
  ios: { show: 'keyboardWillShow', hide: 'keyboardWillHide' },
  android: { show: 'keyboardDidShow', hide: 'keyboardDidHide' },
} as const;

function flatten(element: { props: { style?: unknown } }): ViewStyle {
  return (StyleSheet.flatten(element.props.style as ViewStyle) ?? {}) as ViewStyle;
}

describe.each(['ios', 'android'] as const)('keyboard avoidance (%s)', (os) => {
  const originalOS = Platform.OS as 'ios' | 'android';
  const { show, hide } = EVENTS[os];

  afterEach(() => {
    jest.restoreAllMocks();
    setPlatform(originalOS);
  });

  it('subscribes to the events this platform actually emits', async () => {
    setPlatform(os);
    const keyboard = captureKeyboard();
    await renderSpeakScreen(fakeEngine().engine);

    // Android reports only the "did" events. Listening for the iOS ones alone was why
    // the footer previously sat behind the keyboard there.
    expect(keyboard.subscribed(show)).toBe(true);
    expect(keyboard.subscribed(hide)).toBe(true);
  });

  it('shrinks the Speak button vertically while the keyboard is up, then restores it', async () => {
    setPlatform(os);
    const keyboard = captureKeyboard();
    const view = await renderSpeakScreen(fakeEngine().engine);

    expect(flatten(view.getByRole('button', { name: 'Speak' })).minHeight).toBe(
      touchTarget.primary,
    );

    await keyboard.emit(show);
    const shrunk = flatten(view.getByRole('button', { name: 'Speak' })).minHeight;
    expect(shrunk).toBe(touchTarget.comfortable);
    expect(shrunk as number).toBeLessThan(touchTarget.primary);
    // Still comfortably above Android's 48dp minimum target.
    expect(shrunk as number).toBeGreaterThanOrEqual(48);

    await keyboard.emit(hide);
    expect(flatten(view.getByRole('button', { name: 'Speak' })).minHeight).toBe(
      touchTarget.primary,
    );
  });

  it('hides the tab bar while the keyboard is up, keeping Speak reachable', async () => {
    setPlatform(os);
    const keyboard = captureKeyboard();
    const view = await render(<App />);
    await waitFor(() => expect(view.getByLabelText('Message to speak')).toBeTruthy(), {
      timeout: 5000,
    });

    // "Phrases" only exists as a tab, so it is a clean probe for the tab bar.
    expect(view.queryByLabelText('Phrases')).not.toBeNull();

    await keyboard.emit(show);
    expect(view.queryByLabelText('Phrases')).toBeNull();
    // The Speak button must survive the reflow — it is the one control that may never
    // be hidden or pushed out of reach.
    expect(view.getByRole('button', { name: 'Speak' })).toBeTruthy();

    await keyboard.emit(hide);
    expect(view.queryByLabelText('Phrases')).not.toBeNull();
  });

  it('never reserves keyboard space itself — KeyboardAvoidingView owns that', async () => {
    setPlatform(os);
    const keyboard = captureKeyboard();
    const view = await render(<App />);
    await waitFor(() => expect(view.getByLabelText('Message to speak')).toBeTruthy(), {
      timeout: 5000,
    });

    const rootPaddingBottom = () => {
      const root = view.getByRole('header').parent?.parent;
      return flatten(root as { props: { style?: unknown } }).paddingBottom ?? 0;
    };

    expect(rootPaddingBottom()).toBe(0);

    await keyboard.emit(show);

    /*
      Zero on both platforms, and the history here is the reason this test exists.

      KeyboardAvoidingView pads by its own bottom edge minus the keyboard's top, in screen
      coordinates, which self-corrects whether or not the window resized for the IME. Every
      attempt to help it along has broken a real device: padding by the whole keyboard
      height threw the Speak button a keyboard-height too high, padding by nothing clipped
      it by the navigation-bar strip, and padding by insets.bottom — correct in Expo Go,
      which resizes — hid the button entirely in a prebuilt edge-to-edge build, which does
      not.

      So nothing here may reserve keyboard-sized space of its own. It reports 0 during
      tests because KeyboardAvoidingView's own subscription goes through the mocked
      addListener; the assertion is that no *other* code has added to it. INSETS.bottom is
      deliberately non-zero so a stray safe-area inset would show up.
    */
    expect(INSETS.bottom).toBeGreaterThan(0);
    expect(rootPaddingBottom()).toBe(0);

    await keyboard.emit(hide);
    expect(rootPaddingBottom()).toBe(0);
  });
});

function renderSettings(engine: SpeechEngine) {
  return render(
    <SpeechProvider engine={engine}>
      <SettingsScreen />
    </SpeechProvider>,
  );
}

const SILENT_SWITCH_LABEL = 'Speak even on silent';

describe('speaking through the silent switch', () => {
  const originalOS = Platform.OS as 'ios' | 'android';

  afterEach(() => {
    setPlatform(originalOS);
  });

  function optionsOfFirstSpeak(speak: jest.Mock) {
    return speak.mock.calls[0][2] as { overrideSilentSwitch: boolean };
  }

  it('asks to override the silent switch by default', async () => {
    setPlatform('ios');
    const { engine, speak } = fakeEngine();
    const view = await renderSettings(engine);

    await fireEvent.press(view.getByRole('button', { name: 'Try it' }));

    // systemEngine turns this into `useApplicationAudioSession: false`, the system-managed
    // session that speaks through the switch.
    expect(optionsOfFirstSpeak(speak as unknown as jest.Mock).overrideSilentSwitch).toBe(true);
  });

  it('stops overriding it once the setting is turned off', async () => {
    setPlatform('ios');
    const { engine, speak } = fakeEngine();
    const view = await renderSettings(engine);

    await fireEvent(view.getByLabelText(SILENT_SWITCH_LABEL), 'valueChange', false);
    await fireEvent.press(view.getByRole('button', { name: 'Try it' }));

    expect(optionsOfFirstSpeak(speak as unknown as jest.Mock).overrideSilentSwitch).toBe(false);
  });

  it('offers the setting on iOS', async () => {
    setPlatform('ios');
    const view = await renderSettings(fakeEngine().engine);
    expect(view.queryByLabelText(SILENT_SWITCH_LABEL)).not.toBeNull();
  });

  it('hides the setting on Android, which has no equivalent lever', async () => {
    setPlatform('android');
    const view = await renderSettings(fakeEngine().engine);

    // Android text-to-speech already plays on the media stream and exposes nothing to
    // change, so a toggle here would do nothing at all.
    expect(view.queryByLabelText(SILENT_SWITCH_LABEL)).toBeNull();
    // The rest of the section still renders.
    expect(view.queryByLabelText('Vibrate when I tap')).not.toBeNull();
  });
});

describe('the voice list stays small', () => {
  /**
   * A Samsung with Google's engine reports hundreds of voices. Rendering a row for each
   * one blocked the JS thread for seconds whenever Settings opened, so the screen must
   * only ever build a handful.
   */
  const MANY_VOICES: SpeechVoice[] = [
    AU_OFFLINE,
    ...Array.from({ length: 200 }, (_, index) => ({
      id: `filler-${index}`,
      name: `Filler voice ${index}`,
      language: 'en-US',
      isAustralian: false,
      offline: 'unknown' as const,
      enhanced: false,
    })),
    {
      id: 'fr-fr-x-frb-local',
      name: 'fr-fr-x-frb-local',
      language: 'fr-FR',
      isAustralian: false,
      offline: 'offline' as const,
      enhanced: false,
    },
  ];

  it('renders only a shortlist, not every voice on the phone', async () => {
    const view = await renderSettings(fakeEngine(MANY_VOICES).engine);

    // The best voice is there; a voice from deep in the list is not.
    expect(view.queryByLabelText(/English \(Australia\)/)).not.toBeNull();
    expect(view.queryByLabelText(/Filler voice 150/)).toBeNull();
    expect(view.queryByLabelText(/fr-fr-x-frb-local/)).toBeNull();
  });

  it('says how many voices it is hiding rather than truncating silently', async () => {
    const view = await renderSettings(fakeEngine(MANY_VOICES).engine);
    expect(view.queryByText(/of 202 voices on this phone/)).not.toBeNull();
  });

  it('reaches the rest through search', async () => {
    const view = await renderSettings(fakeEngine(MANY_VOICES).engine);

    // "french" appears nowhere in that voice's name — it is matched via the language tag.
    await fireEvent.changeText(view.getByLabelText('Search voices'), 'french');

    expect(view.queryByLabelText(/fr-fr-x-frb-local/)).not.toBeNull();
    expect(view.queryByLabelText(/English \(Australia\)/)).toBeNull();
  });

  it('explains an empty search instead of showing a blank list', async () => {
    const view = await renderSettings(fakeEngine(MANY_VOICES).engine);

    await fireEvent.changeText(view.getByLabelText('Search voices'), 'klingon');

    expect(view.queryByText(/No voices match/)).not.toBeNull();
  });

  it('caps broad search results so a single letter cannot rebuild the slow list', async () => {
    const view = await renderSettings(fakeEngine(MANY_VOICES).engine);

    await fireEvent.changeText(view.getByLabelText('Search voices'), 'e');

    expect(view.queryByText(/Keep typing to narrow it down/)).not.toBeNull();
    expect(view.queryByLabelText(/Filler voice 150/)).toBeNull();
  });

  it('offers no search box when every voice already fits', async () => {
    const view = await renderSettings(fakeEngine([AU_OFFLINE, US_NETWORK]).engine);
    expect(view.queryByLabelText('Search voices')).toBeNull();
  });
});
