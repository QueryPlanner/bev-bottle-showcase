import { describe, it, expect } from 'vitest';
import { computeLabelLayout, relativeLuminance, pickTextColor, isValidHexColor } from '../src/labelTexture.js';
import { THEMES } from '../src/themes.js';

describe('isValidHexColor', () => {
  it('accepts 6-digit hex', () => {
    expect(isValidHexColor('#1C00FF')).toBe(true);
  });
  it('rejects shorthand, unprefixed, and named colors', () => {
    expect(isValidHexColor('blue')).toBe(false);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('1C00FF')).toBe(false);
  });
});

describe('relativeLuminance / pickTextColor', () => {
  it('white is bright, black is dark', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });
  it('picks dark ink text on the bright yellow theme', () => {
    expect(pickTextColor('#FED403')).toBe('#0F131D');
  });
  it('picks white text on the near-black signature theme', () => {
    expect(pickTextColor('#0F131D')).toBe('#FFFFFF');
  });
});

describe('computeLabelLayout', () => {
  it('uses the theme color as the band and a contrasting text color, for every theme', () => {
    for (const theme of THEMES) {
      const layout = computeLabelLayout(theme);
      expect(layout.bandColor).toBe(theme.color);
      expect(layout.textColor).toBe(pickTextColor(theme.color));
      expect(layout.elements.length).toBeGreaterThan(0);
    }
  });

  it('centers every element on the geometry\'s front (u=0.25), away from the UV wraparound seam', () => {
    const layout = computeLabelLayout(THEMES[0]);
    for (const el of layout.elements) {
      expect(el.x).toBeCloseTo(layout.width * 0.25, 5);
    }
  });

  it('keeps every element inside the canvas bounds', () => {
    for (const theme of THEMES) {
      const layout = computeLabelLayout(theme);
      for (const el of layout.elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.x).toBeLessThanOrEqual(layout.width);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('the big display-font element is the theme name, in caps', () => {
    for (const theme of THEMES) {
      const layout = computeLabelLayout(theme);
      const nameEl = layout.elements.find((e) => e.font === 'display');
      expect(nameEl).toBeDefined();
      expect(nameEl.text).toBe(theme.name.toUpperCase());
    }
  });
});
