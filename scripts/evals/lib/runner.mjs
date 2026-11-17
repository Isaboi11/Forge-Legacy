/**
 * ══ THE EVAL RUNNER — one policy for every suite (Docs/AI-Sprint-2-Build-Notes.md §1.4, plan PL-6) ══
 *
 * Offline (the default, $0): replay the recordings made under the CURRENT prompt hash through the suite's `grade`,
 * which runs the REAL parser / guard from src/. Plus the suite's deterministic checks (no model at all).
 *
 *   GRADED      recordings under the current hash → every case graded (a case without one counts as a fail),
 *               the metric must meet `threshold`, and every deterministic check must pass.
 *   STALE       recordings only under OLDER hashes → FAIL. The prompt (or model) changed since they were made, so
 *               they say nothing about what would deploy. "re-record: ~$X live".
 *   UNRECORDED  never recorded → the deterministic checks decide, with a loud warning
 *               "UNRECORDED — record on the next live run (~$X)".
 *
 * Live (`run.mjs --live --budget <usd>`): prints the estimate, refuses without a budget or when the estimate is
 * over it, stops the moment the MEASURED spend passes it, and with --record writes recordings. ⛔ No branch runs
 * it: live calls spend the PO's money on the one key every AI feature shares (a 09-21 run drained it). The
 * integrator asks the PO first.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { promptHash } from './prompt-hash.mjs';
import { recordingsRoot, state, writeRecording } from './store.mjs';

/** USD per million tokens — Docs/AI-Sprint-1-Build-Notes.md §2 (0268's coach_ai_config.model_rates). */
export const MODEL_RATES = {
  'claude-sonnet-5': { in: 2, out: 10, read: 0.2, write: 2.5 },
  'claude-sonnet-5-5': { in: 2, out: 10, read: 0.1, write: 2.5 },
  'claude-haiku-4-5': { in: 1, out: 5, read: 0.1, write: 1.25 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, read: 0.01, write: 0.125 },
  'claude-opus-5-5': { in: 4, out: 20, read: 0.2, write: 5 },
  'claude-opus-5': { in: 5, out: 25, read: 0.5, write: 6.25 },
  default: { in: 2, out: 10, read: 0.2, write: 2.5 },
};

/** Exact key, else the longest key that prefixes the model, else default (the 0268 lookup). */
export function ratesFor(model) {
  if (MODEL_RATES[model]) return MODEL_RATES[model];
  const k = Object.keys(MODEL_RATES)
    .filter((x) => x !== 'default' && String(model ?? '').startsWith(x))
    .sort((a, b) => b.length - a.length)[0];
  return MODEL_RATES[k ?? 'default'];
}

/** The measured cost of one call from its usage block. */
export function costOf(usage, model) {
  const r = ratesFor(model);
  const u = usage ?? {};
  return ((u.input_tokens ?? 0) * r.in + (u.output_tokens ?? 0) * r.out + (u.cache_read_input_tokens ?? 0) * r.read + (u.cache_creation_input_tokens ?? 0) * r.write) / 1e6;
}

/** Every suite in scripts/evals/suites/ — any `.mjs` there that exports `suite`. */
export async function loadSuites(root) {
  const dir = path.join(root, 'scripts', 'evals', 'suites');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort() : [];
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    if (!mod.suite) throw new Error(`evals: ${f} exports no \`suite\``);
    validateSuite(mod.suite, f);
    out.push(mod.suite);
  }
  return out;
}

/** The interface (§1.4), checked so a malformed suite fails loudly instead of passing quietly. */
export function validateSuite(s, label = s?.name) {
  const need = (cond, what) => {
    if (!cond) throw new Error(`evals: suite ${label}: ${what}`);
  };
  need(typeof s.name === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(s.name), 'name is a kebab-case string');
  need(Array.isArray(s.functions) && s.functions.length > 0, 'functions lists the slugs it gates');
  need(Array.isArray(s.promptSources) && s.promptSources.length > 0, 'promptSources names what is hashed');
  need(typeof s.model === 'string', 'model is set');
  need(typeof s.cases === 'function', 'cases() exists');
  need(typeof s.grade === 'function', 'grade() exists');
  need(typeof s.callLive === 'function', 'callLive() exists');
  need(typeof s.estimateUsd === 'function', 'estimateUsd() exists');
  need(s.threshold && typeof s.threshold.min === 'number' && ['pass_rate', 'mean_score'].includes(s.threshold.metric), 'threshold { metric: pass_rate|mean_score, min }');
}

const usd = (x) => `$${x < 0.01 ? x.toFixed(4) : x.toFixed(2)}`;

/**
 * Offline evaluation of one suite.
 * @returns {Promise<{ suite: string, functions: string[], hash: string, status: 'GRADED' | 'STALE' | 'UNRECORDED', verdict: 'pass' | 'fail', cases: number, deterministic: { total: number, failed: { id: string, notes?: string }[] }, graded: { n: number, passed: number, missing: number, metric: number | null }, estimateUsd: number, messages: string[] }>}
 */
