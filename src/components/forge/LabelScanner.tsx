import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { readLabelPhoto, type LabelScan } from '@/lib/label-scan';
import { useMediaPicker } from '@/lib/useMediaPicker';

/**
 * Scan label's camera — `Scan Nutrition Label v2.dc.html` B1 (live), B2 (reading), C1 (camera off),
 * C2 (couldn't read). One screen with states: "Same camera UI, no new screen", and the recovery panels
 * are "compact panels over the camera, not destinations".
 *
 * ⚠ **THIS FILE IMPORTS `expo-camera` AT THE TOP, SO NOTHING MAY IMPORT IT AT THE TOP.** The route
 * (`app/scan-label.tsx`) `require`s it only after `labelScanAvailable()`, so build 8 never evaluates it —
 * the same guard as Log Food's `BarcodeCamera`.
 *
 * ⚠ **THE CAMERA IS DARK IN BOTH THEMES.** Everything drawn OVER the viewfinder (the mask, the tip chip,
 * the header text, the shutter) sits on a live picture, not on a theme ground, so those few colours are
 * fixed rather than tokens that Alabaster would turn to dark ink on a dark photo. The C1/C2 panels are
 * ordinary cards and theme normally.
 */
export function LabelScanner({
  onScanned,
  onClose,
  onManual,
}: {
  onScanned: (scan: LabelScan) => void;
  onClose: () => void;
  onManual: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { pick, mediaPickerSheet } = useMediaPicker();
  const cameraRef = useRef<CameraView>(null);
  /* Bumped by Cancel. A read that finishes after the athlete cancelled belongs to nobody. */
  const attempt = useRef(0);

  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<'live' | 'reading' | 'failed'>('live');

  /* "First tap triggers the native camera prompt directly" — the tap was Scan label; the prompt comes
     up over this screen as it opens. Asked once; a denial lands on C1. */
  const asked = permission != null && !permission.granted && permission.canAskAgain;
  useEffect(() => {
    if (asked) void requestPermission();
  }, [asked, requestPermission]);

  const read = async (uri: string) => {
    const mine = ++attempt.current;
    setPhoto(uri);
    setPhase('reading');
    try {
      const result = await readLabelPhoto(uri);
      if (mine !== attempt.current) return;
      if (result.outcome === 'unreadable') {
        setPhase('failed');
        return;
      }
      onScanned({ read: result, photoUri: uri });
    } catch {
      if (mine === attempt.current) setPhase('failed');
    }
  };

  const shoot = async () => {
    if (!ready || phase !== 'live') return;
    try {
      const shot = await cameraRef.current?.takePictureAsync({ quality: 0.85, shutterSound: false });
      if (shot?.uri) await read(shot.uri);
    } catch {
      setPhase('failed');
    }
  };

  const fromPhotos = async () => {
    const asset = await pick({ kind: 'images', directLibrary: true });
    if (asset?.uri) await read(asset.uri);
  };

  const cancel = () => {
    attempt.current += 1;
    setPhoto(null);
    setPhase('live');
  };

  const cameraOff = permission != null && !permission.granted && !permission.canAskAgain;
  const live = phase === 'live' && !cameraOff;

  return (
    <View style={styles.screen}>
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch && live}
          animateShutter={false}
          onCameraReady={() => setReady(true)}
        />
      ) : null}

      {/* B1/B2 — the frame. B2 freezes the photo in it, dimmed, with the bronze line passing down. */}
      {live || phase === 'reading' ? (
        <View pointerEvents="none" style={[styles.frame, phase === 'reading' ? styles.maskReading : styles.mask]}>
          {phase === 'reading' && photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.frozen} resizeMode="cover" />
              <View style={styles.frozenDim} />
              <ScanLine />
            </>
          ) : (
            <View style={styles.frameHint}>
              <Text style={styles.frameText}>Fit the full Nutrition Facts label</Text>
            </View>
          )}
          <Corner at="tl" />
          <Corner at="tr" />
          <Corner at="bl" />
          <Corner at="br" />
        </View>
      ) : null}

      {phase === 'failed' ? <View pointerEvents="none" style={styles.failedDim} /> : null}

      {/* header */}
      <View style={[styles.header, { top: insets.top + 4 }]}>
        <IconButton label="Close" onPress={onClose}>
          <Path d="M6 6l12 12M18 6L6 18" />
        </IconButton>
        <Text style={styles.headerTitle}>Scan label</Text>
        {live ? (
          <IconButton label="Flash" onPress={() => setTorch((v) => !v)} on={torch}>
            <Path d="M13 3L5 14h6l-1 7 8-11h-6z" />
          </IconButton>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* the tip chip — B2 turns it into the status */}
      {live || phase === 'reading' ? (
        <View pointerEvents="none" style={[styles.chipRow, { bottom: 170 + insets.bottom }]}>
          <View style={[styles.chip, phase === 'reading' && styles.chipReading]}>
            {phase === 'reading' ? <View style={styles.chipDot} /> : null}
            <Text style={styles.chipText}>{phase === 'reading' ? 'Reading label…' : 'Flat · bright · no glare'}</Text>
          </View>
        </View>
      ) : null}

      {/* controls */}
      {live ? (
        <View style={[styles.controls, { bottom: 44 + insets.bottom }]}>
          <View style={styles.controlSide}>
            <IconButton label="Choose from photos" onPress={fromPhotos}>
              <Rect x={4} y={5} width={16} height={14} rx={2} />
              <Circle cx={9} cy={10} r={1.6} />
              <Path d="M20 16l-5-5-8 8" />
            </IconButton>
            <Text style={styles.controlLabel}>Photos</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            disabled={!ready}
            onPress={shoot}
            style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
          >
            <View style={styles.shutterFace} />
          </Pressable>
          <View style={styles.controlSide} />
        </View>
      ) : null}

      {phase === 'reading' ? (
        <View style={[styles.readingControls, { bottom: 44 + insets.bottom }]}>
          <View style={styles.shutterGhost} />
          <Button variant="text" onPress={cancel}>
            Cancel
          </Button>
        </View>
      ) : null}

      {/* C1 — camera access is off */}
      {cameraOff && phase === 'live' ? (
        <View style={[styles.panel, { bottom: 14 + insets.bottom }]}>
          <Card variant="elevated">
            <View style={styles.panelBody}>
              <Text style={styles.panelTitle}>Camera access is off</Text>
              <Text style={[styles.panelText, styles.panelTextGap]}>
                Enable camera access to scan a label, or choose an existing photo.
              </Text>
              <Button variant="primary" fullWidth onPress={() => void Linking.openSettings()}>
                Open Settings
              </Button>
              <Button variant="secondary" fullWidth onPress={fromPhotos}>
                Choose photo
              </Button>
              <View style={styles.panelCenter}>
                <Button variant="text" onPress={onManual}>
                  Enter manually
                </Button>
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {/* C2 — couldn't read this label */}
      {phase === 'failed' ? (
        <View style={[styles.panel, { bottom: 14 + insets.bottom }]}>
          <Card variant="elevated">
            <View style={styles.panelBody}>
              <View style={styles.failedHead}>
                {photo ? <Image source={{ uri: photo }} style={styles.failedThumb} /> : <View style={styles.failedThumb} />}
                <View style={styles.failedCopy}>
                  <Text style={styles.panelTitle}>Couldn’t read this label</Text>
                  <Text style={styles.panelText}>Try again with the full label flat, bright, and glare-free.</Text>
                </View>
              </View>
              <Button variant="primary" fullWidth onPress={cancel}>
                Try again
              </Button>
              <Button variant="secondary" fullWidth onPress={fromPhotos}>
                Choose another photo
              </Button>
              <View style={styles.panelCenter}>
                <Button variant="text" onPress={onManual}>
                  Enter manually
                </Button>
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {mediaPickerSheet}
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

/** "A bronze line passes down it." Loops until the read lands; JS-driven because it moves `top` in %. */
function ScanLine() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const top = t.interpolate({ inputRange: [0, 1], outputRange: ['4%', '96%'] });
  return <Animated.View style={[styles.scanLine, { top }]} />;
}

function Corner({ at }: { at: 'tl' | 'tr' | 'bl' | 'br' }) {
  return <View style={[styles.corner, styles[at]]} />;
}

function IconButton({
  label,
  onPress,
  on = false,
  children,
}: {
  label: string;
  onPress: () => void;
  on?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      hitSlop={6}
      style={styles.iconButton}
    >
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke={on ? flColor.bronze300 : OVER_CAMERA.text}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </Svg>
    </Pressable>
  );
}

/** Fixed colours for what sits on the live picture — see the header comment. Values from the `.dc`. */
const OVER_CAMERA = {
  ground: '#070707',
  text: '#F0EDE8',
  hint: 'rgba(240, 237, 232, 0.75)',
  muted: 'rgba(240, 237, 232, 0.6)',
  chip: 'rgba(10, 10, 10, 0.72)',
  chipBorder: '#24242A',
  line: '#CDA063',
};

const CORNER = 30;
const FILL = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: OVER_CAMERA.ground },

  frame: { position: 'absolute', left: '10%', right: '10%', top: '15%', bottom: '30%', borderRadius: 12 },
  mask: { boxShadow: '0 0 0 999px rgba(4, 4, 4, 0.55)' },
  maskReading: { boxShadow: '0 0 0 999px rgba(4, 4, 4, 0.72)', overflow: 'hidden' },
  frameHint: { ...FILL, alignItems: 'center', justifyContent: 'center', padding: 20 },
  frameText: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: OVER_CAMERA.hint, textAlign: 'center' },
  frozen: { ...FILL, borderRadius: 12 },
  frozenDim: { ...FILL, backgroundColor: 'rgba(5, 5, 5, 0.38)' },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: OVER_CAMERA.line,
    boxShadow: '0 0 14px 2px rgba(205, 160, 99, 0.45)',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: OVER_CAMERA.line },
  tl: { left: -2, top: -2, borderLeftWidth: 2.5, borderTopWidth: 2.5, borderTopLeftRadius: 12 },
  tr: { right: -2, top: -2, borderRightWidth: 2.5, borderTopWidth: 2.5, borderTopRightRadius: 12 },
  bl: { left: -2, bottom: -2, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderBottomLeftRadius: 12 },
  br: { right: -2, bottom: -2, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderBottomRightRadius: 12 },

  failedDim: { ...FILL, backgroundColor: 'rgba(4, 4, 4, 0.6)' },

  header: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 15, fontWeight: '600', color: OVER_CAMERA.text },
  headerSpacer: { width: 44 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  chipRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    backgroundColor: OVER_CAMERA.chip,
    borderWidth: 1,
    borderColor: OVER_CAMERA.chipBorder,
  },
  chipReading: { borderColor: 'rgba(181, 138, 97, 0.19)' },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: OVER_CAMERA.line },
  chipText: { fontSize: 13, fontWeight: '600', color: OVER_CAMERA.text },

  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 34 },
  controlSide: { flex: 1, alignItems: 'flex-start', gap: 6 },
  controlLabel: { fontSize: 11, color: OVER_CAMERA.muted, width: 44, textAlign: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 5,
    borderWidth: 2.5,
    borderColor: OVER_CAMERA.line,
    boxShadow: '0 0 2px rgba(186, 144, 90, 0.14)', // --fl-glow-forge
  },
  shutterPressed: { transform: [{ scale: 0.96 }] },
  shutterFace: { flex: 1, borderRadius: 999, backgroundColor: OVER_CAMERA.text, boxShadow: 'inset 0 -3px 6px rgba(0, 0, 0, 0.25)' },
  readingControls: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  shutterGhost: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: '#2E2E35', opacity: 0.5 },

  panel: { position: 'absolute', left: 12, right: 12 },
  panelBody: { gap: 10 },
  panelTitle: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', color: flColor.cream100 },
  panelText: { fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  panelTextGap: { marginBottom: 6 },
  panelCenter: { alignItems: 'center' },
  failedHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  failedThumb: { width: 44, height: 56, borderRadius: 6, borderWidth: 1, borderColor: flColor.charcoal500, backgroundColor: flColor.charcoal700 },
  failedCopy: { flex: 1, gap: 4 },
});
