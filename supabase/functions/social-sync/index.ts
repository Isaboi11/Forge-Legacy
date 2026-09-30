/**
 * Forge Legacy — `social-sync`: the ONLY way the owner's TikTok and Instagram numbers reach our database
 * (AA-D26, AA-D17). Governed by `Docs/Admin-Analytics-Amendment-003-Social.md`; tables in migration 0247.
 *
 * It does three jobs:
 *
 *   1. SIGN-IN. The CRM asks for a platform's sign-in address (`connect`), the owner approves on the
 *      platform, and the platform sends the browser back HERE with a one-time code. This function swaps
 *      the code for tokens and keeps them in `ops_social_accounts` (RLS on, zero policies — AA-D6).
 *   2. REFRESH. TikTok access tokens last 24 hours (refresh token: 365 days). Instagram long-lived tokens
 *      last 60 days and are renewed once they have 30 days or less left.
 *   3. PULL. Followers into `ops_social_account_daily` (one row per platform per UTC day) and each post's
 *      numbers into `ops_social_postings`. A post nobody planned becomes a video marked `imported_from`.
 *
 * ══ ⚠ DEPLOY WITH "VERIFY JWT" OFF ══
 *
 * Two callers have no Supabase JWT: the platform's browser redirect (a plain GET) and the database's
 * daily cron. So this code authenticates EVERY request itself, and there is no path that skips it:
 *
 *   GET  ?code&state     the `state` must be a row this function created in the last 10 minutes for a
 *                        signed-in app admin. It is deleted as it is read, so it works once.
 *   POST x-cron-secret   must equal `ops_social_config.cron_secret` (constant-time compare), and the
 *                        only thing it may do is `{action:'sync'}`.
 *   POST Authorization   `is_app_admin()` asked AS THE CALLER (anon key + their header), exactly as
 *                        asc-sync does. Only then does the code switch to the service role.
 *
 * ══ ⚠ DEPLOYED BY PASTING THIS ONE FILE INTO THE SUPABASE DASHBOARD ══
 *
 * So: one self-contained file, URL imports only, no local imports. The pure logic between the
 * PURE CORE markers is plain JavaScript (no type annotations) because
 * `__tests__/core.test.mjs` cuts that block out of this file and runs it under `node --test`.
 *
 * ══ THE SECRETS (Supabase → Edge Functions → Secrets) ══
 *
 *   TIKTOK_CLIENT_KEY        the TikTok app's Client key
 *   TIKTOK_CLIENT_SECRET     the TikTok app's Client secret
 *   INSTAGRAM_APP_ID         the Meta app's INSTAGRAM app ID (not the Meta app ID)
 *   INSTAGRAM_APP_SECRET     the Meta app's INSTAGRAM app secret
 *   SOCIAL_RETURN_ORIGINS    optional; the sites the sign-in may send the browser back to, comma
 *                            separated. Default: https://forgelegacy.expo.app,http://localhost:8081
 *
 * The redirect address registered on BOTH platforms is `${SUPABASE_URL}/functions/v1/social-sync`, with
 * no query string. Which platform a callback belongs to is read from the state row, not the address.
 * Runbook: Docs/Social-Accounts-Setup.md.
 *
 * ══ THE CALLS ══
 *
 *   {action:'status'}                           → { ok, configured:{tiktok,instagram}, missing:{…}, redirect_uri }
 *   {action:'connect', platform, return_to}     → { ok:true, url }   or { ok:false, configured:false, missing:[…] }
 *   {action:'sync', platform?}                  → { ok, results:[{ platform, ok, message, posts, new_videos, followers }] }
 *
 * ══ STATUS CODES ══
 *
 *   200 — the call ran (a sync that failed for one platform is still 200; see `ok` per result)
 *   302 — the sign-in callback, back to the CRM with `?p=social&a=connected-<platform>` or `failed-<platform>`
 *   400 — a malformed call, or a callback whose state is unknown
 *   401 — no Authorization header
 *   403 — not an app admin, or a wrong cron secret
 *   405 — not GET / POST / OPTIONS
 *
 * ══ ⚠ TOKENS AND SECRETS ══
 *
 * Never logged, never in a response body, never in an address WE build for the browser. Two platform
 * endpoints take them as query parameters because that is the only documented form (Instagram's
 * long-lived exchange and every graph.instagram.com read); those addresses go from this server to the
 * platform and are never logged or echoed. Error strings are short plain sentences, never a raw API body.
 *
 * ══ WHAT THE PLATFORMS DO NOT SHARE (checked against their documentation, 2026-09-30) ══
 *
 *   TikTok Display API   no watch time, no saves, no profile views → `avg_watch_s`, `saves`, `reach` stay
 *                        null. `watch_pct_typed` is the owner's typed figure and NO code here writes it.
 *   Instagram            no video LENGTH on a media object → `duration_s` stays null, so `length_s` on an
 *                        imported Instagram video is never filled by the sync.
 *                        no `profile_views` account metric in the current API → that column stays null.
 *                        `link_taps` is Instagram's `profile_links_taps`: taps on the address, call, email
 *                        and text buttons.
 *
 * ══ CORS ══
 *
 * Called from the browser (forgelegacy.expo.app) via `supabase.functions.invoke('social-sync')`, so the
 * OPTIONS preflight MUST be answered. Same block as every other browser-called function.
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const env = (k: string) => (Deno.env.get(k) ?? '').trim();
const SECRETS: Record<string, string> = {
  TIKTOK_CLIENT_KEY: env('TIKTOK_CLIENT_KEY'),
  TIKTOK_CLIENT_SECRET: env('TIKTOK_CLIENT_SECRET'),
  INSTAGRAM_APP_ID: env('INSTAGRAM_APP_ID'),
  INSTAGRAM_APP_SECRET: env('INSTAGRAM_APP_SECRET'),
};
const RETURN_ORIGINS = env('SOCIAL_RETURN_ORIGINS') || 'https://forgelegacy.expo.app,http://localhost:8081';

/** The one address both platforms send the browser back to. */
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/social-sync`;

// TikTok — developers.tiktok.com/doc/oauth-user-access-token-management, /doc/tiktok-api-v2-get-user-info,
// /doc/tiktok-api-v2-video-list
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_API = 'https://open.tiktokapis.com';
// Instagram API with Instagram Login — developers.facebook.com/docs/instagram-platform
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const INSTAGRAM_GRAPH = 'https://graph.instagram.com';
/** The version Meta's reference pages showed on 2026-09-30. */
const INSTAGRAM_VERSION = 'v25.0';

/** How many of the most recent posts a sync reads, per platform. */
const MAX_POSTS = 100;
/** TikTok's documented maximum page size for /v2/video/list/. */
const TIKTOK_PAGE = 20;
const INSTAGRAM_PAGE = 50;
/** Calls in flight at once (Instagram needs one insights call per post). */
const CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 20000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

// ── PURE CORE START ──
// Plain JavaScript on purpose (no type annotations): the node test extracts and evaluates this block.

const PLATFORMS = ['tiktok', 'instagram'];
const PLATFORM_NAME = { tiktok: 'TikTok', instagram: 'Instagram' };
/** A sign-in must come back within this long of being started. */
const STATE_TTL_MS = 10 * 60 * 1000;
const EXPIRED_MESSAGE = 'The sign-in expired. Connect again.';

/** Which secrets each platform needs, by NAME. */
const SECRET_NAMES = {
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  instagram: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
};

/** `username` needs user.info.profile; `follower_count` needs user.info.stats (TikTok's Get User Info page). */
const TIKTOK_SCOPES = ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.list'];
const TIKTOK_USER_FIELDS = ['open_id', 'display_name', 'username', 'follower_count', 'likes_count', 'video_count'];
const TIKTOK_VIDEO_FIELDS = [
  'id', 'create_time', 'title', 'video_description', 'duration', 'share_url',
  'view_count', 'like_count', 'comment_count', 'share_count',
];
const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights'];
const INSTAGRAM_USER_FIELDS = ['user_id', 'username', 'followers_count', 'media_count', 'account_type'];
const INSTAGRAM_MEDIA_FIELDS = [
  'id', 'caption', 'media_type', 'media_product_type', 'permalink', 'timestamp', 'like_count', 'comments_count',
];

/** TikTok: renew when the access token has this long or less left. */
const TIKTOK_REFRESH_WITHIN_MS = 10 * 60 * 1000;
/**
 * Instagram: renew when the 60-day token has this long or less left. Instagram refuses to refresh a token
 * younger than 24 hours, and a token 30 days from the end of a 60-day life is always older than that.
 */
const INSTAGRAM_REFRESH_WITHIN_MS = 30 * 24 * 3600 * 1000;

/** @param {unknown} v @returns {string|null} a trimmed non-empty string, or null */
function str(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/** @param {unknown} v @returns {number|null} a whole number that is not negative, or null */
function count(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/**
 * Cut to `n` CHARACTERS (not UTF-16 units), so an emoji is never split in half — half an emoji is not
 * valid text and Postgres refuses it.
 * @param {string|null} s @param {number} n @returns {string|null}
 */
function clip(s, n) {
  if (s === null || s === undefined) return null;
  const chars = Array.from(String(s));
  return chars.length <= n ? String(s) : chars.slice(0, n).join('');
}

/** @param {string|null} url @returns {string|null} the address if it fits the column, else null */
function fitUrl(url) {
  const u = str(url);
  return u && u.length <= 500 ? u : null;
}

/**
 * A video's title from its caption: the first line that has anything on it, at most 200 characters.
 * @param {unknown} text @returns {string}
 */
function titleFromCaption(text) {
  const lines = String(text ?? '').replace(/\r/g, '').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t !== '') return clip(t, 200).trim();
  }
  return 'Untitled post';
}

/** @param {number} ms @returns {string} YYYY-MM-DD in UTC */
function utcDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD strings (b − a). */
function dayDiff(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/**
 * Anything date-like a platform sends → an ISO timestamp, or null.
 * Instagram sends "2019-09-26T22:36:43+0000" (no colon in the offset), which is not strict ISO 8601.
 * @param {unknown} v @returns {string|null}
 */
function toIso(v) {
  const s = str(v);
  if (!s) return null;
  const ms = Date.parse(s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Compare two strings without stopping at the first difference. An empty `expected` never matches. */
function timingSafeEqual(given, expected) {
  const a = String(given ?? '');
  const b = String(expected ?? '');
  if (b.length === 0) return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * Where the sign-in may send the browser back to. The ORIGIN must be on the allowlist exactly and the
 * path must be /admin. Returns the normalised address (`<origin>/admin`, no query, no fragment) or null.
 * @param {unknown} returnTo
 * @param {string} allowedCsv comma-separated origins
 * @returns {string|null}
 */
function validateReturnTo(returnTo, allowedCsv) {
  if (typeof returnTo !== 'string' || returnTo.length === 0 || returnTo.length > 500) return null;
  let u;
  try {
    u = new URL(returnTo);
  } catch (_e) {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username !== '' || u.password !== '') return null;
  const allowed = String(allowedCsv ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (!allowed.includes(u.origin)) return null;
  if (u.pathname.replace(/\/+$/, '') !== '/admin') return null;
  return `${u.origin}/admin`;
}

/**
 * The address the callback sends the browser to. Only ever a fixed word and the platform name — never a
 * message, a code or a token.
 */
function returnUrl(returnTo, platform, connected) {
  return `${returnTo}?p=social&a=${connected ? 'connected' : 'failed'}-${platform}`;
}

/** @returns {string[]} the NAMES of this platform's secrets that are empty */
function missingSecrets(platform, secrets) {
  return (SECRET_NAMES[platform] ?? []).filter((k) => !str(secrets?.[k]));
}

/** A state row is good for ten minutes from `created_at`. */
function stateIsFresh(createdAt, nowMs) {
  const t = Date.parse(String(createdAt ?? ''));
  return Number.isFinite(t) && nowMs - t <= STATE_TTL_MS && nowMs - t > -60000;
}

/**
 * The platform's sign-in address.
 *   TikTok:    https://www.tiktok.com/v2/auth/authorize/   client_key, scope (comma separated),
 *              response_type=code, redirect_uri, state            (developers.tiktok.com/doc/login-kit-web)
 *   Instagram: https://www.instagram.com/oauth/authorize    client_id, redirect_uri, response_type=code,
 *              scope (comma separated), state   (…/instagram-api-with-instagram-login/business-login)
 * @param {'tiktok'|'instagram'} platform
 * @param {{clientId:string, redirectUri:string, state:string}} o
 */
function authorizeUrl(platform, o) {
  if (platform === 'tiktok') {
    const qs = new URLSearchParams({
      client_key: o.clientId,
      scope: TIKTOK_SCOPES.join(','),
      response_type: 'code',
      redirect_uri: o.redirectUri,
      state: o.state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${qs}`;
  }
  const qs = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: 'code',
    scope: INSTAGRAM_SCOPES.join(','),
    state: o.state,
  });
  return `https://www.instagram.com/oauth/authorize?${qs}`;
}

