/**
 * Forge Legacy — `recipe-link-read`: a recipe web page → the recipe, for "Paste a recipe" (PO 2026-09-27).
 *
 * ══ WHY A FUNCTION AT ALL ══
 *
 * A phone can open a recipe page itself, and the app does (`data/recipe-link-live.ts`). A BROWSER cannot:
 * the web preview's `fetch` of another site is refused by CORS before a byte arrives. This function is the
 * web's road, and the phone's fallback when a site refuses the phone.
 *
 * ══ NO MODEL, NO CREDIT ══
 *
 * The page's schema.org `Recipe` block is read by `src/domain/nutrition/recipe-text-read.ts` — the same
 * code the phone runs. Nothing is sent anywhere else, and no nutrition number on the page is read (NUT-D4).
 *
 * ══ ⚠ THIS FUNCTION FETCHES A URL SOMEONE TYPED ══
 *
 * So it will only reach the public web:
 *   · the caller must be signed in AND have Nutrition (`has_nutrition_access`, through their own JWT);
 *   · `linkTarget` refuses anything but http(s) on the default port, IP literals, and local names;
 *   · ⚠ THE ADDRESS, NOT JUST THE NAME (AI audit 11-16, P-G7): before the first fetch and before EVERY redirect hop,
 *     the name is resolved (A and AAAA, `Deno.resolveDns`) and refused if ANY address is private, reserved, loopback,
 *     link-local, CGNAT, multicast, unspecified, IPv4-mapped/compatible IPv6, ULA… (`resolvedVerdict` /
 *     `isBlockedAddress` in the domain module — pure and tested). A name that does not resolve is not fetched;
 *   · redirects are followed BY HAND, at most 4, and every hop is checked by `linkTarget` and the resolver again;
 *   · 8 s per request and 20 s for the whole run (inside the app's 30 s, contract §3), 3 MB read at most, HTML only.
 *
 * ⚠ IF THIS RUNTIME HAS NO `Deno.resolveDns` (the API missing, or denied by the platform — not a name that fails to
 *   resolve), the hostname filter is the only check, as before, and the function logs that once per instance:
 *   "[recipe-link-read] Deno.resolveDns unavailable". Check the function's logs after deploying.
 * ⚠ Resolve-then-fetch leaves a DNS-rebinding window (a TTL-0 name that answers public to the check and private to the
 *   fetch). What bounds it: the page must be HTML, only a schema.org Recipe block is read back (never the page), 3 MB,
 *   8 s, 4 hops.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { MAX_PAGE_BYTES, linkTarget, recipeFromHtml, resolvedVerdict } from '../../../src/domain/nutrition/recipe-text-read.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const FETCH_MS = 8000;
/** The whole run — every resolve and fetch — ends ≥ 10 s inside the app's 30 s (AI Sprint 1 contract §3). */
const TOTAL_MS = 20_000;
const DNS_MS = 3000;
const MAX_HOPS = 4;

type DnsRecord = 'A' | 'AAAA';
type ResolveDns = (query: string, type: DnsRecord, options?: { signal?: AbortSignal }) => Promise<string[]>;
let saidNoDns = false;

/**
 * Every address `host` resolves to, judged (P-G7). `unchecked` ONLY when the runtime has no resolver at all or the
 * platform denies it — never because of the name — so no request can switch the check off for the next one.
 */
