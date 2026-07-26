import { SpeechVoice } from './types';
import {
  VOICE_SHORTLIST_SIZE,
  describeLanguage,
  filterVoices,
  shortlistVoices,
  voiceSearchText,
} from './voiceSearch';

function voice(partial: Partial<SpeechVoice> & Pick<SpeechVoice, 'id'>): SpeechVoice {
  const language = partial.language ?? 'en-US';
  return {
    name: partial.id,
    language,
    isAustralian: language.toLowerCase() === 'en-AU'.toLowerCase(),
    offline: 'unknown',
    enhanced: false,
    ...partial,
  };
}

describe('describeLanguage', () => {
  it('names the English variants a user might pick between', () => {
    expect(describeLanguage('en-AU')).toBe('Australian English');
    expect(describeLanguage('en-NZ')).toBe('New Zealand English');
    expect(describeLanguage('en-GB')).toBe('British English');
  });

  it('is case-insensitive about the tag', () => {
    expect(describeLanguage('EN-au')).toBe('Australian English');
  });

  it('falls back to the base language when the region is unknown', () => {
    expect(describeLanguage('fr-CA')).toBe('French');
    expect(describeLanguage('de')).toBe('German');
  });

  it('returns the tag itself when it recognises nothing', () => {
    expect(describeLanguage('xx-YY')).toBe('xx-YY');
  });
});

describe('voiceSearchText', () => {
  it('includes the words a person would actually type', () => {
    const text = voiceSearchText(
      voice({ id: 'en-au-x-aua-local', language: 'en-AU', offline: 'offline' }),
    );
    // The engine's own name says none of these.
    expect(text).toContain('australian');
    expect(text).toContain('offline');
    expect(text).toContain('en-au');
  });

  it('describes a network voice in terms of needing the internet', () => {
    const text = voiceSearchText(voice({ id: 'v', language: 'en-US', offline: 'network' }));
    expect(text).toContain('internet');
  });
});

describe('filterVoices', () => {
  const voices = [
    voice({ id: 'en-au-x-aua-local', language: 'en-AU', offline: 'offline' }),
    voice({ id: 'en-au-x-aub-network', language: 'en-AU', offline: 'network' }),
    voice({ id: 'en-gb-x-gba-local', language: 'en-GB', offline: 'offline' }),
    voice({ id: 'fr-fr-x-frb-local', language: 'fr-FR', offline: 'offline' }),
  ];

  it('returns everything for an empty query', () => {
    expect(filterVoices(voices, '   ')).toHaveLength(4);
  });

  it('finds Australian voices by the word "australian"', () => {
    // Nothing in these identifiers contains "australian".
    expect(filterVoices(voices, 'australian').map((entry) => entry.id)).toEqual([
      'en-au-x-aua-local',
      'en-au-x-aub-network',
    ]);
  });

  it('finds a language by its friendly name', () => {
    expect(filterVoices(voices, 'french').map((entry) => entry.id)).toEqual([
      'fr-fr-x-frb-local',
    ]);
  });

  it('narrows on every term rather than widening', () => {
    expect(filterVoices(voices, 'australian offline').map((entry) => entry.id)).toEqual([
      'en-au-x-aua-local',
    ]);
  });

  it('ignores term order and case', () => {
    expect(filterVoices(voices, 'OFFLINE Australian').map((entry) => entry.id)).toEqual([
      'en-au-x-aua-local',
    ]);
  });

  it('matches the raw engine name too', () => {
    expect(filterVoices(voices, 'aub').map((entry) => entry.id)).toEqual([
      'en-au-x-aub-network',
    ]);
  });

  it('returns nothing when there is no match', () => {
    expect(filterVoices(voices, 'klingon')).toHaveLength(0);
  });
});

describe('shortlistVoices', () => {
  const many = Array.from({ length: 40 }, (_, index) =>
    voice({ id: `v${index}`, language: index === 0 ? 'en-AU' : 'en-US' }),
  );

  it('caps the list to the shortlist size', () => {
    expect(shortlistVoices(many, undefined)).toHaveLength(VOICE_SHORTLIST_SIZE);
  });

  it('keeps the ranked order', () => {
    expect(shortlistVoices(many, undefined)[0].id).toBe('v0');
  });

  it('adds the pinned voice when it falls outside the shortlist', () => {
    // Otherwise someone who chose the 30th voice opens Settings and sees nothing selected.
    const result = shortlistVoices(many, 'v30');
    expect(result).toHaveLength(VOICE_SHORTLIST_SIZE + 1);
    expect(result.map((entry) => entry.id)).toContain('v30');
  });

  it('does not duplicate a pinned voice already in the shortlist', () => {
    const result = shortlistVoices(many, 'v1');
    expect(result).toHaveLength(VOICE_SHORTLIST_SIZE);
    expect(result.filter((entry) => entry.id === 'v1')).toHaveLength(1);
  });

  it('ignores a pinned voice that no longer exists', () => {
    // The user uninstalled that voice data between launches.
    expect(shortlistVoices(many, 'gone')).toHaveLength(VOICE_SHORTLIST_SIZE);
  });

  it('handles a list shorter than the shortlist', () => {
    expect(shortlistVoices(many.slice(0, 2), undefined)).toHaveLength(2);
  });
});
