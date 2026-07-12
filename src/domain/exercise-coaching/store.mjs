/**
 * store.mjs — content-store IO shared by generate.mjs, validate.mjs, report.mjs.
 *
 * The store is a single JSON array of coaching records plus a manifest that lets
 * the generator resume without re-doing work. Output is stable (sorted by
 * exerciseId, 2-space JSON, trailing newline) for clean diffs and idempotency.
 *
 * The committed store starts EMPTY (`[]`) — no coaching content has been
 * generated. The manifest records zero completed until the first approved run.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GENERATION_BATCHES, COACHING_SCHEMA_VERSION, GENERATOR_VERSION, assignBatch } from './engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const HERE_CONTENT = join(HERE, 'content');
export const STORE_PATH = join(HERE_CONTENT, 'coaching_content.json');
export const MANIFEST_PATH = join(HERE_CONTENT, 'manifest.json');

/** Load the record array (empty array if the store has not been created yet). */
export function loadStore(path = STORE_PATH) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf8').trim();
  return raw ? JSON.parse(raw) : [];
}

export function loadManifest(path = MANIFEST_PATH) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8').trim();
  return raw ? JSON.parse(raw) : null;
}

/** Build a manifest from the current records + catalog index. */
export function buildManifest(records, index, now = new Date().toISOString()) {
  const completedByBatch = Object.fromEntries(GENERATION_BATCHES.map((b) => [b, []]));
  for (const r of records) {
    const node = index.byId.get(r.exerciseId);
    if (!node) continue;
    completedByBatch[assignBatch(node)].push(r.exerciseId);
  }
  for (const b of GENERATION_BATCHES) completedByBatch[b].sort();
  return {
    schemaVersion: COACHING_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    catalogSize: index.ids.length,
    completedByBatch,
    updatedAt: now,
  };
}

/** Write the store + manifest with stable ordering/formatting. */
export function writeStore(records, manifest, { storePath = STORE_PATH, manifestPath = MANIFEST_PATH } = {}) {
  if (!existsSync(HERE_CONTENT)) mkdirSync(HERE_CONTENT, { recursive: true });
  const sorted = records.slice().sort((a, b) => (a.exerciseId < b.exerciseId ? -1 : a.exerciseId > b.exerciseId ? 1 : 0));
  writeFileSync(storePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}
