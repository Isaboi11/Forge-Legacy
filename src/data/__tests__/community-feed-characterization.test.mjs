/**
 * CHARACTERIZATION test for the Community → shared-feed convergence.
 *
 * The committed Community tab renders `COMMUNITY_DATA.posts` (a rich `CommunityPost[]`) through
 * its own inline PostCard. We are replacing that inline card with the shared FeedPostCard, fed by
 * a new `getCommunityFeed()` that maps `CommunityPost` → `FeedPost`. This test LOCKS the semantic
 * render-contract of today's committed feed as an explicit golden, then proves the merge preserves
 * every meaningful field — nothing is lost mapping the richer model onto the shared `PostContent`
 * union. (Zero-dep `node --test`, no RN renderer available — so the lock is at the data/semantic
 * layer that drives rendering, not a pixel snapshot. Affordance behaviour is locked separately by
 * feed-origin-config.test.mjs.)
 *
 * If this goes red during the merge, a Community post changed meaning — STOP, don't force it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COMMUNITY_DATA } from '../community-placeholder.ts'
import { getCommunityFeed, getPost } from '../post-placeholder.ts'
// `formatProgramMeta` moved to the domain: a production component (PostContent) was importing it as a
// VALUE out of this fixture module, which compiled every invented athlete in here into the shipped
// bundle. The golden below is unchanged — same function, same output, honest module boundary.
import { formatProgramMeta } from '../../domain/training/program-meta.ts'
import { formatRecordValue } from '../../domain/records/format.ts'

/**
 * GOLDEN — today's committed Community feed, reduced to the fields that drive rendering. Authored
 * as a literal (not derived from the source) so it is a true lock: change the seed OR lose a field
 * in the mapping and this fails. Order matches COMMUNITY_DATA.posts.
 */
// NOTE: `comment` is 0 for every community post — the community seed carries no comment threads,
// and commentCount DERIVES from the thread (single source of truth), so the seed's old phantom
// counts collapse to an honest 0. Agreement is enforced by comment-count-consistency.test.mjs.
const GOLDEN = [
  {
    id: 'p_disc', author: 'Marcus Vale', role: 'mod', typeLabel: 'Discussion', hasBody: true,
    respect: 28, comment: 0, contentType: 'text', shareable: false,
  },
  {
    id: 'p_prog', author: 'Coach Halden', role: 'owner', typeLabel: 'Coaching', hasBody: true,
    respect: 64, comment: 0, contentType: 'program', shareable: false,
    program: { name: 'October Strength Block', kindLabel: 'Forge Program', durationWeeks: 8, frequencyPerWeek: 4, structure: 'upper_lower', formatted: '8 weeks · Upper / Lower · 4 days/week', saveLabel: 'Save to Upcoming', savedNote: '214 saved', price: undefined },
  },
  {
    id: 'p_ev', author: 'Coach Halden', role: 'owner', typeLabel: 'Event', hasBody: true,
    respect: 30, comment: 0, contentType: 'event', shareable: false,
    event: { month: 'OCT', day: '12', title: 'Saturday Community Lift', when: 'Sat · 9:00 AM', going: 128 },
  },
  {
    id: 'p_progext', author: 'Elena Ruiz', role: 'mod', typeLabel: 'Coaching', hasBody: true,
    respect: 88, comment: 0, contentType: 'program', shareable: false,
    program: { name: 'Hypertrophy Foundations', kindLabel: 'Paid Program', durationWeeks: 12, frequencyPerWeek: undefined, structure: 'ppl', formatted: '12 weeks · Push/Pull/Legs', saveLabel: 'Get Program', footNote: 'Imports into Forge Legacy', price: '$29' },
  },
  {
    id: 'p_fc', author: 'Theo Brandt', role: undefined, typeLabel: 'Form Check', hasBody: true,
    respect: 33, comment: 0, contentType: 'media', shareable: false,
    media: { mediaKind: 'video', duration: '0:27' },
  },
  {
    id: 'p_pr', author: 'Jasmine Rae', role: undefined, typeLabel: 'Achievement', hasBody: true,
    respect: 52, comment: 0, contentType: 'achievement', shareable: true,
    achievement: { display: '405 lb', exercise: 'Bench Press', label: 'New Personal Record', measure: { kind: 'load', value: 405, unit: 'lb' } },
  },
]

test('source lock: COMMUNITY_DATA.posts is the 6 committed posts, in order', () => {
  assert.equal(COMMUNITY_DATA.posts.length, GOLDEN.length)
  assert.deepEqual(COMMUNITY_DATA.posts.map((p) => p.id), GOLDEN.map((g) => g.id))
})

