// PO 2026-09-28: "the weekly summary should be pinned at the top for 24 hours so it doesn't get buried in
// other posts."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.readFileSync(path.join(SRC, 'data/squad-feed-live.ts'), 'utf8');

test('⭐ a weekly summary under 24 hours old is pinned first, above the owner\'s pins', () => {
  assert.match(DATA, /export const WEEKLY_PIN_MS = 24 \* 60 \* 60 \* 1000;/);
  assert.match(DATA, /return fresh \? \[fresh, \.\.\.pinned\.filter\(\(p\) => p\.id !== fresh\.id\)\] : pinned;/);
});

test('it is read on its own — never picked out of the feed page, where a busy squad could bury it', () => {
  const fn = DATA.slice(DATA.indexOf('async function fetchFreshWeeklySummary'));
  assert.match(fn, /\.eq\('type', 'weekly'\)/);
  assert.match(fn, /\.gte\('created_at', since\)/);
});

test('the pin needs no migration — it works even where 0230 (owner pins) is missing', () => {
  const pinned = DATA.slice(DATA.indexOf('export async function fetchPinnedSquadPosts'), DATA.indexOf('export const WEEKLY_PIN_MS'));
  assert.doesNotMatch(pinned, /pinEdit0230/);
});
