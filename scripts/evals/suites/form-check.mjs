/**
 * EVAL SUITE — form check: still frames of one set become a technique read with marks on the body (coach-form-check;
 * plan §0 form-check gates ①–⑥, FC-7).
 *
 * Corpus: the 21 labelled PO clips in scripts/form-check-eval.mjs's CLIPS (read out of that file with the TypeScript
 * parser — the script runs on import). The clips themselves live on the PO's disk, not in the repo, so a live run is
 * `scripts/form-check-eval.mjs` (it extracts the frames with ffmpeg) and its answers are copied in as recordings.
 * ⛔ That run needs the PO's NEW Anthropic test key in .env.local (the September one is dead); the PO OK'd $1–$3.
 *
 * Deterministic ($0): the REAL parser `parseFormRead` and the banned-word guard `bannedFamily`
 * (src/domain/coach/form-check.ts): clinical words never pass, a read is capped, prose is unreadable.
 * Recorded: the model's text → `parseFormRead` (the REAL code): an "unreadable" clip must come back unreadable;
 * every other clip must parse, and nothing it says may be in a banned family.
 */

import { FORM_FIX_MAX, bannedFamily, parseFormRead } from '../../../src/domain/coach/form-check.ts';
import { callAnthropic, literalConstant, systemOf } from '../lib/suite-kit.mjs';

const clips = () => literalConstant('scripts/form-check-eval.mjs', 'CLIPS');

/** Every sentence a read would show. */
function sentences(read) {
  if (!read || typeof read !== 'object') return [];
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(read);
  return out;
}

export const suite = {
  name: 'form-check',
  functions: ['coach-form-check'],
  promptSources: [
    { file: 'supabase/functions/coach-form-check/index.ts', exportName: 'SYSTEM' },
    { file: 'supabase/functions/coach-form-check/index.ts', exportName: 'MODEL' },
  ],
  model: 'claude-sonnet-5',
  cases: async () => clips().map((c) => ({ id: `clip-${c.id}`, input: { file: c.file, lift: c.lift, angle: c.angle }, expect: { unreadable: c.expect === 'unreadable' } })),
  deterministic: async () => {
    const cs = clips();
    const clinical = ['knee valgus', 'thoracic kyphosis', 'a herniated disc', 'patellar tendinitis'];
    const leaked = clinical.filter((w) => bannedFamily(`Watch for ${w} on the way down.`) == null);
    const prose = parseFormRead('Great set! Your squat looks solid.', 'Back Squat', 12);
    return [
      { id: 'corpus-size', pass: cs.length >= 21, notes: `${cs.length} labelled clips` },
      { id: 'clinical-words-are-banned', pass: leaked.length === 0, notes: leaked.join(', ') || 'all caught' },
      { id: 'prose-is-unreadable', pass: prose == null || prose.ok === false || prose.unreadable === true, notes: JSON.stringify(prose)?.slice(0, 80) },
      { id: 'fix-cap-is-small', pass: FORM_FIX_MAX <= 2 },
    ];
  },
  grade: async (c, recorded) => {
    const read = parseFormRead(recorded?.reply?.text ?? '', c.input.lift, recorded?.reply?.frameCount ?? 12);
    const unreadable = read == null || read.unreadable === true || read.ok === false;
    if (c.expect.unreadable) return { pass: unreadable, score: unreadable ? 1 : 0, notes: unreadable ? '' : 'should have declined this clip' };
    if (unreadable) return { pass: false, score: 0, notes: 'declined a readable clip' };
    const banned = sentences(read).map((s) => [s, bannedFamily(s)]).filter(([, f]) => f);
    return { pass: banned.length === 0, score: banned.length ? 0 : 1, notes: banned.map(([s, f]) => `${f}: ${s.slice(0, 60)}`).join(' | ') };
  },
  // The frames come from ffmpeg on the PO's clips — scripts/form-check-eval.mjs is the live path. A recording made
  // there carries { text, frameCount } as its reply.
  callLive: async (c, { apiKey, signal }) => {
    if (!c.input.frames) throw new Error('form-check: run scripts/form-check-eval.mjs for the live pass (it extracts the frames); record its answers here');
    return callAnthropic({
      apiKey,
      signal,
      model: 'claude-sonnet-5',
      system: systemOf('coach-form-check'),
      messages: [{ role: 'user', content: [...c.input.frames.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })), { type: 'text', text: c.input.lift }] }],
      maxTokens: 900,
    });
  },
  // scripts/form-check-eval.mjs: "~2¢" a clip on Sonnet 5. Plus 20%.
  estimateUsd: (cases) => cases.length * 0.02 * 1.2,
  threshold: { metric: 'pass_rate', min: 0.9 },
};
