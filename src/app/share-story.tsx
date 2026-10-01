import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useEffect, useId, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { StoryCanvas } from '@/components/forge/StoryCanvas';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchShareStory, type ShareStoryData } from '@/data/share-story-live';
import { composeStory, defaultStyle, STORY_STYLES, storyInputFrom, storyMessage, styleSpec, type StoryStyle } from '@/domain/share/story-card';
import { useToast } from '@/hooks/useCeremony';
import { useUnits } from '@/lib/settings';
import { StoryCardHost } from '@/lib/story-card-host';
import { exportStory } from '@/lib/story-image';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { errorMessage } from '@/lib/useQuery';

/**
 * SHARE A PICTURE — the finished session as a story-sized image (PO 2026-10-01).
 *
 * Opened from the share sheet's "Share as a picture" row, on Workout Complete and on Activity Detail. Three
 * styles for a lifting day (Photo Stats · Engraved · Ledger), three for a run (Photo Route · Route Card ·
 * Sticker), chosen by their own previews rather than by name. The big preview is the export drawn small —
 * `domain/share/story-card` describes the picture once and both the screen and the file paint that.
 *
 * ══ ONE SCREEN, NO DETOURS ══
 *
 * A photo style without a photo offers Take Photo and Choose Photo right on its preview, so nobody is sent
 * away to find one. The cards need nothing and are ready the moment the screen opens.
 *
 * ══ THE ROUTE STARTS OFF, EVERY TIME (D-RS-3) ══
 *
 * `showRoute` is plain component state: never saved, never remembered, false on every visit.
 * Route-Sharing-Amendment-001 §4 makes the map a per-share choice precisely because a remembered "yes" is
 * how a start line outside somebody's front door ends up in every story they post.
 */

interface PickedPhoto {
  uri: string;
  w: number;
  h: number;
}

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workout';

