/**
 * qr — a real QR Code encoder. Byte mode, error-correction level M, versions 1–10.
 *
 * ══ WHY THIS EXISTS ══
 *
 * The squad invite sheet shipped with a function called `buildQr` that was not a QR code. It seeded a
 * linear congruential generator from the invite code, painted three finder squares on, and filled the
 * remaining 400-odd cells with coin flips. It had no format information, no timing pattern, no
 * alignment pattern and no error-correction codewords — nothing a decoder looks for beyond the three
 * corners. It was never scannable by anything, and the sheet's caption ("Point a camera at the code")
 * had never been true. Reported as *"QR code doesn't scan"*, which was the mildest possible way to put
 * it.
 *
 * It also encoded the wrong thing: it was seeded with the bare invite code rather than the join link,
 * so even a working encoder in that position would have produced a code that took a scanner nowhere.
 *
 * ══ WHY IT IS WRITTEN HERE RATHER THAN INSTALLED ══
 *
 * `react-native-qrcode-svg` would do this in one line. Adding it edits `package.json`, which
 * `@expo/fingerprint` reads — and per `Docs/Release-And-OTA-Runbook.md` § THE TRAP, a file with no
 * effect on the binary can still move the fingerprint and cut every existing build off from over-the-air
 * updates. This pass ships over the air. So the encoder lives here, in about three hundred lines of
 * arithmetic that has not changed since 2006, with the golden vectors that prove it.
 *
 * ══ SCOPE ══
 *
 * Byte mode only (a URL is bytes), level M only (~15% recovery — the usual choice for a screen someone
 * points a phone at), versions 1–10 (up to 213 bytes at level M; an invite link is about fifty). Any
 * of those could be widened; none of them needs to be.
 *
 * Reference: ISO/IEC 18004. The structure follows the same shape as Nayuki's public-domain reference
 * implementation, which is the one every other implementation is checked against.
 */

/** Error-correction level. Only M is tabulated — see the header. */
export type QrEcc = 'M';

export interface QrMatrix {
  /** Modules per side, `17 + 4 * version`. */
  size: number;
  /** Row-major, `size * size`. `true` is a dark module. */
  modules: boolean[];
  version: number;
  mask: number;
}

/** Data codewords available per version at level M. */
const DATA_CODEWORDS_M = [0, 16, 28, 44, 64, 86, 108, 124, 154, 182, 216];

/** Error-correction codewords per block, per version, at level M. */
const ECC_PER_BLOCK_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];

/**
 * Block layout per version at level M: `[group1Blocks, group2Blocks]`.
 *
 * Group 2's blocks each hold exactly one more data codeword than group 1's — that is the whole rule,
 * so the per-block sizes are derived rather than tabulated and cannot drift out of step with the
 * codeword totals above.
 */
const BLOCKS_M: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 0],
  [1, 0],
  [2, 0],
  [2, 0],
  [4, 0],
  [4, 0],
  [2, 2],
  [3, 2],
  [4, 1],
];

/** Alignment-pattern centre coordinates per version. */
const ALIGNMENT: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

export const MAX_QR_VERSION = 10;

// ── GF(256), the field Reed-Solomon lives in ────────────────────────────────────────────────────
// Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 = 0x11D, generator α = 2. Fixed by the standard.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

/** Field multiply. Zero is absorbing; everything else is add-the-logs. */
export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/**
 * The generator polynomial for `n` error-correction codewords: ∏(x − α^i) for i in 0..n−1.
 *
 * Returned leading-coefficient-first, and always monic, which is what `rsRemainder` relies on.
 */
export function rsGenerator(n: number): number[] {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j]; // × x
      next[j + 1] ^= gfMul(g[j], EXP[i]); // × α^i
    }
    g = next;
  }
  return g;
}

/** The `n` error-correction codewords for one block: the remainder of data(x)·x^n ÷ generator(x). */
export function rsRemainder(data: readonly number[], n: number): number[] {
  const g = rsGenerator(n);
  const res = new Array<number>(n).fill(0);
  for (const b of data) {
    const factor = b ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < n; i++) res[i] ^= gfMul(g[i + 1], factor);
  }
  return res;
}

// ── Data encoding ───────────────────────────────────────────────────────────────────────────────

/** Character-count indicator width for byte mode. Widens at version 10, which is why 10 is the ceiling. */
const countBits = (version: number): number => (version <= 9 ? 8 : 16);

/** UTF-8 bytes. A QR byte-mode segment is bytes, and every scanner reads a URL as UTF-8. */
export function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

/** The smallest version at level M that holds `byteLength` bytes, or `null` if none up to 10 does. */
export function chooseVersion(byteLength: number): number | null {
  for (let v = 1; v <= MAX_QR_VERSION; v++) {
    const needed = 4 + countBits(v) + 8 * byteLength;
    if (needed <= DATA_CODEWORDS_M[v] * 8) return v;
  }
  return null;
}

