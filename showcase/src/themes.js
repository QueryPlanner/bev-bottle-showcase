// Colors are not eyeballed — they're sampled pixel values from the swatches
// and wordmark in brand-guidelines/brand book- bev.pdf (color palette page +
// primary logo page). The three "documented: true" themes carry the meaning
// the brand book itself assigns them (see its "Logo Extensions" slide);
// "documented: false" themes are honest extensions built from the book's
// secondary swatches / wordmark ink, not brand pillars the book names.
export const THEMES = [
  {
    id: 'hydrate',
    name: 'Hydrate',
    flavor: 'Original',
    color: '#1C00FF',
    pillar: 'The Foundation',
    documented: true,
    copy: 'Energy starts with hydration. Recovery starts with hydration. Performance starts with hydration.',
    source: 'Brand book, "Logo Extensions": Blue — Hydrate, the foundation.',
  },
  {
    id: 'perform',
    name: 'Perform',
    flavor: 'Citrus',
    color: '#FE412E',
    pillar: 'The Spark',
    documented: true,
    copy: 'Movement. Focus. Energy. The active side of the brand — the part that helps people do more.',
    source: 'Brand book, "Logo Extensions": Red — Perform, the spark.',
  },
  {
    id: 'recover',
    name: 'Recover',
    flavor: 'Mango',
    color: '#FED403',
    pillar: 'The Reward',
    documented: true,
    copy: "Rest. Recovery. Restoration. The reminder that wellness isn't only about output.",
    source: 'Brand book, "Logo Extensions": Yellow — Recover, the reward.',
  },
  {
    id: 'berry',
    name: 'Berry',
    flavor: 'Berry',
    color: '#9E3A35',
    pillar: 'Secondary palette',
    documented: false,
    copy: "An extended colorway pulled from the brand book's secondary swatches — not one of the three documented pillars, shown here as a plausible fourth flavor.",
    source: 'Brand book, color palette page: secondary maroon swatch.',
  },
  {
    id: 'signature',
    name: 'Signature',
    flavor: 'Unflavored',
    color: '#0F131D',
    pillar: 'Wordmark ink',
    documented: false,
    copy: 'A monochrome edition set in the ink color the "bev." wordmark itself is always printed in.',
    source: 'Brand book, primary logo page: wordmark ink color.',
  },
];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id);
}
