/**
 * Count ↔ thread consistency lock.
 *
 * The feed card may display a stored `commentCount` (the real feed endpoint returns a count
 * without loading the thread), but on SEEDED data it must equal `comments.length` — so the feed
 * card's count and Post Detail's "N Comments" (which derives from the loaded thread) can never
 * disagree, and no post shows a phantom count over an empty thread. This is the regression guard
 * for "make the count and the thread agree once real threads arrive."
 *
 * Zero-dep node --test.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getFriendsFeed, getCommunityFeed, getSquadFeed } from '../post-placeholder.ts'

function allSeededPosts() {
  return [...getFriendsFeed(), ...getCommunityFeed(), ...getSquadFeed('iron'), ...getSquadFeed('dawn')]
}

test('every seeded feed post: commentCount === comments.length (feed card ↔ detail cannot disagree)', () => {
  const posts = allSeededPosts()
  assert.ok(posts.length > 0, 'expected seeded posts')
  for (const p of posts) {
    assert.equal(
      p.commentCount,
      p.comments.length,
      `${p.source.kind}/${p.id}: stored count (${p.commentCount}) must equal thread length (${p.comments.length})`,
    )
  }
})

test('honest zero state: an empty thread reads count 0, never a phantom N', () => {
  const empties = allSeededPosts().filter((p) => p.comments.length === 0)
  assert.ok(empties.length > 0, 'expected some empty-thread posts (the community seed carries no threads)')
  for (const p of empties) assert.equal(p.commentCount, 0, `${p.source.kind}/${p.id}: empty thread must read 0`)
})

test('threaded posts carry a real non-zero count (the squad seed has threads)', () => {
  const threaded = getSquadFeed('iron').filter((p) => p.comments.length > 0)
  assert.ok(threaded.length > 0, 'squad iron should have threaded posts')
  for (const p of threaded) assert.equal(p.commentCount, p.comments.length, `${p.id}: threaded count must match`)
})
