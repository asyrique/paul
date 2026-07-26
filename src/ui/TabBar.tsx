import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, fontSize, isIOS, radius, ripple, spacing, touchTarget } from './theme';

export type TabKey = 'speak' | 'phrases' | 'settings';

export const TABS: { key: TabKey; label: string; icon: string; hint: string }[] = [
  { key: 'speak', label: 'Speak', icon: '💬', hint: 'Type a message and say it out loud' },
  { key: 'phrases', label: 'Phrases', icon: '⭐', hint: 'Your saved phrases' },
  { key: 'settings', label: 'Settings', icon: '⚙️', hint: 'Voice and speed settings' },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
  bottomInset: number;
};

/**
 * An iOS tab bar (hairline rule, tinted icon and label) or a Material 3 navigation bar
 * (pill indicator behind the active icon, ripple on touch).
 */
export function TabBar({ active, onChange, bottomInset }: Props) {
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(bottomInset, spacing.sm) }]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            accessibilityHint={tab.hint}
            onPress={() => onChange(tab.key)}
            android_ripple={ripple}
            style={({ pressed }) => [
              styles.tab,
              pressed && isIOS && styles.tabPressed,
            ]}
          >
            {/* Material 3 marks the active tab with a pill behind the icon. */}
            <View style={[styles.iconSlot, !isIOS && selected && styles.indicator]}>
              <Text style={styles.icon} maxFontSizeMultiplier={1.4} accessible={false}>
                {tab.icon}
              </Text>
            </View>
            {/*
              The one place the app caps scaling below its 2.0x ceiling: three fixed
              columns cannot fit "Settings" at 1.8x. Safe here because the tab bar is
              redundant navigation — the icon and the screen-reader label still identify
              the tab, and no content is lost.
            */}
            <Text
              variant="caption"
              center
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: isIOS ? colors.background : colors.card,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    // iOS separates the tab bar with a hairline; Material 3 uses a surface tint instead.
    ...(isIOS
      ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
      : null),
  },
  tab: {
    flex: 1,
    minHeight: touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: isIOS ? radius.field : radius.pill,
    gap: 2,
    overflow: 'hidden',
  },
  tabPressed: {
    opacity: 0.6,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  indicator: {
    backgroundColor: colors.raised,
  },
  icon: {
    fontSize: fontSize.title,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
});
