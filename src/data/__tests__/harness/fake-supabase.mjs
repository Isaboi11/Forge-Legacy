/**
 * An in-memory Supabase for driving `src/data/*-live.ts` under `node --test` — the REAL data layer, not a copy
 * of its logic. Tables are arrays of plain rows; the query builder answers `{ data, error }` exactly as
 * supabase-js does (it never throws).
 *
 * Two switches reproduce the two conditions the data layer is built around:
 *  · `db.offline = true`   — every call fails in TRANSPORT (postgrest-js's empty-code shape), so writes are
 *                            held in the outbox and reads fall back to the cache.
 *  · `db.missing = Set`    — columns that do not exist yet (a migration not pasted): selecting, filtering
 *                            or writing one answers Postgres's 42703.
 */

export const ATHLETE = '00000000-0000-4000-8000-000000000001';

export const db = {
  tables: new Map(),
  offline: false,
  missing: new Set(),
  /** Every write the server accepted, in order — for asserting what reached the database. */
  log: [],
  reset() {
    this.tables = new Map();
    this.offline = false;
    this.missing = new Set();
    this.log = [];
    this.fail = null;
    this.rpcs = {};
  },
  rows(table) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table);
  },
};

const TRANSPORT = { code: '', message: 'TypeError: Network request failed', details: '', hint: '' };
const missingErr = (col) => ({ code: '42703', message: `column food_log_entries.${col} does not exist`, details: null, hint: null });