test('merge preserves every rendered field: getCommunityFeed() matches the golden', () => {
  const feed = getCommunityFeed()
  assert.equal(feed.length, GOLDEN.length, 'feed length')

  for (const g of GOLDEN) {
    const post = feed.find((p) => p.id === g.id)
    assert.ok(post, `feed is missing ${g.id}`)
    assert.equal(post.author, g.author, `${g.id} author`)
    assert.equal(post.role, g.role, `${g.id} role`)
    assert.equal(post.typeLabel, g.typeLabel, `${g.id} typeLabel`)
    assert.equal(Boolean(post.body), g.hasBody, `${g.id} body presence`)
    assert.equal(post.respect, g.respect, `${g.id} respect`)
    assert.equal(post.commentCount, g.comment, `${g.id} comment count`)
    assert.equal(post.content.type, g.contentType, `${g.id} content type`)
    // milestone posts keep a real SH-1 share kind; the rest don't
    assert.equal(Boolean(post.shareType), g.shareable, `${g.id} shareable`)
    // every community post is sourced to the community context
    assert.equal(post.source.kind, 'community', `${g.id} source kind`)

    if (g.achievement) {
      // structured PersonalRecord (the real shape) + the display it must still format to
      assert.deepEqual(post.content.record.measure, g.achievement.measure, `${g.id} measure`)
      assert.equal(post.content.record.exercise, g.achievement.exercise, `${g.id} exercise`)
      assert.equal(post.content.label, g.achievement.label, `${g.id} label`)
      assert.equal(formatRecordValue(post.content.record.measure), g.achievement.display, `${g.id} display survives the swap`)
    }
    if (g.event) {
      assert.equal(post.content.month, g.event.month, `${g.id} event month`)
      assert.equal(post.content.day, g.event.day, `${g.id} event day`)
      assert.equal(post.content.title, g.event.title, `${g.id} event title`)
      assert.equal(post.content.when, g.event.when, `${g.id} event when`)
      assert.equal(post.content.going, g.event.going, `${g.id} event going`)
    }
    if (g.media) {
      assert.equal(post.content.mediaKind, g.media.mediaKind, `${g.id} media kind`)
      assert.equal(post.content.duration, g.media.duration, `${g.id} media duration`)
    }
    if (g.program) {
      assert.equal(post.content.programName, g.program.name, `${g.id} program name`)
      assert.equal(post.content.kindLabel, g.program.kindLabel, `${g.id} program kindLabel`)
      // real Phase-0 structured shape (no free meta string) — backend swap = data change
      assert.equal(post.content.durationWeeks, g.program.durationWeeks, `${g.id} durationWeeks`)
      assert.equal(post.content.frequencyPerWeek, g.program.frequencyPerWeek, `${g.id} frequencyPerWeek`)
      assert.equal(post.content.structure, g.program.structure, `${g.id} structure`)
      // the renderer's meta line is formatted from the structured fields
      assert.equal(formatProgramMeta(post.content), g.program.formatted, `${g.id} formatted meta`)
      assert.equal(post.content.saveLabel, g.program.saveLabel, `${g.id} program saveLabel`)
      assert.equal(post.content.footNote, g.program.footNote, `${g.id} program footNote`)
      assert.equal(post.content.savedNote, g.program.savedNote, `${g.id} program savedNote`)
      assert.equal(post.content.price, g.program.price, `${g.id} program price`)
    }
  }
})

test('tap-through consistency: every community feed post resolves via getPost(id)', () => {
  for (const post of getCommunityFeed()) {
    const resolved = getPost(post.id)
    assert.ok(resolved, `getPost('${post.id}') should resolve for feed↔detail consistency`)
    assert.equal(resolved.id, post.id)
  }
})

test('formatProgramMeta: structured fields → display line, absent parts omitted (never fabricated)', () => {
  // Powerbuilding II — the friend program that already carried numbers (no structure at source)
  assert.equal(formatProgramMeta({ durationWeeks: 12, frequencyPerWeek: 4 }), '12 weeks · 4 days/week')
  // fully structured
  assert.equal(formatProgramMeta({ durationWeeks: 8, frequencyPerWeek: 4, structure: 'upper_lower' }), '8 weeks · Upper / Lower · 4 days/week')
  // source omits days/week → omitted, not invented
  assert.equal(formatProgramMeta({ durationWeeks: 12, structure: 'ppl' }), '12 weeks · Push/Pull/Legs')
  assert.equal(formatProgramMeta({ structure: 'full_body' }), 'Full Body')
  assert.equal(formatProgramMeta({}), '')
})
