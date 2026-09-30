/**
 * ══ ONE SENTENCE FOR ANYTHING THAT WENT WRONG (QA 09-26, B4) ══
 *
 * Screens used to print whatever was thrown: `invalid input syntax for type uuid: "abc" (22P02)`,
 * `new row violates row-level security policy… (42501)`, a JS stack line when Start Program failed on a
 * bad connection. None of that is a sentence for an athlete, and some of it names tables.
 *
 * `plainError` is the ONE mapper. `useQuery.errorMessage` — which every toast and every screen's
 * `error` string already goes through — returns it, so a database message cannot reach the screen from
 * any of those call sites.
 *
 * The rule:
 *   · a Postgres / PostgREST CODE decides the sentence — the server's message is never shown;
 *   · a failed request (no network, timed out, server function not answering) gets its own sentence;
 *   · a message the APP wrote itself (`throw new Error('This squad is full.')`, and the refusals our
 *     own SQL raises with `raise exception`, P0001) is kept — those ARE sentences for the athlete —
 *     unless it reads like a machine wrote it, in which case it gets the generic line.
 *
 * Pure and dependency-free so `node --test` can load it (see `__tests__/plain-error.test.mjs`).
 */

export type ErrorKind = 'network' | 'not-found' | 'forbidden' | 'signed-out' | 'unavailable' | 'conflict' | 'invalid' | 'other'

export const PLAIN = {
  network: 'Couldn’t connect. Check your connection and try again.',
  notFound: 'That isn’t available. It may have been removed, or the link is wrong.',
  forbidden: 'You don’t have access to that.',
  signedOut: 'You’ve been signed out. Sign in again to continue.',
  unavailable: 'That isn’t switched on yet. Try again later.',
  conflict: 'That already exists.',
  invalid: 'Something in that wasn’t valid. Check it and try again.',
  other: 'Something went wrong. Try again.',
} as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A route param that can be sent to a `uuid` column. Anything else is a broken link, not a query. */
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v)
}

/** A calendar day as the app writes it (`YYYY-MM-DD`) that is also a real date. */
export function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (mo < 1 || mo > 12 || d < 1) return false
  return d <= new Date(y, mo, 0).getDate()
}

interface Thrown {
  code?: unknown
  message?: unknown
  name?: unknown
  status?: unknown
  statusCode?: unknown
  context?: { status?: unknown } | null
}

const asThrown = (e: unknown): Thrown | null => (e && typeof e === 'object' ? (e as Thrown) : null)

/** A Postgres SQLSTATE (`22P02`) or a PostgREST code (`PGRST116`) — not an auth code like `weak_password`. */
const dbCode = (t: Thrown | null): string | null => {
  const c = typeof t?.code === 'string' ? t.code : null
  return c && (/^[0-9A-Z]{5}$/.test(c) || /^PGRST\d+$/.test(c)) ? c : null
}

const NETWORK = /failed to fetch|network request failed|networkerror|load failed|timed? ?out|aborted|failed to send a request|offline|econn|enotfound/i

/** Words no hand-written sentence in this app contains, and every machine-written one does. */
const MACHINE =
  /\bundefined\b|\bnull\b|is not a function|cannot read|not iterable|unexpected token|\bjson\b|syntax|relation |column |violates|constraint|uuid|invalid input|duplicate key|pgrst|sqlstate|non-2xx|edge function|\bat \S+ \(|[{}<>]|https?:\/\//i

/** Did a person write this for a person? Short, starts like a sentence, and has no machine words in it. */
function reads(message: unknown): message is string {
  if (typeof message !== 'string') return false
  const m = message.trim()
  return m.length > 0 && m.length <= 220 && !m.includes('\n') && !MACHINE.test(m)
}

/** `no pending request from that athlete` → `No pending request from that athlete.` */
function asSentence(message: string): string {
  const m = message.trim()
  const head = m.charAt(0).toUpperCase() + m.slice(1)
  return /[.!?…”"’)]$/.test(head) ? head : `${head}.`
}

const httpStatus = (t: Thrown | null): number | null => {
  const s = t?.status ?? t?.statusCode ?? t?.context?.status
  const n = typeof s === 'string' ? Number(s) : s
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** What KIND of failure this is — so a screen can say "not found" rather than "check your connection". */
export function errorKind(e: unknown): ErrorKind {
  const t = asThrown(e)
  const code = dbCode(t)
  if (code) {
    if (code === '22P02' || code === 'PGRST116' || code === '22007' || code === '22008' || code === '22003') return 'not-found'
    if (code === '42501') return 'forbidden'
    if (code === 'PGRST301' || code === 'PGRST302' || code === 'PGRST303') return 'signed-out'
    if (code === 'PGRST202' || code === 'PGRST204' || code === 'PGRST205' || code === '42883' || code === '42P01' || code === '42703') return 'unavailable'
    if (code === '23505') return 'conflict'
    if (code === '23502' || code === '23503' || code === '23514' || code.startsWith('22')) return 'invalid'
    if (code === '57014' || code.startsWith('08') || code.startsWith('53')) return 'network'
    return 'other'
  }
  const message = typeof e === 'string' ? e : typeof t?.message === 'string' ? t.message : ''
  const name = typeof t?.name === 'string' ? t.name : ''
  if (name === 'AbortError' || name === 'FunctionsFetchError' || NETWORK.test(message)) return 'network'
  const status = httpStatus(t)
  if (status === 401) return 'signed-out'
  if (status === 403) return 'forbidden'
  // A server function that is not deployed answers 404 — "not switched on", never "check your connection".
  if (status === 404 && (name === 'FunctionsHttpError' || name === 'FunctionsRelayError')) return 'unavailable'
  if (status === 404) return 'not-found'
  if (status != null && status >= 500) return 'network'
  return 'other'
}

const BY_KIND: Record<ErrorKind, string> = {
  network: PLAIN.network,
  'not-found': PLAIN.notFound,
  forbidden: PLAIN.forbidden,
  'signed-out': PLAIN.signedOut,
  unavailable: PLAIN.unavailable,
  conflict: PLAIN.conflict,
  invalid: PLAIN.invalid,
  other: PLAIN.other,
}

/**
 * The sentence to show. Never a database message, never a stack line, never `[object Object]`.
 * `fallback` replaces the generic line when the caller knows what was being attempted
 * ("Couldn’t save your reflection.").
 */
export function plainError(e: unknown, fallback: string = PLAIN.other): string {
  const t = asThrown(e)
  const code = dbCode(t)
  // Our own SQL refuses with `raise exception '…'` (P0001): that text was written for the athlete.
  if (code === 'P0001') return reads(t?.message) ? asSentence(t.message) : fallback
  const kind = errorKind(e)
  if (code) return kind === 'other' ? fallback : BY_KIND[kind]
  if (kind === 'network') return PLAIN.network
  const message = typeof e === 'string' ? e : t?.message
  // Thrown by the app itself (or by sign-in: "Invalid login credentials") — already a sentence.
  if (reads(message)) return asSentence(message)
  return kind === 'other' ? fallback : BY_KIND[kind]
}
