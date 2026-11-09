import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * DELETING A PROGRESS SET OR A POST TAKES ITS FILES WITH IT (launch QA B11 / UX-001, 2026-11-09), through the
 * real `transformation-live.ts`, `squad-feed-live.ts` and `friends-feed-live.ts`.
 *
 * The 11-09 sweep deleted two progress sets through the UI — "Its photos… will be permanently removed… This
 * can't be undone" — then fetched every photo by its public URL with no account: HTTP 200. The row was the
 * only thing that went. These tests hold the four things the fix has to get right on its own:
 *   · the files the deleted row named are removed, and nothing else is;
 *   · a row delete that fails costs no file;
 *   · a file that will not go never fails the delete, and is COUNTED so the screen can say so;
 *   · a post never takes the athlete's archive with it, nor an upload another of their posts still shows.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const xform = await import('../transformation-live.ts');
const squadFeed = await import('../squad-feed-live.ts');
const friendsFeed = await import('../friends-feed-live.ts');
const { storagePathOf } = await import('../media-cleanup-live.ts');

const BASE = 'https://proj.supabase.co/storage/v1/object/public';
const urlOf = (bucket, path, v = '') => `${BASE}/${bucket}/${path}${v ? `?v=${v}` : ''}`;
const put = (bucket, path, owner = ATHLETE) => db.objects.set(`${bucket}/${path}`, { owner });
const has = (bucket, path) => db.objects.has(`${bucket}/${path}`);
const removes = () => db.log.filter((l) => l.mode === 'remove');

const OTHER = '00000000-0000-4000-8000-000000000002';

function seedSet(id, folder, poses = ['rf', 'rs', 'rb'], video = true) {
  const photos = {};
  for (const p of poses) {
    put('transformation-media', `${folder}/${p}.jpg`);
    photos[p] = urlOf('transformation-media', `${folder}/${p}.jpg`, '1762700000000');
  }
  if (video) put('transformation-media', `${folder}/video.mp4`);
  db.rows('transformation_entries').push({
    id,
    athlete_id: ATHLETE,
    photos,
    video_url: video ? urlOf('transformation-media', `${folder}/video.mp4`, '1762700000001') : null,
  });
}

// ── the path ────────────────────────────────────────────────────────────────

test('a stored public URL names its object path; a URL from another bucket names nothing', () => {
  assert.equal(storagePathOf(urlOf('transformation-media', 'xf-1762/rf.jpg', '99'), 'transformation-media'), 'xf-1762/rf.jpg');
  assert.equal(storagePathOf(urlOf('squad-media', 'friends/u-1.jpg'), 'squad-media'), 'friends/u-1.jpg');
  // Load-bearing: this is what keeps a post delete away from the archive it was composed from.
  assert.equal(storagePathOf(urlOf('transformation-media', 'xf-1/rf.jpg'), 'squad-media'), null);
  assert.equal(storagePathOf(urlOf('chapter-photos', 'ch-1/a.jpg'), 'squad-media'), null);
  assert.equal(storagePathOf('', 'squad-media'), null);
});

test('account deletion reads paths through the same helper — one rule, not two copies', () => {
  const src = readFileSync(new URL('../account-live.ts', import.meta.url), 'utf8');
  assert.match(src, /import \{ storagePathOf \} from '@\/data\/media-cleanup-live'/);
  assert.doesNotMatch(src, /url\.indexOf\(marker\)/, 'a second copy of the path rule crept back into account-live');
});

// ── a progress set ──────────────────────────────────────────────────────────

test('deleting a progress set removes every pose and the posing clip, and nothing of any other set', async () => {
  db.reset();
  seedSet('e1', 'xf-1762700000000');
  seedSet('e2', 'xf-1762800000000', ['rf'], false);

  const out = await xform.deleteTransformationEntry('e1');

  assert.deepEqual(out, { left: 0 });
  assert.deepEqual(db.rows('transformation_entries').map((r) => r.id), ['e2']);
  for (const p of ['rf.jpg', 'rs.jpg', 'rb.jpg', 'video.mp4']) assert.ok(!has('transformation-media', `xf-1762700000000/${p}`), `${p} is still in the public bucket`);
  assert.ok(has('transformation-media', 'xf-1762800000000/rf.jpg'), 'another set lost its photo');
});

