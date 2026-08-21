/**
 * The trail that turns "it crashed" into "here is the line, and here is what they did to get there".
 *
 * ══ WHY THIS EXISTS ══
 *
 * PO, 2026-08-21: *"sometimes we're guessing at what the error is … catch the exact path they're going
 * in instead of having to ask them."*
 *
 * That is not a hypothetical. `Forge-Legacy-Master-Status.md` records a week spent on "the app is
 * frozen", diagnosed WRONG TWICE (a missing `profiles` row, then an RLS block) before the real cause —
 * the last line of `routeFor` — was found. TestFlight showed **Crashes: –** the whole time, because
 * nothing crashed: three controls silently did nothing. No stack trace existed to collect.
 *
 * What would have identified it in one reading is a sequence:
 *
 *     route /sign-in → action sign_in_submitted → route /onboarding → action onboarding_continue
 *     → route /onboarding → action onboarding_continue → route /onboarding
 *
 * Nobody has to guess at that. It is the bug, written down.
 *
 * ══ PURE ON PURPOSE ══
 *
 * No imports, no clock of its own, no storage, no React. Every function here is total: same input, same
 * output, never throws. The ring buffer is passed in and a new one comes back. That is what lets
 * `__tests__/breadcrumb-core.test.mjs` prove the redaction rules rather than trusting them, and it is why
 * the fingerprint is a hand-rolled hash instead of `crypto` — this module has to run identically on
 * Hermes, on the web, and under `node --test`.
 *
 * ══ ⚠ THE REDACTION RULE IS THE SAME PROMISE `props-core.ts` KEEPS ══
 *
 * PO decision, 2026-08-21: a trail records **route + action + ids**, and nothing the athlete typed.
 * `Docs/Legal/Privacy-Policy.md` § 2 already promises a usage record never contains anything they wrote
 * or lifted, and a diagnostic trail sitting in the same database under a weaker rule would make that
 * sentence false by the back door.
 *
 * So: labels are enum-shaped (`lower_snake_case`), ids are shape-reduced to `[id]`, and any value with
 * whitespace in the middle is treated as prose and dropped. Same test as `props-core.looksLikeProse`,
 * for the same reason.
 *
 * ⛔ An error MESSAGE is the deliberate exception, and only inside `normalizeMessage`. "Cannot read
 *    property 'name' of undefined" is the payload — redacting it leaves a timestamp attached to nothing,
 *    which is the mistake `0167` names in its own header about `feedback.body`. Messages are normalised
 *    (ids and numbers reduced) so identical faults GROUP, not so they are hidden.
 */

// ── shape ────────────────────────────────────────────────────────────────────

/**
 * What a crumb can be. Kept to four because a vocabulary a caller can invent is a vocabulary that
 * drifts, and the operator reading these needs the list to mean something a year from now.
 *
 *   `route`   a screen opened — the spine of the trail
 *   `action`  something the athlete did that the app already reports (every `track()` call)
 *   `net`     a request that FAILED. Successes are not crumbs; a trail of 200s is noise
 *   `state`   an app-level transition — backgrounded, signed out, session restored
 */
export type CrumbType = 'route' | 'action' | 'net' | 'state';

export interface Crumb {
  /** Device clock, epoch ms. Trustworthy ONLY for ordering within one session — the 0131 rule. */
  t: number;
  type: CrumbType;
  /** Enum-shaped. `screen_view`, `sign_in_submitted`, `rpc_failed`. Never prose. */
  label: string;
  /** Optional, also enum-shaped: a route shape, an error code, an id already reduced to `[id]`. */
  detail?: string;
  /**
   * How many times this crumb repeated back-to-back. Absent means once.
   *
   * Written only by `pushCrumb`'s collapse. `route:/onboarding ×214` is the shape a redirect loop makes,
   * and it is the single most legible thing this format can say.
   */
  n?: number;
}

/**
 * How many crumbs a report carries.
 *
 * 40 is roughly two minutes of ordinary use and comfortably inside the 8 KB column budget the migration
 * sets. The failure it has to survive is a render loop firing hundreds of crumbs a second — see
 * `pushCrumb`, which collapses repeats rather than letting them eat the window that holds the cause.
 */
export const MAX_CRUMBS = 40;

/** A label or detail longer than this is truncated. Enums and route shapes are far shorter. */
export const MAX_LABEL = 80;

