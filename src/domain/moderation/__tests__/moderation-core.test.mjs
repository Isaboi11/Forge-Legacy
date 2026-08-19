import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BLOCK_CONFIRM_TITLE,
  NO_BLOCKS_MESSAGE,
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  REPORT_SENT_MESSAGE,
  REPORT_TARGET_LABEL,
  UNBLOCK_CONFIRM_BODY,
  blockConfirmBody,
  canSubmitReport,
  isReportReason,
  isReportTargetKind,
  reportNoteRequired,
} from '../moderation-core.ts';

/**
 * The moderation vocabulary and its copy rules.
 *
 * The tests that matter here are not the enum checks — they are the two guarding what the copy PROMISES.
 * This whole feature exists because the app shipped a Report button that described something it could not
 * do; a block dialog claiming more than `0171` enforces would be the identical failure with higher stakes.
 */

test('reasons and targets match 0171’s check constraints exactly', () => {
  // A value the client can send that SQL rejects is a 23514 at the worst possible moment — mid-report, for
  // someone already having a bad time.
  const sqlReasons = ['abuse', 'harassment', 'spam', 'nudity', 'violence', 'impersonation', 'other'];
  assert.deepEqual([...REPORT_REASONS].sort(), [...sqlReasons].sort());

  const sqlKinds = ['post', 'comment', 'checkin', 'athlete', 'squad'];
  for (const k of sqlKinds) assert.ok(isReportTargetKind(k), `${k} must be accepted`);
  assert.deepEqual(Object.keys(REPORT_TARGET_LABEL).sort(), [...sqlKinds].sort());
});

test('every reason has a label, and every label is plain language', () => {
  for (const r of REPORT_REASONS) {
    const label = REPORT_REASON_LABEL[r];
    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0, `${r} has no label`);
    // The reason key itself must never leak to a human — "abuse" as a label is a database value, not a
    // sentence someone picks under stress.
    assert.notEqual(label.toLowerCase(), r);
  }
});

test('⚠ harassment is first and "other" is last', () => {
  /*
   * Deliberate, and not the SQL order. A reporter scanning under stress should meet the most common reason
   * first; a list that opens with an escape hatch collects escape hatches, and an `other` report costs an
   * operator far more to triage than a categorised one.
   */
  assert.equal(REPORT_REASONS[0], 'harassment');
  assert.equal(REPORT_REASONS[REPORT_REASONS.length - 1], 'other');
});

test('a note is required only for "other"', () => {
  assert.ok(reportNoteRequired('other'));
  for (const r of REPORT_REASONS.filter((x) => x !== 'other')) {
    assert.ok(!reportNoteRequired(r), `${r} must not require a note`);
  }
});

test('submission gating', () => {
  assert.ok(!canSubmitReport(null, ''), 'no reason chosen');
  assert.ok(canSubmitReport('harassment', ''), 'a categorised report needs no note');
  assert.ok(!canSubmitReport('other', ''), '"other" with no note is unactionable');
  assert.ok(!canSubmitReport('other', '   '), 'whitespace is not a note');
  assert.ok(canSubmitReport('other', 'They keep messaging me.'));
  assert.ok(!canSubmitReport('spam', 'x'.repeat(REPORT_NOTE_MAX + 1)), 'over the column limit');
  assert.ok(canSubmitReport('spam', 'x'.repeat(REPORT_NOTE_MAX)), 'exactly at the limit is allowed');
});

test('⚠ the confirmation promises review, not an outcome', () => {
  /*
   * "We'll take it down" is a promise made before anyone has looked, and it is the promise a reporter will
   * hold the product to. Guideline 1.2 asks for timely RESPONSES to concerns — which is what this commits
   * to and what `content_reports.status` is the mechanism for.
   */
  const msg = REPORT_SENT_MESSAGE.toLowerCase();
  for (const overpromise of ['remove', 'take it down', 'deleted', 'banned', 'suspended', 'within']) {
    assert.ok(!msg.includes(overpromise), `must not promise "${overpromise}": ${REPORT_SENT_MESSAGE}`);
  }
  assert.match(REPORT_SENT_MESSAGE, /review/i);
});

test('⚠ every clause of the block dialog is something 0171 actually enforces', () => {
  /*
   * The rule for editing this copy. The defect this entire pass corrects was a control that described
   * behaviour the app did not have — a block dialog overclaiming would be the same failure with someone's
   * safety attached.
   */
  const body = blockConfirmBody('Dana');

  // Symmetric invisibility — the four RESTRICTIVE policies plus friends_feed's four predicates.
  assert.match(body, /won’t see each other/i);
  // block_athlete() deletes the friendships row in the same transaction.
  assert.match(body, /friends/i);
  // is_blocked() is symmetric and athlete_blocks has no policy exposing the blocked side.
  assert.match(body, /won’t be told/i);
  // The PO decision of 2026-08-19 — neither party is ejected from a shared squad.
  assert.match(body, /squad/i);
  assert.match(body, /stay in it/i);

  // ⛔ Claims 0171 does NOT make good on. Each would be a lie the schema cannot support.
  for (const overclaim of ['delete', 'removed from the squad', 'report', 'permanently', 'never again']) {
    assert.ok(!body.toLowerCase().includes(overclaim), `block copy must not claim "${overclaim}"`);
  }
});

test('the block dialog names the person rather than saying "this user"', () => {
  assert.ok(blockConfirmBody('Dana').includes('Dana'));
  assert.ok(blockConfirmBody('Marcus').includes('Marcus'));
});

test('⚠ unblock says the friendship does not come back', () => {
  // `unblock_athlete()` deliberately does not restore it. An athlete expecting their friend back and not
  // getting them would read the schema's correct behaviour as a bug.
  assert.match(UNBLOCK_CONFIRM_BODY, /won’t be friends again/i);
  assert.match(UNBLOCK_CONFIRM_BODY, /new request/i);
});

test('titles and empty states are questions and sentences, not labels', () => {
  assert.match(BLOCK_CONFIRM_TITLE, /\?$/);
  assert.ok(NO_BLOCKS_MESSAGE.length > 0);
  assert.match(NO_BLOCKS_MESSAGE, /\.$/);
});

test('guards reject what the wire can actually deliver', () => {
  for (const bad of ['ABUSE', 'harrassment', '', null, undefined, 1, {}]) {
    assert.ok(!isReportReason(bad));
    assert.ok(!isReportTargetKind(bad));
  }
});
