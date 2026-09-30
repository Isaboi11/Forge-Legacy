import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useState, type ReactNode, useMemo } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { EngravedIcon, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { Image } from 'expo-image';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { forgeOr, themeScrim } from '@/constants/theme-scrim';
import { TAB_SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { ensurePinPoster } from '@/data/pin-poster';
import { useProfile } from '@/lib/profile';
import type { Sex } from '@/domain/profile/schema';
import { type RankFamily, type RankLevel } from '@/domain/rank-artwork/resolver';
import { resolveRankBadge } from '@/domain/rank-artwork/badge-art';
import { RankSeal } from '@/components/forge/RankSeal';
import { fetchLegacyData } from '@/data/legacy-live';
import { useBodyGoalSync } from '@/hooks/useBodyGoalSync';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';
import { fetchAccomplishments } from '@/data/accomplishments-live';
import { fetchLegacyArchive } from '@/data/legacy-archive-live';
import { LegacyArchiveBand } from '@/components/forge/LegacyArchiveBand';
import { accDisplayDate, legacyStripOrder } from '@/domain/legacy/accomplishments';
import { pinDestination } from '@/domain/legacy/pins';
import { activityDayLabel, legacyReveal, recentLegacyEvents } from '@/domain/legacy/reveal';
import { fetchLegacyTimeline, type TimelineKind } from '@/data/legacy-timeline-live';
import { splitChapterName } from '@/domain/legacy/chapter-name';
import { fmtDuration } from '@/domain/activity/history-core';
import { MediaThumb } from '@/components/forge/MediaThumb';
import { useQuery } from '@/lib/useQuery';
import type { Chapter, Pin, PinKind } from '@/types/legacy';
import {
  AccomplishmentCard,
  CompactChapterRow,
  FeaturedMomentCard,
  goalValue,
  HonorInsignia,
  MyStandard,
  SealedChapterCard,
} from '@/components/forge/profile-sections';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { PinManagerSheet } from '@/components/forge/PinManagerSheet';
import { StandardEditorSheet } from '@/components/forge/StandardEditorSheet';
import { ForgeSymbol, type SymbolName } from '@/components/forge/ForgeSymbol';

/** The bronze medallion glyph for a non-photo pin, by kind (matches the museum's emblem cards). */
const PIN_GLYPH: Record<PinKind, SymbolName> = {
  chapter: 'book',
  honor: 'medal',
  accomplishment: 'trophy',
  record: 'dumbbell',
  photo: 'eye',
  memory: 'spark',
};

/** The Recent Legacy row's medallion, by timeline kind. */
const EVENT_SYMBOL: Record<TimelineKind, SymbolName> = {
  'chapter-open': 'book',
  'chapter-seal': 'seal',
  rank: 'rankUp',
  honor: 'medal',
  goal: 'target',
  pr: 'dumbbell',
  'program-grad': 'banner',
  accomplishment: 'trophy',
  photo: 'eye',
  reflection: 'spark',
  memory: 'spark',
};

/**
 * Legacy tab root — L-1 Legacy Hub.
 * Source of truth: the design handoff "Forge Legacy.dc.html" (new foundation system).
 *
 * ⚠ PROGRESSIVE REVEAL (`Legacy-Amendment-002`, 2026-09-29): the sections below appear only once they
 * hold something — `legacyReveal` in `domain/legacy/reveal.ts` decides each one. The mature hub
 * described here is what an established athlete sees; a new one sees their chapter and one easy start.
 *
 * Rebuilt on the foundation tokens + committed composites to match Home/Workouts
 * (the pre-existing `components/legacy/*` are old `legacy-theme` and now bannered
 * legacy). Sections, top to bottom: the hero (identity + "My Standard" creed +
 * current chapter & primary goal), Pinned Legacy (curated cross-type museum), Featured Legacy
 * Moment, My Story (chapter history + timeline preview), What Endures.
 * Pinned Legacy renders real pins (video pins open the fullscreen player); the L-13 pin manager
 * (PinManagerSheet) curates them — accomplishments/honors/chapters pinnable, max 6 (migrations 0023/0024).
 * What Endures is the `LegacyArchiveBand` (three graded image tiles → Transformation / Photos /
 * Trophy Case, replacing the old navigation rows) + Accomplishments + Honors, then the
 * closing inscription.
 *
 * Data: every section reads LIVE from Supabase. Rank, standard, chapters, timeline and the featured
 * moment come from `fetchLegacyData`; accomplishments from 0023, honors from `honor_instances`, chapter
 * goals from 0025, photos and the trophy count through the archive band. `LEGACY_FIXTURE_PENDING` — the
 * one place seeded data was allowed to live — is deleted. Nothing on this screen is invented.
 *
 * Hero identity (corrected — see FORGE_DELTAS §15): the LEFT slot is the athlete's PROFILE
 * PORTRAIT (a photo, framed by a faint rank-seal ring). No profile-photo system exists yet, so it
 * shows the initials placeholder inside the seal ring — a real photo drops into the same slot when
 * that system lands. The RIGHT slot is the rank badge → Progress Hub: it renders the REAL per-rank
 * badge ARTWORK when a guard-verified clean cutout exists (`resolveRankBadge` — the placeholder rank is
 * `PLACEHOLDER_RANK` = Established III, sex-unspecified → served the clean established-m badge), and
 * falls back to the vector `RankSeal` for any family whose art is a black-box matte (foundation,
 * craftsman, architect, builder) or missing (legend) — so the retired black box can never return.
 *
 * Still pending-asset (NOT fabricated — graceful placeholders): the Honors insignia (Honors is
 * legitimately shown HERE — an achievement context, unlike the workout card where it is reserved —
 * but the honor art was never imported).
 *
 * Built: the L-12 My Standard editor (tap the creed → StandardEditorSheet, persisted), the L-13 pin
 * manager, the global Toast, and L-11 Honor Detail (on the Honors hub). Deferred (noted at the gate):
 * the scroll-driven artwork fade. L-2 Legacy Timeline is live at `/legacy-timeline`. Taps to unbuilt
 * destinations are inert, consistent with Home/Workouts.
 */

export default function LegacyScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { data, error, refetch } = useQuery(fetchLegacyData, []);
  // Accomplishments are now LIVE (0023) — replacing the fixture. Newest first; the strip shows a few and
  // "View all" opens the full L-12 screen. `featured` drives the filled star.
  const { data: accData, settled: accSettled, refetch: refetchAcc } = useQuery(fetchAccomplishments, []);
  // The archive band loads alongside rather than inside `fetchLegacyData`, in parallel. Since
  // Legacy-Amendment-002 the first paint waits for it (see `reveal` below): which sections exist depends
  // on its counts, so deciding without it would draw one page and then rearrange into another.
  const { data: archive, settled: archiveSettled, refetch: refetchArchive } = useQuery(fetchLegacyArchive, []);
  // Recent Legacy reads the L-2 timeline's own events, so the two can never disagree about what mattered
  // (PR de-duplication and the first-mark-is-a-baseline rule both live in that one read).
  const { data: timelineData, settled: timelineSettled, refetch: refetchTimeline } = useQuery(fetchLegacyTimeline, []);
  const meaningfulEvents = useMemo(
    () => recentLegacyEvents(timelineData?.chapters.flatMap((c) => c.events) ?? [], Number.MAX_SAFE_INTEGER),
    [timelineData],
  );
  const recentEvents = meaningfulEvents.slice(0, 3);
  const liveAccomplishments = useMemo(
    () =>
      /* Featured first, and only the date the athlete gave — never the day the row was typed (QA legacy-19). */
      legacyStripOrder(accData ?? []).map((a) => ({
        id: a.id,
        text: a.name,
        monthYear: accDisplayDate(a),
        featured: a.featured,
        // The fetch has carried these since 0118 and this mapping dropped them, so the card had nothing
        // to draw and rendered as an empty bordered square. The same shape as every other field that
        // was authored, fetched, and flattened away one layer short of the screen.
        mediaUrl: a.mediaUrl,
        mediaKind: a.mediaKind,
      })),
    [accData],
  );
  /*
   * ── WHAT RENDERS — `Legacy-Amendment-002` (progressive reveal) ──
   *
   * Every section decision is `legacyReveal`'s, over counts, with a test beside it. This screen draws the
   * answer and reasons about nothing.
   *
   * ⚠ THE PAGE WAITS FOR ALL THREE READS ON FIRST LOAD, and that is what makes the reveal honest. The
   * archive and accomplishments load beside the hero; deciding before they land would draw the brand-new
   * page for one frame on somebody with fifty photos, then rearrange. `settled` is true on error too, so
   * a failed side read degrades to the simpler page rather than an endless spinner. The per-invitation
   * retirement of LEG-A1-D5 survives inside `addRow`: each tile leaves on its own.
   */
  const reveal = useMemo(
    () =>
      data && archiveSettled && accSettled && timelineSettled
        ? legacyReveal({
            activeChapterName: data.activeChapter?.name ?? null,
            sealedChapterCount: data.sealedChapters.length,
            savedWorkoutCount: data.savedWorkoutCount,
            // The timeline's meaningful events; a failed timeline read falls back to the stored-event count.
            timelineEventCount: timelineData ? meaningfulEvents.length : data.timelineEventCount,
            photoCount: archive?.photos.count ?? 0,
            transformationCount: archive?.transformation.count ?? 0,
            trophiesEntered: archive?.trophies.entered ?? 0,
            accomplishmentCount: liveAccomplishments.length,
            honorCount: data.honors.length,
            pinCount: data.pinned.length,
            hasQuote: !!data.standard?.trim(),
          })
        : null,
    [data, archive, archiveSettled, accSettled, timelineSettled, timelineData, meaningfulEvents.length, liveAccomplishments.length],
  );

  const [pinManager, setPinManager] = useState(false);
  const [stdOpen, setStdOpen] = useState(false);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  /**
   * "One you write, one you earn" is a single idea about two adjacent sections.
   *
   * The step rings whichever has CONTENT, preferring Accomplishments (the authored half, and the one
   * that needs explaining). Deliberately still keyed on `length > 0` now that Accomplishments renders
   * its own empty invitation: spotlighting an empty box and narrating it as a collection would
   * describe the spec rather than the screen. Honors still hides when empty. With neither, the step
   * drops itself.
   */
  const collectionsAnchor = liveAccomplishments.length > 0 ? 'accomplishments' : (data?.honors.length ?? 0) > 0 ? 'honors' : null;
  /**
   * Open a pinned museum item at its real home.
   *
   * ⚠ THE ENTITY WINS OVER ITS MEDIA, and that ordering is the fix. The video branch used to run first,
   * so a pinned accomplishment that happened to carry a clip opened a bare fullscreen player — no title,
   * no date, no note, and no way to reach the thing the pin actually points at. An accomplishment pin
   * now opens the ACCOMPLISHMENT, which shows the clip in place and can still play it.
   *
   * The player stays for pins that are only media — `record` / `photo` / `memory`, which reference no
   * entity — so it keeps the one job it was right for.
   *
   * Each entity destination is passed its `refId`, so tapping a specific keepsake opens THAT keepsake
   * rather than the list it lives in. That was the whole report: "it opens up all accomplishments".
   */
  const openPin = (pin: Pin) => {
    // WHICH destination is `pinDestination`'s call, in the domain with a test around it. This maps its
    // answer to a route and does nothing else.
    const dest = pinDestination(pin);
    if (!dest) return;
    switch (dest.screen) {
      case 'chapter':
        return router.push({ pathname: '/chapter/[id]', params: { id: dest.id } });
      case 'accomplishment':
        return router.push({ pathname: '/accomplishments', params: { id: dest.id } });
      case 'accomplishments':
        return router.push('/accomplishments');
      case 'honors':
        return router.push('/honors');
      case 'video':
        return router.push({ pathname: '/pin-video', params: { url: dest.url } });
    }
  };
  const openChapter = (chapterId: string) => router.push({ pathname: '/chapter/[id]', params: { id: chapterId } });
  // Scroll-driven hero choreography (the .dc "premium scroll choreography"): the background scrim
  // fades in (ScreenBackground `scrimFade`), the hero parallaxes up + fades, and the portrait scales
  // down from its left edge. All native-driver transform/opacity.
  const [scrollY] = useState(() => new Animated.Value(0));
  const heroTranslateY = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, -12], extrapolate: 'extend' }); // -y*0.12
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0.1], extrapolate: 'clamp' }); // 1 - p*0.9
  const portraitScale = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0.76], extrapolate: 'clamp' }); // 1 - p*0.24

  // Refetch when the tab regains focus (e.g. returning from a just-logged workout) — the current data
  // stays on screen during the reload, so a background refresh never flashes the spinner.
  // Rank evaluation is the "app foreground" trigger (RCM §19): each time Legacy gains focus, recompute the
  // earned rank from live activity and persist any promotion (never decreases). A newly-crossed FAMILY
  // boundary fires the M-1 rank-up ceremony; then refetch so the badge + label reflect the new rank.
  /*
   * The rank refresh and the honor sweep used to be inline here, which made the ceremony owed to a SCREEN
   * rather than to the athlete: earn something on a day you never open Legacy and the moment waited.
   * `useEarnedMoments` now runs on all four tabs — the record still lives here, only the announcement
   * travels. Legacy keeps its own read below so the badge reflects a promotion the moment one lands.
   */
  useEarnedMoments({ onRankChanged: refetch });
  const syncBodyGoals = useBodyGoalSync();

  useFocusEffect(
    useCallback(() => {
      // The displayed record, refreshed on every focus regardless of whether the (throttled) evaluation
      // above ran — returning from a just-logged workout has to show it.
      refetch();
      // The chapter card's bodyweight goal reads a STORED number that only the Goals screen used to
      // refresh. Sync it here too, and redraw if it moved — a weigh-in logged on the Progress Hub
      // should be visible on the way back to Legacy (PO, 2026-08-28).
      void syncBodyGoals().then((changed) => changed && refetch());
      // The archive band too. It was fetched once at mount and never again, so adding a photo — or an
      // entry, or finishing a competition — and walking back to Legacy showed the band exactly as it was
      // when the tab first loaded: an empty Photos tile next to a gallery that now had photos in it.
      refetchArchive();
      refetchTimeline();
    }, [refetch, refetchArchive, refetchTimeline, syncBodyGoals]),
  );

  // (The honor-celebrated acknowledgement moved to CeremonyProvider — it has to sit with the single
  // owner of `current` now that four tabs can present one. See the note there.)

  // First load only: wait for the live Legacy read + the shared profile, with a retryable error. Once
  // data is in hand it stays rendered through any background refetch.
  if (!data || !profile || !reveal) {
    return (
      <LegacyShell scrollY={scrollY} avatarName={profile?.name ?? ''} avatarSrc={profile?.avatarUrl ?? undefined}>
        {error ? <LegacyError onRetry={refetch} /> : <ActivityIndicator color={flColor.bronze400} />}
      </LegacyShell>
    );
  }

  const chapter = data.activeChapter;
  const [recentSeal, ...olderSeals] = data.sealedChapters;
  const hasEndures = reveal.transformationTile || reveal.photosTile || reveal.trophyTile || reveal.accomplishments || reveal.honors;

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacyMountains} imageOpacity={0.375} imageOpacityPaper={0.7} overlay={{ flat: 'rgba(5,5,5,0.30)' }} scrimFade scrollY={scrollY} />

      <AppBar
        title="Legacy"
        avatar={<Avatar name={profile.name} src={profile.avatarUrl ?? undefined} size="appBar" />}
        onAvatar={() => router.push('/account-settings')}
      />

      <Animated.ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
        ref={tourScroller}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: onTourScroll,
        })}
      >
        {/* ── HERO · identity ── parallaxes up + fades; portrait scales from its left edge (.dc) */}
        <Animated.View style={[styles.identityRow, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }]}>
          <Animated.View style={{ transformOrigin: 'left center', transform: [{ scale: portraitScale }] }}>
            <SealPortrait name={profile.name} src={profile.avatarUrl} />
          </Animated.View>
          <View style={styles.identityText}>
            <Text style={styles.athleteName} numberOfLines={1}>
              {profile.name}
            </Text>
            <RankLabel label={data.rankName} sub={data.rankSubTier} />
          </View>
          {/* `flexShrink: 0` — this wrapper is the actual flex child of the row, and without it the
              badge is what gives way when the name column (flex: 1) and the 90pt portrait have taken
              their share on a narrow phone. See the note inside `ProgressBadge`. */}
          <TourAnchor id="legacy-rank" style={styles.badgeAnchor}>
            <ProgressBadge
              rankFamily={data.rankFamily}
              rankLevel={data.rankLevel}
              sex={profile.sex}
              onPress={() => router.push('/progress-hub')}
            />
          </TourAnchor>
        </Animated.View>

        {/*
          ── PROGRESSIVE REVEAL — `Legacy-Amendment-002` ──

          The page grows with the record. A brand-new athlete sees their chapter and one easy way to add
          to it; a section arrives the day there is something in it. Nothing below draws an empty shelf,
          a locked card or a "coming soon" — a section with nothing to show is simply not rendered.
          `reveal` (domain/legacy/reveal.ts) makes every one of those calls.

          ⚠ NO COUNTER, NO "1 OF 3", NO METER. `ONB-D22` still binds: the start module is three
          invitations of unequal weight, not a checklist.
        */}

        {/* ── THE CHAPTER — the focus of the page ── */}
        {reveal.chapter === 'hero' && chapter ? (
          <View style={styles.sectionPadTight}>
            <Text style={styles.eyebrow}>Your Current Chapter</Text>
            <ChapterHero
              chapter={chapter}
              dayCount={data.dayCount}
              onOpen={() => router.push({ pathname: '/chapter/[id]', params: { id: chapter.id } })}
              onGoal={() => router.push('/goals')}
            />
          </View>
        ) : reveal.chapter === 'start-first' ? (
          <View style={styles.sectionPadTight}>
            {reveal.intro ? (
              <>
                <Text style={styles.eyebrow}>Your Legacy</Text>
                <Text style={styles.introTitle}>Your Legacy{'\n'}starts here.</Text>
                <Text style={styles.introBody}>
                  Forge keeps the record as you train, achieve, and grow through every chapter of your journey.
                </Text>
              </>
            ) : null}
            {/* A skipped Chapter I already exists and holds the workouts, so starting it NAMES it — a
                second chapter would be refused by `chapters_one_active_per_athlete` anyway. */}
            <PrimaryInvite
              symbol="book"
              title="Start Your First Chapter"
              body="Define what you’re working toward."
              onPress={() =>
                reveal.chapterStartsByRename && chapter
                  ? router.push({ pathname: '/chapter/[id]', params: { id: chapter.id, rename: '1' } })
                  : router.push('/chapter/new')
              }
            />
          </View>
        ) : (
          /*
           * ⚠ NO ACTIVE CHAPTER USED TO RENDER NOTHING AT ALL, AND THAT IS HOW A DEAD END HIDES.
           *
           * Sealing a chapter left this section simply absent, so the Legacy hub quietly lost its spine
           * and offered no way to get it back. L-5 §2 names this exact card ("L-1 Legacy Hub · Start a
           * Chapter · Invitation card, no active chapter"). An absent value renders nothing, so nothing
           * looks broken — the standing lesson of this codebase.
           */
          <View style={styles.sectionPad}>
            <View style={styles.inviteCard}>
              <Text style={styles.inviteEyebrow}>No open chapter</Text>
              <Text style={styles.inviteTitle}>Begin your next chapter</Text>
              <Text style={styles.inviteBody}>
                Everything you log belongs to a chapter. Name the season you’re starting and your workouts, goals and honors gather under it.
              </Text>
              <Pressable onPress={() => router.push('/chapter/new')} accessibilityRole="button" accessibilityLabel="Start a chapter" style={styles.inviteBtn}>
                <Text style={styles.inviteBtnText}>Start a Chapter</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── START BUILDING — a brand-new athlete with a chapter. One recommended action, two optional. ── */}
        {reveal.startBuilding ? (
          <View style={styles.sectionPad}>
            <View style={styles.startModule}>
              <Text style={styles.eyebrow}>Start Building Your Legacy</Text>
              <Text style={styles.moduleSub}>Add the first piece to bring your journey to life.</Text>
              <PrimaryInvite icon="camera" title="Add a Progress Photo" body="Capture where you’re starting." onPress={() => router.push('/transformation-add')} />
              <View style={styles.smallRow}>
                <SmallInvite icon="trophy" title="Add an Accomplishment" body="Something you’re already proud of." onPress={() => router.push('/accomplishments')} />
                <SmallInvite icon="quote" title="Add a Quote" body="Words to carry with you." onPress={() => setStdOpen(true)} />
              </View>
            </View>
          </View>
        ) : null}

        {/* ── PINNED LEGACY · My Museum — once curating is a real choice ── */}
        {reveal.pinned ? (
          <TourAnchor id="legacy-pinned" style={styles.section}>
            <View style={styles.sectionHeaderPad}>
              <SectionHeader label="Pinned Legacy" action="Edit" onAction={() => setPinManager(true)} />
            </View>
            <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
              {data.pinned.map((pin) => (
                <PinnedCard key={pin.id} pin={pin} onPress={() => openPin(pin)} />
              ))}
              <Pressable
                onPress={() => setPinManager(true)}
                accessibilityRole="button"
                accessibilityLabel="Pin an item to your Legacy"
                style={styles.pinTile}
              >
                <View style={styles.pinPlus}>
                  <PlusIcon color={flColor.bronze400} />
                </View>
                <Text style={styles.pinText}>Pin an item</Text>
              </Pressable>
            </ScrollView>
          </TourAnchor>
        ) : null}

        {/* ── FEATURED LEGACY MOMENT ── */}
        {data.featuredMoment ? (
          <TourAnchor id="legacy-featured" style={styles.sectionPad}>
            <Text style={styles.overline}>Featured Legacy Moment</Text>
            <FeaturedMomentCard
              moment={data.featuredMoment}
              onPress={data.featuredMoment.chapterId ? () => openChapter(data.featuredMoment!.chapterId!) : undefined}
            />
          </TourAnchor>
        ) : null}

        {/* My Standard — the creed, once written; tap opens the L-12 editor sheet. Before it exists it is
            invited from the start module or the Add row, never drawn empty. */}
        {reveal.quote ? (
          <TourAnchor id="legacy-standard">
            <MyStandard standard={data.standard} onEdit={() => setStdOpen(true)} />
          </TourAnchor>
        ) : null}

        {/* ── WHAT ENDURES — what you did that mattered, then the archives. Order follows the PO's
             hierarchy (09-29): chapter → pinned memories → accomplishments/honors → transformation → history. */}
        {hasEndures ? (
          <View style={styles.enduresStack}>
            {/* Accomplishments — once one exists. Before that the door to L-12 is the Accomplishment
                invitation (start module or Add row), so the section is never the only way in. */}
            {reveal.accomplishments ? (
              <TourAnchor id={collectionsAnchor === 'accomplishments' ? 'legacy-collections' : undefined}>
                <View style={styles.sectionHeaderPad}>
                  <SectionHeader label="Accomplishments" action="View all" onAction={() => router.push('/accomplishments')} />
                </View>
                <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
                  {/* A card opens ITS OWN accomplishment; "View all" above is the door to the list. */}
                  {liveAccomplishments.map((a) => (
                    <AccomplishmentCard
                      key={a.id}
                      item={a}
                      onPress={() => router.push({ pathname: '/accomplishments', params: { id: a.id } })}
                    />
                  ))}
                </ScrollView>
              </TourAnchor>
            ) : null}

            {/* Honors — earned only, never invited (LEG-A1-D4). */}
            {reveal.honors ? (
              <TourAnchor id={collectionsAnchor === 'honors' ? 'legacy-collections' : undefined}>
                <View style={styles.sectionHeaderPad}>
                  <SectionHeader label="Honors" action="View all" onAction={() => router.push('/honors')} />
                </View>
                {/* The six most recent only — the Hub is where the full set lives. */}
                <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.honorStripPad}>
                  {data.honors.slice(0, 6).map((h) => (
                    <HonorInsignia key={h.id} honor={h} onPress={() => router.push('/honors')} />
                  ))}
                </ScrollView>
              </TourAnchor>
            ) : null}
            {reveal.transformationTile || reveal.photosTile || reveal.trophyTile ? (
              <View>
                <View style={styles.sectionHeaderPad}>
                  <SectionHeader label="What Endures" />
                </View>
                <TourAnchor id="legacy-endures">
                  <LegacyArchiveBand
                    archive={archive}
                    show={{ transformation: reveal.transformationTile, photos: reveal.photosTile, trophies: reveal.trophyTile }}
                    onTransformation={() => router.push('/transformation')}
                    onPhotos={() => router.push('/photos')}
                    onTrophies={() => router.push('/trophy-case')}
                  />
                </TourAnchor>
              </View>
            ) : null}

          </View>
        ) : null}

        {/*
          ── RECENT LEGACY — what mattered, not what was done ──

          Workouts record what you did; Legacy records what mattered (PO, 2026-09-29). The rows are the
          timeline's own meaningful events: honors, real PRs (records-core's definition, never a first
          baseline), goals, rank-ups, photos, accomplishments, seals. The latest workout stands in ONLY
          until the first of those exists, so the first session still proves Forge remembered it.
        */}
        {reveal.recentLegacy ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderPad}>
              {reveal.recentLegacy === 'events' ? (
                <SectionHeader
                  label="Recent Legacy"
                  action={reveal.timeline ? 'Timeline' : undefined}
                  onAction={reveal.timeline ? () => router.push('/legacy-timeline') : undefined}
                />
              ) : (
                <SectionHeader label="Recent Legacy" action="View all" onAction={() => router.push('/activity-history')} />
              )}
            </View>
            <View style={styles.activityList}>
              {reveal.recentLegacy === 'events'
                ? recentEvents.map((e) => {
                    const r = e.route;
                    return (
                      <LegacyRow
                        key={e.id}
                        symbol={EVENT_SYMBOL[e.kind]}
                        title={e.title}
                        meta={[activityDayLabel(e.at), e.sub].filter(Boolean).join(' · ')}
                        onPress={r ? () => router.push({ pathname: r.pathname, params: r.params } as Parameters<typeof router.push>[0]) : undefined}
                      />
                    );
                  })
                : data.recentWorkouts.slice(0, 1).map((w) => (
                    <LegacyRow
                      key={w.id}
                      symbol="dumbbell"
                      title={`Completed ${w.title}`}
                      meta={[activityDayLabel(w.savedAt), w.durationSec ? fmtDuration(w.durationSec) : null].filter(Boolean).join(' · ')}
                      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: w.id } })}
                    />
                  ))}
            </View>
          </View>
        ) : null}

        {/* ── MY STORY · sealed chapters ── */}
        {recentSeal ? (
          <TourAnchor id="legacy-story" style={[styles.sectionPad, styles.storyStack]}>
            <SealedChapterCard chapter={recentSeal} onPress={() => openChapter(recentSeal.id)} />
            {olderSeals.map((c) => (
              <CompactChapterRow key={c.id} chapter={c} onPress={() => openChapter(c.id)} />
            ))}
          </TourAnchor>
        ) : null}

        {/* ── ADD TO YOUR LEGACY — compact; each tile retires on its own (LEG-A1-D5) ── */}
        {reveal.addRow ? (
          <View style={styles.sectionPad}>
            {reveal.intro ? (
              <View style={styles.orRule}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>
            ) : null}
            <View style={styles.addPanel}>
              <Text style={styles.eyebrow}>Add to Your Legacy</Text>
              {reveal.chapter !== 'hero' ? (
                <Text style={styles.moduleSub}>You don’t need a chapter to start. Add a piece anytime.</Text>
              ) : null}
              <View style={styles.addRow}>
                {reveal.addRow.photo ? <CompactInvite icon="camera" label="Progress Photo" onPress={() => router.push('/transformation-add')} /> : null}
                {reveal.addRow.accomplishment ? <CompactInvite icon="trophy" label="Accomplishment" onPress={() => router.push('/accomplishments')} /> : null}
                {reveal.addRow.quote ? <CompactInvite icon="quote" label="Quote" onPress={() => setStdOpen(true)} /> : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Closing inscription — only once there is a record to close. An early page is simply finished;
            whitespace is the ending, not a line of decoration under three cards. */}
        {reveal.inscription ? (
          <View style={styles.closing}>
            <View style={styles.closingRule}>
              <View style={styles.closingLine} />
              <View style={styles.closingDiamond} />
              <View style={styles.closingLine} />
            </View>
            <Text style={styles.closingText}>Memories can be added. History cannot be rewritten.</Text>
          </View>
        ) : null}
      </Animated.ScrollView>

      <ScreenTour screenKey="legacy" restingBottom={108} />

      <PinManagerSheet
        open={pinManager}
        onClose={(changed) => {
          setPinManager(false);
          if (changed) {
            refetch(); // the museum strip (data.pinned) reflects the new curation
            refetchAcc(); // a just-added accomplishment could have been pinned — keep the strip's stars in step
          }
        }}
      />

      <StandardEditorSheet key={stdOpen ? 'std-open' : 'std-closed'} open={stdOpen} initial={data.standard} onClose={() => setStdOpen(false)} onSaved={() => refetch()} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational pieces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Legacy chrome (background + AppBar) with a centered status slot — reused for the loading and
 * error states so a slow/failed fetch still shows the framed screen, not a blank flash.
 */
function LegacyShell({
  scrollY,
  avatarName,
  avatarSrc,
  children,
}: {
  scrollY: Animated.Value;
  avatarName: string;
  avatarSrc?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacyMountains} imageOpacity={0.375} imageOpacityPaper={0.7} overlay={{ flat: 'rgba(5,5,5,0.30)' }} scrimFade scrollY={scrollY} />
      <AppBar title="Legacy" avatar={<Avatar name={avatarName} src={avatarSrc} size="appBar" />} onAvatar={() => router.push('/account-settings')} />
      <View style={styles.statusWrap}>{children}</View>
    </View>
  );
}

function LegacyError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <Text style={styles.statusText}>Couldn&apos;t load your Legacy.</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retryBtn}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </>
  );
}

