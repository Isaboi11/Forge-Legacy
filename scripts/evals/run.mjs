#!/usr/bin/env node
/**
 * ══ EVALS — one runner, one suite per AI feature (AI Road to 10, PL-6) ══
 *
 *   node scripts/evals/run.mjs --suite <name>|all            offline replay, $0 (the default; CI runs this)
 *   node scripts/evals/run.mjs --suite <name> --live --budget <usd> [--record]
 *                                                            ⛔ LIVE: spends real money on the Anthropic key in
 *                                                            ANTHROPIC_API_KEY (use the PO's evals key). Prints the
 *                                                            estimate, refuses without --budget or when the estimate
 *                                                            is over it, stops at the measured budget. --record writes
 *                                                            scripts/evals/recordings/<suite>/<hash12>/<case>.json.
 *   --json                                                   the results as JSON
 *
 * Suites are every .mjs in scripts/evals/suites/ (the interface: Docs/AI-Sprint-2-Build-Notes.md §1.4). Exit 1 when
 * any suite's verdict is fail. The deploy gate for one function is scripts/evals/gate.mjs.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateSuite, formatResult, loadSuites, runLive } from './lib/runner.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function parseArgs(argv) {
  const a = { suite: null, live: false, budget: null, record: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--suite') a.suite = argv[++i];
    else if (k === '--live') a.live = true;
    else if (k === '--budget') a.budget = Number(argv[++i]);
    else if (k === '--record') a.record = true;
    else if (k === '--json') a.json = true;
    else throw new Error(`unknown argument ${k}`);
  }
  if (!a.suite) throw new Error('say --suite <name> or --suite all');
  if (a.record && !a.live) throw new Error('--record only makes sense with --live (recordings come from live calls)');
  if (a.live && a.suite === 'all') throw new Error('--live runs one suite at a time, so each spend is quoted and approved on its own');
  return a;
}

export async function main(argv, { root = ROOT, env = process.env, log = console.log } = {}) {
  const a = parseArgs(argv);
  const all = await loadSuites(root);
  const chosen = a.suite === 'all' ? all : all.filter((s) => s.name === a.suite);
  if (!chosen.length) throw new Error(`no suite named ${a.suite} (have: ${all.map((s) => s.name).join(', ')})`);
  if (a.live) await runLive(chosen[0], { root, apiKey: env.ANTHROPIC_API_KEY, budget: a.budget, record: a.record, log });
  const results = [];
  for (const s of chosen) results.push(await evaluateSuite(s, { root }));
  if (a.json) log(JSON.stringify(results, null, 2));
  else for (const r of results) log(formatResult(r));
  return results.every((r) => r.verdict === 'pass') ? 0 : 1;
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
