/**
 * The App Store page: which state it is in, what the last sync said, and its one-line note.
 *
 * Pure and dependency-free so `node --test` runs it directly. The sync message is written by the
 * `asc-sync` Edge Function in one of three shapes, and this is the one place that reads it:
 *   "not configured: missing ASC_KEY_ID, ASC_ISSUER_ID[ · rating: …]"
 *   "failed: sales: … · reviews: …"
 *   "days 14 · downloads 38 · reviews 3"
 */

export type AscState = 'connected' | 'partial' | 'notConnected';

export interface SyncParts {
  /** Secret names the function said were missing. */
  missing: string[];
  /** Stages that failed, in order: 'sales', 'reviews', 'rating', 'key'. */
  failed: { part: string; text: string }[];
}

export function parseSyncMessage(message: string | null | undefined): SyncParts {
  const out: SyncParts = { missing: [], failed: [] };
  if (!message) return out;
  let rest = message.trim();
  const nc = /^not configured: missing ([^·]+)/.exec(rest);
  if (nc) {
    out.missing = nc[1].split(',').map((s) => s.trim()).filter(Boolean);
    rest = rest.slice(nc[0].length);
  } else if (rest.startsWith('failed:')) {
    rest = rest.slice('failed:'.length);
  } else {
    return out;
  }
  for (const chunk of rest.split(/\s*·\s*/)) {
    const m = /^\s*(sales|reviews|rating|key):\s*(.*)$/.exec(chunk);
    if (m) out.failed.push({ part: m[1], text: m[2].trim() });
  }
  return out;
}

/**
 * Not connected until a sync has run with every secret present. A sync that ran with the key but had a
 * stage fail is "partial" — what did load is still on the page.
 */
export function ascState(lastSync: { ok: boolean; message: string | null } | null): AscState {
  if (!lastSync) return 'notConnected';
  const p = parseSyncMessage(lastSync.message);
  if (p.missing.length) return 'notConnected';
  if (!lastSync.ok) return 'partial';
  return 'connected';
}

export interface AppStoreNoteInput {
  state: AscState;
  /** "30 days" / "year". */
  period: string;
  days: number;
  downloads: number;
  /** Public rating average; null before launch. */
  rating: number | null;
  /** Newest first. */
  reviewStars: number[];
  failedParts: string[];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const list = (a: string[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

export function appStoreNote(i: AppStoreNoteInput): string {
  if (i.state === 'notConnected') {
    return 'I can’t reach Apple yet. Once the key below is in place, downloads and reviews will fill in on the next sync.';
  }
  const parts: string[] = [];
  if (i.state === 'partial' && i.failedParts.length) {
    parts.push(`The last sync couldn’t load ${list(i.failedParts)}, so ${plural(i.failedParts.length, 'that part is', 'those parts are')} from the last sync that worked.`);
  }
  if (i.rating == null) parts.push('There’s no public rating yet.');
  if (i.downloads > 0) {
    const perDay = i.downloads / Math.max(1, i.days);
    parts.push(
      perDay >= 1
        ? `About ${Math.round(perDay)} ${plural(Math.round(perDay), 'download', 'downloads')} a day over the last ${i.period}.`
        : `${i.downloads} ${plural(i.downloads, 'download', 'downloads')} over the last ${i.period}.`,
    );
  } else {
    parts.push(`No downloads recorded in the last ${i.period}.`);
  }
  const recent = i.reviewStars.slice(0, 3);
  if (recent.length >= 2 && recent.every((s) => s >= 4)) parts.push(`The last ${recent.length} reviews are all 4 or 5 stars.`);
  else if (recent.length) parts.push(`The newest review is ${recent[0]} ${plural(recent[0], 'star', 'stars')}.`);
  return parts.slice(0, 2).join(' ');
}
