// The film's clock, ported verbatim from the approved mock-up (artifact CYw5vmuyKNaJi6iVEPvS3d).
// "Film time" t runs 0..20 and drives every move; reading HOLDS stretch it into ~29 s of real time,
// so a caption can sit still long enough to read without the choreography being re-timed.

export const DUR = 20;

export const E = {
  lin: (x: number) => x,
  inQ: (x: number) => x * x,
  outQ: (x: number) => 1 - (1 - x) * (1 - x),
  inC: (x: number) => x * x * x,
  outC: (x: number) => 1 - Math.pow(1 - x, 3),
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  io4: (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outBack: (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
};
export type Ease = keyof typeof E;

export const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const P = (t: number, a: number, b: number) => cl((t - a) / (b - a));
export const L = (a: number, b: number, p: number) => a + (b - a) * p;
export const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) =>
  t < a || t > b ? 0 : Math.min(E.outC(P(t, a, a + fi)), 1 - E.inQ(P(t, b - fo, b)));

/* Reading holds: [filmStart, filmEnd, extra real seconds]. A negative extra is a cut (no real time at all).
   [11.45, 13.95] is the squad shot (PO 10-02: "add the squads" — the mock-up's old squad slot, between the missed
   week and the pull-back): 6.72 s, chosen so the pull-back (film 14.0) lands on the score's beat grid — the second
   drop at TURN + 64 beats = 34.12 s (capture/score-moments.py). */
// PO 10-01, second pass: "simplify… someone watching will see and understand right away" — one action per shot.
// Shot 2 is one tap → the record; shot 3 is Jordan's message → Holt's proposal. Earlier notes, still true:
// PO 10-01 after the first rough cut: "the home screen and the first active workout screen … should be seen
// for a little longer. Feels really rushed." → Home +1.0 s ([2.15, 2.2]), the lit squat screen +0.8 s ([2.85, 2.9]
// 2.0 → 2.8), and shot 2's logging +2.0 s ([5.3, 5.35]) so the record card and the rest ring can be read. Shot 3 +2.0 s
// ([7.0, 7.05]) for the simplified Holt exchange (one message, the proposal, "Changed").
// PO 10-02: Home's Welcome back held ~2 s longer ([10.95, 11.3] 0.6 → 2.4) so its lift can be seen; shot 5's line is
// read after the pull-back ([14.9, 15.05], replacing [13.97, 14.0] and [14.9, 15.0]).
// PO 10-02: shot 3 is now Holt BUILDING a program (message → his words over the program → the program's screen): +4.7 s,
// with Jordan's message and Holt's reply each held still a beat longer (recordings.json coach.pauses).
// PO 10-02 (later): "simplify" — the shot ends on Holt's reply over his program card, which is what lifts; the
// program screen is gone and the message → reply cut is a dissolve. Net +2 s over 10-01.
// PO 10-02: the opening screen holds 1 s longer ([0.55, 1.3] 1.0 → 2.0).
export const HOLDS: [number, number, number][] = [
  [0.55, 1.3, 2.0], [2.15, 2.2, 1.0], [2.85, 2.9, 2.8], [5.3, 5.35, 0.6], [5.78, 5.82, 2.0], [7.0, 7.05, 3.05], [9.35, 9.4, 2.0], [10.95, 11.3, 2.4],
  [11.45, 13.95, 4.22], [14.9, 15.05, 3.6], [16.5, 16.55, 2.2], [16.75, 17.2, 0.6], [18.7, 20, 1.0],
];
const KN: [number, number][] = [[0, 0]];
(() => {
  let rr = 0, ff = 0;
  for (const h of HOLDS) {
    rr += h[0] - ff; KN.push([rr, h[0]]);
    rr += h[1] - h[0] + h[2]; KN.push([rr, h[1]]);
    ff = h[1];
  }
  rr += DUR - ff; KN.push([rr, DUR]);
})();
export const RDUR = KN[KN.length - 1][0];
function mapK(v: number, i: 0 | 1, j: 0 | 1) {
  for (let k = 1; k < KN.length; k++) {
    if (v <= KN[k][i]) {
      const a = KN[k - 1], b = KN[k], span = b[i] - a[i];
      return span ? a[j] + (b[j] - a[j]) * ((v - a[i]) / span) : b[j];
    }
  }
  return KN[KN.length - 1][j];
}
export const filmAt = (r: number) => mapK(r, 0, 1);
export const realAt = (f: number) => mapK(f, 1, 0);

type Keys = Record<string, number>;
type Track = [number, Keys, Ease][];
export function buildTrack(keys: [number, Keys, Ease?][]): Track {
  let acc: Keys = {};
  return keys.map((k) => { acc = { ...acc, ...k[1] }; return [k[0], { ...acc }, k[2] ?? 'io'] as [number, Keys, Ease]; });
}
export function sample(tr: Track, t: number): Keys {
  if (t <= tr[0][0]) return tr[0][1];
  for (let i = 1; i < tr.length; i++) {
    if (t <= tr[i][0]) {
      const a = tr[i - 1][1], b = tr[i][1], p = E[tr[i][2]](P(t, tr[i - 1][0], tr[i][0]));
      const o: Keys = {};
      for (const k in b) o[k] = L(a[k], b[k], p);
      return o;
    }
  }
  return tr[tr.length - 1][1];
}
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- phone path ---------- */
const PT = buildTrack([
  [0.0, { x: 300, y: 10, z: 0, rx: 3, ry: 344, rz: 0, s: 0.96 }],
  [1.38, { y: 0, rx: 4, ry: 350, s: 1 }, 'lin'],
  [1.75, { y: -50, z: 160, rx: 8, ry: 170 }, 'inQ'],
  [2.15, { y: 0, z: 0, rx: 6, ry: -12 }, 'outC'],
  [2.4, { rx: 6, ry: -14 }],
  [2.75, { x: 320, rx: 4, ry: -8, s: 1.06 }],
  [5.3, { rx: 3, ry: -4, s: 1.08 }],
  [5.75, { x: 300, rx: 4, ry: 16, rz: -1, s: 1.04 }],
  [8.9, { rx: 3, ry: 10, s: 1.07 }],
  [9.3, { rx: 6, ry: -20, rz: 1, s: 1.02 }],
  [11.3, { ry: -14, s: 1.04 }],
  [14.0, { ry: -14, s: 1.04 }],
  // PO 10-02: room between the phone and shot 5's caption (the phone sits 34 px higher).
  [14.85, { x: 0, y: 6, rx: 8, ry: 0, rz: 0, s: 0.64 }, 'io4'],
  [17.3, { y: -4, ry: -6, s: 0.62 }],
  [18.15, { x: 470, y: 20, rx: 5, ry: -20, s: 0.8 }],
  [20.0, { x: 480, rx: 4, ry: -15, s: 0.8 }],
]);
export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number };
export function pose(t: number, portrait: boolean): Pose {
  const p = { ...sample(PT, t) } as Pose;
  if (portrait) {
    const endMix = E.io(P(t, 17.3, 18.15));
    p.x = L(p.x * 0.08, 0, endMix);
    p.y = p.y + 230 + 30 * P(t, 14, 14.8) + endMix * 160;
    p.s *= 1.05;
  } else p.s *= 0.9;
  return p;
}

