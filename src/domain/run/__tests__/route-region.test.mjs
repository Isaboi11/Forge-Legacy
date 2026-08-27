/**
 * route-region.test.mjs — framing a route on a map.
 *
 * The native map and the web fallback both read these, so a disagreement here is the same run looking
 * like two different runs depending on which platform it was opened on.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MIN_DELTA_DEG,
  REGION_PADDING,
  ROUTE_STORED_NOTE,
  regionFor,
  storedRouteToLatLng,
  trackToLatLng,
} from '../route-region.ts';
import { encodePolyline, routeForStorage } from '../route-privacy.ts';
import { acceptFix } from '../run-core.ts';

const MI_PER_DEG_LAT = 69.0546;
const at0 = 1_700_000_000_000;
const HOME = { lat: 40.2969, lon: -111.6946 };

function runOf(miles) {
  let t = [];
  for (let i = 0; i * 0.01 <= miles; i++) {
    t = acceptFix(t, { lat: HOME.lat + (i * 0.01) / MI_PER_DEG_LAT, lon: HOME.lon, accuracy: 5, at: at0 + i * 6000 }, 'run').track;
  }
  return t;
}

test('an empty route has no region rather than a region at (0, 0)', () => {
  // Null is what lets the surface draw the placeholder. A zeroed region is the Gulf of Guinea.
  assert.equal(regionFor([]), null);
  assert.equal(regionFor(storedRouteToLatLng(null)), null);
  assert.equal(regionFor(storedRouteToLatLng('')), null);
});

test('the region is centred on the route it frames', () => {
  const r = regionFor([
    { latitude: 40, longitude: -111 },
    { latitude: 42, longitude: -113 },
  ]);
  assert.ok(Math.abs(r.latitude - 41) < 1e-9);
  assert.ok(Math.abs(r.longitude - -112) < 1e-9);
});

test('the whole route fits inside the region, with room to spare', () => {
  const pts = trackToLatLng(runOf(3));
  const r = regionFor(pts);
  const north = r.latitude + r.latitudeDelta / 2;
  const south = r.latitude - r.latitudeDelta / 2;
  const east = r.longitude + r.longitudeDelta / 2;
  const west = r.longitude - r.longitudeDelta / 2;
  for (const p of pts) {
    assert.ok(p.latitude <= north && p.latitude >= south, 'a point fell outside the frame vertically');
    assert.ok(p.longitude <= east && p.longitude >= west, 'a point fell outside the frame horizontally');
  }
});

test('padding leaves the line off the edge of the frame', () => {
  const span = 0.02;
  const r = regionFor([
    { latitude: 40, longitude: -111 },
    { latitude: 40 + span, longitude: -111 },
  ]);
  assert.ok(Math.abs(r.latitudeDelta - span * REGION_PADDING) < 1e-9, 'the span should be padded');
  assert.ok(r.latitudeDelta > span, 'a route drawn edge to edge has no frame at all');
});

test('⚠ a route with no spread still opens at a readable zoom', () => {
  // Every point identical — a bout that never cleared the movement gate. Without the floor the delta is
  // zero and the map opens on individual paving slabs.
  const r = regionFor([
    { latitude: 40.2969, longitude: -111.6946 },
    { latitude: 40.2969, longitude: -111.6946 },
  ]);
  assert.equal(r.latitudeDelta, MIN_DELTA_DEG);
  assert.equal(r.longitudeDelta, MIN_DELTA_DEG);
});

test('⚠ longitude is NOT cos-scaled — the projection already does that', () => {
  // routePath multiplies longitude by cos(lat) because it draws on a flat box. A map does not, and
  // correcting twice frames every route too tightly east-west, worse the further from the equator.
  const span = 0.02;
  const r = regionFor([
    { latitude: 60, longitude: -111 },        // high latitude, where cos(lat) is ~0.5
    { latitude: 60, longitude: -111 + span },
  ]);
  assert.ok(
    Math.abs(r.longitudeDelta - span * REGION_PADDING) < 1e-9,
    `longitudeDelta ${r.longitudeDelta} — a cos-scaled value would be about half this`,
  );
});

test('a stored route decodes back into something the map can frame', () => {
  const { route } = routeForStorage(runOf(3), true);
  const pts = storedRouteToLatLng(route);
  assert.ok(pts.length > 1);
  assert.ok(pts.every((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'));
  const r = regionFor(pts);
  assert.ok(r && r.latitudeDelta > 0 && r.longitudeDelta > 0);
  // It is near where the run happened, which is the cheapest possible check that the decode is not
  // silently producing a mirrored or offset shape.
  assert.ok(Math.abs(r.latitude - HOME.lat) < 0.1, `framed at ${r.latitude}, run was at ${HOME.lat}`);
});

test('trackToLatLng and storedRouteToLatLng frame the SAME run identically now', () => {
  // Under the trim the stored shape spanned less than the live one. Since D-RS-1 they are the same
  // points, so the two framings must agree exactly — a divergence means one path is still trimming.
  const track = runOf(3);
  const live = regionFor(trackToLatLng(track));
  const stored = regionFor(storedRouteToLatLng(routeForStorage(track, true).route));
  assert.ok(Math.abs(live.latitude - stored.latitude) < 0.001, 'the two framings disagree about where the run was');
  assert.ok(Math.abs(live.latitudeDelta - stored.latitudeDelta) < 0.001, 'the stored route no longer spans less than the run');
});

test('⚠ the stored-route caption promises nothing it cannot know', () => {
  // Post-rescission a stored route is whole for new saves and short 400 m for old ones, with nothing
  // on the row saying which. The caption must therefore neither claim completeness nor claim a trim —
  // "as it was saved" is the sentence true of both eras. See ROUTE_STORED_NOTE's header.
  assert.match(ROUTE_STORED_NOTE, /saved/i);
  assert.doesNotMatch(ROUTE_STORED_NOTE, /trim|privacy/i, 'it must not describe a rule that no longer runs');
});

test('an encoded route round-trips through the map helper unchanged', () => {
  const pts = [
    { lat: 40.2969, lon: -111.6946 },
    { lat: 40.3, lon: -111.69 },
  ];
  const back = storedRouteToLatLng(encodePolyline(pts));
  assert.equal(back.length, 2);
  assert.ok(Math.abs(back[0].latitude - 40.2969) < 1e-4);
  assert.ok(Math.abs(back[1].longitude - -111.69) < 1e-4);
});
