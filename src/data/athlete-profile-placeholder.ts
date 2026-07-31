/**
 * Public profile VIEW — the shape of an athlete as seen from outside.
 *
 * ══ THIS IS NOW A TYPE, AND ONLY A TYPE ══
 *
 * It used to also export `getPublicProfile(name)`, which built the view from two fixtures: the fixture
 * self-identity (`getSelfProfile()` → "Ada Ridge") and the fixture squad roster (`findSquadAthlete`).
 * That was honest when it was written — there was no per-athlete profile store, and the function was
 * careful to OMIT what it didn't know rather than invent it.
 *
 * Migration 0069 built the real one. `/athlete/[id]` has read `fetchAthleteProfile` (real identity, real
 * rank, real shared squads, gated by `vis_clears()`) ever since, and nothing has called
 * `getPublicProfile` since that day — it simply stayed in the tree, and kept shipping a fictional
 * athlete's name into the bundle.
 *
 * `PublicProfileView` survives because `domain/profile/live.ts` imports it as the contract the real
 * fetch fulfils. The builder and its characterization test are gone.
 */

export interface PublicProfileView {
  /** Display name — the identifier every seam already carries. */
  name: string
  /** '@'-handle: the athlete's real handle when self, else derived from the name. */
  handle: string
  /** True when this is the signed-in athlete's own profile. */
  isSelf: boolean
  /** Public avatar image URL (present only when known); null → render initials. */
  avatarUrl?: string | null
  /** Public identity marker (design hero RankMarker) — present only when known. */
  rank?: string
  /** Public identity marker (design hero identity sub) — present only when known. */
  athleteType?: string
}
