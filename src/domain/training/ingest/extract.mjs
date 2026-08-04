/*
 * extract.mjs — Programs `.docx` → intermediate structured JSON (Decision Queue #6).
 *
 * NON-DESTRUCTIVE: reads the `.docx` (a ZIP of `word/document.xml`) and never writes
 * to them. Emits, per program, an intermediate JSON + a human-readable text dump, plus
 * a global parse-issues report. Anything the parser cannot cleanly read is FLAGGED, not
 * guessed (per PO directive). Zero dependencies (node:zlib + a tiny ZIP central-dir reader).
 *
 * Run:  node src/domain/training/ingest/extract.mjs
 * Output: src/domain/training/ingest/out/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const OUT = join(HERE, 'out');

/** The authored Strength program specs. Other families have no `.docx` (content gap). */
const SOURCES = [
  { slug: 'strength-foundation-i-3day', expectTitle: 'Strength Foundation I (3-Day)', file: 'Programs/Strength/Strength Foundation I (3-day)/Strength-Foundation-I-3-Day-v1.0.docx' },
  { slug: 'strength-foundation-i-4day', expectTitle: 'Strength Foundation I (4-Day)', file: 'Programs/Strength/Strength Foundation I (4-Day)/Strength-Foundation-I-4-Day-v1.0.docx' },
  { slug: 'strength-foundation-ii-3day', expectTitle: 'Strength Foundation II (3-Day)', file: 'Programs/Strength/Strength Foundation II (3-day)/Strength-Foundation-II-3-Day-v1.0.docx' },
  { slug: 'strength-foundation-ii-4day', expectTitle: 'Strength Foundation II (4-Day)', file: 'Programs/Strength/Strength Foundation II (4-Day)/Strength-Foundation-II-4-Day-v1.0.docx' },
];

// ── Minimal ZIP reader: pull one entry (word/document.xml) via the central directory ──
function readZipEntry(buf, name) {
  // End Of Central Directory record: signature 0x06054b50, scanned from the end.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('EOCD not found (not a zip?)');
  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // central directory offset
  for (let e = 0; e < entries; e++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central dir header');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const fnLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const fname = buf.toString('utf8', p + 46, p + 46 + fnLen);
    if (fname === name) {
      // Local file header: data begins after the (possibly different) local fn+extra.
      const lfnLen = buf.readUInt16LE(localOff + 26);
      const lextraLen = buf.readUInt16LE(localOff + 28);
      const dataStart = localOff + 30 + lfnLen + lextraLen;
      const raw = buf.subarray(dataStart, dataStart + compSize); // already a Buffer
      return method === 8 ? inflateRawSync(raw) : raw;
    }
    p += 46 + fnLen + extraLen + commentLen;
  }
  throw new Error(`entry not found: ${name}`);
}

function docxParagraphs(file) {
  const buf = readFileSync(file);
  let xml = readZipEntry(buf, 'word/document.xml').toString('utf8');
  xml = xml.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t');
  const text = xml.replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/\u00a0/g, ' ').trim())
    .filter((l) => l.length);
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}

