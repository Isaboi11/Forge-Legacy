/**
 * Goldens for the Public Profile section-visibility RULE (not sample values).
 * Locks: a section is shown iff cleared-by-(audience × relationship) AND data-exists,
 * incl. the zero-data → sparse case, the private → owner-only case, and self-sees-all-owned.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSee, sectionVisible, VISIBILITY_DEFAULTS } from '../profile-visibility.ts'

test('defaults match the design source of truth (forge-visibility.js)', () => {
  assert.deepEqual({ ...VISIBILITY_DEFAULTS }, {
    chapter: 'everyone',
    history: 'everyone',
    timeline: 'squads',
    transformation: 'friends',
    photos: 'friends',
    accomplishments: 'everyone',
    stats: 'squads',
  })
})

test('gate (a) canSee — the audience × relationship clearance matrix', () => {
  // everyone: anyone
  for (const v of ['stranger', 'following', 'squadmate', 'friend']) assert.equal(canSee('everyone', v), true, `everyone/${v}`)
  // squads: squad-mate and closer
  assert.equal(canSee('squads', 'stranger'), false)
  assert.equal(canSee('squads', 'following'), false)
  assert.equal(canSee('squads', 'squadmate'), true)
  assert.equal(canSee('squads', 'friend'), true)
  // friends: friends only
  assert.equal(canSee('friends', 'stranger'), false)
  assert.equal(canSee('friends', 'squadmate'), false)
  assert.equal(canSee('friends', 'friend'), true)
  // private: nobody clears via canSee (owner handled by the isSelf bypass, not here)
  for (const v of ['stranger', 'squadmate', 'friend', 'self']) assert.equal(canSee('private', v), false, `private/${v}`)
})

test('two-gate sectionVisible — BOTH cleared AND data required', () => {
  // cleared + data → shown
  assert.equal(sectionVisible({ audience: 'everyone', viewer: 'stranger', hasData: true, isSelf: false }), true)
  // cleared but NO data → hidden (zero-data → sparse, the launch-correct shape)
  assert.equal(sectionVisible({ audience: 'everyone', viewer: 'stranger', hasData: false, isSelf: false }), false)
  // data exists but NOT cleared → hidden
  assert.equal(sectionVisible({ audience: 'friends', viewer: 'stranger', hasData: true, isSelf: false }), false)
  // friends section, friend viewer, data → shown
  assert.equal(sectionVisible({ audience: 'friends', viewer: 'friend', hasData: true, isSelf: false }), true)
  // squads section, squad-mate, data → shown; stranger → hidden
  assert.equal(sectionVisible({ audience: 'squads', viewer: 'squadmate', hasData: true, isSelf: false }), true)
  assert.equal(sectionVisible({ audience: 'squads', viewer: 'stranger', hasData: true, isSelf: false }), false)
})

test('private section is owner-only even for a friend viewer', () => {
  assert.equal(sectionVisible({ audience: 'private', viewer: 'friend', hasData: true, isSelf: false }), false)
})

test('self sees ALL owned sections (bypasses gate a) — but still needs data (gate b)', () => {
  // self bypasses the audience gate even for a private section...
  assert.equal(sectionVisible({ audience: 'private', viewer: 'self', hasData: true, isSelf: true }), true)
  assert.equal(sectionVisible({ audience: 'friends', viewer: 'self', hasData: true, isSelf: true }), true)
  // ...but a section the owner has no data for is still hidden (never fabricated)
  assert.equal(sectionVisible({ audience: 'everyone', viewer: 'self', hasData: false, isSelf: true }), false)
})
