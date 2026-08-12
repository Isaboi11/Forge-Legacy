import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import {
  albumStatus,
  dayLabel,
  fetchAlbum,
  fetchPhotoAlbums,
  flatten,
  fullDayLabel,
  groupByMonth,
  highlightLabel,
  photoCountLabel,
  rangeLabel,
  weeksLabel,
  type AlbumDetail,
  type ChapterPhoto,
  type PhotoAlbum,
  type PhotoDay,
} from '@/data/photos-live';
import { useCapGate } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';
import { useReduceMotion } from '@/lib/settings';

/**
 * Photos Gallery (L-15) + Photo viewer (L-16).
 * Built to `Forge Photos Gallery.dc.html`.
 *
 * Three views in one route, exactly as the design composes them: the albums list, one album as a
 * month-grouped timeline, and a full-screen viewer over both. Requires migration 0085.
 *
 * ── THE DESIGN AND THE LOCKED SPEC DISAGREE, AND THE DESIGN WINS (PD-7) ───────
 *
 * `Photos-Wireframe-Spec-L15-L16` §3 specifies a flat 3-column square grid, reverse-chronological,
 * account-wide, with no grouping and no chapter labels. The design is a chapter-albums browser with
 * covers, month timelines, reflections and milestone scaling. These are not variations of one screen.
 *
 * PD-7 governs — the design is the north star and the docs are corrected — so this is built to the
 * design and `Photos-Architecture-Amendment-001` records the correction. Two things from the spec are
 * NOT layout and are therefore kept:
 *
 *   · NO EDIT, DELETE, REASSIGN OR CURATE. Nothing here changes a photo that already exists.
 *   · Creation is still a chapter action — the album's add button targets that album's chapter and routes
 *     to the same `/add-photo` screen the chapter and workout paths use.
 *
 * The one rule that did NOT survive is the ban on adding (§10, §4's no-CTA). It rested on the screen
 * having no target, which was true of a flat account-wide grid and is false of chapter albums: an album
 * IS a chapter. Amendment 001 §5 records the correction. The albums ROOT still has no add button — there
 * you may be browsing a chapter sealed years ago — but its empty state does, because there is always
 * exactly one active chapter for a first photo to land in.
 *
 * ── THE ALLOWANCE COUNTER, RESTORED 2026-08-12 ───────────────────────────────
 *
 * It used to say NOT CARRIED, and the reasoning was right at the time: `Monetization-Amendment-001`
 * required an "X of N photos" line here, but P-8 and M-7 were both unbuilt, so there was no premium tier
 * and **no way to lift the cap. A limit nobody can pay to remove is a threat, not a counter.**
 *
 * Amendment 003 and migration `0145` land the tier, so the condition that justified withholding it is
 * gone. Three things about how it comes back:
 *
 *   · The cap is **75**, not 100 and not 50 (MA3-D8) — 6 poses × 12 monthly Gallery entries = 72, plus 3.
 *   · **Transformation Gallery entries share this counter** (MA3-D8), which is the question the Gallery
 *     architecture left open and Amendment 003 closes.
 *   · It renders **only when a cap actually applies**. A Premium athlete's 1,000 is an abuse guard nobody
 *     reaches (Amendment 001 §4A); showing it would turn the guard back into the threat above.
 *
 * ── DELTAS VS THE `.dc` ───────────────────────────────────────────────────────
 *
 * DROPPED-FREE:
 *  1. The app bar read the literal "ALBUM" while you stood inside a named chapter. It reads the chapter.
 *  2. Album card ranges stripped the year (`.replace(/, \d{4}$/, '')`), making a 2026 chapter and a 2025
 *     chapter indistinguishable in the one list whose job is telling them apart. The year stays.
 *  3. `weeksNum` was a hand-entered literal, and disagreed with its own date range (8 weeks over a span
 *     of nine and a half, with a caption saying twelve). Derived from the dates.
 *  4. The connector line ran at a fixed 35px, which centres a 72px cover but not the 92px milestone
 *     covers — so it sat off-centre behind exactly the rows that draw the eye. Milestone covers now grow
 *     in HEIGHT only (72×122 vs 72×96) and keep the bronze edge and glow, so the spine is centred on
 *     every row and the text column indents uniformly.
 *  5. Viewer arrows were 40px, under the 44pt minimum, in the one place you tap repeatedly.
 *  6. The day's caption never rendered in the timeline — it existed only in the viewer, which most
 *     people never reach. One field now does one job in both places.
 *  7. Cards and rows were `role="button" tabindex="0"` with no key handler: focusable, not activatable.
 *  8. The `ready` gate blocked first paint on a design-system namespace this screen never uses. The
 *     design project's own CLAUDE.md names that gate a preview-runtime shim and says not to carry it.
 *  9. One vocabulary for one concept. The design says "Chapter complete" in one album and "Chapter
 *     sealed" in the other; a chapter is sealed.
 *
 * ADDED — an empty state, which the design has none of (`resolveCover` returns null for "a designed
 * empty state (no photos yet)"; it was never designed).
 *
 * DEFERRED-HONEST — no swipe or pinch in the viewer, matching the design; no filter, sort or star UI
 * (§10 forbids the first two and starring has no surface in any locked doc).
 *
 * Faithful: the five-tier cover waterfall (server-side, so the list and the header can never disagree),
 * the sealed-chapter dim wash, the four-stop cover scrim with its transparent middle plateau, milestone
 * scaling, the bronze-ruled pull-quote, italic Playfair as the voice of reflection, and the footnote.
 */

