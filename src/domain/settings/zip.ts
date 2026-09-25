/**
 * A ZIP file, built in memory — the envelope Export My Data uses once there is more than one CSV to hand
 * over.
 *
 * ══ WHY A HAND-ROLLED "STORED" ZIP AND NOT A LIBRARY ══
 *
 * P-9 §2 allows one row and one tap, so one tap has to produce one file. A nutrition athlete's data is
 * several tables of different shapes, and cramming them into the workout CSV would break the one
 * property that file exists for (one row per set, the shape other trackers import). A ZIP of CSVs is the
 * standard answer, and every OS opens one natively.
 *
 * No compression ("stored", method 0): the files are small text, and a compressor is the bulk of any zip
 * library. Adding a package would also touch `package.json`, which risks the native fingerprint, and a
 * changed fingerprint would stop this shipping to build 8 by OTA. The format for stored entries is short
 * and fixed (PKWARE APPNOTE §4.3), and the test reads the result back with a real unzip.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE), the checksum every ZIP reader verifies. A wrong one makes the archive "damaged". */
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS time and date, from LOCAL parts, so the file's timestamp matches the athlete's clock. */
function dosStamp(at: Date): { time: number; date: number } {
  return {
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2),
    date: ((Math.max(at.getFullYear(), 1980) - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
  };
}

/** Bit 11: the names are UTF-8. Without it a reader may decode an accented name as CP437. */
const UTF8_NAMES = 0x0800;

export function zipStore(entries: ZipEntry[], at: Date): Uint8Array {
  const enc = new TextEncoder();
  const { time, date } = dosStamp(at);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed: 2.0
    lv.setUint16(6, UTF8_NAMES, true);
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed size = size, because stored
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true); // no extra field
    local.set(name, 30);
    locals.push(local, e.data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, UTF8_NAMES, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    // 30 extra, 32 comment, 34 disk, 36 internal attrs, 38 external attrs: all zero
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length + size;
  }

  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}
