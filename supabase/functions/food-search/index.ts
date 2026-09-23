/**
 * Forge Legacy — `food-search`: the ONE place a food comes from outside Forge.
 *
 * Nutrition-Architecture-v1.0 §4/§5. Three sources behind one shape, so the app never learns a vendor's
 * name and a vendor can be dropped without touching a screen:
 *
 *   1. **USDA FoodData Central** — primary. CC0 public domain, so a log row may keep its numbers forever.
 *   2. **Open Food Facts** — barcode fallback. ⚠ ODbL share-alike: its rows are kept in their own table,
 *      never merged with ours, and are labelled "Community data" in the UI.
 *   3. **FatSecret** — restaurants and branded misses. **WRITTEN AND DORMANT** (see below).
 *
 * ══ ⚠ WHY FATSECRET IS DORMANT ══
 *
 * The licence half is DONE: `Docs/Legal/FatSecret-Storage-Permission-2026-09-22.md` — a diary entry may
 * keep its calories and macros permanently (that is why `mayStoreMacros` is true for `fs` and
 * `mayStoreMicros` is not). The blocker is mechanical: FatSecret issues OAuth2 tokens **only to IP
 * addresses allowlisted in advance**, and Supabase Edge Functions egress from rotating AWS addresses.
 *
 * ⚠ **A RELAY IS NOT REQUIRED.** FatSecret said so in writing on 2026-09-22 (second email, recorded in
 * the same Legal file): a dynamic-IP host is handled either by a static-IP proxy *or* by allowlisting
 * `0.0.0.0/0`, which they permit and merely do not recommend. So waking this source up is two console
 * steps by the PO and no code:
 *
 *   1. FatSecret console → IP Whitelisting → `0.0.0.0/0`
 *   2. Supabase → Edge Functions → Secrets → `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`
 *
 * Until those secrets exist they are simply unset and `fatsecretSearch` never runs — no code change, no
 * redeploy, nothing to remember. Set them and restaurants appear on the next call.
 *
 * ══ ATTRIBUTION IS A CONDITION OF THE LICENCE ══
 *
 * Every result carries `attribution`. FatSecret's is "Powered by fatsecret", and their Premier Free terms
 * require it wherever their data is shown; Open Food Facts requires ODbL credit. The client renders
 * whatever this field says — it is not decoration and must not be dropped in a layout pass.
 *
 * ══ THE CACHE ══
 *
 * A fetched food is upserted into `food_catalog` so the same search does not spend another USDA call
 * (their API allows 1,000/hr, which is the real ceiling at our size). This is the ONLY write here, it is
 * confined to that one reference table, and it is why this function — unlike `coach-interpret`, which
 * deliberately holds no service key — uses the service role: `food_catalog` is readable by every athlete
 * and writable by nobody, so the cache cannot be poisoned from a device.
 * ⚠ Open Food Facts rows are cached under `source='off'` and MUST NOT be copied into a USDA row.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

/** USDA's own key. `DEMO_KEY` works but is limited to 30 requests/hr — set the real one before testers. */
const FDC_KEY = Deno.env.get('FDC_API_KEY') ?? 'DEMO_KEY';
const FS_ID = Deno.env.get('FATSECRET_CLIENT_ID');
const FS_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET');

const OFF_UA = 'ForgeLegacy/1.0 (support@forgelegacy.app)'; // Open Food Facts requires a real User-Agent.

interface Serving {
  label: string;
  grams: number | null;
}

interface Food {
  key: string; // `<source>:<id>`
  source: 'usda' | 'off' | 'fs';
  sourceId: string;
  name: string;
  brand: string | null;
  gtin: string | null;
  /** Per 100 g. Null when a source gives only a labelled serving. */
  kcal100: number | null;
  protein100: number | null;
  carb100: number | null;
  fat100: number | null;
  servings: Serving[];
  micros: Record<string, number> | null;
  attribution: string | null;
}

