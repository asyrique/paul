import { MIN_LAYOUT_SCALE, TOUCH_TARGET_FLOOR_DP } from './scale';

/**
 * The theme reads the display size and font scale once, at module load. These tests
 * reload it under different device conditions, which is the only way to check that the
 * wiring is actually connected — the maths in scale.test.ts passing says nothing about
 * whether the tokens use it.
 */
function loadTheme(widthDp: number, fontScale: number): typeof import('./theme') {
  let theme: typeof import('./theme') | undefined;

  jest.isolateModules(() => {
    /*
      The mock has to be registered in here, not spied on from outside. isolateModules
      gives the reloaded theme a fresh copy of `react-native`, so a spy on the outer copy
      applies to a different object entirely — which is what made the first version of
      this test read the device's real values and quietly pass.

      Only the three members theme.ts actually imports are provided, rather than spreading
      the real module: spreading react-native walks every lazy export getter.
    */
    jest.doMock('react-native', () => ({
      Dimensions: { get: () => ({ width: widthDp, height: 800, scale: 2, fontScale }) },
      PixelRatio: { getFontScale: () => fontScale },
      Platform: {
        OS: 'ios',
        select: (specifics: Record<string, unknown>) => specifics.ios ?? specifics.default,
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    theme = require('./theme') as typeof import('./theme');
  });

  jest.dontMock('react-native');
  if (!theme) throw new Error('theme failed to load');
  return theme;
}

/** A phone at its defaults: 360dp across, font size untouched. */
const DEFAULTS = { width: 360, fontScale: 1 };

describe('theme scaling', () => {
  it('gives a phone at its defaults the design exactly as drawn', () => {
    const theme = loadTheme(DEFAULTS.width, DEFAULTS.fontScale);

    expect(theme.layoutScale).toBe(1);
    expect(theme.touchTarget.primary).toBe(88);
    expect(theme.touchTarget.comfortable).toBe(64);
    expect(theme.spacing.md).toBe(16);
  });

  it('shrinks the whole UI when display size has narrowed the viewport', () => {
    const normal = loadTheme(DEFAULTS.width, DEFAULTS.fontScale);
    const magnified = loadTheme(300, DEFAULTS.fontScale);

    // Every kind of token has to follow, not just type — the complaint was that the UI
    // as a whole was too big.
    expect(magnified.layoutScale).toBeLessThan(1);
    expect(magnified.fontSize.body).toBeLessThan(normal.fontSize.body);
    expect(magnified.touchTarget.primary).toBeLessThan(normal.touchTarget.primary);
    expect(magnified.spacing.lg).toBeLessThan(normal.spacing.lg);
    expect(magnified.radius.card).toBeLessThanOrEqual(normal.radius.card);
  });

  it('hands type sizing back to the platform as the font setting rises', () => {
    const normal = loadTheme(DEFAULTS.width, 1);
    const largeText = loadTheme(DEFAULTS.width, 1.8);

    // Our own base shrinks, because the OS is about to multiply it by 1.8.
    expect(largeText.fontSize.body).toBeLessThan(normal.fontSize.body);
    // What the user ends up seeing is still bigger than before — the setting is honoured,
    // it just no longer compounds with an already-large base.
    expect(largeText.fontSize.body * 1.8).toBeGreaterThan(normal.fontSize.body);
  });

  it('does not shrink touch targets when only the font setting changed', () => {
    // Font size scales text, not layout. Shrinking buttons here would be a regression.
    const normal = loadTheme(DEFAULTS.width, 1);
    const largeText = loadTheme(DEFAULTS.width, 1.8);

    expect(largeText.touchTarget.primary).toBe(normal.touchTarget.primary);
    expect(largeText.spacing.md).toBe(normal.spacing.md);
  });

  it('keeps touch targets above Android’s minimum at the worst combination', () => {
    const worst = loadTheme(240, 1.8);

    expect(worst.layoutScale).toBe(MIN_LAYOUT_SCALE);
    expect(worst.touchTarget.min).toBeGreaterThanOrEqual(TOUCH_TARGET_FLOOR_DP);
    expect(worst.touchTarget.comfortable).toBeGreaterThanOrEqual(TOUCH_TARGET_FLOOR_DP);
    expect(worst.touchTarget.primary).toBeGreaterThanOrEqual(TOUCH_TARGET_FLOOR_DP);
  });

  it('does not inflate the design on a tablet-sized viewport', () => {
    const tablet = loadTheme(1024, 1);
    const phone = loadTheme(DEFAULTS.width, 1);

    expect(tablet.layoutScale).toBe(1);
    expect(tablet.fontSize.display).toBe(phone.fontSize.display);
  });

  it('keeps line heights proportional to the type they wrap', () => {
    for (const [width, fontScale] of [
      [DEFAULTS.width, 1],
      [300, 1.4],
      [240, 1.8],
    ] as const) {
      const theme = loadTheme(width, fontScale);
      for (const variant of ['display', 'title', 'body', 'label', 'caption'] as const) {
        expect(theme.lineHeight[variant]).toBeGreaterThan(theme.fontSize[variant]);
      }
    }
  });

  it('leaves the pill radius alone, since it is a sentinel and not a measurement', () => {
    expect(loadTheme(240, 1).radius.pill).toBe(100);
  });
});
