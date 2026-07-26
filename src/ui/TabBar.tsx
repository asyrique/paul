import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, fontSize, spacing, touchTarget } from './theme';

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
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={styles.icon} maxFontSizeMultiplier={1.4} accessible={false}>
              {tab.icon}
            </Text>
            {/*
              The tab labels are the one place we cap scaling below the app-wide 2.0x:
              three fixed-width columns cannot fit "Settings" at 1.8x without clipping.
              Capping is safe here because the tab bar is redundant navigation — the
              icon plus the screen-reader label still identify the tab, and no content
              is lost.
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
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: spacing.md,
    gap: 2,
  },
  tabSelected: {
    backgroundColor: colors.surfaceSunken,
  },
  tabPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: fontSize.title,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
