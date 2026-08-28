/**
 * pdf-text.test.mjs — a program PDF becomes rows the spreadsheet parser can read.
 *
 * PO: *"make sure it can import files/pdfs. If someone purchases a program it's usually a pdf."*
 *
 * Two halves. The pure half (`itemsToLines`) is tested on hand-built runs, because that is where the
 * judgement lives — what is a column break and what is a word space. The end-to-end half generates a
 * real PDF (uncompressed, Helvetica, absolute text positions — the smallest file `pdf.js` will open),
 * runs it through `extractPdfText` and then through `parseProgramTable`, so the proof is the parser's
 * own output rather than a string that looks right.
 *
 * ⚠ THE FIXTURE IS SYNTHETIC. A purchased program PDF — a designed layout, embedded fonts, maybe two
 *   columns — is the real input, and none has been through this yet. What this proves is the plumbing
 *   and the row rule; the preview in the sheet is what protects the athlete from a wrong read.
 *
 * Run:  node --test src/lib/__tests__/pdf-text.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { extractPdfText, itemsToLines } from '../pdf-text.ts';
import { parseProgramTable } from '../../domain/program/import-parse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

const run = (str, x, y, width) => ({ str, transform: [1, 0, 0, 1, x, y], width });
/** The fixture is ASCII, so UTF-8 and Latin-1 agree — and `TextEncoder` needs no Node global. */
const utf8 = (text) => new TextEncoder().encode(text);

// ─────────────────────────────────────────────────────────────────────────────
// itemsToLines — the row rule
// ─────────────────────────────────────────────────────────────────────────────

test('runs on one baseline become one line, top of the page first', () => {
  const lines = itemsToLines([run('Squat', 72, 680, 30), run('Bench', 72, 700, 32), run('3', 250, 680, 6), run('5', 250, 700, 6)]);
  assert.deepEqual(lines, ['Bench\t5', 'Squat\t3']);
});

test('a wide blank run is a column break; a narrow one is a word space', () => {
  const lines = itemsToLines([
    run('Incline', 72, 700, 40),
    run(' ', 112, 700, 3), // a word space
    run('Press', 115, 700, 30),
    run(' ', 145, 700, 105), // the gap to the next column
    run('3', 250, 700, 6),
  ]);
  assert.deepEqual(lines, ['Incline Press\t3']);
});

test('a jump with no blank run at all is still a column break, and touching runs join', () => {
  const lines = itemsToLines([run('Bench', 72, 700, 32), run(' Press', 104, 700, 36), run('8', 320, 700, 6)]);
  assert.deepEqual(lines, ['Bench Press\t8']);
});

test('baselines that jitter by a fraction of a point are the same row', () => {
  const lines = itemsToLines([run('Row', 72, 700, 20), run('4', 250, 701.4, 6), run('10', 320, 699.2, 12)]);
  assert.deepEqual(lines, ['Row\t4\t10']);
});

test('empty end-of-line markers and blank lines are dropped', () => {
  const lines = itemsToLines([run('', 72, 700, 0), run(' ', 72, 690, 4), run('Deadlift', 72, 680, 44)]);
  assert.deepEqual(lines, ['Deadlift']);
});

// ─────────────────────────────────────────────────────────────────────────────
// extractPdfText — a real file, through pdf.js, into the parser
// ─────────────────────────────────────────────────────────────────────────────

