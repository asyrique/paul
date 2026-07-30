import {
  BASELINE_WIDTH_DP,
  FULL_FONT_SCALE,
  MIN_LAYOUT_SCALE,
  TOUCH_TARGET_FLOOR_DP,
  blendFontSize,
  computeLayoutScale,
  computeTypeBlend,
  scaleDimension,
  scaleTouchTarget,
} from './scale';

describe('computeLayoutScale', () => {
  it('leaves a phone at the default display size alone', () => {
    // The whole point: someone who has changed nothing sees exactly the design as drawn.
    expect(computeLayoutScale(BASELINE_WIDTH_DP)).toBe(1);
  });

  it('does not inflate the UI on a roomy screen', () => {
    expect(computeLayoutScale(600)).toBe(1);
    expect(computeLayoutScale(1024)).toBe(1);
  });

  it('shrinks when display size has narrowed the viewport', () => {
    // Large display size on a 360dp phone reports roughly 320dp across.
    expect(computeLayoutScale(320)).toBeCloseTo(320 / BASELINE_WIDTH_DP, 5);
    expect(computeLayoutScale(320)).toBeLessThan(1);
  });

  it('shrinks further as display size grows', () => {
    expect(computeLayoutScale(300)).toBeLessThan(computeLayoutScale(330));
  });

  it('stops shrinking at the floor', () => {
    expect(computeLayoutScale(200)).toBe(MIN_LAYOUT_SCALE);
    expect(computeLayoutScale(1)).toBe(MIN_LAYOUT_SCALE);
  });

  it('falls back to 1 for a width it cannot use', () => {
    expect(computeLayoutScale(0)).toBe(1);
    expect(computeLayoutScale(Number.NaN)).toBe(1);
  });
});

describe('computeTypeBlend', () => {
  it('keeps this app’s large type at the default font size', () => {
    expect(computeTypeBlend(1)).toBe(0);
  });

  it('hands sizing fully back to the platform at the top of the slider', () => {
    expect(computeTypeBlend(FULL_FONT_SCALE)).toBe(1);
  });

  it('interpolates in between', () => {
    const middle = computeTypeBlend(1 + (FULL_FONT_SCALE - 1) / 2);
    expect(middle).toBeCloseTo(0.5, 5);
  });

  it('never exceeds 1, however far the slider goes', () => {
    expect(computeTypeBlend(3)).toBe(1);
  });

  it('treats a font scale below 1 as no enlargement', () => {
    expect(computeTypeBlend(0.85)).toBe(0);
  });
});

describe('blendFontSize', () => {
  const LARGE = 21;
  const NORMAL = 16;

  it('uses the large size when the OS is enlarging nothing', () => {
    expect(blendFontSize(LARGE, NORMAL, 0, 1)).toBe(LARGE);
  });

  it('uses the platform size once the OS is doing all the enlarging', () => {
    expect(blendFontSize(LARGE, NORMAL, 1, 1)).toBe(NORMAL);
  });

  it('still grows overall as the font scale rises', () => {
    // What the user actually sees is our base multiplied by the OS font scale. Raising
    // the setting must still make text bigger, just not by multiplying an already-large
    // base — that stacking was the bug.
    const atDefault = blendFontSize(LARGE, NORMAL, 0, 1) * 1;
    const atMax = blendFontSize(LARGE, NORMAL, 1, 1) * FULL_FONT_SCALE;
    expect(atMax).toBeGreaterThan(atDefault);
  });

  it('compounds with the layout scale', () => {
    expect(blendFontSize(LARGE, NORMAL, 0, 0.8)).toBe(Math.round(LARGE * 0.8));
  });
});

describe('scaleDimension', () => {
  it('is a no-op at full scale', () => {
    expect(scaleDimension(16, 1)).toBe(16);
  });

  it('shrinks proportionally', () => {
    expect(scaleDimension(16, 0.8)).toBe(13);
  });

  it('never collapses a dimension to nothing', () => {
    expect(scaleDimension(1, 0.8)).toBe(1);
  });
});

describe('scaleTouchTarget', () => {
  it('is a no-op at full scale', () => {
    expect(scaleTouchTarget(88, 1)).toBe(88);
  });

  it('shrinks a generous target', () => {
    expect(scaleTouchTarget(88, 0.8)).toBe(70);
  });

  it('never goes below Android’s minimum, whatever the scale', () => {
    // A shrunken target is still physically larger on a magnified display, but the dp
    // floor is not worth gambling on.
    expect(scaleTouchTarget(56, MIN_LAYOUT_SCALE)).toBeGreaterThanOrEqual(
      TOUCH_TARGET_FLOOR_DP,
    );
    expect(scaleTouchTarget(48, 0.5)).toBe(TOUCH_TARGET_FLOOR_DP);
  });
});
