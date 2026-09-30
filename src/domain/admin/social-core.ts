/**
 * The CRM's Social section (migration 0247, `Admin-Analytics-Amendment-003-Social.md`) — the arithmetic
 * behind Numbers, Content and Playbook.
 *
 * ══ ONE RECORD: THE VIDEO, ONE POSTING PER PLATFORM (AA-D23) ══
 *
 * `admin_social_media()` returns every row once. Everything a page shows — the pipeline, the calendar,
 * top videos, "what is working" — is derived here from those rows, so two pages can never disagree
 * about a number and a platform chip is a filter, not a second query.
 *
 * ══ A FIGURE WITH NOTHING BEHIND IT IS `null`, NEVER 0 ══
 *
 * TikTok shares no watch time; an account connected yesterday has no "30 days ago". Each of those comes
 * back as `null` and the page prints "—". A zero would be a confident, specific, false claim.
 *
 * Pure and dependency-free (no `@/` imports) so `node --test` runs it directly.
 */

export type Platform = 'tiktok' | 'instagram';
export type PlatformFilter = Platform | 'all';

export const PLATFORMS: { key: Platform; label: string; short: string }[] = [
  { key: 'tiktok', label: 'TikTok', short: 'TT' },
  { key: 'instagram', label: 'Instagram', short: 'IG' },
];

export const platformLabel = (p: Platform | null | undefined): string => PLATFORMS.find((x) => x.key === p)?.label ?? '—';
export const platformShort = (p: Platform): string => PLATFORMS.find((x) => x.key === p)?.short ?? p;
const keysOf = (f: PlatformFilter): Platform[] => (f === 'all' ? PLATFORMS.map((p) => p.key) : [f]);

export type Stage = 'idea' | 'scripted' | 'filmed' | 'scheduled' | 'posted' | 'dropped';

/** The pipeline, in order. `dropped` is off the pipeline on purpose: it is where an idea goes to stop. */
export const STAGES: { key: Exclude<Stage, 'dropped'>; label: string; one: string }[] = [
  { key: 'idea', label: 'Ideas', one: 'Idea' },
  { key: 'scripted', label: 'Scripted', one: 'Scripted' },
  { key: 'filmed', label: 'Filmed', one: 'Filmed' },
  { key: 'scheduled', label: 'Scheduled', one: 'Scheduled' },
  { key: 'posted', label: 'Posted', one: 'Posted' },
];

export const stageLabel = (s: Stage): string => (s === 'dropped' ? 'Dropped' : (STAGES.find((x) => x.key === s)?.one ?? s));

/** What the panel's main button does next. `posted` has no next stage. */
export function nextStage(s: Stage): { to: Stage; label: string } | null {
  switch (s) {
    case 'idea':
      return { to: 'scripted', label: 'Mark scripted' };
    case 'scripted':
      return { to: 'filmed', label: 'Mark filmed' };
    case 'filmed':
      return { to: 'scheduled', label: 'Mark scheduled' };
    case 'scheduled':
      return { to: 'posted', label: 'Mark posted' };
    default:
      return null;
  }
}

export type Verdict = 'keep' | 'retest' | 'kill';
export type TagKind = 'topic' | 'hook' | 'format';

// ── The payload (`admin_social_media`, snake_case as the SQL returns it) ───────────────────────────

export interface SocialAccount {
  platform: Platform;
  /** The account's public @name on the platform. (`username`, not `handle`: the leak check reserves that key for athletes.) */
  username: string | null;
  connected: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  last_sync_ok: boolean | null;
  last_sync_message: string | null;
}

export interface AccountDay {
  platform: Platform;
  day: string;
  followers: number | null;
  reach: number | null;
  profile_views: number | null;
  link_taps: number | null;
  source: 'sync' | 'typed';
}