/**
 * ⚠ CORS IS NOT OPTIONAL HERE, AND ITS ABSENCE IS INVISIBLE FROM THE SERVER SIDE.
 *
 * The PO reviews on the web preview, so every call to this function is a cross-origin browser request:
 * the browser sends an OPTIONS preflight first and refuses to make the real call unless it is answered
 * with these headers. Without them `supabase.functions.invoke` fails in the client before the function
 * ever runs — the function's own logs stay empty, its own URL answers fine to curl, and the app simply
 * shows no search results. That is exactly how this shipped the first time: searching "chicken" returned
 * nothing, with a healthy function at the other end. Every other Forge function carries the same block.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

/** GTIN-14, left-padded — a UPC-A on a package and the same product in USDA differ only by padding. */
function normaliseGtin(raw: string): string {
  return raw.replace(/\D/g, '').padStart(14, '0').slice(-14);
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

// ── USDA FoodData Central ────────────────────────────────────────────────────

/** USDA nutrient numbers are stable across datasets; names are not, so match on the number. */
const FDC_NUTRIENT = { kcal: '208', protein: '203', fat: '204', carb: '205' } as const;

/**
 * The extras `Food Detail.dc.html` lists under "More nutrients". Stored per 100 g in `micros` and scaled
 * on the screen.
 *
 * ⚠ USDA AND OPEN FOOD FACTS ONLY. The FatSecret permission covers calories and macros; nothing here may
 * be kept from `fs`, which is why `fsFood` leaves `micros` null and this map is used nowhere near it.
 */
const FDC_MICRO: Record<string, string> = {
  '291': 'fiber',
  '269': 'sugar',
  '606': 'satFat',
  '307': 'sodium',
  '601': 'cholesterol',
};

function fdcFood(hit: Record<string, any>): Food {
  const byNumber = new Map<string, number>();
  for (const n of hit.foodNutrients ?? []) {
    const number = String(n.nutrientNumber ?? n.nutrient?.number ?? '');
    const value = num(n.value ?? n.amount);
    if (number && value != null) byNumber.set(number, value);
  }

  // Branded foods report per 100 g already; `servingSize` is the label serving on top of that.
  const servings: Serving[] = [{ label: '100 g', grams: 100 }];
  const size = num(hit.servingSize);
  if (size && (hit.servingSizeUnit === 'g' || hit.servingSizeUnit === 'ml')) {
    const label = hit.householdServingFullText || `${size} ${hit.servingSizeUnit}`;
    servings.unshift({ label: String(label), grams: size });
  } else if (hit.householdServingFullText) {
    servings.unshift({ label: String(hit.householdServingFullText), grams: null });
  }

  const micros: Record<string, number> = {};
  for (const [number, key] of Object.entries(FDC_MICRO)) {
    const value = byNumber.get(number);
    // A nutrient the dataset never measured is left OUT, not zeroed — the screen omits what it lacks.
    if (value != null) micros[key] = value;
  }

  const id = String(hit.fdcId);
  return {
    key: `usda:${id}`,
    source: 'usda',
    sourceId: id,
    name: String(hit.description ?? '').trim(),
    brand: hit.brandName ?? hit.brandOwner ?? null,
    gtin: hit.gtinUpc ? normaliseGtin(String(hit.gtinUpc)) : null,
    kcal100: byNumber.get(FDC_NUTRIENT.kcal) ?? null,
    protein100: byNumber.get(FDC_NUTRIENT.protein) ?? null,
    carb100: byNumber.get(FDC_NUTRIENT.carb) ?? null,
    fat100: byNumber.get(FDC_NUTRIENT.fat) ?? null,
    servings,
    micros: Object.keys(micros).length ? micros : null,
    attribution: null, // CC0 — a citation is requested, never required.
  };
}

async function usdaSearch(query: string, limit: number): Promise<Food[]> {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('api_key', FDC_KEY);
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', String(limit));
  // Generic foods first: they are what someone typing "chicken breast" means, and they carry full
  // nutrient panels. Branded follows for the packaged case.
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded');

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return [];
  const body = await res.json();
  return (body.foods ?? []).map(fdcFood).filter((f: Food) => f.name && f.kcal100 != null);
}

async function usdaBarcode(gtin: string): Promise<Food[]> {
  // USDA has no barcode endpoint; the Branded set carries `gtinUpc` and the search index covers it.
  const found = await usdaSearch(gtin.replace(/^0+/, ''), 5);
  return found.filter((f) => f.gtin && f.gtin === gtin);
}

// ── Open Food Facts (barcode fallback) ───────────────────────────────────────

/** Open Food Facts' own nutrient keys, per 100 g. Sodium is reported in grams; the UI wants mg. */
function offMicros(n: Record<string, unknown>): Record<string, number> | null {
  const out: Record<string, number> = {};
  const fiber = num(n['fiber_100g']);
  const sugar = num(n['sugars_100g']);
  const satFat = num(n['saturated-fat_100g']);
  const sodium = num(n['sodium_100g']);
  if (fiber != null) out.fiber = fiber;
  if (sugar != null) out.sugar = sugar;
  if (satFat != null) out.satFat = satFat;
  if (sodium != null) out.sodium = sodium * 1000;
  return Object.keys(out).length ? out : null;
}

async function offBarcode(gtin: string): Promise<Food[]> {
  const code = gtin.replace(/^0+/, '');
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
    headers: { 'user-agent': OFF_UA, accept: 'application/json' },
  });
  if (!res.ok) return [];
  const body = await res.json();
  if (body.status !== 1 || !body.product) return [];

  const p = body.product;
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']);
  if (!p.product_name || kcal == null) return [];

  const servings: Serving[] = [{ label: '100 g', grams: 100 }];
  const servingGrams = num(p.serving_quantity);
  if (p.serving_size) servings.unshift({ label: String(p.serving_size), grams: servingGrams });

  return [
    {
      key: `off:${code}`,
      source: 'off',
      sourceId: code,
      name: String(p.product_name).trim(),
      brand: p.brands ?? null,
      gtin,
      kcal100: kcal,
      protein100: num(n.proteins_100g),
      carb100: num(n.carbohydrates_100g),
      fat100: num(n.fat_100g),
      servings,
      micros: offMicros(n),
      attribution: 'Data from Open Food Facts (ODbL)',
    },
  ];
}