export default function ShareStoryScreen() {
  const { workoutId, photo: photoParam } = useLocalSearchParams<{ workoutId?: string; photo?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { units } = useUnits();
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();

  const [data, setData] = useState<ShareStoryData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<StoryStyle | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [busy, setBusy] = useState<'share' | 'sticker' | null>(null);

  useEffect(() => {
    if (!workoutId) return;
    let alive = true;
    fetchShareStory(workoutId, units).then(
      (d) => alive && setData(d),
      (e: unknown) => alive && setLoadError(errorMessage(e) || 'Couldn’t load this session.'),
    );
    return () => {
      alive = false;
    };
  }, [workoutId, units]);

  // The photo the athlete added on Workout Complete, if any — measured so the crop matches the export. A
  // photo they pick here wins, even if this measurement lands after it.
  useEffect(() => {
    if (!photoParam) return;
    Image.getSize(
      photoParam,
      (w, h) => setPhoto((p) => p ?? { uri: photoParam, w, h }),
      () => {
        /* a photo that will not measure is offered as no photo, never drawn stretched */
      },
    );
  }, [photoParam]);

  const input = useMemo(
    () => (data ? storyInputFrom(data.completion, { startedAt: data.startedAt, route: data.route, climbM: data.climbM }, units) : null),
    [data, units],
  );

  const natW = photo?.w ?? 0;
  const natH = photo?.h ?? 0;
  const available = input ? STORY_STYLES[input.kind] : [];
  const style = input ? chosen ?? defaultStyle(input.kind, !!photo) : null;
  const drawing = useMemo(
    () => (input && style ? composeStory(style, input, natW ? { w: natW, h: natH } : null, { showRoute }) : null),
    [input, style, natW, natH, showRoute],
  );
  const thumbs = useMemo(
    () => (input ? STORY_STYLES[input.kind].map((st) => composeStory(st.id, input, natW ? { w: natW, h: natH } : null, { showRoute })) : []),
    [input, natW, natH, showRoute],
  );

  const takePhoto = async (how: 'camera' | 'library' | 'choose') => {
    const asset = await pick({
      kind: 'images',
      title: 'Photo for your picture',
      directCamera: how === 'camera',
      directLibrary: how === 'library',
    });
    if (asset?.uri && asset.width && asset.height) setPhoto({ uri: asset.uri, w: asset.width, h: asset.height });
  };

  if (!workoutId || loadError) {
    return (
      <View style={s.root}>
        <Bg />
        <AppBar title="Share a picture" onClose={() => router.back()} />
        <View style={s.center}>
          <Text style={s.emptyTitle}>Couldn’t open this session</Text>
          <Text style={s.emptyBody}>{loadError ?? 'There’s no session to share here.'}</Text>
        </View>
      </View>
    );
  }
  if (!input || !drawing || !style) {
    return (
      <View style={s.root}>
        <Bg />
        <AppBar title="Share a picture" onClose={() => router.back()} />
        <View style={s.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  const spec = styleSpec(style);
  const hasRoute = input.kind === 'run' && !!input.run.route;
  const isSticker = spec.transparent;
  const web = Platform.OS === 'web';

  // The preview is as tall as the screen allows after the chooser and the buttons; never wider than the screen.
  const previewH = Math.max(300, Math.min(640, screenH - insets.top - insets.bottom - 430));
  const previewW = Math.min(screenW - 48, (previewH * 9) / 16);
  const thumbW = Math.min(92, (screenW - 40 - 32) / 3);

  const fileName = `forge-legacy-${slug(input.title)}-${style}`;

  const share = async (prefer: 'sheet' | 'clipboard') => {
    if (busy) return;
    setBusy(prefer === 'clipboard' ? 'sticker' : 'share');
    try {
      const result = await exportStory({ drawing, photoUri: photo?.uri ?? null, fileName, prefer, message: storyMessage(input) });
      if (!result.ok) {
        showToast(result.reason);
        return;
      }
      if (result.via === 'download') {
        showToast(isSticker ? 'Sticker downloaded — it has a see-through background' : 'Picture downloaded');
      } else if (result.via === 'clipboard') {
        if (prefer === 'clipboard') {
          // Into Instagram's story camera, where a paste lands as a sticker over their own photo or video.
          const opened = await Linking.openURL('instagram://story-camera').then(
            () => true,
            () => false,
          );
          showToast(
            opened
              ? 'Sticker copied — add your photo or video, then paste it on top'
              : 'Sticker copied — paste it onto your Instagram story',
          );
        } else {
          showToast('Picture copied — paste it anywhere');
        }
      }
      // `sheet`: the share sheet is the receipt — nothing here knows which button they pressed in it.
    } catch (e) {
      showToast(errorMessage(e) || 'Couldn’t share that. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.root}>
      <Bg />
      {/* Off-screen rasteriser for the phone export. Renders nothing until an export is in flight. */}
      <StoryCardHost />
      <AppBar title="Share a picture" subtitle={input.title} onClose={() => router.back()} />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} style={s.flex} contentContainerStyle={[s.scroll, { paddingBottom: 16 }]} showsVerticalScrollIndicator={false}>
        {/* ── the picture ── */}
        <View style={s.previewWrap}>
          <View style={[s.preview, { width: previewW, height: (previewW * 16) / 9 }]}>
            {isSticker ? <Checker w={previewW} h={(previewW * 16) / 9} /> : null}
            <StoryCanvas drawing={drawing} photoUri={photo?.uri ?? null} width={previewW} />
            {drawing.needsPhoto ? (
              <View style={s.needPhoto}>
                <EngravedIcon name="camera" size={28} color={flColor.bronze300} />
                <Text style={s.needTitle}>This style is built on your photo</Text>
                <View style={s.needBtns}>
                  {!web ? (
                    <Pressable onPress={() => void takePhoto('camera')} accessibilityRole="button" accessibilityLabel="Take a photo" style={s.needBtn}>
                      <Text style={s.needBtnText}>Take Photo</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => void takePhoto('library')} accessibilityRole="button" accessibilityLabel="Choose a photo" style={s.needBtn}>
                    <Text style={s.needBtnText}>Choose Photo</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── photo and route ── */}
        {spec.photo !== 'none' && photo ? (
          <View style={s.inlineRow}>
            <Pressable onPress={() => void takePhoto('choose')} accessibilityRole="button" accessibilityLabel="Change the photo" style={s.linkBtn}>
              <EngravedIcon name="camera" size={15} color={flColor.bronze300} />
              <Text style={s.linkText}>Change photo</Text>
            </Pressable>
            {spec.photo === 'optional' ? (
              <Pressable onPress={() => setPhoto(null)} accessibilityRole="button" accessibilityLabel="Remove the photo" style={s.linkBtn}>
                <Text style={s.linkMuted}>Remove photo</Text>
              </Pressable>
            ) : null}
          </View>
        ) : spec.photo === 'optional' ? (
          <View style={s.inlineRow}>
            <Pressable onPress={() => void takePhoto('choose')} accessibilityRole="button" accessibilityLabel="Add a photo" style={s.linkBtn}>
              <EngravedIcon name="camera" size={15} color={flColor.bronze300} />
              <Text style={s.linkText}>Add a photo (optional)</Text>
            </Pressable>
          </View>
        ) : null}

        {hasRoute ? (
          <Pressable
            onPress={() => setShowRoute((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: showRoute }}
            accessibilityLabel="Show my route on the picture"
            accessibilityHint="The route is shown exactly as it was recorded, including where you started and finished"
            style={[s.routeRow, showRoute && s.routeRowOn]}
          >
            <View style={[s.box, showRoute && s.boxOn]}>{showRoute ? <EngravedIcon name="check" size={12} color={flColor.charcoal900} /> : null}</View>
            <View style={s.routeText}>
              <Text style={[s.routeLabel, showRoute && s.routeLabelOn]}>Show my route</Text>
              <Text style={s.routeSub}>Shows where you ran, start and finish included.</Text>
            </View>
          </Pressable>
        ) : null}

        {/* ── the three styles, chosen by their own previews ── */}
        <View style={s.thumbs}>
          {available.map((st, i) => {
            const on = st.id === style;
            return (
              <Pressable
                key={st.id}
                onPress={() => setChosen(st.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${st.label} style`}
                style={s.thumb}
              >
                <View style={[s.thumbFrame, { width: thumbW + 6, height: (thumbW * 16) / 9 + 6 }, on ? s.thumbOn : s.thumbOff]}>
                  {st.transparent ? <Checker w={thumbW} h={(thumbW * 16) / 9} /> : null}
                  <StoryCanvas drawing={thumbs[i]} photoUri={photo?.uri ?? null} width={thumbW} />
                </View>
                <Text style={[s.thumbLabel, on && s.thumbLabelOn]}>{st.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {isSticker ? (
          <Text style={s.hint}>See-through. Lay it over your own photo or video in an Instagram story.</Text>
        ) : null}
      </ScrollView>

      {/* ── send ── */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {isSticker && !web ? (
          <>
            <Button variant="primary" fullWidth disabled={!!busy} onPress={() => void share('clipboard')} accessibilityLabel="Copy the sticker and open Instagram">
              {busy === 'sticker' ? 'Building…' : 'Copy sticker for Instagram'}
            </Button>
            <Button variant="secondary" fullWidth disabled={!!busy} onPress={() => void share('sheet')} accessibilityLabel="Share the sticker as an image">
              {busy === 'share' ? 'Building…' : 'Share as image'}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            fullWidth
            disabled={!!busy || drawing.needsPhoto}
            onPress={() => void share('sheet')}
            accessibilityLabel={web ? 'Download the picture' : 'Share the picture'}
          >
            {busy ? 'Building…' : drawing.needsPhoto ? 'Add a photo to share this style' : web ? (isSticker ? 'Download sticker' : 'Download picture') : 'Share'}
          </Button>
        )}
      </View>
      {mediaPickerSheet}
    </View>
  );
}

function Bg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.36)' }} />;
}

/** The see-through sticker sits on a checkerboard, the universal sign for "no background". */
function Checker({ w, h }: { w: number; h: number }) {
  const id = `chk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const cell = Math.max(6, Math.round(w / 18));
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id={id} width={cell * 2} height={cell * 2} patternUnits="userSpaceOnUse">
          <Rect width={cell * 2} height={cell * 2} fill="#1D1F22" />
          <Rect width={cell} height={cell} fill="#2A2C30" />
          <Rect x={cell} y={cell} width={cell} height={cell} fill="#2A2C30" />
        </Pattern>
      </Defs>
      <Rect width={w} height={h} fill={`url(#${id})`} />
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 36 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: flColor.cream100, textAlign: 'center' },
  emptyBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },

  previewWrap: { alignItems: 'center' },
  preview: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: '#0C1013' },
  needPhoto: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(5,8,10,0.55)',
  },
  needTitle: { fontSize: 15, fontWeight: '700', color: '#F0EDE8', textAlign: 'center' },
  needBtns: { flexDirection: 'row', gap: 10 },
  needBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: 'rgba(201,151,103,0.7)', backgroundColor: 'rgba(12,16,19,0.85)' },
  needBtnText: { fontSize: 13.5, fontWeight: '700', color: '#C99767' },

  inlineRow: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  linkText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  linkMuted: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  routeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle,
  },
  routeRowOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: flColor.bronzeBorderSubtle, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: flColor.bronze300, backgroundColor: flColor.bronze300 },
  routeText: { flex: 1, minWidth: 0, gap: 2 },
  routeLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  routeLabelOn: { color: flColor.selectedInk },
  routeSub: { fontSize: 11.5, color: flColor.gray600 },

  thumbs: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 2 },
  thumb: { alignItems: 'center', gap: 7 },
  thumbFrame: { borderRadius: 10, padding: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbOn: { borderWidth: 2, borderColor: flColor.bronze400 },
  thumbOff: { borderWidth: 1, borderColor: flColor.charcoal600, opacity: 0.8 },
  thumbLabel: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  thumbLabelOn: { color: flColor.bronze300, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, color: flColor.gray600, textAlign: 'center', paddingHorizontal: 12 },

  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: flColor.divider },
});
