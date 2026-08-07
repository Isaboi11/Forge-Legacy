import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useToast } from '@/hooks/useCeremony';
import { flColor } from '@/constants/foundation';
import { DOWNSCALE_COMPRESS, downscaleTarget } from '@/lib/image-downscale-core';

/**
 * useMediaPicker — one consistent "camera or library" chooser for every place the app captures a photo or a
 * video. Tapping a capture control opens a BottomSheet: **Take a photo / Record a video** (opens the device
 * camera, permission requested first) or **Choose from library**. `pick()` resolves with the chosen asset
 * (or `null` if cancelled/denied); render `mediaPickerSheet` once in the screen.
 *
 * THE WEB USED TO GET NO CHOICE. This file said web "can't capture from the camera" and sent every web
 * request straight to the library — so on the deployed preview, which is the surface the athletes actually
 * test on, "add a photo or video" only ever meant "open your camera roll". That was wrong: expo-image-picker's
 * web `launchCameraAsync` sets the `capture` attribute on its file input, and a mobile browser honours it by
 * opening the camera. So a phone browser now gets the same two-way chooser a native build does.
 *
 * Desktop web still skips it — `capture` is ignored there, so a "Take a photo" row would open the same file
 * dialog as "Choose from library" and mean nothing. `(pointer: coarse)` is what separates the two.
 */
export type MediaKind = 'images' | 'videos' | 'both';

/**
 * Video ceiling, enforced here rather than at the call sites, for the same reason the photo resize is.
 *
 * A form check is fifteen seconds and a working set is twenty, so thirty is what the feature actually
 * needs — this is a cap, not a compromise. It is also the only video lever that works everywhere:
 * `videoQuality` caps the RESOLUTION of what the app RECORDS, and only on iOS. A video chosen from the
 * library arrives at whatever size the phone saved it, on both platforms. Genuinely bounding that would
 * need transcoding, which nothing in the stack does today.
 */
export const MAX_VIDEO_SECONDS = 30;

/**
 * How long to wait for the chooser sheet to be gone before presenting a system picker, when the
 * platform gives no dismissal signal.
 *
 * `Modal`'s `onDismiss` is iOS-only, and iOS is the platform that actually needs this — so on iOS the
 * timeout is a backstop that normally never fires, and on Android it IS the wait. Comfortably longer
 * than the `animationType="slide"` dismissal (~300ms) and short enough to read as part of the tap.
 */
const SHEET_DISMISS_FALLBACK_MS = 400;

export interface MediaPickConfig {
  kind: MediaKind;
  title?: string;
  hint?: string;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  videoMaxDuration?: number; // silently clamped to MAX_VIDEO_SECONDS; omit unless a surface wants LESS
  cameraType?: ImagePicker.CameraType; // camera-only (e.g. front for a selfie check-in)
  directCamera?: boolean; // skip the chooser and open the camera straight away (library is not offered)
}

type Resolver = (asset: ImagePicker.ImagePickerAsset | null) => void;

/**
 * Whether this platform can actually reach a camera. Native always can. On the web it comes down to
 * whether the browser honours the `capture` attribute, which in practice means a touch device — a desktop
 * browser ignores it and falls back to the file dialog, and offering "Take a photo" there would be a lie.
 *
 * Read from an event handler, never during render (the react-compiler rules forbid the impure read).
 */
function canUseCamera(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

const cameraLabel = (kind: MediaKind): string => (kind === 'images' ? 'Take a photo' : kind === 'videos' ? 'Record a video' : 'Take a photo or video');

/**
 * Cap a picked photo's pixel dimensions before anyone can upload it.
 *
 * This sits here, in the app's single capture path, rather than in each of the seven upload call sites —
 * `quality` was already being passed at every one of them and did nothing about resolution, because the
 * picker's quality flag re-encodes the JPEG and keeps all 12 megapixels. Every consumer reads
 * `asset.uri`, so replacing it is enough; the upload paths set their `contentType` from the fetched
 * blob's own type rather than from the asset, so the PNG→JPEG re-encode cannot mislabel anything.
 *
 * A failure here returns the ORIGINAL asset. Losing an athlete's photo to a storage optimisation would
 * be a far worse outcome than storing one photo at full size.
 */
async function downscalePhoto(asset: ImagePicker.ImagePickerAsset): Promise<ImagePicker.ImagePickerAsset> {
  if (asset.type === 'video') return asset; // ImageManipulator cannot touch video; duration is its cap
  const target = downscaleTarget(asset.width, asset.height);
  if (!target) return asset;
  try {
    const rendered = await ImageManipulator.manipulate(asset.uri).resize(target).renderAsync();
    const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: DOWNSCALE_COMPRESS });
    return { ...asset, uri: out.uri, width: out.width, height: out.height, mimeType: 'image/jpeg', fileSize: undefined };
  } catch {
    return asset;
  }
}

