import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from './Text';
import { colors, isIOS, radius, ripple, spacing, touchTarget } from './theme';

/**
 * Settings lists in each platform's idiom.
 *
 * iOS groups rows into an inset card with hairline separators and a quiet header above
 * it. Material 3 lays rows flat on the surface with a coloured section header and a
 * ripple on touch. Both keep rows at least 56dp tall.
 */

export function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant={isIOS ? 'caption' : 'label'} style={styles.sectionTitle}>
        {isIOS ? title.toUpperCase() : title}
      </Text>
      <View style={styles.card}>{children}</View>
      {footer ? (
        <Text variant="caption" style={styles.sectionFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/** A hairline between rows, inset from the leading edge the way both platforms do it. */
export function Separator() {
  return <View style={styles.separator} />;
}

export function Row({
  children,
  onPress,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityRole?: 'button' | 'radio' | 'switch';
  accessibilityState?: { selected?: boolean; checked?: boolean };
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  if (!onPress) {
    return <View style={styles.row}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={ripple}
      style={({ pressed }) => [styles.row, pressed && isIOS && styles.rowPressed]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Single-select row. iOS marks the choice with a trailing checkmark; Material 3 uses a
 * leading radio button.
 */
export function SelectRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Row
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
    >
      {isIOS ? null : (
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      )}
      <View style={styles.rowText}>
        <Text variant="label" style={selected && isIOS ? styles.selectedLabel : undefined}>
          {label}
        </Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      {isIOS && selected ? (
        <Text variant="label" style={styles.checkmark} accessible={false}>
          ✓
        </Text>
      ) : null}
    </Row>
  );
}

export function SwitchRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Row>
      <View style={styles.rowText}>
        <Text variant="label">{label}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        accessibilityHint={detail}
        // The stock switch is the native control on both platforms; iOS's is green by
        // convention, Material's takes the primary colour.
        trackColor={{ true: isIOS ? '#248A3D' : colors.accent, false: colors.border }}
        thumbColor={isIOS ? '#FFFFFF' : colors.background}
        // Android's switch is a fixed size that looks undersized next to 19pt+ text.
        style={isIOS ? undefined : styles.androidSwitch}
      />
    </Row>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    // iOS indents its group headers to the card's text inset; Material aligns to the row.
    paddingHorizontal: isIOS ? spacing.md : spacing.md,
    color: isIOS ? colors.textMuted : colors.accent,
  },
  sectionFooter: {
    paddingHorizontal: spacing.md,
  },
  card: isIOS
    ? {
        backgroundColor: colors.card,
        borderRadius: radius.card,
        marginHorizontal: spacing.md,
        overflow: 'hidden',
      }
    : {
        backgroundColor: 'transparent',
      },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: isIOS ? colors.card : 'transparent',
  },
  rowPressed: {
    backgroundColor: colors.raised,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth * (isIOS ? 1 : 0) + (isIOS ? 0 : 1),
    backgroundColor: colors.border,
    // Both platforms inset the divider past a leading control.
    marginLeft: isIOS ? spacing.md : 0,
  },
  selectedLabel: {
    color: colors.accent,
  },
  checkmark: {
    color: colors.accent,
    fontWeight: '700',
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
  androidSwitch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
});