/**
 * Pinned Legacy card — the museum tile (Forge Legacy.dc.html §pinned): a 150×196 media card with a
 * top+bottom scrim, the `kind` chip, and the `title`. Video pins carry the design's play affordance;
 * tapping one opens the fullscreen player. Faithful to the .dc — not restyled.
 */
function PinnedCard({ pin, onPress }: { pin: Pin; onPress: () => void }) {
  /*
   * ⚠ A VIDEO PIN EARNS ITS STILL FRAME THE FIRST TIME IT IS SEEN ON A PHONE. `pins.poster_url` has
   * been reserved since `0005` and never written, so a video pin falls back to its raw `.mp4` — which
   * the native app can draw and a BROWSER ON iOS cannot, because iOS refuses to fetch video data
   * without a user gesture. Extracting the frame once, here, and saving it means every surface after
   * this renders a plain image. See `ensurePinPoster`; it is a no-op on web and silent on failure.
   */
  const [poster, setPoster] = useState<string | undefined>(pin.posterUrl);
  useEffect(() => {
    let live = true;
    void ensurePinPoster({ id: pin.id, mediaUrl: pin.mediaUrl, posterUrl: poster, isVideo: pin.isVideo }).then((url) => {
      if (live && url) setPoster(url);
    });
    return () => {
      live = false;
    };
  }, [pin.id, pin.mediaUrl, pin.isVideo, poster]);

  const media = poster ?? pin.mediaUrl;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${pin.title}`} style={styles.pinCard}>
      {media ? (
        <>
          {/* A pin with no `posterUrl` falls through to its raw media, and for a video that is an `.mp4`
              that `<Image>` renders as an empty box. `MediaThumb` branches on the kind instead — the
              same defect the accomplishment card shipped with, waiting here for the first video pin. */}
          <MediaThumb url={media} kind={poster ? 'image' : pin.isVideo ? 'video' : 'image'} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(8,11,14,0.5)', 'rgba(8,11,14,0)', 'rgba(8,11,14,0)', 'rgba(8,11,14,0.92)']}
            locations={[0, 0.34, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {pin.isVideo ? (
            <View style={styles.pinPlay}>
              <EngravedIcon name="play" size={14} />
            </View>
          ) : null}
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.pinEmblem]}>
          <View style={styles.pinMedallion}>
            <ForgeSymbol name={PIN_GLYPH[pin.kind]} size={26} color={flColor.bronze300} strokeWidth={1.6} />
          </View>
        </View>
      )}
      {/* The kind chip has the title's two grounds too: a dark chip over media, the recessed tone on the card. */}
      <View style={[styles.pinKind, media ? null : styles.pinKindOnCard]}>
        <Text style={[styles.pinKindText, media ? null : styles.pinKindTextOnCard]}>{pin.kind}</Text>
      </View>
      {/*
        ⚠ THE TITLE HAS TWO GROUNDS AND THEREFORE TWO COLOURS. Over MEDIA it sits on a 0.92 black scrim,
        which stays dark in Paper because a photo is not a theme surface — so it must be light. With NO
        media it sits on the themed card, which is near-black in Forge and CREAM in Paper — so it must
        be the theme's own ink. In Forge both grounds are dark and one value covered both, which is why
        a single `cream100` was correct for as long as there was only one theme.
      */}
      <Text style={[styles.pinTitle, { color: media ? flColor.onMedia : flColor.cream100 }]} numberOfLines={2}>
        {pin.title}
      </Text>
    </Pressable>
  );
}

/**
 * Hero PROFILE PORTRAIT — the athlete's photo, framed by a faint rank-seal ring. No profile-photo
 * system exists yet, so it shows the initials placeholder (the sanctioned identity mark, per
 * FORGE_DELTAS §10) inside the seal ring; a real photo drops into this same slot when that system
 * lands. The rank BADGE lives in the right FoundationBadge slot (ProgressBadge) — never here.
 */
function SealPortrait({ name, src }: { name: string; src?: string | null }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.portraitWrap}>
      {/* decorative rank-seal ring framing the portrait (faint geometric, not a fabricated badge) */}
      <Svg width={60} height={60} viewBox="0 0 90 90" style={StyleSheet.absoluteFill}>
        <Circle cx={45} cy={45} r={43} stroke={flColor.bronze400} strokeWidth={1} opacity={0.16} fill="none" />
        <Circle cx={45} cy={45} r={37} stroke={flColor.bronze400} strokeWidth={1} opacity={0.1} fill="none" />
        <Rect x={31} y={31} width={28} height={28} stroke={flColor.bronze400} strokeWidth={1} opacity={0.12} fill="none" transform="rotate(45 45 45)" />
      </Svg>
      <View style={styles.portrait}>
        {src ? (
          <Image source={{ uri: src }} style={styles.portraitImage} contentFit="cover" accessibilityLabel={name} />
        ) : (
          <Text style={styles.portraitInitials}>{initials}</Text>
        )}
      </View>
    </View>
  );
}

/** RankMarker — the rank name as a bronze marker label. */
function RankLabel({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={styles.rankMarker}>
      <View style={styles.rankDiamond} />
      <Text style={styles.rankText}>
        {label}
        {sub ? ` · ${sub}` : ''}
      </Text>
    </View>
  );
}

/**
 * The rank badge — the FoundationBadge slot — with the "Progress" pill → Progress Hub.
 *
 * Renders the REAL per-rank badge ARTWORK when a guard-verified clean cutout exists for the tier
 * (`resolveRankBadge` — currently the Established + Legacy families), else falls back to the vector
 * `RankSeal`. Foundation/craftsman/architect/builder art is an alpha-flattened black box and legend art
 * is missing, so those families are absent from the registry and take the vector fallback — which makes
 * the retired black box structurally impossible to reach. No rank ⇒ faint pending-asset shield.
 */
function ProgressBadge({ rankFamily, rankLevel, sex, onPress }: { rankFamily?: RankFamily; rankLevel?: RankLevel; sex?: Sex; onPress: () => void }) {
  const level = rankLevel ?? 1;
  const badge = rankFamily ? resolveRankBadge({ family: rankFamily, level, sex }) : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="View your rank and progress" style={styles.progressBadge}>
      <View style={styles.badgeShield}>
        {badge != null ? (
          <Image source={badge} style={styles.badgeArt} contentFit="contain" />
        ) : rankFamily ? (
          <RankSeal family={rankFamily} level={level} size={42} />
        ) : (
          <Svg width={38} height={52} viewBox="0 0 38 52">
            <Path d="M4 6 L34 6 L34 30 Q34 44 19 50 Q4 44 4 30 Z" stroke={flColor.bronze400} strokeWidth={1.2} opacity={0.4} fill="none" />
            <Path d="M11 3 L13 9 L19 3 L25 9 L27 3" stroke={flColor.bronze400} strokeWidth={1} opacity={0.3} fill="none" strokeLinejoin="miter" />
          </Svg>
        )}
      </View>
      <View style={styles.progressPill}>
        {/*
          THIRD ATTEMPT AT THE SAME WORD, so here is the whole story.
          1. It was a hard `width: 76`, and "PROGRESS" at 8.5pt with 1.1 letter-spacing needs ~51pt of
             the 46 that left. The final S wrapped onto its own line.
          2. `minWidth` + `numberOfLines={1}` stopped the wrap — but the pill's intrinsic width is
             ~81pt, already past the 76 minimum, so the minimum was protecting nothing. At a large
             accessibility text size the label just ellipsised to "PROGRES…" instead, which is what the
             PO then saw on a narrow phone.
          What was missed both times: the flex child of `identityRow` is the `TourAnchor` wrapper, not
          this pill, and the name column beside it is `flex: 1` — so the squeeze arrives from outside
          anything either fix could reach. `flexShrink: 0` on the anchor is the half that stops the
          squeeze; `adjustsFontSizeToFit` is the half that handles a text size no fixed width survives.
          Same pair `LegacyArchiveBand` uses for "TRANSFORMATION", which has held.
        */}
        <Text style={styles.progressPillText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          Progress
        </Text>
        <ChevronRightIcon size={9} color={forgeOr(flColor.bronze300, flColor.gray600)} />
      </View>
    </Pressable>
  );
}

// ── inline glyphs ──
function PlusIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <EngravedIcon name="plus" size={18} color={color} />
  );
}
/**
 * The current chapter as the page's hero — `Legacy-Amendment-002`.
 *
 * Real data only: the ordinal and title split from the stored name, the day and workout tally, and the
 * primary goal when one exists. ⚠ THE BAR IS DRAWN ONLY FOR A QUANTIFIABLE GOAL — that is the one case
 * with real progress behind it. A chapter with no goal gets no bar and no percentage.
 *
 * The mountain plate sits on the card's right and fades into the card surface through `themeScrim`, so
 * Alabaster gets its own paper plate and cream fade rather than a dark rectangle.
 */
function ChapterHero({ chapter, dayCount, onOpen, onGoal }: { chapter: Chapter; dayCount: number; onOpen: () => void; onGoal: () => void }) {
  const { prefix, title } = splitChapterName(chapter.name);
  const goal = chapter.goal;
  const value = goalValue(goal);
  const meta = [
    `Day ${dayCount}`,
    `${chapter.workoutCount} ${chapter.workoutCount === 1 ? 'workout' : 'workouts'}`,
    chapter.honorCount > 0 ? `${chapter.honorCount} ${chapter.honorCount === 1 ? 'honor' : 'honors'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${chapter.name}. ${meta}. View chapter.`}
      style={({ pressed }) => [styles.heroCard, pressed ? styles.cardPressed : null]}
    >
      <Image source={SCREEN_BG.legacyMountains} style={styles.heroArt} contentFit="cover" contentPosition="right" accessible={false} />
      <LinearGradient
        pointerEvents="none"
        colors={[themeScrim('rgba(12,11,9,0.96)'), themeScrim('rgba(12,11,9,0.72)'), themeScrim('rgba(12,11,9,0.18)')]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroTop}>
        <Text style={styles.heroOrdinal}>{prefix}</Text>
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>View Chapter</Text>
          <ChevronRightIcon size={10} color={forgeOr(flColor.bronze300, flColor.bronzeInk)} />
        </View>
      </View>
      <Text style={styles.heroTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.heroMeta}>{meta}</Text>
      {goal.kind !== 'none' ? (
        /* Its own press target: the card opens the chapter, the goal opens Goals (QA legacy-11 — there was
           no way to Goals from this tab). An achieved goal says so instead of drawing the bar it was
           called done at (legacy-14). */
        <Pressable
          onPress={onGoal}
          accessibilityRole="button"
          accessibilityLabel={`${goal.name}${goal.achieved ? ', achieved' : value ? `, ${value}` : ''}. View goals.`}
          hitSlop={6}
          style={({ pressed }) => [styles.heroGoal, pressed ? styles.cardPressed : null]}
        >
          <Text style={styles.heroGoalText}>
            {goal.name}
            {goal.achieved ? <Text style={styles.heroGoalValue}>{'  Achieved'}</Text> : value ? <Text style={styles.heroGoalValue}>{`  ${value}`}</Text> : null}
          </Text>
          {goal.kind === 'quantifiable' && !goal.achieved ? (
            <ProgressBar value={goal.progress} max={100} height={6} label={`${goal.progress}% to goal`} />
          ) : null}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/**
 * The strongest invitation on the screen — the recommended next step. A card because it is a control
 * (the house rule: cards are for acting inside of), bronze because it is the one thing being recommended.
 */
function PrimaryInvite({
  icon,
  symbol,
  title,
  body,
  onPress,
}: {
  icon?: EngravedName;
  symbol?: SymbolName;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      style={({ pressed }) => [styles.primaryInvite, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.primaryIcon}>
        {symbol ? (
          <ForgeSymbol name={symbol} size={24} color={flColor.bronze300} strokeWidth={1.6} />
        ) : icon ? (
          <EngravedIcon name={icon} size={24} color={flColor.bronze300} />
        ) : null}
      </View>
      <View style={styles.inviteText}>
        <Text style={styles.primaryTitle}>{title}</Text>
        <Text style={styles.inviteSub}>{body}</Text>
      </View>
      <ChevronRightIcon size={16} color={forgeOr(flColor.bronze400, flColor.bronzeInk)} />
    </Pressable>
  );
}

/** One of the two optional pieces beside the recommended one — quieter by design, never a checklist row. */
function SmallInvite({ icon, title, body, onPress }: { icon: EngravedName; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      style={({ pressed }) => [styles.smallInvite, pressed ? styles.cardPressed : null]}
    >
      <EngravedIcon name={icon} size={20} color={flColor.bronze400} />
      <Text style={styles.smallTitle}>{title}</Text>
      <Text style={styles.inviteSub}>{body}</Text>
    </Pressable>
  );
}

/** A compact "Add to your Legacy" tile — icon over a one-word label. Each retires on its own. */
function CompactInvite({ icon, label, onPress }: { icon: EngravedName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
      style={({ pressed }) => [styles.compactInvite, pressed ? styles.cardPressed : null]}
    >
      <EngravedIcon name={icon} size={22} color={flColor.bronze400} />
      <Text style={styles.compactLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One Recent Legacy row: an engraved medallion, what happened, and when. A row whose record has no
 * screen of its own (a PR) is not pressable and carries no chevron, so nothing promises a tap it can't keep.
 */
function LegacyRow({ symbol, title, meta, onPress }: { symbol: SymbolName; title: string; meta: string; onPress?: () => void }) {
  const body = (
    <>
      <View style={styles.activityIcon}>
        <ForgeSymbol name={symbol} size={19} color={flColor.bronze300} strokeWidth={1.6} />
      </View>
      <View style={styles.inviteText}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? <Text style={styles.inviteSub}>{meta}</Text> : null}
      </View>
      {onPress ? <ChevronRightIcon size={14} color={forgeOr(flColor.bronze400, flColor.gray600)} /> : null}
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => [styles.activityRow, pressed ? styles.cardPressed : null]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={styles.activityRow} accessible accessibilityLabel={`${title}. ${meta}`}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Progressive reveal (Legacy-Amendment-002) ─────────────────────────────
  sectionPadTight: { marginTop: 26, paddingHorizontal: 24 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: flColor.labelInk,
    marginBottom: 12,
  },
  introTitle: {
    fontFamily: flFont.display,
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 40,
    letterSpacing: -0.4,
    color: flColor.cream100,
  },
  introBody: { fontSize: 14, lineHeight: 21, color: flColor.gray400, marginTop: 12, marginBottom: 22, maxWidth: 310 },
  cardPressed: { opacity: 0.8 },

  // chapter hero
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
    padding: 20,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: flShadow.card,
  },
  heroArt: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '78%', opacity: 0.9 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroOrdinal: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.gray400 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: themeScrim('rgba(8,11,14,0.55)'),
  },
  heroPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: forgeOr<string>(flColor.bronze300, flColor.bronzeInk) },
  heroTitle: {
    fontFamily: flFont.display,
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.4,
    color: flColor.cream100,
    marginTop: 12,
    maxWidth: '82%',
  },
  heroMeta: { fontSize: 13, fontWeight: '500', color: flColor.gray400, marginTop: 12 },
  heroGoal: { marginTop: 14, gap: 10, maxWidth: '88%' },
  heroGoalText: { fontSize: 14, lineHeight: 20, color: flColor.cream100 },
  heroGoalValue: { fontSize: 12.5, fontWeight: '600', color: flColor.bronzeInk },

  // start module + invitations
  startModule: {
    padding: 16,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: themeScrim('rgba(8,11,14,0.55)'),
  },
  moduleSub: { fontSize: 13, lineHeight: 19, color: flColor.gray400, marginTop: -4, marginBottom: 14 },
  primaryInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
    boxShadow: flShadow.glowSubtle,
  },
  primaryIcon: {
    width: 48,
    height: 48,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: themeScrim('rgba(8,11,14,0.45)'),
  },
  primaryTitle: { fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  inviteText: { flex: 1, minWidth: 0 },
  inviteSub: { fontSize: 12, lineHeight: 17, color: flColor.gray600, marginTop: 3 },
  smallRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallInvite: {
    flex: 1,
    gap: 6,
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  smallTitle: { fontSize: 14, fontWeight: '600', color: flColor.cream100, marginTop: 4 },

  // "or" + the compact add row
  orRule: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: -18, marginBottom: 22, paddingHorizontal: 30 },
  orLine: { flex: 1, height: 1, backgroundColor: flColor.charcoal600 },
  orText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  addPanel: {
    padding: 16,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: themeScrim('rgba(8,11,14,0.45)'),
  },
  addRow: { flexDirection: 'row', gap: 10 },
  compactInvite: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  compactLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },

  // recent activity
  activityList: { gap: 10, paddingHorizontal: 24, paddingTop: 8 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  activityTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },

  root: { flex: 1 },
  scroll: { paddingBottom: TAB_SCREEN_BOTTOM_GAP },

  // loading / error status slot
  statusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  statusText: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400 },
  retryText: { color: flColor.bronzeInk, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600' },

  // hero identity
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 2,
  },
  portraitWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  portrait: {
    width: 48,
    height: 48,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: flShadow.glowSubtle,
  },
  portraitImage: { width: '100%', height: '100%' },
  portraitInitials: {
    fontFamily: flFont.display,
    fontSize: 17,
    fontWeight: '600',
    color: flColor.bronze300,
  },
  identityText: { flex: 1, minWidth: 0, gap: 5 },
  athleteName: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: flColor.cream100,
  },
  rankMarker: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rankDiamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze300,
  },
  /*
   * `minWidth`, NOT `width`. It was a hard 76, and the pill below it needs more than that: 18pt of
   * horizontal padding + a 3pt gap + a 9pt chevron leaves 46pt for the label, and "PROGRESS" at 8.5pt
   * with 1.1 letter-spacing measures ~51. So it wrapped, and the final S sat alone on a second line.
   *
   * The row is `flexDirection: 'row'` with the name column flexing, so growing by ~5pt is absorbed
   * there — and the name already carries `numberOfLines={1}`. A minimum keeps the badge's alignment
   * with the portrait for athletes whose rank art is narrower.
   */
  progressBadge: { minWidth: 68, alignItems: 'center', gap: 4 },
  /* The row's real flex child. See the note at the `TourAnchor` and the one inside `ProgressBadge`. */
  badgeAnchor: { flexShrink: 0 },
  badgeShield: { width: 40, height: 56, alignItems: 'center', justifyContent: 'center' },
  badgeArt: { width: 40, height: 56 },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  progressPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.bronze300,
  },

  // sections
  section: { marginTop: 46 },
  sectionPad: { marginTop: 46, paddingHorizontal: 24 },
  sectionHeaderPad: { paddingHorizontal: 24 },

  /* The "no active chapter" invitation (L-5 §2). SOLID, not dashed like the Accomplishments slot below —
     that one is an optional space to fill, this is the spine of the product being absent, and it should
     read as the primary thing to do rather than as one more empty shelf. */
  inviteCard: { padding: 24, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, boxShadow: flShadow.card },
  inviteEyebrow: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.labelInk },
  inviteTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100, marginTop: 12 },
  inviteBody: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400, marginTop: 10 },
  inviteBtn: { marginTop: 20, paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, alignItems: 'center' },
  inviteBtnText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  stripPad: { gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  honorStripPad: { gap: 18, paddingHorizontal: 24, paddingTop: 10 },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: flColor.gray600,
    paddingBottom: 12,
    paddingHorizontal: 2,
  },

  // pinned
  pinTile: {
    width: 150,
    height: 196,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pinPlus: {
    width: 38,
    height: 38,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: flColor.bronzeInk },

  // pinned media card (.dc §pinned)
  pinCard: {
    position: 'relative',
    width: 150,
    height: 196,
    borderRadius: flRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: flShadow.card,
  },
  pinEmblem: { backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },
  pinMedallion: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 134, 84,0.10)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  pinPlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    marginTop: -18,
    marginLeft: -18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,11,14,0.66)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  pinKind: {
    position: 'absolute',
    top: 9,
    left: 9,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: flRadius.sm,
    backgroundColor: 'rgba(8,11,14,0.72)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  pinKindOnCard: { backgroundColor: forgeOr<string>('rgba(8,11,14,0.72)', flColor.surfaceRecessed) },
  pinKindText: { fontSize: 8, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  pinKindTextOnCard: { color: forgeOr<string>(flColor.bronze300, flColor.bronzeInk) },
  pinTitle: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    fontFamily: flFont.display,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 17,
    color: flColor.onMedia,
  },

  // my story
  storyStack: { gap: 12 },

  // what endures
  enduresStack: { marginTop: 46, gap: 26 },

  // closing
  closing: { marginTop: 46, paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center', gap: 15 },
  closingRule: { flexDirection: 'row', alignItems: 'center', gap: 14, width: 220 },
  closingLine: { flex: 1, height: 1, backgroundColor: flColor.bronzeBorder },
  closingDiamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  closingText: {
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    color: flColor.bronze300,
    maxWidth: 264,
  },
});
