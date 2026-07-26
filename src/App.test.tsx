import React from 'react';
import { Dimensions, Keyboard, Platform, StyleSheet, ViewStyle } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import App from './App';
import { SpeechProvider } from './speech/SpeechProvider';
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
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

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
    emit: async (event: string, payload: unknown) => {
      await act(async () => {
        for (const callback of listeners[event] ?? []) callback(payload);
      });
    },
  };
}

function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
}

const KEYBOARD_HEIGHT = 320;

/** iOS reports the keyboard's top edge in screen coordinates, not its height. */
function iosFrame() {
  return {
    endCoordinates: {
      screenY: Dimensions.get('window').height - KEYBOARD_HEIGHT,
      height: KEYBOARD_HEIGHT,
    },
  };
}

function minHeightOf(element: { props: { style?: unknown } }): number | undefined {
  const flat = StyleSheet.flatten(element.props.style as ViewStyle) as ViewStyle | undefined;
  return typeof flat?.minHeight === 'number' ? flat.minHeight : undefined;
}

describe('keyboard avoidance', () => {
  const originalOS = Platform.OS as 'ios' | 'android';

  afterEach(() => {
    jest.restoreAllMocks();
    setPlatform(originalOS);
  });

  it('hides the tab bar while the keyboard is up so the footer clears it', async () => {
    setPlatform('ios');
    const keyboard = captureKeyboard();
    const view = await render(<App />);
    await waitFor(() => expect(view.getByLabelText('Message to speak')).toBeTruthy(), {
      timeout: 5000,
    });

    // "Phrases" only exists as a tab, so it is a clean probe for the tab bar.
    expect(view.queryByLabelText('Phrases')).not.toBeNull();

    await keyboard.emit('keyboardWillChangeFrame', iosFrame());
    expect(view.queryByLabelText('Phrases')).toBeNull();
    // The Speak button must survive the reflow — it is the one control that may never
    // be hidden or pushed out of reach.
    expect(view.getByRole('button', { name: 'Speak' })).toBeTruthy();

    await keyboard.emit('keyboardWillHide', {});
    expect(view.queryByLabelText('Phrases')).not.toBeNull();
  });

  it('shrinks the Speak button vertically while the keyboard is up, on iOS', async () => {
    setPlatform('ios');
    const keyboard = captureKeyboard();
    const { engine } = fakeEngine();
    const view = await renderSpeakScreen(engine);

    expect(minHeightOf(view.getByRole('button', { name: 'Speak' }))).toBe(touchTarget.primary);

    await keyboard.emit('keyboardWillChangeFrame', iosFrame());

    const shrunk = minHeightOf(view.getByRole('button', { name: 'Speak' }));
    expect(shrunk).toBe(touchTarget.comfortable);
    expect(shrunk).toBeLessThan(touchTarget.primary);
    // Still comfortably above Android's 48dp minimum target.
    expect(shrunk as number).toBeGreaterThanOrEqual(48);

    await keyboard.emit('keyboardWillHide', {});
    expect(minHeightOf(view.getByRole('button', { name: 'Speak' }))).toBe(touchTarget.primary);
  });

  it('reacts on Android too, where the window does not resize', async () => {
    setPlatform('android');
    const keyboard = captureKeyboard();
    const { engine } = fakeEngine();
    const view = await renderSpeakScreen(engine);

    // Android reports only `keyboardDidShow`. Subscribing to the iOS events alone was
    // why the footer previously sat behind the keyboard here.
    expect(keyboard.subscribed('keyboardDidShow')).toBe(true);
    expect(minHeightOf(view.getByRole('button', { name: 'Speak' }))).toBe(touchTarget.primary);

    await keyboard.emit('keyboardDidShow', {
      endCoordinates: { height: KEYBOARD_HEIGHT },
    });
    expect(minHeightOf(view.getByRole('button', { name: 'Speak' }))).toBe(
      touchTarget.comfortable,
    );

    await keyboard.emit('keyboardDidHide', {});
    expect(minHeightOf(view.getByRole('button', { name: 'Speak' }))).toBe(touchTarget.primary);
  });
});
