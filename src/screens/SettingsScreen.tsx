import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useSpeech } from '../speech/SpeechProvider';
import { openTtsSettings } from '../speech/openTtsSettings';
import { SpeechVoice } from '../speech/types';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { colors, radius, spacing, touchTarget } from '../ui/theme';

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

  const handleFixVoice = async () => {
    await openTtsSettings();
    // The user is coming back from a system screen having (hopefully) installed a
    // voice, so re-read the list rather than making them restart the app.
    setTimeout(() => void refreshVoices(), 1200);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Voice">
        <Banner
          level={voiceHealth.level}
          headline={voiceHealth.headline}
          detail={voiceHealth.detail}
        />
        <Button label="Fix the voice" variant="secondary" onPress={handleFixVoice} />
        <Text variant="caption">
          {Platform.OS === 'android'
            ? 'This opens your phone’s text-to-speech settings. Choose "Install voice data" and download English (Australia). Pick the option marked offline or local so it works with no internet.'
            : 'This tells you where to find the Australian voices in the iPhone Settings app.'}
        </Text>
        <Button label="Check again for voices" variant="quiet" onPress={() => void refreshVoices()} />
      </Section>

      <Section title="Speaking speed">
        <View style={styles.rateGrid}>
          {RATES.map((rate) => (
            <Chip
              key={rate.label}
              label={rate.label}
              selected={Math.abs(settings.rate - rate.value) < 0.001}
              onPress={() => updateSettings({ rate: rate.value })}
            />
          ))}
        </View>
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
      </Section>

      <Section title="Choose a voice">
        {voices.length === 0 ? (
          <Text variant="body" muted>
            No voices found yet. Tap “Check again for voices” above.
          </Text>
        ) : (
          <>
            <VoiceRow
              label="Best available (recommended)"
              detail="Let the app pick the most Australian offline voice on this phone."
              selected={settings.voiceId === undefined}
              onPress={() => updateSettings({ voiceId: undefined })}
            />
            {voices.map((voice) => (
              <VoiceRow
                key={voice.id}
                label={voice.name}
                detail={describeVoiceRow(voice)}
                selected={settings.voiceId === voice.id}
                highlighted={voice.id === activeVoice?.id}
                onPress={() => updateSettings({ voiceId: voice.id })}
              />
            ))}
          </>
        )}
      </Section>

      <Section title="Other">
        <ToggleRow
          label="Vibrate when I tap"
          value={settings.haptics}
          onValueChange={(haptics) => updateSettings({ haptics })}
        />
      </Section>

      <Section title="About">
        <Text variant="caption">
          Say It works completely offline once your phone has an Australian voice
          installed. Nothing you type leaves this phone — there is no account, no
          sync and no internet connection used for speech.
        </Text>
      </Section>
    </ScrollView>
  );
}

function describeVoiceRow(voice: SpeechVoice): string {
  const bits = [voice.language];
  if (voice.isAustralian) bits.push('Australian');
  if (voice.offline === 'offline') bits.push('works offline');
  if (voice.offline === 'network') bits.push('needs internet');
  if (voice.enhanced) bits.push('higher quality');
  return bits.join(' · ');
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} accessibilityRole="summary">
      <Text variant="title">{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text variant="label" onDark={selected} center>
        {label}
      </Text>
    </Pressable>
  );
}

function VoiceRow({
  label,
  detail,
  selected,
  highlighted,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${label}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.voiceRow,
        selected && styles.voiceRowSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.radio}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.voiceText}>
        <Text variant="label">{label}</Text>
        <Text variant="caption">
          {detail}
          {highlighted && !selected ? ' · currently in use' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text variant="label" style={styles.toggleLabel}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        // Android's Switch is small and fixed-size; scaling it up keeps it in
        // proportion with the rest of the controls at large font sizes.
        style={styles.switch}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.background}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionBody: {
    gap: spacing.md,
  },
  rateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: touchTarget.comfortable,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    // flexGrow lets chips reflow onto more rows as the font scale climbs instead of
    // being clipped at the right edge.
    flexGrow: 1,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.comfortable,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  voiceText: {
    flex: 1,
    gap: spacing.xs,
  },
  radio: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.comfortable,
  },
  toggleLabel: {
    flex: 1,
  },
  switch: {
    transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }],
  },
});
