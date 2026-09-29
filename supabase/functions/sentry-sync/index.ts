/**
 * Forge Legacy — `sentry-sync`: the ONLY way Sentry crash groups reach our database (AA-D21).
 *
 * The CRM's Bugs page calls this with the Sentry card's "Sync now". It pulls two things and writes them
 * into `sentry_issues`, which is RLS-on with ZERO policies (read only through `admin_crashes`, 0239):
 *
 *   1. The project's UNRESOLVED issues seen in the last 14 days (up to 3 pages of 100).
 *   2. For the 25 most recently seen of them, the LATEST event: its breadcrumb trail (labels only —
 *      route names and actions, never a breadcrumb's `data` body; AA-D13) and the top of its stack.
 *
 * Every run writes exactly one `ops_sync_log` row (source 'sentry'). A failed detail fetch never stops the
 * issue list from being written.
 *
 * ══ ⚠ DEPLOY WITH "VERIFY JWT" ON ══
 *
 * The caller is a signed-in operator in the browser. The platform checks the JWT; this code then asks
 * `is_app_admin()` AS THAT CALLER (anon key + their Authorization header) and refuses anyone else with a
 * 403. Only after that does it switch to the service role, which is what writes the RLS-locked tables.
 *
 * ══ ⚠ DEPLOYED BY PASTING THIS ONE FILE INTO THE SUPABASE DASHBOARD ══
 *
 * So: one self-contained file, URL imports only, no local imports. The pure logic between the
 * PURE CORE markers is plain JavaScript (no type annotations) because
 * `__tests__/core.test.mjs` cuts that block out of this file and runs it under `node --test`.
 *
 * ══ THE SECRETS (Supabase → Edge Functions → Secrets) ══
 *
 *   SENTRY_API_TOKEN   an auth token with scopes project:read + event:read
 *   SENTRY_ORG         optional; defaults to 'forge-legacy-llc'
 *   SENTRY_PROJECT     optional; defaults to 'forge-legacy'
 *   SENTRY_API_BASE    optional; defaults to 'https://sentry.io' (a regional host such as
 *                      'https://us.sentry.io' also works)
 *
 * Missing the token: the log row says ok=false and names it, and the response is
 * 200 {configured:false, missing:[...]} — the Bugs page shows that as a setup prompt, not an error.
 * Runbook: Docs/Sentry-Setup.md.
 *
 * ══ STATUS CODES ══
 *
 *   200 — the run happened (even if part failed; see `ok` and `errors[]` in the body)
 *   401 — no Authorization header
 *   403 — signed in, but not an app admin
 *   405 — not POST
 *   500 — could not even write the log row
 *
 * Errors in the body are short strings. Never secrets, never stack traces.
 *
 * ══ CORS ══
 *
 * Called from the browser (forgelegacy.expo.app) via `supabase.functions.invoke('sentry-sync')`, so the
 * OPTIONS preflight MUST be answered or the call fails in the client with empty function logs — the
 * exact way food-search shipped broken the first time. Same block as every other browser-called function.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const env = (k: string) => (Deno.env.get(k) ?? '').trim();
const SENTRY_API_TOKEN = env('SENTRY_API_TOKEN');
const SENTRY_ORG = env('SENTRY_ORG') || 'forge-legacy-llc';
const SENTRY_PROJECT = env('SENTRY_PROJECT') || 'forge-legacy';
const SENTRY_API_BASE = (env('SENTRY_API_BASE') || 'https://sentry.io').replace(/\/+$/, '');

/** Pages of 100 issues to walk through the Link header. */
const MAX_PAGES = 3;
/** How many of the most recently seen issues get their latest event fetched. */
const DETAIL_COUNT = 25;
/** Detail fetches in flight at once — kind to Sentry's rate limit. */
const DETAIL_CONCURRENCY = 5;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

// ── PURE CORE START ──
// Plain JavaScript on purpose (no type annotations): the node test extracts and evaluates this block.

/** Trail limits (AA-D13): labels only, the last 12, each at most 120 characters. */
const TRAIL_MAX = 12;
const LABEL_MAX = 120;
/** Stack: the innermost 8 frames. */
const FRAMES_MAX = 8;

