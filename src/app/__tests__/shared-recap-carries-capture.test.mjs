/**
 * shared-recap-carries-capture.test.mjs — what the capture stage collects is what the feed card shows.
 *
 * ══ WHY THIS IS A SOURCE GUARD ══
 *
 * PO: *"When I would attach a Spotify playlist it would show up on the front card of the post. This time
 * with the new flow it doesn't show on the card, only in the details of the workout when I click on it."*
 *
 * Nothing was broken in any layer a unit test can reach. `recapSummaryFrom` carried the playlist
 * correctly, `LedgerPost` drew a playlist row correctly, and both feeds mapped `summary.playlist` into it
 * correctly. The screen simply handed the function a STALE object: `data` is the completion as it was
 * fetched, attaching a playlist writes to the database and to derived state without refetching, so
 * `recapSummaryFrom({ ...data })` snapshotted the session as it looked before the athlete touched it.
 *
 * The old flow hid it. The playlist used to be attached from the ⋯ menu DURING the session, so it was on
 * the row before this screen ever loaded. Moving the attach point into `capture` moved it to after the
 * read — a value that was correct by accident stopped being correct, with no test to notice.
 *
 * ⚠ THIS READS NAMED FILES rather than grepping the repo. A source guard that searches for a string it
 * must also SAY will match itself — `svg-gradient-stops.test.mjs` did exactly that and failed on every
 * run from the day it was committed.
 *
 * ⚠ AND IT IS SOURCE-ONLY, WHICH IS A LIMITATION AND NOT A CHOICE. The behavioural half belongs next to
 * `recapSummaryFrom`, but `squad-feed-live.ts` reaches supabase through the `@/` alias, so importing it
 * under `node --test` throws `ERR_MODULE_NOT_FOUND` before a single assertion runs. Every value this
 * guard cares about is a wiring fact anyway: the defect was never a wrong computation, it was a correct
 * function handed the wrong object.
 *
 * Run:  node --test src/app/__tests__/shared-recap-carries-capture.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(HERE, '..', ...p), 'utf8');
const COMPLETE = read('workout-complete.tsx');
const SHEET = read('..', 'components', 'forge', 'ShareSessionSheet.tsx');
const FEED = read('..', 'data', 'squad-feed-live.ts');
const LEDGER = read('..', 'components', 'forge', 'compositions', 'LedgerPost.tsx');
const FRIENDS = read('friends.tsx');

// ── the snapshot keeps what it is given ─────────────────────────────────────

test('the recap snapshot carries a playlist at all', () => {
  assert.match(FEED, /playlist:\s*c\.playlist\s*\?\?\s*null/, 'the snapshot stopped copying the playlist onto the post');
});

// ── the wiring: the screen has to hand over the LIVE values ─────────────────

test('Workout Complete snapshots the live playlist, not the fetched one', () => {
  const call = COMPLETE.match(/summary=\{recapSummaryFrom\(([^)]*)\)\}/);
  assert.ok(call, 'the share sheet is no longer given a summary built by recapSummaryFrom');
  assert.match(
    call[1],
    /playlist\s*[,}]/,
    'the snapshot does not name `playlist`, so it falls back to the completion as it was FETCHED — ' +
      'attaching one on this screen and sharing in the same visit posts a card with no playlist row',
  );
});

test('Workout Complete sends the note and the photos it just collected', () => {
  assert.match(COMPLETE, /note=\{reflection/, 'the reflection never reaches the post as its caption');
  assert.match(COMPLETE, /media=\{sharePhotos\}/, 'the photos added on this screen never reach the post');
});

test('the photos it sends are the ones added HERE, identified rather than counted', () => {
  // A count delta cannot name a photo, so it cannot post one; it also mis-reads if a shot is deleted
  // elsewhere while this screen is open.
  assert.match(COMPLETE, /baseIds/, 'the photo baseline is still a count, so Share has no urls to send');
  assert.match(COMPLETE, /addedPhotos\s*=/, 'nothing derives which of today’s photos were added here');
});

// ── the sheet has to forward them, not overwrite them with blanks ───────────

test('⚠ the share sheet no longer hardcodes an empty body and no media', () => {
  assert.doesNotMatch(SHEET, /body:\s*''/, 'a hardcoded empty body drops the athlete’s note on the floor');
  assert.doesNotMatch(SHEET, /media:\s*\[\]/, 'a hardcoded empty media array drops the photo on the floor');
  // The body is the sheet's own box, seeded from the note prop — see `post-share-wiring.test.mjs`.
  assert.match(SHEET, /const body = \(bodyDraft \?\? note \?\? ''\)\.trim\(\);/, 'the post body is not built from the note prop');
  assert.match(SHEET, /\bmedia,/, 'the media prop is not forwarded onto the post');
});

// ── and the card has to draw them once they arrive ──────────────────────────

test('⚠ a recap with a photo keeps its stats — the image is evidence, not the subject', () => {
  // `showBody = !hasMedia` deletes the marker, title and stat row on any post with media. Correct for a
  // photo post, wrong for a session: it leaves a picture where a workout was.
  assert.match(
    LEDGER,
    /const showBody\s*=\s*!hasMedia\s*\|\|\s*shownStats\.length\s*>\s*0/,
    'media suppresses the body unconditionally again, so sharing a session with a photo hides its stats',
  );
});

test('the friends feed asks for a recap’s media', () => {
  // `shapeOf` returns `recap` before it ever looks at media, so a recap's photo was dropped at the map.
  const line = FRIENDS.match(/media=\{shape ===[^}]*\}/);
  assert.ok(line, 'the friends feed no longer maps media by shape');
  assert.match(line[0], /shape === 'recap'/, 'a session shared with a photo shows it on the squad feed and not here');
});