// ── FatSecret (dormant until the two secrets exist) ──────────────────────────

let fsToken: { value: string; expiresAt: number } | null = null;

async function fatsecretToken(): Promise<string | null> {
  if (!FS_ID || !FS_SECRET) return null;
  if (fsToken && fsToken.expiresAt > Date.now() + 30_000) return fsToken.value;

  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${FS_ID}:${FS_SECRET}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    // `barcode` is its own scope and is Premier-only; `basic` alone cannot look a UPC up.
    body: 'grant_type=client_credentials&scope=basic barcode',
  });
  // ⚠ The expected failure here is an un-allowlisted IP (see the header). It is not an outage, and it
  // must not take the whole search down — the caller treats an empty list as "this source had nothing".
  if (!res.ok) return null;

  const body = await res.json();
  if (!body.access_token) return null;
  fsToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 86_400) * 1000 };
  return fsToken.value;
}

function fsFood(food: Record<string, any>): Food | null {
  const id = String(food.food_id ?? '');
  // `food.get` returns every serving; `foods.search` returns a summary line instead. Prefer real servings.
  const list = food.servings?.serving;
  const servings: Serving[] = (Array.isArray(list) ? list : list ? [list] : []).map((s: any) => ({
    label: String(s.serving_description ?? '1 serving'),
    grams: num(s.metric_serving_amount),
  }));
  const first = Array.isArray(list) ? list[0] : list;
  if (!id || !food.food_name || !first) return null;

  const grams = num(first.metric_serving_amount) ?? 100;
  const per100 = (v: unknown) => {
    const n = num(v);
    return n == null || grams <= 0 ? null : (n * 100) / grams;
  };

  return {
    key: `fs:${id}`,
    source: 'fs',
    sourceId: id,
    name: String(food.food_name).trim(),
    brand: food.brand_name ?? null,
    gtin: null,
    kcal100: per100(first.calories),
    protein100: per100(first.protein),
    carb100: per100(first.carbohydrate),
    fat100: per100(first.fat),
    servings: servings.length ? servings : [{ label: '100 g', grams: 100 }],
    // ⚠ Micronutrients are NOT covered by the storage permission — calories and macros only.
    micros: null,
    attribution: 'Powered by fatsecret',
  };
}

async function fatsecretSearch(query: string, limit: number): Promise<Food[]> {
  const token = await fatsecretToken();
  if (!token) return [];
  const url = new URL('https://platform.fatsecret.com/rest/foods/search/v3');
  url.searchParams.set('search_expression', query);
  url.searchParams.set('max_results', String(limit));
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const body = await res.json();
  const foods = body.foods_search?.results?.food ?? body.foods?.food ?? [];
  return (Array.isArray(foods) ? foods : [foods]).map(fsFood).filter(Boolean) as Food[];
}

