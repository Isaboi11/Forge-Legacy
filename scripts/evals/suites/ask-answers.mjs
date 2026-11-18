/**
 * EVAL SUITE — chat answers, through HOLT'S CHAT (AI Road to 10 Sprint 4a, CH-3): Holt asks a build question, the athlete
 * answers in their own words, and coach-ask (caps `actions_v1`) turns the answer into the right fields — the job
 * coach-interpret did, which the new app no longer calls (PO 11-18).
 *
 * Corpus and grader are `chat-answers`' (scripts/holt-corpus/corpus-answers.jsonl, `judge` + `narrowedExpectation`), so
 * the two are compared line for line: chat-answers stays coach-interpret's gate (old phones still call it), and this is
 * the same corpus against what the new app sends instead:
 *   - the caps request (`capsRounds`, ask-actions.mjs): SYSTEM_V1 + FOOD_PROMPT, the caps tools, coach-ask's rounds
 *   - Holt's question as the last turn of the history, and the app's build line in the context — the sheet's
 *     `buildingLine` with no chips and nothing settled (chat-answers sends no chips either)
 *   - graded on what coach-ask would FORWARD: the fields of every propose_program / propose_day, narrowed by the app's
 *     own `narrowPatch`. Words only (no action) are no fields — a fail unless the line is `defer` / `ambiguous`.
 * Lines the free local matcher would place on the phone are still sent (as chat-answers does), so this is the model's
 * own score. Target 0.95 (chat-answers' bar); the comparison that decides is "no drop vs live": coach-interpret's live
 * recording 949/1158 (Sonnet 5, 11-17).
 */

import { narrowPatch } from '../../../src/domain/coach/interpret-narrow.ts';
import { VOICE } from '../../../src/domain/coach/rulebook/voice.ts';
import { readJsonl } from '../lib/suite-kit.mjs';
import { judge, narrowedExpectation } from './chat-answers.mjs';
import { CAPS_KNOBS, CAPS_SOURCES, TODAY, capsRounds } from './ask-actions.mjs';

const askFor = (qid) => VOICE[`ask_${qid}`]?.[0] ?? null;
const rows = () => readJsonl('scripts/holt-corpus/corpus-answers.jsonl');

/** The sheet's `buildingLine` for one question on the table (CoachChatSheet.tsx), with no chips and nothing settled. */
export const buildingFor = (qid) => {
  const ask = askFor(qid);
  return [qid === 'day_focus' ? 'Building ONE session, not a program.' : 'Building a full program.', ask ? `Holt just asked: "${ask}"` : null].filter(Boolean).join(' ');
};

/** Every build field the reply forwarded, as the app keeps it. */
export function forwardedFields(reply) {
  const out = {};
  for (const a of reply?.actions ?? []) {
    if (a.name === 'propose_program' || a.name === 'propose_day') Object.assign(out, narrowPatch(a.input ?? {}, TODAY));
  }
  return out;
}

export const suite = {
  name: 'ask-answers',
  functions: ['coach-ask'],
  promptSources: [...CAPS_SOURCES, { file: 'scripts/evals/suites/ask-actions.mjs', exportName: 'CAPS_KNOBS' }, { file: 'scripts/evals/suites/ask-answers.mjs', exportName: 'buildingFor' }],
  model: 'claude-sonnet-5-5',
  cases: async () => rows().map((r) => ({ id: r.id, input: { qid: r.qid, text: r.text }, expect: r.expect ?? {} })),
  deterministic: async () => [
    { id: 'corpus-size', pass: rows().length >= 1100, notes: `${rows().length} lines` },
    { id: 'every-question-has-holts-words', pass: rows().every((r) => askFor(r.qid)), notes: [...new Set(rows().filter((r) => !askFor(r.qid)).map((r) => r.qid))].join(', ') || 'all' },
    // The grader is chat-answers' own: a perfect forwarded build passes its line.
    { id: 'a-perfect-build-passes', pass: rows().slice(0, 200).every((r) => judge(r.expect, forwardedFields({ actions: [{ name: 'propose_program', input: narrowedExpectation(r.expect) }] })).pass || !Object.keys(narrowedExpectation(r.expect)).length) },
  ],
  grade: async (c, recorded) => {
    if (recorded?.reply?.error) return { pass: false, score: 0, notes: `error ${recorded.reply.error}` };
    const j = judge(c.expect, forwardedFields(recorded?.reply));
    return { pass: j.pass, score: j.pass ? 1 : 0, notes: j.notes || (recorded?.reply?.actions?.length ? '' : 'no build forwarded') };
  },
  callLive: async (c, { apiKey, signal, model = 'claude-sonnet-5-5' }) => {
    const ask = askFor(c.input.qid);
    return capsRounds(c.input.text, {
      apiKey,
      signal,
      model,
      knobs: CAPS_KNOBS,
      context: { building: buildingFor(c.input.qid) },
      history: ask ? [{ role: 'holt', text: ask }] : [],
    });
  },
  // ~11k cached at $0.10/M + ~350 fresh + ~150 out, usually two rounds (the action, then his line); + 30%.
  estimateUsd: (cases) => cases.length * 0.0045 * 1.3,
  threshold: { metric: 'pass_rate', min: 0.95 },
};