/** @param {unknown} v @returns {string|null} a trimmed non-empty string, or null */
function str(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/** @param {unknown} v @returns {number} Sentry sends `count` as a string, `userCount` as a number. */
function toInt(v) {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** A release may arrive as a string or as {version}. @returns {string|null} */
function releaseOf(v) {
  if (typeof v === 'string') return str(v);
  if (v && typeof v === 'object') return str(v.version) ?? str(v.shortVersion);
  return null;
}

/**
 * One Sentry issue (from the project issues list) → a `sentry_issues` row (without trail/stack).
 * `environment` and `release` are not normally on a list item; they are kept if present, else null.
 * @param {Record<string, any>} i
 */
function mapIssue(i) {
  return {
    id: String(i?.id ?? ''),
    short_id: str(i?.shortId),
    title: str(i?.title) ?? str(i?.metadata?.title) ?? '(untitled issue)',
    culprit: str(i?.culprit),
    level: str(i?.level),
    status: str(i?.status),
    environment: str(i?.environment),
    event_count: toInt(i?.count),
    user_count: toInt(i?.userCount),
    first_seen: str(i?.firstSeen),
    last_seen: str(i?.lastSeen),
    permalink: str(i?.permalink),
    release: releaseOf(i?.release) ?? releaseOf(i?.lastRelease),
  };
}

/**
 * An event's breadcrumbs → [{label, kind}] — the LAST 12, labels trimmed to 120 characters.
 * The label is, in order: a navigation breadcrumb's `data.to` (a route name), else `message`, else
 * `category`. Nothing else from `data` is ever read (AA-D13): a request body, a params object or a
 * typed value never reaches the trail, even though the app already scrubs them.
 * @param {Record<string, any>} event
 * @returns {Array<{label:string, kind:string|null}>}
 */
function mapTrail(event) {
  const entries = Array.isArray(event?.entries) ? event.entries : [];
  const crumbs = entries.find((e) => e?.type === 'breadcrumbs');
  const values = Array.isArray(crumbs?.data?.values) ? crumbs.data.values : [];
  const out = [];
  for (const b of values) {
    const isNav = b?.category === 'navigation' || b?.type === 'navigation';
    const route = isNav ? str(b?.data?.to) : null;
    const label = route ?? str(b?.message) ?? str(b?.category);
    if (!label) continue;
    const kind = str(b?.category) ?? str(b?.type);
    out.push({ label: label.slice(0, LABEL_MAX), kind: kind ? kind.slice(0, 40) : null });
  }
  return out.slice(-TRAIL_MAX);
}

/**
 * An event's exception → "Type: value" then the innermost 8 frames, newest first, one per line as
 * "function (filename:lineNo)". Sentry lists frames oldest-first, so the last 8 are reversed.
 * @param {Record<string, any>} event
 * @returns {string|null}
 */
function formatStack(event) {
  const entries = Array.isArray(event?.entries) ? event.entries : [];
  const exc = entries.find((e) => e?.type === 'exception');
  const v = exc?.data?.values?.[0];
  if (!v) return null;
  const type = str(v.type) ?? 'Error';
  const value = str(v.value);
  const lines = [value ? `${type}: ${value}` : type];
  const frames = Array.isArray(v?.stacktrace?.frames) ? v.stacktrace.frames : [];
  for (const f of frames.slice(-FRAMES_MAX).reverse()) {
    const fn = str(f?.function) ?? '?';
    const file = str(f?.filename) ?? str(f?.module) ?? str(f?.absPath) ?? '?';
    const line = Number.isFinite(f?.lineNo) ? `:${f.lineNo}` : '';
    lines.push(`${fn} (${file}${line})`);
  }
  return lines.join('\n').slice(0, 4000);
}

/** The event's environment tag, if any. */
function eventEnvironment(event) {
  const tags = Array.isArray(event?.tags) ? event.tags : [];
  const t = tags.find((x) => x?.key === 'environment');
  return str(t?.value) ?? str(event?.environment);
}

/**
 * Sentry's Link header → the next page's cursor, or null. Sentry always sends a rel="next" link; it only
 * means there IS a next page when it also says results="true".
 * @param {string|null} header
 * @returns {string|null}
 */
function nextCursor(header) {
  if (!header) return null;
  for (const part of String(header).split(',')) {
    if (!/rel="next"/.test(part)) continue;
    if (!/results="true"/.test(part)) return null;
    const m = part.match(/cursor="([^"]+)"/);
    return m ? m[1] : null;
  }
  return null;
}

/** The `n` most recently seen issues (by last_seen, newest first). */
function mostRecent(rows, n) {
  return [...rows]
    .sort((a, b) => Date.parse(b.last_seen ?? '') - Date.parse(a.last_seen ?? '') || 0)
    .slice(0, n);
}

// ── PURE CORE END ──

/** A short, secret-free description of a failed Sentry response. */
function sentryError(status: number): string {
  if (status === 401 || status === 403) return `${status} token rejected / lacks event:read`;
  if (status === 404) return '404 organization or project not found (check SENTRY_ORG / SENTRY_PROJECT)';
  if (status === 429) return '429 rate limited — try again in a minute';
  return String(status);
}

async function sentryGet(path: string): Promise<Response> {
  return await fetch(`${SENTRY_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${SENTRY_API_TOKEN}`, Accept: 'application/json' },
  });
}

