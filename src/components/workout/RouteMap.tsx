import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { flColor } from '@/constants/foundation';
import { regionFor, type LatLng } from '@/domain/run/route-region';

/**
 * A real map with the athlete's route on it.
 *
 * ══ WHY THIS EXISTS ══
 *
 * PO, on a run the app measured: *"The map gps messed up. And then it just looks like a line and not a
 * map. He also couldn't click on the map to zoom in or anything."* All three were true. The band was a
 * hand-drawn `<Svg>` on a bronze grid with `pointerEvents="none"` — no tiles, no streets, no gestures,
 * by construction. It was never a map; it was a sketch of the shape of one.
 *
 * ══ ⚠ THIS FILE IS NATIVE-ONLY. `RouteMap.web.tsx` IS THE OTHER HALF ══
 *
 * `react-native-maps` has no web build, and the PO tests the web preview — a bare import here would
 * white-screen `forgelegacy.expo.app` on any screen that reaches it. Metro resolves `.web.tsx` first on
 * web, so the fallback is picked up automatically and neither file needs to know about the other.
 *
 * The two agree because they share `regionFor`: same framing, same route, different renderer.
 *
 * ══ APPLE MAPS, NO KEY ══
 *
 * `PROVIDER_DEFAULT` is Apple Maps on iOS: no API key, no billing account, no config-plugin entry.
 *
 * ⚠ ANDROID IS NOT DONE. It defaults to Google Maps, which needs a Google Cloud key in
 * `android.config.googleMaps.apiKey` plus the SHA-1 of the signing certificate. Without it the map
 * renders as a blank grey rectangle — it does not error, which is the bad kind of missing. iOS/TestFlight
 * is what ships first, so that key is a prerequisite for the Android build and nothing sooner.
 *
 * ══ WHY NOT `expo-maps`, WHICH THE SDK 56 DOCS RECOMMEND ══
 *
 * Read before choosing (AGENTS.md). The docs prefer Expo's own `expo-maps` — and it is in ALPHA, stated
 * plainly as "will frequently experience breaking changes". It also has no bounds-fitting of its own and
 * splits its surface per platform (`AppleMaps.View` vs `GoogleMaps.View`, `annotations` vs `markers`).
 * For a pre-release app about to go to testers, a mature library with `fitToCoordinates` beats the
 * house recommendation carrying a breaking-change warning. Worth revisiting when it stabilises.
 */

export interface RouteMapProps {
  /** The route to draw. Empty draws nothing — the caller shows its own placeholder. */
  points: readonly LatLng[];
  height: number;
  /**
   * Whether the athlete can pan and zoom.
   *
   * ⚠ FALSE INLINE, AND THAT IS NOT LAZINESS. The cardio card lives inside a horizontally-paging
   * ScrollView — one page per exercise — and a pannable map inside a pager swallows every horizontal
   * drag that was meant to change exercise. The inline map is a picture you tap; the fullscreen one is
   * the map you actually handle.
   */
  interactive?: boolean;
  /** Tap handler for the inline map. Ignored when `interactive`, which has its own gestures. */
  onPress?: () => void;
  /** Draw start/end pins. Off inline — at 140px they cover the route they mark. */
  showEnds?: boolean;
  testID?: string;
}

export function RouteMap({ points, height, interactive = false, onPress, showEnds = false, testID }: RouteMapProps) {
  const ref = useRef<MapView | null>(null);
  const region = regionFor(points);

  /*
   * `initialRegion` frames the FIRST paint; `fitToCoordinates` refines it once layout has happened and
   * the map knows its own size. Both are needed: without the first the map opens on the middle of the
   * Pacific and pans across the world, and without the second a long thin route is framed by its
   * bounding box rather than by the aspect ratio it is actually being drawn into.
   */
  useEffect(() => {
    if (!ref.current || points.length < 2) return;
    // A frame's grace so the map has been laid out. Fitting before that is a no-op that looks like a bug.
    const t = setTimeout(() => {
      ref.current?.fitToCoordinates(points as LatLng[], {
        edgePadding: { top: 28, right: 28, bottom: 28, left: 28 },
        animated: false,
      });
    }, 60);
    return () => clearTimeout(t);
  }, [points]);

  if (!region) return null;

  return (
    <View style={[styles.wrap, { height }]} testID={testID}>
      <MapView
        ref={ref}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        /* Every gesture, one flag. `scrollEnabled` alone still leaves pinch-zoom fighting the pager. */
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        toolbarEnabled={false}
        /* The app is dark everywhere; a bright map inside it reads as a hole punched in the screen. */
        userInterfaceStyle="dark"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={interactive}
        loadingEnabled
        loadingBackgroundColor={flColor.charcoal900}
        loadingIndicatorColor={flColor.bronze400}
      >
        <Polyline
          coordinates={points as LatLng[]}
          strokeColor={flColor.bronze300}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
        {showEnds && points.length > 1 ? (
          <>
            {/*
              "Start" and "End" of the STORED route, which is deliberately not the start and end of the
              run — the first and last 200 m were trimmed before this was ever written (D-RTE-1). The
              labels say so, because a pin reading "Start" on a point 200 m into the run is a small lie
              told confidently, and the caption alone is easy to miss.
            */}
            <Marker coordinate={points[0]} title="Route begins here" description="The first 200 m are trimmed for privacy" pinColor={flColor.bronze400} />
            <Marker coordinate={points[points.length - 1]} title="Route ends here" description="The last 200 m are trimmed for privacy" pinColor={flColor.bronze300} />
          </>
        ) : null}
      </MapView>
      {/*
        The tap target sits OVER a non-interactive map rather than wrapping it in a Pressable: a
        Pressable around a MapView still lets the map claim the touch on some iOS versions, and the tap
        then does nothing at all. An absolute sibling cannot lose that argument.
      */}
      {!interactive && onPress ? (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Open the full map of this route"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden' },
});
