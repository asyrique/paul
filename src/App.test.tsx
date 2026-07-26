import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import App from './App';
import { SpeechProvider } from './speech/SpeechProvider';
import { SpeakScreen } from './screens/SpeakScreen';
import { SpeechEngine, SpeechVoice } from './speech/types';

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
