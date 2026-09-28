import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * PIN AND EDIT (0230, PO 2026-09-28 — Squad Amendment 007), through the REAL `squad-feed-live.ts`.
 *
 * The two functions are registered on the fake as the SQL behaves (owner-only pin, 3 max; author-only edit, words and
 * — on a posted workout only — the workout). What is under test is the app's side: which posts come back pinned
 * and in what order, that a pinned post is read as the same row the feed draws, and that before 0230 is pasted
 * nothing is offered at all.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const live = await import('../squad-feed-live.ts');

const SQUAD = 'sq-1';
const OWNER = ATHLETE;

function post(id, over = {}) {
  return { id, squad_id: SQUAD, author_id: OWNER, type: 'discussion', body: `Post ${id}`, layout: null, created_at: `2026-09-2${id.slice(-1)}T10:00:00Z`, pinned_at: null, edited_at: null, ...over };
}

function install() {
  db.rpcs.squad_post_one = ({ p_post }) => {
    const p = db.rows('squad_posts').find((r) => r.id === p_post);
    return p ? [{ ...p, author_name: 'Coach', author_avatar: null, author_is_owner: true, comment_count: 0, respect_count: 0, i_reacted: false, media: [], workout_summary: null, recap: null, workout_id: null, squad_name: 'Squatober', squad_owner_id: OWNER }] : [];
  };
  let clock = 0;
  db.rpcs.pin_squad_post = ({ p_post_id, p_pin }) => {
    const p = db.rows('squad_posts').find((r) => r.id === p_post_id);
    if (!p) throw new Error('That post could not be pinned.');
    if (p_pin) {
      const others = db.rows('squad_posts').filter((r) => r.squad_id === p.squad_id && r.pinned_at && r.id !== p.id).length;
      if (others >= 3) throw new Error('You can pin up to 3 posts. Unpin one first.');
      p.pinned_at = `2026-09-28T0${clock++}:00:00Z`;
      return true;
    }
    p.pinned_at = null;
    return false;
  };
  db.rpcs.edit_squad_post = ({ p_post_id, p_body, p_layout }) => {
    const p = db.rows('squad_posts').find((r) => r.id === p_post_id && r.author_id === ATHLETE);
    if (!p) throw new Error('That post could not be edited.');
    if (p_layout && p.type !== 'workout') throw new Error('That workout could not be saved.');
    p.body = p_body?.trim() || null;
    if (p_layout) p.layout = p_layout;
    p.edited_at = '2026-09-28T12:00:00Z';
    return p.edited_at;
  };
}

test.beforeEach(() => {
  db.reset();
  install();
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) db.rows('squad_posts').push(post(id));
});

test('pinned posts come back newest pin first, as the same rows the feed draws', async () => {
  await live.pinSquadPost('p2', true);
  await live.pinSquadPost('p5', true);
  const pinned = await live.fetchPinnedSquadPosts(SQUAD);
  assert.deepEqual(pinned.map((p) => p.id), ['p5', 'p2'], 'the most recently pinned on top');
  assert.equal(pinned[0].body, 'Post p5');
  assert.equal(pinned[0].authorName, 'Coach');
});

test('at most three are pinned; the fourth is refused with its reason; unpinning frees a place', async () => {
  for (const id of ['p1', 'p2', 'p3']) await live.pinSquadPost(id, true);
  await assert.rejects(() => live.pinSquadPost('p4', true), /up to 3/);
  assert.equal((await live.fetchPinnedSquadPosts(SQUAD)).length, 3);
  assert.equal(await live.pinSquadPost('p1', false), false);
  await live.pinSquadPost('p4', true);
  assert.deepEqual((await live.fetchPinnedSquadPosts(SQUAD)).map((p) => p.id), ['p4', 'p3', 'p2']);
});

test("a post's marks: pinned and edited, and the edit changes only the words", async () => {
  await live.pinSquadPost('p3', true);
  await live.editSquadPost('p3', '  Tomorrow: Day 7. Bring chalk.  ');
  const m = await live.fetchPostMarks('p3');
  assert.equal(m.supported, true);
  assert.ok(m.pinnedAt);
  assert.ok(m.editedAt);
  const row = db.rows('squad_posts').find((r) => r.id === 'p3');
  assert.equal(row.body, 'Tomorrow: Day 7. Bring chalk.');
  assert.equal(row.type, 'discussion', 'the type is not the edit\'s to change');
  assert.ok(row.pinned_at, 'editing does not unpin');
});

test('a posted workout edits its workout; a note cannot be given one', async () => {
  db.rows('squad_posts').push(post('w1', { type: 'workout', layout: { kind: 'posted-workout', name: 'Day 7', exercises: [{ name: 'Back Squat', sets: 5, targetReps: 5, percentOfMax: 75 }] } }));
  const layout = { kind: 'posted-workout', name: 'Day 7', exercises: [{ name: 'Back Squat', sets: 5, targetReps: 3, percentOfMax: 80 }] };
  await live.editSquadPost('w1', 'Fixed the percentage', layout);
  assert.equal(db.rows('squad_posts').find((r) => r.id === 'w1').layout.exercises[0].percentOfMax, 80);
  await assert.rejects(() => live.editSquadPost('p1', 'x', layout), /could not be saved/);
});

test("somebody else's post cannot be edited — the reason comes back", async () => {
  db.rows('squad_posts').push(post('x1', { author_id: 'someone-else' }));
  await assert.rejects(() => live.editSquadPost('x1', 'mine now'), /could not be edited/);
  assert.equal(db.rows('squad_posts').find((r) => r.id === 'x1').body, 'Post x1');
});

/* LAST: the column latch is per session, like the app's. */
test('before 0230 is pasted: nothing pinned, marks unsupported — Pin and Edit are simply not offered', async () => {
  db.missing = new Set(['pinned_at', 'edited_at']);
  assert.deepEqual(await live.fetchPinnedSquadPosts(SQUAD), []);
  const m = await live.fetchPostMarks('p1');
  assert.equal(m.supported, false);
  assert.equal(m.pinnedAt, null);
});
