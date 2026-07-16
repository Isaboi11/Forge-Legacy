/**
 * Public profile VIEW — the honest, cross-context view of an athlete for the /athlete/[id] surface.
 *
 * DATA REALITY: the app has no per-athlete profile store. The only inputs that authoritatively exist
 * are (a) the athlete's NAME (feed authors + squad rosters are all keyed by name), (b) the self
 * identity (getSelfProfile), and (c) the public identity markers rank + athleteType, authored only
 * for the athletes in the squad rosters. So this view is deliberately THIN — identity always,
 * rank/athleteType when known, and nothing else. Every rich Legacy section in the design (chapters,
 * honors, stats, accomplishments, transformation) has no data source and is OMITTED, not fabricated;
 * surfacing them would mean inventing a per-athlete dataset (a separate, PO-scoped unit — "Path 2").
 *
 * The squad-scoped fields accolades + `since` are intentionally excluded upstream (findSquadAthlete),
 * so squad-internal detail never leaks onto this cross-context public surface.
 */
// Relative .ts value imports (not the @/ alias): this module is loaded by node --test, where the
// @/ alias does not resolve; Metro + tsc accept explicit .ts extensions (allowImportingTsExtensions).
import { getSelfProfile } from '../domain/profile/placeholder-data.ts'
import { findSquadAthlete } from './squad-feed-placeholder.ts'

export interface PublicProfileView {
  /** Display name — the identifier every seam already carries. */
  name: string
  /** '@'-handle: the athlete's real handle when self, else derived from the name. */
  handle: string
  /** True when this is the signed-in athlete's own profile. */
  isSelf: boolean
  /** Public avatar image URL (present only when known — self today); null → render initials. */
  avatarUrl?: string | null
  /** Public identity marker (design hero RankMarker) — present only for a known roster athlete. */
  rank?: string
  /** Public identity marker (design hero identity sub) — present only for a known roster athlete. */
  athleteType?: string
}

/** Derive an '@'-handle from a display name (design parity: lowercase, strip non-alphanumerics). */
function handleFromName(name: string): string {
  return '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * The honest public profile for an athlete identified by name (the key every seam carries). Any name
 * resolves to a valid identity view — an unknown/feed-only author simply carries no rank/athleteType.
 */
export function getPublicProfile(name: string): PublicProfileView {
  const trimmed = name.trim()
  const self = getSelfProfile()
  const isSelf = trimmed === self.name

  const squad = findSquadAthlete(trimmed)
  const view: PublicProfileView = {
    name: trimmed,
    handle: isSelf ? '@' + self.handle : handleFromName(trimmed),
    isSelf,
  }
  // Absent markers are OMITTED (key never set), never filled with a placeholder value.
  if (squad?.rank) view.rank = squad.rank
  if (squad?.athleteType) view.athleteType = squad.athleteType
  return view
}
