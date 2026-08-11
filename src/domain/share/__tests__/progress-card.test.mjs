import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_INCL,
  EXPORT_SCALE,
  GRID_CAP,
  HERO_CAP,
  PREVIEW_W,
  PROGRESS_FORMATS,
  capFor,
  capToast,
  clampIndex,
  clampSelection,
  defaultSelection,
  formatSpec,
  gridColumns,
  gridGeometry,
  heroGeometry,
  selectionHint,
  togglePose,
} from '../progress-card.ts';

const POSES = ['rf', 'rs', 'rb', 'ff', 'su', 'bf'];
const overlaps = (a, b) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
const ALL_OFF = { date: false, meta: false, chapter: false, name: false, pose: false };

// ── Format ────────────────────────────────────────────────────────────────────

test('the two formats export at exactly 1080×1080 and 1080×1350', () => {
  assert.deepEqual(
    PROGRESS_FORMATS.map((f) => [f.id, f.exportW, f.exportH]),
    [
      ['1x1', 1080, 1080],
      ['4x5', 1080, 1350],
    ],
  );
});

test('the export is the preview times 3.6 — one layout, not two', () => {
  for (const f of PROGRESS_FORMATS) {
    assert.equal(f.previewW, PREVIEW_W, `${f.id} is authored at a different width`);
    assert.equal(f.previewW * EXPORT_SCALE, f.exportW, `${f.id} width does not scale`);
    assert.equal(f.previewH * EXPORT_SCALE, f.exportH, `${f.id} height does not scale`);
    assert.equal(f.previewH / f.previewW, f.ratio, `${f.id} preview is not its own proportion`);
  }
});

test('the design’s worked examples land on the documented pixels', () => {
  // §9: 16px padding → 57.6, 6px grid gap → 21.6, 8px tile radius → 28.8, 27px hero date → 97.2.
  const g = gridGeometry('4x5', 4, DEFAULT_INCL);
  assert.equal(g.pad, 57.6);
  assert.equal(g.gap, 21.6);
  assert.equal(g.tileRadius, 28.8);
  assert.equal(27 * EXPORT_SCALE, 97.2);
});

test('a format glyph is the literal shape of its output', () => {
  for (const f of PROGRESS_FORMATS) {
    // The chip's empty rounded rect must carry the same proportion the card does, or it is decoration.
    assert.ok(Math.abs(f.glyphH / f.glyphW - f.ratio) < 0.01, `${f.id} glyph is ${f.glyphW}×${f.glyphH}, not ${f.ratio}`);
  }
});

test('an unknown format falls back to 4:5 rather than crashing a stored post', () => {
  assert.equal(formatSpec('nonsense').id, '4x5');
});

// ── Grid geometry ─────────────────────────────────────────────────────────────

test('the column count follows the selection — 1, 2, 3-up, then 2×2', () => {
  assert.deepEqual([1, 2, 3, 4].map(gridColumns), [1, 2, 3, 2]);
  assert.deepEqual([1, 2, 3, 4].map((n) => gridGeometry('4x5', n, DEFAULT_INCL).rows), [1, 1, 1, 2]);
});

test('every selected photo gets a tile, and nothing is padded with an empty cell', () => {
  for (const fmt of ['1x1', '4x5']) {
    for (let n = 1; n <= GRID_CAP; n++) {
      assert.equal(gridGeometry(fmt, n, DEFAULT_INCL).tiles.length, n, `${fmt} · ${n} photos`);
    }
  }
});

test('no tile leaves the card, and no two tiles overlap', () => {
  for (const fmt of ['1x1', '4x5']) {
    for (let n = 1; n <= GRID_CAP; n++) {
      const g = gridGeometry(fmt, n, DEFAULT_INCL);
      for (const t of g.tiles) {
        assert.ok(t.w > 0 && t.h > 0, `${fmt}/${n}: zero-sized tile`);
        assert.ok(t.x >= g.pad - 0.01, `${fmt}/${n}: tile crosses the left padding`);
        assert.ok(t.x + t.w <= g.w - g.pad + 0.01, `${fmt}/${n}: tile crosses the right padding`);
        assert.ok(t.y >= g.header.y + g.header.h, `${fmt}/${n}: tile runs into the header`);
        assert.ok(t.y + t.h <= (g.footer ? g.footer.y : g.h - g.pad) + 0.01, `${fmt}/${n}: tile runs into the footer`);
      }
      for (let i = 0; i < g.tiles.length; i++) {
        for (let j = i + 1; j < g.tiles.length; j++) {
          assert.ok(!overlaps(g.tiles[i], g.tiles[j]), `${fmt}/${n}: tiles ${i} and ${j} overlap`);
        }
      }
    }
  }
});

test('tiles in a row are the same size, so a 3-up reads as one row and not three crops', () => {
  const g = gridGeometry('4x5', 3, DEFAULT_INCL);
  const [a, b, c] = g.tiles;
  assert.ok(Math.abs(a.w - b.w) < 0.01 && Math.abs(b.w - c.w) < 0.01);
  assert.ok(a.y === b.y && b.y === c.y);
});

