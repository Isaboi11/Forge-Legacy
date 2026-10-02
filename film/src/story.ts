// Words and numbers that appear in the film's own graphics (not the app's screens).
// Numbers marked SEED come from Jordan's seeded year and must be re-read from the real Legacy screen
// before the final render — the film never states a number the app doesn't show.

export const LEGACY_CARDS = [
  { k: 'CHAPTER I · SEALED', n: 'The Return', m: 'Jan – Apr · 48 workouts' /* SEED */ },
  { k: 'CHAPTER II · SEALED', n: 'Stronger Than Before', m: 'May – Aug · 61 workouts' /* SEED */ },
  // Replaces the mock-up's squad card ("The people who noticed" is not in the app).
  { k: 'ACCOMPLISHMENT', n: 'Bench Press 235', m: 'Personal record · June' /* SEED */ },
  { k: 'ALBUM', n: '', m: 'January → September', tiles: true },
];

export const MEDAL_LABEL = 'HONOR EARNED'; // the ceremony's own eyebrow; the honor's name is added from the seed

export const END = {
  wordmark: 'FORGE LEGACY',
  headline: ['Get stronger.', 'Keep the proof.'],
  one: 'Lifting, running and nutrition. One app.',
  sub: 'Your record is yours. We never charge for your history.',
  url: 'forgelegacy.app',
};

// The soundtrack. Until the licensed track arrives: the mock-up's own score, rendered by capture/mock-score.mjs
// (git-ignored, regenerate with `node capture/mock-score.mjs`). Placeholder only, never ships.
export const SCORE: string | null = 'music/mock-score.wav';
