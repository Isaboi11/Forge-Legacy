import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ProgressPostCard } from '@/components/forge/ProgressPostCard';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { addSquadPost, type ProgressCardPhoto, type ProgressPostCard as ProgressCardData } from '@/data/squad-feed-live';
import { fetchTransformationEntries, XFORM_POSES, type PoseKey, type TransformationEntry } from '@/data/transformation-live';
import {
  DEFAULT_INCL,
  PREVIEW_W,
  PROGRESS_FORMATS,
  clampSelection,
  defaultSelection,
  selectionHint,
  togglePose,
  type ProgressFormat,
  type ProgressIncl,
  type ProgressStyle,
} from '@/domain/share/progress-card';
import { saveProgressCard } from '@/lib/progress-image';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useProfile } from '@/lib/profile';
import { useToast } from '@/hooks/useCeremony';
import { ProgressCardHost } from '@/lib/progress-card-host';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Progress Photo Post — built to `Progress Photo Post.dc.html` (`design_handoff_progress_photo_post`).
 *
 * Progress photos used to share as one long vertical card that read badly in an Instagram or Facebook
 * feed, and the athlete had no say in how it was laid out. This screen is the say: pick an output format
 * (1:1 or 4:5), a style (Grid or a swipeable Hero carousel), which of the entry's six poses to include,
 * what goes on the card, and where it goes.
 *
 * IT IS NOT A THEN/NOW COMPARISON. That is Share Configuration (SH-1) and it is deliberately untouched;
 * the design's note says the two merge in a later pass, and this screen was built first so the merge has
 * something to merge into.
 *
 * THE PREVIEW IS THE POST IS THE EXPORT. One renderer (`ProgressPostCard`) draws the card here, in the
 * squad feed and on the post; the exporter redraws the same geometry at 3.6× onto a canvas. There is no
 * separate in-app layout, so nothing can look one way in the composer and another in the feed.
 *
 * ══ WHY THE LAUNCH CONTEXT IS A ROUTE PARAM ══
 *
 * The design writes a context object to `localStorage` and deletes it on read, so a stale context can
 * never hijack a later open. Route params ARE that, structurally: they arrive with the navigation that
 * created this screen and cannot outlive it. The prototype needed the storage key because a static HTML
 * page has no other way to be told why it was opened.
 *
 * ══ WHY INSTAGRAM AND FACEBOOK RENDER FIRST AND OPEN SECOND ══
 *
 * Neither platform has a share intent this stack can call — Instagram's needs a native SDK and a
 * registered Facebook app id. What it CAN do is compose the real image at the chosen format, hand it to
 * the athlete, and then open the app so it is one paste away. If the render fails, the reason is shown
 * and the app is NOT opened: sending someone to Instagram with nothing on their camera roll is the kind
 * of confident false claim this codebase treats as unshippable (see the note in `share-config.tsx`).
 */

type SendTarget = 'instagram' | 'facebook' | 'save' | 'more';

const APP_URL: Record<'instagram' | 'facebook', { native: string; web: string; label: string }> = {
  instagram: { native: 'instagram://app', web: 'https://www.instagram.com/', label: 'Instagram' },
  facebook: { native: 'fb://facewebmodal', web: 'https://www.facebook.com/', label: 'Facebook' },
};

const TOGGLES: { key: keyof ProgressIncl; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'meta', label: 'Stats' },
  { key: 'chapter', label: 'Chapter' },
  { key: 'name', label: 'Name' },
  { key: 'pose', label: 'Pose labels' },
];

const STYLES: { id: ProgressStyle; label: string; sub: string }[] = [
  { id: 'grid', label: 'Grid', sub: 'Up to 4 photos' },
  { id: 'hero', label: 'Hero', sub: 'Swipeable, date stamped' },
];

const poseShort = (k: string): string => XFORM_POSES.find((p) => p.key === k)?.short ?? '';

