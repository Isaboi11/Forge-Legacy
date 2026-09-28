/**
 * What Sentry is allowed to see — the scrubber every Sentry event, transaction and span passes through.
 *
 * ══ WHY THIS EXISTS ══
 *
 * Sentry is the first THIRD PARTY that error data goes to (build 10, `Docs/Sentry-Build-Plan.md`). `0176`'s
 * own reporter stores error messages verbatim because they stay in our database; Sentry does not get that
 * latitude. `site/privacy.html` § Diagnostics → Sentry promises it never receives the step trail, a name, an
 * email, training figures, the food log, health data, photos, location or typed text, and that search terms
 * are removed. This file is where that sentence is kept, and `__tests__/sentry-scrub.test.mjs` is where it
 * is proven.
 *
 * ⛔ HEALTH DATA (Apple Health, nutrition, body photos, form-check pose) NEVER REACHES SENTRY. The code that
 *    handles it reports codes, not values (Apple-Health-Build-Plan §7). This is the second wall: whatever
 *    slips into an event is cut here — the request block, extras, breadcrumbs, URL query strings, quoted
 *    prose, emails, tokens.
 *
 * ══ PURE ON PURPOSE ══
 *
 * No imports — Sentry's types are mirrored loosely below rather than imported, so this module runs under
 * `node --test` exactly as it does on Hermes and the web. Every function is total: a scrubber that throws
 * inside `beforeSend` would lose the report it was cleaning.
 */

// ── the shapes we touch (a loose mirror of @sentry/core's Event / SpanJSON) ──

type Dict = Record<string, unknown>;

export interface ScrubbableSpan {
  description?: string;
  data?: Dict;
  [key: string]: unknown;
}

export interface ScrubbableEvent {
  message?: string | { message?: string; formatted?: string; [k: string]: unknown };
  transaction?: string;
  exception?: { values?: { type?: string; value?: string; stacktrace?: { frames?: Dict[] }; [k: string]: unknown }[] };
  user?: Dict;
  request?: unknown;
  breadcrumbs?: unknown[];
  extra?: unknown;
  contexts?: Record<string, Dict | undefined>;
  tags?: Record<string, unknown>;
  spans?: ScrubbableSpan[];
  server_name?: string;
  [key: string]: unknown;
}

/** The tags `lib/sentry.ts` stamps on every event. Read at send time, never cached. */
export interface ScrubContext {
  flSession: string | null;
  updateId: string | null;
}

// ── text ─────────────────────────────────────────────────────────────────────

/** A string capped for a third party. Long values are where pasted text hides. */
const MAX_TEXT = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A URL with its query string and fragment cut off: `…/food-search?q=chicken` → `…/food-search`.
 *
 * The query is where food searches, filters with values, and access tokens live. The PATH is kept — a table
 * or function name is what makes a slow-request span readable, and it carries no one's data.
 */
export function stripUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[?#].*$/, '');
}

/**
 * Free text (an exception value, a message, a span description) made safe to hand a third party.
 *
 * What goes, in order:
 *  - URL query strings and fragments (search terms, tokens)
 *  - email addresses
 *  - JWTs and bearer tokens
 *  - PostgREST/Postgres value echoes: `Key (user_id, day)=(…, …)` and `…: "value"` — the one place a
 *    database error quotes what the athlete sent
 *  - any double- or single-quoted run with a space inside (prose — the same rule as `breadcrumb-core`'s
 *    `looksLikeProse`); `column "reps" does not exist` keeps its identifier
 *
 * What stays: the words of the fault itself. `Cannot read property 'name' of undefined` is the bug; hiding
 * it would send Sentry a timestamp attached to nothing.
 */
