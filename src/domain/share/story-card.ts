/**
 * The share PICTURE — the 1080×1920 image a finished workout or run goes out as.
 *
 * ══ WHAT THIS REPLACES ══
 *
 * Until now a session left the app as one line of text ("Push Day — sealed. 12,400 lb moved."). The only
 * real image the app could make was the transformation card. The PO asked for what Strava does with a
 * run: the athlete's own photo with the numbers on it, or a card good enough to post on its own — three
 * styles for a lifting day, three for a run (PO 2026-10-01, with a visual reference).
 *
 * ══ ONE DESCRIPTION, TWO RENDERERS ══
 *
 * Same arrangement `card-draw.ts` made for the share card, for the same reason: the picture is drawn on a
 * canvas in the browser and by react-native-svg on a phone, and two hand-written layouts drift. So every
 * style is resolved HERE into an ordered list of primitives with every number decided — positions, sizes,
 * wrapped lines, the route's projected points — and the renderers only paint. The preview on screen is
 * the same list drawn small, so the picture you choose is the picture that leaves.
 *
 * ══ THE STORY FRAME HAS A DEAD ZONE ══
 *
 * Instagram draws its own bars over the top and bottom of a story (the profile row, the reply box). Every
 * piece of text sits between `SAFE_TOP` and `SAFE_BOTTOM`; only the ground, the photo and decorative rules
 * may run into those bands. The tests hold this for every style.
 *
 * ══ NOTHING HERE IS MADE UP ══
 *
 * Each number comes from the session. A session without a PR has no PR line; a run without a stored climb
 * has no climb row; there is no elevation CURVE at all, because the app stores the climb as one number
 * (Route-And-Elevation-Persistence-Amendment-001 D-RTE-3/4) — drawing a profile would be inventing one.
 *
 * ══ THE ROUTE IS A PER-SHARE CHOICE, OFF UNTIL TICKED (D-RS-3) ══
 *
 * `showRoute` is the caller's tick, never a property of the session. With it off, every run style still
 * composes — the route card's panel leads with the distance instead of the line.
 *
 * ⚠ PURE, AND RELATIVE `.ts` IMPORTS ONLY — `node --test` cannot resolve `@/`.
 */

import { cardioMarkerLabel, deriveLead, recapCardioFrom, type CardioLike } from './recap-stats.ts';
import { measureText, wrapText, type CardFace } from './text-measure.ts';
import { decodePolyline } from '../run/route-privacy.ts';
import { displayGain, fmtClock, fmtPace, toDistance, toPace } from '../run/run-core.ts';
import { convertMeasure, displayWeight, type UnitSystem } from '../settings/units.ts';

// ── frame ─────────────────────────────────────────────────────────────────────

/** Instagram / TikTok story size. The export is exactly this; the preview is this list drawn small. */
export const STORY_W = 1080;
export const STORY_H = 1920;
/** No text above this line or below the next — that is where the platform's own bars sit. */
export const SAFE_TOP = 190;
export const SAFE_BOTTOM = 1670;

// ── palette — the Forge dark theme, fixed: the picture is a brand artifact and does not follow the app theme ──

const INK = '#F0EDE8';
const MUTED = '#9E9890';
const BRONZE = '#BA8654';
const BRONZE_HI = '#C99767';
const BASE = '#05080A';
const STONE = '#0C1013';
const LINE = '#24242A';
/** The anvil's colour on the bronze tile, and the PR badge's lettering. */
export const ON_BRONZE = '#1A1206';

/** The anvil, in the 24×24 viewBox the app's mark uses — identical to the other exporters' copy. */
export const ANVIL_PATH =
  'M10.9 3.2H13.1V15H10.9ZM7.6 7.1L9.6 5.8V15H7.6ZM16.4 7.1L14.4 5.8V15H16.4ZM6.8 15.4H17.2V16.2H6.8ZM5.6 16.6H18.4V17.4H5.6ZM4.4 17.8H19.6V18.6H4.4Z';

/** The address printed under the badge on every picture (PO 2026-10-01: a picture on Instagram cannot be tapped). */
export const SITE = 'forgelegacy.app';

// ── the styles ────────────────────────────────────────────────────────────────

export type StoryKind = 'lift' | 'run';
export type StoryStyle = 'photo-stats' | 'engraved' | 'ledger' | 'photo-route' | 'route-card' | 'sticker';

export interface StyleSpec {
  id: StoryStyle;
  label: string;
  /** `required` cannot be exported without a photo; `optional` uses one when there is one. */
  photo: 'required' | 'optional' | 'none';
  /** A see-through PNG meant to be laid over the athlete's own story. */
  transparent: boolean;
}

export const STORY_STYLES: Record<StoryKind, StyleSpec[]> = {
  lift: [
    { id: 'photo-stats', label: 'Photo Stats', photo: 'required', transparent: false },
    { id: 'engraved', label: 'Engraved', photo: 'optional', transparent: false },
    { id: 'ledger', label: 'Ledger', photo: 'none', transparent: false },
  ],
  run: [
    { id: 'photo-route', label: 'Photo Route', photo: 'required', transparent: false },
    { id: 'route-card', label: 'Route Card', photo: 'none', transparent: false },
    { id: 'sticker', label: 'Sticker', photo: 'none', transparent: true },
  ],
};

export const styleSpec = (id: StoryStyle): StyleSpec =>
  [...STORY_STYLES.lift, ...STORY_STYLES.run].find((s) => s.id === id) ?? STORY_STYLES.lift[0];

/** Which style a share opens on: the photo style when there is a photo, the no-photo card when there isn't. */
export const defaultStyle = (kind: StoryKind, hasPhoto: boolean): StoryStyle =>
  kind === 'lift' ? (hasPhoto ? 'photo-stats' : 'ledger') : hasPhoto ? 'photo-route' : 'route-card';

// ── the input ─────────────────────────────────────────────────────────────────

export interface LatLon {
  lat: number;
  lon: number;
}

export interface StoryTopSet {
  name: string;
  /** Unit-free, already converted: "485 × 1", "BW × 12". */
  value: string;
  pr: boolean;
}