test('an edited set whose poses span two folders loses all of them', async () => {
  db.reset();
  // A new set uploads under `xf-<epoch>`; a re-take in edit mode uploads under the entry's own id.
  put('transformation-media', 'xf-1/rf.jpg');
  put('transformation-media', 'e1/rs.jpg');
  db.rows('transformation_entries').push({
    id: 'e1',
    athlete_id: ATHLETE,
    photos: { rf: urlOf('transformation-media', 'xf-1/rf.jpg'), rs: urlOf('transformation-media', 'e1/rs.jpg', '5') },
    video_url: null,
  });

  assert.deepEqual(await xform.deleteTransformationEntry('e1'), { left: 0 });
  assert.equal(db.objects.size, 0);
});

test('a set delete the database refuses throws, and no photo is touched', async () => {
  db.reset();
  seedSet('e1', 'xf-1');
  db.fail = (table, mode) => (table === 'transformation_entries' && mode === 'delete' ? { code: '42501', message: 'permission denied' } : null);

  await assert.rejects(() => xform.deleteTransformationEntry('e1'), (e) => e.code === '42501');
  assert.equal(db.rows('transformation_entries').length, 1);
  assert.equal(db.objects.size, 4, 'a failed row delete removed photos — the set would come back blank');
  assert.equal(removes().length, 0);
});

test('one dropped storage request is retried, and the files still go', async () => {
  db.reset();
  seedSet('e1', 'xf-1');
  db.storageDown = 1;

  assert.deepEqual(await xform.deleteTransformationEntry('e1'), { left: 0 });
  assert.equal(db.objects.size, 0);
});

test('files that will not go never fail the delete — they come back counted, so the screen can say so', async () => {
  db.reset();
  seedSet('e1', 'xf-1');
  db.storageDown = 2;

  const out = await xform.deleteTransformationEntry('e1');

  assert.deepEqual(out, { left: 4 });
  assert.equal(db.rows('transformation_entries').length, 0, 'the delete the athlete confirmed must still happen');
});

test('both delete screens tell the athlete when a file stayed, and the confirm says shared posts lose them too', () => {
  for (const p of ['../../app/transformation.tsx', '../../app/transformation/[id].tsx']) {
    const src = readFileSync(new URL(p, import.meta.url), 'utf8');
    assert.match(src, /deleteTransformationEntry\([^)]*\)\.then\(\s*\(\{ left \}\) =>/, `${p} ignores what the delete left behind`);
    assert.match(src, /if \(left > 0\) showToast\('Entry deleted, but some of its photos couldn’t be removed\.'\)/, `${p} no longer says when a file stayed`);
    assert.match(src, /including from any post you shared them to/, `${p} lost the shared-post consequence from its confirm`);
  }
});

// ── a post ──────────────────────────────────────────────────────────────────

test('deleting my squad post removes the photo I added only to it', async () => {
  db.reset();
  put('squad-media', `sq1/${ATHLETE}-1.jpg`);
  db.rows('squad_posts').push({ id: 'p1', author_id: ATHLETE, squad_id: 'sq1', audience: 'SQUAD', media: [{ url: urlOf('squad-media', `sq1/${ATHLETE}-1.jpg`), kind: 'image' }] });

  assert.deepEqual(await squadFeed.deleteSquadPost('p1'), { left: 0 });
  assert.equal(db.rows('squad_posts').length, 0);
  assert.ok(!has('squad-media', `sq1/${ATHLETE}-1.jpg`), 'the post is gone but its photo is still public');
});

test('⚠ a post never takes the archive it was composed from', async () => {
  db.reset();
  // A progress post carries transformation-media URLs; a session recap carries chapter-photos album URLs.
  put('transformation-media', 'xf-1/rf.jpg');
  put('chapter-photos', 'ch-1/a.jpg');
  db.rows('squad_posts').push(
    { id: 'p1', author_id: ATHLETE, squad_id: 'sq1', audience: 'SQUAD', type: 'progress', media: [{ url: urlOf('transformation-media', 'xf-1/rf.jpg', '7'), kind: 'image' }] },
    { id: 'p2', author_id: ATHLETE, squad_id: null, audience: 'FRIENDS', type: 'recap', media: [{ url: urlOf('chapter-photos', 'ch-1/a.jpg'), kind: 'image' }] },
  );

  await squadFeed.deleteSquadPost('p1');
  await friendsFeed.deleteFriendPost('p2');

  assert.ok(has('transformation-media', 'xf-1/rf.jpg'), 'deleting a post deleted the progress photo it showed');
  assert.ok(has('chapter-photos', 'ch-1/a.jpg'), 'deleting a post deleted the album photo it showed');
  assert.equal(removes().length, 0);
});