export function useMediaPicker() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<MediaPickConfig | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const settle = useCallback((asset: ImagePicker.ImagePickerAsset | null) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    if (r) r(asset);
  }, []);

  /**
   * Resolves once the chooser sheet is really gone.
   *
   * ══ THE BUG THIS CLOSES ══
   *
   * Reported from the tester build: *"I click add photo and then the camera works but I click on
   * 'Choose from library' but it doesn't take me to my library."*
   *
   * **iOS refuses to present a view controller while another is still on screen.** The chooser is a
   * `BottomSheet`, which is an RN `Modal`; `setOpen(false)` only SCHEDULES its dismissal, so calling
   * `launchImageLibraryAsync` in the same tick presented the photo picker into a modal that was still
   * there. iOS dropped it silently — no throw, no rejection, nothing for the `catch` below to report.
   * The row simply did nothing.
   *
   * ⚠ **The camera worked only by accident**, and that is the whole reason this took a tester to find.
   * Its branch `await`s `requestCameraPermissionsAsync()` first — a native round-trip — which happened
   * to give the modal enough time to finish dismissing. One path had an incidental delay and the other
   * did not, so the two rows of the same sheet behaved differently.
   *
   * `onDismiss` is the deterministic signal and RN only implements it on iOS, so the timeout is the
   * fallback for everywhere else rather than the mechanism. Web skips the wait entirely — its "modal"
   * is a div and its picker is a file input, so there is nothing to collide with.
   */
  const dismissRef = useRef<(() => void) | null>(null);
  const sheetGone = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (Platform.OS === 'web') return resolve();
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          dismissRef.current = null;
          resolve();
        };
        dismissRef.current = finish;
        setTimeout(finish, SHEET_DISMISS_FALLBACK_MS);
      }),
    [],
  );

  const launch = useCallback(
    async (config: MediaPickConfig, source: 'camera' | 'library', fromSheet: boolean) => {
      setOpen(false);
      // Only when the chooser was actually on screen. The direct paths below (desktop web, and
      // `directCamera`) never opened it, so there is nothing to wait for and no delay to pay.
      if (fromSheet) await sheetGone();
      const mediaTypes: ('images' | 'videos')[] = config.kind === 'both' ? ['images', 'videos'] : [config.kind];
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes,
        allowsEditing: config.allowsEditing,
        aspect: config.aspect,
        quality: config.quality,
        // A caller may ask for less than the ceiling but never more — 0 means "no limit" to the picker,
        // so it has to clamp up to the cap rather than through it.
        videoMaxDuration: config.videoMaxDuration && config.videoMaxDuration > 0 ? Math.min(config.videoMaxDuration, MAX_VIDEO_SECONDS) : MAX_VIDEO_SECONDS,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720, // iOS-only; 720p is plenty for a form check
      };
      try {
        if (source === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            showToast('Camera access is needed to capture here.');
            settle(null);
            return;
          }
        }
        const res = source === 'camera' ? await ImagePicker.launchCameraAsync({ ...opts, cameraType: config.cameraType }) : await ImagePicker.launchImageLibraryAsync(opts);
        const picked = res.canceled ? null : res.assets?.[0] ?? null;
        settle(picked ? await downscalePhoto(picked) : null);
      } catch {
        showToast(source === 'camera' ? 'Couldn’t open your camera.' : 'Couldn’t open your library.');
        settle(null);
      }
    },
    [settle, showToast, sheetGone],
  );

  const pick = useCallback(
    (config: MediaPickConfig) =>
      new Promise<ImagePicker.ImagePickerAsset | null>((resolve) => {
        settle(null); // resolve any abandoned request as cancelled so the resolver has a single owner
        resolverRef.current = resolve;
        // No camera to offer (desktop web) — the library IS the whole choice, so don't draw a chooser
        // with one usable row on it.
        if (!canUseCamera()) {
          void launch(config, 'library', false);
          return;
        }
        if (config.directCamera) {
          void launch(config, 'camera', false); // straight to the camera, no chooser
          return;
        }
        setCfg(config);
        setOpen(true);
      }),
    [launch, settle],
  );

  const close = useCallback(() => {
    setOpen(false);
    settle(null);
  }, [settle]);

  const mediaPickerSheet = (
    <BottomSheet open={open} onClose={close} title={cfg?.title ?? 'Add media'} onDismiss={() => dismissRef.current?.()}>
      <View style={styles.list}>
        <SourceRow
          icon={<CameraGlyph />}
          label={cfg ? cameraLabel(cfg.kind) : 'Camera'}
          onPress={() => {
            if (cfg) void launch(cfg, 'camera', true);
          }}
        />
        <SourceRow
          icon={<LibraryGlyph />}
          label="Choose from library"
          divided
          onPress={() => {
            if (cfg) void launch(cfg, 'library', true);
          }}
        />
      </View>
      {cfg?.hint ? <Text style={styles.hint}>{cfg.hint}</Text> : null}
    </BottomSheet>
  );

  return { pick, mediaPickerSheet };
}

function SourceRow({ icon, label, onPress, divided = false }: { icon: ReactNode; label: string; onPress: () => void; divided?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.row, divided ? styles.rowDivided : null]}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

function CameraGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <Path d="M12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    </Svg>
  );
}
function LibraryGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 4h12v12H8z" />
      <Path d="M4 8v10a2 2 0 0 0 2 2h10" />
      <Path d="M11 11.5l2.2 2.2L16 11l4 4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  list: { marginHorizontal: -6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 8 },
  rowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowIcon: { flexShrink: 0 },
  rowLabel: { fontSize: 15, color: flColor.cream100 },
  hint: { fontSize: 12, lineHeight: 17, color: flColor.gray600, marginTop: 14, textAlign: 'center' },
});
