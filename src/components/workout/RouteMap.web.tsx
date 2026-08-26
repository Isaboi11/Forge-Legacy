import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { flColor, flFont } from '@/constants/foundation';
import { regionFor, type LatLng } from '@/domain/run/route-region';
import type { RouteMapProps } from './RouteMap';

/**
 * The web half of `RouteMap` — the drawn trace, kept deliberately.
 *
 * ══ ⚠ WHY THIS FILE EXISTS AT ALL ══
 *
 * `react-native-maps` has no web build. Importing it on web throws at module load, which on this app
 * means a white screen rather than a missing map — and the PO tests the WEB PREVIEW. Metro resolves
 * `.web.tsx` ahead of `.tsx` on web, so this stands in automatically and the native file is never
 * evaluated there.
 *
 * It draws the same route through the same `regionFor`, so the two platforms frame the run identically;
 * only the renderer differs. What web does NOT get is tiles, streets or gestures, and the caption says
 * so rather than letting a bronze line on a grid pass for a map. That was the original complaint —
 * *"it just looks like a line and not a map"* — and repeating it silently on web would be worse than
 * admitting it.
 */

/** Project a point into the box using the SAME region the native map frames with. */
function project(p: LatLng, region: NonNullable<ReturnType<typeof regionFor>>, w: number, h: number) {
  const west = region.longitude - region.longitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  /* Longitude IS cos-scaled here and is not on the native map, and both are right: this is a flat box
     with no projection of its own, so without the correction every route is stretched east-to-west. */
  const kx = Math.cos((region.latitude * Math.PI) / 180) || 1;
  const x = ((p.longitude - west) * kx) / (region.longitudeDelta * kx || 1e-9);
  const y = (north - p.latitude) / (region.latitudeDelta || 1e-9);
  return { x: x * w, y: y * h };
}

export function RouteMap({ points, height, interactive = false, onPress, testID }: RouteMapProps) {
  const region = regionFor(points);
  if (!region || points.length < 2) return null;

  const W = 372;
  const H = 126;
  const pts = points.map((p) => project(p, region, W, H));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <View
      style={[styles.wrap, { height }]}
      testID={testID}
      {...(onPress && !interactive
        ? { onStartShouldSetResponder: () => true, onResponderRelease: onPress, accessibilityRole: 'button' as const, accessibilityLabel: 'Open the full map of this route' }
        : {})}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} pointerEvents="none">
        <Defs>
          {/* ⚠ THE SAME PLATE `CardioBlockCard` DRAWS, AND NOW THE SAME TOKENS. Both were literal
              copies of each other, so both were frozen near-black on Alabaster. */}
          <RadialGradient id="rmbg" cx="50%" cy="12%" r="130%">
            {/* ⚠ See the twin in `CardioBlockCard` — a computed `stopColor` must state its opacity. */}
            <Stop offset="0" stopColor={flColor.cardioBandCore} stopOpacity={1} />
            <Stop offset="1" stopColor={flColor.cardioBandEdge} stopOpacity={1} />
          </RadialGradient>
          <LinearGradient id="rmscrim" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={flColor.cardioBandEdge} stopOpacity={0.9} />
            <Stop offset="1" stopColor={flColor.cardioBandEdge} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#rmbg)" />
        {Array.from({ length: 5 }, (_, i) => (
          <Rect key={`h${i}`} x={0} y={i * 30} width={W} height={1} fill={flColor.cardioGrid} />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <Rect key={`v${i}`} x={i * 30} y={0} width={1} height={H} fill={flColor.cardioGrid} />
        ))}
        <Path d={d} fill="none" stroke={flColor.bronze300} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
        <Circle cx={pts[0].x} cy={pts[0].y} r={5} fill={flColor.bronze300} stroke={flColor.bronze400} strokeWidth={2} opacity={0.9} />
        <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={5} fill="none" stroke={flColor.bronze400} strokeWidth={2} opacity={0.9} />
        <Rect x={0} y={H - 52} width={W} height={52} fill="url(#rmscrim)" />
      </Svg>
      {/* Said plainly. A traced line on a grid is not a map, and letting it read as one on the web is
          how the PO came to report a map that was never there. */}
      <Text style={styles.note}>Traced route · the map needs the app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', justifyContent: 'center' },
  note: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: flColor.gray400,
    fontFamily: flFont.sans,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
