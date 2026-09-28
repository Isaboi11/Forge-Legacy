/**
 * Forge Legacy — `asc-sync`: the ONLY way App Store Connect data reaches our database (AA-D17).
 *
 * The Creator Dashboard's App Store panel calls this with "Sync now". It pulls three things and writes
 * them into tables that are RLS-on with ZERO policies (read only through `admin_appstore`, 0236):
 *
 *   1. Daily SALES summary reports (downloads / redownloads / updates / in-app purchases / USD proceeds)
 *      → `asc_daily`, one row per (day, metric, dim). dim '' = the day's total, otherwise a country code
 *      (downloads only, to keep the row count small).
 *   2. Customer reviews → `asc_reviews`.
 *   3. The PUBLIC iTunes rating (no key needed) → stamped on this run's `asc_sync_log` row, because Apple
 *      keeps no rating history for us.
 *
 * Every run writes exactly one `asc_sync_log` row. The three stages fail independently: a broken key
 * must not stop the public rating, and a key without review access must not stop the sales pull.
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
 *   ASC_KEY_ID          the API key's Key ID (10 characters)
 *   ASC_ISSUER_ID       the team's Issuer ID (a UUID, shown above the keys list)
 *   ASC_PRIVATE_KEY     the whole .p8 file, BEGIN/END lines included. Literal "\n" sequences are accepted
 *                       too, for when the dashboard flattens it onto one line.
 *   ASC_VENDOR_NUMBER   Payments and Financial Reports → the number at the top left
 *   ASC_APP_ID          optional; defaults to 6798436104 (eas.json → ascAppId)
 *
 * Missing any of the first four: the public rating is still fetched, the log row says ok=false and names
 * exactly which secrets are missing, and the response is 200 {configured:false, missing:[...]} — the
 * dashboard shows that as a setup prompt, not an error. Runbook: Docs/App-Store-Connect-Key-Setup.md.
 *
 * ══ STATUS CODES ══
 *
 *   200 — the run happened (even if a stage failed; see `ok` and `errors[]` in the body)
 *   401 — no Authorization header
 *   403 — signed in, but not an app admin
 *   405 — not POST
 *   500 — could not even write the log row
 *
 * Errors in the body are short strings. Never secrets, never stack traces.
 *
 * ══ CORS ══
 *
 * Called from the browser (forgelegacy.expo.app) via `supabase.functions.invoke('asc-sync')`, so the
 * OPTIONS preflight MUST be answered or the call fails in the client with empty function logs — the
 * exact way food-search shipped broken the first time. Same block as every other browser-called function.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const env = (k: string) => (Deno.env.get(k) ?? '').trim();
const ASC_KEY_ID = env('ASC_KEY_ID');
const ASC_ISSUER_ID = env('ASC_ISSUER_ID');
const ASC_PRIVATE_KEY = env('ASC_PRIVATE_KEY');
const ASC_VENDOR_NUMBER = env('ASC_VENDOR_NUMBER');
const ASC_APP_ID = env('ASC_APP_ID') || '6798436104';

const ASC_API = 'https://api.appstoreconnect.apple.com';
const DEFAULT_DAYS = 14;
const MAX_DAYS = 60;
/** Always re-fetch this many most-recent days: Apple can publish a late or corrected report. */
const REFRESH_DAYS = 3;
/** A 404 on a day OLDER than this means "zero sales", so we record zeros. Newer = not published yet. */
const ZERO_AFTER_DAYS = 2;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

// ── PURE CORE START ──
// Plain JavaScript on purpose (no type annotations): the node test extracts and evaluates this block.

/** Metric names written to asc_daily. */
const METRICS = ['downloads', 'redownloads', 'updates', 'iap', 'proceeds_usd'];

/**
 * Parse Apple's tab-separated report into objects keyed by HEADER NAME. Apple has reordered and added
 * columns between report versions, so never trust a column index.
 * @param {string} text
 * @returns {Array<Record<string,string>>}
 */
