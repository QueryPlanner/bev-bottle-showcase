import { describe, it, expect } from 'vitest';
import { THEMES, getTheme } from '../src/themes.js';

describe('THEMES', () => {
  it('has 5 themes with unique ids', () => {
    expect(THEMES).toHaveLength(5);
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme has a valid 6-digit hex color', () => {
    for (const t of THEMES) expect(t.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('every theme has non-empty required copy fields', () => {
    for (const t of THEMES) {
      for (const field of ['name', 'flavor', 'pillar', 'copy', 'source']) {
        expect(typeof t[field]).toBe('string');
        expect(t[field].length).toBeGreaterThan(0);
      }
    }
  });

  it('exactly three themes are documented brand pillars', () => {
    expect(THEMES.filter((t) => t.documented === true)).toHaveLength(3);
  });

  it('getTheme looks up by id', () => {
    expect(getTheme('hydrate').name).toBe('Hydrate');
    expect(getTheme('nonexistent')).toBeUndefined();
  });

  it('colors match the values sampled from the brand book', () => {
    // pixel-sampled from brand-guidelines/brand book- bev.pdf: page 24
    // (color palette) for the primaries + secondary swatches, page 1
    // (primary logo) for the wordmark ink.
    expect(getTheme('hydrate').color).toBe('#1C00FF');
    expect(getTheme('perform').color).toBe('#FE412E');
    expect(getTheme('recover').color).toBe('#FED403');
    expect(getTheme('berry').color).toBe('#9E3A35');
    expect(getTheme('signature').color).toBe('#0F131D');
  });
});
