/**
 * EVAL SUITE — chat answers: Holt asks a question, the athlete answers in their own words, coach-interpret turns
 * the answer into the right fields (plan §0 chat gate ①, the answers half; CH-8).
 *
 * Corpus: scripts/holt-corpus/corpus-answers.jsonl (1,158 lines, read in place) — `qid` is the question, `expect`
 * the fields a correct parse yields (weeks, daysPerWeek, goal, environment, limitations, raceInWeeks, raceDate,
 * currentWeeklyMi, sessionMinutes, experience, dayFocus), or `ambiguous` / `defer` when the right move is to ask
 * again or let Holt pick.
 *
 * ⚠ GAP: gate ① proper is "grounded-correct answers about the athlete's REAL log (right numbers)" — that needs a
 * coach-ask corpus with seeded logs, which does not exist yet. This suite gates the answer PARSING half.
 *
 * Deterministic ($0): the corpus is well-formed and the real narrowing code accepts a perfect answer for every line
 * (each line's expected fields, as the model would write them, survive `narrowReply`) — proving the parser can
 * express every expectation, so a live miss is the model's, not the code's.
 * Recorded: coach-interpret's JSON → `parseModelJson` → `narrowReply` (the REAL code), every expected field compared.
 */

import { deepStrictEqual } from 'node:assert';

import { narrowReply, parseModelJson } from '../../../src/domain/coach/interpret-narrow.ts';
import { focusSaid } from '../../../src/domain/coach/chat-core.ts';
import { VOICE } from '../../../src/domain/coach/rulebook/voice.ts';
import { FUNCTION_KNOBS, callAnthropic, interpretTurn, knobsFor, readJsonl, systemOf } from '../lib/suite-kit.mjs';

/**
 * Holt's question for a corpus `qid`, as the app sends it (`ask`, from his own line catalogue — the first line, so a
 * recording is repeatable). Sprint 3 harness fix: it used to be `(Answering Holt's "size" question.)`, which the
 * function never sends. The offered chips are not sent (the suite has no constraints to build them from).
 */
const askFor = (qid) => VOICE[`ask_${qid}`]?.[0] ?? null;

const TODAY = '2026-11-17';
const META = new Set(['ambiguous', 'best', 'defer']);
const rows = () => readJsonl('scripts/holt-corpus/corpus-answers.jsonl');

/** The patch fields a narrowed reply carries (one action, or several). */
function fieldsOf(n) {
  if (!n || typeof n !== 'object') return {};
  if (n.route === 'multi') return Object.assign({}, ...n.actions.map((a) => a.patch ?? {}));
  return n.patch ?? {};
}

const same = (a, b) => {
  try {
    deepStrictEqual(Array.isArray(a) ? [...a].sort() : a, Array.isArray(b) ? [...b].sort() : b);
    return true;
  } catch {
    return false;
  }
};

/**
 * A line's expectation as the app would KEEP it: the expected fields, written the way the model is asked to write
 * them, put through the same real narrowing (raceInWeeks becomes a raceDate, 90 minutes snaps to 75, a past race
 * date is dropped). The corpus was written in the model's shape on 09-21; the app's shape is what matters.
 */
export function narrowedExpectation(expect) {
  const raw = Object.fromEntries(Object.entries(expect ?? {}).filter(([k]) => !META.has(k)));
  if (!Object.keys(raw).length) return {};
  return fieldsOf(narrowReply({ route: 'patch', patch: raw, say: 'Got it.' }, TODAY));
}