// ── Metadata (key: value lines at the top) ──────────────────────────────────
function parseMeta(lines) {
  const meta = { goals: [], outcome: [] };
  const kv = (label) => {
    const l = lines.find((x) => x.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return l ? l.slice(l.indexOf(':') + 1).trim() : null;
  };
  meta.title = lines[0];
  meta.version = kv('Version');
  meta.status = kv('Status');
  meta.family = kv('Program Family');
  meta.environment = kv('Environment');
  const dur = kv('Duration');
  meta.durationWeeks = dur ? parseInt(dur, 10) : null;
  const freq = kv('Frequency');
  meta.frequencyPerWeek = freq ? parseInt(freq, 10) : null;
  meta.successor = kv('Successor Program');
  /*
   * A SECTION ALSO ENDS WHERE THE DOCUMENT STARTS OVER.
   *
   * Some sources repeat their whole header partway through (a duplicated cover block). Without the
   * title as a terminator, `sliceBetween` runs straight past it and the section absorbs the repeat:
   * Foundation I's goals ended up holding "Version: 1.0Status: LOCKED…", "Program Description" and the
   * description paragraphs as if an athlete were meant to read them. Every section gets this guard,
   * not just goals — the next document to repeat itself will do so under whichever heading it likes.
   */
  const restart = [meta.title];
  // Description = the paragraph(s) between "Program Description" and "Program Goals".
  meta.description = sliceBetween(lines, 'Program Description', ['Program Goals', 'Program Outcome', ...restart]).join(' ') || null;
  meta.goals = sliceBetween(lines, 'Program Goals', ['Program Outcome', 'Weeks', 'Program Notes', ...restart]).map(stripBullet);
  meta.outcome = sliceBetween(lines, 'Program Outcome', ['Weeks', 'Program Notes', ...restart]).map(stripBullet);
  return meta;
}

function sliceBetween(lines, startLabel, endLabels) {
  const start = lines.findIndex((l) => l.toLowerCase() === startLabel.toLowerCase());
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (endLabels.some((e) => lines[i].toLowerCase().startsWith(e.toLowerCase()))) break;
    out.push(lines[i]);
  }
  return out;
}
const stripBullet = (s) => s.replace(/^[•–—\-•]\s*/, '').trim();

// ── Exercise prescription tokenizer ─────────────────────────────────────────
// One regex covers: "NAME• 3 sets × 10 reps• Rest: 90 sec", "NAME — 3 × 8",
// "NAME — 2 × 10 per leg", "NAME — 3 carries × 30–40 yards", concatenated variants.
const RX = /([A-Z][^—•\n]*?)\s*[—•]\s*(\d+)\s*(?:sets?|carries)?\s*[×x]\s*(\d+)(?:\s*[–\-]\s*(\d+))?\s*(reps?|seconds?|secs?|minutes?|mins?|yards?)?\s*(per leg|per side)?(?:[.\s]*[•—]?\s*Rest:\s*(\d+)\s*sec)?/gu;

/**
 * Intensity format (Weeks 5–6): a bare exercise-name line followed by
 * "1 × 8 challenging set" / "2 × 8 slightly lighter if needed" lines. Collapse into
 * one normalized "NAME — <sumSets> × <reps>" line so RX picks it up; flag the name.
 */
