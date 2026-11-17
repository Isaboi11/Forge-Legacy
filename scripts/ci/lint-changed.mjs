#!/usr/bin/env node
/**
 * ══ CI: eslint on the files a change touches — the repo does not lint clean as a whole ══
 *
 *   node scripts/ci/lint-changed.mjs <base-ref>
 *
 * Measured on the Sprint 2 base (2026-11-17): `npx eslint .` reports 2,118 errors in 1,830 files — 1,498 in
 * design_reference/ (the designer's prototypes), 573 in site/ (the landing site, deployed with wrangler, not
 * the app), 19 in supabase/functions/ (every Deno `jsr:` import is "unresolved" to the app's config) and ~20 old ones
 * in src/ and scripts/. So CI lints only the app's own code that this change touched, compared with the merge base:
 * src/, scripts/, app-level config. Touching a file means owning its lint.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Not app code, or not lintable with the app's config (see the header). */
export const SKIP = [/^design_reference\//, /^site\//, /^supabase\/functions\//, /^supabase\/seed\//, /^supabase\/apply\//, /^public\//, /^dist\//, /^targets\//, /^modules\//];
const LINTABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

export function lintTargets(changed) {
  return changed
    .map((f) => f.replace(/\\/g, '/'))
    .filter((f) => LINTABLE.test(f) && !SKIP.some((re) => re.test(f)))
    .sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const base = process.argv[2];
  if (!base) {
    console.error('usage: node scripts/ci/lint-changed.mjs <base-ref>');
    process.exit(2);
  }
  const mergeBase = execFileSync('git', ['merge-base', base, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const files = lintTargets(changed).filter((f) => fs.existsSync(path.join(ROOT, f)));
  if (!files.length) {
    console.log(`no lintable app file changed since ${mergeBase.slice(0, 8)}`);
    process.exit(0);
  }
  console.log(`eslint on ${files.length} changed file(s) since ${mergeBase.slice(0, 8)}`);
  const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['eslint', '--max-warnings=-1', ...files], { cwd: ROOT, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