/** `a, b, c, kids(x, y)` → { cols: [a,b,c], embeds: { kids: [x,y] } }. `*` → all. */
function parseSelect(sel) {
  const embeds = {};
  const stripped = sel.replace(/(\w+)\(([^)]*)\)/g, (_, name, inner) => {
    embeds[name] = inner.split(',').map((s) => s.trim()).filter(Boolean);
    return '';
  });
  const cols = stripped.split(',').map((s) => s.trim()).filter(Boolean);
  return { cols, embeds };
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.mode = 'select';
    this.sel = '*';
    this.orders = [];
    this.lim = null;
    this.one = null; // 'maybe' | 'single'
    this.payload = null;
    this.conflict = null;
    this.selectAfter = false;
  }
  select(sel = '*') {
    if (this.mode === 'select') this.sel = sel;
    else {
      this.selectAfter = true;
      this.sel = sel;
    }
    return this;
  }
  eq(c, v) { this.filters.push((r) => r[c] === v); this.cols = [...(this.cols ?? []), c]; return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); this.cols = [...(this.cols ?? []), c]; return this; }
  gt(c, v) { this.filters.push((r) => r[c] > v); this.cols = [...(this.cols ?? []), c]; return this; }
  gte(c, v) { this.filters.push((r) => r[c] >= v); this.cols = [...(this.cols ?? []), c]; return this; }
  lte(c, v) { this.filters.push((r) => r[c] <= v); this.cols = [...(this.cols ?? []), c]; return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  not(c, op, v) {
    if (op === 'is' && v === null) this.filters.push((r) => r[c] != null);
    return this;
  }
  order(c, o = {}) { this.orders.push([c, o.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  single() { this.one = 'single'; return this; }
  upsert(p, o = {}) { this.mode = 'upsert'; this.payload = Array.isArray(p) ? p : [p]; this.conflict = o.onConflict ?? 'id'; return this; }
  insert(p) { this.mode = 'insert'; this.payload = Array.isArray(p) ? p : [p]; return this; }
  update(p) { this.mode = 'update'; this.payload = p; return this; }
  delete() { this.mode = 'delete'; return this; }

  then(res, rej) {
    return Promise.resolve().then(() => this.run()).then(res, rej);
  }

  run() {
    if (db.offline) return { data: null, error: TRANSPORT };
    /* A write the server REFUSES (not a transport failure): `db.fail = (table, mode) => error | null`. */
    const refused = db.fail?.(this.table, this.mode);
    if (refused) return { data: null, error: refused };
    const rows = db.rows(this.table);
    const bad = (cols) => cols.find((c) => db.missing.has(c));

    if (this.mode === 'select' || this.selectAfter) {
      const { cols } = parseSelect(this.sel);
      const m = bad([...cols, ...(this.cols ?? [])]);
      if (m) return { data: null, error: missingErr(m) };
    }

    if (this.mode === 'upsert' || this.mode === 'insert') {
      for (const p of this.payload) {
        const m = bad(Object.keys(p));
        if (m) return { data: null, error: missingErr(m) };
      }
      const keys = this.conflict ? this.conflict.split(',') : null;
      const written = [];
      for (const p of this.payload) {
        const at = keys ? rows.findIndex((r) => keys.every((k) => r[k] === p[k])) : -1;
        if (at >= 0) rows[at] = { ...rows[at], ...p };
        else rows.push({ ...defaults(this.table), ...p, created_at: p.created_at ?? new Date(Date.now() + rows.length).toISOString() });
        written.push(at >= 0 ? rows[at] : rows[rows.length - 1]);
      }
      db.log.push({ table: this.table, mode: this.mode, payload: this.payload });
      if (this.selectAfter) return { data: this.one ? written[0] : written, error: null };
      return { data: null, error: null };
    }

    const hit = rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.mode === 'update') {
      const m = bad(Object.keys(this.payload));
      if (m) return { data: null, error: missingErr(m) };
      for (const r of hit) Object.assign(r, this.payload);
      db.log.push({ table: this.table, mode: 'update', payload: this.payload, n: hit.length });
      return { data: null, error: null };
    }
    if (this.mode === 'delete') {
      db.tables.set(this.table, rows.filter((r) => !hit.includes(r)));
      db.log.push({ table: this.table, mode: 'delete', n: hit.length });
      /* `.delete().select()` answers with the rows that went, as PostgREST does — an empty array is how a
         delete RLS did not admit looks to the client: no error, nothing removed. */
      return { data: this.selectAfter ? hit : null, error: null };
    }

    let out = [...hit];
    for (const [c, asc] of [...this.orders].reverse()) out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
    if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
    if (this.lim != null) out = out.slice(0, this.lim);
    const { cols, embeds } = parseSelect(this.sel);
    out = out.map((r) => project(this.table, r, cols, embeds));
    if (this.one) {
      if (!out.length) return this.one === 'single' ? { data: null, error: { code: 'PGRST116', message: 'no rows' } } : { data: null, error: null };
      return { data: out[0], error: null };
    }
    return { data: out, error: null };
  }
}

function defaults(table) {
  if (table === 'food_log_entries') {
    const d = { brand: null, serving_label: null, grams: null, micros: null, source_key: null, quantity: 1, protein: 0, carb: 0, fat: 0 };
    if (!db.missing.has('planned')) d.planned = false;
    if (!db.missing.has('pre_logged')) d.pre_logged = false;
    return d;
  }
  return {};
}

function project(table, r, cols, embeds) {
  const o = cols.includes('*') ? { ...r } : Object.fromEntries(cols.map((c) => [c, r[c] ?? null]));
  for (const [name, inner] of Object.entries(embeds)) {
    const kids = db.rows(name).filter((k) => k.meal_id === r.id);
    o[name] = kids.map((k) => Object.fromEntries(inner.map((c) => [c, k[c] ?? null])));
  }
  return o;
}

export const supabase = {
  from: (t) => new Query(t),
  auth: {
    getSession: async () =>
      db.offline
        ? { data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } }
        : { data: { session: { user: { id: ATHLETE } } }, error: null },
    getUser: async () => ({ data: { user: { id: ATHLETE } }, error: null }),
  },
  functions: { invoke: async () => ({ data: null, error: { message: 'not in tests' } }) },
  /* An RPC the test registers on `db.rpcs` runs; any other answers the way a missing function does. */
  rpc: async (name, args) => {
    if (db.offline) return { data: null, error: TRANSPORT };
    const fn = db.rpcs?.[name];
    if (!fn) return { data: null, error: { code: 'PGRST202', message: `function ${name} not found` } };
    try {
      return { data: fn(args), error: null };
    } catch (e) {
      return { data: null, error: { code: 'P0001', message: e.message } };
    }
  },
};
