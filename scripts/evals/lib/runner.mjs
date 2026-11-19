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
 * ══ "NO WORSE THAN LIVE" — `threshold.floor: 'live'` (Sprint 3b §1.1, PO 2026-11-18) ══
 *
 * A suite whose threshold carries `floor: 'live'` is not held to its absolute `min`. It passes when (a) every
 * deterministic check passes, (b) its metric is at least the LIVE baseline's metric, and (c) no case the live
 * baseline passed now fails — a gain somewhere never buys a regression somewhere else. The `min` is still printed,
 * as a target: "target 0.95 — at 0.525 (live 0.475)". The baseline is scripts/evals/baselines.json, written from the
 * real recordings that graded the deployed function; a suite held to live with no baseline FAILS (never a guess),
 * and so does one with no graded run under the current prompt (UNRECORDED). ⛔ Only import-corpus,
 * kitchen-allergens and ask-answers (Sprint 4a, PO 2026-11-18) carry it; ask-safety, chat-safety and anything gating
 * the medical stop keep absolute bars.
 *
 * ACCEPTED LOSSES (Sprint 4a, PO 2026-11-18): a baseline may list `accepted: [{ id, po, why? }]` — cases live passes
 * that the PO knowingly ships failing, by name. They do not fail the gate, and EVERY run prints them as still to fix.
 * An entry with no `po` is refused (the baseline is unusable), so nobody can quietly accept a loss.
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
  // ⚠ A suite that runs the app's own path (import-corpus) keeps one usage per function: `{ 'workout-card-read': {…},
  // 'workout-tidy': {…} }`. Counting only the top level measured $0.00 for a run that cost $0.89 (11-17), which left
  // its budget stop blind. Sum the nested usages too.
  if (u.input_tokens == null && u.output_tokens == null && typeof u === 'object') {
    return Object.values(u).reduce((sum, v) => (v && typeof v === 'object' ? sum + costOf(v, model) : sum), 0);
  }
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
  need(s.threshold.floor === undefined || s.threshold.floor === 'live', "threshold.floor is 'live' or absent");
}

/** scripts/evals/baselines.json — the live baselines a `floor: 'live'` suite is held to. Absent file = no baselines. */
export function baselinesPath(root) {
  return path.join(root, 'scripts', 'evals', 'baselines.json');
}

/** @returns {Record<string, { metric: number, passedCaseIds: string[], recordedAt: string, promptHash: string, source: string }>} */
export function loadBaselines(root) {
  const file = baselinesPath(root);
  if (!fs.existsSync(file)) return {};
  const all = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!all || typeof all !== 'object' || Array.isArray(all)) throw new Error(`evals: ${file} is not an object of suite → baseline`);
  return all;
}

/** A baseline the gate can hold a suite to, or the reason it cannot. */
function usableBaseline(b, metricName) {
  if (!b || typeof b !== 'object') return { why: 'no live baseline' };
  if (typeof b.metric !== 'number' || !Number.isFinite(b.metric)) return { why: 'its live baseline has no metric' };
  if (b.metricName && b.metricName !== metricName) return { why: `its live baseline is a ${b.metricName}, the suite measures ${metricName}` };
  if (!Array.isArray(b.passedCaseIds) || b.passedCaseIds.some((x) => typeof x !== 'string')) return { why: 'its live baseline has no passedCaseIds' };
  if (b.accepted !== undefined && (!Array.isArray(b.accepted) || b.accepted.some((a) => !a || typeof a.id !== 'string' || typeof a.po !== 'string' || !a.po.trim())))
    return { why: 'its live baseline has an accepted loss without the PO decision that accepted it' };
  return { baseline: b };
}

/** Float noise must not fail an equal score (29/61 recomputed is 29/61). */
const EPS = 1e-9;

const usd = (x) => `$${x < 0.01 ? x.toFixed(4) : x.toFixed(2)}`;

/**
 * Offline evaluation of one suite.
 * @returns {Promise<{ suite: string, functions: string[], hash: string, status: 'GRADED' | 'STALE' | 'UNRECORDED', verdict: 'pass' | 'fail', cases: number, deterministic: { total: number, failed: { id: string, notes?: string }[] }, graded: { n: number, passed: number, missing: number, metric: number | null }, estimateUsd: number, messages: string[] }>}
 */
