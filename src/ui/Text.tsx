import React from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';

import { MAX_FONT_SCALE, colors, fontSize, lineHeight } from './theme';

type Variant = 'display' | 'title' | 'body' | 'label' | 'caption';

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  onDark?: boolean;
  center?: boolean;
};

/**
 * Every piece of text in the app goes through here, which is how we guarantee that
 * nothing accidentally ships with `allowFontScaling={false}` or a 13pt caption.
 */
export function Text({
  variant = 'body',
  muted,
  onDark,
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
        onDark && styles.onDark,
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
    fontWeight: '700',
    color: colors.text,
  },
  title: {
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    fontWeight: '700',
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
    fontWeight: '600',
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  muted: { color: colors.textMuted },
  onDark: { color: colors.textOnDark },
  center: { textAlign: 'center' },
});
