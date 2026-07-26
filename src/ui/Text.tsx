import React from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';

import { MAX_FONT_SCALE, colors, fontSize, lineHeight, typography } from './theme';

type Variant = 'display' | 'title' | 'body' | 'label' | 'caption';

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  onAccent?: boolean;
  center?: boolean;
};

/**
 * All text goes through here, which is how the app guarantees nothing ships with
 * `allowFontScaling={false}` or a 13pt caption, and how the per-platform weights and
 * letter-spacing stay in one place.
 */
export function Text({
  variant = 'body',
  muted,
  onAccent,
  center,
  style,
  ...rest
}: Props) {
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[
        styles[variant],
        muted && styles.muted,
        onAccent && styles.onAccent,
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    fontWeight: typography.displayWeight,
    letterSpacing: typography.displayTracking,
    color: colors.text,
  },
  title: {
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    fontWeight: typography.titleWeight,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.text,
  },
  label: {
    fontSize: fontSize.label,
    lineHeight: lineHeight.label,
    fontWeight: typography.labelWeight,
    letterSpacing: typography.labelTracking,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    letterSpacing: typography.captionTracking,
    color: colors.textMuted,
  },
  muted: { color: colors.textMuted },
  onAccent: { color: colors.textOnAccent },
  center: { textAlign: 'center' },
});
