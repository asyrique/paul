import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useSpeech } from '../speech/SpeechProvider';
import { openTtsSettings } from '../speech/openTtsSettings';
import { SpeechVoice } from '../speech/types';
import {
  VOICE_SEARCH_LIMIT,
  VOICE_SHORTLIST_SIZE,
  describeLanguage,
  filterVoices,
  shortlistVoices,
} from '../speech/voiceSearch';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Section, SelectRow, Separator, SwitchRow } from '../ui/List';
import { Text } from '../ui/Text';
import {
  MAX_FONT_SCALE,
  colors,
  fontSize,
  isIOS,
  lineHeight,
  radius,
  spacing,
  touchTarget,
} from '../ui/theme';

const SAMPLE = 'G’day. This is how I will sound.';

const RATES = [
  { label: 'Very slow', value: 0.6 },
  { label: 'Slow', value: 0.75 },
  { label: 'Relaxed', value: 0.9 },
  { label: 'Normal', value: 1.0 },
  { label: 'Fast', value: 1.2 },
] as const;

export function SettingsScreen() {
  const {
    settings,
    updateSettings,
    voices,
    activeVoice,
    voiceHealth,
    refreshVoices,
    speak,
    stop,
    speaking,
  } = useSpeech();
  const [voiceQuery, setVoiceQuery] = useState('');

  /*
    Only ever render a handful of rows. A Samsung with Google's engine reports several
    hundred voices, and building a SelectRow for each one blocked the JS thread for
    seconds every time this screen opened. Search reaches the rest.
  */
  const searching = voiceQuery.trim().length > 0;
  const matches = useMemo(
    () => (searching ? filterVoices(voices, voiceQuery) : voices),
    [voices, voiceQuery, searching],
  );
  const shown = useMemo(
    () =>
      searching
        ? matches.slice(0, VOICE_SEARCH_LIMIT)
        : shortlistVoices(voices, settings.voiceId, VOICE_SHORTLIST_SIZE),
    [searching, matches, voices, settings.voiceId],
  );

  const handleFixVoice = async () => {
    await openTtsSettings();
    // The user is coming back from a system screen having (hopefully) installed a
    // voice, so re-read the list rather than making them restart the app.
    setTimeout(() => void refreshVoices(), 1200);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section
        title="Voice"
        footer={
          Platform.OS === 'android'
            ? 'Fixing the voice opens your phone’s text-to-speech settings. Choose “Install voice data” and download English (Australia). Pick the one marked offline or local so it works with no internet.'
            : 'This tells you where to find the Australian voices in the iPhone Settings app.'
        }
      >
        <View style={styles.bannerWrap}>
          <Banner
            level={voiceHealth.level}
            headline={voiceHealth.headline}
            detail={voiceHealth.detail}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button label="Fix the voice" variant="secondary" onPress={handleFixVoice} />
          <Button
            label="Check again for voices"
            variant="quiet"
            onPress={() => void refreshVoices()}
          />
        </View>
      </Section>

      <Section title="Speaking speed">
        <View style={styles.chipGrid}>
          {RATES.map((rate) => (
            <Chip
              key={rate.label}
              label={rate.label}
              selected={Math.abs(settings.rate - rate.value) < 0.001}
              onPress={() => updateSettings({ rate: rate.value })}
            />
          ))}
        </View>
        <View style={styles.buttonRow}>
          {speaking ? (
            <Button label="Stop" variant="stop" onPress={stop} />
          ) : (
            <Button
              label="Try it"
              variant="primary"
              onPress={() => speak(SAMPLE)}
              accessibilityHint="Speaks a short sample so you can hear the speed and voice"
            />
          )}
        </View>
      </Section>

      <Section
        title="Choose a voice"
        footer="“Best available” picks the most Australian voice on this phone that also works without internet."
      >
        {voices.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text variant="body" muted>
              No voices found yet. Tap “Check again for voices” above.
            </Text>
          </View>
        ) : (
          <>
            {/* No point offering search when everything already fits. */}
            {voices.length > VOICE_SHORTLIST_SIZE ? (
              <View style={styles.searchWrap}>
                <TextInput
                  value={voiceQuery}
                  onChangeText={setVoiceQuery}
                  placeholder="Search voices, e.g. Australian"
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  accessibilityLabel="Search voices"
                  accessibilityHint="Filters the list of voices on this phone"
                  style={styles.search}
                />
              </View>
            ) : null}

            {searching ? null : (
              <SelectRow
                label="Best available"
                detail="Recommended"
                selected={settings.voiceId === undefined}
                onPress={() => updateSettings({ voiceId: undefined })}
              />
            )}

            {shown.map((voice, index) => (
              <React.Fragment key={voice.id}>
                {index === 0 && searching ? null : <Separator />}
                <SelectRow
                  label={voice.name}
                  detail={describeVoiceRow(voice, voice.id === activeVoice?.id)}
                  selected={settings.voiceId === voice.id}
                  onPress={() => updateSettings({ voiceId: voice.id })}
                />
              </React.Fragment>
            ))}

            <View style={styles.emptyWrap}>
              <Text variant="caption">{summarise(voices.length, matches.length, shown.length, searching, voiceQuery)}</Text>
            </View>
          </>
        )}
      </Section>

      <Section
        title="Sound and feedback"
        footer={
          Platform.OS === 'ios'
            ? 'Speaking on silent means the app still talks when the side switch is set to silent — handy if it gets flicked by accident.'
            : undefined
        }
      >
        {/*
          iOS only. Android's text-to-speech already plays on the media volume and offers
          no equivalent switch, so showing a dead toggle would just be confusing.
        */}
        {Platform.OS === 'ios' ? (
          <>
            <SwitchRow
              label="Speak even on silent"
              detail="Ignore the side switch when talking"
              value={settings.speakOverSilentSwitch}
              onValueChange={(speakOverSilentSwitch) =>
                updateSettings({ speakOverSilentSwitch })
              }
            />
            <Separator />
          </>
        ) : null}
        <SwitchRow
          label="Vibrate when I tap"
          value={settings.haptics}
          onValueChange={(haptics) => updateSettings({ haptics })}
        />
      </Section>

      <Section title="About">
        <View style={styles.emptyWrap}>
          <Text variant="caption">
            Say It works completely offline once your phone has an Australian voice
            installed. Nothing you type leaves this phone — there is no account, no sync
            and no internet connection used for speech.
          </Text>
        </View>
      </Section>
    </ScrollView>
  );
}