export async function evaluateSuite(suite, { root, recordings = recordingsRoot(root), baselines }) {
  const live = suite.threshold.floor === 'live';
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
    // "No worse than live" needs a graded run to compare: deterministic checks alone cannot show it.
    if (live) messages.push('held to "no worse than live" — an unrecorded suite cannot show that, so it fails');
    return { ...base, status: 'UNRECORDED', verdict: detFailed.length || live ? 'fail' : 'pass', graded: { n: 0, passed: 0, missing: cases.length, metric: null }, messages };
  }

  let passed = 0;
  let scoreSum = 0;
  let missing = 0;
  const fails = [];
  const passedIds = new Set();
  const failNotes = new Map();
  for (const c of cases) {
    const rec = st.current.get(String(c.id));
    if (!rec) {
      missing++;
      fails.push(`${c.id}: no recording under the current prompt`);
      failNotes.set(String(c.id), 'no recording under the current prompt');
      continue;
    }
    const g = await suite.grade(c, { reply: rec.reply, usage: rec.usage });
    if (g.pass) {
      passed++;
      passedIds.add(String(c.id));
    } else {
      fails.push(`${c.id}: ${g.notes ?? 'failed'}`);
      failNotes.set(String(c.id), g.notes ?? 'failed');
    }
    scoreSum += typeof g.score === 'number' ? g.score : g.pass ? 1 : 0;
  }
  const metric = suite.threshold.metric === 'pass_rate' ? passed / Math.max(1, cases.length) : scoreSum / Math.max(1, cases.length);
  const graded = { n: cases.length - missing, passed, missing, metric };
  /** The ids that passed — what a live baseline's `passedCaseIds` is derived from. */
  const passedCaseIds = [...passedIds];
  if (missing) messages.push(`${missing} case(s) have no recording under the current prompt (counted as fails) — re-record them`);

  if (!live) {
    const meets = metric >= suite.threshold.min;
    if (!meets) messages.push(`${suite.threshold.metric} ${metric.toFixed(3)} < ${suite.threshold.min}: ${fails.slice(0, 5).join(' | ')}`);
    return { ...base, status: 'GRADED', verdict: meets && !detFailed.length ? 'pass' : 'fail', graded, passedCaseIds, messages };
  }

  // ── floor: 'live' ──
  const { baseline: b, why } = usableBaseline((baselines ?? loadBaselines(root))[suite.name], suite.threshold.metric);
  if (!b) {
    messages.push(`held to "no worse than live" but ${why} for ${suite.name} in scripts/evals/baselines.json — it fails until one is written from the recordings that graded the deployed function`);
    return { ...base, status: 'GRADED', verdict: 'fail', graded, floor: { kind: 'live', baseline: null, regressed: [] }, messages };
  }
  const caseIds = new Set(cases.map((c) => String(c.id)));
  const acceptedById = new Map((b.accepted ?? []).map((a) => [a.id, a]));
  const lost = b.passedCaseIds.filter((id) => !passedIds.has(id)).map((id) => ({ id, notes: caseIds.has(id) ? failNotes.get(id) : 'no longer a case in the suite — re-baseline it' }));
  const regressed = lost.filter((r) => !acceptedById.has(r.id));
  const accepted = lost.filter((r) => acceptedById.has(r.id)).map((r) => ({ ...r, po: acceptedById.get(r.id).po }));
  const atLeastLive = metric + EPS >= b.metric;
  messages.push(`target ${suite.threshold.min} — at ${metric.toFixed(3)} (live ${b.metric.toFixed(3)})`);
  if (!atLeastLive) messages.push(`${suite.threshold.metric} ${metric.toFixed(3)} < live ${b.metric.toFixed(3)}: ${fails.slice(0, 5).join(' | ')}`);
  if (regressed.length) messages.push(`${regressed.length} case(s) live passes now fail: ${regressed.slice(0, 5).map((r) => `${r.id}: ${r.notes}`).join(' | ')}`);
  if (accepted.length) messages.push(`⚠ ${accepted.length} case(s) live passes now fail, ACCEPTED by the PO (${[...new Set(accepted.map((a) => a.po))].join('; ')}) — still to fix: ${accepted.map((a) => a.id).join(', ')}`);
  const verdict = !detFailed.length && atLeastLive && !regressed.length ? 'pass' : 'fail';
  return { ...base, status: 'GRADED', verdict, graded, floor: { kind: 'live', baseline: { metric: b.metric, passed: b.passedCaseIds.length, promptHash: b.promptHash ?? null }, regressed, accepted }, passedCaseIds, messages };
}

/**
 * The live run. ⛔ Spends money. Refuses without a budget, and when the estimate is over it; stops when the
 * measured spend passes it. `record` writes the recordings the offline replay grades.
 */
/** Worth one wait and a retry: rate limits, overload, a passing 5xx. Anything else (401 key, 400 credit) stops at once. */
const RETRYABLE = /^(?:http_(429|500|502|503|529)|network)$/;

