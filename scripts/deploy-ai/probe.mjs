#!/usr/bin/env node
/**
 * ══ AFTER A DEPLOY: DOES IT ANSWER A STRANGER THE WAY IT SHOULD? — free, no model is ever reached ══
 *
 *   node scripts/deploy-ai/probe.mjs <slug>        → OPTIONS and a no-auth POST; exit 1 on a surprise
 *
 * OPTIONS is the CORS preflight the web app sends first (200 from the function's own CORS block). A POST with NO
 * Authorization and NO apikey must be refused before any code that costs money: the gateway's 401 for a
 * verify_jwt function, the function's own 401 for ai-canary (secret checked first) and revenuecat-webhook. The
 * expected statuses live in scripts/deploy-ai/functions.mjs. The body is never read beyond the status.
 */

import { fileURLToPath } from 'node:url';

import { FUNCTIONS, FUNCTIONS_BASE } from './functions.mjs';

/**
 * @param {string} slug
 * @param {{ fetchImpl?: typeof fetch, base?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<{ slug: string, ok: boolean, checks: { what: string, expected: number, got: number | null, ok: boolean }[] }>}
 */
export async function probe(slug, { fetchImpl = globalThis.fetch, base = FUNCTIONS_BASE, timeoutMs = 15_000 } = {}) {
  const meta = FUNCTIONS[slug];
  if (!meta) throw new Error(`probe: ${slug} is not in scripts/deploy-ai/functions.mjs`);
  const url = `${base}/${slug}`;
  const once = async (method, init) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { method, ...init, signal: ctl.signal });
      await res.body?.cancel?.().catch?.(() => undefined);
      return res.status;
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  };
  const options = await once('OPTIONS', {
    headers: { Origin: 'https://forgelegacy.expo.app', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type' },
  });
  const post = await once('POST', { headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const checks = [
    { what: 'OPTIONS (CORS preflight)', expected: meta.probe.options, got: options, ok: options === meta.probe.options },
    { what: 'POST with no auth', expected: meta.probe.post, got: post, ok: post === meta.probe.post },
  ];
  return { slug, ok: checks.every((c) => c.ok), checks };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('usage: node scripts/deploy-ai/probe.mjs <slug>');
    process.exit(2);
  }
  const r = await probe(slug);
  for (const c of r.checks) console.log(`${c.ok ? '✓' : '✕'} ${c.what}: ${c.got ?? 'no answer'} (expected ${c.expected})`);
  process.exit(r.ok ? 0 : 1);
}