/** Plain-words status line under the list, so the cap is never a silent truncation. */
function summarise(
  total: number,
  matched: number,
  showing: number,
  searching: boolean,
  query: string,
): string {
  if (searching && matched === 0) {
    return `No voices match “${query.trim()}”. Try “Australian”, “English” or “offline”.`;
  }
  if (searching && matched > showing) {
    return `Showing the first ${showing} of ${matched} matches. Keep typing to narrow it down.`;
  }
  if (searching) {
    return matched === 1 ? '1 voice matches.' : `${matched} voices match.`;
  }
  if (total > showing) {
    return `Showing ${showing} of ${total} voices on this phone. Search above to find the others.`;
  }
  return total === 1 ? '1 voice on this phone.' : `${total} voices on this phone.`;
}

function describeVoiceRow(voice: SpeechVoice, inUse: boolean): string {
  // The engine's own name is often something like "en-au-x-aua-local", so lead the
  // detail line with a language a person recognises.
  const bits = [describeLanguage(voice.language)];
  if (voice.offline === 'offline') bits.push('works offline');
  if (voice.offline === 'network') bits.push('needs internet');
  if (voice.enhanced) bits.push('higher quality');
  if (inUse) bits.push('currently in use');
  return bits.join(' · ');
}

const styles = StyleSheet.create({
  screen: {
    // iOS settings sit on the grouped background so the white cards read as raised.
    backgroundColor: colors.groupedBackground,
  },
  content: {
    paddingVertical: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  bannerWrap: {
    padding: isIOS ? spacing.md : 0,
    paddingHorizontal: spacing.md,
  },
  buttonRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: isIOS ? spacing.md : 0,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: isIOS ? spacing.md : 0,
  },
  emptyWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: isIOS ? spacing.md : 0,
    paddingBottom: spacing.sm,
  },
  search: {
    // iOS search fields are a filled rounded rect; Material 3 search bars are pills.
    minHeight: touchTarget.min,
    borderRadius: isIOS ? radius.field : radius.pill,
    borderWidth: isIOS ? 0 : 1,
    borderColor: colors.borderStrong,
    backgroundColor: isIOS ? colors.raised : colors.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.text,
  },
});
