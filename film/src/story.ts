// Words and numbers that appear in the film's own graphics (not the app's screens).
// Numbers marked SEED come from Jordan's seeded year and must be re-read from the real Legacy screen
// before the final render — the film never states a number the app doesn't show.

// PO 10-02: the floating chapters are the app's own "THIS CHAPTER" cards, captured from each chapter's screen on
// Oct 2 (capture/shot-5.mjs, 4x): Chapter I — The Return · 82 workouts · 3 honors · 115 days; Chapter II — Stronger Than
// Before · 89 workouts · 3 honors · 122 days. `w`/`h` = the card's size on the phone (CSS px).
export const LEGACY_CARDS = [
  { src: 'rec/story-lift/chapter-1.png', w: 366, h: 219 },
  { src: 'rec/story-lift/chapter-2.png', w: 366, h: 245 },
];

// The real 1,000 Pound Club medallion (struck face) from its honor sheet; the words are the honor sheet's and the
// ceremony's own ("HONOR EARNED" is the ceremony eyebrow; earned May 12 2026).
// PO 10-02 "more awards… some accomplishments… more in depth": four more of Jordan's real medals (each from its honor
// sheet) and three of his accomplishment cards (Legacy's Accomplishments strip, the featured three).
export const MORE_MEDALS = [
  { src: 'rec/story-lift/medal-squat-315.png', name: 'Squat 315' },
  { src: 'rec/story-lift/medal-deadlift-405.png', name: 'Deadlift 405' },
  { src: 'rec/story-lift/medal-first-10k.png', name: 'First 10K Run' },
  { src: 'rec/story-lift/medal-miles-100.png', name: '100 Lifetime Running Miles' },
];
export const ACCOMPLISHMENTS = [
  { src: 'rec/story-lift/acc-bench-235.png', w: 184, h: 200 },
  { src: 'rec/story-lift/acc-dl-475.png', w: 184, h: 200 },
  { src: 'rec/story-lift/acc-first-10k.png', w: 184, h: 200 },
];

export const MEDAL = { src: 'rec/story-lift/medal.png', size: 200, eyebrow: 'HONOR EARNED', name: '1,000 Pound Club' };

export const END = {
  wordmark: 'FORGE LEGACY',
  headline: ['Get stronger.', 'Keep the proof.'],
  one: 'Lifting, running and nutrition. One app.',
  url: 'forgelegacy.app',
};

// The soundtrack. Until the licensed track arrives: the mock-up's own score, rendered by capture/mock-score.mjs
// (git-ignored, regenerate with `node capture/mock-score.mjs`). Placeholder only, never ships.
export const SCORE: string | null = 'music/mock-score.wav';
