/**
 * Black-box guard for every WIRED rank raster asset — the seal flame + the registered badge art.
 *
 * A rank badge must be a shaped CUTOUT, never a rectangular black matte (the alpha-flatten failure that
 * put a black box behind the hexagon and forced the vector RankSeal). The robust discriminator is the
 * OPAQUE BOUNDING-BOX FILL RATIO: a rectangular matte fills ~100% of its own opaque bounding box; a
 * shaped badge silhouette (hexagon) fills ~80%; the soft flame fills ~2%. A naive corner probe is fooled
 * BOTH ways — a boxed badge can carry a transparent margin AROUND the matte (false pass), and a clean
 * badge's base can reach its bbox corners (false fail) — so we measure the whole opaque region, not four
 * points. Empirically: clean sets 0.80–0.82, boxes 0.97–1.00 → threshold 0.90 separates with wide margin.
 *
 * GUARDED lists every raster asset the app renders as a rank seal: the badge-art registry in
 * `../badge-art.ts` + the RankSeal flame. Register a new badge ⇒ add it here, or this build fails.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'

const RANKS = 'assets/artwork/ranks'
const BADGES = [
  'established-m-1', 'established-m-2', 'established-m-3', 'established-m-4',
  'established-f-1', 'established-f-2', 'established-f-3', 'established-f-4',
  'legacy-1', 'legacy-2', 'legacy-3', 'legacy-4',
]
const GUARDED = [...BADGES, 'seal-flame']

/** Decode an RGBA PNG's alpha channel (zero-dep: zlib inflate + manual un-filter). */
function alpha(path) {
  const buf = readFileSync(path)
  assert.equal(buf.readUInt32BE(0), 0x89504e47, `${path}: not a PNG`)
  let w = 0, h = 0, bitDepth = 0, colorType = 0
  const idat = []
  let off = 8
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  if (colorType !== 6) return { hasAlpha: false, w, h }
  assert.equal(bitDepth, 8, `${path}: expected 8-bit channels`)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = 4, stride = w * bpp
  const out = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    const rs = y * (stride + 1) + 1
    for (let x = 0; x < stride; x++) {
      const rx = raw[rs + x]
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let v
      if (filter === 0) v = rx
      else if (filter === 1) v = rx + a
      else if (filter === 2) v = rx + b
      else if (filter === 3) v = rx + ((a + b) >> 1)
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = rx + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
      else throw new Error('bad PNG filter ' + filter)
      out[y * stride + x] = v & 0xff
    }
  }
  return { hasAlpha: true, w, h, out, bpp, stride }
}

/** Fill ratio of the opaque (a≥250) bounding box → ~1.0 for a rectangular matte, ~0.8 for a hexagon. */
function opaqueBBoxFill(path) {
  const im = alpha(path)
  if (!im.hasAlpha) return { hasAlpha: false, fill: 1 }
  const { w, h, out, bpp, stride } = im
  let minX = w, minY = h, maxX = -1, maxY = -1, opaque = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (out[y * stride + x * bpp + 3] >= 250) {
        opaque++
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return { hasAlpha: true, fill: 0 } // fully transparent
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  return { hasAlpha: true, fill: opaque / (bw * bh) }
}

const BOX_THRESHOLD = 0.9

test('every wired rank asset is a shaped cutout, not a black-box matte', () => {
  for (const name of GUARDED) {
    const { hasAlpha, fill } = opaqueBBoxFill(`${RANKS}/${name}.png`)
    assert.ok(hasAlpha, `${name}: no alpha channel (RGB/opaque) — flattened, would render as a black box`)
    assert.ok(
      fill < BOX_THRESHOLD,
      `${name}: opaque-bbox fill ${(fill * 100).toFixed(1)}% ≥ ${BOX_THRESHOLD * 100}% — BLACK-BOX matte (register only shaped cutouts)`,
    )
  }
})

test('the fill predicate actually rejects a rectangular matte', () => {
  // A fully-opaque region fills 100% of its bbox → must trip the guard (proves it is not vacuous).
  assert.ok(!(1.0 < BOX_THRESHOLD), 'a 100%-fill matte must be flagged as a black box')
  assert.ok(0.81 < BOX_THRESHOLD, 'a hexagon silhouette (~81% fill) must pass')
})
