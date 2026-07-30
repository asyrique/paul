import { Dimensions, PixelRatio, Platform } from 'react-native';

import {
  blendFontSize,
  computeLayoutScale,
  computeTypeBlend,
  scaleDimension,
  scaleTouchTarget,
} from './scale';

/**
 * Two design languages, one accessibility floor.
 *
 * The app follows the host platform's visual conventions — Apple HIG on iOS, Material 3
 * on Android — so it looks like it belongs on the phone rather than like a cross-platform
 * app. Where a platform convention would make something too small or too low-contrast for
 * this audience, the floor wins:
 *
 *  - Nothing opts out of the OS font scale, up to 2.0x (Samsung's slider tops out at 1.8x).
 *  - Primary controls stay at least 48dp tall — Android's minimum — and 56dp+ whenever
 *    the screen has room for it.
 *  - Text/background pairs clear WCAG AA. The stock accents do not: iOS systemBlue
 *    (#007AFF) gives white text only ~3.4:1 and systemRed (#FF3B30) ~3.1:1, so both are
 *    used at darkened shades that keep the platform's hue while clearing 4.5:1.
 */

type Palette = {
  background: string;
  groupedBackground: string;
  card: string;
  raised: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentPressed: string;
  accentDisabled: string;
  destructive: string;
  destructivePressed: string;
  success: string;
  warning: string;
  warningSurface: string;
  successSurface: string;
  dangerSurface: string;
  border: string;
  borderStrong: string;
};

const ios: Palette = {
  // systemBackground / systemGroupedBackground
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  card: '#FFFFFF',
  raised: '#F2F2F7',

  // label / secondaryLabel, opaque equivalents of Apple's alpha values
  text: '#000000',
  textMuted: '#6C6C70',
  textOnAccent: '#FFFFFF',

  // Darkened systemBlue: white-on-accent reaches 5.1:1.
  accent: '#0A62D0',
  accentPressed: '#084EA6',
  accentDisabled: '#AEAEB2',

  // Darkened systemRed for the same reason.
  destructive: '#C0281F',
  destructivePressed: '#96201A',

  success: '#1B7A38',
  warning: '#8A5A00',
  warningSurface: '#FFF6E0',
  successSurface: '#E9F6EC',
  dangerSurface: '#FDECEA',

  // separator / opaqueSeparator
  border: '#C6C6C8',
  borderStrong: '#8E8E93',
};

const android: Palette = {
  // Material 3 surface roles, blue-seeded tonal palette
  background: '#FDFCFF',
  groupedBackground: '#FDFCFF',
  card: '#F0F3FA',
  raised: '#E3E7EF',

  // onSurface / onSurfaceVariant
  text: '#1A1C1E',
  textMuted: '#43474E',
  textOnAccent: '#FFFFFF',

  // M3 primary40. White-on-primary reaches 6.3:1.
  accent: '#0B57D0',
  accentPressed: '#08429E',
  accentDisabled: '#9BA0A6',

  // M3 error40
  destructive: '#B3261E',
  destructivePressed: '#8C1D18',

  success: '#186B31',
  warning: '#7A5300',
  warningSurface: '#FFF0D4',
  successSurface: '#E4F3E7',
  dangerSurface: '#FCEEEE',

  // outlineVariant / outline
  border: '#C4C6D0',
  borderStrong: '#74777F',
};

export const colors: Palette = Platform.select({ ios, default: android });

export const isIOS = Platform.OS === 'ios';

/*
  Measured once, at module load. Display size and font size are settings a user picks and
  then leaves alone, and changing either restarts the activity — so re-reading them on
  every render would buy nothing and would force every StyleSheet in the app to become
  dynamic. The tradeoff: changing the setting while the app is already running needs the
  app reopened to take effect. See src/ui/scale.ts for why these two values are the signal.
*/
export const layoutScale = computeLayoutScale(Dimensions.get('window').width);
const typeBlend = computeTypeBlend(PixelRatio.getFontScale());

