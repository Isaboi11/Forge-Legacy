// PO 2026-11-12: the squad announcement sits under the header, above check-ins and the goal, and stays there
// until the owner takes it down or posts a new one. The weekly summary stays a 24-hour pin inside the feed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const PAGE = fs.readFileSync(path.join(SRC, 'app/squad/[id].tsx'), 'utf8');
const COMPOSER = fs.readFileSync(path.join(SRC, 'app/squad-composer.tsx'), 'utf8');

test('⭐ the announcement renders between the header and check-ins, in page order', () => {
  const hero = PAGE.indexOf('{/* HERO */}');
  const announce = PAGE.indexOf('{/* ANNOUNCEMENT');
  const checkins = PAGE.indexOf('{/* CHECK-INS');
  const feed = PAGE.indexOf('{/* SQUAD FEED */}');
  assert.ok(hero > 0 && announce > hero, 'after the header');
  assert.ok(checkins > announce, 'before check-ins');
  assert.ok(feed > checkins, 'the feed is still last');
});

test('it is the pinned announcement, drawn once: not in the Pinned strip, not in the feed', () => {
  assert.match(PAGE, /const announcement = pinnedPosts\.find\(\(p\) => p\.type === 'announcement'\) \?\? null;/);
  assert.match(PAGE, /const stripPosts = announcement \? pinnedPosts\.filter\(\(p\) => p\.id !== announcement\.id\) : pinnedPosts;/);
  assert.match(PAGE, /stripPosts\.map\(/, 'the strip draws the rest');
  assert.match(PAGE, /const feedPosts = \(feedData \?\? \[\]\)\.filter\(\(p\) => !pinnedPosts\.some/, 'the feed leaves out every pin, the announcement included');
});

test('only the owner gets "Take down", and it unpins rather than deletes', () => {
  const block = PAGE.slice(PAGE.indexOf('{/* ANNOUNCEMENT'), PAGE.indexOf('{/* CHECK-INS'));
  assert.match(block, /squad\.isOwner \?/);
  assert.match(block, /takeDownAnnouncement\(announcement\.id\)/);
  const fn = PAGE.slice(PAGE.indexOf('const takeDownAnnouncement'));
  assert.match(fn.slice(0, 400), /pinSquadPost\(postId, false\)/);
});

test('the composer pins an announcement after posting it, and never fails the post over the pin', () => {
  assert.match(COMPOSER, /if \(type !== 'announcement'\) return done\(\);/);
  assert.match(COMPOSER, /const pin = await pinAsAnnouncement\(squadId, postId\);/);
  // 0265: the friends writer's post id goes to the tag call (Friends & Squad) — never to `done` as the toast.
  assert.match(
    COMPOSER,
    /\}\)\.then\(\(postId\) => \{\s*if \(audience === 'BOTH'\) void tagMentions\(postId, null, mentions\.taggedIds\(\)\);\s*done\(\);\s*\}, failed\);/,
    'the friends writer does not pass its post id as the toast',
  );
});

test('Announcement is offered on a squad-only post only (Friends & Squad would write it as a discussion)', () => {
  assert.match(COMPOSER, /\{audience !== 'SQUAD' \? null : \(/);
});
