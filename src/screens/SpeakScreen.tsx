import React, { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSpeech } from '../speech/SpeechProvider';
import { newPhraseId } from '../storage/store';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
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
import { useKeyboardVisible } from '../ui/useKeyboardVisible';

type Props = {
  onOpenSettings: () => void;
};

export function SpeakScreen({ onOpenSettings }: Props) {
  const {
    speak,
    stop,
    speaking,
    settings,
    phrases,
    setPhrases,
    voiceHealth,
    lastError,
    maxInputLength,
  } = useSpeech();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { height } = useWindowDimensions();
  const keyboardOpen = useKeyboardVisible();

  const trimmed = text.trim();
  const canSpeak = trimmed.length > 0;
  const overLimit = trimmed.length > maxInputLength;

  const handleSpeak = () => {
    if (!canSpeak) return;
    speak(text);
  };

  const handleClear = () => {
    setText('');
    stop();
    inputRef.current?.focus();
  };

  const handleSave = () => {
    if (!canSpeak) return;
    if (phrases.some((phrase) => phrase.text.trim() === trimmed)) {
      Alert.alert('Already saved', 'That phrase is already in your saved phrases.');
      return;
    }
    setPhrases([{ id: newPhraseId(), text: trimmed }, ...phrases]);
    Alert.alert('Saved', 'You can find it on the Phrases tab.');
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {voiceHealth.level !== 'good' ? (
          <Banner
            level={voiceHealth.level}
            headline={voiceHealth.headline}
            detail={voiceHealth.detail}
            actionLabel="Open Settings to fix the voice"
            onPress={onOpenSettings}
          />
        ) : null}

        {lastError ? (
          <Banner level="bad" headline="That did not speak" detail={lastError} />
        ) : null}

        <Text variant="label">What do you want to say?</Text>

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          multiline
          autoCorrect
          autoCapitalize="sentences"
          // `default` rather than `done` so the return key inserts a line break; a
          // multiline box that submits on Enter surprises people mid-sentence.
          returnKeyType="default"
          blurOnSubmit={false}
          placeholder="Type here…"
          placeholderTextColor={colors.textMuted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel="Message to speak"
          // Grow with the screen when there is room, but yield height once the
          // keyboard is up so the Speak button still fits above it.
          style={[
            styles.input,
            { minHeight: keyboardOpen ? touchTarget.comfortable : Math.max(140, height * 0.22) },
          ]}
          textAlignVertical="top"
        />

        {overLimit ? (
          <Text variant="caption" style={styles.limit}>
            That is a bit long. Only the first {maxInputLength} characters will be spoken.
          </Text>
        ) : null}

        <View style={styles.secondaryRow}>
          <Button
            label="Clear"
            variant="secondary"
            onPress={handleClear}
            disabled={text.length === 0}
            accessibilityHint="Erases the text box"
            style={styles.secondaryButton}
          />
          <Button
            label="Save phrase"
            variant="secondary"
            onPress={handleSave}
            disabled={!canSpeak}
            accessibilityHint="Adds this text to your saved phrases"
            style={styles.secondaryButton}
          />
        </View>
      </ScrollView>

      {/*
        The Speak button lives outside the ScrollView on purpose. At a 1.8x font scale
        with the keyboard open there is very little room left, and this is the one
        control that must never require scrolling to reach.
      */}
      <View style={[styles.actionBar, keyboardOpen && styles.actionBarCompact]}>
        {speaking ? (
          <Button
            label="Stop talking"
            variant="stop"
            size={keyboardOpen ? 'normal' : 'huge'}
            onPress={stop}
            accessibilityHint="Stops the speech straight away"
          />
        ) : (
          <Button
            label="Speak"
            variant="primary"
            // Shrinks to the `normal` size while the keyboard is up. That is still a
            // 64dp target, comfortably above Android's 48dp minimum.
            size={keyboardOpen ? 'normal' : 'huge'}
            onPress={handleSpeak}
            disabled={!canSpeak}
            accessibilityHint={
              canSpeak ? 'Reads your text out loud' : 'Type something first'
            }
          />
        )}
        {settings.rate !== 1 && !keyboardOpen ? (
          <Text variant="caption" center style={styles.rateHint}>
            Speaking speed: {describeRate(settings.rate)} · change it in Settings
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function describeRate(rate: number): string {
  if (rate <= 0.6) return 'Very slow';
  if (rate <= 0.8) return 'Slow';
  if (rate < 1) return 'Relaxed';
  if (rate <= 1.2) return 'Normal';
  return 'Fast';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  input: {
    // iOS text fields are hairline-bordered on a white fill; Material 3 outlined fields
    // use a 1dp outline and a tinted container.
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.field,
    backgroundColor: isIOS ? colors.background : colors.card,
    padding: spacing.md,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.text,
  },
  limit: {
    color: colors.warning,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
  },
  actionBar: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actionBarCompact: {
    paddingVertical: spacing.sm,
  },
  rateHint: {
    color: colors.textMuted,
  },
});
