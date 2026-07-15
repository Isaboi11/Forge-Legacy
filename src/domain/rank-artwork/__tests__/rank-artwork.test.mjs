/**
 * rank-artwork.test.mjs — the one spot the rank badge layout could drift.
 * Enumerates EVERY assetPath `resolveRankArtwork` can produce (7 families × 4 levels,
 * with `established` × male/female) and asserts, for each: (a) `rank-registry.ts` has an
 * entry, and (b) the PNG exists on disk. Also pins the sex-specific handling. Fails loudly
 * on any drift → the resolver can never return a path with no image.
 *
 * Node-safe: text-scans the generated registry + checks files; never `require()`s a PNG.
 * Run:  node --test src/domain/rank-artwork/__tests__/rank-artwork.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveRankArtwork, rankAssetPath, RANK_FAMILIES, RANK_LEVELS, SEX_SPECIFIC_FAMILIES } from '../resolver.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOD = join(HERE, '..');
const REPO = join(HERE, '..', '..', '..', '..');
const registrySrc = readFileSync(join(MOD, 'rank-registry.ts'), 'utf8');

/** Every (family, level, [sex]) → assetPath the resolver can ever emit. */
function allAssetPaths() {
  const out = [];
  for (const family of RANK_FAMILIES) {
    for (const level of RANK_LEVELS) {
      if (SEX_SPECIFIC_FAMILIES.includes(family)) {
        for (const sex of ['male', 'female']) {
          out.push({ family, level, sex, assetPath: resolveRankArtwork({ family, level, sex }).assetPath });
        }
      } else {
        out.push({ family, level, assetPath: resolveRankArtwork({ family, level }).assetPath });
      }
    }
  }
  return out;
}

test('enumerates exactly the 32 imported rank badges', () => {
  // 6 non-sex-specific families × 4 + 1 sex-specific × 4 × 2 = 24 + 8 = 32
  assert.equal(allAssetPaths().length, 32);
});

test('every resolver-producible rank assetPath has a rank-registry entry (no silent broken image)', () => {
  for (const { assetPath } of allAssetPaths()) {
    assert.ok(registrySrc.includes(`'${assetPath}':`), `rank-registry.ts missing entry: ${assetPath}`);
  }
});

test('every resolver-producible rank assetPath points at a real PNG on disk', () => {
  for (const { assetPath } of allAssetPaths()) {
    assert.ok(existsSync(join(REPO, assetPath)), `missing rank badge file: ${assetPath}`);
  }
});

test('established is sex-specific: male and female resolve to different, sex-tagged files', () => {
  const m = resolveRankArtwork({ family: 'established', level: 2, sex: 'male' });
  const f = resolveRankArtwork({ family: 'established', level: 2, sex: 'female' });
  assert.equal(m.assetPath, 'assets/artwork/ranks/established-m-2.png');
  assert.equal(f.assetPath, 'assets/artwork/ranks/established-f-2.png');
  assert.equal(m.sexVariant, 'male');
  assert.equal(f.sexVariant, 'female');
  assert.notEqual(m.assetPath, f.assetPath);
});

test('neutral/unspecified sex on established is served from male (documented placeholder)', () => {
  const u = resolveRankArtwork({ family: 'established', level: 1, sex: 'unspecified' });
  const none = resolveRankArtwork({ family: 'established', level: 1 });
  assert.equal(u.assetPath, 'assets/artwork/ranks/established-m-1.png');
  assert.equal(none.assetPath, 'assets/artwork/ranks/established-m-1.png');
  assert.match(u.reason, /neutral → male placeholder/);
});

test('non-sex-specific families ignore sex and carry no sexVariant', () => {
  const a = resolveRankArtwork({ family: 'foundation', level: 3, sex: 'female' });
  const b = resolveRankArtwork({ family: 'foundation', level: 3, sex: 'male' });
  assert.equal(a.assetPath, 'assets/artwork/ranks/foundation-3.png');
  assert.equal(a.assetPath, b.assetPath);
  assert.equal(a.sexVariant, undefined);
});

test('hall→legend and legacy-rank→legacy families resolve to the renamed files', () => {
  assert.equal(rankAssetPath('legend', 4), 'assets/artwork/ranks/legend-4.png');
  assert.equal(rankAssetPath('legacy', 1), 'assets/artwork/ranks/legacy-1.png');
});
