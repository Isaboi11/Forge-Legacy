import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * DELETING A COMMENT, AND YOUR OWN FRIENDS POST (social-13 · social2-15, QA 09-26), through the real
 * `squad-feed-live.ts` and `friends-feed-live.ts`.
 *
 * The policies were always there (`squad_post_comments_delete`, `squad_posts_delete` — 0041 / 0074); the app
 * never called them. What is under test is the one thing the client has to get right on its own: RLS does not
 * REFUSE a delete it does not admit, it matches no row and reports success. A delete that removed nothing must
 * therefore be an error with a plain sentence, or the screen says "deleted" over a comment that is still there.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const squadFeed = await import('../squad-feed-live.ts');
const friendsFeed = await import('../friends-feed-live.ts');

test('deleting a comment removes that comment and no other', async () => {
  db.reset();
  db.rows('squad_post_comments').push(
    { id: 'c1', post_id: 'p1', author_id: ATHLETE, body: 'mine' },
    { id: 'c2', post_id: 'p1', author_id: 'someone-else', body: 'theirs' },
  );

  await squadFeed.deleteSquadComment('c1');

  assert.deepEqual(db.rows('squad_post_comments').map((c) => c.id), ['c2']);
});

test('a comment delete that removed nothing is an error, not a success', async () => {
  db.reset();
  db.rows('squad_post_comments').push({ id: 'c2', post_id: 'p1', author_id: 'someone-else', body: 'theirs' });

  // What RLS looks like from here: the row is not visible to the delete, so nothing matches.
  await assert.rejects(() => squadFeed.deleteSquadComment('not-a-row-i-may-delete'), /could not be deleted/);
  assert.equal(db.rows('squad_post_comments').length, 1, 'and nothing else went instead');
});

test('a refused comment delete surfaces the database’s own error', async () => {
  db.reset();
  db.rows('squad_post_comments').push({ id: 'c1', post_id: 'p1', author_id: ATHLETE, body: 'mine' });
  db.fail = (table, mode) => (table === 'squad_post_comments' && mode === 'delete' ? { code: '42501', message: 'permission denied' } : null);

  await assert.rejects(() => squadFeed.deleteSquadComment('c1'), (e) => e.code === '42501');
  assert.equal(db.rows('squad_post_comments').length, 1);
});

test('deleting my Friends post removes it; one that is not there is an error', async () => {
  db.reset();
  db.rows('squad_posts').push(
    { id: 'p1', author_id: ATHLETE, audience: 'FRIENDS', squad_id: null, type: 'discussion', body: 'mine' },
    { id: 'p2', author_id: 'someone-else', audience: 'FRIENDS', squad_id: null, type: 'discussion', body: 'theirs' },
  );

  await friendsFeed.deleteFriendPost('p1');
  assert.deepEqual(db.rows('squad_posts').map((p) => p.id), ['p2']);

  await assert.rejects(() => friendsFeed.deleteFriendPost('p1'), /could not be deleted/);
  assert.equal(db.rows('squad_posts').length, 1);
});
