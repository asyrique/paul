import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, radius, spacing } from './theme';

type Props = {
  level: 'good' | 'warn' | 'bad';
  headline: string;
  detail?: string;
  onPress?: () => void;
  actionLabel?: string;
};

const LEVEL_STYLES = {
  good: { backgroundColor: '#E7F4EB', borderColor: colors.success },
  warn: { backgroundColor: colors.warningSurface, borderColor: colors.warning },
  bad: { backgroundColor: '#FBE9E9', borderColor: colors.stop },
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
      style={({ pressed }) => [styles.container, LEVEL_STYLES[level], pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  detail: {
    color: colors.text,
  },
  action: {
    color: colors.primary,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
  },
});
