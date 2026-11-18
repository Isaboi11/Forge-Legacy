import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCommentPreviews, previewBody, viewAllLabel } from '../comment-preview.ts';

/**
 * Inline comment previews (PO 2026-11-18): at most two under each post, the NEWEST two, drawn oldest
 * first; "View all N comments" once there are more than are shown.
 */

const row = (id, postId, createdAt, body = `comment ${id}`) => ({ id, postId, body, createdAt, authorId: `u${id}`, authorName: `Athlete ${id}` });

test('no comments - the post is absent, so nothing extra is drawn', () => {
  assert.deepEqual(buildCommentPreviews([]), {});
});

test('one comment shows that comment', () => {
  const p = buildCommentPreviews([row('1', 'p', '2026-11-18T10:00:00Z')]);
  assert.deepEqual(p.p.shown.map((c) => c.id), ['1']);
  assert.equal(p.p.total, 1);
});

test('two comments show both, oldest first, whatever order the read returned them in', () => {
  const p = buildCommentPreviews([row('2', 'p', '2026-11-18T11:00:00Z'), row('1', 'p', '2026-11-18T10:00:00Z')]);
  assert.deepEqual(p.p.shown.map((c) => c.id), ['1', '2']);
});

test('three or more show the NEWEST two, oldest first - a fresh reply always reaches the feed', () => {
  const p = buildCommentPreviews([
    row('3', 'p', '2026-11-18T12:00:00Z'),
    row('1', 'p', '2026-11-18T10:00:00Z'),
    row('4', 'p', '2026-11-18T13:00:00Z'),
    row('2', 'p', '2026-11-18T11:00:00Z'),
  ]);
  assert.deepEqual(p.p.shown.map((c) => c.id), ['3', '4']);
  assert.equal(p.p.total, 4);
});

test('comments are grouped by post', () => {
  const p = buildCommentPreviews([row('1', 'a', '2026-11-18T10:00:00Z'), row('2', 'b', '2026-11-18T10:00:00Z'), row('3', 'a', '2026-11-18T11:00:00Z')]);
  assert.deepEqual(p.a.shown.map((c) => c.id), ['1', '3']);
  assert.deepEqual(p.b.shown.map((c) => c.id), ['2']);
});

test('a same-millisecond tie is broken by id, so the pair never swaps between reads', () => {
  const t = '2026-11-18T10:00:00Z';
  const x = buildCommentPreviews([row('b', 'p', t), row('a', 'p', t)]);
  const y = buildCommentPreviews([row('a', 'p', t), row('b', 'p', t)]);
  assert.deepEqual(x.p.shown.map((c) => c.id), ['a', 'b']);
  assert.deepEqual(y.p.shown.map((c) => c.id), ['a', 'b']);
});

test('a blank comment is not previewed', () => {
  const p = buildCommentPreviews([row('1', 'p', '2026-11-18T10:00:00Z', '   ')]);
  assert.deepEqual(p, {});
});

test('View all appears only when there are more comments than are shown', () => {
  assert.equal(viewAllLabel(0, 0), null);
  assert.equal(viewAllLabel(1, 1), null);
  assert.equal(viewAllLabel(2, 2), null);
  assert.equal(viewAllLabel(3, 2), 'View all 3 comments');
  assert.equal(viewAllLabel(12, 2), 'View all 12 comments');
  /* The count says 2 but only one came back (one was blank, or the read was cut) - never "View all 2". */
  assert.equal(viewAllLabel(2, 1), 'View both comments');
});

test('a long multi-line comment collapses to one paragraph for the two-line cut', () => {
  assert.equal(previewBody('  Solid\n\nsession.\tWay to   work '), 'Solid session. Way to work');
});