function parseTsv(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const header = lines[0].split('\t').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const row = {};
    for (let c = 0; c < header.length; c++) row[header[c]] = (cells[c] ?? '').trim();
    rows.push(row);
  }
  return rows;
}

/**
 * Apple "Product Type Identifier" → our metric, or null for anything we do not count.
 * @param {string} code
 * @returns {string|null}
 */
function productTypeMetric(code) {
  const c = String(code ?? '').trim().toUpperCase();
  if (['1', '1F', '1T', 'F1'].includes(c)) return 'downloads';
  if (['3', '3F', '3T', 'F3'].includes(c)) return 'redownloads';
  if (['7', '7F', '7T', 'F7'].includes(c)) return 'updates';
  if (c.startsWith('IA') || c.startsWith('FI1')) return 'iap';
  return null;
}

/** @param {string} s @returns {number} */
function num(s) {
  const n = Number(String(s ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sum one day's report rows into asc_daily rows.
 * - App rows (downloads/redownloads/updates) count only when Apple Identifier is our app.
 * - IAP/subscription rows count as 'iap' regardless (their Apple Identifier is the IAP's own id).
 * - Downloads also get one row per country (dim = Country Code).
 * - proceeds_usd sums Developer Proceeds × Units ONLY where Currency of Proceeds is USD. Non-USD
 *   proceeds are SKIPPED, not converted — this is an at-a-glance number, not accounting.
 * Every metric's total (dim '') is always emitted, zeros included, so the day is marked as fetched.
 * @param {Array<Record<string,string>>} rows
 * @param {string} appId
 * @param {string} day YYYY-MM-DD
 * @returns {Array<{day:string, metric:string, dim:string, value:number}>}
 */
function aggregateDay(rows, appId, day) {
  const totals = {};
  for (const m of METRICS) totals[m] = 0;
  const byCountry = {};
  for (const r of rows) {
    const metric = productTypeMetric(r['Product Type Identifier']);
    if (!metric) continue;
    if (metric !== 'iap' && String(r['Apple Identifier'] ?? '').trim() !== String(appId)) continue;
    const units = num(r['Units']);
    totals[metric] += units;
    if (metric === 'downloads') {
      const cc = String(r['Country Code'] ?? '').trim().toUpperCase();
      if (cc) byCountry[cc] = (byCountry[cc] ?? 0) + units;
    }
    if (String(r['Currency of Proceeds'] ?? '').trim().toUpperCase() === 'USD') {
      totals.proceeds_usd += num(r['Developer Proceeds']) * units;
    }
  }
  totals.proceeds_usd = Math.round(totals.proceeds_usd * 100) / 100;
  const out = METRICS.map((m) => ({ day, metric: m, dim: '', value: totals[m] }));
  for (const cc of Object.keys(byCountry).sort()) {
    out.push({ day, metric: 'downloads', dim: cc, value: byCountry[cc] });
  }
  return out;
}

/** Zero rows for a day Apple has no report for (no sales that day). */
function zeroDay(day) {
  return METRICS.map((m) => ({ day, metric: m, dim: '', value: 0 }));
}

/**
 * base64url without padding, as JWS requires.
 * @param {Uint8Array|string} input bytes, or a string (encoded as UTF-8)
 * @returns {string}
 */
function base64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The last `n` UTC calendar days before `today`, oldest first, as YYYY-MM-DD. Today itself is never
 * included — Apple's daily report for a day appears the next morning at the earliest.
 * @param {Date} today
 * @param {number} n
 * @returns {string[]}
 */
function lastDays(today, n) {
  const out = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Whole days between two YYYY-MM-DD strings (b − a). */
function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

// ── PURE CORE END ──

/** Turn the .p8 PEM (real or literal "\n" newlines) into PKCS8 bytes. */
function pemToPkcs8(pem: string): Uint8Array {
  const b64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * ES256 JWT for the App Store Connect API (max lifetime 20 minutes). WebCrypto's ECDSA signature is
 * already raw r||s (64 bytes) — exactly what JWS wants. Do NOT convert it to DER.
 */
async function ascToken(): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(ASC_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const iat = Math.floor(Date.now() / 1000);
  const head = base64url(JSON.stringify({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' }));
  const body = base64url(JSON.stringify({ iss: ASC_ISSUER_ID, iat, exp: iat + 1200, aud: 'appstoreconnect-v1' }));
  const signingInput = `${head}.${body}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(sig))}`;
}

async function gunzipText(res: Response): Promise<string> {
  if (!res.body) return '';
  const stream = res.body.pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

/** A short, secret-free description of a failed Apple response. */
async function appleError(res: Response): Promise<string> {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.errors?.[0]?.code ?? j?.errors?.[0]?.title ?? '';
  } catch { /* not JSON */ }
  if (res.status === 401) return `401 key rejected${detail ? ` (${detail})` : ''}`;
  if (res.status === 403) return `403 key role lacks access${detail ? ` (${detail})` : ''}`;
  return `${res.status}${detail ? ` ${detail}` : ''}`;
}

type Admin = ReturnType<typeof createClient>;

/** Stage 1 — daily sales reports. Returns [daysFetched, downloadsInWindow]. */
async function syncSales(admin: Admin, token: string, days: number): Promise<{ fetched: number; downloads: number }> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const window = lastDays(today, days);

  const { data: have, error: haveErr } = await admin
    .from('asc_daily')
    .select('day')
    .eq('metric', 'downloads')
    .eq('dim', '')
    .gte('day', window[0]);
  if (haveErr) throw new Error('could not read asc_daily');
  const present = new Set((have ?? []).map((r: { day: string }) => String(r.day).slice(0, 10)));
  const recent = new Set(window.slice(-REFRESH_DAYS));
  const todo = window.filter((d) => !present.has(d) || recent.has(d));

  let fetched = 0;
  for (const day of todo) {
    const qs = new URLSearchParams({
      'filter[frequency]': 'DAILY',
      'filter[reportType]': 'SALES',
      'filter[reportSubType]': 'SUMMARY',
      'filter[vendorNumber]': ASC_VENDOR_NUMBER,
      'filter[reportDate]': day,
      'filter[version]': '1_1',
    });
    const res = await fetch(`${ASC_API}/v1/salesReports?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
    });
    let rows;
    if (res.status === 404) {
      await res.body?.cancel();
      // No report: not published yet (recent) or genuinely zero sales (older).
      if (daysBetween(day, todayStr) <= ZERO_AFTER_DAYS) continue;
      rows = zeroDay(day);
    } else if (!res.ok) {
      throw new Error(`${day}: ${await appleError(res)}`);
    } else {
      rows = aggregateDay(parseTsv(await gunzipText(res)), ASC_APP_ID, day);
    }
    const { error } = await admin
      .from('asc_daily')
      .upsert(rows.map((r) => ({ ...r, synced_at: new Date().toISOString() })), { onConflict: 'day,metric,dim' });
    if (error) throw new Error(`${day}: database write failed`);
    fetched++;
  }

  const { data: dl } = await admin
    .from('asc_daily')
    .select('value')
    .eq('metric', 'downloads')
    .eq('dim', '')
    .gte('day', window[0]);
  const downloads = (dl ?? []).reduce((s: number, r: { value: number }) => s + Number(r.value ?? 0), 0);
  return { fetched, downloads };
}

/** Stage 2 — customer reviews (newest 100). Returns how many were upserted. */
async function syncReviews(admin: Admin, token: string): Promise<number> {
  const res = await fetch(`${ASC_API}/v1/apps/${ASC_APP_ID}/customerReviews?sort=-createdDate&limit=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(await appleError(res));
  const body = await res.json();
  const rows = (body?.data ?? []).map((r: { id: string; attributes?: Record<string, unknown> }) => {
    const a = r.attributes ?? {};
    return {
      id: r.id,
      rating: typeof a.rating === 'number' ? a.rating : null,
      title: (a.title as string) ?? null,
      body: (a.body as string) ?? null,
      nickname: (a.reviewerNickname as string) ?? null,
      territory: (a.territory as string) ?? null,
      created_at: (a.createdDate as string) ?? null,
      synced_at: new Date().toISOString(),
    };
  });
  if (rows.length === 0) return 0;
  const { error } = await admin.from('asc_reviews').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error('database write failed');
  return rows.length;
}

/** Stage 3 — the public App Store rating. No key needed; empty before public release. */
async function fetchRating(): Promise<{ avg: number | null; count: number | null }> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${ASC_APP_ID}&country=us`);
  if (!res.ok) throw new Error(`${res.status}`);
  const r = (await res.json())?.results?.[0];
  return {
    avg: typeof r?.averageUserRating === 'number' ? r.averageUserRating : null,
    count: typeof r?.userRatingCount === 'number' ? r.userRatingCount : null,
  };
}

const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── Operators only (AA-D17). Asked AS THE CALLER, so is_app_admin() sees their auth.uid(). ──
  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization) return json({ error: 'unauthorized' }, 401);
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc('is_app_admin');
  if (adminErr || isAdmin !== true) return json({ error: 'forbidden' }, 403);

  let days = DEFAULT_DAYS;
  try {
    const b = await req.json();
    const n = Math.floor(Number(b?.days));
    if (Number.isFinite(n) && n > 0) days = Math.min(n, MAX_DAYS);
  } catch { /* empty body is fine */ }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const errors: string[] = [];
  const missing = [
    ['ASC_KEY_ID', ASC_KEY_ID],
    ['ASC_ISSUER_ID', ASC_ISSUER_ID],
    ['ASC_PRIVATE_KEY', ASC_PRIVATE_KEY],
    ['ASC_VENDOR_NUMBER', ASC_VENDOR_NUMBER],
  ].filter(([, v]) => !v).map(([k]) => k);
  const configured = missing.length === 0;

  let rating: { avg: number | null; count: number | null } = { avg: null, count: null };
  let daysFetched = 0;
  let downloads = 0;
  let reviews = 0;

  // Each stage is independent: one failing never skips the others.
  const ratingStage = fetchRating().then((r) => { rating = r; }).catch((e) => { errors.push(`rating: ${short(e)}`); });

  if (configured) {
    let token = '';
    try {
      token = await ascToken();
    } catch {
      errors.push('key: ASC_PRIVATE_KEY could not be read as a .p8 key');
    }
    if (token) {
      await Promise.all([
        syncSales(admin, token, days)
          .then((s) => { daysFetched = s.fetched; downloads = s.downloads; })
          .catch((e) => { errors.push(`sales: ${short(e)}`); }),
        syncReviews(admin, token)
          .then((n) => { reviews = n; })
          .catch((e) => { errors.push(`reviews: ${short(e)}`); }),
      ]);
    }
  }
  await ratingStage;

  const ok = configured && errors.length === 0;
  const message = !configured
    ? `not configured: missing ${missing.join(', ')}${errors.length ? ` · ${errors.join(' · ')}` : ''}`
    : errors.length
      ? `failed: ${errors.join(' · ')}`
      : `days ${daysFetched} · downloads ${downloads} · reviews ${reviews}`;

  const { error: logErr } = await admin.from('asc_sync_log').insert({
    ok,
    message: message.slice(0, 500),
    rating_avg: rating.avg,
    rating_count: rating.count,
  });
  if (logErr) {
    console.error(`asc_sync_log insert failed: ${logErr.message}`);
    return json({ ok: false, configured, error: 'could not write the sync log' }, 500);
  }

  console.log(`asc-sync: ${message}`);
  if (!configured) {
    return json({ ok: false, configured: false, missing, rating, errors });
  }
  return json({ ok, configured, days_fetched: daysFetched, downloads, reviews, rating, errors });
});
