import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, isIOS, radius, ripple, spacing } from './theme';

type Props = {
  level: 'good' | 'warn' | 'bad';
  headline: string;
  detail?: string;
  onPress?: () => void;
  actionLabel?: string;
};

/**
 * A tinted status card. iOS keeps a hairline border in its grouped-card idiom; Material 3
 * uses a filled tonal card with no outline.
 */
const LEVEL_STYLES = {
  good: { backgroundColor: colors.successSurface, borderColor: colors.success },
  warn: { backgroundColor: colors.warningSurface, borderColor: colors.warning },
  bad: { backgroundColor: colors.dangerSurface, borderColor: colors.destructive },
} as const;

export function Banner({ level, headline, detail, onPress, actionLabel }: Props) {
  const body = (
    <>
      <Text variant="label">{headline}</Text>
      {detail ? (
        <Text variant="caption" style={styles.detail}>
          {detail}
        </Text>
      ) : null}
      {onPress && actionLabel ? (
        <Text variant="label" style={styles.action}>
          {actionLabel}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityRole="summary" style={[styles.container, LEVEL_STYLES[level]]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${headline}. ${detail ?? ''}`}
      accessibilityHint={actionLabel}
      onPress={onPress}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.container,
        LEVEL_STYLES[level],
        pressed && isIOS && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // Material 3 tonal cards carry their meaning in the fill, not an outline.
    borderWidth: isIOS ? StyleSheet.hairlineWidth : 0,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  detail: {
    color: colors.text,
  },
  action: {
    color: colors.accent,
    marginTop: spacing.xs,
    // iOS links are plain tinted text; Material underlines inline actions.
    textDecorationLine: isIOS ? 'none' : 'underline',
  },
});
