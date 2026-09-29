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
 *   · redirects are followed BY HAND, at most 4, and every hop is checked by `linkTarget` again;
 *   · 8 s per request, 3 MB read at most, HTML only.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { MAX_PAGE_BYTES, linkTarget, recipeFromHtml } from '../../../src/domain/nutrition/recipe-text-read.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const FETCH_MS = 8000;
const MAX_HOPS = 4;
/** A real browser's name. Several recipe sites answer an unknown agent with a bot page and no recipe. */
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** ⚠ The web preview calls this cross-origin: without the preflight answer the call never leaves the browser. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** The page's HTML, or why not. Redirects by hand so every hop is re-checked. */
async function fetchPage(start: string): Promise<{ ok: true; html: string } | { ok: false; reason: 'unreachable' | 'bad_url' | 'social' }> {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(FETCH_MS),
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