export default function ProgressPhotoPostRoute() {
  const params = useLocalSearchParams<{ origin?: string; entryId?: string; squadId?: string; squadName?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { showToast } = useToast();
  const { profile } = useProfile();
  const { data, loading } = useQuery(fetchTransformationEntries, []);

  const origin = params.origin === 'squad' ? 'squad' : 'transformation';
  const squadId = params.squadId ? String(params.squadId) : null;
  const squadName = params.squadName ? String(params.squadName) : 'your squad';

  const [entryId, setEntryId] = useState<string | null>(params.entryId ? String(params.entryId) : null);
  const [fmt, setFmt] = useState<ProgressFormat>('4x5');
  const [style, setStyle] = useState<ProgressStyle>('grid');
  /** Null until the athlete touches a tile — until then it is the entry's own default (§13). */
  const [sel, setSel] = useState<string[] | null>(null);
  /** Null means "whatever the entry reflected" — an entry switch resets to null rather than copying. */
  const [caption, setCaption] = useState<string | null>(null);
  const [incl, setIncl] = useState<ProgressIncl>(DEFAULT_INCL);
  const [busy, setBusy] = useState<SendTarget | 'post' | null>(null);
  /* ⚠ ABOVE THE EARLY RETURNS. This screen returns a loading state and an empty state before its main
     render, so a hook declared beside `renderCard` further down would be called conditionally — the
     rules-of-hooks error, and a real one: the ref would be re-created whenever an entry finished
     loading, taking the last export's delivery method with it. */
  const lastVia = useRef<'clipboard' | 'download'>('download');

  const entries = data ?? [];
  const entry: TransformationEntry | null = entries.find((e) => e.id === entryId) ?? entries[0] ?? null;

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <PostBg />
        <AppBar title={<BarTitle sub="" />} onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  /*
   * No captures at all is not an empty picker — it is a reason to be somewhere else. §22's "entry with
   * no photos" is about an entry that exists and is unfilled; an archive with nothing in it has no entry
   * to compose from and no date to stamp.
   */
  if (!entry) {
    return (
      <View style={styles.root}>
        <PostBg />
        <AppBar title={<BarTitle sub="" />} onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No progress captures yet</Text>
          <Text style={styles.emptyBody}>Capture a set in your Transformation archive and you can lay it out here.</Text>
          <Pressable onPress={() => router.replace('/transformation')} accessibilityRole="button" accessibilityLabel="Open your transformation archive" style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Open Transformation</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const filled = XFORM_POSES.filter((p) => entry.photos[p.key]).map((p) => p.key as string);
  const selection = clampSelection(sel ?? defaultSelection(filled, XFORM_POSES.map((p) => p.key)), style);
  const effCaption = caption ?? entry.caption ?? '';
  const athlete = profile?.name ?? 'You';

  const photos: ProgressCardPhoto[] = selection.map((k) => ({ url: entry.photos[k as PoseKey] ?? '', short: poseShort(k), pose: k }));
  const card: ProgressCardData = {
    kind: 'progress-card',
    format: fmt,
    style,
    entryId: entry.id,
    date: entry.label,
    meta: entry.meta,
    chapter: entry.chapterName,
    athlete,
    photos,
    incl,
  };

  const previewW = Math.min(PREVIEW_W, screenW - 40);

  const onTapPose = (key: string) => {
    const r = togglePose(selection, key, style);
    if (r.toast) {
      showToast(r.toast); // Over the cap: the selection is untouched, and the athlete is told why.
      return;
    }
    setSel(r.sel);
  };

  /** Switching entry resets the photo selection and the caption; format, style and toggles persist. */
  const pickEntry = (e: TransformationEntry) => {
    setEntryId(e.id);
    setSel(null);
    setCaption(null);
  };

  const fileName = `forge-legacy-progress-${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'capture'}`;

  /**
   * Render the card(s) and hand them over. Returns whether anything actually landed — a failure is
   * announced here and reported upward, so a caller never goes on to open an app that has nothing to
   * paste. `announce` is off when the caller has its own closing line to say.
   */
  /**
   * ⚠ THE VERB COMES FROM THE RESULT, NOT FROM THE PLATFORM OR THE HOPE.
   *
   * The web downloads files; the device copies ONE image to the clipboard, because writing to the
   * camera roll needs `expo-media-library` and that changes the native fingerprint (see
   * `lib/progress-image.ts`). This used to say "Saved to your photos" either way, which on device
   * would have sent somebody to Instagram to attach a file that was never written — the confident
   * false claim this screen's own header calls unshippable.
   *
   * `slides > count` is the hero carousel on device: one slide is on the clipboard and the rest are
   * not, and saying so is better than letting the athlete discover it in the Instagram composer.
   */
  const renderCard = async (announce: boolean): Promise<boolean> => {
    const result = await saveProgressCard({ card, fileName });
    if (!result.ok) {
      showToast(result.reason);
      return false;
    }
    lastVia.current = result.via;
    if (announce) {
      if (result.via === 'clipboard') {
        showToast(
          result.slides > result.count
            ? `Copied slide 1 of ${result.slides} — paste it anywhere`
            : 'Copied — paste it anywhere',
        );
      } else {
        showToast(result.count > 1 ? `Saved ${result.count} images` : 'Saved to your photos');
      }
    }
    return true;
  };

  const sendTo = async (target: SendTarget) => {
    if (busy) return;
    setBusy(target);
    try {
      if (target === 'more') {
        await systemShare();
        return;
      }
      const ok = await renderCard(target === 'save');
      if (!ok || target === 'save') return;
      const app = APP_URL[target];
      const url = Platform.OS === 'web' ? app.web : app.native;
      const opened = await Linking.openURL(url).then(
        () => true,
        () => false,
      );
      /* The image is real either way; only the hand-off can fail, and then it says exactly that.
         The verb tracks how the image was actually delivered — "Saved — attach it" would be a lie on
         device, where the card is on the clipboard and nothing was written to the camera roll. */
      const verb = lastVia.current === 'clipboard' ? 'Copied' : 'Saved';
      const how = lastVia.current === 'clipboard' ? 'paste it in' : 'attach it in';
      showToast(opened ? `${verb} — ${how} ${app.label}` : `${verb} — couldn’t open ${app.label}`);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const systemShare = async () => {
    const text = `${athlete} · ${entry.label}${entry.chapterName ? ` · ${entry.chapterName}` : ''}`;
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as { share?: (d: { title?: string; text?: string }) => Promise<void> }) : undefined;
      if (nav?.share) {
        try {
          await nav.share({ title: 'Forge Legacy', text });
        } catch {
          /* dismissed */
        }
        return;
      }
      showToast('Sharing isn’t available here');
      return;
    }
    try {
      await Share.share({ message: text });
    } catch {
      /* dismissed */
    }
  };

  const postToSquad = () => {
    if (busy || !squadId) return;
    setBusy('post');
    addSquadPost({
      squadId,
      type: 'progress',
      body: effCaption,
      // Every chosen photo, not just the first: `media` is what a surface without the card renderer
      // falls back to, and dropping three of four there would make the feed disagree with the post.
      media: photos.filter((p) => p.url).map((p) => ({ url: p.url, kind: 'image' as const })),
      layout: card,
    }).then(
      () => {
        setBusy(null);
        showToast(`Posted to ${squadName}`);
        // Behind the toast, so the confirmation is seen before the screen changes under it.
        setTimeout(() => router.dismissTo({ pathname: '/squad/[id]', params: { id: squadId } }), 800);
      },
      (e: unknown) => {
        setBusy(null);
        showToast(errorMessage(e));
      },
    );
  };

  const posting = busy === 'post';

  return (
    <View style={styles.root}>
      <PostBg />
      {/* Off-screen rasteriser. `react-native-svg` can only snapshot a MOUNTED `Svg`, so the card has to
          live in this tree before it can become a PNG — same arrangement as `ShareCardHost` on
          `/share-config`. It renders nothing until an export is in flight. */}
      <ProgressCardHost />
      <AppBar title={<BarTitle sub={`${entry.label}${entry.chapterName ? ` · ${entry.chapterName}` : ''}`} />} onBack={() => (router.canGoBack() ? router.back() : router.replace('/transformation'))} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── FORMAT ── */}
        <View style={styles.formatRow}>
          <Text style={styles.sectionLabelInline}>Format</Text>
          <View style={styles.formatChips}>
            {PROGRESS_FORMATS.map((f) => {
              const on = f.id === fmt;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFmt(f.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${f.label} format`}
                  style={[styles.fmtChip, on ? styles.chipOn : styles.chipOff]}
                >
                  {/* The glyph is the literal shape of the output — that is why the two differ. */}
                  <View style={[styles.fmtGlyph, { width: f.glyphW, height: f.glyphH, borderColor: on ? flColor.bronze300 : flColor.gray600 }]} />
                  <Text style={[styles.fmtLabel, on ? styles.inkOn : styles.inkOff]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── LIVE PREVIEW ── */}
        <View style={styles.previewWrap}>
          {/*
            Keyed on format+style. Style is obvious — the two are different cards. Format matters because
            the carousel's slides are sized in points: changing the format changes their width while the
            scroll offset stays where it was, and the active slide would be derived from a stale ratio.
            Remounting puts it back on slide one at the new size rather than half-way between two.
          */}
          <ProgressPostCard key={`${fmt}-${style}`} card={card} width={previewW} />
        </View>

        {/* ── STYLE ── */}
        <Text style={styles.sectionLabel}>Style</Text>
        <View style={styles.styleRow}>
          {STYLES.map((s) => {
            const on = s.id === style;
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setStyle(s.id);
                  // Hero → Grid keeps the first four; the selection is never silently emptied.
                  setSel(clampSelection(selection, s.id));
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.label} style`}
                style={[styles.styleCard, on ? styles.chipOn : styles.chipOff]}
              >
                <StyleDiagram id={s.id} on={on} />
                <View style={styles.styleText}>
                  <Text style={[styles.styleLabel, on ? styles.inkOn : null]}>{s.label}</Text>
                  <Text style={styles.styleSub}>{s.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── PHOTOS ── */}
        <View style={styles.photosHead}>
          <Text style={styles.sectionLabelFlex}>Photos</Text>
          <Text style={styles.selHint}>{selectionHint(style, selection.length)}</Text>
        </View>
        <View style={styles.poseRow}>
          {XFORM_POSES.map((p) => {
            const on = selection.includes(p.key);
            const url = entry.photos[p.key];
            return (
              <Pressable
                key={p.key}
                onPress={() => onTapPose(p.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${on ? 'Remove' : 'Include'} ${p.label}`}
                style={styles.poseBtn}
              >
                <View style={[styles.poseTile, on ? styles.poseTileOn : styles.poseTileOff]}>
                  {url ? (
                    <Image source={{ uri: url }} style={[styles.poseImg, on ? null : styles.poseImgOff]} contentFit="cover" />
                  ) : (
                    <View style={styles.poseEmpty}>
                      <CameraIcon />
                    </View>
                  )}
                  {on ? (
                    <View style={styles.poseCheck}>
                      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#1A1206" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M20 6L9 17l-5-5" />
                      </Svg>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.poseCap, on ? styles.poseCapOn : null]} numberOfLines={1}>
                  {p.short.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── FROM ENTRY ── */}
        <Text style={styles.sectionLabel}>From entry</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.entryStrip}>
          {entries.slice(0, 6).map((e) => {
            const on = e.id === entry.id;
            return (
              <Pressable key={e.id} onPress={() => pickEntry(e)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Post from ${e.label}`} style={[styles.entryPill, on ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.entryPillText, on ? styles.inkOn : null]}>{e.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── ON THE CARD ── */}
        <Text style={styles.sectionLabel}>On the card</Text>
        <View style={styles.toggleRow}>
          {TOGGLES.map((t) => {
            const on = incl[t.key];
            return (
              <Pressable
                key={t.key}
                onPress={() => setIncl((c) => ({ ...c, [t.key]: !c[t.key] }))}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t.label}
                style={[styles.togglePill, on ? styles.chipOn : styles.chipOff]}
              >
                <ToggleIcon which={t.key} on={on} />
                <Text style={[styles.togglePillText, on ? styles.inkOn : styles.inkOff]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── CAPTION ── */}
        <Text style={styles.sectionLabel}>Caption</Text>
        <TextInput
          value={effCaption}
          onChangeText={setCaption}
          placeholder="Say something about this one…"
          placeholderTextColor={flColor.gray600}
          multiline
          textAlignVertical="top"
          maxLength={1000}
          accessibilityLabel="Caption"
          style={styles.caption}
        />
        <Text style={styles.captionNote}>{origin === 'squad' ? `Posts with the card to ${squadName}.` : 'Copied alongside the image when you share out.'}</Text>
      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.sendRow}>
          <SendTile label="Instagram" icon={<InstagramIcon />} busy={busy === 'instagram'} onPress={() => void sendTo('instagram')} />
          <SendTile label="Facebook" icon={<FacebookIcon />} busy={busy === 'facebook'} onPress={() => void sendTo('facebook')} />
          <SendTile label="Save" icon={<SaveIcon />} busy={busy === 'save'} onPress={() => void sendTo('save')} />
          <SendTile label="More" icon={<DotsIcon />} busy={busy === 'more'} onPress={() => void sendTo('more')} />
        </View>
        <Button
          variant="primary"
          fullWidth
          disabled={posting}
          icon={<ShareGlyph />}
          onPress={() => (origin === 'squad' && squadId ? postToSquad() : void systemShare())}
          accessibilityLabel={origin === 'squad' ? `Post to ${squadName}` : 'Share'}
        >
          {posting ? 'Posting…' : origin === 'squad' && squadId ? `Post to ${squadName}` : 'Share'}
        </Button>
      </View>
    </View>
  );
}

function PostBg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.36)' }} />;
}

function BarTitle({ sub }: { sub: string }) {
  return (
    <View>
      <Text style={styles.barTitle}>Progress Photos</Text>
      {sub ? <Text style={styles.barSub}>{sub}</Text> : null}
    </View>
  );
}

function SendTile({ label, icon, busy, onPress }: { label: string; icon: React.ReactNode; busy: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.sendTile, pressed ? styles.pressed : null]}>
      {busy ? <ActivityIndicator color={flColor.bronze400} style={styles.sendBusy} /> : icon}
      <Text style={styles.sendLabel}>{label}</Text>
    </Pressable>
  );
}

/** The 26×26 miniature of what the style produces — 2×2 cells for Grid, one full cell for Hero. */
function StyleDiagram({ id, on }: { id: ProgressStyle; on: boolean }) {
  const c = on ? flColor.bronze400 : flColor.charcoal500;
  if (id === 'hero') return <View style={[styles.diagram, styles.diagramCell, { backgroundColor: c }]} />;
  return (
    <View style={styles.diagram}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.diagramQuarter, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

// ── glyphs ────────────────────────────────────────────────────────────────────

function ToggleIcon({ which, on }: { which: keyof ProgressIncl; on: boolean }) {
  const c = on ? flColor.bronze300 : flColor.gray600;
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (which) {
    case 'date':
      return (
        <Svg {...p}>
          <Rect x={4.5} y={6.5} width={15} height={13} rx={1.5} />
          <Path d="M4.5 10.5h15M8.5 4v4M15.5 4v4" />
        </Svg>
      );
    case 'meta':
      return (
        <Svg {...p} strokeWidth={2}>
          <Path d="M5 19V11M10 19V6M15 19v-6M20 19V9" />
        </Svg>
      );
    case 'chapter':
      return (
        <Svg {...p}>
          <Path d="M5 4.5h11l3 3v12H5z" />
          <Path d="M9 11h6M9 14.5h4" />
        </Svg>
      );
    case 'name':
      return (
        <Svg {...p}>
          <Circle cx={12} cy={8} r={3.2} />
          <Path d="M5 20a7 7 0 0 1 14 0" />
        </Svg>
      );
    default: // pose labels
      return (
        <Svg {...p}>
          <Path d="M4 8h16M4 12h10M4 16h7" />
        </Svg>
      );
  }
}

function CameraIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.charcoal500} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Svg>
  );
}
/** Neutral marks, not brand assets — the official ones go in under each platform's guidelines. */
function InstagramIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4} width={16} height={16} rx={4.5} />
      <Circle cx={12} cy={12} r={3.6} />
      <Circle cx={16.6} cy={7.4} r={0.9} fill={flColor.bronze400} stroke="none" />
    </Svg>
  );
}
function FacebookIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4} width={16} height={16} rx={4} />
      <Path d="M14.6 8.2h-1.3c-1 0-1.5.5-1.5 1.5V11h2.7l-.4 2.6h-2.3V20" />
    </Svg>
  );
}
function SaveIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3.5v11M8 11l4 4 4-4M5 20h14" />
    </Svg>
  );
}
function DotsIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill={flColor.bronze400}>
      <Circle cx={6} cy={12} r={1.5} />
      <Circle cx={12} cy={12} r={1.5} />
      <Circle cx={18} cy={12} r={1.5} />
    </Svg>
  );
}
function ShareGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 26 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 36 },
  pressed: { opacity: 0.85 },

  barTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  barSub: { fontSize: 11.5, color: flColor.gray600, marginTop: 1 },

  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  emptyBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  emptyBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  emptyBtnText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  // section labels — one token, used everywhere
  sectionLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginHorizontal: 2, marginBottom: 10 },
  sectionLabelInline: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionLabelFlex: { flex: 1, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },

  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  inkOn: { color: flColor.bronze300 },
  inkOff: { color: flColor.gray600 },

  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  formatChips: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  fmtChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingLeft: 9, paddingRight: 12, borderRadius: flRadius.pill, borderWidth: 1 },
  fmtGlyph: { borderRadius: 3, borderWidth: 1.5 },
  fmtLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  previewWrap: { alignItems: 'center', marginBottom: 20 },

  styleRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  styleCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1 },
  styleText: { flex: 1, minWidth: 0, gap: 1 },
  styleLabel: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  styleSub: { fontSize: 10, color: flColor.gray600 },
  diagram: { width: 26, height: 26, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  diagramQuarter: { width: 12, height: 12, borderRadius: 2 },
  diagramCell: { borderRadius: 2 },

  photosHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginHorizontal: 2, marginBottom: 10 },
  selHint: { fontSize: 10.5, color: flColor.gray600 },
  poseRow: { flexDirection: 'row', gap: 7, marginBottom: 20 },
  poseBtn: { flex: 1, gap: 5 },
  poseTile: { width: '100%', aspectRatio: 3 / 4, borderRadius: 7, overflow: 'hidden', borderWidth: 1.5, backgroundColor: flColor.surfaceRecessed },
  poseTileOn: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  poseTileOff: { borderColor: flColor.charcoal700 },
  poseImg: { width: '100%', height: '100%' },
  /** An unselected thumbnail is still legible, just plainly not in the card. */
  poseImgOff: { opacity: 0.42 },
  poseEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  poseCheck: { position: 'absolute', top: 3, right: 3, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronze400 },
  poseCap: { fontSize: 8, fontWeight: '600', letterSpacing: 0.5, color: flColor.gray600, textAlign: 'center' },
  poseCapOn: { color: flColor.bronze300 },

  entryStrip: { gap: 7, paddingBottom: 2, paddingRight: 4 },
  entryPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: flRadius.pill, borderWidth: 1 },
  entryPillText: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },

  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20 },
  togglePill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingLeft: 10, paddingRight: 13, borderRadius: flRadius.pill, borderWidth: 1 },
  togglePillText: { fontSize: 12, fontWeight: '600' },

  caption: { minHeight: 68, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.md, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14, lineHeight: 21, color: flColor.cream100 },
  captionNote: { marginTop: 8, marginHorizontal: 2, fontSize: 10.5, lineHeight: 16, color: flColor.gray600 },

  footer: { gap: 11, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: 'rgba(6,7,8,0.75)' },
  sendRow: { flexDirection: 'row', gap: 8 },
  sendTile: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  sendBusy: { height: 19 },
  sendLabel: { fontSize: 10.5, fontWeight: '600', color: flColor.gray400 },
});