/* ---------- date counter (day of year) ----------
   Changed from the mock-up: shot 2 is filmed on Mon Jan 19, so the counter steps 5 → 19 during the turn
   (a first-ever lift can't be a record; Jordan's 225 × 5 beats a 215 × 5 from Jan 15). */
const DT = buildTrack([
  [0, { d: 5 }], [1.4, { d: 5 }], [2.45, { d: 19 }, 'io'], [5.35, { d: 19 }], [5.8, { d: 41 }],
  [9.1, { d: 41 }], [9.3, { d: 65 }], [9.45, { d: 65 }], [10.55, { d: 75 }, 'lin'], [14.15, { d: 75 }],
  [14.9, { d: 100 }, 'io'], [15.0, { d: 100 }], [16.45, { d: 365 }, 'io'], // PO 10-02: the year is full while the Legacy pieces sit
]);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function doyLabel(d: number) {
  d = Math.max(1, Math.min(365, Math.round(d)));
  let m = 0;
  while (d > MD[m]) { d -= MD[m]; m++; }
  return MONTHS[m] + ' ' + d;
}
export const doyAt = (t: number) => sample(DT, t).d;

/* ---------- captions ---------- */
export type Spot = { x: number; y: number; w: number; h: number };
// `read`: seconds the problem line is read before the strike (default 1.1).
export type Cap = { a: number; b: number; text: string; pain?: string; spot?: Spot; wide?: boolean; read?: number; id?: string };
export const readOf = (c: Cap) => c.read ?? 1.1;
export const CAPS: Cap[] = [
  // PO 10-01: generic to any time of year (research: a median 70% gone within 100 days — the notch on the counter),
  // and an answer as the phone turns into Forge Legacy.
  { a: 0.25, b: 1.45, text: 'Most people quit their workout app *within 100 days.*' },
  { a: 1.95, b: 2.5, text: "Let's *change that.*" },
  { a: 2.85, b: 5.45, pain: 'Logging felt like homework.', text: 'One tap *per set.*' }, // outlines come from the take
  { a: 5.78, b: 8.95, pain: 'Stuck for weeks.', text: 'Your AI coach *helps you move forward.*' }, // PO 10-02
  { a: 9.35, b: 11.4, pain: 'Miss a week, start over.', text: 'Miss a week. *Keep your progress.*' },
  { a: 11.52, b: 13.9, pain: 'Training alone.', text: 'Your squad *keeps you showing up.*', id: 'squad' }, // PO 10-02: the squad shot
  // PO 10-02: "I can't see those words… it crosses them out without me knowing what it's saying" — the line now
  // waits for the pull-back (the phone small and centred, Day 100, the chapters out), is larger, and reads 1.8 s.
  { a: 14.92, b: 17.4, pain: 'Numbers nobody looks at.', text: 'A year that tells *your story.*', wide: true, read: 1.8 },
];
// The web loop's one-app line, in the squad caption's place. It starts as the cut lands (realAt(11.72) = 28.03; the
// segment opens at 27.97) and is gone before the cut to the end card (realAt(13.85) = 33.75). A two-word problem line,
// read in 0.6 s, so the run's lift has time to be read.
export const CAP_ONEAPP: Cap = { a: 11.72, b: 13.85, pain: 'Three apps.', text: 'Lifting, running and food. *One app.*', read: 0.6 };
export const capsFor = (oneApp: boolean) => (oneApp ? CAPS.map((c) => (c.id === 'squad' ? CAP_ONEAPP : c)) : CAPS);

