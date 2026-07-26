import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from './Text';
import { MAX_FONT_SCALE, colors, fontSize, lineHeight, radius, spacing, touchTarget } from './theme';

type Variant = 'primary' | 'stop' | 'secondary' | 'quiet';
type Size = 'huge' | 'normal';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  haptics?: boolean;
  /** Spoken by TalkBack/VoiceOver in place of the label when the label is terse. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'normal',
  disabled = false,
  haptics = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const handlePress = () => {
    if (haptics) void Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      // A generous slop means a shaky tap that lands just outside still registers.
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        size === 'huge' ? styles.huge : styles.normal,
        variantStyles[variant].container,
        pressed && !disabled && variantStyles[variant].pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        variant="label"
        center
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[
          styles.labelText,
          size === 'huge' && styles.hugeLabel,
          variantStyles[variant].label,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  normal: {
    minHeight: touchTarget.comfortable,
    paddingVertical: spacing.md,
  },
  huge: {
    minHeight: touchTarget.primary,
    paddingVertical: spacing.lg,
  },
  labelText: {
    fontSize: fontSize.button,
    lineHeight: lineHeight.button,
    fontWeight: '700',
  },
  hugeLabel: {
    fontSize: fontSize.title,
  },
  disabled: {
    backgroundColor: colors.primaryDisabled,
    borderColor: 'transparent',
  },
  disabledLabel: {
    color: colors.textOnDark,
  },
});

const variantStyles: Record<
  Variant,
  { container: ViewStyle; pressed: ViewStyle; label: { color: string } }
> = {
  primary: {
    container: { backgroundColor: colors.primary },
    pressed: { backgroundColor: colors.primaryPressed },
    label: { color: colors.textOnDark },
  },
  stop: {
    container: { backgroundColor: colors.stop },
    pressed: { backgroundColor: colors.stopPressed },
    label: { color: colors.textOnDark },
  },
  secondary: {
    container: { backgroundColor: colors.background, borderColor: colors.borderStrong },
    pressed: { backgroundColor: colors.surfaceSunken },
    label: { color: colors.text },
  },
  quiet: {
    container: { backgroundColor: colors.surface },
    pressed: { backgroundColor: colors.surfaceSunken },
    label: { color: colors.text },
  },
};