/** Instagram appends "#_" to the redirect; it is not part of the code. */
function cleanCode(code) {
  return String(code ?? '').replace(/#_$/, '').trim();
}

/**
 * TikTok's /v2/oauth/token/ answer (code exchange AND refresh) → our token columns.
 * Success is flat: {access_token, expires_in, open_id, refresh_expires_in, refresh_token, scope, token_type}.
 * An older documented shape wraps it in `data`; both are read.
 * Failure is {error, error_description, log_id}. `auth` is true when the grant itself is dead.
 * ⚠ UNVERIFIED: TikTok documents the error SHAPE with `invalid_request` only. `invalid_grant` is the
 *   OAuth-standard code for a dead refresh token and is assumed here.
 * @param {any} body @param {number} nowMs
 */
function parseTikTokToken(body, nowMs) {
  const d = body && body.data && typeof body.data === 'object' && body.data.access_token ? body.data : body;
  const access = str(d?.access_token);
  if (!access) {
    const code = str(body?.error) ?? str(body?.error?.code) ?? str(body?.data?.error_code) ?? '';
    return { ok: false, auth: code === 'invalid_grant' };
  }
  const secs = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const exp = secs(d.expires_in);
  const rexp = secs(d.refresh_expires_in);
  return {
    ok: true,
    access_token: access,
    refresh_token: str(d.refresh_token),
    token_expires_at: exp ? new Date(nowMs + exp * 1000).toISOString() : null,
    refresh_expires_at: rexp ? new Date(nowMs + rexp * 1000).toISOString() : null,
    scopes: str(d.scope),
    external_id: str(d.open_id),
  };
}

/**
 * Instagram's short-lived token answer. Documented as {data:[{access_token, user_id, permissions}]};
 * a flat object is read too.
 * @param {any} body
 */
function parseInstagramShortToken(body) {
  const d = Array.isArray(body?.data) ? body.data[0] : body;
  const access = str(d?.access_token);
  if (!access) return { ok: false };
  const perms = Array.isArray(d.permissions) ? d.permissions.join(',') : str(d.permissions);
  return { ok: true, access_token: access, external_id: str(d.user_id), scopes: perms };
}

/**
 * Instagram's long-lived exchange AND refresh answer: {access_token, token_type, expires_in}.
 * @param {any} body @param {number} nowMs
 */
function parseInstagramLongToken(body, nowMs) {
  const access = str(body?.access_token);
  if (!access) return { ok: false, auth: instagramAuthError(body) };
  const exp = Number(body.expires_in);
  return {
    ok: true,
    access_token: access,
    token_expires_at: Number.isFinite(exp) && exp > 0 ? new Date(nowMs + exp * 1000).toISOString() : null,
  };
}

/** Graph API error code 190 = "Access token has expired" (also revoked / invalid). */
function instagramAuthError(body) {
  return Number(body?.error?.code) === 190;
}

/**
 * A TikTok data call's error code, or null when it succeeded. v2 puts {code, message, log_id} under
 * `error` on every answer and `code: "ok"` means success; the error page shows the same three fields flat.
 * @param {any} body @returns {string|null}
 */
function tiktokErrorCode(body) {
  const code = str(body?.error?.code) ?? str(body?.code);
  if (!code) return body && typeof body === 'object' && body.data ? null : 'no_answer';
  return code === 'ok' ? null : code.replace(/[^a-z0-9_]/gi, '').slice(0, 40);
}

/**
 * What to do with the saved token before a sync.
 * @param {'tiktok'|'instagram'} platform
 * @param {{access_token?:string|null, refresh_token?:string|null, token_expires_at?:string|null, refresh_expires_at?:string|null}|null} account
 * @param {number} nowMs
 * @returns {'none'|'use'|'refresh'|'expired'} none = not connected
 */
function tokenAction(platform, account, nowMs) {
  if (!account || !str(account.access_token)) return 'none';
  const exp = account.token_expires_at ? Date.parse(account.token_expires_at) : NaN;
  if (platform === 'tiktok') {
    if (Number.isFinite(exp) && exp - nowMs > TIKTOK_REFRESH_WITHIN_MS) return 'use';
    if (!str(account.refresh_token)) return 'expired';
    const rexp = account.refresh_expires_at ? Date.parse(account.refresh_expires_at) : NaN;
    if (Number.isFinite(rexp) && rexp <= nowMs) return 'expired';
    return 'refresh';
  }
  if (!Number.isFinite(exp)) return 'use';
  if (exp <= nowMs) return 'expired';
  return exp - nowMs <= INSTAGRAM_REFRESH_WITHIN_MS ? 'refresh' : 'use';
}

/**
 * TikTok /v2/user/info/ → {handle, external_id, followers}. The handle is the @username
 * (user.info.profile); the display name stands in if TikTok leaves it out.
 * @param {any} body
 */
function parseTikTokUser(body) {
  const u = body?.data?.user ?? {};
  return {
    handle: clip(str(u.username) ?? str(u.display_name), 120),
    external_id: clip(str(u.open_id), 200),
    followers: count(u.follower_count),
  };
}

/**
 * One TikTok video object → our post shape. `create_time` is UTC epoch SECONDS; `duration` is seconds.
 * The Display API has no watch time, saves or reach: those stay null.
 * @param {any} v
 */
function mapTikTokVideo(v) {
  const text = str(v?.video_description) ?? str(v?.title);
  const created = Number(v?.create_time);
  const dur = Number(v?.duration);
  return {
    external_id: clip(str(v?.id), 200),
    posted_at: Number.isFinite(created) && created > 0 ? new Date(created * 1000).toISOString() : null,
    caption: clip(text, 2300),
    title: titleFromCaption(text),
    url: fitUrl(v?.share_url),
    duration_s: Number.isFinite(dur) && dur > 0 ? Math.round(dur * 100) / 100 : null,
    views: count(v?.view_count),
    likes: count(v?.like_count),
    comments: count(v?.comment_count),
    shares: count(v?.share_count),
    saves: null,
    reach: null,
    avg_watch_s: null,
  };
}

/**
 * TikTok /v2/video/list/ → {posts, cursor, has_more}. `cursor` is epoch MILLISECONDS and is passed back
 * as-is to get the next page.
 * @param {any} body
 */
function parseTikTokVideos(body) {
  const list = Array.isArray(body?.data?.videos) ? body.data.videos : [];
  return {
    posts: list.map(mapTikTokVideo).filter((p) => p.external_id),
    cursor: body?.data?.cursor ?? null,
    has_more: body?.data?.has_more === true,
  };
}

/**
 * Instagram /me → {handle, external_id, followers}. Meta's get-started sample wraps the user in
 * {data:[…]}; the reference shows it flat. Both are read. `user_id` is the professional account's id;
 * `id` is the app-scoped one and only stands in.
 * @param {any} body
 */
function parseInstagramUser(body) {
  const u = (Array.isArray(body?.data) ? body.data[0] : body) ?? {};
  return {
    handle: clip(str(u.username), 120),
    external_id: clip(str(u.user_id) ?? str(u.id), 200),
    followers: count(u.followers_count),
  };
}

/**
 * One Instagram media object → our post shape, plus `product` (FEED / REELS / STORY / AD) which decides
 * which insights may be asked for. `like_count` is left out by Instagram when the owner hides likes.
 * Instagram gives no video length, so `duration_s` is always null.
 * @param {any} m
 */
function mapInstagramMedia(m) {
  const text = str(m?.caption);
  return {
    external_id: clip(str(m?.id), 200),
    posted_at: toIso(m?.timestamp),
    caption: clip(text, 2300),
    title: titleFromCaption(text),
    url: fitUrl(m?.permalink),
    duration_s: null,
    views: null,
    likes: count(m?.like_count),
    comments: count(m?.comments_count),
    shares: null,
    saves: null,
    reach: null,
    avg_watch_s: null,
    product: str(m?.media_product_type) ?? 'FEED',
  };
}

/**
 * Instagram /me/media → {posts, after}. `after` is the cursor for the next page, and is null on the last
 * page: Meta says to stop when `paging.next` is absent, NOT when the cursor is.
 * @param {any} body
 */
function parseInstagramMedia(body) {
  const list = Array.isArray(body?.data) ? body.data : [];
  const hasNext = typeof body?.paging?.next === 'string' && body.paging.next !== '';
  return {
    posts: list.map(mapInstagramMedia).filter((p) => p.external_id && (p.product === 'FEED' || p.product === 'REELS')),
    after: hasNext ? str(body?.paging?.cursors?.after) : null,
  };
}

/**
 * Which insights to ask for. ONE metric that does not belong to the media's type fails the WHOLE call, so
 * the list is per type, and `fallback` is a shorter list to retry with.
 *   ig_reels_avg_watch_time — REELS only.  views / reach / likes / comments / shares / saved — FEED and REELS.
 * (…/instagram-platform/reference/instagram-media/insights)
 * @param {string} product @param {boolean} [fallback] @returns {string[]|null} null = ask for nothing
 */
function instagramMetricsFor(product, fallback) {
  if (product !== 'REELS' && product !== 'FEED') return null;
  if (fallback) return ['reach', 'likes', 'comments', 'shares', 'saved'];
  const base = ['views', 'reach', 'likes', 'comments', 'shares', 'saved'];
  return product === 'REELS' ? [...base, 'ig_reels_avg_watch_time'] : base;
}

/**
 * An insights answer → {metric: number}. A media metric carries `values:[{value}]`; an account metric
 * asked with metric_type=total_value carries `total_value:{value}`.
 * @param {any} body @returns {Record<string, number>}
 */
function parseInsights(body) {
  const out = {};
  for (const item of Array.isArray(body?.data) ? body.data : []) {
    const name = str(item?.name);
    if (!name) continue;
    const v = item?.total_value?.value ?? item?.values?.[0]?.value;
    if (typeof v === 'number' && Number.isFinite(v)) out[name] = v;
  }
  return out;
}

/**
 * Lay a post's insights over its basic counts. A metric Instagram did not return keeps whatever the
 * basic fields gave. `ig_reels_avg_watch_time` is MILLISECONDS; we store seconds.
 * @param {any} post @param {Record<string, number>} m
 */
function applyInstagramInsights(post, m) {
  const pick = (k, was) => (m[k] === undefined ? was : count(m[k]));
  const watch = m.ig_reels_avg_watch_time;
  return {
    ...post,
    views: pick('views', post.views),
    reach: pick('reach', post.reach),
    likes: pick('likes', post.likes),
    comments: pick('comments', post.comments),
    shares: pick('shares', post.shares),
    saves: pick('saved', post.saves),
    avg_watch_s: typeof watch === 'number' && watch >= 0 ? Math.round(watch / 10) / 100 : post.avg_watch_s,
  };
}

/** Account insights → the two columns we keep. `profile_links_taps` is what `link_taps` holds. */
function parseInstagramAccountInsights(body) {
  const m = parseInsights(body);
  return { reach: count(m.reach), link_taps: count(m.profile_links_taps) };
}

/** A video's `length_s` from a duration: whole seconds, inside the column's 1–7200 check, else null. */
function lengthSeconds(duration) {
  const n = Math.round(Number(duration));
  return Number.isFinite(n) && n >= 1 && n <= 7200 ? n : null;
}

/**
 * The columns a sync writes on a posting. A value the platform did not give is LEFT OUT, so it never
 * blanks a number that is already there. ⚠ `watch_pct_typed` is the owner's and is never in this list.
 * @param {any} post @param {string} nowIso
 */
function postingPatch(post, nowIso) {
  const out = {};
  for (const k of ['views', 'likes', 'comments', 'shares', 'saves', 'reach', 'avg_watch_s', 'duration_s', 'url', 'caption', 'posted_at']) {
    if (post[k] !== null && post[k] !== undefined) out[k] = post[k];
  }
  out.synced_at = nowIso;
  out.updated_at = nowIso;
  return out;
}

/**
 * Decide, for every post the platform reported, which row it belongs to:
 *   update — a posting already carries this platform id
 *   match  — a PLANNED posting (no platform id yet) dated within one day either side of the post;
 *            the closest date wins, then the oldest plan. A plan is claimed by one post only.
 *   create — nobody planned it: a new video and posting
 * Posts are taken oldest first so the result does not depend on the order the platform lists them in.
 * @param {Array<any>} posts our post shapes
 * @param {Array<{id:string, video_id:string, external_id:string|null, scheduled_for:string|null, created_at:string}>} existing this platform's postings
 * @returns {Array<{kind:'update'|'match'|'create', post:any, posting_id?:string, video_id?:string}>}
 */
function planPostings(posts, existing) {
  const byExternal = new Map();
  for (const e of existing) if (e.external_id) byExternal.set(String(e.external_id), e);
  const planned = existing.filter((e) => !e.external_id && e.scheduled_for);
  const claimed = new Set();
  const seen = new Set();
  const time = (p) => (p.posted_at ? Date.parse(p.posted_at) : Infinity);
  const out = [];
  for (const post of [...posts].sort((a, b) => time(a) - time(b))) {
    if (!post.external_id || seen.has(post.external_id)) continue;
    seen.add(post.external_id);
    const hit = byExternal.get(post.external_id);
    if (hit) {
      out.push({ kind: 'update', post, posting_id: hit.id, video_id: hit.video_id });
      continue;
    }
    let best = null;
    if (post.posted_at) {
      const day = post.posted_at.slice(0, 10);
      for (const e of planned) {
        if (claimed.has(e.id)) continue;
        const gap = Math.abs(dayDiff(String(e.scheduled_for).slice(0, 10), day));
        if (!(gap <= 1)) continue;
        const older = best && Date.parse(e.created_at) < Date.parse(best.e.created_at);
        if (!best || gap < best.gap || (gap === best.gap && older)) best = { e, gap };
      }
    }
    if (best) {
      claimed.add(best.e.id);
      out.push({ kind: 'match', post, posting_id: best.e.id, video_id: best.e.video_id });
    } else {
      out.push({ kind: 'create', post });
    }
  }
  return out;
}

// ── PURE CORE END ──

type Platform = 'tiktok' | 'instagram';
type Admin = ReturnType<typeof createClient>;
type Row = Record<string, any>;
type SyncResult = {
  platform: Platform;
  ok: boolean;
  message: string | null;
  posts: number;
  new_videos: number;
  followers: number | null;
};

/** An error whose message is already a short plain sentence, safe to show. */
class Plain extends Error {
  expired: boolean;
  constructor(message: string, expired = false) {
    super(message);
    this.expired = expired;
  }
}

const plain = (e: unknown, fallback: string) => (e instanceof Plain ? e.message : fallback);
const isPlatform = (v: unknown): v is Platform => v === 'tiktok' || v === 'instagram';

/** fetch → parsed JSON (or null). Never throws a raw network error upward: it becomes a Plain. */
async function call(url: string, init: RequestInit, who: string): Promise<{ status: number; body: any }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new Plain(`${who} did not answer. Try again.`);
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch { /* not JSON */ }
  return { status: res.status, body };
}