export async function evaluateSuite(suite, { root, recordings = recordingsRoot(root) }) {
  const hash = promptHash(suite, root);
  const cases = await suite.cases();
  const ids = new Set();
  for (const c of cases) {
    if (ids.has(c.id)) throw new Error(`evals: ${suite.name}: duplicate case id ${c.id}`);
    ids.add(c.id);
  }
  const det = suite.deterministic ? await suite.deterministic() : [];
  const detFailed = det.filter((d) => !d.pass).map((d) => ({ id: d.id, notes: d.notes }));
  const estimate = Number(suite.estimateUsd(cases)) || 0;
  const st = state(recordings, suite.name, hash);
  const messages = [];
  const base = { suite: suite.name, functions: suite.functions, hash, cases: cases.length, deterministic: { total: det.length, failed: detFailed }, estimateUsd: estimate };

  if (detFailed.length) messages.push(`${detFailed.length} of ${det.length} deterministic check(s) failed: ${detFailed.slice(0, 5).map((d) => `${d.id}${d.notes ? ` (${d.notes})` : ''}`).join('; ')}`);

  if (st.state === 'stale') {
    messages.push(`STALE — recordings exist only for older prompts (${st.older.join(', ')}); the current prompt is ${hash.slice(0, 12)}. re-record: ~${usd(estimate)} live`);
    return { ...base, status: 'STALE', verdict: 'fail', graded: { n: 0, passed: 0, missing: cases.length, metric: null }, messages };
  }
  if (st.state === 'unrecorded') {
    messages.push(`UNRECORDED — record on the next live run (~${usd(estimate)}). Only the deterministic checks gated this.`);
    return { ...base, status: 'UNRECORDED', verdict: detFailed.length ? 'fail' : 'pass', graded: { n: 0, passed: 0, missing: cases.length, metric: null }, messages };
  }

  let passed = 0;
  let scoreSum = 0;
  let missing = 0;
  const fails = [];
  for (const c of cases) {
    const rec = st.current.get(String(c.id));
    if (!rec) {
      missing++;
      fails.push(`${c.id}: no recording under the current prompt`);
      continue;
    }
    const g = await suite.grade(c, { reply: rec.reply, usage: rec.usage });
    if (g.pass) passed++;
    else fails.push(`${c.id}: ${g.notes ?? 'failed'}`);
    scoreSum += typeof g.score === 'number' ? g.score : g.pass ? 1 : 0;
  }
  const metric = suite.threshold.metric === 'pass_rate' ? passed / Math.max(1, cases.length) : scoreSum / Math.max(1, cases.length);
  const meets = metric >= suite.threshold.min;
  if (missing) messages.push(`${missing} case(s) have no recording under the current prompt (counted as fails) — re-record them`);
  if (!meets) messages.push(`${suite.threshold.metric} ${metric.toFixed(3)} < ${suite.threshold.min}: ${fails.slice(0, 5).join(' | ')}`);
  return { ...base, status: 'GRADED', verdict: meets && !detFailed.length ? 'pass' : 'fail', graded: { n: cases.length - missing, passed, missing, metric }, messages };
}

/**
 * The live run. ⛔ Spends money. Refuses without a budget, and when the estimate is over it; stops when the
 * measured spend passes it. `record` writes the recordings the offline replay grades.
 */
export async function runLive(suite, { root, apiKey, budget, record = false, recordings = recordingsRoot(root), log = console.log, now = () => new Date() }) {
  const cases = await suite.cases();
  const estimate = Number(suite.estimateUsd(cases)) || 0;
  log(`${suite.name}: ${cases.length} case(s), estimated ${usd(estimate)} on ${suite.model}`);
  if (!(Number(budget) > 0)) throw new Error(`refusing: --live needs --budget <usd> (estimate ${usd(estimate)})`);
  if (estimate > Number(budget)) throw new Error(`refusing: the estimate ${usd(estimate)} is over the budget ${usd(Number(budget))}`);
  if (!apiKey) throw new Error('refusing: no ANTHROPIC_API_KEY (use the PO’s evals key, never the app’s)');
  const hash = promptHash(suite, root);
  let spent = 0;
  let done = 0;
  for (const c of cases) {
    if (spent >= Number(budget)) {
      log(`stopped: measured spend ${usd(spent)} reached the budget after ${done} case(s)`);
      break;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 120_000);
    let out;
    try {
      out = await suite.callLive(c, { apiKey, signal: ctl.signal });
    } finally {
      clearTimeout(t);
    }
    spent += costOf(out?.usage, suite.model);
    done++;
    if (record) writeRecording(recordings, { suite: suite.name, hash, model: suite.model, caseId: c.id, reply: out?.reply ?? null, usage: out?.usage ?? null, now: now() });
  }
  log(`${suite.name}: ${done} live call(s), measured ${usd(spent)}${record ? `, recorded under ${hash.slice(0, 12)}` : ''}`);
  return { done, spent, hash };
}

/** One line per result, for people. */
export function formatResult(r) {
  const head = `${r.verdict === 'pass' ? '✓' : '✕'} ${r.suite} [${r.status}] gates ${r.functions.join(', ')} · prompt ${r.hash.slice(0, 12)} · ${r.cases} case(s) · deterministic ${r.deterministic.total - r.deterministic.failed.length}/${r.deterministic.total}`;
  const graded = r.status === 'GRADED' ? ` · graded ${r.graded.passed}/${r.cases} (${r.graded.metric?.toFixed(3)})` : '';
  const loud = r.status === 'UNRECORDED' ? '\n  ⚠⚠ UNRECORDED — this suite has never been run live; only its deterministic checks gated this deploy.' : '';
  return `${head}${graded}${loud}${r.messages.map((m) => `\n  · ${m}`).join('')}`;
}
