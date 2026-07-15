/**
 * Honesty lock for the public-profile resolver (the /athlete/[id] surface behind the roster-row and
 * feed-author seams). The profile is deliberately THIN because the data is thin; these tests fix the
 * boundary so it can never quietly start fabricating:
 *   1) identity resolves for ANY name (feed-only authors included) — never a dead end;
 *   2) the public identity markers (rank, athleteType) appear ONLY for a known roster athlete, and
 *      are OMITTED (never invented) for feed-only authors and detail-less roster members;
 *   3) squad-scoped fields (accolades, since) NEVER leak onto the cross-context public view;
 *   4) isSelf is derived from the self identity, and self keeps its real handle.
 *
 * Zero-dep node --test; value cross-imports carry explicit .ts extensions.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPublicProfile } from '../athlete-profile-placeholder.ts'
import { getSelfProfile } from '../../domain/profile/placeholder-data.ts'

test('identity is always present for any name (feed-only authors included — never a dead end)', () => {
  const p = getPublicProfile('Dana Kwon') // feed-only author, in no roster
  assert.equal(p.name, 'Dana Kwon')
  assert.equal(p.handle, '@danakwon')
  assert.equal(p.rank, undefined, 'unknown athlete must have no fabricated rank')
  assert.equal(p.athleteType, undefined, 'unknown athlete must have no fabricated athleteType')
})

test('public identity markers appear ONLY for a known roster athlete', () => {
  const marcus = getPublicProfile('Marcus Vale') // iron member with rich detail
  assert.equal(marcus.rank, 'Architect')
  assert.equal(marcus.athleteType, 'Bodybuilder')

  const sana = getPublicProfile('Sana Okafor') // dawn member — name + status only, no rich detail
  assert.equal(sana.rank, undefined, 'detail-less roster member gets no invented rank')
  assert.equal(sana.athleteType, undefined, 'detail-less roster member gets no invented athleteType')
})

test('no squad-scoped leak: the view never carries accolades or since', () => {
  const p = getPublicProfile('Ada Ridge') // carries accolades + since on the roster
  assert.ok(!('accolades' in p), 'accolades (squad honors) must not leak to the public profile')
  assert.ok(!('since' in p), 'since (squad join date) must not leak to the public profile')
})

test('isSelf is derived from the self identity; others are not self; self keeps its real handle', () => {
  const self = getSelfProfile()
  assert.equal(getPublicProfile(self.name).isSelf, true)
  assert.equal(getPublicProfile('Marcus Vale').isSelf, false)
  assert.equal(getPublicProfile(self.name).handle, '@' + self.handle, 'self keeps its real handle, not the derived slug')
})

test('handle derivation strips spaces/punctuation to lowercase alphanumerics', () => {
  assert.equal(getPublicProfile('Lena Cross').handle, '@lenacross')
})
