/**
 * ══ WHICH MODEL A FUNCTION RUNS — read at runtime from `coach_ai_model_config` (0274), never a dead function ══
 *
 * (AI Road to 10 Sprint 3b, PL-7 · contract §1.2.) One SQL update switches a function's model or effort, or canaries
 * a new model to operators / a percentage of athletes. The function asks `coach_ai_model_pick(p_fn, p_uid)` with the
 * SERVICE ROLE (the table and the function have no anon/authenticated grants), keeps the answer ~60 s, and on ANY
 * failure — no row, a slow or failed read, a model or effort the code does not know — runs its in-code default.
 * A config problem can change which model answers; it can never stop the function answering.
 *
 * The canary decision is the database's (operators = `app_admins`; a percentage = a stable hash of the athlete and the
 * function), so every function and the SQL report agree on who is in it.
 *
 * ⛔ Pure and import-free (fetch, the URL, the key and the clock are passed in): the functions bundle it inline and
 * `node --test` runs it with a stub fetch.
 */

export interface ModelChoice {
  model: string;
  /** One of model-request.ts's EFFORTS, or null. */
  effort: string | null;
  /** This athlete got the canary model. */
  canary: boolean;
  /** Where the choice came from: the config row, or the in-code default (and why). */
  source: 'config' | 'default' | 'default_no_row' | 'default_read_failed' | 'default_invalid';
}

export interface ModelDefault {
  /** One of model-request.ts's KNOWN_MODELS. (No import: an inlined module may not have one.) */
  model: string;
  effort: string | null;
}

export interface ModelConfigDeps {
  /** `SUPABASE_URL`. */
  url: string | undefined;
  /** `SUPABASE_SERVICE_ROLE_KEY`. Without it the function runs its default (and says so in `source`). */
  serviceKey: string | undefined;
  fetch: (input: string, init: Record<string, unknown>) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
  now?: () => number;
  /** How long one answer is kept. */
  ttlMs?: number;
  /** The read's own deadline — the model call must not wait on the config. */
  timeoutMs?: number;
  /** The models and efforts this code knows how to send (model-request.ts). */
  known: readonly string[];
  efforts: readonly string[];
}

export const MODEL_CONFIG_TTL_MS = 60_000;
/** A failed read is remembered for less time, so a blip heals quickly without hammering the database. */
export const MODEL_CONFIG_FAIL_TTL_MS = 10_000;
export const MODEL_CONFIG_TIMEOUT_MS = 1_500;
const MODEL_CONFIG_CACHE_MAX = 500;

/** The athlete's id from a verified Bearer token (the gateway checked it — verify_jwt), or null. Never throws. */
export function uidFromAuthorization(authorization: string | null | undefined): string | null {
  try {
    const jwt = String(authorization ?? '').replace(/^Bearer\s+/i, '');
    const part = jwt.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    const sub = json?.sub;
    return typeof sub === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub) ? sub : null;
  } catch {
    return null;
  }
}

/** The RPC's row, checked against what this code can send. Anything off → the default. */
export function choiceFromRow(row: unknown, dflt: ModelDefault, deps: Pick<ModelConfigDeps, 'known' | 'efforts'>): ModelChoice {
  const r = (Array.isArray(row) ? row[0] : row) as { model?: unknown; effort?: unknown; canary?: unknown } | null | undefined;
  if (!r || typeof r !== 'object' || r.model == null) return { ...dflt, canary: false, source: 'default_no_row' };
  if (typeof r.model !== 'string' || !deps.known.includes(r.model)) return { ...dflt, canary: false, source: 'default_invalid' };
  if (r.effort != null && (typeof r.effort !== 'string' || !deps.efforts.includes(r.effort))) return { ...dflt, canary: false, source: 'default_invalid' };
  return { model: r.model, effort: (r.effort as string | null) ?? null, canary: r.canary === true, source: 'config' };
}

/**
 * A reader with its own cache. `pick(fn, uid, dflt)` resolves to a ModelChoice and never rejects.
 */
export function modelConfigReader(deps: ModelConfigDeps) {
  const now = deps.now ?? (() => Date.now());
  const ttl = deps.ttlMs ?? MODEL_CONFIG_TTL_MS;
  const cache = new Map<string, { at: number; ttl: number; choice: ModelChoice }>();

  async function read(fn: string, uid: string | null, dflt: ModelDefault): Promise<{ choice: ModelChoice; ttl: number }> {
    if (!deps.url || !deps.serviceKey) return { choice: { ...dflt, canary: false, source: 'default' }, ttl };
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const ctl = new AbortController();
      timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? MODEL_CONFIG_TIMEOUT_MS);
      const res = await deps.fetch(`${deps.url}/rest/v1/rpc/coach_ai_model_pick`, {
        method: 'POST',
        signal: ctl.signal,
        headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_fn: fn, p_uid: uid }),
      });
      if (!res.ok) return { choice: { ...dflt, canary: false, source: 'default_read_failed' }, ttl: MODEL_CONFIG_FAIL_TTL_MS };
      return { choice: choiceFromRow(await res.json(), dflt, deps), ttl };
    } catch {
      return { choice: { ...dflt, canary: false, source: 'default_read_failed' }, ttl: MODEL_CONFIG_FAIL_TTL_MS };
    } finally {
      if (timer != null) clearTimeout(timer);
    }
  }

  return {
    async pick(fn: string, uid: string | null, dflt: ModelDefault): Promise<ModelChoice> {
      const key = `${fn}|${uid ?? ''}`;
      const hit = cache.get(key);
      if (hit && now() - hit.at < hit.ttl) return hit.choice;
      const { choice, ttl: keep } = await read(fn, uid, dflt);
      if (cache.size >= MODEL_CONFIG_CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: now(), ttl: keep, choice });
      return choice;
    },
    /** For tests. */
    size: () => cache.size,
  };
}
