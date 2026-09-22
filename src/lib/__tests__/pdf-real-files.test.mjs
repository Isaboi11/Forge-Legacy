import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { extractPdfText, pdfErrorReason } from '../pdf-text.ts';
import { parseProgramTable } from '../../domain/program/import-parse.ts';

/*
 * REAL PDF FILES, generated for the import stress test (2026-09-21) with PyMuPDF — the shapes a bought
 * program actually arrives as. `pdf-text.test.mjs` proves the extractor on a hand-written fixture; this
 * proves the whole path the "Upload a PDF" button runs: bytes → text → parser → what the athlete sees.
 */

const here = dirname(fileURLToPath(import.meta.url));
const pdf = (name) => new Uint8Array(readFileSync(join(here, 'fixtures', name)));

test('a designed PDF with two days side by side reads as two days, not one day of merged names', async () => {
  const r = parseProgramTable(await extractPdfText(pdf('two-column-days.pdf')));
  assert.equal(r.ok, true);
  assert.deepEqual(r.weeks[0].days.map((d) => d.name), ['PUSH', 'PULL']);
  assert.deepEqual(r.weeks[0].days[1].items.map((i) => i.name), ['Deadlift', 'Pull Ups', 'Seated Row', 'Hammer Curl']);
  assert.deepEqual(r.skipped, ['SUMMER SHRED · 4 DAY SPLIT']);
});

test('a 12-week PDF: the intro page and the header on every page are not exercises', async () => {
  const r = parseProgramTable(await extractPdfText(pdf('12-week-with-fluff.pdf')));
  assert.equal(r.ok, true);
  assert.equal(r.weeks.length, 12);
  assert.ok(r.weeks.every((w) => w.days.length === 4 && w.days.every((d) => d.items.length === 3)));
  assert.ok(!r.weeks.flatMap((w) => w.days.flatMap((d) => d.items.map((i) => i.name))).some((n) => /BLUEPRINT/.test(n)));
});

test('a scanned PDF has no text — the picker says so rather than filling the box with nothing', async () => {
  assert.equal((await extractPdfText(pdf('scanned.pdf'))).trim(), '');
});

test('a password-protected PDF and a file that is not a PDF each say what is wrong', async () => {
  await assert.rejects(extractPdfText(pdf('password.pdf')), (e) => /password-protected/.test(pdfErrorReason(e) ?? ''));
  await assert.rejects(extractPdfText(pdf('not-a-pdf.pdf')), (e) => /isn’t a readable PDF/.test(pdfErrorReason(e) ?? ''));
  assert.equal(pdfErrorReason(new Error('anything else')), null);
});