function collapseIntensity(blob) {
  const lines = blob.split('\n');
  const out = [];
  const intensityNames = new Set();
  for (let i = 0; i < lines.length; i++) {
    const name = lines[i].trim();
    if (/^[A-Z][A-Za-z0-9 .\-/&']+$/.test(name) && !/[×x]/.test(name)) {
      let j = i + 1;
      let sets = 0;
      let reps = null;
      while (j < lines.length && /^\d+\s*[×x]\s*\d+/.test(lines[j].trim())) {
        const mm = lines[j].trim().match(/^(\d+)\s*[×x]\s*(\d+)/);
        sets += +mm[1];
        if (reps == null) reps = +mm[2];
        j++;
      }
      if (sets > 0) {
        out.push(`${name} — ${sets} × ${reps}`);
        intensityNames.add(name);
        i = j - 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return { blob: out.join('\n'), intensityNames };
}

/** Warm-up items are freeform (no sets×reps). Split on bullets/newlines; keep name + detail verbatim. */
function parseWarmup(blob) {
  return blob
    .split(/[•\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const m = seg.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      return m ? { name: m[1].trim(), detail: m[2].trim(), text: seg } : { name: seg, detail: null, text: seg };
    });
}

function parsePrescriptions(rawBlob) {
  const { blob, intensityNames } = collapseIntensity(rawBlob);
  const items = [];
  let lastEnd = 0;
  const residues = [];
  let m;
  RX.lastIndex = 0;
  while ((m = RX.exec(blob)) !== null) {
    if (m.index > lastEnd) {
      const gap = blob.slice(lastEnd, m.index).trim();
      if (gap && !/^(Warm-Up|Main Workout)$/i.test(gap)) residues.push(gap);
    }
    const [, name, sets, reps, repsMax, unitRaw, perRaw, rest] = m;
    items.push({
      name: name.trim(),
      sets: +sets,
      reps: +reps,
      repsMax: repsMax ? +repsMax : null,
      unit: normUnit(unitRaw),
      per: perRaw ? perRaw.replace('per ', '') : null, // 'leg' | 'side' | null
      restSec: rest ? +rest : null,
      intensity: intensityNames.has(name.trim()) || null,
      substitution: null,
      raw: m[0].trim(),
      index: m.index,
    });
    lastEnd = m.index + m[0].length;
  }
  const tail = blob.slice(lastEnd).trim();
  if (tail && !/^(Warm-Up|Main Workout)$/i.test(tail)) residues.push(tail);

  // Attach "(Approved substitution: X — S × R)" to the preceding exercise. RX captures
  // it as an item whose name begins "Approved substitution:" — fold it into the prior item.
  for (let i = items.length - 1; i > 0; i--) {
    const mm = items[i].name.match(/^\(?\s*Approved substitution:\s*(.+)$/i);
    if (mm) {
      items[i - 1].substitution = { name: mm[1].trim(), sets: items[i].sets, reps: items[i].reps, unit: items[i].unit };
      items.splice(i, 1);
    }
  }
  items.forEach((it) => { delete it.index; if (!it.intensity) delete it.intensity; if (!it.substitution) delete it.substitution; });

  // Ignore residues that are just punctuation / substitution scaffolding.
  const realResidues = residues.filter((r) => /[A-Za-z0-9]/.test(r) && !/^\(?Approved substitution/i.test(r) && !/^\)?$/.test(r));
  return { items, residues: realResidues };
}
function normUnit(u) {
  if (!u) return 'reps';
  u = u.toLowerCase();
  if (/^sec|^second/.test(u)) return 'seconds';
  if (/^min/.test(u)) return 'minutes';
  if (/^yard/.test(u)) return 'yards';
  return 'reps';
}

// ── Segment body into blocks → workouts → warmup/main ────────────────────────
const isBlockHeader = (l) => /^Weeks?\s+\d+\s*[–\-]\s*\d+/i.test(l);
const workoutHeader = (l) => l.match(/^Workout\s+([A-Z])\s*[—\-]\s*(.+)$/i);
const isNotesHeader = (l) => /^(Program Notes|Graduation Outcome)$/i.test(l);

function parseBody(lines) {
  // Body starts at the first "Weeks …" header.
  const start = lines.findIndex(isBlockHeader);
  const blocks = [];
  const issues = [];
  if (start < 0) return { blocks, issues: ['no "Weeks …" block header found'] };

  let cur = null; // current block
  let wo = null; // current workout
  let section = 'main';
  const flushWorkout = () => {
    if (!wo) return;
    // Warm-ups are freeform prep drills ("Light treadmill walk — 2 minutes", "Arm Circles …") —
    // mostly non-catalog, so they are preserved verbatim, NOT catalog-linked and NOT fabricated.
    wo.warmup = parseWarmup(wo._warm.join('\n'));
    const main = parsePrescriptions(wo._main.join('\n'));
    wo.main = main.items;
    if (main.residues.length) issues.push({ block: cur.label, workout: wo.code, residue: main.residues });
    if (!main.items.length) issues.push({ block: cur.label, workout: wo.code, note: 'no main exercises parsed' });
    delete wo._warm; delete wo._main;
    cur.workouts.push(wo);
    wo = null;
  };

  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (isNotesHeader(l)) { flushWorkout(); break; }
    if (isBlockHeader(l)) {
      flushWorkout();
      cur = { label: l, workouts: [] };
      blocks.push(cur);
      continue;
    }
    const wh = workoutHeader(l);
    if (wh) {
      flushWorkout();
      wo = { code: wh[1].toUpperCase(), name: wh[2].trim(), _warm: [], _main: [] };
      section = 'main'; // default; only switch to warm when a Warm-Up label appears
      continue;
    }
    if (!wo) continue;
    if (/^Warm-?Up$/i.test(l)) { section = 'warm'; continue; }
    if (/^Main Workout$/i.test(l)) { section = 'main'; continue; }
    (section === 'warm' ? wo._warm : wo._main).push(l);
  }
  flushWorkout();
  return { blocks, issues };
}

// ── Source verification (guard) ─────────────────────────────────────────────
function verify(meta, lines, expectTitle) {
  const reasons = [];
  const joined = lines.join('\n').toLowerCase();
  const hasStructure = /main workout/i.test(joined) || /^workout\s+[a-z]/im.test(joined);
  const titleMatch = meta.title && meta.title.replace(/\s+/g, ' ').toLowerCase() === expectTitle.toLowerCase();
  const looksResearch = /research|benchmark/.test((lines[1] || '').toLowerCase()) || /research objective/i.test(joined.slice(0, 400));
  if (!titleMatch) reasons.push(`title "${meta.title}" != expected "${expectTitle}"`);
  if (!hasStructure) reasons.push('no Workout/Main-Workout structure found');
  if (looksResearch) reasons.push('reads as a research/benchmark document, not a program spec');
  if (meta.family !== 'Strength') reasons.push(`Program Family is "${meta.family}", expected Strength`);
  const verified = titleMatch && hasStructure && !looksResearch;
  return { verified, reasons };
}

// ── Drive ───────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const parseIssues = [];
const summary = [];

for (const src of SOURCES) {
  const path = join(REPO, src.file);
  let lines;
  try {
    lines = docxParagraphs(path);
  } catch (e) {
    summary.push({ slug: src.slug, verified: false, error: String(e.message) });
    parseIssues.push({ slug: src.slug, fatal: String(e.message) });
    continue;
  }
  writeFileSync(join(OUT, `${src.slug}.dump.txt`), lines.join('\n'), 'utf8');
  const meta = parseMeta(lines);
  const v = verify(meta, lines, src.expectTitle);

  if (!v.verified) {
    // GUARD: do not emit structured data from an unverifiable file.
    summary.push({ slug: src.slug, title: meta.title, status: meta.status, verified: false, reasons: v.reasons });
    parseIssues.push({ slug: src.slug, verified: false, reasons: v.reasons, note: 'NOT EMITTED — flagged for PO (see review gate FLAG 1)' });
    writeFileSync(join(OUT, `${src.slug}.extracted.json`), JSON.stringify({ slug: src.slug, verified: false, reasons: v.reasons, meta }, null, 2), 'utf8');
    continue;
  }

  const body = parseBody(lines);
  const exerciseCount = body.blocks.reduce((n, b) => n + b.workouts.reduce((k, w) => k + w.main.length, 0), 0);
  const out = { slug: src.slug, sourceFile: src.file, verified: true, meta, blocks: body.blocks };
  writeFileSync(join(OUT, `${src.slug}.extracted.json`), JSON.stringify(out, null, 2), 'utf8');
  if (body.issues.length) parseIssues.push({ slug: src.slug, issues: body.issues });
  if (meta.status && !/locked/i.test(meta.status)) parseIssues.push({ slug: src.slug, statusFlag: `Status is "${meta.status}" (not LOCKED)` });
  summary.push({
    slug: src.slug, title: meta.title, status: meta.status, verified: true,
    family: meta.family, durationWeeks: meta.durationWeeks, frequencyPerWeek: meta.frequencyPerWeek,
    blocks: body.blocks.length, workouts: body.blocks.reduce((n, b) => n + b.workouts.length, 0), mainExercises: exerciseCount,
  });
}

writeFileSync(join(OUT, 'parse-issues.json'), JSON.stringify(parseIssues, null, 2), 'utf8');
writeFileSync(join(OUT, 'extract-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
console.log('\nparse-issues:', parseIssues.length ? JSON.stringify(parseIssues, null, 2) : 'none');