async function checkAddresses(host: string): Promise<'ok' | 'private' | 'unresolved' | 'unchecked'> {
  const resolve = (Deno as unknown as { resolveDns?: ResolveDns }).resolveDns;
  const unchecked = () => {
    if (!saidNoDns) console.warn('[recipe-link-read] Deno.resolveDns unavailable — the hostname filter is the only SSRF check (P-G7)');
    saidNoDns = true;
    return 'unchecked' as const;
  };
  if (typeof resolve !== 'function') return unchecked();
  const lookup = async (type: DnsRecord): Promise<string[] | 'denied'> => {
    try {
      return await resolve.call(Deno, host, type, { signal: AbortSignal.timeout(DNS_MS) });
    } catch (e) {
      const name = (e as { name?: unknown } | null)?.name;
      // The API refused to run at all: a platform policy, the same for every name.
      if (name === 'PermissionDenied' || name === 'NotSupported') return 'denied';
      // No such record (NotFound), a timeout, a resolver error: nothing from this record type.
      return [];
    }
  };
  const [a, aaaa] = await Promise.all([lookup('A'), lookup('AAAA')]);
  if (a === 'denied' && aaaa === 'denied') return unchecked();
  return resolvedVerdict([...(a === 'denied' ? [] : a), ...(aaaa === 'denied' ? [] : aaaa)]);
}
/** A real browser's name. Several recipe sites answer an unknown agent with a bot page and no recipe. */
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** ⚠ The web preview calls this cross-origin: without the preflight answer the call never leaves the browser. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** The page's HTML, or why not. Redirects by hand so every hop is re-checked — the name AND what it resolves to. */
async function fetchPage(start: string): Promise<{ ok: true; html: string } | { ok: false; reason: 'unreachable' | 'bad_url' | 'social' }> {
  const deadline = Date.now() + TOTAL_MS;
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    /* P-G7: the first URL and every hop. A private address is a bad link; a name with no address is not opened. */
    const addresses = await checkAddresses(new URL(url).hostname);
    if (addresses === 'private') return { ok: false, reason: 'bad_url' };
    if (addresses === 'unresolved') return { ok: false, reason: 'unreachable' };
    const left = deadline - Date.now();
    if (left <= 0) return { ok: false, reason: 'unreachable' };
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(Math.min(FETCH_MS, left)),
      });
    } catch {
      return { ok: false, reason: 'unreachable' };
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      await res.body?.cancel();
      if (!next) return { ok: false, reason: 'unreachable' };
      const t = linkTarget(new URL(next, url).toString());
      if (t.kind !== 'ok') return { ok: false, reason: t.kind };
      url = t.url;
      continue;
    }
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/html|xml/i.test(type) || !res.body) {
      await res.body?.cancel();
      return { ok: false, reason: 'unreachable' };
    }
    // Read at most MAX_PAGE_BYTES, then stop — a page is never allowed to be a download.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_PAGE_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => undefined);
    const bytes = new Uint8Array(Math.min(size, MAX_PAGE_BYTES));
    let at = 0;
    for (const c of chunks) {
      const part = c.subarray(0, Math.max(0, bytes.length - at));
      bytes.set(part, at);
      at += part.length;
      if (at >= bytes.length) break;
    }
    return { ok: true, html: new TextDecoder().decode(bytes) };
  }
  return { ok: false, reason: 'unreachable' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }

  const target = linkTarget(typeof body.url === 'string' ? body.url.slice(0, 2000) : '');
  if (target.kind !== 'ok') return json({ ok: false, reason: target.kind });

  // The caller's JWT, so the gate runs as that athlete under RLS. No service key here.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  /*
   * 0244: importing a recipe is BUILDING one, which is Premium (the planner gate) — logging stays free. This
   * function spends no AI credit, so nothing else stands between a Free athlete and the import. On a database
   * that has not had 0244 pasted the planner gate does not exist yet, and `has_nutrition_access` is still
   * 0237's Premium rule there, so it stands in.
   */
  let gate = await supabase.rpc('has_nutrition_planner');
  if (gate.error && ['PGRST202', '42883'].includes((gate.error as { code?: string }).code ?? '')) {
    gate = await supabase.rpc('has_nutrition_access');
  }
  if (gate.error || gate.data !== true) return json({ ok: false, reason: 'no_nutrition' }, 403);

  const page = await fetchPage(target.url);
  if (!page.ok) return json({ ok: false, reason: page.reason });

  const read = recipeFromHtml(page.html);
  if (!read) return json({ ok: false, reason: 'no_recipe' });
  return json({ ok: true, read });
});
