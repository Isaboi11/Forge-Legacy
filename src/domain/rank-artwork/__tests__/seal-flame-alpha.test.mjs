/**
 * Soft-alpha-retention guard for the seal flame (`assets/artwork/ranks/seal-flame.png`).
 *
 * The RankSeal composites a raster flame, so it re-introduces the exact failure mode the whole port
 * fixes: a future re-export could FLATTEN the flame's alpha (opaque backing → box). This test parses
 * the PNG's real alpha channel (zero-dep: node zlib + manual un-filter) and asserts the flame retains
 * meaningful transparency. If someone ships a flattened flame, this goes red — the flatten fails loud.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'

function alphaStats(path) {
  const buf = readFileSync(path)
  assert.equal(buf.readUInt32BE(0), 0x89504e47, 'not a PNG')
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
  assert.equal(colorType, 6, 'flame PNG must be RGBA (color type 6) — an RGB export dropped the alpha channel')
  assert.equal(bitDepth, 8, 'expected 8-bit channels')
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
  let nonOpaque = 0
  const total = w * h
  for (let i = 0; i < total; i++) if (out[i * bpp + 3] < 255) nonOpaque++
  return { w, h, total, nonOpaque }
}

test('seal flame retains soft alpha (a future flatten fails loud here)', () => {
  const s = alphaStats('assets/artwork/ranks/seal-flame.png')
  const softFraction = s.nonOpaque / s.total
  // A genuine flame etch is mostly semi/transparent; a flatten would drive this toward 0.
  assert.ok(softFraction > 0.2, `flame must retain transparency — only ${(softFraction * 100).toFixed(1)}% of pixels are non-opaque (flatten suspected)`)
})