type Row = Record<string, unknown>;

/** Stage 1 — unresolved issues from the last 14 days, up to MAX_PAGES pages. */
async function fetchIssues(): Promise<Row[]> {
  const out: Row[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ statsPeriod: '14d', query: 'is:unresolved', limit: '100' });
    if (cursor) qs.set('cursor', cursor);
    const res = await sentryGet(`/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?${qs}`);
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(sentryError(res.status));
    }
    const body = await res.json();
    for (const i of Array.isArray(body) ? body : []) {
      const row = mapIssue(i);
      if (row.id) out.push(row);
    }
    cursor = nextCursor(res.headers.get('Link'));
    if (!cursor) break;
  }
  return out;
}

/** Stage 2 — one issue's latest event → {trail, stack, release?, environment?}. */
async function fetchDetail(id: string): Promise<Row> {
  const res = await sentryGet(`/api/0/organizations/${SENTRY_ORG}/issues/${encodeURIComponent(id)}/events/latest/`);
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(sentryError(res.status));
  }
  const ev = await res.json();
  const d: Row = { trail: mapTrail(ev), stack: formatStack(ev) };
  const rel = releaseOf(ev?.release);
  if (rel) d.release = rel;
  const envName = eventEnvironment(ev);
  if (envName) d.environment = envName;
  return d;
}

const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── Operators only (AA-D21). Asked AS THE CALLER, so is_app_admin() sees their auth.uid(). ──
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization) return json({ error: 'unauthorized' }, 401);
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc('is_app_admin');
  if (adminErr || isAdmin !== true) return json({ error: 'forbidden' }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const missing = SENTRY_API_TOKEN ? [] : ['SENTRY_API_TOKEN'];

  if (missing.length) {
    const { error: logErr } = await admin.from('ops_sync_log').insert({
      source: 'sentry',
      ok: false,
      message: `not configured: missing ${missing.join(', ')}`,
    });
    if (logErr) return json({ ok: false, configured: false, error: 'could not write the sync log' }, 500);
    return json({ ok: false, configured: false, missing });
  }

  const errors: string[] = [];
  let issues: Row[] = [];
  let details = 0;

  try {
    issues = await fetchIssues();
  } catch (e) {
    errors.push(`issues: ${short(e)}`);
  }

  if (issues.length) {
    // Details for the most recently seen; a failure on one never drops the others.
    const want = mostRecent(issues, DETAIL_COUNT) as Row[];
    const byId = new Map(issues.map((r) => [r.id as string, r]));
    const detailErrors = new Set<string>();
    for (let i = 0; i < want.length; i += DETAIL_CONCURRENCY) {
      await Promise.all(
        want.slice(i, i + DETAIL_CONCURRENCY).map((r) =>
          fetchDetail(r.id as string)
            .then((d) => {
              Object.assign(byId.get(r.id as string)!, d);
              details++;
            })
            .catch((e) => { detailErrors.add(short(e)); }),
        ),
      );
    }
    for (const m of detailErrors) errors.push(`details: ${m}`);

    // Rows WITHOUT a detail leave trail/stack (and a null environment/release) as they are: supabase-js
    // sends one column list per call, so rows are grouped by their key set before upserting.
    const now = new Date().toISOString();
    const groups = new Map<string, Row[]>();
    for (const r of issues) {
      const row: Row = { ...r, synced_at: now };
      if (row.environment == null) delete row.environment;
      if (row.release == null) delete row.release;
      const sig = Object.keys(row).sort().join(',');
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig)!.push(row);
    }
    for (const rows of groups.values()) {
      const { error } = await admin.from('sentry_issues').upsert(rows, { onConflict: 'id' });
      if (error) {
        errors.push('database write failed');
        break;
      }
    }
  }

  const ok = errors.length === 0;
  const message = ok
    ? `issues ${issues.length} · details ${details}`
    : `failed: ${errors.join(' · ')}${issues.length ? ` · issues ${issues.length} · details ${details}` : ''}`;

  const { error: logErr } = await admin.from('ops_sync_log').insert({
    source: 'sentry',
    ok,
    message: message.slice(0, 500),
  });
  if (logErr) {
    console.error(`ops_sync_log insert failed: ${logErr.message}`);
    return json({ ok: false, configured: true, error: 'could not write the sync log' }, 500);
  }

  console.log(`sentry-sync: ${message}`);
  return json({ ok, configured: true, issues: issues.length, details, errors });
});
