#!/usr/bin/env node
/**
 * ══ CI: every node --test suite, with the known failures allowed BY TEST NAME (and nothing else) ══
 *
 *   node scripts/ci/run-tests.mjs            src/**, scripts/**, supabase/** test files, TAP parsed
 *
 * AI Road to 10, PL-6 / audit C-I6 ("There's no `test` script and no workflow"). Runs from the repo root (tests read
 * files relative to it). Exit 1 when any test fails that is not in scripts/ci/known-failures.json — a file that
 * fails to load counts as a failure under its own path, so it can never hide. A known failure that now passes is a
 * notice to take it off the list, not a failure (another branch may have fixed it).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const GLOBS = ['src/**/*.test.mjs', 'scripts/**/*.test.mjs', 'supabase/**/*.test.mjs'];

/** A TAP test name, unescaped (`\#` → `#`, `\\` → `\`), without a trailing directive. */
const unescape = (s) => s.replace(/\s+#\s+(SKIP|TODO)\b.*$/i, '').replace(/\\#/g, '#').replace(/\\\\/g, '\\').trim();

/**
 * The failing LEAF tests in TAP output. A parent whose failure is only its failing children is not counted again
 * (its children come first, indented deeper).
 * @returns {{ failed: string[], passed: number, total: number }}
 */
export function parseTap(tap) {
  const failed = [];
  let passed = 0;
  let total = 0;
  let lastFailIndent = -1;
  for (const line of tap.split(/\r?\n/)) {
    const m = /^(\s*)(not ok|ok) \d+ - (.*)$/.exec(line);
    if (!m) continue;
    const indent = m[1].length;
    const name = unescape(m[3]);
    // A TODO or SKIP test is reported but never counts: a failing TODO is not a failure (TAP's own rule).
    if (/\s#\s*(SKIP|TODO)\b/i.test(m[3])) continue;
    if (m[2] === 'ok') {
      passed++;
      total++;
      continue;
    }
    total++;
    // A failure right after a deeper failure is the parent of what already failed: not a new failure.
    if (lastFailIndent > indent) {
      lastFailIndent = indent;
      total--;
      continue;
    }
    failed.push(name);
    lastFailIndent = indent;
  }
  return { failed, passed, total };
}

/** The verdict against the allowlist. */
export function judge(failed, known) {
  const names = new Set(known.map((k) => k.name));
  const unexpected = failed.filter((f) => !names.has(f));
  const fixed = known.filter((k) => !failed.includes(k.name)).map((k) => k.name);
  return { ok: unexpected.length === 0, unexpected, fixed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const known = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ci/known-failures.json'), 'utf8')).failures;
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', ...GLOBS], { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  const tap = `${r.stdout ?? ''}`;
  const { failed, total } = parseTap(tap);
  const v = judge(failed, known);
  const summary = /^# tests (\d+)$/m.exec(tap)?.[1];
  console.log(`node --test: ${summary ?? total} tests, ${failed.length} failed (${failed.length - v.unexpected.length} known)`);
  for (const f of v.fixed) console.log(`::notice::known failure now passes — take it off scripts/ci/known-failures.json: ${f}`);
  if (!v.ok) {
    for (const f of v.unexpected) console.log(`::error::test failed: ${f}`);
    // The failing tests' own output, for the log.
    console.log(tap.split(/\r?\n/).filter((l) => /not ok|AssertionError|Error:/.test(l)).slice(0, 200).join('\n'));
    process.exit(1);
  }
  if (r.status !== 0 && failed.length === 0) {
    console.log(`::error::node --test exited ${r.status} with no failing test in its output`);
    console.log(`${r.stderr ?? ''}`.slice(-4000));
    process.exit(1);
  }
  process.exit(0);
}
