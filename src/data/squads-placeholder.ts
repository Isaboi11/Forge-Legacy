/**
 * ⚠️ PLACEHOLDER demo data for the Squads Hub (S-1) prototype — NOT real user data.
 *
 * There is NO social backend. Every squad, member, motto, member count and
 * "trained today" value below is fabricated demo content that exists only to
 * exercise the screen layout. Nothing here reflects a live roster, a real
 * group, or any real athlete's activity. Do not treat any of it as authoritative.
 *
 * Shape mirrors the design handoff "Squads Hub.dc.html" seed (most-recently-active
 * first; `iron` is the athlete's own squad). The current athlete surfaces as the
 * `isSelf` member of the owned squad — the screen renders that avatar from the
 * real profile (`getSelfProfile`), so only the co-athlete names here are invented.
 */

export type SquadMember = {
  id: string
  /** Placeholder co-athlete name (used for Avatar initials). Self is drawn from getSelfProfile. */
  name: string
  /** The logged-in athlete's own slot in the member stack. */
  isSelf?: boolean
}

export type Squad = {
  id: string
  name: string
  /** Short italic creed shown under the name. */
  motto: string
  /** true → renders the "YOUR SQUAD" label + owner emphasis. */
  owned: boolean
  /** Seed grouping — true starts the squad in the Favorites group (toggle is local UI state). */
  favorite: boolean
  /** Roster (length = member count). All placeholder except the isSelf slot. */
  members: SquadMember[]
  /** How many members "trained today" — 0..members.length. Drives the segment row. Demo only. */
  trainedToday: number
}

/** Placeholder squads. Demo content only — no backend, no real rosters. */
export const SQUADS_PLACEHOLDER: Squad[] = [
  {
    id: 'iron',
    name: 'Iron Vigil',
    motto: 'Hold the line, every dawn.',
    owned: true,
    favorite: true,
    members: [
      { id: 'iron-self', name: 'Ada Ridge', isSelf: true },
      { id: 'iron-1', name: 'Marcus Boone' },
      { id: 'iron-2', name: 'Dana Kwon' },
      { id: 'iron-3', name: 'Priya Sethi' },
      { id: 'iron-4', name: 'Leo Marsh' },
    ],
    trainedToday: 3,
  },
  {
    id: 'dawn',
    name: 'Dawn Patrol',
    motto: 'First light, before the world wakes.',
    owned: false,
    favorite: false,
    members: [
      { id: 'dawn-1', name: 'Nadia Cole' },
      { id: 'dawn-2', name: 'Theo Vance' },
      { id: 'dawn-3', name: 'Rae Okafor' },
      { id: 'dawn-4', name: 'Sam Idris' },
      { id: 'dawn-5', name: 'June Park' },
      { id: 'dawn-6', name: 'Ben Ashford' },
    ],
    trainedToday: 6,
  },
  {
    id: 'proving',
    name: 'The Proving',
    motto: 'Earn it. Every rep. Every day.',
    owned: false,
    favorite: false,
    members: [
      { id: 'proving-1', name: 'Kira Nash' },
      { id: 'proving-2', name: 'Omar Diaz' },
      { id: 'proving-3', name: 'Wren Holt' },
      { id: 'proving-4', name: 'Cass Lem' },
    ],
    trainedToday: 0,
  },
  {
    id: 'home',
    name: 'Home Forge',
    motto: 'Built here. Built together.',
    owned: false,
    favorite: false,
    members: [{ id: 'home-1', name: 'Iris Wong' }],
    trainedToday: 1,
  },
]

/** IDs seeded into the Favorites group (local toggle state starts from this). */
export const INITIAL_FAVORITE_IDS: string[] = SQUADS_PLACEHOLDER.filter((s) => s.favorite).map((s) => s.id)