/** The smallest PDF `pdf.js` opens: one page, Helvetica, every run placed with an absolute `Tm`. */
function makePdf(rows) {
  const content = `BT /F1 12 Tf\n${rows.map(([x, y, t]) => `1 0 0 1 ${x} ${y} Tm (${t}) Tj\n`).join('')}ET\n`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(utf8(out).length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = utf8(out).length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return utf8(out);
}

const PROGRAM_PDF = makePdf([
  [72, 720, 'Exercise'], [250, 720, 'Sets'], [320, 720, 'Reps'],
  [72, 700, 'Bench Press'], [250, 700, '3'], [320, 700, '8'],
  [72, 680, 'Incline DB Press'], [250, 680, '3'], [320, 680, '10'],
  [72, 660, 'Cable Fly'], [250, 660, '2'], [320, 660, '15'],
]);

test('a table laid out in a PDF comes back as tab-separated rows', async () => {
  const text = await extractPdfText(PROGRAM_PDF);
  assert.deepEqual(text.split('\n'), [
    'Exercise\tSets\tReps',
    'Bench Press\t3\t8',
    'Incline DB Press\t3\t10',
    'Cable Fly\t2\t15',
  ]);
});

test('⚠ and the spreadsheet parser reads those rows as the program they are', async () => {
  // The proof that matters: not that the text looks right, but that the SAME parser a paste goes
  // through turns it into sets and reps. If the row rule drifts, this is the test that says so.
  const r = parseProgramTable(await extractPdfText(PROGRAM_PDF));
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  const items = r.weeks[0].days[0].items;
  assert.deepEqual(
    items.map((i) => [i.name, i.sets, i.reps]),
    [
      ['Bench Press', 3, 8],
      ['Incline DB Press', 3, 10],
      ['Cable Fly', 2, 15],
    ],
  );
});

test('a PDF with no text (a scan) resolves to nothing rather than throwing', async () => {
  const text = await extractPdfText(makePdf([]));
  assert.equal(text, '');
});

test('a file that is not a PDF rejects — the caller shows the reason, nothing else happens', async () => {
  await assert.rejects(extractPdfText(utf8('not a pdf at all')));
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE TWO BUNDLER HAZARDS STAY HANDLED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `pdf.js`'s Node-only branches carry `import.meta` (a syntax error in a Hermes bundle — the app
 * fails to LOAD, not just this feature) and `require("@napi-rs/canvas")` (native bindings Metro cannot
 * bundle). Both are neutralised in config files nothing else reads; this is what keeps them there.
 */
test('⚠ babel strips import.meta and metro empties @napi-rs/canvas — the config carries both', () => {
  const babel = readFileSync(join(ROOT, 'babel.config.js'), 'utf8');
  assert.match(babel, /MetaProperty\(path\)/, 'babel.config.js no longer strips import.meta');
  // Build 8 (2026-08-28) died in hermesc on pdf.js's `await import(this.workerSrc)` — a dynamic import
  // with a VARIABLE specifier, which Metro passes through and Hermes cannot parse. The web bundle never
  // runs hermesc, so only `npx expo export --platform ios` shows it; this keeps the guard in place.
  assert.match(babel, /t\.isImport\(path\.node\.callee\)/, 'babel.config.js no longer neutralises non-literal dynamic import()');
  assert.match(babel, /ImportExpression\(path\)/, 'the ImportExpression form of dynamic import() is no longer covered');
  assert.match(babel, /presets:\s*\['babel-preset-expo'\]/, 'the Expo preset must stay — this file replaced the implicit default');
  const metro = readFileSync(join(ROOT, 'metro.config.js'), 'utf8');
  assert.match(metro, /moduleName === '@napi-rs\/canvas'/, 'metro.config.js no longer empties @napi-rs/canvas');
  assert.match(metro, /type: 'empty'/);
});

test('the library is loaded lazily, inside the read — never at import time', () => {
  // A top-level import would put a megabyte of PDF engine on the launch path of every screen, and on
  // native would run its module init before anyone tapped anything — the one place a missing global
  // could take the app down rather than a feature.
  const src = readFileSync(join(HERE, '..', 'pdf-text.ts'), 'utf8');
  assert.doesNotMatch(src, /^import (?!type ).* from 'pdfjs-dist/m, 'pdf-text.ts imports pdfjs-dist at the top level');
  assert.match(src, /await import\('pdfjs-dist\/legacy\/build\/pdf\.mjs'\)/);
  assert.match(src, /await import\('pdfjs-dist\/legacy\/build\/pdf\.worker\.mjs'\)/);
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ''), /from '@\//, 'pdf-text.ts must not use the @/ alias — node --test cannot resolve it');
});

/**
 * ⚠ THE NATIVE PICKER IS A NATIVE MODULE, AND BUILD 7 DOES NOT HAVE IT. `expo-document-picker` ships with
 * build 8; an OTA can still carry this JavaScript to build 7. A top-level import would evaluate the
 * module on launch and throw "Cannot find native module" before any screen — the launch-crash shape
 * this repo has shipped once. It must be imported inside the tap, inside a try.
 */
test('⚠ the native file picker loads expo-document-picker lazily, inside the tap, inside a try', () => {
  const src = readFileSync(join(HERE, '..', 'pick-text-file.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(src, /^import .* from 'expo-document-picker'/m, 'pick-text-file.ts imports expo-document-picker at the top level');
  assert.match(src, /try \{\s*picker = await import\('expo-document-picker'\);\s*\} catch/, 'the picker must be loaded lazily in a try');
  assert.match(src, /extractPdfText\(bytes\)/, 'a picked PDF must go through the same reader as the web');
});