test('Date-only gives the footer’s space back to the photos', () => {
  const full = gridGeometry('4x5', 4, DEFAULT_INCL);
  const bare = gridGeometry('4x5', 4, { ...ALL_OFF, date: true });
  assert.equal(full.footer !== null, true);
  assert.equal(bare.footer, null, 'every footer toggle is off — there is no footer to reserve');
  assert.ok(bare.tiles[0].h > full.tiles[0].h, 'the card must stay composed, not leave a hole where the footer was');
  // …and it still cannot run off the bottom.
  const last = bare.tiles[bare.tiles.length - 1];
  assert.ok(last.y + last.h <= bare.h - bare.pad + 0.01);
});

test('turning off Name alone still leaves a footer for the stats line', () => {
  const g = gridGeometry('4x5', 4, { ...DEFAULT_INCL, name: false });
  assert.ok(g.footer && g.footer.h > 0);
});

test('a square card is square and a 4:5 card is taller — the preview is a true proportion', () => {
  assert.equal(gridGeometry('1x1', 4, DEFAULT_INCL).h, gridGeometry('1x1', 4, DEFAULT_INCL).w);
  const p = gridGeometry('4x5', 4, DEFAULT_INCL);
  assert.equal(p.h / p.w, 1.25);
});

// ── Hero geometry ─────────────────────────────────────────────────────────────

test('a hero slide is full bleed — the chrome sits over the photo, not beside it', () => {
  for (const fmt of ['1x1', '4x5']) {
    const g = heroGeometry(fmt);
    assert.deepEqual(g.photo, { x: 0, y: 0, w: g.w, h: g.h }, `${fmt}: the photo does not fill the slide`);
    assert.ok(g.top.y > 0 && g.top.x > 0);
    assert.ok(g.bottom.offset > 12 * EXPORT_SCALE, 'the text block must clear the dot row at 12');
  }
});

// ── Selection rules ───────────────────────────────────────────────────────────

test('a grid caps at four and a carousel at six, each with its own toast', () => {
  assert.equal(capFor('grid'), GRID_CAP);
  assert.equal(capFor('hero'), HERO_CAP);
  assert.equal(capToast('grid'), 'Four photos max in a grid');
  assert.equal(capToast('hero'), 'Six slides max');
});

test('over the cap the tap is refused and the selection is left exactly as it was', () => {
  const sel = POSES.slice(0, 4);
  const r = togglePose(sel, 'su', 'grid');
  assert.deepEqual(r.sel, sel, 'a full grid must not silently drop the oldest photo');
  assert.equal(r.toast, 'Four photos max in a grid');

  const hero = POSES.slice(0, 6);
  assert.equal(togglePose(hero, 'rf', 'hero').toast, undefined, 'rf is already selected — that is a deselect');
  assert.equal(togglePose(POSES.slice(0, 6), 'zz', 'hero').toast, 'Six slides max');
});

test('selection order is preserved — it is the card’s order', () => {
  let sel = [];
  for (const k of ['bf', 'rf', 'su']) sel = togglePose(sel, k, 'grid').sel;
  assert.deepEqual(sel, ['bf', 'rf', 'su']);
  // Removing the middle one does not reshuffle the rest.
  assert.deepEqual(togglePose(sel, 'rf', 'grid').sel, ['bf', 'su']);
});

test('deselecting the last photo is a no-op — the card can never be empty', () => {
  const r = togglePose(['rf'], 'rf', 'grid');
  assert.deepEqual(r.sel, ['rf']);
  assert.equal(r.toast, undefined, 'a no-op is not a refusal — nothing to announce');
});

test('a re-tap under the cap deselects rather than duplicating', () => {
  assert.deepEqual(togglePose(['rf', 'rs'], 'rs', 'grid').sel, ['rf']);
});

test('the default selection is every pose with a photo, capped at four', () => {
  assert.deepEqual(defaultSelection(['rs', 'ff'], POSES), ['rs', 'ff']);
  assert.deepEqual(defaultSelection(POSES, POSES), POSES.slice(0, 4));
});

test('an entry with no photos still composes — the athlete may be about to add them', () => {
  assert.deepEqual(defaultSelection([], POSES), POSES.slice(0, 4));
});

test('Hero → Grid keeps the first four; Grid → Hero keeps everything', () => {
  const six = POSES.slice(0, 6);
  assert.deepEqual(clampSelection(six, 'grid'), six.slice(0, 4));
  assert.deepEqual(clampSelection(POSES.slice(0, 4), 'hero'), POSES.slice(0, 4));
});

test('the carousel index is clamped when the selection shrinks under it', () => {
  assert.equal(clampIndex(5, 3), 2);
  assert.equal(clampIndex(0, 0), 0);
  assert.equal(clampIndex(-1, 4), 0);
  assert.equal(clampIndex(2, 4), 2);
});

test('the photo count reads differently in each style, and singular at one', () => {
  assert.equal(selectionHint('grid', 3), '3 of 4');
  assert.equal(selectionHint('hero', 4), '4 slides');
  assert.equal(selectionHint('hero', 1), '1 slide');
});