/**
 * The upstream failure inside a live answer, or null. `callAnthropic` returns `{ error: 'http_<status>' }`; a suite
 * that runs the app's own path (import-corpus) returns the function's `upstream_error` body instead.
 */
export function liveError(out) {
  const r = out?.reply;
  /* `network` — callAnthropic's dropped connection, after its own retry: an error, never the model's answer. */
  if (r && typeof r.error === 'string' && /^(?:http_\d{3}|network)$/.test(r.error)) return r.error;
  if (r?.bodies && typeof r.bodies === 'object') {
    for (const [fn, a] of Object.entries(r.bodies)) if (a?.body?.reason === 'upstream_error') return `${fn}: upstream_error`;
  }
  return null;
}

export async function runLive(suite, { root, apiKey, budget, record = false, resume = false, recordings = recordingsRoot(root), log = console.log, now = () => new Date(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const all = await suite.cases();
  const hash = promptHash(suite, root);
  /* --resume (11-19): a run that stopped at its budget picks up where it stopped — a case already recorded for THIS
     prompt and model is not called again. */
  const recorded = (c) => {
    const f = path.join(recordings, suite.name, hash.slice(0, 12), `${c.id}.json`);
    if (!fs.existsSync(f)) return false;
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8')).model === suite.model;
    } catch {
      return false;
    }
  };
  const cases = resume ? all.filter((c) => !recorded(c)) : all;
  const estimate = Number(suite.estimateUsd(cases)) || 0;
  log(`${suite.name}: ${cases.length} case(s)${resume ? ` (${all.length - cases.length} already recorded)` : ''}, estimated ${usd(estimate)} on ${suite.model}`);
  if (!(Number(budget) > 0)) throw new Error(`refusing: --live needs --budget <usd> (estimate ${usd(estimate)})`);
  if (estimate > Number(budget)) throw new Error(`refusing: the estimate ${usd(estimate)} is over the budget ${usd(Number(budget))}`);
  if (!apiKey) throw new Error('refusing: no ANTHROPIC_API_KEY (use the PO’s evals key, never the app’s)');
  let spent = 0;
  let done = 0;
  let stoppedOn = null;
  for (const c of cases) {
    if (spent >= Number(budget)) {
      log(`stopped: measured spend ${usd(spent)} reached the budget after ${done} case(s)`);
      break;
    }
    let out;
    for (let tries = 0; ; tries++) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 120_000);
      try {
        out = await suite.callLive(c, { apiKey, signal: ctl.signal, model: suite.model });
      } finally {
        clearTimeout(t);
      }
      const busy = liveError(out);
      if (!busy || !RETRYABLE.test(busy) || tries >= 2) break;
      await sleep(15_000 * (tries + 1));
    }
    spent += costOf(out?.usage, suite.model);
    // ⛔ An API failure (out of credit, a bad key, still busy after two waits) STOPS the run and is never recorded:
    // one key serves every AI feature, so a run must not keep knocking on a drained account, and an error saved as a
    // "recording" would later grade as the model's answer (Sprint 2 integrator, 11-17).
    const err = liveError(out);
    if (err) {
      stoppedOn = err;
      log(`stopped: ${err} on case ${c.id} after ${done} case(s) — nothing recorded for it`);
      break;
    }
    done++;
    if (record) writeRecording(recordings, { suite: suite.name, hash, model: suite.model, caseId: c.id, reply: out?.reply ?? null, usage: out?.usage ?? null, now: now() });
  }
  log(`${suite.name}: ${done} live call(s), measured ${usd(spent)}${record ? `, recorded under ${hash.slice(0, 12)}` : ''}`);
  return { done, spent, hash, stoppedOn };
}

/** One line per result, for people. */
export function formatResult(r) {
  const head = `${r.verdict === 'pass' ? '✓' : '✕'} ${r.suite} [${r.status}] gates ${r.functions.join(', ')} · prompt ${r.hash.slice(0, 12)} · ${r.cases} case(s) · deterministic ${r.deterministic.total - r.deterministic.failed.length}/${r.deterministic.total}`;
  const floor = r.floor ? (r.floor.baseline ? ` · floor: live ${r.floor.baseline.passed} passed (${r.floor.baseline.metric.toFixed(3)})` : ' · floor: live (NO BASELINE)') : '';
  const graded = r.status === 'GRADED' ? ` · graded ${r.graded.passed}/${r.cases} (${r.graded.metric?.toFixed(3)})${floor}` : '';
  const loud = r.status === 'UNRECORDED' ? '\n  ⚠⚠ UNRECORDED — this suite has never been run live; only its deterministic checks gated this deploy.' : '';
  return `${head}${graded}${loud}${r.messages.map((m) => `\n  · ${m}`).join('')}`;
}