export interface StoryInput {
  kind: StoryKind;
  title: string;
  chapter: string | null;
  /** When the session happened, ISO. Null draws no date rather than today's. */
  when: string | null;
  durationSec: number;
  units: UnitSystem;
  lift: {
    /** Canonical pounds. */
    volumeLb: number;
    sets: number;
    exercises: number;
    top: StoryTopSet[];
    /** The heaviest record this session set, canonical pounds — null when it set none. */
    pr: { exercise: string; weightLb: number; reps: number } | null;
  };
  run: {
    distanceMi: number | null;
    paceSecPerMi: number | null;
    floors: number | null;
    climbM: number | null;
    route: LatLon[] | null;
  };
}

/** The photo's natural size, when there is one. The pixels never come here — only the ops' index does. */
export type StoryPhoto = { w: number; h: number } | null;

// ── the draw list ─────────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextRun {
  text: string;
  size: number;
  face: CardFace;
  weight: '500' | '600' | '700' | '800';
  fill: string;
  /** 0–1. Kept apart from `fill` so both renderers can apply it the same way. */
  opacity?: number;
  italic?: boolean;
  letterSpacing?: number;
}

export interface GradStop {
  at: number;
  color: string;
  opacity: number;
}

export type StoryOp =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; radius?: number; fill?: string; fillOpacity?: number; stroke?: string; strokeOpacity?: number; strokeWidth?: number }
  /** A top-to-bottom gradient filling `rect`. */
  | { kind: 'vgrad'; x: number; y: number; w: number; h: number; stops: GradStop[] }
  /** The athlete's photo, cover-fitted into `frame` (resolved to `image`) and clipped to it. */
  | { kind: 'photo'; frame: Rect; image: Rect; opacity: number }
  /** Runs drawn left to right on one alphabetic baseline; `anchor` aligns the whole line. */
  | { kind: 'text'; x: number; y: number; anchor: 'start' | 'middle' | 'end'; runs: TextRun[] }
  | { kind: 'path'; d: string; stroke?: string; strokeOpacity?: number; strokeWidth?: number; fill?: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; stroke?: string; strokeWidth?: number }
  /** The bronze tile with the anvil — `ANVIL_PATH` on `ON_BRONZE`. */
  | { kind: 'mark'; x: number; y: number; size: number };

export interface StoryDrawing {
  width: number;
  height: number;
  style: StoryStyle;
  /** No ground at all — the PNG keeps its alpha. */
  transparent: boolean;
  /** The style wants a photo and has none; the screen must offer one before exporting. */
  needsPhoto: boolean;
  ops: StoryOp[];
}