/**
 * One FatSecret food, fresh, by the id a diary row kept.
 *
 * This is the other half of the 24-hour rule: we are not allowed to *hold* their nutrition in the shared
 * catalogue, but we are allowed to *ask again* whenever a screen needs it. Food Detail on an expired row
 * lands here. Returns null while dormant, exactly like search.
 */
async function fatsecretFoodById(id: string): Promise<Food | null> {
  const token = await fatsecretToken();
  if (!token) return null;
  const url = new URL('https://platform.fatsecret.com/rest/food/v4');
  url.searchParams.set('food_id', id);
  url.searchParams.set('format', 'json');
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const body = await res.json();
  return body.food ? fsFood(body.food) : null;
}

// ── The cache ────────────────────────────────────────────────────────────────

/*
 * ══ ⚠ FATSECRET ROWS EXPIRE. USDA ROWS DO NOT. ══
 *
 * `Docs/Legal/FatSecret-Storage-Permission-2026-09-22.md`: their written permission covers a logged
 * food's calories and macros inside the athlete's OWN diary — `food_log_entries` snapshots those at log
 * time and keeps them forever, which is allowed. It does NOT cover `food_catalog`, which is shared
 * reference data every signed-in athlete can read; there their terms are the standard 24-hour rule.
 *
 * So an `fs` row here is a short-lived cache, not a copy of their catalogue. It is purged after
 * `FS_TTL_MS` and never served past it — on a miss we re-read the food by `source_id`, which is exactly
 * what the licence asks for. USDA is CC0 and OFF is ODbL-with-credit, so neither expires.
 */
const FS_TTL_MS = 24 * 60 * 60 * 1000;

const fsExpiry = () => new Date(Date.now() - FS_TTL_MS).toISOString();

/** Drop every FatSecret row we are no longer licensed to hold. Cheap, indexed, and safe to over-call. */
async function purgeStaleFatSecret(admin: ReturnType<typeof createClient>): Promise<void> {
  await admin.from('food_catalog').delete().eq('source', 'fs').lt('fetched_at', fsExpiry());
}

async function cache(foods: Food[]): Promise<void> {
  if (!foods.length) return;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  await admin.from('food_catalog').upsert(
    foods.map((f) => ({
      key: f.key,
      source: f.source,
      source_id: f.sourceId,
      name: f.name,
      brand: f.brand,
      gtin: f.gtin,
      kcal_100: f.kcal100,
      protein_100: f.protein100,
      carb_100: f.carb100,
      fat_100: f.fat100,
      servings: f.servings,
      micros: f.micros,
      fetched_at: new Date().toISOString(),
    })),
    { onConflict: 'key' },
  );
  await purgeStaleFatSecret(admin);
}