export interface SocialVideo {
  id: string;
  title: string;
  topic: string | null;
  hook: string | null;
  format: string | null;
  length_s: number | null;
  stage: Stage;
  first_line: string | null;
  notes: string | null;
  lesson_tried: string | null;
  lesson_result: string | null;
  verdict: Verdict | null;
  planned: Platform[];
  imported_from: Platform | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPosting {
  id: string;
  video_id: string;
  platform: Platform;
  scheduled_for: string | null;
  posted_at: string | null;
  /** `posted_at` as a day in the dashboard's timezone. */
  posted_day: string | null;
  /** The sync has matched it to a real post on the platform. */
  linked: boolean;
  url: string | null;
  caption: string | null;
  duration_s: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  avg_watch_s: number | null;
  watch_pct_typed: number | null;
  synced_at: string | null;
  typed_at: string | null;
}

export interface SocialGoal {
  platform: Platform;
  posts_per_week: number;
  follower_target: number | null;
  target_date: string | null;
}

export interface SocialIncome {
  id: string;
  platform: Platform;
  what: string;
  amount_usd: number;
  day: string;
}

export interface SocialQuestion {
  id: string;
  question: string;
  platform: Platform | null;
  times: number;
  video_id: string | null;
  created_at: string;
}

export interface SocialRival {
  id: string;
  who: string;
  what: string;
  why: string | null;
  url: string | null;
  noted_on: string;
}

export interface SocialRule {
  id: string;
  body: string;
  sort: number;
}

export interface SocialData {
  /** The social-sync function has reported in at least once (it is deployed and an admin has called it). */
  sync_ready: boolean;
  accounts: SocialAccount[];
  daily: AccountDay[];
  videos: SocialVideo[];
  postings: SocialPosting[];
  tags: { kind: TagKind; label: string; sort: number }[];
  goals: SocialGoal[];
  income: SocialIncome[];
  questions: SocialQuestion[];
  rivals: SocialRival[];
  rules: SocialRule[];
  clicks: { platform: Platform; day: string; clicks: number }[];
  waitlist: { platform: Platform; day: string; n: number }[];
}

// ── Days ───────────────────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
/** yyyy-mm-dd → a UTC-noon timestamp, so adding days never crosses a DST edge. */
const t = (day: string): number => Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12);
const key = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: string, n: number): string => key(t(day) + n * DAY_MS);
export const daysBetween = (from: string, to: string): number => Math.round((t(to) - t(from)) / DAY_MS);

