/**
 * The Progress Photo Post card — proportions, placement and the selection rules that govern it.
 *
 * ONE CARD, AUTHORED ONCE. The design's rule (`design_handoff_progress_photo_post` §9) is that the
 * preview IS the export: the card is authored at 300pt wide and multiplied by 3.6 on the way out, so
 * 1:1 lands on 1080×1080 and 4:5 on 1080×1350 without a second layout being maintained. Everything
 * below is expressed against `PREVIEW_W`, and `scale` is the only thing that changes between the card
 * an athlete looks at and the file they post.
 *
 * WHY THIS IS A DOMAIN MODULE. The screen renders the card with flexbox, which measures real text and
 * needs no arithmetic; the exporter draws onto a canvas and needs every rectangle up front. Those are
 * two descriptions of one card, and the half that can be checked is this one — tiles must sit inside
 * the card, must not overlap, and the column count must follow the selection rather than a hardcoded
 * 2×2. Same split, and the same reason, as `card-layout.ts`.
 *
 * The selection rules live here too, because "never zero photos" and "over the cap, toast rather than
 * silently drop" are product decisions with exact edges, not view code.
 */

export type ProgressFormat = '1x1' | '4x5';
export type ProgressStyle = 'grid' | 'hero';

/** Card content toggles. `pose` is the only one that defaults off. */
export interface ProgressIncl {
  date: boolean;
  meta: boolean;
  chapter: boolean;
  name: boolean;
  pose: boolean;
}

export const DEFAULT_INCL: ProgressIncl = { date: true, meta: true, chapter: true, name: true, pose: false };

/** The width the card is authored at. Every literal below is in these units. */
export const PREVIEW_W = 300;
/** 300 → 1080. The one number that turns the preview into the export. */
export const EXPORT_SCALE = 3.6;

export interface FormatSpec {
  id: ProgressFormat;
  label: string;
  /** Aspect as height ÷ width — 1 for a square, 1.25 for 4:5. */
  ratio: number;
  previewW: number;
  previewH: number;
  exportW: number;
  exportH: number;
  /** The chip's proportion glyph: the literal shape of the output. */
  glyphW: number;
  glyphH: number;
}

export const PROGRESS_FORMATS: FormatSpec[] = [
  { id: '1x1', label: '1:1', ratio: 1, previewW: 300, previewH: 300, exportW: 1080, exportH: 1080, glyphW: 13, glyphH: 13 },
  { id: '4x5', label: '4:5', ratio: 1.25, previewW: 300, previewH: 375, exportW: 1080, exportH: 1350, glyphW: 11, glyphH: 13.75 },
];

export const formatSpec = (id: ProgressFormat): FormatSpec => PROGRESS_FORMATS.find((f) => f.id === id) ?? PROGRESS_FORMATS[1];

// ── Caps ──────────────────────────────────────────────────────────────────────
/** A grid holds four; a carousel holds six. Six is a Forge judgment call, not a platform limit. */
export const GRID_CAP = 4;
export const HERO_CAP = 6;

export const capFor = (style: ProgressStyle): number => (style === 'hero' ? HERO_CAP : GRID_CAP);
export const capToast = (style: ProgressStyle): string => (style === 'hero' ? 'Six slides max' : 'Four photos max in a grid');

// ── Card metrics, at preview scale ────────────────────────────────────────────
const PAD = 16;
const HEADER_H = 17; // the 17×17 Forge mark sets the row's height
const HEADER_GAP = 12;
const FOOTER_GAP = 12;
const GRID_GAP = 6;
const TILE_RADIUS = 8;
/** Display name, its meta line, and the gap between them. */
const NAME_H = 19;
const META_H = 13;
const NAME_META_GAP = 3;
const CHAPTER_H = 12;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridGeometry extends Rect {
  /** Card padding, gap and corner radius at this scale — the exporter draws with them. */
  pad: number;
  gap: number;
  tileRadius: number;
  /** The header row (Forge mark · wordmark · date). Always present. */
  header: Rect;
  /** One rect per selected photo, in selection order. */
  tiles: Rect[];
  /** Null when every footer toggle is off — then the grid takes the space back. */
  footer: Rect | null;
  columns: number;
  rows: number;
}

/**
 * How many columns a grid of `n` photos uses.
 *
 * DERIVED FROM THE COUNT, NEVER HARDCODED 2×2. Three photos are a 3-up row, not a 2×2 with a hole in
 * it. The cells go narrow at 3-up in a 4:5 card and that is expected: a standing figure is vertical and
 * survives a centre crop.
 */
export function gridColumns(n: number): number {
  if (n <= 1) return 1;
  if (n === 3) return 3;
  return 2; // 2 side by side, 4 as 2 × 2
}

/** The height the footer needs for the toggles that are on. Zero when they are all off. */
function footerHeight(incl: ProgressIncl): number {
  const left = (incl.name ? NAME_H : 0) + (incl.meta ? META_H : 0) + (incl.name && incl.meta ? NAME_META_GAP : 0);
  const right = incl.chapter ? CHAPTER_H : 0;
  return Math.max(left, right);
}