/** Ours first, and never a paid lookup for something we already hold — but never a stale `fs` row either. */
async function cached(query: string, limit: number): Promise<Food[]> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data } = await admin
    .from('food_catalog')
    .select('key, source, source_id, name, brand, gtin, kcal_100, protein_100, carb_100, fat_100, servings, micros')
    .ilike('name', `%${query}%`)
    // A FatSecret row past its 24 hours is treated as absent even if the purge has not run yet, so the
    // TTL holds whatever else happens. `or` reads as: not FatSecret, OR fetched within the window.
    .or(`source.neq.fs,fetched_at.gte.${fsExpiry()}`)
    .limit(limit);
  return (data ?? []).map((r: Record<string, any>) => ({
    key: r.key,
    source: r.source,
    sourceId: r.source_id,
    name: r.name,
    brand: r.brand,
    gtin: r.gtin,
    kcal100: r.kcal_100,
    protein100: r.protein_100,
    carb100: r.carb_100,
    fat100: r.fat_100,
    servings: r.servings ?? [],
    micros: r.micros,
    attribution: r.source === 'off' ? 'Data from Open Food Facts (ODbL)' : r.source === 'fs' ? 'Powered by fatsecret' : null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Signed-in athletes only — this spends a rate limit that belongs to everyone.
  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } } });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  /*
   * ══ 0206 — NUTRITION IS A PREVIEW, AND THIS IS THE HALF THAT COSTS MONEY ══
   *
   * PO, 2026-09-22: only his own account and `claudetest` may use Nutrition until it is finished. The
   * RLS gate on the seven tables stops a stranger reading or writing food data; it does NOT stop them
   * calling THIS, and every miss here spends the project's FatSecret/FDC quota. So the allowlist is
   * checked before any outbound request.
   *
   * `has_nutrition_access()` is zero-argument and reads `auth.uid()`, so it is asked through the
   * CALLER's client (anon key + their Authorization header) — never through the service role, which
   * would have no `auth.uid()` and would answer false for everybody. Same shape as the `is_app_admin()`
   * checks in the admin functions.
   *
   * 403 rather than 401: they are signed in, they are simply not on the list. The client hides the tab,
   * so reaching this means someone called it directly.
   */
  const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
  if (gateError || mayUseNutrition !== true) return json({ error: 'nutrition_preview_only' }, 403);

  let body: { q?: string; barcode?: string; key?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const limit = Math.min(Math.max(body.limit ?? 25, 1), 50);

  /*
   * ── One food by key — what Food Detail opens on for a source that expires ──
   *
   * `fetchFoodByKey` reads `food_catalog` directly for every other source, because a USDA row is ours
   * forever. An `fs:` key cannot be answered that way: the row is gone 24 hours after it was fetched,
   * and "this food is gone" is the wrong thing to show for a meal the athlete logged last week. So the
   * client routes `fs:` here, and we re-read it from FatSecret — which is what the licence asks for
   * instead of holding the data.
   *
   * The diary is unaffected either way: `food_log_entries` snapshotted its calories and macros at log
   * time under the written permission, so the day's totals never depend on this call succeeding.
   */
  if (body.key) {
    const key = body.key.trim();
    if (!key.startsWith('fs:')) return json({ error: 'bad_request' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: fresh } = await admin
      .from('food_catalog')
      .select('key, source, source_id, name, brand, gtin, kcal_100, protein_100, carb_100, fat_100, servings, micros')
      .eq('key', key)
      .gte('fetched_at', fsExpiry())
      .maybeSingle();

    if (fresh) {
      const r = fresh as Record<string, any>;
      return json({
        foods: [
          {
            key: r.key,
            source: r.source,
            sourceId: r.source_id,
            name: r.name,
            brand: r.brand,
            gtin: r.gtin,
            kcal100: r.kcal_100,
            protein100: r.protein_100,
            carb100: r.carb_100,
            fat100: r.fat_100,
            servings: r.servings ?? [],
            micros: r.micros,
            attribution: 'Powered by fatsecret',
          },
        ],
      });
    }

    const food = await fatsecretFoodById(key.slice(3)).catch(() => null);
    if (!food) return json({ foods: [] });
    await cache([food]);
    return json({ foods: [food] });
  }

  // ── Barcode: exact, and the order matters. USDA first (CC0), OFF second (ODbL, community-quality).
  if (body.barcode) {
    const gtin = normaliseGtin(body.barcode);
    if (gtin.replace(/0/g, '') === '') return json({ foods: [] });

    const { data: hit } = await supabase.from('food_catalog').select('key').eq('gtin', gtin).limit(1);
    if (hit?.length) {
      const rows = await cached('', limit);
      const found = rows.filter((f) => f.gtin === gtin);
      if (found.length) return json({ foods: found });
    }

    let foods = await usdaBarcode(gtin);
    if (!foods.length) foods = await offBarcode(gtin);
    await cache(foods);
    return json({ foods });
  }

  const q = (body.q ?? '').trim();
  if (q.length < 2) return json({ foods: [] });

  const ours = await cached(q, limit);
  if (ours.length >= limit) return json({ foods: ours });

  // Sources run in parallel: a slow or dormant one must not hold up the rest of the results.
  const [usda, fs] = await Promise.all([
    usdaSearch(q, limit - ours.length).catch(() => []),
    fatsecretSearch(q, 10).catch(() => []),
  ]);

  const fetched = [...usda, ...fs];
  await cache(fetched);

  // De-duplicate by key, ours first — a cached row and a fresh one are the same food.
  const seen = new Set(ours.map((f) => f.key));
  const merged = [...ours];
  for (const f of fetched) {
    if (seen.has(f.key)) continue;
    seen.add(f.key);
    merged.push(f);
  }

  return json({ foods: merged.slice(0, limit) });
});
