import { SpeechVoice } from './types';
import {
  describeVoice,
  detectOfflineStatus,
  normaliseLanguage,
  rankVoices,
} from './voiceRanking';

function voice(partial: Partial<SpeechVoice> & Pick<SpeechVoice, 'id'>): SpeechVoice {
  const language = partial.language ?? 'en-US';
  return {
    name: partial.id,
    language,
    isAustralian: language.toLowerCase() === 'en-au',
    offline: 'unknown',
    enhanced: false,
    ...partial,
  };
}

describe('normaliseLanguage', () => {
  it('converts the Android underscore form to BCP 47', () => {
    expect(normaliseLanguage('en_AU')).toBe('en-AU');
  });

  it('canonicalises case', () => {
    expect(normaliseLanguage('EN-au')).toBe('en-AU');
  });

  it('leaves an already-canonical tag alone', () => {
    expect(normaliseLanguage('en-AU')).toBe('en-AU');
  });

  it('handles a bare language with no region', () => {
    expect(normaliseLanguage('en')).toBe('en');
  });
});

describe('detectOfflineStatus', () => {
  it('reads the Google Android local suffix', () => {
    expect(detectOfflineStatus('en-au-x-aua-local', 'English Australia')).toBe('offline');
  });

  it('reads the Google Android network suffix', () => {
    expect(detectOfflineStatus('en-au-x-aua-network', 'English Australia')).toBe('network');
  });

  it('admits ignorance for an iOS style identifier', () => {
    expect(
      detectOfflineStatus('com.apple.voice.compact.en-AU.Karen', 'Karen'),
    ).toBe('unknown');
  });

  it('does not treat a substring match as a signal', () => {
    // "Localina" contains "local" but is not the -local suffix.
    expect(detectOfflineStatus('en-au-x-localina', 'Localina')).toBe('unknown');
  });
});

describe('rankVoices', () => {
  it('puts an offline Australian voice first', () => {
    const ranked = rankVoices([
      voice({ id: 'us-local', language: 'en-US', offline: 'offline' }),
      voice({ id: 'au-network', language: 'en-AU', offline: 'network' }),
      voice({ id: 'au-local', language: 'en-AU', offline: 'offline' }),
    ]);
    expect(ranked[0].id).toBe('au-local');
  });

  it('prefers a network Australian voice over a local American one', () => {
    // Accent is the stronger signal: an Australian user would rather hear an
    // Australian voice and be told it needs wi-fi than get an American one silently.
    const ranked = rankVoices([
      voice({ id: 'us-local', language: 'en-US', offline: 'offline' }),
      voice({ id: 'au-network', language: 'en-AU', offline: 'network' }),
    ]);
    expect(ranked[0].id).toBe('au-network');
  });

  it('falls back to New Zealand before Britain', () => {
    const ranked = rankVoices([
      voice({ id: 'gb', language: 'en-GB' }),
      voice({ id: 'nz', language: 'en-NZ' }),
      voice({ id: 'fr', language: 'fr-FR' }),
    ]);
    expect(ranked.map((entry) => entry.id)).toEqual(['nz', 'gb', 'fr']);
  });

  it('prefers an offline voice over an enhanced network one at equal language', () => {
    const ranked = rankVoices([
      voice({ id: 'au-enhanced-network', language: 'en-AU', offline: 'network', enhanced: true }),
      voice({ id: 'au-plain-local', language: 'en-AU', offline: 'offline' }),
    ]);
    expect(ranked[0].id).toBe('au-plain-local');
  });

  it('is stable for identically scored voices', () => {
    const input = [voice({ id: 'b', language: 'en-AU' }), voice({ id: 'a', language: 'en-AU' })];
    expect(rankVoices(input).map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(rankVoices([...input].reverse()).map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const input = [voice({ id: 'us', language: 'en-US' }), voice({ id: 'au', language: 'en-AU' })];
    rankVoices(input);
    expect(input.map((entry) => entry.id)).toEqual(['us', 'au']);
  });
});

describe('describeVoice', () => {
  it('reports a healthy offline Australian voice as good', () => {
    const health = describeVoice(voice({ id: 'au', language: 'en-AU', offline: 'offline' }));
    expect(health.level).toBe('good');
  });

  it('warns when the Australian voice needs the network', () => {
    const health = describeVoice(voice({ id: 'au', language: 'en-AU', offline: 'network' }));
    expect(health.level).toBe('warn');
  });

  it('flags a non-Australian network voice as bad', () => {
    const health = describeVoice(voice({ id: 'us', language: 'en-US', offline: 'network' }));
    expect(health.level).toBe('bad');
  });

  it('flags a missing voice as bad', () => {
    expect(describeVoice(undefined).level).toBe('bad');
  });
});