/**
 * The data codewords for a byte-mode message: mode indicator, character count, the bytes themselves,
 * a terminator, and the alternating pad bytes that fill the version out to capacity.
 *
 * `0xEC 0x11` is not arbitrary — the standard names those two bytes, and using anything else produces
 * a code that decodes but fails conformance.
 */
export function qrDataCodewords(text: string, version: number): number[] {
  const bytes = utf8Bytes(text);
  const capacity = DATA_CODEWORDS_M[version];
  const bits: number[] = [];
  const push = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4); // byte mode
  push(bytes.length, countBits(version));
  for (const b of bytes) push(b, 8);

  // Terminator: up to four zero bits, or fewer if capacity runs out first.
  const capacityBits = capacity * 8;
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let w = 0;
    for (let j = 0; j < 8; j++) w = (w << 1) | bits[i + j];
    words.push(w);
  }
  for (let pad = 0xec; words.length < capacity; pad ^= 0xec ^ 0x11) words.push(pad);
  return words;
}

/**
 * Split into blocks, error-correct each, and interleave — the step that makes a QR code survive a
 * thumb over one corner. Without interleaving, damage concentrated in one place would exceed one
 * block's recovery budget while the others sat unused.
 */
export function qrFinalCodewords(data: readonly number[], version: number): number[] {
  const [g1, g2] = BLOCKS_M[version];
  const totalBlocks = g1 + g2;
  const ecPerBlock = ECC_PER_BLOCK_M[version];
  const g1Size = Math.floor(data.length / totalBlocks);

  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let at = 0;
  for (let b = 0; b < totalBlocks; b++) {
    const size = b < g1 ? g1Size : g1Size + 1;
    const block = data.slice(at, at + size);
    at += size;
    dataBlocks.push(block);
    ecBlocks.push(rsRemainder(block, ecPerBlock));
  }

  const out: number[] = [];
  const maxData = g1Size + (g2 > 0 ? 1 : 0);
  for (let i = 0; i < maxData; i++) for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ecPerBlock; i++) for (const b of ecBlocks) out.push(b[i]);
  return out;
}

// ── Format and version information ──────────────────────────────────────────────────────────────

/**
 * The 15-bit format field: two bits of EC level, three of mask, and a BCH(15,5) check, then XORed
 * with 0x5412 so an all-zero format cannot look like blank space.
 *
 * Level M is `0b00`. The generator is 0x537.
 */
export function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** The 18-bit version field (versions 7 and up): 6 data bits plus a BCH(18,6) check, generator 0x1F25. */
export function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
  return (version << 12) | rem;
}

// ── Matrix construction ─────────────────────────────────────────────────────────────────────────

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

class Grid {
  readonly size: number;
  readonly modules: boolean[];
  readonly reserved: boolean[];

  constructor(version: number) {
    this.size = version * 4 + 17;
    this.modules = new Array<boolean>(this.size * this.size).fill(false);
    this.reserved = new Array<boolean>(this.size * this.size).fill(false);
  }
  idx(row: number, col: number): number {
    return row * this.size + col;
  }
  get(row: number, col: number): boolean {
    return this.modules[this.idx(row, col)];
  }
  /** Set a function module: written AND reserved, so data placement and masking both skip it. */
  fn(row: number, col: number, dark: boolean): void {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return;
    this.modules[this.idx(row, col)] = dark;
    this.reserved[this.idx(row, col)] = true;
  }
}

const bitAt = (value: number, i: number): boolean => ((value >> i) & 1) !== 0;

function drawFunctionPatterns(g: Grid, version: number): void {
  const n = g.size;

  // Timing patterns first: the finders overwrite their ends, which is the correct order.
  for (let i = 0; i < n; i++) {
    g.fn(6, i, i % 2 === 0);
    g.fn(i, 6, i % 2 === 0);
  }

  const finder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= n || c >= n) continue;
        const ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        g.fn(r, c, ring !== 2 && ring <= 3); // 7×7 with a light ring at distance 2; the separator is ring 4
      }
    }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);

  const centres = ALIGNMENT[version];
  for (const r of centres) {
    for (const c of centres) {
      // The three finder corners already own these positions.
      if ((r === 6 && c === 6) || (r === 6 && c === centres[centres.length - 1]) || (r === centres[centres.length - 1] && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          g.fn(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  /*
   * Reserve the format areas so data placement steps over them; the real bits are written last.
   *
   * ⚠ i === 6 IS SKIPPED, and it matters. Row 6 column 8 and row 8 column 6 belong to the TIMING
   * patterns, not to the format field — the format field runs rows 0–5, 7, 8 of column 8 and the
   * mirror of that in row 8. Writing `false` across the whole strip blanked one module of each timing
   * pattern, which the timing test caught: a decoder locks onto the alternating run to establish the
   * module grid, and a hole in it is exactly the kind of damage that makes a code read intermittently
   * rather than not at all. They are already reserved by the timing loop above.
   */
  for (let i = 0; i <= 8; i++) {
    if (i === 6) continue;
    g.fn(8, i, false);
    g.fn(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    g.fn(8, n - 1 - i, false);
    g.fn(n - 1 - i, 8, false);
  }
  g.fn(n - 8, 8, true); // the dark module — always set, at (4·version + 9, 8)

  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = bitAt(bits, i);
      const a = n - 11 + (i % 3);
      const b = Math.floor(i / 3);
      g.fn(b, a, dark);
      g.fn(a, b, dark);
    }
  }
}

/** Zigzag placement: two-module columns, right to left, alternating direction, skipping column 6. */
function placeCodewords(g: Grid, codewords: readonly number[]): void {
  const n = g.size;
  let bit = 0;
  const total = codewords.length * 8;
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the vertical timing pattern is not a data column
    for (let v = 0; v < n; v++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const row = upward ? n - 1 - v : v;
        if (g.reserved[g.idx(row, col)]) continue;
        // Past the end, remainder modules stay light — the standard's own rule.
        g.modules[g.idx(row, col)] = bit < total && bitAt(codewords[bit >> 3], 7 - (bit & 7));
        bit++;
      }
    }
    upward = !upward;
  }
}

function applyMask(g: Grid, mask: number): void {
  const f = MASKS[mask];
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      if (g.reserved[g.idx(r, c)]) continue;
      if (f(r, c)) g.modules[g.idx(r, c)] = !g.modules[g.idx(r, c)];
    }
  }
}