// ── formatting ────────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parse = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
/** "Wed, Oct 1" */
export const shortDate = (d: Date) => `${DAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
/** "Wednesday, October 1" */
export const longDate = (d: Date) => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
/** "October 1, 2026" */
export const fullDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
/** "6:42 PM" */
export const clockTime = (d: Date) => {
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** "14,820" — written out rather than `toLocaleString`, which some engines leave ungrouped. */
export const groupInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** "14.8K" from 10,000 up, so a stat column never has to shrink a five-digit number. */
export function compactInt(n: number): string {
  const r = Math.round(n);
  if (r >= 100_000) return `${Math.round(r / 1000)}K`;
  if (r >= 10_000) return `${(r / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return groupInt(r);
}

/** "52 min", "1 hr 12 min" — the plaque's and the ledger's way of saying how long. */
export function minutesLabel(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} hr ${m % 60} min` : `${h} hr`;
}

const weightOf = (lb: number, units: UnitSystem) => displayWeight(lb, units);

interface Stat {
  label: string;
  value: string;
  unit: string;
}

/** The lifting day's three: Time · Volume · Sets — Volume drops out for a day with nothing on the bar. */
function liftStats(i: StoryInput): Stat[] {
  const out: Stat[] = [{ label: 'Time', value: fmtClock(i.durationSec), unit: '' }];
  if (i.lift.volumeLb > 0) {
    const v = weightOf(i.lift.volumeLb, i.units);
    out.push({ label: 'Volume', value: compactInt(v.value), unit: v.unit });
  } else {
    out.push({ label: 'Exercises', value: String(i.lift.exercises), unit: '' });
  }
  out.push({ label: 'Sets', value: String(i.lift.sets), unit: '' });
  return out;
}

/** The run's three: Distance · Pace · Time — each only when the session holds it. */
function runStats(i: StoryInput): Stat[] {
  const out: Stat[] = [];
  const unit = i.units === 'metric' ? 'km' : 'mi';
  if (i.run.distanceMi != null && i.run.distanceMi > 0) {
    const d = toDistance(i.run.distanceMi, i.units);
    out.push({ label: 'Distance', value: d >= 100 ? d.toFixed(1) : d.toFixed(2), unit });
  } else if (i.run.floors != null && i.run.floors > 0) {
    out.push({ label: 'Floors', value: groupInt(i.run.floors), unit: '' });
  }
  if (i.run.paceSecPerMi != null && i.run.paceSecPerMi > 0) {
    out.push({ label: 'Pace', value: fmtPace(toPace(i.run.paceSecPerMi, i.units)), unit: `/${unit}` });
  }
  out.push({ label: 'Time', value: fmtClock(i.durationSec), unit: '' });
  return out;
}

const climbText = (i: StoryInput): string | null => {
  if (i.run.climbM == null || !(i.run.climbM > 0)) return null;
  const g = displayGain(i.run.climbM, i.units === 'metric');
  return `+${groupInt(g.value)} ${g.unit}`;
};

// ── text fitting ──────────────────────────────────────────────────────────────

const width = (runs: TextRun[]) => runs.reduce((n, r) => n + measureText(r.text, r.size, r.face, r.letterSpacing ?? 0), 0);

/** Cut `text` with an ellipsis until it fits. A single word longer than the line still gets cut. */
export function ellipsize(text: string, maxW: number, size: number, face: CardFace, ls = 0): string {
  if (measureText(text, size, face, ls) <= maxW) return text;
  let t = text;
  while (t.length > 1 && measureText(`${t.trimEnd()}…`, size, face, ls) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Shrink to fit one line, down to `min`, then ellipsize — a long exercise name never runs off the picture. */
function fitLine(text: string, maxW: number, size: number, face: CardFace, min: number, ls = 0): { text: string; size: number } {
  let s = size;
  while (s > min && measureText(text, s, face, ls) > maxW) s = Math.max(min, Math.floor(s * 0.94));
  return { text: ellipsize(text, maxW, s, face, ls), size: s };
}

/** Wrap to at most `maxLines`, shrinking first; the last line takes an ellipsis if it still doesn't fit. */
export function fitLines(text: string, maxW: number, size: number, face: CardFace, min: number, maxLines: number): { lines: string[]; size: number } {
  let s = size;
  for (;;) {
    const lines = wrapText(text, maxW, s, face);
    const fits = lines.length <= maxLines && lines.every((l) => measureText(l, s, face) <= maxW);
    if (fits || s <= min) {
      if (fits) return { lines, size: s };
      const kept = lines.slice(0, maxLines);
      const rest = lines.slice(maxLines - 1).join(' ');
      kept[maxLines - 1] = ellipsize(lines.length > maxLines ? `${rest}…` : rest, maxW, s, face);
      return { lines: kept.map((l) => ellipsize(l, maxW, s, face)), size: s };
    }
    s = Math.max(min, Math.floor(s * 0.94));
  }
}

/** Scale every run of a line together until the line fits — the big number and its unit stay in proportion. */
function fitRuns(runs: TextRun[], maxW: number): TextRun[] {
  const w = width(runs);
  if (w <= maxW) return runs;
  const k = maxW / w;
  return runs.map((r) => ({ ...r, size: Math.floor(r.size * k) }));
}

/**
 * One run of text. A space at either END becomes a no-break space: SVG collapses edge whitespace inside a
 * `<tspan>`, so " lb" after "485" would draw as "485lb" on a phone while the canvas drew "485 lb".
 */
const run = (text: string, size: number, face: CardFace, weight: TextRun['weight'], fill: string, extra: Partial<TextRun> = {}): TextRun => ({
  text: text.replace(/^ /, ' ').replace(/ $/, ' '),
  size,
  face,
  weight,
  fill,
  ...extra,
});

// ── shared pieces ─────────────────────────────────────────────────────────────

/** `object-fit: cover`, centred. */
export function coverRect(frame: Rect, nat: { w: number; h: number }): Rect {
  const k = Math.max(frame.w / nat.w, frame.h / nat.h);
  const w = nat.w * k;
  const h = nat.h * k;
  return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
}

/** Badge, wordmark and the address under it, left-aligned at (x, y). */
function brandLeft(ops: StoryOp[], x: number, y: number, size = 64) {
  ops.push({ kind: 'mark', x, y, size });
  const tx = x + size + 22;
  ops.push({ kind: 'text', x: tx, y: y + size * 0.47, anchor: 'start', runs: [run('FORGE LEGACY', 26, 'sans', '700', INK, { letterSpacing: 8 })] });
  ops.push({ kind: 'text', x: tx, y: y + size * 0.97, anchor: 'start', runs: [run(SITE, 22, 'sans', '600', INK, { opacity: 0.86 })] });
}

/** The same three lines stacked and centred — the plaque's and the sticker's. Returns the y below it. */
function brandCentered(ops: StoryOp[], cx: number, y: number, size: number, ink = INK): number {
  ops.push({ kind: 'mark', x: cx - size / 2, y, size });
  ops.push({ kind: 'text', x: cx, y: y + size + 52, anchor: 'middle', runs: [run('FORGE LEGACY', 26, 'sans', '700', ink, { letterSpacing: 9 })] });
  ops.push({ kind: 'text', x: cx, y: y + size + 92, anchor: 'middle', runs: [run(SITE, 22, 'sans', '500', ink, { opacity: 0.62 })] });
  return y + size + 92;
}

/** A stat strip: label above, big value with its unit beside it, in `n` equal columns. Returns nothing; baseline is the value's. */
function statRow(ops: StoryOp[], stats: Stat[], left: number, w: number, valueBaseline: number, o: { valueSize: number; valueFace: CardFace; unitFill: string; labelAbove: boolean; labelFill: string; labelOpacity?: number }) {
  if (!stats.length) return;
  const colW = w / stats.length;
  const runsFor = (st: Stat, size: number) => [
    run(st.value, size, o.valueFace, o.valueFace === 'serif' ? '600' : '700', INK),
    ...(st.unit ? [run(` ${st.unit}`, Math.round(size * 0.46), 'sans', '600', o.unitFill)] : []),
  ];
  // ONE size for the whole strip, set by the widest value: "1:19:09" beside "20.5K lb" crowded its
  // neighbour when each column shrank on its own (PO's first real post, 10-01). The 40 is the gutter a
  // reader needs to see three numbers rather than one long one.
  const size = Math.floor(stats.reduce((m, st) => Math.min(m, o.valueSize * Math.min(1, (colW - 40) / width(runsFor(st, o.valueSize)))), o.valueSize));
  stats.forEach((s, i) => {
    const x = left + colW * i;
    const runs = runsFor(s, size);
    ops.push({ kind: 'text', x, y: valueBaseline, anchor: 'start', runs });
    const ly = o.labelAbove ? valueBaseline - o.valueSize - 22 : valueBaseline + 50;
    ops.push({ kind: 'text', x, y: ly, anchor: 'start', runs: [run(s.label.toUpperCase(), 25, 'sans', '700', o.labelFill, { letterSpacing: 4, opacity: o.labelOpacity })] });
  });
}

/** A title of up to two lines whose LAST baseline lands on `lastBaseline`. Returns the first line's top. */
function titleUp(ops: StoryOp[], text: string, x: number, maxW: number, lastBaseline: number, size: number, min: number): number {
  const f = fitLines(text, maxW, size, 'serif', min, 2);
  const lh = Math.round(f.size * 1.08);
  f.lines.forEach((line, i) => {
    const y = lastBaseline - (f.lines.length - 1 - i) * lh;
    ops.push({ kind: 'text', x, y, anchor: 'start', runs: [run(line, f.size, 'serif', '600', INK)] });
  });
  return lastBaseline - (f.lines.length - 1) * lh - f.size * 0.78;
}

/** The same, flowing DOWN from its first baseline. Returns the last baseline. */
function titleDown(ops: StoryOp[], text: string, x: number, maxW: number, firstBaseline: number, size: number, min: number): number {
  const f = fitLines(text, maxW, size, 'serif', min, 2);
  const lh = Math.round(f.size * 1.08);
  f.lines.forEach((line, i) => ops.push({ kind: 'text', x, y: firstBaseline + i * lh, anchor: 'start', runs: [run(line, f.size, 'serif', '600', INK)] }));
  return firstBaseline + (f.lines.length - 1) * lh;
}

// ── route ─────────────────────────────────────────────────────────────────────

/** Most phones record a fix a second; 600 points draw any run cleanly and keep the SVG small. */
const ROUTE_MAX_POINTS = 600;

/**
 * Fit a route into `box`, north up, longitude scaled by cos(latitude) — the same projection the in-app
 * route thumbnail uses (`routePath`), so the shape on the picture is the shape on Activity Detail.
 */
export function projectRoute(points: readonly LatLon[], box: Rect, pad: number): { d: string; start: { x: number; y: number }; end: { x: number; y: number } } | null {
  if (points.length < 2) return null;
  const stride = Math.ceil(points.length / ROUTE_MAX_POINTS);
  const pts0 = stride <= 1 ? [...points] : points.filter((_, i) => i % stride === 0);
  if (pts0[pts0.length - 1] !== points[points.length - 1]) pts0.push(points[points.length - 1]);
  const latMid = pts0.reduce((n, p) => n + p.lat, 0) / pts0.length;
  const kx = Math.cos((latMid * Math.PI) / 180) || 1;
  const xs = pts0.map((p) => p.lon * kx);
  const ys = pts0.map((p) => -p.lat);
  const minX = xs.reduce((a, b) => (b < a ? b : a), Infinity);
  const maxX = xs.reduce((a, b) => (b > a ? b : a), -Infinity);
  const minY = ys.reduce((a, b) => (b < a ? b : a), Infinity);
  const maxY = ys.reduce((a, b) => (b > a ? b : a), -Infinity);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const k = Math.min((box.w - pad * 2) / spanX, (box.h - pad * 2) / spanY);
  const offX = box.x + (box.w - spanX * k) / 2;
  const offY = box.y + (box.h - spanY * k) / 2;
  const xy = xs.map((x, i) => ({ x: (x - minX) * k + offX, y: (ys[i] - minY) * k + offY }));
  const d = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { d, start: xy[0], end: xy[xy.length - 1] };
}

function drawRoute(ops: StoryOp[], route: LatLon[] | null, box: Rect, pad: number, o: { line: string; width: number; casing: number }) {
  const p = route ? projectRoute(route, box, pad) : null;
  if (!p) return false;
  ops.push({ kind: 'path', d: p.d, stroke: '#000000', strokeOpacity: 0.45, strokeWidth: o.width + o.casing });
  ops.push({ kind: 'path', d: p.d, stroke: o.line, strokeWidth: o.width });
  const r = Math.max(11, o.width * 1.25);
  ops.push({ kind: 'circle', cx: p.start.x, cy: p.start.y, r, fill: INK, stroke: BASE, strokeWidth: r * 0.4 });
  ops.push({ kind: 'circle', cx: p.end.x, cy: p.end.y, r, fill: BRONZE, stroke: BASE, strokeWidth: r * 0.4 });
  return true;
}

/** Faint contour lines for the route card's panel — decoration, seeded so a session always draws the same. */
function contours(ops: StoryOp[], box: Rect, seed: number) {
  let s = seed || 1;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const rows = 7;
  for (let i = 0; i < rows; i++) {
    const base = box.y + ((i + 0.5) / rows) * box.h;
    const amp = box.h / rows / 2 - 6;
    const y = (t: number) => Math.min(box.y + box.h - 4, Math.max(box.y + 4, base + (rnd() * 2 - 1) * amp * t));
    const x0 = box.x + 2;
    const x3 = box.x + box.w - 2;
    const d = `M${x0} ${y(0.4).toFixed(1)} C${(x0 + box.w * 0.33).toFixed(1)} ${y(1).toFixed(1)} ${(x0 + box.w * 0.66).toFixed(1)} ${y(1).toFixed(1)} ${x3} ${y(0.4).toFixed(1)}`;
    ops.push({ kind: 'path', d, stroke: INK, strokeOpacity: 0.08, strokeWidth: 2 });
  }
}

const hash = (t: string) => {
  let h = 7;
  for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h;
};

// ── the six styles ────────────────────────────────────────────────────────────

const L = 72;
const W = STORY_W - L * 2;

function photoGround(ops: StoryOp[], photo: StoryPhoto) {
  ops.push({ kind: 'rect', x: 0, y: 0, w: STORY_W, h: STORY_H, fill: STONE });
  if (photo) {
    const frame = { x: 0, y: 0, w: STORY_W, h: STORY_H };
    ops.push({ kind: 'photo', frame, image: coverRect(frame, photo), opacity: 1 });
  } else {
    ops.push({ kind: 'vgrad', x: 0, y: 0, w: STORY_W, h: STORY_H, stops: [{ at: 0, color: BRONZE, opacity: 0.12 }, { at: 0.55, color: BRONZE, opacity: 0 }] });
  }
  // Readability, not decoration: the mark at the top and the whole stat block at the bottom sit on whatever
  // the athlete photographed.
  // Darker than it first shipped: the address under the badge washed out against a lit gym ceiling.
  ops.push({ kind: 'vgrad', x: 0, y: 0, w: STORY_W, h: 600, stops: [{ at: 0, color: BASE, opacity: 0.74 }, { at: 0.5, color: BASE, opacity: 0.4 }, { at: 1, color: BASE, opacity: 0 }] });
  ops.push({ kind: 'vgrad', x: 0, y: 760, w: STORY_W, h: STORY_H - 760, stops: [{ at: 0, color: BASE, opacity: 0 }, { at: 0.45, color: BASE, opacity: 0.74 }, { at: 1, color: BASE, opacity: 0.94 }] });
}

/** LIFT 1 — the athlete's photo, the numbers along the bottom. */
function photoStats(i: StoryInput, photo: StoryPhoto): StoryDrawing {
  const ops: StoryOp[] = [];
  photoGround(ops, photo);
  brandLeft(ops, L, SAFE_TOP + 10);

  let y = SAFE_BOTTOM - 20;
  if (i.lift.pr) {
    const w = weightOf(i.lift.pr.weightLb, i.units);
    const badgeW = Math.ceil(measureText('PR', 26, 'sans', 3)) + 36;
    ops.push({ kind: 'rect', x: L, y: y - 50, w: badgeW, h: 50, radius: 8, fill: BRONZE });
    ops.push({ kind: 'text', x: L + badgeW / 2, y: y - 15, anchor: 'middle', runs: [run('PR', 26, 'sans', '800', ON_BRONZE, { letterSpacing: 3 })] });
    const text = `${i.lift.pr.exercise} ${groupInt(w.value)} ${w.unit} × ${i.lift.pr.reps}`;
    const fit = fitLine(text, W - badgeW - 24, 38, 'sans', 30);
    ops.push({ kind: 'text', x: L + badgeW + 24, y: y - 13, anchor: 'start', runs: [run(fit.text, fit.size, 'sans', '600', INK)] });
    ops.push({ kind: 'rect', x: L, y: y - 92, w: W, h: 2, fill: INK, fillOpacity: 0.22 });
    y -= 134;
  }
  statRow(ops, liftStats(i), L, W, y, { valueSize: 84, valueFace: 'sans', unitFill: INK, labelAbove: true, labelFill: INK, labelOpacity: 0.72 });
  const dateY = y - 84 - 22 - 25 - 54;
  const d = parse(i.when);
  const dateLine = [d ? shortDate(d) : null, i.chapter].filter(Boolean).join(' · ');
  if (dateLine) ops.push({ kind: 'text', x: L, y: dateY, anchor: 'start', runs: [run(ellipsize(dateLine, W, 36, 'sans'), 36, 'sans', '500', INK, { opacity: 0.8 })] });
  titleUp(ops, i.title, L, W, dateLine ? dateY - 66 : dateY, 124, 80);
  return { width: STORY_W, height: STORY_H, style: 'photo-stats', transparent: false, needsPhoto: !photo, ops };
}

/** RUN 1 — the athlete's photo, the route over it when they chose to show it, the run along the bottom. */
function photoRoute(i: StoryInput, photo: StoryPhoto, showRoute: boolean): StoryDrawing {
  const ops: StoryOp[] = [];
  photoGround(ops, photo);
  brandLeft(ops, L, SAFE_TOP + 10);

  const y = SAFE_BOTTOM - 20;
  statRow(ops, runStats(i), L, W, y, { valueSize: 84, valueFace: 'sans', unitFill: INK, labelAbove: true, labelFill: INK, labelOpacity: 0.72 });
  const dateY = y - 84 - 22 - 25 - 54;
  const d = parse(i.when);
  const dateLine = d ? `${shortDate(d)} · ${clockTime(d)}` : null;
  if (dateLine) ops.push({ kind: 'text', x: L, y: dateY, anchor: 'start', runs: [run(dateLine, 36, 'sans', '500', INK, { opacity: 0.8 })] });
  titleUp(ops, i.title, L, W, dateLine ? dateY - 66 : dateY, 124, 80);

  // Top right, opposite the badge — the athlete is usually in the middle of their own photo, and the
  // bottom is the numbers. Sky, trees and the far side of the street are what live up here.
  if (showRoute) {
    const size = 330;
    drawRoute(ops, i.run.route, { x: STORY_W - L - size + 14, y: SAFE_TOP - 6, w: size, h: size }, 18, { line: INK, width: 9, casing: 9 });
  }
  return { width: STORY_W, height: STORY_H, style: 'photo-route', transparent: false, needsPhoto: !photo, ops };
}

/** What the plaque commemorates: the session's best record, else the work itself. */
function achievement(i: StoryInput, d: Date | null) {
  const date = d ? fullDate(d) : null;
  if (i.lift.pr) {
    const w = weightOf(i.lift.pr.weightLb, i.units);
    const reps = i.lift.pr.reps > 1 ? `${i.lift.pr.reps} reps` : null;
    return {
      label: i.lift.pr.exercise,
      value: groupInt(w.value),
      unit: w.unit,
      eyebrow: 'New personal record',
      sub: [reps, date].filter(Boolean).join(' · '),
      footer: [minutesLabel(i.durationSec), `${i.lift.sets} sets`, i.lift.volumeLb > 0 ? `${groupInt(weightOf(i.lift.volumeLb, i.units).value)} ${weightOf(i.lift.volumeLb, i.units).unit} moved` : null].filter(Boolean).join(' · '),
    };
  }
  if (i.lift.volumeLb > 0) {
    const v = weightOf(i.lift.volumeLb, i.units);
    return {
      label: i.title,
      value: groupInt(v.value),
      unit: v.unit,
      eyebrow: 'Moved today',
      sub: date ?? '',
      footer: [minutesLabel(i.durationSec), `${i.lift.sets} sets`, `${i.lift.exercises} exercises`].join(' · '),
    };
  }
  return {
    label: i.title,
    value: String(i.lift.sets),
    unit: i.lift.sets === 1 ? 'set' : 'sets',
    eyebrow: 'Sealed',
    sub: date ?? '',
    footer: [minutesLabel(i.durationSec), `${i.lift.exercises} exercises`].join(' · '),
  };
}

/** LIFT 2 — the trophy plate. The achievement owns the frame; the photo, when there is one, sits low and dark. */
function engraved(i: StoryInput, photo: StoryPhoto): StoryDrawing {
  const ops: StoryOp[] = [];
  const cx = STORY_W / 2;
  ops.push({ kind: 'rect', x: 0, y: 0, w: STORY_W, h: STORY_H, fill: BASE });
  ops.push({ kind: 'vgrad', x: 0, y: 0, w: STORY_W, h: STORY_H, stops: [{ at: 0, color: '#12161A', opacity: 1 }, { at: 1, color: BASE, opacity: 1 }] });
  if (photo) {
    const frame = { x: 0, y: 1040, w: STORY_W, h: STORY_H - 1040 };
    ops.push({ kind: 'photo', frame, image: coverRect(frame, photo), opacity: 0.55 });
    // The fade starts in the ground's OWN colour at that height (the ground is a gradient), or the photo's
    // top edge shows as a seam across the plate.
    ops.push({ kind: 'vgrad', x: 0, y: 1040, w: STORY_W, h: STORY_H - 1040, stops: [{ at: 0, color: '#0B0E11', opacity: 1 }, { at: 0.4, color: BASE, opacity: 0.3 }, { at: 1, color: BASE, opacity: 0.88 }] });
  }
  ops.push({ kind: 'vgrad', x: 0, y: 0, w: STORY_W, h: 900, stops: [{ at: 0, color: BRONZE, opacity: 0.1 }, { at: 1, color: BRONZE, opacity: 0 }] });
  // The double rule of an engraved plate.
  ops.push({ kind: 'rect', x: 40, y: 40, w: STORY_W - 80, h: STORY_H - 80, radius: 14, stroke: BRONZE, strokeOpacity: 0.85, strokeWidth: 3 });
  ops.push({ kind: 'rect', x: 62, y: 62, w: STORY_W - 124, h: STORY_H - 124, radius: 8, stroke: BRONZE, strokeOpacity: 0.42, strokeWidth: 2 });

  brandCentered(ops, cx, SAFE_TOP + 10, 76);
  const d = parse(i.when);
  const a = achievement(i, d);
  if (i.chapter) {
    const t = ellipsize(i.chapter.toUpperCase(), 860, 28, 'sans', 7);
    ops.push({ kind: 'text', x: cx, y: 500, anchor: 'middle', runs: [run(t, 28, 'sans', '700', BRONZE_HI, { letterSpacing: 7 })] });
  }
  const label = fitLine(a.label, 880, 96, 'serif', 56);
  ops.push({ kind: 'text', x: cx, y: 650, anchor: 'middle', runs: [run(label.text, label.size, 'serif', '600', INK, { italic: true })] });
  ops.push({ kind: 'text', x: cx, y: 960, anchor: 'middle', runs: fitRuns([run(a.value, 300, 'serif', '600', INK), run(` ${a.unit}`, 120, 'serif', '600', BRONZE_HI)], 900) });
  ops.push({ kind: 'text', x: cx, y: 1062, anchor: 'middle', runs: [run(a.eyebrow.toUpperCase(), 30, 'sans', '700', BRONZE_HI, { letterSpacing: 7 })] });
  if (a.sub) ops.push({ kind: 'text', x: cx, y: 1120, anchor: 'middle', runs: [run(a.sub, 34, 'sans', '500', INK, { opacity: 0.78 })] });
  // A rule with a lozenge at its centre — the plate's one ornament.
  ops.push({ kind: 'rect', x: cx - 170, y: 1185, w: 340, h: 2, fill: BRONZE, fillOpacity: 0.6 });
  ops.push({ kind: 'path', d: `M${cx} 1174 L${cx + 12} 1186 L${cx} 1198 L${cx - 12} 1186 Z`, fill: BRONZE });
  const foot = fitLine(a.footer, 860, 34, 'sans', 26);
  ops.push({ kind: 'text', x: cx, y: SAFE_BOTTOM - 40, anchor: 'middle', runs: [run(foot.text, foot.size, 'sans', '600', BRONZE_HI)] });
  return { width: STORY_W, height: STORY_H, style: 'engraved', transparent: false, needsPhoto: false, ops };
}

/** The card ground both no-photo cards share: stone, a bronze glow from the top, one fine frame. */
function cardGround(ops: StoryOp[]) {
  ops.push({ kind: 'rect', x: 0, y: 0, w: STORY_W, h: STORY_H, fill: STONE });
  ops.push({ kind: 'vgrad', x: 0, y: 0, w: STORY_W, h: 900, stops: [{ at: 0, color: BRONZE, opacity: 0.16 }, { at: 1, color: BRONZE, opacity: 0 }] });
  ops.push({ kind: 'rect', x: 48, y: 48, w: STORY_W - 96, h: STORY_H - 96, radius: 40, stroke: BRONZE, strokeOpacity: 0.38, strokeWidth: 2 });
}

const CL = 120;
const CW = STORY_W - CL * 2;

function chapterRight(ops: StoryOp[], chapter: string | null) {
  if (!chapter) return;
  const t = ellipsize(chapter.toUpperCase(), 330, 26, 'sans', 5);
  ops.push({ kind: 'text', x: CL + CW, y: SAFE_TOP + 52, anchor: 'end', runs: [run(t, 26, 'sans', '700', BRONZE_HI, { letterSpacing: 5 })] });
}

/** LIFT 3 — a page from the training record: the work as one number, then the sets that mattered. */
function ledger(i: StoryInput): StoryDrawing {
  const ops: StoryOp[] = [];
  cardGround(ops);
  brandLeft(ops, CL, SAFE_TOP + 10);
  chapterRight(ops, i.chapter);

  const titleEnd = titleDown(ops, i.title, CL, CW, 420, 116, 76);
  const d = parse(i.when);
  const dateLine = [d ? longDate(d) : null, minutesLabel(i.durationSec)].filter(Boolean).join(' · ');
  const dateY = titleEnd + 70;
  ops.push({ kind: 'text', x: CL, y: dateY, anchor: 'start', runs: [run(ellipsize(dateLine, CW, 36, 'sans'), 36, 'sans', '500', MUTED)] });

  const hero =
    i.lift.volumeLb > 0
      ? { v: groupInt(weightOf(i.lift.volumeLb, i.units).value), u: weightOf(i.lift.volumeLb, i.units).unit, k: 'Moved today' }
      : { v: String(i.lift.sets), u: i.lift.sets === 1 ? 'set' : 'sets', k: 'Logged today' };
  const heroY = dateY + 240;
  ops.push({ kind: 'text', x: CL, y: heroY, anchor: 'start', runs: fitRuns([run(hero.v, 220, 'serif', '600', INK), run(` ${hero.u}`, 88, 'serif', '600', BRONZE_HI)], CW) });
  ops.push({ kind: 'text', x: CL, y: heroY + 64, anchor: 'start', runs: [run(hero.k.toUpperCase(), 28, 'sans', '700', MUTED, { letterSpacing: 6 })] });

  const footY = SAFE_BOTTOM - 100;
  if (i.lift.top.length) {
    let y = heroY + 170;
    ops.push({ kind: 'text', x: CL, y, anchor: 'start', runs: [run('TOP SETS', 26, 'sans', '700', BRONZE_HI, { letterSpacing: 6 })] });
    y += 34;
    const ROW = 94;
    const room = Math.max(0, Math.floor((footY - 24 - y) / ROW));
    const rows = i.lift.top.slice(0, Math.min(5, room));
    for (const r of rows) {
      ops.push({ kind: 'rect', x: CL, y, w: CW, h: 2, fill: LINE });
      const base = y + 62;
      let right = CL + CW;
      if (r.pr) {
        const bw = Math.ceil(measureText('PR', 24, 'sans', 3)) + 30;
        ops.push({ kind: 'rect', x: right - bw, y: base - 36, w: bw, h: 46, radius: 8, fill: BRONZE, fillOpacity: 0.16, stroke: BRONZE, strokeWidth: 2 });
        ops.push({ kind: 'text', x: right - bw / 2, y: base - 4, anchor: 'middle', runs: [run('PR', 24, 'sans', '800', BRONZE_HI, { letterSpacing: 3 })] });
        right -= bw + 18;
      }
      const vw = measureText(r.value, 40, 'sans');
      ops.push({ kind: 'text', x: right, y: base, anchor: 'end', runs: [run(r.value, 40, 'sans', '600', r.pr ? BRONZE_HI : MUTED)] });
      const name = ellipsize(r.name, right - vw - 36 - CL, 40, 'sans');
      ops.push({ kind: 'text', x: CL, y: base, anchor: 'start', runs: [run(name, 40, 'sans', r.pr ? '700' : '500', INK)] });
      y += ROW;
    }
  }

  ops.push({ kind: 'rect', x: CL, y: footY, w: CW, h: 2, fill: BRONZE, fillOpacity: 0.38 });
  ops.push({
    kind: 'text',
    x: CL,
    y: footY + 62,
    anchor: 'start',
    runs: [
      run(String(i.lift.sets), 34, 'sans', '600', INK),
      run(i.lift.sets === 1 ? ' set · ' : ' sets · ', 34, 'sans', '500', MUTED),
      run(String(i.lift.exercises), 34, 'sans', '600', INK),
      run(i.lift.exercises === 1 ? ' exercise' : ' exercises', 34, 'sans', '500', MUTED),
    ],
  });
  ops.push({ kind: 'text', x: CL + CW, y: footY + 62, anchor: 'end', runs: [run('Sealed', 38, 'serif', '600', BRONZE_HI, { italic: true })] });
  return { width: STORY_W, height: STORY_H, style: 'ledger', transparent: false, needsPhoto: false, ops };
}

/** RUN 2 — no photo: the route is the picture, drawn on faint terrain rather than a street map. */
function routeCard(i: StoryInput, showRoute: boolean): StoryDrawing {
  const ops: StoryOp[] = [];
  cardGround(ops);
  brandLeft(ops, CL, SAFE_TOP + 10);
  chapterRight(ops, i.chapter);

  const panel = { x: CL, y: 330, w: CW, h: 700 };
  ops.push({ kind: 'rect', ...panel, radius: 28, fill: BASE, stroke: LINE, strokeWidth: 2 });
  contours(ops, panel, hash(`${i.title}|${i.when ?? ''}`));
  const stats = runStats(i);
  const drawn = showRoute && drawRoute(ops, i.run.route, panel, 90, { line: BRONZE, width: 12, casing: 10 });
  let rowStats = stats;
  if (!drawn) {
    // No line to show — the panel leads with the run's biggest number instead, and the strip below
    // doesn't repeat it.
    const lead = stats[0];
    ops.push({ kind: 'text', x: panel.x + panel.w / 2, y: panel.y + panel.h / 2 + 50, anchor: 'middle', runs: fitRuns([run(lead.value, 220, 'serif', '600', INK), ...(lead.unit ? [run(` ${lead.unit}`, 80, 'serif', '600', BRONZE_HI)] : [])], panel.w - 120) });
    ops.push({ kind: 'text', x: panel.x + panel.w / 2, y: panel.y + panel.h / 2 + 126, anchor: 'middle', runs: [run(lead.label.toUpperCase(), 28, 'sans', '700', MUTED, { letterSpacing: 6 })] });
    rowStats = stats.slice(1);
  }

  const titleEnd = titleDown(ops, i.title, CL, CW, panel.y + panel.h + 120, 104, 72);
  const d = parse(i.when);
  const dateY = titleEnd + 62;
  if (d) ops.push({ kind: 'text', x: CL, y: dateY, anchor: 'start', runs: [run(`${shortDate(d)} · ${clockTime(d)}`, 34, 'sans', '500', MUTED)] });
  const statsY = dateY + 140;
  statRow(ops, rowStats, CL, CW, statsY, { valueSize: 80, valueFace: 'serif', unitFill: BRONZE_HI, labelAbove: false, labelFill: MUTED });

  const climb = climbText(i);
  const climbRule = statsY + 96;
  if (climb && climbRule + 60 <= SAFE_BOTTOM) {
    ops.push({ kind: 'rect', x: CL, y: climbRule, w: CW, h: 2, fill: LINE });
    ops.push({ kind: 'text', x: CL, y: climbRule + 56, anchor: 'start', runs: [run('ELEVATION GAIN', 24, 'sans', '700', MUTED, { letterSpacing: 5 })] });
    ops.push({ kind: 'text', x: CL + CW, y: climbRule + 56, anchor: 'end', runs: [run(climb, 34, 'sans', '600', BRONZE_HI)] });
  }
  return { width: STORY_W, height: STORY_H, style: 'route-card', transparent: false, needsPhoto: false, ops };
}

/** RUN 3 — no ground at all: the route and the numbers, to lay over the athlete's own photo or video. */
function sticker(i: StoryInput, showRoute: boolean): StoryDrawing {
  const ops: StoryOp[] = [];
  const cx = STORY_W / 2;
  const stats = runStats(i);
  const hasLine = showRoute && !!i.run.route && i.run.route.length > 1;
  const ROUTE = 620;
  const block = (hasLine ? ROUTE + 80 : 0) + 96 + 54 + 110 + 60 + 92;
  let y = Math.max(SAFE_TOP + 40, (STORY_H - block) / 2);
  if (hasLine) {
    drawRoute(ops, i.run.route, { x: cx - ROUTE / 2, y, w: ROUTE, h: ROUTE }, 30, { line: INK, width: 15, casing: 12 });
    y += ROUTE + 80;
  }
  const colW = 300;
  const x0 = cx - (colW * (stats.length - 1)) / 2;
  stats.forEach((s, k) => {
    const x = x0 + colW * k;
    ops.push({ kind: 'text', x, y: y + 92, anchor: 'middle', runs: fitRuns([run(s.value, 96, 'sans', '800', INK)], colW - 24) });
    const label = s.label === 'Distance' ? s.unit : s.label === 'Pace' ? s.unit : s.label;
    ops.push({ kind: 'text', x, y: y + 92 + 54, anchor: 'middle', runs: [run(label.toUpperCase(), 28, 'sans', '700', INK, { letterSpacing: 5, opacity: 0.88 })] });
  });
  y += 96 + 54 + 110;
  brandCentered(ops, cx, y, 60);
  return { width: STORY_W, height: STORY_H, style: 'sticker', transparent: true, needsPhoto: false, ops };
}

/** Compose one style. `photo` is the natural size of the athlete's photo, or null. */
export function composeStory(style: StoryStyle, input: StoryInput, photo: StoryPhoto, opts: { showRoute: boolean }): StoryDrawing {
  switch (style) {
    case 'photo-stats':
      return photoStats(input, photo);
    case 'engraved':
      return engraved(input, photo);
    case 'ledger':
      return ledger(input);
    case 'photo-route':
      return photoRoute(input, photo, opts.showRoute);
    case 'route-card':
      return routeCard(input, opts.showRoute);
    case 'sticker':
      return sticker(input, opts.showRoute);
  }
}

// ── from a finished session ───────────────────────────────────────────────────

/** The slice of `Completion` (data/workout-complete-live) this reads — structural, so the real one satisfies it. */
export interface CompletionLikeForStory {
  workoutName: string;
  activityType: string | null;
  chapterName: string | null;
  savedAt: string | null;
  volume: number;
  sets: number;
  durationSec: number;
  exercises: (CardioLike & { name: string; topSet: string | null; isPR: boolean })[];
  prs: { exercise: string; weight: number; reps: number }[];
}

/**
 * Turn a finished session into the picture's input.
 *
 * Which family of styles is the session's own call, made the way the feed makes it (`deriveLead`): a pure
 * cardio session is a run, anything with lifting in it is a lifting day.
 */
export function storyInputFrom(
  c: CompletionLikeForStory,
  extra: { startedAt: string | null; route: string | null; climbM: number | null },
  units: UnitSystem,
): StoryInput {
  const hasStrength = c.exercises.some((e) => !e.cardio);
  const cardio = recapCardioFrom(c.exercises, c.activityType);
  const kind: StoryKind = deriveLead(hasStrength, cardio) === 'cardio' ? 'run' : 'lift';
  const named = c.workoutName?.trim();
  const title = named && named.toLowerCase() !== 'freestyle workout' ? named : kind === 'run' ? cardioMarkerLabel(c.activityType) : 'Workout';
  const strength = c.exercises.filter((e) => !e.cardio);

  // Records first, then the order they were trained in — the sets worth showing a stranger.
  const top: StoryTopSet[] = strength
    .filter((e) => e.topSet)
    .map((e) => ({ name: e.name, value: convertMeasure(e.topSet as string, units).replace(/\s(lb|kg)\b/i, ''), pr: e.isPR }))
    .sort((a, b) => Number(b.pr) - Number(a.pr));

  const best = c.prs.reduce<CompletionLikeForStory['prs'][number] | null>((m, p) => (!m || p.weight > m.weight ? p : m), null);

  // A row that will not decode — or decodes to nonsense, which a polyline decoder will happily do with
  // garbage — draws no line rather than a broken one.
  let route: LatLon[] | null = null;
  if (extra.route) {
    try {
      const pts = decodePolyline(extra.route);
      const sane = pts.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
      const moves = pts.some((p) => p.lat !== pts[0].lat || p.lon !== pts[0].lon);
      route = sane && moves ? pts : null;
    } catch {
      route = null;
    }
  }

  return {
    kind,
    title,
    chapter: c.chapterName?.trim() || null,
    when: extra.startedAt ?? c.savedAt,
    durationSec: c.durationSec,
    units,
    lift: {
      volumeLb: c.volume,
      sets: c.sets,
      exercises: strength.length,
      top,
      pr: best ? { exercise: best.exercise, weightLb: best.weight, reps: best.reps } : null,
    },
    run: {
      distanceMi: cardio?.distanceMi ?? null,
      paceSecPerMi: cardio?.paceSecPerMi ?? null,
      floors: cardio?.floors ?? null,
      climbM: extra.climbM,
      route: route && route.length > 1 ? route : null,
    },
  };
}

/** The sentence that rides beside the picture into Messages / WhatsApp, with the link (PO 2026-10-01). */
export function storyMessage(i: StoryInput): string {
  let what: string | null = null;
  if (i.kind === 'run') {
    const s = runStats(i)[0];
    what = s && s.label !== 'Time' ? `${s.value}${s.unit ? ` ${s.unit}` : ''}` : minutesLabel(i.durationSec);
  } else if (i.lift.pr) {
    const w = weightOf(i.lift.pr.weightLb, i.units);
    what = `new ${i.lift.pr.exercise} record, ${groupInt(w.value)} ${w.unit}`;
  } else if (i.lift.volumeLb > 0) {
    const v = weightOf(i.lift.volumeLb, i.units);
    what = `${groupInt(v.value)} ${v.unit} moved`;
  }
  return `${i.title}${what ? `: ${what}` : ''}. https://${SITE}`;
}

export { INK as STORY_INK, MUTED as STORY_MUTED, BRONZE as STORY_BRONZE, STONE as STORY_STONE };
