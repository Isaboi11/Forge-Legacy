#!/usr/bin/env node
/**
 * ══ THE DEPLOY GATE — no model or prompt change deploys unless its suite passes (PL-6) ══
 *
 *   node scripts/evals/gate.mjs <function-slug>     the deploy-ai skill calls this before asking the PO
 *   node scripts/evals/gate.mjs --changed <git-ref> every function whose deployable file changed since <ref> (CI)
 *   node scripts/evals/gate.mjs --all
 *
 * For one slug: every suite scripts/deploy-ai/functions.mjs says must gate it has to exist in scripts/evals/suites/
 * and pass OFFLINE (scripts/evals/lib/runner.mjs: graded, stale = fail, unrecorded = deterministic only + a loud
 * warning). A suite found in suites/ that gates the slug but is not in the map runs too (and the map is named as
 * incomplete). A function with no suite passes only with its stated reason (`noSuite`). $0 — never a live call.
 *
 * A suite whose threshold says `floor: 'live'` (import-corpus, kitchen-allergens — PO 2026-11-18) passes when it is
 * no worse than the deployed function: its metric at least the live baseline's in scripts/evals/baselines.json, and
 * every case live passes still passing. Its absolute `min` prints as a target. No baseline = fail (lib/runner.mjs).
 */

import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FUNCTIONS } from '../deploy-ai/functions.mjs';
import { evaluateSuite, formatResult, loadSuites } from './lib/runner.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The slugs whose deployable file (bundle or function folder) changed between `ref` and HEAD. */
export function changedSlugs(files, functions = FUNCTIONS) {
  const out = new Set();
  for (const f of files.map((x) => x.replace(/\\/g, '/'))) {
    let m = /^supabase\/functions\/([a-z0-9-]+)\//.exec(f);
    if (m && functions[m[1]]) out.add(m[1]);
    m = /^supabase\/apply\/deploy-([a-z0-9-]+)\.ts$/.exec(f);
    if (m && functions[m[1]]) out.add(m[1]);
  }
  return [...out].sort();
}

/**
 * Gate one slug.
 * @returns {Promise<{ slug: string, ok: boolean, lines: string[] }>}
 */
export async function gateSlug(slug, { root = ROOT, suites, functions = FUNCTIONS, baselines } = {}) {
  const meta = functions[slug];
  if (!meta) return { slug, ok: false, lines: [`✕ ${slug} is not in scripts/deploy-ai/functions.mjs — add it (its tests, suites and verify_jwt) first`] };
  const all = suites ?? (await loadSuites(root));
  const lines = [];
  let ok = true;
  const wanted = new Set(meta.suites);
  const found = all.filter((s) => s.functions.includes(slug));
  for (const name of wanted) {
    if (!all.some((s) => s.name === name)) {
      ok = false;
      lines.push(`✕ suite ${name} gates ${slug} but scripts/evals/suites/${name}.mjs is missing`);
    }
  }
  for (const s of found) {
    if (!wanted.has(s.name)) lines.push(`⚠ suite ${s.name} gates ${slug} but functions.mjs does not list it — add it there`);
    const r = await evaluateSuite(s, { root, baselines });
    if (r.verdict !== 'pass') ok = false;
    lines.push(formatResult(r));
  }
  if (!wanted.size && !found.length) lines.push(`· ${slug}: no eval suite — ${meta.noSuite ?? 'no reason given (add one to functions.mjs)'}`);
  if (!wanted.size && !found.length && !meta.noSuite) ok = false;
  lines.push(`${ok ? 'GATE PASS' : 'GATE FAIL'} ${slug}`);
  return { slug, ok, lines };
}

export async function main(argv, { root = ROOT, log = console.log, git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }) } = {}) {
  let slugs;
  if (argv[0] === '--all') slugs = Object.keys(FUNCTIONS).sort();
  else if (argv[0] === '--changed') {
    if (!argv[1]) throw new Error('--changed needs a git ref');
    slugs = changedSlugs(git(['diff', '--name-only', `${argv[1]}...HEAD`]).split('\n').filter(Boolean));
    if (!slugs.length) {
      log('no deployable function changed — nothing to gate');
      return 0;
    }
  } else if (argv[0] && !argv[0].startsWith('--')) slugs = [argv[0]];
  else throw new Error('usage: node scripts/evals/gate.mjs <slug> | --changed <ref> | --all');
  const suites = await loadSuites(root);
  let ok = true;
  for (const s of slugs) {
    const r = await gateSlug(s, { root, suites });
    for (const l of r.lines) log(l);
    ok &&= r.ok;
  }
  return ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(String(e?.message ?? e));
      process.exit(2);
    },
  );
}