async function runPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

// ── TikTok ──

async function tiktokToken(params: Record<string, string>) {
  const { body } = await call(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: SECRETS.TIKTOK_CLIENT_KEY,
      client_secret: SECRETS.TIKTOK_CLIENT_SECRET,
      ...params,
    }),
  }, 'TikTok');
  return parseTikTokToken(body, Date.now());
}

async function tiktokApi(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const { status, body } = await call(`${TIKTOK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  }, 'TikTok');
  const code = tiktokErrorCode(body);
  if (!code && status < 400) return body;
  if (code === 'access_token_invalid') throw new Plain(EXPIRED_MESSAGE, true);
  if (code === 'scope_not_authorized' || code === 'scope_permission_missed') {
    throw new Plain('TikTok was not allowed to share that. Connect again and leave every item switched on.');
  }
  if (code === 'rate_limit_exceeded' || status === 429) throw new Plain('TikTok is busy. Try again in a few minutes.');
  throw new Plain(`TikTok refused the request${code ? ` (${code})` : ''}.`);
}

async function tiktokUser(token: string) {
  return parseTikTokUser(await tiktokApi(`/v2/user/info/?fields=${TIKTOK_USER_FIELDS.join(',')}`, token));
}

/** The most recent MAX_POSTS public videos, newest first (TikTok sorts by create_time descending). */
async function tiktokPosts(token: string): Promise<Row[]> {
  const out: Row[] = [];
  let cursor: unknown = null;
  for (let page = 0; page < Math.ceil(MAX_POSTS / TIKTOK_PAGE); page++) {
    const body = await tiktokApi(`/v2/video/list/?fields=${TIKTOK_VIDEO_FIELDS.join(',')}`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cursor === null ? { max_count: TIKTOK_PAGE } : { max_count: TIKTOK_PAGE, cursor }),
    });
    const parsed = parseTikTokVideos(body);
    out.push(...parsed.posts);
    if (!parsed.has_more || parsed.cursor === null || parsed.posts.length === 0) break;
    cursor = parsed.cursor;
  }
  return out.slice(0, MAX_POSTS);
}

// ── Instagram ──

/** A graph.instagram.com read. The token goes in the query because that is the documented form. */
async function instagramGet(path: string, params: Record<string, string>, token: string): Promise<any> {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const { status, body } = await call(`${INSTAGRAM_GRAPH}/${INSTAGRAM_VERSION}${path}?${qs}`, { method: 'GET' }, 'Instagram');
  if (status < 400 && !body?.error) return body;
  if (instagramAuthError(body)) throw new Plain(EXPIRED_MESSAGE, true);
  const code = Number(body?.error?.code);
  if (code === 4 || code === 17 || status === 429) throw new Plain('Instagram is busy. Try again in a few minutes.');
  if (code === 10 || (code >= 200 && code <= 299)) {
    throw new Plain('Instagram was not allowed to share that. Connect again and allow every item.');
  }
  throw new Plain(`Instagram refused the request${Number.isFinite(code) ? ` (code ${code})` : ''}.`);
}

/** Code → short-lived token → long-lived (60-day) token. */
async function instagramExchange(code: string) {
  const form = new FormData();
  form.set('client_id', SECRETS.INSTAGRAM_APP_ID);
  form.set('client_secret', SECRETS.INSTAGRAM_APP_SECRET);
  form.set('grant_type', 'authorization_code');
  form.set('redirect_uri', REDIRECT_URI);
  form.set('code', code);
  const first = await call(INSTAGRAM_TOKEN_URL, { method: 'POST', body: form }, 'Instagram');
  const short = parseInstagramShortToken(first.body);
  if (!short.ok) throw new Plain('Instagram refused the sign-in.');

  const qs = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: SECRETS.INSTAGRAM_APP_SECRET,
    access_token: short.access_token!,
  });
  const second = await call(`${INSTAGRAM_GRAPH}/access_token?${qs}`, { method: 'GET' }, 'Instagram');
  const long = parseInstagramLongToken(second.body, Date.now());
  if (!long.ok) throw new Plain('Instagram refused the sign-in.');
  return { ...long, external_id: short.external_id, scopes: short.scopes };
}

async function instagramRefresh(token: string) {
  const qs = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token });
  const { body } = await call(`${INSTAGRAM_GRAPH}/refresh_access_token?${qs}`, { method: 'GET' }, 'Instagram');
  return parseInstagramLongToken(body, Date.now());
}

async function instagramUser(token: string) {
  return parseInstagramUser(await instagramGet('/me', { fields: INSTAGRAM_USER_FIELDS.join(',') }, token));
}

/**
 * Reach and profile-button taps over the last 24 hours (the API's default window when since/until are
 * left out). Best effort: an account under 100 followers, or one Instagram has no data for yet, simply
 * gets nulls. If the pair is refused, reach is asked for alone.
 */
async function instagramAccountInsights(token: string): Promise<{ reach: number | null; link_taps: number | null }> {
  for (const metric of ['reach,profile_links_taps', 'reach']) {
    try {
      return parseInstagramAccountInsights(
        await instagramGet('/me/insights', { metric, period: 'day', metric_type: 'total_value' }, token),
      );
    } catch (e) {
      if (e instanceof Plain && e.expired) throw e;
    }
  }
  return { reach: null, link_taps: null };
}

/**
 * The most recent MAX_POSTS feed posts and reels, each with its insights. An insights call that fails
 * (a wrong metric for the type, or a post from before the account was professional) keeps the basic
 * likes and comments. `insightsFailed` counts the posts that got no insights at all.
 */
async function instagramPosts(token: string): Promise<{ posts: Row[]; insightsFailed: number }> {
  let posts: Row[] = [];
  let after: string | null = null;
  for (let page = 0; page < 6 && posts.length < MAX_POSTS; page++) {
    const params: Record<string, string> = { fields: INSTAGRAM_MEDIA_FIELDS.join(','), limit: String(INSTAGRAM_PAGE) };
    if (after) params.after = after;
    const parsed = parseInstagramMedia(await instagramGet('/me/media', params, token));
    posts.push(...parsed.posts);
    after = parsed.after;
    if (!after) break;
  }
  posts = posts.slice(0, MAX_POSTS);

  let insightsFailed = 0;
  const out: Row[] = new Array(posts.length);
  await runPool(posts.map((p, i) => ({ p, i })), CONCURRENCY, async ({ p, i }) => {
    out[i] = p;
    for (const fallback of [false, true]) {
      const metrics = instagramMetricsFor(p.product, fallback);
      if (!metrics) return;
      try {
        const body = await instagramGet(`/${encodeURIComponent(p.external_id)}/insights`, { metric: metrics.join(',') }, token);
        out[i] = applyInstagramInsights(p, parseInsights(body));
        return;
      } catch (e) {
        if (e instanceof Plain && e.expired) throw e;
      }
    }
    insightsFailed++;
  });
  return { posts: out, insightsFailed };
}

// ── Database ──

async function saveAccount(admin: Admin, platform: Platform, patch: Row): Promise<boolean> {
  const { error } = await admin
    .from('ops_social_accounts')
    .upsert({ platform, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'platform' });
  return !error;
}

/** The sign-in is dead: forget the tokens, keep the handle and every number (AA-D26). */
async function markExpired(admin: Admin, platform: Platform): Promise<void> {
  await saveAccount(admin, platform, {
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    refresh_expires_at: null,
    last_sync_at: new Date().toISOString(),
    last_sync_ok: false,
    last_sync_message: EXPIRED_MESSAGE,
  });
}

/** A usable access token, refreshed first if it is close to lapsing. Throws Plain(expired) when it is dead. */
async function freshToken(admin: Admin, platform: Platform, account: Row): Promise<string> {
  const action = tokenAction(platform, account, Date.now());
  if (action === 'use') return account.access_token;
  if (action === 'expired') throw new Plain(EXPIRED_MESSAGE, true);

  if (platform === 'tiktok') {
    const missing = missingSecrets('tiktok', SECRETS);
    if (missing.length) throw new Plain(`TikTok is not set up. Missing ${missing.join(', ')}.`);
    const t = await tiktokToken({ grant_type: 'refresh_token', refresh_token: account.refresh_token });
    if (!t.ok) {
      if (t.auth) throw new Plain(EXPIRED_MESSAGE, true);
      throw new Plain('TikTok refused to renew the sign-in. Try again, or connect again.');
    }
    // TikTok may hand back a NEW refresh token; the old one must not be used again if it did.
    const saved = await saveAccount(admin, platform, {
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? account.refresh_token,
      token_expires_at: t.token_expires_at,
      refresh_expires_at: t.refresh_expires_at ?? account.refresh_expires_at,
      scopes: t.scopes ?? account.scopes,
    });
    if (!saved) throw new Plain('Could not save the renewed sign-in.');
    return t.access_token!;
  }

  // Instagram: the current token still works today, so a refresh that fails for any reason other than
  // a dead token is not fatal — the next sync tries again.
  let t;
  try {
    t = await instagramRefresh(account.access_token);
  } catch {
    return account.access_token;
  }
  if (!t.ok) {
    if (t.auth) throw new Plain(EXPIRED_MESSAGE, true);
    return account.access_token;
  }
  await saveAccount(admin, platform, { access_token: t.access_token, token_expires_at: t.token_expires_at });
  return t.access_token!;
}

/**
 * Write the posts. Returns how many were written and how many were brand-new videos.
 * The rows are looked up by platform id (at most MAX_POSTS ids) and by "planned, no platform id yet",
 * never by reading the whole table.
 */
async function writePosts(admin: Admin, platform: Platform, posts: Row[]): Promise<{ written: number; created: number }> {
  if (posts.length === 0) return { written: 0, created: 0 };
  const cols = 'id, video_id, external_id, scheduled_for, created_at';
  const ids = posts.map((p) => p.external_id);
  const [linked, planned] = await Promise.all([
    admin.from('ops_social_postings').select(cols).eq('platform', platform).in('external_id', ids),
    admin.from('ops_social_postings').select(cols).eq('platform', platform).is('external_id', null)
      .not('scheduled_for', 'is', null).order('created_at', { ascending: true }).limit(1000),
  ]);
  if (linked.error || planned.error) throw new Plain('Could not read the saved posts.');

  const plan = planPostings(posts, [...(linked.data ?? []), ...(planned.data ?? [])] as any);
  const now = new Date().toISOString();
  let written = 0;
  let created = 0;
  let failed = 0;

  const fillLength = async (videoId: string, post: Row) => {
    const len = lengthSeconds(post.duration_s);
    if (len === null) return;
    await admin.from('ops_social_videos').update({ length_s: len, updated_at: now }).eq('id', videoId).is('length_s', null);
  };

  await runPool(plan.filter((a: Row) => a.kind !== 'create'), CONCURRENCY, async (a: Row) => {
    const patch = postingPatch(a.post, now);
    if (a.kind === 'update') {
      const { error } = await admin.from('ops_social_postings').update(patch).eq('id', a.posting_id);
      if (error) { failed++; return; }
    } else {
      // Only claim the plan if it is still unclaimed (a second sync may be running).
      const { data, error } = await admin.from('ops_social_postings')
        .update({ ...patch, external_id: a.post.external_id })
        .eq('id', a.posting_id).is('external_id', null).select('id');
      if (error || !data || data.length === 0) { failed++; return; }
      await admin.from('ops_social_videos').update({ stage: 'posted', updated_at: now }).eq('id', a.video_id);
    }
    written++;
    await fillLength(a.video_id, a.post);
  });

  // New videos one at a time: each is two writes, and the second must be undone-able.
  for (const a of plan.filter((x: Row) => x.kind === 'create') as Row[]) {
    const { data: video, error: vErr } = await admin.from('ops_social_videos')
      .insert({ title: a.post.title, stage: 'posted', imported_from: platform, length_s: lengthSeconds(a.post.duration_s) })
      .select('id').single();
    if (vErr || !video) { failed++; continue; }
    const { error: pErr } = await admin.from('ops_social_postings')
      .insert({ video_id: (video as Row).id, platform, external_id: a.post.external_id, ...postingPatch(a.post, now) });
    if (pErr) {
      // Most likely another sync wrote the same post a moment ago. Never leave an empty video behind.
      await admin.from('ops_social_videos').delete().eq('id', (video as Row).id);
      failed++;
      continue;
    }
    written++;
    created++;
  }

  if (failed > 0 && written === 0) throw new Plain('Could not save the posts.');
  return { written, created };
}

/**
 * One platform's sync. Returns null when the platform is not connected (skipped, not an error).
 * The account stage and the posts stage fail independently.
 */
async function syncPlatform(admin: Admin, platform: Platform): Promise<SyncResult | null> {
  const name = PLATFORM_NAME[platform];
  const result: SyncResult = { platform, ok: false, message: null, posts: 0, new_videos: 0, followers: null };

  const { data: account, error } = await admin.from('ops_social_accounts').select('*').eq('platform', platform).maybeSingle();
  if (error) return { ...result, message: 'Could not read the saved sign-in.' };
  if (!account || !(account as Row).access_token) return null;

  let token = '';
  try {
    token = await freshToken(admin, platform, account as Row);
  } catch (e) {
    if (e instanceof Plain && e.expired) {
      await markExpired(admin, platform);
      return { ...result, message: EXPIRED_MESSAGE };
    }
    const message = plain(e, `Could not renew the ${name} sign-in.`);
    await saveAccount(admin, platform, { last_sync_at: new Date().toISOString(), last_sync_ok: false, last_sync_message: message });
    return { ...result, message };
  }

  const problems: string[] = [];
  let expired = false;
  const caught = (e: unknown, fallback: string) => {
    if (e instanceof Plain && e.expired) expired = true;
    else problems.push(plain(e, fallback));
  };

  // Stage 1 — the account: handle, followers, today's snapshot.
  try {
    const user: Row = platform === 'tiktok' ? await tiktokUser(token) : await instagramUser(token);
    const extra = platform === 'instagram' ? await instagramAccountInsights(token) : { reach: null, link_taps: null };
    result.followers = user.followers;
    const patch: Row = {};
    if (user.handle) patch.handle = user.handle;
    if (user.external_id) patch.external_id = user.external_id;
    if (Object.keys(patch).length) await saveAccount(admin, platform, patch);

    if (user.followers === null) {
      problems.push(`${name} did not share the follower count.`);
    } else {
      // Only the columns the platform gave: an upsert never blanks a figure that is already there.
      const daily: Row = { platform, day: utcDay(Date.now()), followers: user.followers, source: 'sync', updated_at: new Date().toISOString() };
      if (extra.reach !== null) daily.reach = extra.reach;
      if (extra.link_taps !== null) daily.link_taps = extra.link_taps;
      const { error: dErr } = await admin.from('ops_social_account_daily').upsert(daily, { onConflict: 'platform,day' });
      if (dErr) problems.push('Could not save the follower count.');
    }
  } catch (e) {
    caught(e, `Could not read the ${name} account.`);
  }

  // Stage 2 — the posts.
  if (!expired) {
    try {
      let posts: Row[];
      if (platform === 'tiktok') {
        posts = await tiktokPosts(token);
      } else {
        const got = await instagramPosts(token);
        posts = got.posts;
        if (posts.length > 0 && got.insightsFailed === posts.length) {
          problems.push('Instagram shared likes and comments but not views or reach. Connect again and allow insights.');
        }
      }
      const w = await writePosts(admin, platform, posts);
      result.posts = w.written;
      result.new_videos = w.created;
    } catch (e) {
      caught(e, `Could not read the ${name} posts.`);
    }
  }

  if (expired) {
    await markExpired(admin, platform);
    return { ...result, message: EXPIRED_MESSAGE };
  }

  result.ok = problems.length === 0;
  result.message = result.ok ? null : problems.join(' ').slice(0, 500);
  await saveAccount(admin, platform, {
    last_sync_at: new Date().toISOString(),
    last_sync_ok: result.ok,
    last_sync_message: result.message,
  });
  return result;
}

async function runSync(admin: Admin, only: Platform | null): Promise<{ ok: boolean; results: SyncResult[] }> {
  const targets = (only ? [only] : PLATFORMS) as Platform[];
  const settled = await Promise.all(targets.map((p) =>
    syncPlatform(admin, p).catch((): SyncResult => ({
      platform: p, ok: false, message: `Something went wrong reading ${PLATFORM_NAME[p]}.`, posts: 0, new_videos: 0, followers: null,
    }))
  ));
  const results = settled.filter((r): r is SyncResult => r !== null);
  for (const r of results) {
    console.log(`social-sync: ${r.platform} ok=${r.ok} posts=${r.posts} new=${r.new_videos}${r.message ? ` · ${r.message}` : ''}`);
  }
  return { ok: results.every((r) => r.ok), results };
}

// ── The sign-in callback (a browser GET from TikTok or Instagram) ──

const redirect = (to: string) =>
  new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });

const deadLink = () =>
  new Response('This sign-in link is no longer valid. Go back to the CRM and press Connect again.', {
    status: 400,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });

async function handleCallback(url: URL): Promise<Response> {
  const state = url.searchParams.get('state') ?? '';
  // The state is 64 hex characters we made ourselves. Anything else never reaches the database.
  if (!/^[0-9a-f]{64}$/.test(state)) return deadLink();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  // Delete-and-return in one statement: the state works once, even if the address is opened twice.
  const { data: row, error } = await admin.from('ops_social_oauth_states').delete().eq('state', state)
    .select('platform, admin_id, return_to, created_at').maybeSingle();
  if (error || !row) return deadLink();

  const r = row as Row;
  const platform = r.platform as Platform;
  // Validated when the state was created; checked again here so a bad row can never redirect anywhere else.
  const returnTo = validateReturnTo(r.return_to, RETURN_ORIGINS);
  if (!returnTo || !isPlatform(platform)) return deadLink();
  const back = (connected: boolean) => redirect(returnUrl(returnTo, platform, connected));

  if (!stateIsFresh(r.created_at, Date.now())) return back(false);
  const code = cleanCode(url.searchParams.get('code'));
  if (url.searchParams.get('error') || !code) return back(false);
  if (missingSecrets(platform, SECRETS).length) return back(false);

  try {
    const tokens: Row = platform === 'tiktok'
      ? await tiktokToken({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI })
      : await instagramExchange(code);
    if (!tokens.ok || !tokens.access_token) return back(false);

    // Handle and id. Best effort: the sync just below reads them again.
    let user: Row = { handle: null, external_id: null };
    try {
      user = platform === 'tiktok' ? await tiktokUser(tokens.access_token) : await instagramUser(tokens.access_token);
    } catch { /* connected all the same */ }

    const saved = await saveAccount(admin, platform, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: tokens.token_expires_at ?? null,
      refresh_expires_at: tokens.refresh_expires_at ?? null,
      scopes: tokens.scopes ?? null,
      handle: user.handle ?? null,
      external_id: user.external_id ?? tokens.external_id ?? null,
      connected_at: new Date().toISOString(),
      last_sync_message: null,
    });
    if (!saved) return back(false);
  } catch {
    console.log(`social-sync: ${platform} sign-in failed`);
    return back(false);
  }

  // The account is connected. A first pull that fails is reported on the page by last_sync_message.
  await runSync(admin, platform).catch(() => null);
  return back(true);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (!url.searchParams.has('state')) return json({ error: 'bad_request' }, 400);
    return await handleCallback(url);
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Row = {};
  try {
    const b = await req.json();
    if (b && typeof b === 'object') body = b;
  } catch { /* empty body */ }
  const action = typeof body.action === 'string' ? body.action : '';

  // ── The daily cron (pg_cron → social_sync_tick, 0247). It may sync, and nothing else. ──
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== null) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: cfg } = await admin.from('ops_social_config').select('cron_secret').eq('id', true).maybeSingle();
    if (!timingSafeEqual(cronSecret, (cfg as Row | null)?.cron_secret) || action !== 'sync') {
      return json({ error: 'forbidden' }, 403);
    }
    return json(await runSync(admin, null));
  }

  // ── Operators only (AA-D26). Asked AS THE CALLER, so is_app_admin() sees their auth.uid(). ──
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization) return json({ error: 'unauthorized' }, 401);
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc('is_app_admin');
  if (adminErr || isAdmin !== true) return json({ error: 'forbidden' }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Tell the database where this function lives, so the daily cron knows where to post (0247 §5).
  const { error: cfgErr } = await admin.from('ops_social_config')
    .upsert({ id: true, function_url: REDIRECT_URI, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (cfgErr) console.error('social-sync: could not record function_url');

  const missing = { tiktok: missingSecrets('tiktok', SECRETS), instagram: missingSecrets('instagram', SECRETS) };

  if (action === 'status') {
    return json({
      ok: true,
      configured: { tiktok: missing.tiktok.length === 0, instagram: missing.instagram.length === 0 },
      missing,
      redirect_uri: REDIRECT_URI,
    });
  }

  if (action === 'connect') {
    const platform = body.platform;
    if (!isPlatform(platform)) return json({ ok: false, error: 'unknown platform' }, 400);
    if (missing[platform].length) return json({ ok: false, configured: false, missing: missing[platform] });
    const returnTo = validateReturnTo(body.return_to, RETURN_ORIGINS);
    if (!returnTo) return json({ ok: false, error: 'return_to is not an allowed address' }, 400);

    const { data: who } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    const adminId = who?.user?.id;
    if (!adminId) return json({ error: 'forbidden' }, 403);

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    // Sweep sign-ins that were started and never finished.
    await admin.from('ops_social_oauth_states').delete().lt('created_at', new Date(Date.now() - 3600_000).toISOString());
    const { error: sErr } = await admin.from('ops_social_oauth_states')
      .insert({ state, platform, admin_id: adminId, return_to: returnTo });
    if (sErr) return json({ ok: false, error: 'could not start the sign-in' }, 500);

    const clientId = platform === 'tiktok' ? SECRETS.TIKTOK_CLIENT_KEY : SECRETS.INSTAGRAM_APP_ID;
    return json({ ok: true, url: authorizeUrl(platform, { clientId, redirectUri: REDIRECT_URI, state }) });
  }

  if (action === 'sync') {
    if (body.platform !== undefined && body.platform !== null && !isPlatform(body.platform)) {
      return json({ ok: false, error: 'unknown platform' }, 400);
    }
    return json(await runSync(admin, isPlatform(body.platform) ? body.platform : null));
  }

  return json({ ok: false, error: 'unknown action' }, 400);
});
