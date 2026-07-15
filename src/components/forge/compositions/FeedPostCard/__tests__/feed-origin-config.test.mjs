/**
 * Behaviour lock for the shared FeedPostCard's affordance config. With no RN renderer available
 * (zero-dep node --test), this is how we characterize "which affordances show for which origin"
 * deterministically — the companion to community-feed-characterization.test.mjs (which locks the
 * data). Together they make the committed Community feed's behaviour a test-locked contract.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { feedOriginConfig } from '../origin-config.ts'

test('community lights up the rich affordances (save / RSVP / program CTA / presence / type label)', () => {
  const c = feedOriginConfig('community')
  assert.equal(c.save, true)
  assert.equal(c.eventRSVP, true)
  assert.equal(c.programCTA, true)
  assert.equal(c.presenceOnAchievement, true)
  assert.equal(c.showTypeLabel, true)
  assert.equal(c.shareAlways, true)
  assert.equal(c.audienceTag, false) // every post is in-community; the tag is redundant
})

test('friends stays lean: audience tag on, moderation/creator affordances off', () => {
  const f = feedOriginConfig('friend')
  assert.equal(f.audienceTag, true)
  assert.equal(f.save, false)
  assert.equal(f.eventRSVP, false)
  assert.equal(f.programCTA, false)
  assert.equal(f.presenceOnAchievement, false)
  assert.equal(f.showTypeLabel, false)
  assert.equal(f.shareAlways, false)
})

test('squad is training-only: typed posts, but no save/RSVP/program/blanket-share', () => {
  const s = feedOriginConfig('squad')
  assert.equal(s.showTypeLabel, true) // Check-in / PR / Challenge Update …
  assert.equal(s.save, false)
  assert.equal(s.eventRSVP, false)
  assert.equal(s.programCTA, false) // squads have no programs
  assert.equal(s.shareAlways, false) // private feed; only keepsakes (PR) carry a share kind
  assert.equal(s.audienceTag, false) // every post is in the one squad
})