/* ---------- the 15 s ad (PO 10-02: "whatever converts best") ----------
   Shots 1, 4 and 6 — the quit-by-day-100 opening and the turn, the missed week, the end card — hard cuts on the bar
   lines of its own score (`python capture/score-moments.py ad15`): [adStart, filmRealStart, filmRealEnd] in real
   seconds. The end card's last frame holds to 15.0. */
export const AD15_DUR = 15;
export const AD15: [number, number, number][] = [[0, 0, 5.32], [5.32, 20.75, 26.51], [11.08, 44.27, 47.47]];
const splice = (segs: [number, number, number][], a: number) => {
  let i = segs.length - 1;
  while (i > 0 && a < segs[i][0]) i--;
  const [s0, from, to] = segs[i];
  return { r: Math.min(to, from + a - s0), seg: i };
};
export const adToFilm = (a: number) => splice(AD15, a).r;

/* ---------- the web loop (2026-10-03) ----------
   The homepage hero. A simulated 1,000-visitor panel (five AI personas, not real people) found the 47 s film's best line
   (Miss a week / Welcome back) arriving at 22 s, after most visitors had left; runners and macro trackers never saw a run
   or a food screen; and the end card's App Store badge contradicted the page's TestFlight button. So: shots 1–2 as they
   are (to the record), the missed week, the ONE-APP shot (Jordan's Sep 27 run → that day's food; capture/shot-oneapp.mjs)
   played in the squad shot's slot (its pose and light), then the Legacy pull-back, then the end card without the badge. Hard cuts on bar lines of
   its own score (`python capture/score-moments.py web`). [webStart, filmRealStart, filmRealEnd]. */
// PO 10-03 (second pass): "is it bad we left out the legacy part… our header is Get stronger. Keep the proof." → the
// Legacy pull-back is back (real 34.07–39.83, 3 bars), WITHOUT the medal wall and accomplishments (the panel: unreadable
// at phone size, and "1,000 Pound Club" told beginners the app is for strong people) — only Jordan's two chapter cards,
// large and stacked so their words read on a phone; the counter runs Sep 27 → Dec 31.
export const WEB: [number, number, number][] = [
  [0, 0, 11.08], [11.08, 20.75, 26.51], [16.84, 27.97, 33.73], [22.6, 34.07, 39.83], [28.36, 44.27, 47.47],
];
export const WEB_DUR = 31.56;
export const WEB_ONEAPP = 2;   // the segment that shows the one-app shot instead of the squad
export const WEB_LEGACY = 3;   // the Legacy pull-back: chapter cards only
export const webAt = (a: number) => splice(WEB, a);

/* ---------- shots (film time) ---------- */
export const SHOTS = [
  { id: 'gap', a: 0, b: 2.5 },
  { id: 'tap', a: 2.5, b: 5.6 },
  { id: 'coach', a: 5.6, b: 9.1 },
  { id: 'missed', a: 9.1, b: 11.45 },
  { id: 'squad', a: 11.45, b: 13.95 },
  { id: 'story', a: 13.95, b: 17.6 },
  { id: 'promise', a: 17.6, b: 20 },
] as const;
export type ShotId = (typeof SHOTS)[number]['id'];