test('⚠ an upload another of my posts still shows stays until the last of them goes', async () => {
  db.reset();
  // One recap posted to a squad and to friends: one upload, the same URL on both rows (workout-post-live).
  const shared = urlOf('squad-media', `friends/${ATHLETE}-9.png`);
  put('squad-media', `friends/${ATHLETE}-9.png`);
  db.rows('squad_posts').push(
    { id: 'p1', author_id: ATHLETE, squad_id: 'sq1', audience: 'SQUAD', media: [{ url: shared, kind: 'image' }] },
    { id: 'p2', author_id: ATHLETE, squad_id: null, audience: 'FRIENDS', media: [{ url: shared, kind: 'image' }, { url: urlOf('chapter-photos', 'ch/b.jpg'), kind: 'image' }] },
  );

  assert.deepEqual(await squadFeed.deleteSquadPost('p1'), { left: 0 });
  assert.ok(has('squad-media', `friends/${ATHLETE}-9.png`), 'deleting one cross-post blanked the other');

  assert.deepEqual(await friendsFeed.deleteFriendPost('p2'), { left: 0 });
  assert.ok(!has('squad-media', `friends/${ATHLETE}-9.png`), 'the last post went and its picture stayed public');
});

test('if "is it still shown elsewhere?" cannot be answered, the file is kept — and counted as left', async () => {
  db.reset();
  put('squad-media', `sq1/${ATHLETE}-1.jpg`);
  db.rows('squad_posts').push({ id: 'p1', author_id: ATHLETE, squad_id: 'sq1', audience: 'SQUAD', media: [{ url: urlOf('squad-media', `sq1/${ATHLETE}-1.jpg`), kind: 'image' }] });
  // The delete lands; the follow-up read does not.
  db.fail = (table, mode) => (table === 'squad_posts' && mode === 'select' ? { code: '', message: 'Network request failed' } : null);

  assert.deepEqual(await squadFeed.deleteSquadPost('p1'), { left: 1 });
  assert.equal(db.rows('squad_posts').length, 0);
  assert.ok(has('squad-media', `sq1/${ATHLETE}-1.jpg`));
});

test('a squad owner taking down someone else’s post removes the row and never reaches for their files', async () => {
  db.reset();
  put('squad-media', `sq1/${OTHER}-1.jpg`, OTHER);
  db.rows('squad_posts').push({ id: 'p1', author_id: OTHER, squad_id: 'sq1', audience: 'SQUAD', media: [{ url: urlOf('squad-media', `sq1/${OTHER}-1.jpg`), kind: 'image' }] });

  assert.deepEqual(await squadFeed.deleteSquadPost('p1'), { left: 0 });
  assert.equal(db.rows('squad_posts').length, 0);
  assert.equal(removes().length, 0, 'tried to remove another athlete’s file — storage refuses it, and we must not try');
  assert.ok(has('squad-media', `sq1/${OTHER}-1.jpg`));
});

test('both post screens say when a file stayed, and the confirm says which photos go', () => {
  for (const p of ['../../app/squad-post/[id].tsx', '../../app/friends.tsx']) {
    const src = readFileSync(new URL(p, import.meta.url), 'utf8');
    assert.match(src, /const \{ left \} = await delete(Squad|Friend)Post\(/, `${p} ignores what the delete left behind`);
    assert.match(src, /left > 0 \? 'Post deleted, but some of its photos couldn’t be removed\.' : 'Post deleted\.'/, `${p} no longer says when a file stayed`);
    assert.match(src, /any photos you added only to this post\. Photos from your own archive stay there\./, `${p} confirm no longer says which photos go`);
    assert.doesNotMatch(src, /only the post goes/, `${p} still implies the post's own photos stay`);
  }
});
