import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from './Text';
import {
  colors,
  fontSize,
  isIOS,
  lineHeight,
  radius,
  ripple,
  spacing,
  touchTarget,
  typography,
} from './theme';

type Variant = 'primary' | 'stop' | 'secondary' | 'quiet';
type Size = 'huge' | 'normal';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  haptics?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

/**
 * A filled button in each platform's idiom: a Material 3 pill with a ripple on Android,
 * a continuous-corner iOS button that dims on press. The size floor is the app's, not
 * the platform's — see theme.ts.
 */
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
      android_ripple={disabled ? undefined : ripple}
      // Generous slop so a shaky tap landing just outside still registers.
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        size === 'huge' ? styles.huge : styles.normal,
        variantStyles[variant].container,
        // Android shows the ripple instead of a colour swap; iOS has no ripple, so it
        // needs the pressed state drawn explicitly.
        pressed && !disabled && isIOS && variantStyles[variant].pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        variant="label"
        center
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
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    borderWidth: isIOS ? 0 : 1,
    borderColor: 'transparent',
    // Material 3 raises filled buttons a touch; iOS keeps them flat.
    ...(isIOS
      ? null
      : {
          elevation: 1,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
        }),
    overflow: 'hidden',
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
    fontWeight: typography.buttonWeight,
  },
  hugeLabel: {
    fontSize: fontSize.title,
    fontWeight: isIOS ? '700' : '500',
  },
  disabled: {
    backgroundColor: colors.accentDisabled,
    borderColor: 'transparent',
    elevation: 0,
  },
  disabledLabel: {
    color: colors.textOnAccent,
  },
});

const variantStyles: Record<
  Variant,
  { container: ViewStyle; pressed: ViewStyle; label: { color: string } }
> = {
  primary: {
    container: { backgroundColor: colors.accent },
    pressed: { backgroundColor: colors.accentPressed },
    label: { color: colors.textOnAccent },
  },
  stop: {
    container: { backgroundColor: colors.destructive },
    pressed: { backgroundColor: colors.destructivePressed },
    label: { color: colors.textOnAccent },
  },
  // iOS "gray" button vs Material's outlined button.
  secondary: {
    container: isIOS
      ? { backgroundColor: colors.raised, elevation: 0 }
      : { backgroundColor: 'transparent', borderColor: colors.borderStrong, elevation: 0 },
    pressed: { backgroundColor: colors.border },
    label: { color: colors.accent },
  },
  // iOS plain button vs Material's tonal button.
  quiet: {
    container: isIOS
      ? { backgroundColor: 'transparent', elevation: 0 }
      : { backgroundColor: colors.card, elevation: 0 },
    pressed: { backgroundColor: colors.raised },
    label: { color: colors.accent },
  },
};
