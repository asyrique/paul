import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from './Text';
import { colors, isIOS, radius, ripple, spacing, touchTarget } from './theme';

/**
 * A discrete choice in a small set — the speaking-speed picker.
 *
 * This is deliberately *not* the native control on either platform. iOS would use a
 * UISegmentedControl and Material a slider, and both fail this audience: five segments
 * clip their labels well before the 1.8x font scale a Samsung can be set to, and a
 * slider has no labels and demands fine motor control. Large labelled targets that
 * reflow onto more rows survive both.
 *
 * The styling still follows each platform — an iOS segmented look, a Material filter
 * chip with a leading tick.
 */
export function Chip({
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
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && isIOS && styles.pressed,
      ]}
    >
      {!isIOS && selected ? (
        <Text variant="label" style={styles.tick} accessible={false}>
          ✓{' '}
        </Text>
      ) : null}
      <Text variant="label" style={selected ? styles.selectedLabel : styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: isIOS ? radius.field : radius.pill,
    borderWidth: 1,
    borderColor: isIOS ? colors.border : colors.borderStrong,
    backgroundColor: isIOS ? colors.raised : 'transparent',
    // Grow so the row reflows onto more lines as the font scale climbs, rather than
    // clipping at the right edge.
    flexGrow: 1,
  },
  selected: {
    backgroundColor: isIOS ? colors.card : colors.card,
    borderColor: colors.accent,
    ...(isIOS
      ? {
          // iOS segmented controls lift the selected segment slightly.
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
        }
      : null),
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.text,
  },
  selectedLabel: {
    color: isIOS ? colors.text : colors.accent,
    fontWeight: '700',
  },
  tick: {
    color: colors.accent,
    fontWeight: '700',
  },
});
