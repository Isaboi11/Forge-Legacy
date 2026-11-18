#!/usr/bin/env node
/**
 * ══ MODEL COMPARISON, CASE BY CASE — $0 (AI Road to 10 Sprint 3b, PL-7) ══
 *
 *   node scripts/evals/compare.mjs --suite <name> --models <base>,<other>[,<other>…] [--json]
 *
 * Grades each model's recordings under its CURRENT prompt hash (the same replay run.mjs does, through the suite's real
 * grade) and lists, for every other model, the cases the FIRST model passed and it fails. A switch is "at least as
 * good" only when its metric is no lower AND that list is empty — a model that gains ten cases while it lets one
 * allergen through, or stops one emergency fewer, is not as good (the switch rule, Sprint 3 plan §5; the gate's
 * "no regressions hidden by gains", Sprint 3b contract §1.1). Never calls a model.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSuites } from './lib/runner.mjs';
import { promptHash } from './lib/prompt-hash.mjs';
import { recordingsRoot, state } from './lib/store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function parseArgs(argv) {
  const a = { suite: null, models: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--suite') a.suite = argv[++i];
    else if (k === '--models') a.models = String(argv[++i] ?? '').split(',').map((m) => m.trim()).filter(Boolean);
    else if (k === '--json') a.json = true;
    else throw new Error(`unknown argument ${k}`);
  }
  if (!a.suite) throw new Error('say --suite <name>');
  if (a.models.length < 2) throw new Error('say --models <base>,<other>[,…] (at least two)');
  return a;
}

/** One model's per-case verdicts under its current hash; `null` when it has no current recordings. */
export async function gradeModel(suite, model, { root = ROOT, recordings = recordingsRoot(root) } = {}) {
  const s = { ...suite, model };
  const hash = promptHash(s, root);
  const st = state(recordings, s.name, hash);
  if (st.state !== 'current') return { model, hash: hash.slice(0, 12), status: st.state, cases: null };
  const out = new Map();
  for (const c of await s.cases()) {
    const rec = st.current.get(String(c.id));
    if (!rec) {
      out.set(String(c.id), { pass: false, notes: 'no recording' });
      continue;
    }
    const g = await s.grade(c, { reply: rec.reply, usage: rec.usage });
    out.set(String(c.id), { pass: !!g.pass, notes: g.notes ?? '' });
  }
  return { model, hash: hash.slice(0, 12), status: 'current', cases: out };
}

/** The base's passes the other fails, and the other's passes the base fails. */
export function regressions(base, other) {
  const lost = [];
  const won = [];
  for (const [id, b] of base.cases) {
    const o = other.cases.get(id) ?? { pass: false, notes: 'missing' };
    if (b.pass && !o.pass) lost.push({ id, notes: o.notes });
    if (!b.pass && o.pass) won.push({ id, notes: b.notes });
  }
  return { lost, won };
}

export async function compare(suiteName, models, opts = {}) {
  const suite = (await loadSuites(opts.root ?? ROOT)).find((s) => s.name === suiteName);
  if (!suite) throw new Error(`no suite named ${suiteName}`);
  const graded = [];
  for (const m of models) graded.push(await gradeModel(suite, m, opts));
  const [base, ...rest] = graded;
  const passed = (g) => (g.cases ? [...g.cases.values()].filter((v) => v.pass).length : null);
  return {
    suite: suiteName,
    base: { model: base.model, hash: base.hash, status: base.status, passed: passed(base), n: base.cases?.size ?? null },
    others: rest.map((g) => ({
      model: g.model,
      hash: g.hash,
      status: g.status,
      passed: passed(g),
      n: g.cases?.size ?? null,
      ...(base.cases && g.cases ? regressions(base, g) : { lost: null, won: null }),
    })),
  };
}

function print(r, log) {
  log(`${r.suite}: base ${r.base.model} [${r.base.status} ${r.base.hash}] ${r.base.passed ?? '-'}/${r.base.n ?? '-'}`);
  for (const o of r.others) {
    if (o.status !== 'current' || r.base.status !== 'current') {
      log(`  ${o.model} [${o.status} ${o.hash}] — not comparable (record it under the current prompt first)`);
      continue;
    }
    const asGood = o.passed >= r.base.passed && o.lost.length === 0;
    log(`  ${o.model} [${o.hash}] ${o.passed}/${o.n} · +${o.won.length} −${o.lost.length} vs base → ${asGood ? 'AT LEAST AS GOOD' : 'NOT as good'}`);
    for (const l of o.lost) log(`    − ${l.id}: ${l.notes}`);
  }
}

export async function main(argv, { log = console.log, root = ROOT } = {}) {
  const a = parseArgs(argv);
  const r = await compare(a.suite, a.models, { root });
  if (a.json) log(JSON.stringify(r, null, 2));
  else print(r, log);
  return 0;
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
