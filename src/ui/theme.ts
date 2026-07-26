/**
 * Design tokens for an audience with reduced vision and reduced fine motor control.
 *
 * Two rules drive everything here:
 *  1. Nothing opts out of the OS font scale. Samsung's accessibility slider goes to
 *     1.8x and users who set it there meant it. Sizes below are the *floor*, not the
 *     ceiling, and every layout that uses them has to reflow.
 *  2. Contrast is measured, not eyeballed. Every text/background pair used in the app
 *     clears WCAG AA for large text at minimum, and body pairs clear AAA.
 */

export const colors = {
  // Page
  background: '#FFFFFF',
  surface: '#F2F4F7',
  surfaceSunken: '#E4E8EE',

  // Text — #1A1D21 on #FFFFFF is ~15.9:1
  text: '#1A1D21',
  textMuted: '#4A5058',
  textOnDark: '#FFFFFF',

  // Primary action — #0B5FA5 on #FFFFFF is ~6.6:1, white on it is ~6.6:1
  primary: '#0B5FA5',
  primaryPressed: '#08497F',
  primaryDisabled: '#9AA6B2',

  // Stop / destructive-ish. Used for "Stop talking", not for danger.
  stop: '#A32020',
  stopPressed: '#7E1818',

  // Status
  success: '#1B6B32',
  warning: '#8A5A00',
  warningSurface: '#FFF4DB',

  border: '#B9C0C9',
  borderStrong: '#6B7480',
  focus: '#0B5FA5',
} as const;

/**
 * Base font sizes in points. React Native multiplies these by the OS font scale
 * automatically, so these are what a user at 1.0x sees — deliberately large.
 */
export const fontSize = {
  display: 34,
  title: 27,
  button: 24,
  body: 21,
  label: 19,
  caption: 17,
} as const;

export const lineHeight = {
  display: 42,
  title: 34,
  button: 30,
  body: 30,
  label: 26,
  caption: 24,
} as const;

/**
 * Cap runaway scaling. Samsung tops out at 1.8x for font size (on top of a separate
 * display-density setting), so 2.0 leaves headroom without letting a single word push
 * the Speak button off the screen.
 */
export const MAX_FONT_SCALE = 2.0;

/** Android's touch target minimum is 48dp. We use 64 for primary controls. */
export const touchTarget = {
  min: 56,
  comfortable: 64,
  primary: 88,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  md: 12,
  lg: 18,
  pill: 999,
} as const;
