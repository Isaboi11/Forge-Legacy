/**
 * ══ THE SUPABASE MANAGEMENT API — byte-exact deploys and read-backs (deploy path (a)) ══
 *
 * ⛔ NOTHING HERE RUNS UNTIL THE PO OKs `SUPABASE_ACCESS_TOKEN` (Docs/AI-Sprint-2-Build-Notes.md §1.5). The token is
 *   account-wide: it can deploy, delete and run SQL as `postgres` on every project the PO owns. The deploy-ai skill
 *   asks first; the nightly drift job (.github/workflows/drift.yml) reads it from a GitHub secret the PO sets. This
 *   module is unit-tested with a fake fetch (scripts/deploy-ai/__tests__/mgmt-api.test.mjs) and has never been
 *   called for real from this repo.
 *
 * Endpoints (Supabase docs, read via the Supabase MCP `search_docs` on 2026-11-17):
 *   GET  /v1/projects/{ref}/functions                       every function: slug, version, verify_jwt, entrypoint_path
 *   GET  /v1/projects/{ref}/functions/{slug}                one function's metadata
 *   GET  /v1/projects/{ref}/functions/{slug}/body           the deployed files. With `Accept: multipart/form-data` the
 *                                                           server unbundles them (one part per file, the filename is
 *                                                           the deployed path). Anything else (an eszip) → we refuse
 *                                                           to guess and report fetch_failed.
 *   POST /v1/projects/{ref}/functions/deploy?slug={slug}    multipart: `metadata` (JSON: entrypoint_path, name,
 *                                                           verify_jwt) + `file` (index.ts). Creates or updates.
 *   POST /v1/projects/{ref}/database/query                  {query} → rows, run as `postgres` — the only way the
 *                                                           0271 writers can be reached.
 *
 * Why not `supabase functions deploy`: it bundles the SOURCE tree (index.ts + every src/ module it imports, as
 * separate files), so what runs would not be the one-file bundle the repo tests and hashes. Uploading the bundle as
 * the single `index.ts` keeps "deployed == repo bundle" a byte comparison.
 */


import { Buffer } from 'node:buffer';

import { boundaryOf, buildMultipart, parseMultipart, sourceRelative } from './multipart.mjs';

const BASE = 'https://api.supabase.com';

export class MgmtApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {{ token: string, ref: string, fetchImpl?: typeof fetch, base?: string }} opts
 */
export function mgmtClient({ token, ref, fetchImpl = globalThis.fetch, base = BASE }) {
  if (!token) throw new MgmtApiError('SUPABASE_ACCESS_TOKEN is not set — the PO has to OK it first (see the deploy-ai skill)', 0);
  if (!/^[a-z0-9]{20}$/.test(ref ?? '')) throw new MgmtApiError(`bad project ref ${JSON.stringify(ref)}`, 0);
  const auth = { Authorization: `Bearer ${token}` };

  async function call(method, path, { headers = {}, body, accept = 'application/json' } = {}) {
    const res = await fetchImpl(`${base}${path}`, { method, headers: { ...auth, Accept: accept, ...headers }, body });
    if (!res.ok) {
      // The error body is Supabase's, not ours — clipped, and never echoes the token (it is only in our header).
      const text = await res.text().catch(() => '');
      throw new MgmtApiError(`${method} ${path} → ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`, res.status);
    }
    return res;
  }
  const json = async (res) => JSON.parse(await res.text());
  const fn = (slug) => {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug ?? '')) throw new MgmtApiError(`bad slug ${JSON.stringify(slug)}`, 0);
    return `/v1/projects/${ref}/functions/${slug}`;
  };

  return {
    /** @returns {Promise<{ slug: string, version: number, verify_jwt: boolean, entrypoint_path?: string, status?: string }[]>} */
    async listFunctions() {
      return json(await call('GET', `/v1/projects/${ref}/functions`));
    },

    async getFunction(slug) {
      return json(await call('GET', fn(slug)));
    },

    /**
     * The deployed files, as text. Throws MgmtApiError(…, 415) when the answer is not multipart (an eszip we will
     * not try to unpack).
     * @returns {Promise<{ name: string, content: string }[]>}
     */
    async getFunctionFiles(slug) {
      const res = await call('GET', `${fn(slug)}/body`, { accept: 'multipart/form-data' });
      const type = res.headers.get('content-type') ?? '';
      const boundary = boundaryOf(type);
      if (!/^multipart\/form-data/i.test(type) || !boundary) {
        throw new MgmtApiError(`body for ${slug} came back as ${type || 'no content type'}, not multipart/form-data`, 415);
      }
      const parts = parseMultipart(Buffer.from(await res.arrayBuffer()), boundary);
      return parts.filter((p) => p.filename).map((p) => ({ name: sourceRelative(p.filename), content: p.data.toString('utf8') }));
    },

    /**
     * Deploy ONE file as the function's index.ts. `verifyJwt` is required — never defaulted, never flipped by
     * accident (ai-canary and revenuecat-webhook are off on purpose).
     */
    async deployFunction(slug, { content, verifyJwt }) {
      if (typeof verifyJwt !== 'boolean') throw new MgmtApiError('deployFunction: say verifyJwt (true/false) explicitly', 0);
      if (typeof content !== 'string' || content.length === 0) throw new MgmtApiError('deployFunction: empty file', 0);
      const { body, contentType } = buildMultipart([
        { name: 'metadata', value: JSON.stringify({ entrypoint_path: 'index.ts', name: slug, verify_jwt: verifyJwt }), contentType: 'application/json' },
        { name: 'file', value: content, filename: 'index.ts', contentType: 'application/typescript' },
      ]);
      fn(slug);
      return json(await call('POST', `/v1/projects/${ref}/functions/deploy?slug=${encodeURIComponent(slug)}`, { headers: { 'Content-Type': contentType }, body }));
    },

    /** SQL as `postgres`. Rows back. */
    async runSql(query) {
      return json(await call('POST', `/v1/projects/${ref}/database/query`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }));
    },
  };
}
