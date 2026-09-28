// asc-sync pure core. The function is deployed by pasting ONE file, so the core cannot live in its own
// module: this test cuts the block between the PURE CORE markers out of index.ts and evaluates it.
// Run: node --test supabase/functions/asc-sync/__tests__/core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'index.ts'), 'utf8');
const START = '// ── PURE CORE START ──';
const END = '// ── PURE CORE END ──';
const a = src.indexOf(START);
const b = src.indexOf(END);
assert.ok(a > 0 && b > a, 'PURE CORE markers missing from index.ts');
const block = src.slice(a + START.length, b);
const core = new Function(
  `${block}\nreturn { METRICS, parseTsv, productTypeMetric, aggregateDay, zeroDay, base64url, lastDays, daysBetween };`,
)();

const APP = '6798436104';

test('parseTsv reads columns by header NAME, in any order', () => {
  const tsv = [
    ['Units', 'Country Code', 'Apple Identifier', 'Currency of Proceeds', 'Product Type Identifier', 'Developer Proceeds'].join('\t'),
    ['3', 'US', APP, 'USD', '1F', '0'].join('\t'),
    ['2', 'GB', APP, 'GBP', '3F', '0'].join('\t'),
    '',
  ].join('\r\n');
  const rows = core.parseTsv(tsv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Units'], '3');
  assert.equal(rows[0]['Product Type Identifier'], '1F');
  assert.equal(rows[1]['Country Code'], 'GB');
  assert.deepEqual(core.parseTsv(''), []);
});

test('productTypeMetric maps Apple product types', () => {
  assert.equal(core.productTypeMetric('1F'), 'downloads');
  assert.equal(core.productTypeMetric('1'), 'downloads');
  assert.equal(core.productTypeMetric('F1'), 'downloads');
  assert.equal(core.productTypeMetric('3F'), 'redownloads');
  assert.equal(core.productTypeMetric('7F'), 'updates');
  assert.equal(core.productTypeMetric('IA1'), 'iap');
  assert.equal(core.productTypeMetric('IAY'), 'iap');
  assert.equal(core.productTypeMetric('FI1'), 'iap');
  assert.equal(core.productTypeMetric('ZZ'), null);
  assert.equal(core.productTypeMetric(''), null);
  assert.equal(core.productTypeMetric(undefined), null);
});

test('aggregateDay: totals, per-country downloads, USD-only proceeds, other apps ignored', () => {
  // Deliberately shuffled column order.
  const H = ['Country Code', 'Product Type Identifier', 'Developer Proceeds', 'Units', 'Currency of Proceeds', 'Apple Identifier'];
  const line = (cc, pt, units, cur, proceeds, id) =>
    H.map((h) => ({
      'Country Code': cc,
      'Product Type Identifier': pt,
      'Units': units,
      'Currency of Proceeds': cur,
      'Developer Proceeds': proceeds,
      'Apple Identifier': id,
    })[h]).join('\t');
  const tsv = [
    H.join('\t'),
    line('US', '1F', '5', 'USD', '0', APP),
    line('CA', '1F', '2', 'CAD', '0', APP),
    line('US', '1T', '1', 'USD', '0', APP),
    line('US', '3F', '4', 'USD', '0', APP),
    line('US', '7F', '9', 'USD', '0', APP),
    // IAP: its Apple Identifier is the product's own id, still counted.
    line('US', 'IAY', '2', 'USD', '12.74', '999'),
    line('GB', 'IAY', '1', 'GBP', '10.00', '999'), // non-USD proceeds skipped
    line('US', '1F', '50', 'USD', '0', '123'), // another app on the vendor account: ignored
    line('US', 'ZZ', '7', 'USD', '1', APP), // unknown product type: ignored
  ].join('\n');
  const out = core.aggregateDay(core.parseTsv(tsv), APP, '2026-09-20');
  const get = (metric, dim = '') => out.find((r) => r.metric === metric && r.dim === dim)?.value;
  assert.equal(get('downloads'), 8);
  assert.equal(get('downloads', 'US'), 6);
  assert.equal(get('downloads', 'CA'), 2);
  assert.equal(get('redownloads'), 4);
  assert.equal(get('updates'), 9);
  assert.equal(get('iap'), 3);
  assert.equal(get('proceeds_usd'), 25.48);
  assert.ok(out.filter((r) => r.dim !== '').every((r) => r.metric === 'downloads'));
  assert.ok(out.every((r) => r.day === '2026-09-20'));
});

test('aggregateDay always emits every total, zeros included', () => {
  const out = core.aggregateDay([], APP, '2026-09-01');
  assert.deepEqual(out.map((r) => r.metric), core.METRICS);
  assert.ok(out.every((r) => r.value === 0 && r.dim === ''));
  assert.deepEqual(core.zeroDay('2026-09-01'), out);
});

test('base64url: no padding, URL-safe alphabet, UTF-8 strings', () => {
  assert.equal(core.base64url('{"alg":"ES256"}'), 'eyJhbGciOiJFUzI1NiJ9');
  assert.equal(core.base64url(new Uint8Array([0xfb, 0xff, 0xfe])), '-__-');
  assert.equal(core.base64url(new Uint8Array([0xff])), '_w');
  assert.equal(core.base64url('é'), 'w6k');
});

test('lastDays excludes today, oldest first; daysBetween', () => {
  const d = core.lastDays(new Date(Date.UTC(2026, 2, 2, 15)), 3);
  assert.deepEqual(d, ['2026-02-27', '2026-02-28', '2026-03-01']);
  assert.equal(core.daysBetween('2026-02-27', '2026-03-02'), 3);
});
