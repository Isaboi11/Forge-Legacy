import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BODY_MAX,
  FEEDBACK_COPY,
  FEEDBACK_KINDS,
  canSendFeedback,
  feedbackProblem,
  feedbackProblemMessage,
  feedbackSendError,
} from '../content.ts';

const draft = (over = {}) => ({ kind: 'BUG', body: 'The timer stopped at 30s.', contactOk: true, ...over });

// ── the wire contract with migration 0167 ───────────────────────────────────

test('⚠ the kind keys match 0167’s CHECK constraint exactly', () => {
  // If these drift, every send fails with a constraint violation and the screen can only say "that
  // didn't send". The constraint is `kind in ('BUG','SUGGESTION','PRAISE','OTHER')`.
  assert.deepEqual(
    FEEDBACK_KINDS.map((k) => k.key),
    ['BUG', 'SUGGESTION', 'PRAISE', 'OTHER'],
  );
  for (const k of FEEDBACK_KINDS) {
    assert.equal(k.key, k.key.toUpperCase(), 'wire values are uppercase');
    assert.ok(k.label.length > 0 && k.hint.length > 0, `${k.key} needs a label and a hint`);
  }
});

test('the body cap matches the column’s CHECK', () => {
  assert.equal(BODY_MAX, 2000);
});

test('praise is offered, not just complaints', () => {
  // Deliberate: a channel that only accepts problems teaches people it is a complaints box, and
  // "I love X, but…" is the most useful message there is.
  assert.ok(FEEDBACK_KINDS.some((k) => k.key === 'PRAISE'));
});

// ── validation ──────────────────────────────────────────────────────────────

test('a complete draft can be sent', () => {
  assert.equal(feedbackProblem(draft()), null);
  assert.ok(canSendFeedback(draft()));
});

test('a kind must be chosen', () => {
  assert.equal(feedbackProblem(draft({ kind: null })), 'no_kind');
  assert.ok(!canSendFeedback(draft({ kind: null })));
});

test('whitespace is not a message', () => {
  // `length(btrim(body)) between 1 and 2000` server-side — a body of spaces is refused there, so it
  // must be refused here too or the athlete gets a database error instead of a sentence.
  for (const body of ['', '   ', '\n\n', '\t ']) {
    assert.equal(feedbackProblem(draft({ body })), 'empty', JSON.stringify(body));
  }
});

test('the cap is applied to the TRIMMED body, exactly as the database applies it', () => {
  const exact = 'x'.repeat(BODY_MAX);
  assert.equal(feedbackProblem(draft({ body: exact })), null, 'the boundary itself is allowed');
  assert.equal(feedbackProblem(draft({ body: `x${exact}` })), 'too_long');

  // The case that would otherwise disagree with the server: padded to over the cap, but trimmed to
  // exactly it. `btrim` runs before the check in Postgres, so this must pass.
  assert.equal(feedbackProblem(draft({ body: `   ${exact}   ` })), null, 'trimmed, not raw, length');
});

test('the first problem is reported, not all of them', () => {
  assert.equal(feedbackProblem({ kind: null, body: '', contactOk: true }), 'no_kind');
});

test('every problem has a sentence, and no problem has none', () => {
  for (const p of ['no_kind', 'empty', 'too_long']) {
    const msg = feedbackProblemMessage(p);
    assert.ok(msg && msg.length > 0, `${p} needs a message`);
  }
  assert.equal(feedbackProblemMessage(null), null, 'a valid draft shows nothing');
});

// ── failure copy ────────────────────────────────────────────────────────────

test('⚠ the rate-limit refusal reaches the athlete in the database’s own words', () => {
  // 0167 raises P0001 with a sentence already written for a human. Replacing it with a generic
  // "that didn't send" would tell somebody to retry immediately, which is the one thing that cannot
  // work — and a support form that silently eats a message is its worst possible failure.
  const e = { code: 'P0001', message: 'Too many messages in a short time. Please wait a little while before sending another.' };
  assert.equal(feedbackSendError(e), e.message);
});

test('a missing table names email rather than blaming the athlete', () => {
  // The real state between "the app shipped" and "the migration was pasted" — hours, on this project,
  // because there is no CLI and migrations are run by hand.
  for (const code of ['PGRST205', 'PGRST202']) {
    assert.match(feedbackSendError({ code }), /support@forgelegacy\.app/);
  }
});

test('an unknown failure still offers a way through', () => {
  for (const e of [null, undefined, new Error('socket hang up'), { code: '08006' }]) {
    const msg = feedbackSendError(e);
    assert.ok(msg.length > 0);
    assert.match(msg, /support@forgelegacy\.app/, 'there is always another route');
  }
});

// ── copy ────────────────────────────────────────────────────────────────────

test('⚠ the screen states what it attaches, at the point of collection', () => {
  // site/privacy.html §2 discloses that screen, app version and platform ride along. A disclosure only
  // a policy-reader ever sees is worse than one sentence where the data is actually collected.
  const note = FEEDBACK_COPY.attachNote.toLowerCase();
  assert.match(note, /screen/);
  assert.match(note, /version/);
  assert.ok(/device|platform/.test(note), 'the device/platform attachment is named');
});

test('the email fallback is present and correct everywhere it appears', () => {
  assert.match(FEEDBACK_COPY.emailFallback, /support@forgelegacy\.app/);
});