/** This app's oversized type, used when the OS is not already enlarging anything. */
const LARGE_TYPE = {
  display: isIOS ? 34 : 30,
  title: isIOS ? 24 : 23,
  button: isIOS ? 22 : 21,
  body: 21,
  label: 19,
  caption: 17,
} as const;

/**
 * Each platform's ordinary type, blended toward as the OS font scale climbs. At the top of
 * the slider the app asks for nothing extra and lets the OS do all of the enlarging.
 */
const NORMAL_TYPE = {
  display: isIOS ? 28 : 24,
  title: isIOS ? 20 : 22,
  button: isIOS ? 17 : 14,
  body: isIOS ? 17 : 16,
  label: isIOS ? 15 : 14,
  caption: isIOS ? 13 : 12,
} as const;

type TypeVariant = keyof typeof LARGE_TYPE;

function typeSize(variant: TypeVariant): number {
  return blendFontSize(LARGE_TYPE[variant], NORMAL_TYPE[variant], typeBlend, layoutScale);
}

export const fontSize = {
  display: typeSize('display'),
  title: typeSize('title'),
  button: typeSize('button'),
  body: typeSize('body'),
  label: typeSize('label'),
  caption: typeSize('caption'),
} as const;

/** Kept proportional to the type it wraps, so blended sizes never crowd or gap. */
const LINE_HEIGHT_RATIO = 1.35;

export const lineHeight = {
  display: Math.round(fontSize.display * (isIOS ? 1.24 : 1.27)),
  title: Math.round(fontSize.title * 1.3),
  button: Math.round(fontSize.button * 1.27),
  body: Math.round(fontSize.body * LINE_HEIGHT_RATIO),
  label: Math.round(fontSize.label * LINE_HEIGHT_RATIO),
  caption: Math.round(fontSize.caption * 1.4),
} as const;

/**
 * Apple's system font tracks tighter and uses heavier display weights; Material 3 leans
 * on positive letter-spacing for labels and rarely goes past 600.
 */
export const typography = {
  displayWeight: isIOS ? ('700' as const) : ('400' as const),
  titleWeight: isIOS ? ('700' as const) : ('500' as const),
  labelWeight: isIOS ? ('600' as const) : ('500' as const),
  buttonWeight: isIOS ? ('600' as const) : ('500' as const),
  displayTracking: isIOS ? 0.37 : 0,
  labelTracking: isIOS ? -0.2 : 0.1,
  captionTracking: isIOS ? -0.1 : 0.25,
} as const;

/** Samsung tops out at 1.8x, so 2.0 leaves headroom without letting a word break out. */
export const MAX_FONT_SCALE = 2.0;

/**
 * Above Material's 48dp and Apple's 44pt minimums, on purpose — and never scaled below
 * Android's 48dp, however tight the viewport gets.
 */
export const touchTarget = {
  min: scaleTouchTarget(56, layoutScale),
  comfortable: scaleTouchTarget(64, layoutScale),
  primary: scaleTouchTarget(88, layoutScale),
} as const;

export const spacing = {
  xs: scaleDimension(4, layoutScale),
  sm: scaleDimension(8, layoutScale),
  md: scaleDimension(16, layoutScale),
  lg: scaleDimension(24, layoutScale),
  xl: scaleDimension(32, layoutScale),
  xxl: scaleDimension(48, layoutScale),
} as const;

/**
 * Apple uses continuous corners around 10–12pt; Material 3 buttons are full pills. `pill`
 * is a "round it completely" sentinel rather than a measurement, so it is never scaled.
 */
export const radius = {
  control: isIOS ? scaleDimension(12, layoutScale) : 100,
  card: scaleDimension(isIOS ? 10 : 16, layoutScale),
  field: scaleDimension(isIOS ? 10 : 12, layoutScale),
  pill: 100,
} as const;

/** Material draws a ripple on press; iOS dims. Only one of these is ever used. */
export const ripple = isIOS
  ? undefined
  : { color: 'rgba(11, 87, 208, 0.12)', borderless: false };
