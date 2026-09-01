import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * 0188 — the photo archive stops being a public folder.
 *
 * The job of this file is to keep two things true at once, because breaking either one is silent:
 *
 *  1. Every read path that hands a `chapter-photos` URL to a component signs it. A missed one is a
 *     broken tile in the archive, and the archive is the product's promise that things are kept.
 *  2. The read policy never narrows to `owner = auth.uid()` alone. That is the obvious policy and it
 *     is the trap: `storage.objects.owner` can be null on an old object, and a null owner under an
 *     owner-only read policy is a photo its athlete can never open again, permanently, with no error
 *     they would think to report.
 *
 * Source-text assertions, the idiom in this directory — these run under `node --test` with no
 * `node_modules` and no Supabase.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const SIGNED = read('../../lib/signed-media.ts');
const PHOTOS = read('../../data/photos-live.ts');
const ARCHIVE = read('../../data/legacy-archive-live.ts');
const AUTH = read('../../lib/auth.tsx');
const MIGRATION = read('../../../supabase/migrations/0188_private_chapter_photos.sql');
const BUNDLE = read('../../../supabase/apply/pending-0188.sql');

/**
 * The migration with its commentary stripped. The header QUOTES the very policy 0188 replaces
 * (`create policy chapter_photos_read … using (bucket_id = 'chapter-photos')`), so an assertion about
 * what this migration DOES has to read the statements and never the prose around them.
 */
const SQL = MIGRATION.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

// ── The read paths ───────────────────────────────────────────────────────────