/**
 * Place a Grid card's photos.
 *
 * The header is fixed and the footer is measured from the toggles, so Date-only (§14, screenshot 10)
 * gives its space back to the photos instead of leaving the card looking half empty.
 */
export function gridGeometry(format: ProgressFormat, count: number, incl: ProgressIncl, scale: number = EXPORT_SCALE): GridGeometry {
  const f = formatSpec(format);
  const w = f.previewW * scale;
  const h = f.previewH * scale;
  const pad = PAD * scale;
  const gap = GRID_GAP * scale;
  const headerH = HEADER_H * scale;
  const inner = w - pad * 2;

  const header: Rect = { x: pad, y: pad, w: inner, h: headerH };

  const footH = footerHeight(incl) * scale;
  const footer: Rect | null = footH > 0 ? { x: pad, y: h - pad - footH, w: inner, h: footH } : null;

  const top = pad + headerH + HEADER_GAP * scale;
  const bottom = footer ? footer.y - FOOTER_GAP * scale : h - pad;
  const areaH = bottom - top;

  const n = Math.max(1, count);
  const columns = gridColumns(n);
  const rows = Math.ceil(n / columns);
  const tileW = (inner - gap * (columns - 1)) / columns;
  const tileH = (areaH - gap * (rows - 1)) / rows;

  const tiles: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    // A last row that isn't full keeps its cells at column width rather than stretching them — the
    // photos in it are the same photos, and a wider crop would say otherwise.
    tiles.push({ x: pad + col * (tileW + gap), y: top + row * (tileH + gap), w: tileW, h: tileH });
  }

  return { x: 0, y: 0, w, h, pad, gap, tileRadius: TILE_RADIUS * scale, header, tiles, footer, columns, rows };
}

export interface HeroGeometry extends Rect {
  /** Full bleed — a hero slide IS the photo; the chrome sits over it. */
  photo: Rect;
  /** Top row: Forge mark · wordmark · pose chip · counter. */
  top: Rect;
  /** The date / meta / name block, lifted clear of the dots. */
  bottom: { x: number; w: number; /** distance from the card's bottom edge */ offset: number };
  markSize: number;
}

/**
 * One hero slide. Every slide carries the full chrome, so a single slide saved on its own still reads
 * as a complete Forge card rather than a cropped fragment of a set.
 */
export function heroGeometry(format: ProgressFormat, scale: number = EXPORT_SCALE): HeroGeometry {
  const f = formatSpec(format);
  const w = f.previewW * scale;
  const h = f.previewH * scale;
  return {
    x: 0,
    y: 0,
    w,
    h,
    photo: { x: 0, y: 0, w, h },
    top: { x: 16 * scale, y: 16 * scale, w: w - 32 * scale, h: 17 * scale },
    // 30 clears the dot row at 12 — stated as a number rather than discovered by overlap.
    bottom: { x: 18 * scale, w: w - 36 * scale, offset: 30 * scale },
    markSize: 17 * scale,
  };
}

// ── Selection ─────────────────────────────────────────────────────────────────

export interface SelectionResult {
  sel: string[];
  /** Set when the tap was refused. The selection is returned unchanged — never silently trimmed. */
  toast?: string;
}

/**
 * Tap a pose tile.
 *
 * THREE RULES, ALL OF THEM EDGES. Order is preserved, because it is the card's order. Deselecting the
 * last photo is a no-op — an empty card is not a state the athlete can mean. And over the cap the tap
 * is REFUSED with a toast rather than pushing the oldest selection out: a silent drop looks identical
 * to the tap not registering.
 */
export function togglePose(sel: string[], key: string, style: ProgressStyle): SelectionResult {
  const cap = capFor(style);
  if (sel.includes(key)) {
    const next = sel.filter((k) => k !== key);
    return { sel: next.length ? next : sel };
  }
  if (sel.length >= cap) return { sel, toast: capToast(style) };
  return { sel: [...sel, key] };
}

/**
 * What is selected when the screen opens: every pose that has a photo, capped at four.
 *
 * An entry with no photos at all preselects the first four poses anyway, so the card composes with
 * placeholder cells and the layout stays legible — the athlete may be about to add them.
 */
export function defaultSelection(filled: string[], all: string[]): string[] {
  return (filled.length ? filled : all).slice(0, GRID_CAP);
}

/**
 * Trim a selection to a style's cap — Grid → Hero keeps everything, Hero → Grid keeps the first four.
 * Format changes never come through here: format must not disturb the selection (§8).
 */
export function clampSelection(sel: string[], style: ProgressStyle): string[] {
  return sel.slice(0, capFor(style));
}

/** Keep the carousel's active slide valid when the selection shrinks under it. */
export const clampIndex = (index: number, count: number): number => Math.max(0, Math.min(index, Math.max(0, count - 1)));

/** The live count beside the PHOTOS label — "3 of 4" in a grid, "4 slides" in a carousel. */
export function selectionHint(style: ProgressStyle, n: number): string {
  if (style === 'hero') return `${n} ${n === 1 ? 'slide' : 'slides'}`;
  return `${n} of ${GRID_CAP}`;
}