const H_PAD = 18;

/** Milestone covers grow taller, not wider — see delta 4. */
const COVER_W = 72;
const COVER_H = 96;
const COVER_H_MAJOR = 122;
const COVER_GAP = 14;
/** Centre of the cover column: the timeline's spine. */
const SPINE_X = COVER_W / 2;

export default function PhotosScreen() {
  const router = useRouter();
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: albums, loading, error, refetch } = useQuery(fetchPhotoAlbums, []);
  const { data: album, refetch: refetchAlbum } = useQuery(() => (albumId ? fetchAlbum(albumId) : Promise.resolve(null)), [albumId]);

  /* Coming back from `/add-photo` must show the photo. Without this the gallery keeps the payload it
     loaded on the way in, and a successful add reads as one that silently failed. */
  useFocusEffect(
    useCallback(() => {
      refetch();
      if (albumId) refetchAlbum();
    }, [albumId, refetch, refetchAlbum]),
  );

  const months = useMemo(() => (album ? groupByMonth(album.photos) : []), [album]);
  const flat = useMemo(() => flatten(months), [months]);

  const goBack = () => {
    if (albumId) {
      setAlbumId(null);
      setExpanded({});
      return;
    }
    if (router.canGoBack()) return router.back();
    return router.replace('/(tabs)/legacy');
  };

  const title = albumId ? (album?.name ?? 'Album') : 'Photos';

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />

      <AppBar
        title={
          <Text style={styles.barTitle} numberOfLines={1}>
            {title}
          </Text>
        }
        onBack={goBack}
        actions={
          albumId && album ? (
            <>
              <Pressable
                onPress={() => router.push('/transformation')}
                accessibilityRole="button"
                accessibilityLabel="Compare in the transformation gallery"
                hitSlop={8}
                style={styles.barBtn}
              >
                <CompareGlyph />
              </Pressable>
              {/* An album IS a chapter, so adding here has exactly one unambiguous target — which is why
                  the browse-only ban does not survive the design's change of shape. See Amendment 001 §5. */}
              <Pressable
                onPress={() => router.push({ pathname: '/add-photo', params: { chapter: albumId } })}
                accessibilityRole="button"
                accessibilityLabel={`Add a photo to ${album.name}`}
                hitSlop={8}
                style={styles.barBtn}
              >
                <PlusGlyph />
              </Pressable>
            </>
          ) : undefined
        }
      />

      {loading && !albums ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load your photos.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : albumId && album ? (
        <FadeIn key={albumId}>
          <AlbumView
            album={album}
            months={months}
            expanded={expanded}
            onToggle={(date) => setExpanded((e) => ({ ...e, [date]: !e[date] }))}
            onOpenPhoto={(id) => setViewerAt(Math.max(0, flat.findIndex((p) => p.id === id)))}
          />
        </FadeIn>
      ) : (
        <FadeIn key="albums">
          <AlbumsView albums={albums} onOpen={setAlbumId} onAddFirst={() => router.push('/add-photo')} />
        </FadeIn>
      )}

      {/* Albums root only — both steps ring things an open album doesn't show. */}
      <ScreenTour screenKey="photos" ready={!albumId && (albums?.albums.length ?? 0) > 0} />

      {viewerAt != null && album && flat.length > 0 ? (
        <Viewer
          chapter={album.name}
          photos={flat}
          index={Math.min(viewerAt, flat.length - 1)}
          onIndex={setViewerAt}
          onClose={() => setViewerAt(null)}
          onPlay={(url) => {
            setViewerAt(null);
            router.push({ pathname: '/pin-video', params: { url } });
          }}
        />
      ) : null}
    </View>
  );
}