export function scrubText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\b((?:https?|wss?):\/\/[^\s?#"')]+)[?#][^\s"')]*/gi, '$1')
    // A relative path's query too (`/log-food?date=…`, a route or an expo-router href) — any `?k=v`.
    .replace(/(\/[^\s?#"')]*)\?[^\s"')#=]*=[^\s"')]*/g, '$1')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[token]')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [token]')
    .replace(/(Key \([^)]*\))=\([^)]*\)/g, '$1=([value])')
    .replace(/(invalid input (?:syntax|value) for [^:]*:\s*)(["'])[^"']*\2/gi, '$1$2[value]$2')
    // Quoted runs are matched PAIR BY PAIR and then tested, never with a "contains a space" pattern: that
    // would pair the closing quote of `"a"` with the opening quote of `"b"` and eat the words between them.
    .replace(/"([^"\n]*)"/g, (whole, inner: string) => (/\s/.test(inner.trim()) ? '"[text]"' : whole))
    .replace(/(^|[\s(:=,])'([^'\n]*)'/g, (whole, lead: string, inner: string) =>
      /\s/.test(inner.trim()) ? `${lead}'[text]'` : whole,
    )
    .slice(0, MAX_TEXT);
}

// ── spans (performance data) ─────────────────────────────────────────────────

/** Span attributes that carry a URL, a query, or a body. */
const URL_KEYS = ['url', 'http.url', 'url.full', 'server.address.full', 'http.target'];
const DROP_KEYS = ['http.query', 'http.fragment', 'url.query', 'url.fragment', 'http.request.body', 'http.response.body'];

/**
 * One span, cleaned. Mutates and returns the same object — Sentry's `beforeSendSpan` contract.
 *
 * A fetch span's description is `GET https://…/rest/v1/food_logs` (Sentry already moves the query into
 * `http.query`, which is dropped); the strip is belt-and-braces for any integration that doesn't.
 */
export function scrubSpan<T extends ScrubbableSpan>(span: T): T {
  try {
    if (typeof span.description === 'string') span.description = scrubText(span.description);
    const data = span.data;
    if (data && typeof data === 'object') {
      for (const k of DROP_KEYS) delete data[k];
      for (const k of URL_KEYS) if (typeof data[k] === 'string') data[k] = stripUrl(data[k]);
      // Route params never ride on a navigation span (Sentry drops them today; this keeps it that way).
      for (const k of Object.keys(data)) if (k.endsWith('.params')) delete data[k];
    }
  } catch {
    /* a span that can't be cleaned is still better sent clean-as-far-as-we-got than thrown */
  }
  return span;
}

// ── events ───────────────────────────────────────────────────────────────────

/**
 * An error event (or transaction) cleaned for Sentry. Mutates and returns the same object.
 *
 *  - `request` (URL with query, headers, user agent), `extra`, `breadcrumbs`: removed outright. The trail
 *    belongs to `0176` under ER-D1; Sentry's automatic one records console text and request URLs.
 *  - `user`: the account UUID and nothing else. `sendDefaultPii` is already false; this also drops an
 *    `ip_address` / `email` / `username` any integration might add.
 *  - `contexts`: device `name` ("Isaiah's iPhone") removed — the model is the configuration, the name is a
 *    person. Any `state` / `response` context removed.
 *  - text: exception values, message, transaction name — `scrubText`.
 *  - frames: local variable capture (`vars`) removed.
 *  - tags: `fl_session` and `update_id` stamped from `ctx` so a Sentry event joins its `0176` row.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T, ctx: ScrubContext): T {
  try {
    delete event.request;
    delete event.extra;
    delete event.server_name;
    event.breadcrumbs = [];

    const id = event.user && typeof event.user.id === 'string' && UUID.test(event.user.id) ? event.user.id : null;
    if (id) event.user = { id };
    else delete event.user;

    if (event.contexts) {
      if (event.contexts.device) delete event.contexts.device.name;
      delete event.contexts.state;
      delete event.contexts.response;
    }

    if (typeof event.message === 'string') event.message = scrubText(event.message);
    else if (event.message && typeof event.message === 'object') {
      if (typeof event.message.message === 'string') event.message.message = scrubText(event.message.message);
      if (typeof event.message.formatted === 'string') event.message.formatted = scrubText(event.message.formatted);
      delete event.message.params;
    }

    if (typeof event.transaction === 'string') event.transaction = scrubText(event.transaction);

    for (const ex of event.exception?.values ?? []) {
      if (typeof ex.value === 'string') ex.value = scrubText(ex.value);
      for (const frame of ex.stacktrace?.frames ?? []) delete frame.vars;
    }

    if (Array.isArray(event.spans)) event.spans.forEach(scrubSpan);

    event.tags = {
      ...(event.tags ?? {}),
      ...(ctx.flSession ? { fl_session: ctx.flSession } : {}),
      ...(ctx.updateId ? { update_id: ctx.updateId } : {}),
    };
  } catch {
    /* see the header: a scrubber that throws loses the report */
  }
  return event;
}

/** Sentry's `beforeBreadcrumb`. Always `null` — see `scrubEvent` for why the trail is not Sentry's. */
export function dropBreadcrumb(): null {
  return null;
}
