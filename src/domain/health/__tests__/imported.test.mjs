import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FALLBACK_SOURCE, importedFrom, importedFromLine, removeImportCopy } from '../imported.ts';

test('a Forge-recorded workout is never an import — so it never gets the remove action', () => {
  assert.equal(importedFrom('forge', null), null);
  assert.equal(importedFrom('forge', 'Garmin Connect'), null); // a label alone does not make an import
  assert.equal(importedFrom(null, null), null); // pre-0234 read: no column, Forge's
  assert.equal(importedFrom(undefined, 'Strava'), null);
  assert.equal(importedFrom('  ', 'Strava'), null);
});

test('an import names its source, falling back to Apple Health', () => {
  assert.equal(importedFrom('apple_health', 'Garmin Connect'), 'Garmin Connect');
  assert.equal(importedFrom('apple_health', '  Apple Watch  '), 'Apple Watch');
  assert.equal(importedFrom('apple_health', null), FALLBACK_SOURCE);
  assert.equal(importedFrom('apple_health', ''), FALLBACK_SOURCE);
});

test('the Activity Detail line', () => {
  assert.equal(importedFromLine('Garmin Connect'), 'Imported from Garmin Connect');
});

test('the confirmation says where it stays and that it will not come back', () => {
  const c = removeImportCopy('Morning Run', 'Strava');
  assert.equal(c.headline, 'Remove from Forge?');
  assert.equal(c.confirm, 'Remove from Forge');
  assert.match(c.body, /“Morning Run” \(from Strava\)/);
  assert.match(c.body, /stays in Apple Health/);
  assert.match(c.body, /won’t import it again/);
  assert.match(removeImportCopy('  ', 'Strava').body, /^“This workout”/);
});
