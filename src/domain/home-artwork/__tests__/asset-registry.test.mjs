/**
 * asset-registry.test.mjs — the one spot the 1:1 artwork layout could drift.
 * Enumerates EVERY assetPath the manifest can produce (all collections × keys × male/female)
 * and asserts, for each: (a) `asset-registry.ts` has an entry for it, and (b) the PNG exists
 * on disk. Fails loudly on any drift → the resolver can never return a path with no image.
 *
 * Node-safe: text-scans the generated registry + checks files; never `require()`s a PNG.
 * Run:  node --test src/domain/home-artwork/__tests__/asset-registry.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MANIFEST_COLLECTIONS, resolveAsset } from '../manifest.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = join(HERE, '..');
const REPO = join(HERE, '..', '..', '..', '..');
const registrySrc = readFileSync(join(HOME, 'asset-registry.ts'), 'utf8');
const SERVED = ['male', 'female'];

/** All (collection, key, servedSex) → assetPath the resolver can ever emit. */
function allAssetPaths() {
  const out = [];
  for (const [collection, def] of Object.entries(MANIFEST_COLLECTIONS)) {
    for (const key of def.keys) {
      for (const sex of SERVED) {
        const p = resolveAsset(collection, key, sex);
        out.push({ collection, key, sex, assetPath: p });
      }
    }
  }
  return out;
}

test('manifest resolves a non-null assetPath for every registered key', () => {
  for (const { collection, key, sex, assetPath } of allAssetPaths()) {
    assert.ok(assetPath, `manifest returned null for ${collection}.${key}.${sex}`);
  }
});

test('every resolver-producible assetPath has an asset-registry entry (no silent broken image)', () => {
  for (const { assetPath } of allAssetPaths()) {
    assert.ok(registrySrc.includes(`'${assetPath}':`), `asset-registry.ts missing entry: ${assetPath}`);
  }
});

test('every resolver-producible assetPath points at a real PNG on disk', () => {
  for (const { assetPath } of allAssetPaths()) {
    assert.ok(existsSync(join(REPO, assetPath)), `missing artwork file: ${assetPath}`);
  }
});

test('the neutral default (training_split:full_body, served male) resolves to a present asset', () => {
  const p = resolveAsset('training_split', 'full_body', 'male');
  assert.ok(registrySrc.includes(`'${p}':`));
  assert.ok(existsSync(join(REPO, p)));
});
