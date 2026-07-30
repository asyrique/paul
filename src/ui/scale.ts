/**
 * The app's own enlargement fills in what the OS has not already done, rather than
 * stacking on top of it.
 *
 * Android has two independent magnifiers, both under "Display size and text":
 *
 *  - **Display size** scales every dp. A 64dp button becomes physically bigger and fewer
 *    dp fit across the screen.
 *  - **Font size** scales text only, which React Native applies to `fontSize` for us.
 *
 * This app is drawn deliberately oversized for older eyes. On a phone already set to
 * large display size *and* large text, that oversizing compounds with the OS's and the
 * result is unusable — which is the bug this file fixes.
 *
 * Nothing here reads the settings themselves. React Native cannot: telling a raised
 * density from the device's native one needs `DENSITY_DEVICE_STABLE` through native code.
 * It does not need to. Both magnifiers have observable consequences — a narrower dp
 * viewport and a higher font scale — and responding to those also does the right thing on
 * a genuinely small phone, which no amount of setting-sniffing would.
 */

/**
 * The dp width this design targets. Most Android phones report 360dp across at the
 * default display size, so a phone at its defaults gets the full-size UI and nothing
 * changes for it. Anything narrower is either magnified or a small device, and both want
 * the same answer.
 */
export const BASELINE_WIDTH_DP = 360;

/** Floor on shrinking. Past this the OS's own magnification is doing plenty. */
export const MIN_LAYOUT_SCALE = 0.8;

/** Android's minimum touch target. Scaling must never take a control below it. */
export const TOUCH_TARGET_FLOOR_DP = 48;

/** Samsung's font-size slider tops out here, which is where our own bonus reaches zero. */
export const FULL_FONT_SCALE = 1.8;

/**
 * How much to shrink every dimension, from the width actually available.
 *
 * Capped at 1: a roomy screen gets the design as drawn rather than an inflated version,
 * since the sizes are already chosen for reach and legibility, not for filling space.
 */
export function computeLayoutScale(widthDp: number): number {
  if (!Number.isFinite(widthDp) || widthDp <= 0) return 1;
  const scale = widthDp / BASELINE_WIDTH_DP;
  return Math.min(1, Math.max(MIN_LAYOUT_SCALE, scale));
}

/**
 * How far to hand text sizing back to the platform, as the OS font scale rises.
 *
 * `0` keeps this app's large sizes, for a phone at the default font size. `1` uses the
 * platform's ordinary sizes, which the OS is about to multiply anyway. In between it
 * interpolates, so raising the font setting still makes text bigger — just from a smaller
 * base, instead of multiplying an already-large one.
 */
export function computeTypeBlend(fontScale: number): number {
  if (!Number.isFinite(fontScale) || fontScale <= 1) return 0;
  const blend = (fontScale - 1) / (FULL_FONT_SCALE - 1);
  return Math.min(1, Math.max(0, blend));
}

/**
 * Picks a font size between this app's large value and the platform's ordinary one, then
 * applies the layout scale.
 */
export function blendFontSize(
  large: number,
  normal: number,
  typeBlend: number,
  layoutScale: number,
): number {
  const blended = large + (normal - large) * typeBlend;
  return Math.round(blended * layoutScale);
}

/** Scales a plain dimension — spacing, a radius — never below 1dp. */
export function scaleDimension(value: number, layoutScale: number): number {
  return Math.max(1, Math.round(value * layoutScale));
}

/** Scales a touch target, but never below the platform minimum. */
export function scaleTouchTarget(value: number, layoutScale: number): number {
  return Math.max(TOUCH_TARGET_FLOOR_DP, Math.round(value * layoutScale));
}