// ── sanitising ───────────────────────────────────────────────────────────────

/**
 * Whitespace in the middle means somebody passed a sentence. Same test, same reason, as
 * `props-core.looksLikeProse` — it is the one check that catches an allowed FIELD handed a
 * disallowed VALUE.
 */
function looksLikeProse(v: string): boolean {
  return /\s/.test(v.trim());
}

/**
 * A path reduced to its SHAPE: `/squad/9f3c-…` → `/squad/[id]`.
 *
 * Deliberately a copy of `props-core.sanitizeScreen`'s rules rather than an import of it. This module is
 * loaded by the global error handler, which has to work when the analytics module is disabled, absent,
 * or itself the thing that threw. A diagnostic that depends on the subsystem it might be reporting on is
 * a diagnostic that goes quiet exactly when it matters.
 */
export function crumbRoute(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const path = raw.split('?')[0].split('#')[0].trim();
  if (!path) return null;

  const shaped = path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return '[id]';
      if (/^[0-9a-f]{16,}$/i.test(seg)) return '[id]';
      if (/^\d+$/.test(seg)) return '[id]';
      return seg;
    })
    .join('/');

  return shaped.slice(0, MAX_LABEL) || null;
}

/** Labels follow the event-name discipline: lower_snake_case, bounded, no prose. */
export function crumbLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const k = raw.trim().toLowerCase();
  if (!k || k.length > MAX_LABEL) return null;
  return /^[a-z][a-z0-9_.:/[\]-]*$/.test(k) ? k : null;
}

/**
 * A detail is an id, a code, or an already-shaped route — never a sentence.
 *
 * Anything with interior whitespace is dropped rather than truncated: half a sentence is still the
 * athlete's words, and a crumb is just as useful without it.
 */
export function crumbDetail(raw: unknown): string | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (looksLikeProse(trimmed)) return undefined;
  return trimmed.slice(0, MAX_LABEL);
}

// ── the ring ─────────────────────────────────────────────────────────────────

/**
 * Append one crumb, capped, with consecutive duplicates COLLAPSED.
 *
 * ══ ⚠ WHY THE COLLAPSE IS LOAD-BEARING, NOT A TIDINESS ══
 *
 * The failure this system most needs to survive is a render loop — a screen that throws, remounts,
 * throws again, hundreds of times a second. Without collapsing, the 40-crumb window fills with the
 * SYMPTOM in a few milliseconds and pushes out the cause, so every report of the worst class of bug
 * arrives with its evidence already overwritten.
 *
 * Collapsing keeps one entry and counts it. `route:/onboarding ×214` is also a far better description of
 * a redirect loop than 214 identical lines, which is the same thing said usefully.
 *
 * Returns a NEW array. The caller owns the buffer; nothing here mutates anything it was handed.
 */
export function pushCrumb(buffer: readonly Crumb[], next: Crumb): Crumb[] {
  const last = buffer.length > 0 ? buffer[buffer.length - 1] : null;

  if (last && last.type === next.type && last.label === next.label && last.detail === next.detail) {
    // `t` moves to the LATEST occurrence, so the gap to the error is honest — a loop that ran for two
    // minutes and one that ran for two milliseconds are different bugs.
    const collapsed: Crumb = { ...last, t: next.t, n: (last.n ?? 1) + 1 };
    return [...buffer.slice(0, -1), collapsed];
  }

  const out = [...buffer, next];
  // Drop the OLDEST beyond the cap — the `analytics.track` rule, for the same reason: an unbounded
  // buffer is a memory leak wearing a feature's clothes.
  return out.length > MAX_CRUMBS ? out.slice(out.length - MAX_CRUMBS) : out;
}

/**
 * Build a crumb, or return null if nothing survived sanitising.
 *
 * Returning null rather than a placeholder is deliberate: a crumb reading `action:[dropped]` costs a slot
 * in a 40-entry window and tells the reader nothing.
 */
export function makeCrumb(type: CrumbType, label: unknown, detail?: unknown, now = 0): Crumb | null {
  const l = type === 'route' ? crumbRoute(label) : crumbLabel(label);
  if (!l) return null;
  const d = crumbDetail(detail);
  return d === undefined ? { t: now, type, label: l } : { t: now, type, label: l, detail: d };
}