// ── Albums ───────────────────────────────────────────────────────────────────

function AlbumsView({
  albums,
  onOpen,
  onAddFirst,
}: {
  albums: { total: number; albums: PhotoAlbum[] } | null;
  onOpen: (id: string) => void;
  onAddFirst: () => void;
}) {
  const list = albums?.albums ?? [];
  // Here rather than in `PhotosScreen`: the counter renders in THIS component, and a prop threaded down
  // one level for a value the hook can read directly is a second place for the two to disagree.
  const photoGate = useCapGate('photos');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  if (list.length === 0) {
    /* The old ban on a CTA here rested on the screen being unable to act. It can: there is always exactly
       one active chapter (the database enforces it), so "your first photo" has one unambiguous home.
       Telling someone to go elsewhere, on the screen named Photos, was the worse answer. */
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No photos yet</Text>
        <Text style={styles.emptyBody}>Photos live inside your chapters. The first one starts the album.</Text>
        <Pressable onPress={onAddFirst} accessibilityRole="button" accessibilityLabel="Add your first photo" style={styles.outlineBtn}>
          <Text style={styles.outlineBtnLabel}>Add Your First Photo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      ref={tourScroller}
      onScroll={onTourScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <TourAnchor id="photos-count" style={styles.countHead}>
        <Text style={styles.countValue}>{albums?.total ?? 0}</Text>
        <Text style={styles.countSub}>
          photos · {list.length} {list.length === 1 ? 'chapter' : 'chapters'}
        </Text>
        {/* The allowance line, restored.

            It was withheld deliberately: `Monetization-Amendment-001` required a "X of N photos" counter
            here, but P-8 and M-7 were both unbuilt, so there was no premium tier and no way to lift the
            cap. **A limit nobody can pay to remove is a threat, not a counter**, and that reasoning was
            right for as long as it held. Amendment 003 and migration 0145 land the tier, so it holds no
            longer.

            ⚠ The number is `photoGate.cap`, read from server config — never a literal (MA3-D16/M7-D14).
            It renders only when a cap actually applies: a Premium athlete's ceiling is an abuse guard
            nobody reaches (Amendment 001 §4A), and putting "38 of 1,000" in front of them would turn a
            guard back into the threat this line was withheld to avoid. */}
        {photoGate.cap != null && photoGate.cap >= 0 ? (
          <Text style={styles.countAllowance}>{photoGate.label}</Text>
        ) : null}
      </TourAnchor>

      <TourAnchor id="photos-albums" style={styles.albumStack}>
        {list.map((a) => (
          <AlbumCard key={a.chapterId} album={a} onPress={() => onOpen(a.chapterId)} />
        ))}
      </TourAnchor>

      <Text style={styles.footnote}>Every chapter is its own album. Nothing expires, nothing is counted against you.</Text>
    </ScrollView>
  );
}

function AlbumCard({ album: a, onPress }: { album: PhotoAlbum; onPress: () => void }) {
  const status = albumStatus(a);
  const sealed = status === 'Sealed';
  const highlight = highlightLabel(a.highlightExercise, a.highlightValue);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${a.name}, ${status}, ${photoCountLabel(a.photoCount)}`}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.cover}>
        {a.coverUrl ? <Image source={{ uri: a.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} cachePolicy="memory-disk" /> : null}

        {/* A sealed chapter is literally dimmer — state carried in the material, not a label. */}
        {sealed ? <View style={styles.coverDim} pointerEvents="none" /> : null}

        {/* Four stops with a transparent plateau through the middle third: the top and bottom darken
            for legibility while the centre of the photograph is left alone. */}
        <LinearGradient
          colors={['rgba(8,11,14,0.15)', 'transparent', 'transparent', 'rgba(8,11,14,0.90)']}
          locations={[0, 0.28, 0.38, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={[styles.chip, sealed ? styles.chipSealed : styles.chipActive]}>
          {sealed ? <FlameGlyph size={11} color={flColor.gray400} /> : <BookGlyph size={11} color={flColor.bronze300} />}
          <Text style={[styles.chipText, sealed ? styles.chipTextSealed : styles.chipTextActive]}>{status}</Text>
        </View>

        {a.coverIsVideo ? (
          <View style={styles.coverPlay} pointerEvents="none">
            <PlayGlyph size={11} color={flColor.bronze300} />
          </View>
        ) : null}

        <View style={styles.coverText}>
          <Text style={styles.coverName} numberOfLines={2}>
            {a.name}
          </Text>
          {a.subtitle ? (
            <Text style={styles.coverSub} numberOfLines={2}>
              {a.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaRange}>{rangeLabel(a.startDate, a.endDate)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaStat}>{photoCountLabel(a.photoCount)}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaStat}>{weeksLabel(a.weeks)}</Text>
          {highlight ? (
            <View style={styles.hlPill}>
              <StarGlyph size={10} color={flColor.bronze300} />
              <Text style={styles.hlText} numberOfLines={1}>
                {highlight}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ── One album ────────────────────────────────────────────────────────────────

function AlbumView({
  album,
  months,
  expanded,
  onToggle,
  onOpenPhoto,
}: {
  album: AlbumDetail;
  months: ReturnType<typeof groupByMonth>;
  expanded: Record<string, boolean>;
  onToggle: (date: string) => void;
  onOpenPhoto: (photoId: string) => void;
}) {
  const status = albumStatus(album);
  const sealed = status === 'Sealed';

  const stats = useMemo(() => {
    const days = months.flatMap((m) => m.days);
    return [
      { key: 'photos', value: album.photos.length, label: 'Photos' },
      { key: 'weeks', value: album.weeks, label: 'Weeks' },
      { key: 'milestones', value: days.filter((d) => d.major).length, label: 'Milestones' },
      { key: 'videos', value: album.photos.filter((p) => p.isVideo).length, label: 'Videos' },
    ];
  }, [album, months]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.albumHead}>
        <View style={styles.albumChip}>
          {sealed ? <FlameGlyph size={11} color={flColor.gray400} /> : <BookGlyph size={11} color={flColor.bronze300} />}
          <Text style={[styles.albumChipText, sealed ? styles.chipTextSealed : styles.chipTextActive]}>{status}</Text>
        </View>
        <Text style={styles.albumName}>{album.name}</Text>
        {album.subtitle ? <Text style={styles.albumSub}>{album.subtitle}</Text> : null}
        <Text style={styles.albumRange}>{rangeLabel(album.startDate, album.endDate)}</Text>
      </View>

      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.key} style={styles.statCell}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.monthStack}>
        {months.map((m) => (
          <View key={m.key}>
            <Text style={styles.monthLabel}>{m.label}</Text>
            <View style={styles.dayStack}>
              {/* Fades in and out at both ends so the spine never terminates in a hard line. */}
              <LinearGradient
                colors={['transparent', flColor.bronzeBorderSubtle, flColor.bronzeBorderSubtle, 'transparent']}
                locations={[0, 0.12, 0.88, 1]}
                style={styles.connector}
                pointerEvents="none"
              />
              {m.days.map((d) => (
                <DayRow
                  key={d.date}
                  day={d}
                  expanded={!!expanded[d.date]}
                  onToggle={() => onToggle(d.date)}
                  onOpenPhoto={onOpenPhoto}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function DayRow({
  day: d,
  expanded,
  onToggle,
  onOpenPhoto,
}: {
  day: PhotoDay;
  expanded: boolean;
  onToggle: () => void;
  onOpenPhoto: (photoId: string) => void;
}) {
  const first = d.photos[0];
  const stack = d.photos.length > 1;
  const caption = d.photos.find((p) => p.caption)?.caption ?? null;
  const indent = COVER_W + COVER_GAP;

  return (
    <View style={styles.dayBlock}>
      <Pressable
        onPress={() => (stack ? onToggle() : onOpenPhoto(first.id))}
        accessibilityRole="button"
        accessibilityLabel={`${fullDayLabel(d.date)}${d.event ? `, ${d.event}` : ''}, ${photoCountLabel(d.photos.length)}`}
        style={({ pressed }) => [styles.dayRow, pressed ? styles.pressed : null]}
      >
        <View
          style={[
            styles.dayCover,
            { height: d.major ? COVER_H_MAJOR : COVER_H },
            d.major ? styles.dayCoverMajor : styles.dayCoverPlain,
          ]}
        >
          {first?.url ? <Image source={{ uri: first.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} cachePolicy="memory-disk" /> : null}

          {d.major ? (
            <View style={styles.badgeStar}>
              <StarGlyph size={11} color={flColor.bronze300} />
            </View>
          ) : null}

          {/* Stack and video share the corner and are mutually exclusive by construction. */}
          {stack ? (
            <View style={styles.badgeStack}>
              <LayersGlyph size={9} color={flColor.bronze300} />
              <Text style={styles.badgeStackText}>{d.photos.length}</Text>
            </View>
          ) : first?.isVideo ? (
            <View style={styles.badgePlay}>
              <PlayGlyph size={9} color={flColor.bronze300} />
            </View>
          ) : null}
        </View>

        <View style={styles.dayText}>
          <Text style={[styles.dayDate, d.major ? styles.dayDateMajor : null]}>{dayLabel(d.date)}</Text>
          {d.event ? (
            <View style={styles.eventRow}>
              <EventGlyph event={d.event} />
              <Text style={styles.eventText} numberOfLines={1}>
                {d.event}
              </Text>
            </View>
          ) : null}
          {stack ? (
            <Text style={styles.stackHint}>
              {photoCountLabel(d.photos.length)}
              {expanded ? '' : ' · tap to open'}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {caption ? (
        <View style={[styles.quote, { marginLeft: indent }]}>
          <Text style={styles.quoteEyebrow}>Reflection</Text>
          <Text style={styles.quoteBody}>{caption}</Text>
        </View>
      ) : null}

      {expanded && stack ? (
        <View style={[styles.thumbGrid, { marginLeft: indent }]}>
          {d.photos.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onOpenPhoto(p.id)}
              accessibilityRole="button"
              accessibilityLabel={p.pose ? `${p.pose}, ${fullDayLabel(p.takenOn)}` : fullDayLabel(p.takenOn)}
              style={({ pressed }) => [styles.thumb, pressed ? styles.pressed : null]}
            >
              <Image source={{ uri: p.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} cachePolicy="memory-disk" />
              {p.pose ? (
                <LinearGradient colors={['transparent', 'rgba(8,11,14,0.8)']} style={styles.thumbCap} pointerEvents="none">
                  <Text style={styles.thumbCapText} numberOfLines={1}>
                    {p.pose}
                  </Text>
                </LinearGradient>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Viewer (L-16) ────────────────────────────────────────────────────────────

function Viewer({
  chapter,
  photos,
  index,
  onIndex,
  onClose,
  onPlay,
}: {
  chapter: string;
  photos: ChapterPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onPlay: (url: string) => void;
}) {
  const { width } = useWindowDimensions();
  const p = photos[index];
  const step = (delta: number) => onIndex((index + delta + photos.length) % photos.length);
  const frameW = Math.min(340, width - 32);

  return (
    <View style={styles.viewer}>
      <View style={styles.viewerBar}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.barBtn}>
          <CloseGlyph />
        </Pressable>
        <Text style={styles.viewerChapter} numberOfLines={1}>
          {chapter}
        </Text>
        <Text style={styles.viewerPos}>
          {index + 1} / {photos.length}
        </Text>
      </View>

      <View style={styles.stage}>
        <View style={[styles.frame, { width: frameW }]}>
          <Image source={{ uri: p.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} cachePolicy="memory-disk" />
          {p.isVideo ? (
            <Pressable
              onPress={() => onPlay(p.url)}
              accessibilityRole="button"
              accessibilityLabel="Play video"
              style={({ pressed }) => [styles.playBig, pressed ? styles.pressed : null]}
            >
              <PlayGlyph size={26} color={flColor.bronze300} />
            </Pressable>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <>
            {/* 44pt, not the design's 40 — this is the one control tapped over and over. */}
            <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Previous photo" style={[styles.arrow, styles.arrowLeft]}>
              <ChevronGlyph dir="left" />
            </Pressable>
            <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next photo" style={[styles.arrow, styles.arrowRight]}>
              <ChevronGlyph dir="right" />
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.caption}>
        <Text style={styles.capDate}>{fullDayLabel(p.takenOn)}</Text>
        {p.pose ? (
          <View style={styles.posePill}>
            <Text style={styles.poseText}>{p.pose}</Text>
          </View>
        ) : null}
        {p.caption ? <Text style={styles.capBody}>{p.caption}</Text> : null}
      </View>
    </View>
  );
}

/** The design's `pgFade` on every view change. Remounts by key, so each view fades in once. */
function FadeIn({ children }: { children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  // Lazy `useState`, not `useRef().current` — react-compiler treats reading a ref during render as an
  // error, and this is the pattern the rest of the app already uses for an Animated.Value.
  const [opacity] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(opacity, { toValue: 1, duration: 290, useNativeDriver: true }).start();
  }, [opacity, reduceMotion]);

  return <Animated.View style={[styles.fill, { opacity }]}>{children}</Animated.View>;
}

// ── glyphs ──
function EventGlyph({ event }: { event: string }) {
  if (/sealed/i.test(event)) return <FlameGlyph size={12} color={flColor.bronze300} />;
  if (/opened/i.test(event)) return <BookGlyph size={12} color={flColor.bronze300} />;
  return <StarGlyph size={12} color={flColor.bronze300} />;
}
function StarGlyph({ size = 12, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
    </Svg>
  );
}
function FlameGlyph({ size = 12, color = flColor.gray400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9 9 7 9 7s.6 2 1.6 2.6C11.4 8 12 5.6 12 3z" />
    </Svg>
  );
}
function BookGlyph({ size = 12, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5A2 2 0 0 1 6 4h5v16H6a2 2 0 0 0-2 1.5zM20 5.5A2 2 0 0 0 18 4h-5v16h5a2 2 0 0 1 2 1.5z" />
    </Svg>
  );
}
function PlayGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}
function LayersGlyph({ size = 9, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round">
      <Rect x={3} y={3} width={14} height={14} rx={2} />
      <Path d="M21 7v12a2 2 0 0 1-2 2H7" />
    </Svg>
  );
}
function PlusGlyph({ size = 21, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CompareGlyph({ size = 20, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
      <Rect x={3} y={4} width={7} height={16} rx={1} />
      <Rect x={14} y={4} width={7} height={16} rx={1} />
    </Svg>
  );
}
function CloseGlyph({ size = 22, color = flColor.gray400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function ChevronGlyph({ dir, size = 20, color = flColor.gray400 }: { dir: 'left' | 'right'; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  pressed: { opacity: 0.88 },

  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.6, textTransform: 'uppercase', color: flColor.cream100 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: H_PAD, paddingTop: 22, paddingBottom: 36 },

  // ── albums ──
  countHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 2, paddingBottom: 20 },
  countValue: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', letterSpacing: -0.5, lineHeight: 31, color: flColor.cream100 },
  countSub: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray600 },
  countAllowance: { marginTop: 6, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: flColor.gray600 },

  albumStack: { gap: 26 },
  card: {
    borderRadius: flRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  cardPressed: { transform: [{ scale: 0.985 }], borderColor: flColor.bronzeBorder },

  cover: { width: '100%', aspectRatio: 5 / 4, backgroundColor: '#0b0a09' },
  coverDim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,7,9,0.3)' },
  coverText: { position: 'absolute', left: 16, right: 16, bottom: 15 },
  coverName: {
    fontFamily: flFont.display,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 26.3,
    color: flColor.cream100,
    textShadowColor: 'rgba(0,0,0,0.78)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  coverSub: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15.6,
    color: 'rgba(233,224,208,0.7)',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  coverPlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: 'rgba(8,11,14,0.72)',
  },

  chip: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: flRadius.pill, borderWidth: 1 },
  chipActive: { backgroundColor: 'rgba(196,142,74,0.16)', borderColor: flColor.bronzeBorder },
  chipSealed: { backgroundColor: flColor.surfaceRecessed, borderColor: flColor.charcoal600 },
  chipText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  chipTextActive: { color: flColor.bronze300 },
  chipTextSealed: { color: flColor.gray400 },

  meta: { gap: 9, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  metaRange: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: flColor.bronze300 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaStat: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  metaDot: { width: 3, height: 3, borderRadius: flRadius.round, backgroundColor: flColor.charcoal500 },
  hlPill: { marginLeft: 'auto', flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  hlText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },

  footnote: { marginTop: 28, marginHorizontal: 8, fontSize: 11, lineHeight: 17.6, textAlign: 'center', color: flColor.gray600 },

  // ── one album ──
  albumHead: { paddingHorizontal: 2 },
  albumChip: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  albumChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
  albumName: { marginTop: 8, fontFamily: flFont.display, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 29.4, color: flColor.cream100 },
  /* Italic Playfair is this screen's voice for reflection — the chapter line, the pull-quotes, the
     viewer caption, and nothing else. */
  albumSub: { marginTop: 6, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 20.3, color: flColor.bronze300 },
  albumRange: { marginTop: 7, fontSize: 12, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },

  stats: { flexDirection: 'row', gap: 1, marginTop: 18, marginBottom: 8, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 13, paddingHorizontal: 4, backgroundColor: flColor.surfaceRecessed },
  statValue: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 21, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center', color: flColor.gray600 },

  monthStack: { marginTop: 24, gap: 30 },
  monthLabel: { paddingHorizontal: 2, paddingBottom: 14, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  dayStack: { position: 'relative', gap: 16 },
  connector: { position: 'absolute', left: SPINE_X, top: 10, bottom: 10, width: 1 },

  dayBlock: { position: 'relative', zIndex: 1 },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: COVER_GAP },
  dayCover: { position: 'relative', width: COVER_W, flexShrink: 0, borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, backgroundColor: '#0b0a09' },
  dayCoverPlain: { borderColor: flColor.charcoal600 },
  dayCoverMajor: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },

  badgeStar: { position: 'absolute', top: 5, left: 5, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(8,11,14,0.7)' },
  badgeStack: { position: 'absolute', right: 4, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: flRadius.xs, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(8,11,14,0.78)' },
  badgeStackText: { fontSize: 9, fontWeight: '700', color: flColor.bronze300 },
  badgePlay: { position: 'absolute', right: 4, bottom: 4, width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(8,11,14,0.72)' },

  dayText: { flex: 1, minWidth: 0, gap: 4, paddingTop: 2 },
  dayDate: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  dayDateMajor: { fontSize: 18 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventText: { flexShrink: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  stackHint: { fontSize: 11, color: flColor.gray600 },

  /* Square on the quoted edge — a pull-quote, not a card. */
  quote: { marginTop: 10, paddingHorizontal: 15, paddingVertical: 12, borderLeftWidth: 2, borderLeftColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, borderTopRightRadius: flRadius.md, borderBottomRightRadius: flRadius.md },
  quoteEyebrow: { marginBottom: 5, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  quoteBody: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 13.5, lineHeight: 20.3, color: flColor.gray400 },

  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 2 },
  thumb: { width: '23%', aspectRatio: 3 / 4, borderRadius: flRadius.xs, overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: '#0b0a09' },
  thumbCap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 4, paddingVertical: 3 },
  thumbCapText: { fontSize: 8, fontWeight: '600', textAlign: 'center', color: flColor.gray400 },

  // ── viewer ──
  viewer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, backgroundColor: '#050505', flexDirection: 'column' },
  viewerBar: { flexShrink: 0, height: 56, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: flColor.charcoal800 },
  viewerChapter: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300 },
  viewerPos: { paddingRight: 12, fontSize: 11, color: flColor.gray600, fontVariant: ['tabular-nums'] },

  stage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', padding: 16 },
  frame: { aspectRatio: 3 / 4, maxHeight: '100%', borderRadius: flRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: '#0b0a09', boxShadow: flShadow.elevated },
  playBig: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,5,5,0.28)' },
  arrow: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: 'rgba(8,11,14,0.6)' },
  arrowLeft: { left: 6 },
  arrowRight: { right: 6 },

  caption: { flexShrink: 0, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 },
  capDate: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  posePill: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  poseText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, color: flColor.gray400 },
  capBody: { marginTop: 10, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  // ── states ──
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
