/**
 * Small shared pieces for scripts/evals/suites/*.mjs — reading corpora where their owners keep them (never copied),
 * reading a function's own prompt out of its source, and the one Anthropic call `callLive` makes.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { constantString, constantText } from './prompt-hash.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** A .jsonl corpus, one object per non-empty line. */
export const readJsonl = (rel) =>
  readText(rel)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

/** A function's SYSTEM prompt as the function sends it (plain string constants only). */
export const systemOf = (slug, name = 'SYSTEM') => constantString(readText(`supabase/functions/${slug}/index.ts`), name);

/**
 * A template-literal constant with its `${NAME}` substitutions filled from `values` (the same imports the function
 * uses), e.g. coach-author's SYSTEM with AUTHOR_CATALOGUE. Only bare identifiers are supported.
 */
export function templateOf(slug, name, values) {
  const src = `const __x = ${constantText(readText(`supabase/functions/${slug}/index.ts`), name)};`;
  const sf = ts.createSourceFile('x.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const e = sf.statements[0].declarationList.declarations[0].initializer;
  if (ts.isNoSubstitutionTemplateLiteral(e) || ts.isStringLiteral(e)) return e.text;
  if (!ts.isTemplateExpression(e)) throw new Error(`suite-kit: ${slug} ${name} is not a template`);
  let out = e.head.text;
  for (const span of e.templateSpans) {
    if (!ts.isIdentifier(span.expression) || !(span.expression.text in values)) throw new Error(`suite-kit: ${slug} ${name}: no value for \${${span.expression.getText(sf)}}`);
    out += String(values[span.expression.text]) + span.literal.text;
  }
  return out;
}

/** A literal constant (array / object of plain values) out of a script that cannot be imported (it runs on import). */
export function literalConstant(rel, name) {
  return vm.runInNewContext(`(${constantText(readText(rel), name, rel)})`, Object.create(null), { timeout: 1000 });
}

/**
 * ⛔ The one live call. Only scripts/evals/run.mjs --live --budget reaches this (through a suite's callLive).
 * Never logs the key, never returns Anthropic's error text into a recording.
 */
export async function callAnthropic({ apiKey, signal, model, system, messages, maxTokens = 1024, extra = {}, cacheSystem = false }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: cacheSystem ? cachedSystem(system) : system, messages, ...extra }),
  });
  if (!res.ok) {
    await res.text().catch(() => '');
    return { reply: { error: `http_${res.status}` }, usage: null };
  }
  const j = await res.json();
  const text = (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { reply: { text, stop_reason: j.stop_reason ?? null }, usage: j.usage ?? null };
}

/** Per-call estimate: input + output tokens at a model's list price (USD per million). */
export const perCall = (inTokens, outTokens, rates = { in: 2, out: 10 }) => (inTokens * rates.in + outTokens * rates.out) / 1e6;

/*
 * ══ THE REQUEST EACH FUNCTION SENDS (AI Road to 10 Sprint 3, the eval harness fix) ══
 *
 * Sprint 2's chat / chat-safety / author recordings were set aside ($7.52, 11-17) because the suites did not call the
 * model the way the functions do: thinking left on, no effort, no cached system block (so every call paid the whole
 * 13k-token author prompt), no JSON schema, and the bare sentence instead of the function's own user turn. These are
 * the knobs each function puts on top of model / system / messages. scripts/evals/__tests__/request-shapes.test.mjs
 * reads every function's source and fails if one stops sending what is mirrored here — and each suite hashes this
 * constant (promptSources), so a change here stales its recordings.
 */
export const FUNCTION_KNOBS = {
  'coach-interpret': { thinking: { type: 'disabled' }, output_config: { effort: 'low' } },
  'coach-author': { thinking: { type: 'disabled' }, output_config: { effort: 'low' } },
};

/** The system block as every function sends it: one text block, cached (the variable part is in the user turn). */
export const cachedSystem = (text) => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];

/**
 * coach-interpret's user turn, line for line (supabase/functions/coach-interpret/index.ts, "The model call"), for an
 * adult of unknown age (`ageLine(null, false)` is no line) with no history and no saved notes. `chips` are the
 * offered answers when the suite knows them.
 */
export function interpretTurn({ today, ask = null, chips = [], mode = 'program', known = null, text }) {
  const context = [
    `Today is ${today}.`,
    ask ? `Holt just asked: "${ask}"` : 'The athlete spoke first; no question is on the table.',
    chips.length ? `Offered answers: ${chips.join(' · ')}` : null,
    mode === 'day' ? 'Mode: ONE session, not a program.' : 'Mode: a full program.',
    known && Object.keys(known).length ? `Already settled, do not re-fill: ${JSON.stringify(known)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  return `${context}\n\nThe athlete typed: "${text}"`;
}

/** A line the code guard stops never reaches a model in the app — so a recording never pays for one. */
export const SKIPPED_CODE_STOP = { reply: { skipped: 'code_stop' }, usage: null };
