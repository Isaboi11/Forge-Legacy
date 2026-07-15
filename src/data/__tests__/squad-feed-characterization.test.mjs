/**
 * CHARACTERIZATION + FIREWALL lock for the Squad feed (S-2) convergence onto the shared card.
 *
 * getSquadFeed(squadId) maps each squad's CommunityPost-shaped seed onto the shared FeedPost so
 * the ONE FeedPostCard renders it. This test locks:
 *   1) the semantic render-contract of the two seeded squads (iron, dawn) as an explicit golden —
 *      including the 3 NEW additive content types (checkin/streak, challengeUpdate, traintogether);
 *   2) PER-SQUAD ISOLATION as a hard contract, NOT a runtime hope: a squad's feed contains only
 *      its own posts, feeds are disjoint, empty squads are empty, and every post is sourced to its
 *      own squad. This is the squad equivalent of the friends firewall.
 *
 * Zero-dep node --test; no RN renderer, so the lock is at the data/semantic layer (affordances are
 * locked by feed-origin-config.test.mjs). If this goes red, a squad post changed meaning or a feed
 * leaked — STOP, don't force it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getSquadFeed, getPost } from '../post-placeholder.ts'
import { getSquadCheckins, getSquadCompetition, getSquadMembers, getSquadRecords, newRecordBanner } from '../squad-feed-placeholder.ts'
import { formatRecordValue } from '../../domain/records/format.ts'

const GOLDEN = {
  iron: [
    { id: 'iv_fc', author: 'Dana Cole', role: undefined, typeLabel: 'Form Check', respect: 14, comment: 2, contentType: 'media', shareable: false, media: { mediaKind: 'video', duration: '0:31' }, challenge: 'Forge League · Week 3' },
    { id: 'iv_pr', author: 'Marcus Vale', role: 'captain', typeLabel: 'PR', respect: 22, comment: 1, contentType: 'achievement', shareable: true, achievement: { display: '315 lb', exercise: 'Bench Press', label: 'Squad PR', measure: { kind: 'load', value: 315, unit: 'lb' } } },
    { id: 'iv_ch', author: 'Ada Ridge', role: 'owner', typeLabel: 'Challenge Update', respect: 18, comment: 1, contentType: 'challengeUpdate', shareable: false, challengeUpdate: { name: 'Forge League', place: '2nd', of: '5', metric: '5 workouts' } },
    { id: 'iv_ann', author: 'Ada Ridge', role: 'owner', typeLabel: 'Announcement', respect: 9, comment: 0, contentType: 'text', shareable: false },
  ],
  dawn: [
    { id: 'dp_ci', author: 'Sana Okafor', role: undefined, typeLabel: 'Check-in', respect: 7, comment: 1, contentType: 'checkin', shareable: false, checkin: { streak: 11 } },
    { id: 'dp_pr', author: 'Ravi Menon', role: 'captain', typeLabel: 'PR', respect: 19, comment: 1, contentType: 'achievement', shareable: true, achievement: { display: '19:48', exercise: '5K', label: 'Squad PR', measure: { kind: 'time', seconds: 1188 } } },
    { id: 'dp_tt', author: 'Mara Lindqvist', role: undefined, typeLabel: 'Train Together', respect: 5, comment: 0, contentType: 'traintogether', shareable: false },
  ],
}

const SOURCE_NAME = { iron: 'Iron Vigil', dawn: 'Dawn Patrol' }

for (const [squadId, golden] of Object.entries(GOLDEN)) {
  test(`merge preserves every rendered field: getSquadFeed('${squadId}')`, () => {
    const feed = getSquadFeed(squadId)
    assert.equal(feed.length, golden.length, `${squadId} feed length`)
    assert.deepEqual(feed.map((p) => p.id), golden.map((g) => g.id), `${squadId} order`)

    for (const g of golden) {
      const post = feed.find((p) => p.id === g.id)
      assert.ok(post, `${squadId} missing ${g.id}`)
      assert.equal(post.author, g.author, `${g.id} author`)
      assert.equal(post.role, g.role, `${g.id} role`)
      assert.equal(post.typeLabel, g.typeLabel, `${g.id} typeLabel`)
      assert.equal(post.respect, g.respect, `${g.id} respect`)
      assert.equal(post.commentCount, g.comment, `${g.id} comment count`)
      assert.equal(post.content.type, g.contentType, `${g.id} content type`)
      assert.equal(Boolean(post.shareType), g.shareable, `${g.id} shareable`)
      assert.equal(post.source.kind, 'squad', `${g.id} source kind`)

      if (g.challenge !== undefined) assert.equal(post.challenge, g.challenge, `${g.id} challenge context`)
      if (g.achievement) {
        // structured PersonalRecord (load AND time forms) + the display each must still format to
        assert.deepEqual(post.content.record.measure, g.achievement.measure, `${g.id} measure`)
        assert.equal(post.content.record.exercise, g.achievement.exercise, `${g.id} exercise`)
        assert.equal(post.content.label, g.achievement.label, `${g.id} label`)
        assert.equal(formatRecordValue(post.content.record.measure), g.achievement.display, `${g.id} display survives the swap`)
      }
      if (g.media) {
        assert.equal(post.content.mediaKind, g.media.mediaKind, `${g.id} media kind`)
        assert.equal(post.content.duration, g.media.duration, `${g.id} media duration`)
      }
      if (g.checkin) assert.equal(post.content.streak, g.checkin.streak, `${g.id} streak`)
      if (g.challengeUpdate) {
        assert.equal(post.content.name, g.challengeUpdate.name, `${g.id} challenge name`)
        assert.equal(post.content.place, g.challengeUpdate.place, `${g.id} place`)
        assert.equal(post.content.of, g.challengeUpdate.of, `${g.id} of`)
        assert.equal(post.content.metric, g.challengeUpdate.metric, `${g.id} metric`)
      }
    }
  })
}

test('FIREWALL: per-squad isolation — feeds contain only their own posts, and are disjoint', () => {
  const iron = getSquadFeed('iron')
  const dawn = getSquadFeed('dawn')

  // every post is sourced to its own squad
  for (const p of iron) assert.equal(p.source.name, SOURCE_NAME.iron, `${p.id} must be sourced to Iron Vigil`)
  for (const p of dawn) assert.equal(p.source.name, SOURCE_NAME.dawn, `${p.id} must be sourced to Dawn Patrol`)

  // no post id appears in both feeds (no leak)
  const ironIds = new Set(iron.map((p) => p.id))
  const dawnIds = new Set(dawn.map((p) => p.id))
  for (const id of ironIds) assert.equal(dawnIds.has(id), false, `${id} leaked from iron into dawn`)
  for (const id of dawnIds) assert.equal(ironIds.has(id), false, `${id} leaked from dawn into iron`)
})

test('FIREWALL: squads with no posts return empty; unknown squad returns empty (never another squad)', () => {
  assert.deepEqual(getSquadFeed('proving'), [])
  assert.deepEqual(getSquadFeed('home'), [])
  assert.deepEqual(getSquadFeed('does-not-exist'), [])
})

test('tap-through: every squad feed post resolves via getPost(id)', () => {
  for (const squadId of ['iron', 'dawn']) {
    for (const post of getSquadFeed(squadId)) {
      const resolved = getPost(post.id)
      assert.ok(resolved, `getPost('${post.id}') should resolve for feed↔detail consistency`)
      assert.equal(resolved.id, post.id)
    }
  }
})

// ── Squad Detail chrome: check-in strip + competition banner (S-2 sections) ──

test('check-in strip + competition banner: content locked', () => {
  const iron = getSquadCheckins('iron')
  assert.deepEqual(iron.map((c) => c.first), ['Dana', 'Marcus', 'Ada', 'Theo', 'Lena'])
  assert.equal(iron.filter((c) => c.status === 'trained').length, 3)
  const dana = iron.find((c) => c.id === 'dana')
  assert.equal(dana.hasVideo, true)
  assert.equal(dana.unread, true)

  const comp = getSquadCompetition('iron')
  assert.equal(comp.name, 'Forge League')
  assert.equal(comp.place, '2nd')
  assert.equal(comp.of, '5')
  assert.equal(comp.workouts, 18)
})

test('FIREWALL: check-ins + competition are squad-scoped and isolated', () => {
  const ironIds = new Set(getSquadCheckins('iron').map((c) => c.id))
  const dawnIds = new Set(getSquadCheckins('dawn').map((c) => c.id))
  for (const id of ironIds) assert.equal(dawnIds.has(id), false, `${id} check-in leaked iron→dawn`)
  for (const id of dawnIds) assert.equal(ironIds.has(id), false, `${id} check-in leaked dawn→iron`)
  // distinct competitions, never shared
  assert.notEqual(getSquadCompetition('iron').name, getSquadCompetition('dawn').name)
})

test('FIREWALL: squads with no check-ins/competition return empty/null (never another squad’s)', () => {
  assert.deepEqual(getSquadCheckins('proving'), [])
  assert.deepEqual(getSquadCheckins('does-not-exist'), [])
  assert.equal(getSquadCompetition('home'), null)
  assert.equal(getSquadCompetition('does-not-exist'), null)
})

// ── Single squad-member source (roster + check-in strip read the same list) ──

test('member roster: per-squad counts are locked (drives "N members" === members.length)', () => {
  assert.equal(getSquadMembers('iron').length, 5)
  assert.equal(getSquadMembers('dawn').length, 6)
  assert.equal(getSquadMembers('proving').length, 4)
  assert.equal(getSquadMembers('home').length, 1)
  assert.deepEqual(getSquadMembers('does-not-exist'), [])
})

test('SINGLE SOURCE: the check-in strip is a subset of the roster, with matching identity', () => {
  for (const squadId of ['iron', 'dawn', 'proving', 'home']) {
    const byId = new Map(getSquadMembers(squadId).map((m) => [m.id, m]))
    for (const c of getSquadCheckins(squadId)) {
      const m = byId.get(c.id)
      assert.ok(m, `${squadId}: check-in ${c.id} must be a real roster member`)
      assert.equal(c.name, m.name, `${squadId}/${c.id}: check-in name must match the roster (no same-screen contradiction)`)
    }
  }
})

test('absent-field honesty: only iron carries rich member detail; others are name + status only', () => {
  for (const m of getSquadMembers('iron')) assert.ok(m.rank && m.athleteType, `iron/${m.id} should have rich detail`)
  for (const squadId of ['dawn', 'proving', 'home']) {
    for (const m of getSquadMembers(squadId)) {
      assert.equal(m.rank, undefined, `${squadId}/${m.id} rank must not be invented`)
      assert.equal(m.athleteType, undefined, `${squadId}/${m.id} athleteType must not be invented`)
    }
  }
})

test('FIREWALL: members are squad-scoped and disjoint (no cross-squad leak)', () => {
  const ironIds = new Set(getSquadMembers('iron').map((m) => m.id))
  const dawnIds = new Set(getSquadMembers('dawn').map((m) => m.id))
  for (const id of ironIds) assert.equal(dawnIds.has(id), false, `${id} leaked iron→dawn`)
  for (const id of dawnIds) assert.equal(ironIds.has(id), false, `${id} leaked dawn→iron`)
})

// ── Squad records (read-only record book) ──

test('records: iron has the 6-mark book; other squads have none (absent, not invented)', () => {
  assert.equal(getSquadRecords('iron').length, 6)
  assert.deepEqual(getSquadRecords('dawn'), [])
  assert.deepEqual(getSquadRecords('proving'), [])
  assert.deepEqual(getSquadRecords('home'), [])
  assert.deepEqual(getSquadRecords('does-not-exist'), [])
})

test('CONSISTENCY: every record holder (current + history) is a real roster member', () => {
  const rosterNames = new Set(getSquadMembers('iron').map((m) => m.name))
  for (const r of getSquadRecords('iron')) {
    assert.ok(rosterNames.has(r.holder), `record "${r.label}" holder ${r.holder} must be a roster member`)
    for (const h of r.history) {
      assert.ok(rosterNames.has(h.holder), `record "${r.label}" history holder ${h.holder} must be a roster member`)
    }
    // history is descending (most-recent previous first) and non-empty for the seeded book
    assert.ok(r.history.length > 0, `record "${r.label}" should carry history`)
  }
})

// ── Record history sheet: the "New Record" banner must never fabricate a milestone ──

test('history sheet banner: only genuine improvements produce a banner, and prev/current trace to the record', () => {
  for (const r of getSquadRecords('iron')) {
    const banner = newRecordBanner(r)
    if (r.isNew) {
      assert.ok(banner, `isNew record "${r.label}" must produce a banner`)
      assert.equal(banner.current, r.value, `${r.label}: banner current === record.value`)
      assert.equal(banner.prev, r.history[0].value, `${r.label}: banner prev === most-recent previous holder's value`)
      assert.notEqual(banner.prev, banner.current, `${r.label}: banner must show a real improvement (prev ≠ current)`)
    } else {
      assert.equal(banner, null, `non-new record "${r.label}" must NOT fabricate a New Record banner`)
    }
  }
})

test('history sheet banner: no previous mark → no banner (never a milestone over nothing)', () => {
  // isNew but empty history: the gate cannot invent a "previous", so it yields null.
  const noHistory = { key: 'x', label: 'X', holder: 'A', value: '10', unit: 'u', date: 'now', isNew: true, history: [] }
  assert.equal(newRecordBanner(noHistory), null)
  // isNew but the value did not actually change from the prior holder → not a real improvement.
  const unchanged = { key: 'y', label: 'Y', holder: 'A', value: '10', unit: 'u', date: 'now', isNew: true, history: [{ holder: 'B', value: '10', date: 'then' }] }
  assert.equal(newRecordBanner(unchanged), null)
})
