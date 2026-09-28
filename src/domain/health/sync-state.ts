/**
 * The small decisions around an Apple Health sync (Build 10 · Apple-Health-Build-Plan §3.3–3.5). Pure.
 *
 *   prefs      what this phone remembers per athlete — connected, write-back, the anchor, last checked
 *   syncDue    the §3.4 throttle: at most once every 10 minutes, unless the athlete tapped Check now
 *   review     the Review step's Keep / Skip answers → rows to add + ids to remember as skipped
 *   words      "Last checked 2 min ago"
 *
 * ══ ⚠ THE PREFS HOLD NO HEALTH DATA — AND `parsePrefs` IS WHAT KEEPS IT THAT WAY ══
 *
 * AsyncStorage is included in iCloud device backups, and HealthKit data must never reach iCloud (§7). The
 * blob holds four things: two booleans, the OPAQUE anchor HealthKit hands back, and the time of the last
 * check. `parsePrefs` rebuilds the object field by field, so anything else that ever lands in the stored
 * string — a sample, a date list — is dropped on the next read instead of being carried forward.
 */

import type { ImportCandidate, PossibleDuplicate } from './dedup.ts';

export interface HealthPrefs {
  connected: boolean;
  /** "Save Forge workouts to Apple Health" — on by default once connected (§2). */
  writeBack: boolean;
  /** HealthKit's opaque query anchor (base64). Null before the first import and after Disconnect. */
  anchor: string | null;
  /** ISO — the last time a sync ran to the end. */
  lastCheckedAt: string | null;
}

export const DEFAULT_PREFS: HealthPrefs = { connected: false, writeBack: true, anchor: null, lastCheckedAt: null };

/** Per athlete AND per device (§3.4) — a second account on the same phone starts disconnected. */
export const prefsKey = (uid: string): string => `fl_apple_health_v1:${uid}`;

/** An anchor is base64 of an archived HKQueryAnchor — a few hundred bytes. Anything huge is not one. */
const ANCHOR_MAX = 4096;

export function parsePrefs(raw: string | null | undefined): HealthPrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  let o: Record<string, unknown>;
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ...DEFAULT_PREFS };
    o = v as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_PREFS };
  }
  const anchor = typeof o.anchor === 'string' && o.anchor.length > 0 && o.anchor.length <= ANCHOR_MAX ? o.anchor : null;
  const checked = typeof o.lastCheckedAt === 'string' && Number.isFinite(Date.parse(o.lastCheckedAt)) ? o.lastCheckedAt : null;
  return {
    connected: o.connected === true,
    writeBack: o.writeBack !== false,
    anchor,
    lastCheckedAt: checked,
  };
}

export function serializePrefs(p: HealthPrefs): string {
  // Through `parsePrefs`' own field list, so the write side can't store more than the read side keeps.
  return JSON.stringify({ connected: p.connected, writeBack: p.writeBack, anchor: p.anchor, lastCheckedAt: p.lastCheckedAt });
}

// ── §3.4 throttle ────────────────────────────────────────────────────────────

export const SYNC_THROTTLE_MS = 10 * 60_000;

/** True when a foreground sync should run now. `force` is Check now. A future `lastCheckedAt` (clock skew) is due. */
export function syncDue(lastCheckedAt: string | null, nowMs: number, force = false): boolean {
  if (force || !lastCheckedAt) return true;
  const last = Date.parse(lastCheckedAt);
  if (!Number.isFinite(last) || last > nowMs) return true;
  return nowMs - last >= SYNC_THROTTLE_MS;
}

// ── windows ──────────────────────────────────────────────────────────────────

/** Decision 4: the first import reads 90 days. */
export const FIRST_PULL_DAYS = 90;

export const windowStartMs = (nowMs: number, days: number): number => nowMs - days * 86_400_000;

// ── the Review step ──────────────────────────────────────────────────────────

/**
 * The athlete's answers → what to send. Every possible duplicate starts at Skip (§5 rule 4, DEDUP §3.3); an
 * id in `keepIds` was switched to Keep. `skipIds` are written to the ledger as 'skipped', so a re-sync never
 * asks again.
 */
export function resolveReview(
  possibleDuplicates: readonly PossibleDuplicate[],
  keepIds: ReadonlySet<string>,
): { keep: ImportCandidate[]; skipIds: string[] } {
  const keep: ImportCandidate[] = [];
  const skipIds: string[] = [];
  for (const d of possibleDuplicates) {
    if (keepIds.has(d.row.externalId)) keep.push(d.row);
    else skipIds.push(d.row.externalId);
  }
  return { keep, skipIds };
}

// ── words ────────────────────────────────────────────────────────────────────

/** "Last checked just now" / "2 min ago" / "3 h ago" / "2 days ago"; "Not checked yet" before the first. */
export function lastCheckedLine(lastCheckedAt: string | null, nowMs: number): string {
  if (!lastCheckedAt) return 'Not checked yet';
  const ms = nowMs - Date.parse(lastCheckedAt);
  if (!Number.isFinite(ms)) return 'Not checked yet';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'Last checked just now';
  if (min < 60) return `Last checked ${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Last checked ${h} h ago`;
  const days = Math.floor(h / 24);
  return `Last checked ${days} day${days === 1 ? '' : 's'} ago`;
}

/** What a possible duplicate is shown with — why Forge is asking, in one short line. */
export function duplicateReasonLine(reason: PossibleDuplicate['reason']): string {
  switch (reason) {
    case 'matches_manual_log':
      return 'Looks like a workout you logged by hand that day';
    case 'overlaps_forge_other_type':
      return 'Happened during a workout you recorded in Forge';
    case 'same_effort_other_source':
      return 'Another app recorded the same workout';
    case 'overlaps_existing_import':
      return 'Overlaps a workout already imported';
  }
}