// ── grouping ─────────────────────────────────────────────────────────────────

/**
 * An error message with the VARIABLE parts removed, so two reports of one bug are one row.
 *
 * `Cannot read property 'name' of undefined` is the fault. `row 4f3c-… not found` and `row 91ab-… not
 * found` are ONE fault reported twice, and an operator scrolling a list needs them stacked, not
 * interleaved with the other forty. Without this the dashboard is a firehose and gets ignored, which is
 * the failure mode that makes error tracking worthless in practice.
 *
 * ⚠ NORMALISED FOR GROUPING ONLY. The original message is stored verbatim alongside it. This is not
 *   redaction and must never be relied on as redaction — see the header.
 */
export function normalizeMessage(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    .replace(/\b0x[0-9a-f]+\b/gi, '[hex]')
    .replace(/\b[0-9a-f]{16,}\b/gi, '[id]')
    // A bare number is an index, a count, a status or a timestamp — never the identity of the bug.
    .replace(/\b\d+\b/g, '[n]')
    // Absolute paths and URLs differ per device and per deploy; the file name is the part that groups.
    .replace(/\b(?:https?|file):\/\/\S+/gi, '[url]')
    .slice(0, 300);
}

/**
 * The first stack frame worth naming — the app's own code, not the framework's.
 *
 * A React error's top frames are almost always `react-native/…`, `expo-router/…` or `node_modules/…`,
 * which are the same for every bug and therefore group nothing. The first frame under `src/` is the line
 * an operator would actually open.
 */
export function topFrame(stack: unknown): string {
  if (typeof stack !== 'string' || !stack) return '';
  const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);

  const own = lines.find((l) => /(?:\/|\\)?src[/\\]/.test(l) && !/node_modules/.test(l));
  const first = own ?? lines.find((l) => /^at\s|@/.test(l)) ?? '';

  return first
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    // Column numbers move on every bundle; line numbers are stable enough to group by and useful to read.
    .replace(/:(\d+):(\d+)/, ':$1')
    .slice(0, 200);
}

/**
 * FNV-1a, 32-bit, hex. Not a security hash and not trying to be — it groups rows.
 *
 * Hand-rolled because `crypto.subtle` is async, `crypto.randomUUID` is not a digest, and Hermes ships
 * neither `crypto.createHash` nor a stable alternative. A pure function that behaves the same on the
 * phone, the browser and in `node --test` is worth more here than a stronger digest.
 */
export function hash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    // ×16777619 in 32-bit, via shifts, because Math.imul is the only way to keep this exact in JS.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The grouping key: which BUG this is, independent of who hit it and when.
 *
 * Name + normalised message + the app's own top frame. Deliberately NOT the whole stack — a stack varies
 * with the path taken to the fault, and grouping on it would give one row per caller, which is the
 * firehose again.
 */
export function fingerprintError(name: unknown, message: unknown, stack: unknown): string {
  const n = typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : 'Error';
  return hash32(`${n}|${normalizeMessage(message)}|${topFrame(stack)}`);
}

// ── bounds ───────────────────────────────────────────────────────────────────

/** The column caps, mirrored from `0176_client_errors.sql`. Trim here so the insert never bounces. */
export const MAX_MESSAGE = 2000;
export const MAX_STACK = 8000;

/**
 * A stack, bounded and stripped of the absolute paths that differ per machine.
 *
 * Keeps the HEAD, not the tail: the frames nearest the throw are the ones that identify it, and a stack
 * long enough to need trimming is long enough that its bottom is framework noise.
 */
export function sanitizeStack(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw
    .replace(/\b(?:https?|file):\/\/[^\s)]*?(?=(?:src|node_modules)[/\\])/gi, '')
    .trim();
  return s ? s.slice(0, MAX_STACK) : null;
}

/** An error's message, verbatim but bounded. See the header for why this one is not redacted. */
export function sanitizeMessage(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw);
  return s.slice(0, MAX_MESSAGE) || 'Unknown error';
}

/**
 * The error class — `TypeError`, `AbortError`, a PostgREST code.
 *
 * Bounded and enum-checked, because this is the column an operator groups and filters on, and one row
 * carrying a sentence here would make the filter list unreadable.
 */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Error';
  const n = raw.trim();
  if (!n || looksLikeProse(n)) return 'Error';
  return n.slice(0, 60);
}