function drawFormat(g: Grid, mask: number): void {
  const bits = formatBits(mask);
  const n = g.size;
  for (let i = 0; i <= 5; i++) g.fn(i, 8, bitAt(bits, i));
  g.fn(7, 8, bitAt(bits, 6));
  g.fn(8, 8, bitAt(bits, 7));
  g.fn(8, 7, bitAt(bits, 8));
  for (let i = 9; i < 15; i++) g.fn(8, 14 - i, bitAt(bits, i));

  for (let i = 0; i < 8; i++) g.fn(8, n - 1 - i, bitAt(bits, i));
  for (let i = 8; i < 15; i++) g.fn(n - 15 + i, 8, bitAt(bits, i));
  g.fn(n - 8, 8, true);
}

/**
 * The four penalty rules, summed. Lower is better; the encoder tries all eight masks and keeps the
 * best. This is what stops a code coming out with large blank runs a scanner would mistake for
 * background, or with false finder patterns in the middle of the data.
 */
export function maskPenalty(size: number, get: (r: number, c: number) => boolean): number {
  let penalty = 0;

  // Rule 1 — runs of five or more of one colour, in rows and in columns.
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < size; a++) {
      let run = 1;
      let prev = pass === 0 ? get(a, 0) : get(0, a);
      for (let b = 1; b < size; b++) {
        const cur = pass === 0 ? get(a, b) : get(b, a);
        if (cur === prev) {
          run++;
          if (run === 5) penalty += 3;
          else if (run > 5) penalty += 1;
        } else {
          run = 1;
          prev = cur;
        }
      }
    }
  }

  // Rule 2 — every 2×2 block of one colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = get(r, c);
      if (v === get(r, c + 1) && v === get(r + 1, c) && v === get(r + 1, c + 1)) penalty += 3;
    }
  }

  // Rule 3 — the finder-lookalike 1:1:3:1:1 with four light modules on either side.
  const A = [true, false, true, true, true, false, true, false, false, false, false];
  const B = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (r: number, c: number, dr: number, dc: number, pat: boolean[]): boolean => {
    for (let i = 0; i < 11; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      if (rr >= size || cc >= size) return false;
      if (get(rr, cc) !== pat[i]) return false;
    }
    return true;
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matches(r, c, 0, 1, A) || matches(r, c, 0, 1, B)) penalty += 40;
      if (matches(r, c, 1, 0, A) || matches(r, c, 1, 0, B)) penalty += 40;
    }
  }

  // Rule 4 — how far the dark proportion strays from half.
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (get(r, c)) dark++;
  const percent = (dark * 100) / (size * size);
  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return penalty;
}

/**
 * Encode `text` as a QR code at level M.
 *
 * Throws if the text is longer than version 10 holds (213 bytes) — a caller passing something that
 * large has a different problem, and silently truncating a URL would produce a code that scans
 * perfectly and goes somewhere wrong.
 */
export function encodeQr(text: string): QrMatrix {
  const bytes = utf8Bytes(text);
  const version = chooseVersion(bytes.length);
  if (version == null) {
    throw new Error(`Too long for a version-${MAX_QR_VERSION} QR code at level M (${bytes.length} bytes)`);
  }

  const codewords = qrFinalCodewords(qrDataCodewords(text, version), version);

  let best: Grid | null = null;
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const g = new Grid(version);
    drawFunctionPatterns(g, version);
    placeCodewords(g, codewords);
    applyMask(g, mask);
    drawFormat(g, mask);
    const p = maskPenalty(g.size, (r, c) => g.get(r, c));
    if (p < bestPenalty) {
      bestPenalty = p;
      best = g;
      bestMask = mask;
    }
  }

  const g = best as Grid;
  return { size: g.size, modules: g.modules, version, mask: bestMask };
}