test('every chapter-photo read path signs before the URL reaches a component', () => {
  // photo_albums() → the gallery's covers.
  assert.match(
    PHOTOS,
    /const covers = await signMedia\(albums\.map\(/,
    'fetchPhotoAlbums stopped signing album covers — the gallery is nothing but covers.',
  );
  // chapter_album() → one album's photos.
  assert.match(PHOTOS, /photos: await signPhotos\(/, 'fetchAlbum stopped signing its photos.');
  // Today's strip, shared by Workout Complete and the live workout screen.
  assert.match(
    PHOTOS,
    /return signPhotos\(\(\(data \?\? \[\]\)/,
    'fetchTodaysChapterPhotos stopped signing.',
  );
  // The Legacy tile's thumbnail is a chapter photo like any other.
  assert.match(
    ARCHIVE,
    /latest: await signOne\(latest\)/,
    'The Legacy archive tile stopped signing its thumbnail.',
  );
});

test('no read path builds a chapter-photos URL with getPublicUrl', () => {
  // The upload keeps using it: the public URL is the canonical STORED identifier, and 0188 changes
  // nothing about what is written to the row. Reads are what must sign.
  const publicCalls = [...PHOTOS.matchAll(/getPublicUrl/g)];
  assert.equal(
    publicCalls.length,
    1,
    `photos-live.ts should call getPublicUrl exactly once (the upload path). Found ${publicCalls.length}.`,
  );
  assert.match(
    PHOTOS.slice(0, PHOTOS.indexOf('getPublicUrl')),
    /export async function uploadChapterPhoto/,
    'The only getPublicUrl left in photos-live.ts must be inside uploadChapterPhoto.',
  );
});

test('signing never blanks a photo — failures return the original URL', () => {
  assert.match(
    SIGNED,
    /if \(error \|\| !data\) continue;/,
    'signMedia must leave the original URL in place when the storage call errors.',
  );
  assert.match(SIGNED, /\} catch \{/, 'signMedia must not throw on unreachable storage.');
  assert.match(
    SIGNED,
    /const out = urls\.slice\(\);/,
    'signMedia must start from the originals so every failure path degrades to them.',
  );
});

test('the signature cache is cleared on sign-out', () => {
  assert.match(AUTH, /clearSignedMedia\(\);/, 'signOut must clear the signed-URL cache.');
  assert.ok(
    AUTH.indexOf('clearSignedMedia();') < AUTH.indexOf('await supabase.auth.signOut();'),
    'The cache must be cleared before the session goes.',
  );
});

test('transformation-media is NOT signed yet, and the reason is written down', () => {
  // Deliberate absence, exactly as 0183 deliberately omits trainer_client_photos(). A progress post
  // stores the transformation object's URL directly, so a squad-mate reads an object they do not own
  // and cannot sign. Adding it to SIGNED_BUCKETS before the share path copies into squad-media would
  // break every progress post already in the feed.
  assert.doesNotMatch(
    SIGNED,
    /SIGNED_BUCKETS = \[[^\]]*transformation-media/,
    'transformation-media was added to SIGNED_BUCKETS — the share path must copy into squad-media first.',
  );
  assert.match(SIGNED, /progress post stores the transformation object's URL DIRECTLY/i);
});

// ── The migration ────────────────────────────────────────────────────────────

test('the bucket goes private', () => {
  assert.match(
    SQL,
    /update storage\.buckets set public = false where id = 'chapter-photos';/,
    'The bucket must actually flip. A policy alone leaves the public CDN path open.',
  );
});

test('read is scoped TO authenticated — the 0146 finding', () => {
  const start = SQL.indexOf('create policy chapter_photos_read');
  assert.ok(start > 0, 'chapter_photos_read is missing from the migration.');
  assert.match(
    SQL.slice(start, SQL.indexOf(';', start)),
    /for select to authenticated/,
    'A SELECT policy with no TO clause applies to anon — that is the whole finding 0146 left open.',
  );
});

test('⛔ read never narrows to owner alone — a null owner would lose the photo forever', () => {
  for (const name of ['chapter_photos_read', 'chapter_photos_update', 'chapter_photos_delete']) {
    const start = SQL.indexOf(`create policy ${name}`);
    assert.ok(start > 0, `${name} is missing.`);
    const clause = SQL.slice(start, SQL.indexOf(';', start));
    assert.match(clause, /owner = auth\.uid\(\)/, `${name} lost its owner fast path.`);
    assert.match(
      clause,
      /\(storage\.foldername\(name\)\)\[1\] in \(\s*select c\.id::text from public\.chapters c where c\.athlete_id = auth\.uid\(\)/,
      `${name} lost the chapter clause. An object whose owner is null becomes unreachable to the athlete who took it.`,
    );
  }
});

test('the chapter id is cast to text, never the folder name to uuid', () => {
  // A stray non-uuid folder must fail to match, not raise 22P02 and take the listing down.
  assert.doesNotMatch(SQL, /foldername\(name\)\)\[1\]::uuid/);
  assert.match(SQL, /select c\.id::text from public\.chapters c/);
});

test('insert is owner-scoped — any authenticated user could write any chapter folder before', () => {
  const start = SQL.indexOf('create policy chapter_photos_write');
  assert.ok(start > 0, 'chapter_photos_write is missing.');
  const clause = SQL.slice(start, SQL.indexOf(';', start));
  assert.match(clause, /with check \(/);
  assert.match(clause, /owner = auth\.uid\(\)/, 'Insert must be owner-scoped.');
});

test('the migration touches only chapter-photos', () => {
  for (const bucket of [
    'transformation-media',
    'squad-media',
    'squad-photos',
    'avatars',
    'exercise-media',
  ]) {
    assert.ok(
      !SQL.includes(bucket),
      `The migration's statements name ${bucket}. 0188 is chapter-photos only.`,
    );
  }
});

// ── The paste bundle ─────────────────────────────────────────────────────────

test('pending-0188.sql carries 0188_private_chapter_photos.sql verbatim', () => {
  // The whole-file embed is what makes this a one-line parity test — same contract as 0182 and 0183.
  assert.ok(
    BUNDLE.includes(MIGRATION),
    'The paste bundle no longer contains the migration byte-for-byte. Regenerate it.',
  );
});

test('the bundle leads with the ordering rule, because that is the only way to break this', () => {
  const head = BUNDLE.slice(0, BUNDLE.indexOf('BUCKET AND POLICIES'));
  assert.match(head, /DO NOT RUN THIS UNTIL THE OTA/i);
  assert.match(head, /unreachable objects/, 'The bundle must tell the reader which number to check.');
});

test('the bundle asserts rather than returning a tidy green', () => {
  assert.match(BUNDLE, /raise exception '0188: chapter-photos is STILL PUBLIC/);
  assert.match(BUNDLE, /raise exception '0188: chapter_photos_read is not scoped TO authenticated/);
  assert.match(BUNDLE, /raise exception '0188: chapter_photos_read lost its owner\/chapter scope/);
});

test('§3 is one result set — the editor shows only the last one', () => {
  const report = BUNDLE.slice(BUNDLE.lastIndexOf('with obj as ('));
  const statements = report.split(';').filter((s) => s.trim().length > 0);
  assert.equal(statements.length, 1, '§3 must be a single statement, or its rows get swallowed.');
  assert.match(report, /unreachable objects \(expect 0\)/);
});