/** The Monday of the week `day` falls in. Weeks run Monday to Sunday, as the calendar draws them. */
export function weekStart(day: string): string {
  const dow = (new Date(t(day)).getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

/** The day a posting sits on: the day it went up, else the day it is planned for. */
export const postingDay = (p: SocialPosting): string | null => p.posted_day ?? p.scheduled_for;
export const isPosted = (p: SocialPosting): boolean => p.posted_day != null;

// ── Watched ────────────────────────────────────────────────────────────────────────────────────────

/**
 * The share of a video people watched, 0–100, and where the figure came from.
 *
 * A typed percentage wins (it is the owner reading the platform's own screen). Otherwise Instagram's
 * average watch TIME over the video's length — the platform's own duration when it gave one, else the
 * length on the video record. No length, no percentage: a bare "8 seconds" is not a share of anything.
 */
export function watched(p: SocialPosting, video: SocialVideo | undefined): { pct: number; typed: boolean } | null {
  if (p.watch_pct_typed != null) return { pct: p.watch_pct_typed, typed: true };
  const len = p.duration_s ?? video?.length_s ?? null;
  if (p.avg_watch_s == null || !len || len <= 0) return null;
  return { pct: Math.min(100, (p.avg_watch_s / len) * 100), typed: false };
}

// ── Totals ─────────────────────────────────────────────────────────────────────────────────────────

export interface Totals {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** Null when no posting in the set reports saves at all (TikTok alone). */
  saves: number | null;
  /** Average watched, weighted by views, over the postings that have a figure. Null when none do. */
  watched: number | null;
  /** How many of the postings stand behind `watched`. */
  watchedOf: number;
  /** Shares per 1,000 views. Null with no views. */
  sharesPerK: number | null;
}

export function totals(postings: SocialPosting[], videos: Map<string, SocialVideo>): Totals {
  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let saves: number | null = null;
  let w = 0;
  let wv = 0;
  let watchedOf = 0;
  for (const p of postings) {
    const v = p.views ?? 0;
    views += v;
    likes += p.likes ?? 0;
    comments += p.comments ?? 0;
    shares += p.shares ?? 0;
    if (p.saves != null) saves = (saves ?? 0) + p.saves;
    const wt = watched(p, videos.get(p.video_id));
    if (wt) {
      // A video with a percentage but no views still counts once, so one early video is not "—".
      const weight = Math.max(v, 1);
      w += wt.pct * weight;
      wv += weight;
      watchedOf++;
    }
  }
  return {
    posts: postings.length,
    views,
    likes,
    comments,
    shares,
    saves,
    watched: wv ? w / wv : null,
    watchedOf,
    sharesPerK: views > 0 ? (shares / views) * 1000 : null,
  };
}

export const videoMap = (videos: SocialVideo[]): Map<string, SocialVideo> => new Map(videos.map((v) => [v.id, v]));

/** Postings that are up, on the platform(s) asked for, posted within the last `days` (inclusive of today). */
export function postedIn(data: SocialData, filter: PlatformFilter, days: number, today: string): SocialPosting[] {
  const from = addDays(today, -days);
  const ks = keysOf(filter);
  return data.postings.filter((p) => p.posted_day != null && p.posted_day > from && p.posted_day <= today && ks.includes(p.platform));
}

// ── Followers ──────────────────────────────────────────────────────────────────────────────────────

/** One platform's follower count on or before `day` (the last snapshot carries forward), or null before any. */
function followersAt(daily: AccountDay[], platform: Platform, day: string): number | null {
  let best: AccountDay | null = null;
  for (const d of daily) {
    if (d.platform !== platform || d.followers == null || d.day > day) continue;
    if (!best || d.day > best.day) best = d;
  }
  return best?.followers ?? null;
}

function firstDay(daily: AccountDay[], platform: Platform): string | null {
  let first: string | null = null;
  for (const d of daily) if (d.platform === platform && d.followers != null && (!first || d.day < first)) first = d.day;
  return first;
}

export interface Followers {
  /** Followers now, summed over the platforms that have ever reported. Null when none has. */
  now: number | null;
  /** Gained over the window. Null when there is no earlier snapshot to subtract. */
  gained: number | null;
  /** Gained over the window before it, for the ▲/▼ note. Null when the history does not reach that far. */
  prev: number | null;
  /** Set when the history is shorter than the window: the gain is "since <day>", not "in 30 days". */
  since: string | null;
}

/**
 * Followers gained is a DIFFERENCE between two snapshots, so it needs two. A platform whose history
 * starts inside the window is measured from its first snapshot and `since` says so — that is honest;
 * pretending the account had zero followers the day before it was connected would not be.
 */
export function followers(daily: AccountDay[], filter: PlatformFilter, days: number, today: string): Followers {
  const start = addDays(today, -days);
  const prevStart = addDays(today, -2 * days);
  let now: number | null = null;
  let gained: number | null = null;
  let prev: number | null = null;
  let prevKnown = true;
  let since: string | null = null;
  for (const k of keysOf(filter)) {
    const cur = followersAt(daily, k, today);
    if (cur == null) continue;
    now = (now ?? 0) + cur;
    const first = firstDay(daily, k)!;
    const atStart = followersAt(daily, k, start);
    if (atStart != null) {
      gained = (gained ?? 0) + (cur - atStart);
      const atPrev = followersAt(daily, k, prevStart);
      if (atPrev != null) prev = (prev ?? 0) + (atStart - atPrev);
      else prevKnown = false;
    } else if (first < today) {
      gained = (gained ?? 0) + (cur - followersAt(daily, k, first)!);
      if (!since || first < since) since = first;
      prevKnown = false;
    } else {
      prevKnown = false;
    }
  }
  return { now, gained, prev: prevKnown ? prev : null, since };
}

/**
 * The follower line: one point per day (per week past 180 days), carrying the last snapshot forward.
 * It starts at the first day EVERY shown platform has a snapshot, so adding Instagram in week three
 * does not draw a cliff in the "both platforms" line.
 */
export function followerSeries(daily: AccountDay[], filter: PlatformFilter, days: number, today: string): { days: string[]; values: number[]; weekly: boolean } {
  const ks = keysOf(filter).filter((k) => firstDay(daily, k) != null);
  if (!ks.length) return { days: [], values: [], weekly: false };
  const firsts = ks.map((k) => firstDay(daily, k)!);
  const latestFirst = firsts.reduce((a, b) => (a > b ? a : b));
  const windowStart = addDays(today, -days);
  const from = latestFirst > windowStart ? latestFirst : windowStart;
  const weekly = days > 180;
  const step = weekly ? 7 : 1;
  const span = daysBetween(from, today);
  const outD: string[] = [];
  const outV: number[] = [];
  for (let back = span - (span % step); back >= 0; back -= step) {
    const day = addDays(today, -back);
    outD.push(day);
    outV.push(ks.reduce((sum, k) => sum + (followersAt(daily, k, day) ?? 0), 0));
  }
  return { days: outD, values: outV, weekly };
}

// ── Per-day counters (link clicks, early-access signups) ───────────────────────────────────────────

export function sumIn<T extends { platform: Platform; day: string }>(rows: T[], pick: (r: T) => number, filter: PlatformFilter, days: number, today: string): number {
  const from = addDays(today, -days);
  const ks = keysOf(filter);
  let n = 0;
  for (const r of rows) if (r.day > from && r.day <= today && ks.includes(r.platform)) n += pick(r);
  return n;
}

// ── Top videos ─────────────────────────────────────────────────────────────────────────────────────

export type TopSort = 'views' | 'watched' | 'shares';

export interface TopRow {
  video: SocialVideo;
  /** Earliest day it went up among the postings counted. */
  day: string;
  platforms: Platform[];
  totals: Totals;
}

/** One row per video when all platforms are shown (its postings summed), one per posting otherwise. */
export function topVideos(data: SocialData, filter: PlatformFilter, days: number, today: string, sort: TopSort): TopRow[] {
  const vm = videoMap(data.videos);
  const by = new Map<string, SocialPosting[]>();
  for (const p of postedIn(data, filter, days, today)) by.set(p.video_id, [...(by.get(p.video_id) ?? []), p]);
  const rows: TopRow[] = [];
  for (const [id, ps] of by) {
    const video = vm.get(id);
    if (!video) continue;
    rows.push({
      video,
      day: ps.map((p) => p.posted_day!).reduce((a, b) => (a < b ? a : b)),
      platforms: ps.map((p) => p.platform),
      totals: totals(ps, vm),
    });
  }
  const val = (r: TopRow) => (sort === 'views' ? r.totals.views : sort === 'watched' ? (r.totals.watched ?? -1) : (r.totals.sharesPerK ?? -1));
  return rows.sort((a, b) => val(b) - val(a) || b.totals.views - a.totals.views);
}

// ── The pipeline and the calendar ──────────────────────────────────────────────────────────────────

/** The platforms a video is on, or meant for: its postings first, else what was planned. */
export function videoPlatforms(video: SocialVideo, postings: SocialPosting[]): Platform[] {
  const own = postings.filter((p) => p.video_id === video.id).map((p) => p.platform);
  const all = own.length ? own : video.planned;
  return PLATFORMS.map((p) => p.key).filter((k) => all.includes(k));
}

/** Does the platform chip show this video? An idea with no platform yet shows under every chip. */
export function videoInFilter(video: SocialVideo, postings: SocialPosting[], filter: PlatformFilter): boolean {
  if (filter === 'all') return true;
  const ps = videoPlatforms(video, postings);
  return ps.length ? ps.includes(filter) : video.stage === 'idea';
}

/** The day a video sorts by in its stage: earliest posting day on the shown platform(s), else null. */
export function videoDay(video: SocialVideo, postings: SocialPosting[], filter: PlatformFilter): string | null {
  const ks = keysOf(filter);
  let ds = postings.filter((p) => p.video_id === video.id && ks.includes(p.platform)).map(postingDay).filter((d): d is string => !!d);
  if (!ds.length) ds = postings.filter((p) => p.video_id === video.id).map(postingDay).filter((d): d is string => !!d);
  return ds.length ? ds.reduce((a, b) => (a < b ? a : b)) : null;
}

export function stageCounts(data: SocialData, filter: PlatformFilter): Record<Exclude<Stage, 'dropped'>, number> {
  const out = { idea: 0, scripted: 0, filmed: 0, scheduled: 0, posted: 0 };
  for (const v of data.videos) if (v.stage !== 'dropped' && videoInFilter(v, data.postings, filter)) out[v.stage]++;
  return out;
}

/** The videos of one stage, in the order that stage is worked: scheduled soonest first, posted newest first. */
export function videosInStage(data: SocialData, stage: Stage, filter: PlatformFilter): SocialVideo[] {
  const vs = data.videos.filter((v) => v.stage === stage && videoInFilter(v, data.postings, filter));
  const day = (v: SocialVideo) => videoDay(v, data.postings, filter);
  if (stage === 'scheduled') return vs.sort((a, b) => (day(a) ?? '9999').localeCompare(day(b) ?? '9999'));
  if (stage === 'posted') return vs.sort((a, b) => (day(b) ?? '').localeCompare(day(a) ?? ''));
  return vs.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export interface WeekCount {
  start: string;
  end: string;
  posted: number;
  scheduled: number;
  /** Posts a week the goal asks for on the shown platform(s). 0 = no goal set. */
  target: number;
  /** The week is over. */
  past: boolean;
}

export function weekCount(data: SocialData, start: string, filter: PlatformFilter, today: string): WeekCount {
  const end = addDays(start, 6);
  const ks = keysOf(filter);
  let posted = 0;
  let scheduled = 0;
  for (const p of data.postings) {
    const d = postingDay(p);
    if (!d || d < start || d > end || !ks.includes(p.platform)) continue;
    if (isPosted(p)) posted++;
    else scheduled++;
  }
  const target = data.goals.filter((g) => ks.includes(g.platform)).reduce((n, g) => n + g.posts_per_week, 0);
  return { start, end, posted, scheduled, target, past: end < today };
}

/** What the week column says under its count: a finished week is met or missed, never rolled forward (AA-D32). */
export function weekVerdict(w: WeekCount): { text: string; missed: boolean } | null {
  if (!w.target) return null;
  const n = w.posted + w.scheduled;
  if (w.past) return w.posted >= w.target ? { text: 'met', missed: false } : { text: 'missed', missed: true };
  return n >= w.target ? { text: 'planned', missed: false } : { text: `${w.target - n} to plan`, missed: false };
}

/** The Mondays the calendar shows: `before` weeks back through `after` weeks ahead of this one. */
export function calendarWeeks(today: string, before = 2, after = 2): string[] {
  const now = weekStart(today);
  const out: string[] = [];
  for (let i = -before; i <= after; i++) out.push(addDays(now, i * 7));
  return out;
}

// ── Playbook ───────────────────────────────────────────────────────────────────────────────────────

export type WorkingDim = 'topic' | 'hook' | 'format' | 'length';
export type WorkingMeasure = 'shares' | 'watched' | 'views';

export const MEASURES: { key: WorkingMeasure; label: string }[] = [
  { key: 'shares', label: 'Shares per 1,000 views' },
  { key: 'watched', label: 'Watched' },
  { key: 'views', label: 'Views per video' },
];

export function lengthBand(s: number | null): string | null {
  if (s == null) return null;
  return s < 20 ? 'Under 20 seconds' : s <= 35 ? '20 to 35 seconds' : 'Over 35 seconds';
}

export interface WorkingRow {
  label: string;
  /** Videos behind the line — shown beside it, so a ranking built on one video reads as one video (AA-D30). */
  videos: number;
  /** The measure's value, or null when none of these videos has it. */
  value: number | null;
  /** Bar width, 0–100. */
  width: number;
}

/**
 * Posted videos grouped by a tag, ranked by one measure. A video with no tag on the chosen dimension
 * is left out rather than gathered under "Untagged" — it has said nothing about that dimension.
 */
export function working(data: SocialData, dim: WorkingDim, measure: WorkingMeasure): WorkingRow[] {
  const vm = videoMap(data.videos);
  const groups = new Map<string, { videos: Set<string>; postings: SocialPosting[] }>();
  for (const p of data.postings) {
    if (!isPosted(p)) continue;
    const v = vm.get(p.video_id);
    if (!v) continue;
    const label = dim === 'length' ? lengthBand(v.length_s) : v[dim];
    if (!label) continue;
    const g = groups.get(label) ?? { videos: new Set<string>(), postings: [] };
    g.videos.add(v.id);
    g.postings.push(p);
    groups.set(label, g);
  }
  const rows: WorkingRow[] = [...groups].map(([label, g]) => {
    const tt = totals(g.postings, vm);
    const value = measure === 'shares' ? tt.sharesPerK : measure === 'watched' ? tt.watched : g.videos.size ? tt.views / g.videos.size : null;
    return { label, videos: g.videos.size, value, width: 0 };
  });
  const max = Math.max(0, ...rows.map((r) => r.value ?? 0));
  for (const r of rows) r.width = r.value == null ? 0 : measure === 'watched' ? Math.min(100, r.value) : max > 0 ? (r.value / max) * 100 : 0;
  return rows.sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || b.videos - a.videos);
}

export function measureText(measure: WorkingMeasure, value: number | null): string {
  if (value == null) return '—';
  if (measure === 'shares') return `${value.toFixed(1)} per 1,000`;
  if (measure === 'watched') return `${Math.round(value)}% watched`;
  return `${Math.round(value).toLocaleString('en-US')} views`;
}

/** The experiment log: every video with a verdict, newest post first (AA-D30). */
export function lessons(data: SocialData): { video: SocialVideo; day: string | null }[] {
  return data.videos
    .filter((v) => v.verdict && (v.lesson_tried || v.lesson_result))
    .map((video) => ({ video, day: videoDay(video, data.postings, 'all') }))
    .sort((a, b) => (b.day ?? '').localeCompare(a.day ?? ''));
}

// ── Accounts ───────────────────────────────────────────────────────────────────────────────────────

export type AccountState = 'connected' | 'expired' | 'never';

/**
 * `expired` = it was connected once and the sign-in is gone (the platform revoked it, or the owner
 * disconnected). Its numbers stay and have stopped updating, which the page says in words.
 */
export function accountState(a: SocialAccount | undefined): AccountState {
  if (!a) return 'never';
  if (a.connected) return 'connected';
  return a.connected_at ? 'expired' : 'never';
}

/** "just now" / "12 minutes ago" / "3 hours ago" / "2 days ago". */
export function ago(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

/** The line under the Numbers title: which accounts are feeding it, and how fresh. */
export function syncLine(accounts: SocialAccount[], now: number): string {
  const on = PLATFORMS.map((p) => accounts.find((a) => a.platform === p.key)).filter((a): a is SocialAccount => !!a && a.connected);
  if (!on.length) return 'No account is connected yet.';
  const oldest = on.map((a) => a.last_sync_at).filter((s): s is string => !!s).sort()[0];
  const names = on.map((a) => platformLabel(a.platform)).join(' and ');
  const when = ago(oldest, now);
  return when ? `${names} synced ${when}.` : `${names} connected. No sync has run yet.`;
}

/** Pre-sync and post-sync numbers can both be on a posting; this says which the page is looking at. */
export function postingSource(p: SocialPosting): 'synced' | 'typed' | 'none' {
  if (p.synced_at) return 'synced';
  if (p.typed_at) return 'typed';
  return 'none';
}

/** The public link for a platform's bio (AA-D27). */
export const platformLink = (p: Platform): string => `forgelegacy.app/go/${p}`;

// ── Text ───────────────────────────────────────────────────────────────────────────────────────────

/** "Holt · Result first · 28s", or what is missing when the sync brought a post in on its own. */
export function tagLine(v: SocialVideo): string {
  const parts = [v.topic, v.hook, v.length_s ? `${v.length_s}s` : null].filter((x): x is string => !!x);
  if (!v.topic && v.imported_from) return `Imported from ${platformLabel(v.imported_from)} · needs tags`;
  return parts.length ? parts.join(' · ') : 'No tags yet';
}

export const needsTags = (v: SocialVideo): boolean => v.stage === 'posted' && !v.topic;

/** A percentage of a whole, to one decimal under 10%: "0.7%", "23%". "—" with nothing to divide by. */
export function share(part: number, whole: number): string {
  if (!(whole > 0)) return '—';
  const r = (part / whole) * 100;
  return `${r < 10 ? r.toFixed(1) : Math.round(r)}%`;
}

export const pctOrDash = (v: number | null): string => (v == null ? '—' : `${Math.round(v)}%`);
export const intOrDash = (v: number | null | undefined): string => (v == null ? '—' : Math.round(v).toLocaleString('en-US'));