/** Compare the fields the app kept from the model's answer with the line's narrowed expectation. */
export function judge(expect, fields) {
  const wanted = Object.entries(narrowedExpectation(expect));
  if (expect?.defer && wanted.length === 0) return { pass: true, notes: 'deferred to Holt' };
  if (expect?.ambiguous && wanted.length === 0) {
    const best = expect.best && typeof expect.best === 'object' ? Object.entries(expect.best) : [];
    const contradicts = best.filter(([k, v]) => k in fields && !same(fields[k], v));
    return { pass: contradicts.length === 0, notes: contradicts.length ? `contradicts best ${contradicts.map(([k]) => k).join(',')}` : 'ambiguous — asked again or took the best reading' };
  }
  /* A day focus is the athlete's own words, read by the app (`focusSaid`): "lats" and "back" build the same day
     (11-19, A1148) — so the grade is what the app makes of it, not the spelling. */
  const sameFocus = (a, b) => typeof a === 'string' && typeof b === 'string' && JSON.stringify(focusSaid(a, a)) === JSON.stringify(focusSaid(b, b));
  const wrong = wanted.filter(([k, v]) => !same(fields[k], v) && !(k === 'dayFocus' && sameFocus(fields[k], v)));
  return { pass: wrong.length === 0, notes: wrong.map(([k, v]) => `${k}: got ${JSON.stringify(fields[k])}, want ${JSON.stringify(v)}`).join('; ') };
}

export const suite = {
  name: 'chat-answers',
  functions: ['coach-interpret'],
  promptSources: [
    { file: 'supabase/functions/coach-interpret/index.ts', exportName: 'SYSTEM' },
    { file: 'supabase/functions/coach-interpret/index.ts', exportName: 'MODEL' },
  ],
  model: 'claude-sonnet-5',
  cases: async () => rows().map((r) => ({ id: r.id, input: { qid: r.qid, text: r.text }, expect: r.expect ?? {} })),
  deterministic: async () => {
    const all = rows();
    const out = [{ id: 'corpus-size', pass: all.length >= 1100, notes: `${all.length} lines` }];
    // A perfect model answer (the expectation itself) must pass its own line — else the grader is broken.
    const selfFail = [];
    let gradeable = 0;
    let withFields = 0;
    for (const r of all) {
      const raw = Object.fromEntries(Object.entries(r.expect ?? {}).filter(([k]) => !META.has(k)));
      if (!Object.keys(raw).length) continue;
      withFields++;
      if (Object.keys(narrowedExpectation(r.expect)).length) gradeable++;
      if (!judge(r.expect, fieldsOf(narrowReply({ route: 'patch', patch: raw, say: 'Got it.' }, TODAY))).pass) selfFail.push(r.id);
    }
    out.push({ id: 'a-perfect-answer-passes-every-line', pass: selfFail.length === 0, notes: selfFail.slice(0, 10).join(', ') || 'all' });
    // Lines whose every expected field the app drops grade nothing: a race date already past on 2026-11-17, and
    // `experience`, which narrowPatch does not keep (101 lines) — measured 819/934 on 11-17. Floor, not a target.
    out.push({ id: 'most-lines-still-gradeable', pass: gradeable >= withFields * 0.85, notes: `${gradeable}/${withFields} keep a field after narrowing` });
    return out;
  },
  grade: async (c, recorded) => {
    const parsed = parseModelJson(recorded?.reply?.text ?? '');
    if (!parsed) return { pass: false, score: 0, notes: 'no JSON the parser accepts' };
    const j = judge(c.expect, fieldsOf(narrowReply(parsed, TODAY)));
    return { pass: j.pass, score: j.pass ? 1 : 0, notes: j.notes };
  },
  callLive: async (c, { apiKey, signal, model = 'claude-sonnet-5' }) =>
    callAnthropic({
      apiKey,
      signal,
      model,
      system: systemOf('coach-interpret'),
      cacheSystem: true,
      messages: [
        {
          role: 'user',
          content: interpretTurn({ today: TODAY, ask: askFor(c.input.qid), mode: c.input.qid === 'day_focus' ? 'day' : 'program', text: c.input.text }),
        },
      ],
      maxTokens: 1024,
      extra: knobsFor(model, FUNCTION_KNOBS['coach-interpret']),
    }),
  estimateUsd: (cases) => cases.length * 0.0016 * 1.2,
  threshold: { metric: 'pass_rate', min: 0.95 },
};
