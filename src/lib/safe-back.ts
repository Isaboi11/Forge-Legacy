/**
 * ══ A BACK ARROW THAT ALWAYS GOES SOMEWHERE (QA 09-26, B1) ══
 *
 * `router.back()` does NOTHING when there is no history — a refreshed web page, a shared link, a push
 * notification opened on a phone. About two dozen screens (Honors, Goals, Chapter, the nine nutrition
 * sub-screens, the program builder's X, a squad post after Delete, the composer after Post…) had a back
 * arrow that simply didn't respond in that state, and the composer's "stays open" let a second tap post
 * twice.
 *
 * The working pattern already existed in one screen (`competitions.tsx`: `canGoBack() ? back() :
 * replace(parent)`). Rather than hand-edit 170 call sites, it is installed ONCE on expo-router's
 * imperative `router` — the same object `useRouter()` returns — so every `router.back()` in the app,
 * `AppBar`'s `onBack` included, falls back to the screen's parent when there is nothing to go back to.
 *
 * Pure and dependency-free so `node --test` can load it (see `__tests__/safe-back.test.mjs`).
 */

/** The parent each screen falls back to, by first path segment. Anything unlisted goes Home. */
const PARENT_BY_SEGMENT: Record<string, string> = {}

function parent(to: string, segments: string[]) {
  for (const s of segments) PARENT_BY_SEGMENT[s] = to
}

parent('/nutrition', [
  'food-detail', 'meal-detail', 'log-food', 'nutrition-details', 'grocery-list', 'recipe', 'my-foods',
  'nutrition-targets', 'meal-plan', 'meal-plan-setup', 'create-food', 'my-recipes', 'scan-label', 'meal-photo',
])
parent('/squads', [
  'squad', 'squad-post', 'squad-composer', 'squad-settings', 'squad-invite', 'squad-transfer', 'squad-preview',
  'squad-requests', 'squad-recap', 'squad-records', 'discover-squads', 'create-squad', 'join-squad',
  'competitions', 'create-challenge', 'challenge', 'challenge-results', 'podium', 'hall-of-champions',
  'current-champions', 'competition-history', 'friends', 'add-friend', 'athlete', 'community', 'post',
  'workout-write',
])
parent('/legacy', [
  'chapter', 'goals', 'legacy-timeline', 'accomplishments', 'photos', 'add-photo', 'transformation',
  'transformation-add', 'transformation-compare', 'pin-video', 'trophy-case', 'weekly-review',
  'progress-photo-post',
])
parent('/workouts', [
  'program', 'programs', 'program-catalog', 'program-builder', 'program-guided', 'program-import',
  'program-share', 'send-program', 'template', 'templates', 'starter-template', 'week-template',
  'forge-templates', 'exercise', 'exercise-library', 'custom-exercise', 'exercise-picker', 'workout-builder',
  'home-gym', 'form-history', 'form-check',
])
parent('/activity-history', ['activity'])

/** Where "back" goes when there is no history. Never the path itself. */
export function backFallbackFor(pathname: string | null | undefined): string {
  const segs = String(pathname ?? '').split(/[?#]/)[0].split('/').filter(Boolean)
  if (segs.length === 0) return '/'
  // A screen nested under a squad (`/squad/<id>/goal`) belongs to that squad.
  if (segs[0] === 'squad' && segs.length > 2) return `/squad/${segs[1]}`
  const to = PARENT_BY_SEGMENT[segs[0]] ?? '/'
  return to
}

export interface BackRouter {
  back: () => void
  canGoBack: () => boolean
  replace: (href: never) => void
}

let lastPath: string | null = null

/** Fed by the root route tracker on every navigation — the native half of "where am I now". */
export function noteBackPath(path: string | null | undefined): void {
  if (typeof path === 'string') lastPath = path
}

function currentPath(): string | null {
  const loc = (globalThis as { location?: { pathname?: string } }).location
  return lastPath ?? (typeof loc?.pathname === 'string' ? loc.pathname : null)
}

const INSTALLED = Symbol.for('forge.safeBack')

/**
 * Wraps `router.back` in place. Idempotent (fast refresh re-evaluates the layout). A throw from
 * `canGoBack` — navigation not mounted yet — is treated as "no history".
 */
export function installSafeBack(router: BackRouter, pathOf: () => string | null = currentPath): void {
  const r = router as BackRouter & { [INSTALLED]?: true }
  if (r[INSTALLED]) return
  const original = router.back.bind(router)
  r.back = () => {
    let can = false
    try {
      can = router.canGoBack()
    } catch {
      can = false
    }
    if (can) return original()
    const here = pathOf()
    const to = backFallbackFor(here)
    const herePath = String(here ?? '').split(/[?#]/)[0].replace(/\/+$/, '') || '/'
    if (to === herePath) return
    router.replace(to as never)
  }
  r[INSTALLED] = true
}
