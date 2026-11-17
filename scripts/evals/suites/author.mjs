/**
 * EVAL SUITE — Holt writes the session: a typed ask for a workout or a program becomes a plan that reaches the card
 * (coach-author; plan PB-7 "prove it", CA-D11 / Amendment 003).
 *
 * Corpus: scripts/holt-corpus/corpus-author.mjs (126 asks: 96 single days + 30 weeks, read in place).
 *
 * Deterministic ($0): the corpus is whole; an ask the medical guard stops never reaches the model (author-live's
 * rule); the real request narrowing (`narrowAuthorRequest`) and user turn (`authorUserTurn`) build for every case;
 * and the real parser (`authoredFromModelText`) refuses what must never reach a card (prose, an empty plan, a
 * truncated JSON).
 * Recorded: the model's text → `authoredFromModelText` → `authoredIsWhole` (the REAL code): the plan reaches the
 * card. ⚠ v1: the 126-check scorer in scripts/holt-corpus/author-live.mjs (counts, regions, named lifts, order) is
 * richer and is not exported; a v2 of this suite should import it once it is. Its last live run scored 121/126.
 */

import { AUTHOR_CATALOGUE } from '../../../src/domain/coach/author-catalogue.ts';
import { AUTHOR_OUTPUT_CAP, AUTHOR_SCHEMA, authoredFromModelText, authoredIsWhole, authorUserTurn, narrowAuthorRequest } from '../../../src/domain/coach/author.ts';
import { medicalRoute } from '../../../src/domain/coach/medical-routing.ts';
import { DAY_CASES, PROGRAM_CASES } from '../../holt-corpus/corpus-author.mjs';
import { FUNCTION_KNOBS, SKIPPED_CODE_STOP, callAnthropic, templateOf } from '../lib/suite-kit.mjs';

const all = () => [...DAY_CASES.map((c) => ({ ...c, kind: 'day' })), ...PROGRAM_CASES.map((c) => ({ ...c, kind: 'program' }))];
const stoppedInCode = (c) => c.said.some((line) => medicalRoute(line) !== 'clear');

/** The request the app would send for a case (what author-live.mjs builds, minus the athlete's library). */
function requestFor(c) {
  return narrowAuthorRequest({ kind: c.kind, said: c.said, ...(c.a ?? {}) });
}

export const suite = {
  name: 'author',
  functions: ['coach-author'],
  promptSources: [
    { file: 'supabase/functions/coach-author/index.ts', exportName: 'SYSTEM' },
    { file: 'supabase/functions/coach-author/index.ts', exportName: 'MODEL' },
    // The SYSTEM text inlines ${AUTHOR_CATALOGUE}, so the hash must read the catalogue itself — a primary-muscle
    // fix (PO 2026-11-17) changes what the model is shown, and must stale these recordings.
    { file: 'src/domain/coach/author-catalogue.ts', exportName: 'AUTHOR_CATALOGUE' },
    { file: 'src/domain/coach/author.ts', exportName: 'AUTHOR_SCHEMA' },
    { file: 'src/domain/coach/author.ts', exportName: 'AUTHOR_OUTPUT_CAP' },
    { file: 'scripts/evals/lib/suite-kit.mjs', exportName: 'FUNCTION_KNOBS' },
  ],
  model: 'claude-sonnet-5',
  cases: async () => all().map((c) => ({ id: c.id, input: { kind: c.kind, said: c.said, a: c.a ?? {} }, expect: { stopped: stoppedInCode(c) } })),
  deterministic: async () => {
    const cs = all();
    const ids = new Set(cs.map((c) => c.id));
    const broken = [];
    for (const c of cs) {
      try {
        const turn = authorUserTurn(requestFor(c));
        if (typeof turn !== 'string' || !turn.length) broken.push(c.id);
      } catch {
        broken.push(c.id);
      }
    }
    return [
      { id: 'corpus-size', pass: cs.length >= 120 && ids.size === cs.length, notes: `${cs.length} cases, ${ids.size} ids` },
      { id: 'every-case-builds-a-request', pass: broken.length === 0, notes: broken.slice(0, 8).join(', ') || 'all' },
      { id: 'prose-never-reaches-a-card', pass: authoredFromModelText('Here is a great workout for you: squats, then bench.', 'day') === null },
      { id: 'empty-never-reaches-a-card', pass: authoredFromModelText('', 'day') === null && !authoredIsWhole(authoredFromModelText('{}', 'program')) },
      { id: 'truncated-json-never-reaches-a-card', pass: authoredFromModelText('{"say":"ok","sessions":[{"name":"A","blocks":[', 'day') === null },
    ];
  },
  grade: async (c, recorded) => {
    if (c.expect.stopped) return { pass: true, score: 1, notes: 'stopped by the guard before the model' };
    const plan = authoredFromModelText(recorded?.reply?.text ?? '', c.input.kind);
    const pass = !!plan && authoredIsWhole(plan);
    return { pass, score: pass ? 1 : 0, notes: pass ? '' : plan ? 'parsed but not whole' : 'did not parse' };
  },
  /* Sprint 3 harness fix: coach-author's own request — thinking off, effort low, its JSON schema, its output cap, the
     cached SYSTEM block (13k tokens: uncached, every call paid all of it). A case the code guard stops is never sent. */
  callLive: async (c, { apiKey, signal }) =>
    c.expect?.stopped || c.input.said.some((line) => medicalRoute(line) !== 'clear')
      ? SKIPPED_CODE_STOP
      : callAnthropic({
          apiKey,
          signal,
          model: 'claude-sonnet-5',
          system: templateOf('coach-author', 'SYSTEM', { AUTHOR_CATALOGUE }),
          cacheSystem: true,
          messages: [{ role: 'user', content: authorUserTurn(requestFor(c.input)) }],
          maxTokens: AUTHOR_OUTPUT_CAP[c.input.kind],
          extra: {
            ...FUNCTION_KNOBS['coach-author'],
            output_config: { ...FUNCTION_KNOBS['coach-author'].output_config, format: { type: 'json_schema', schema: AUTHOR_SCHEMA } },
          },
        }),
  // scripts/holt-corpus/README.md: the whole author corpus live is "about $1.45" (2026-09-30). Plus 20%.
  // Only cases the code guard lets through are sent (Sprint 3 harness fix).
  estimateUsd: (cases) => (cases.filter((c) => !c.expect.stopped).length / 126) * 1.45 * 1.2,
  threshold: { metric: 'pass_rate', min: 0.95 },
};
