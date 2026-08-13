import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { Pill } from '@/components/forge/composites/Pill';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getPrograms } from '@/domain/training/active-program';
import { fetchMyPrograms, type SavedProgram } from '@/data/programs-live';
import { fetchProgramSessions } from '@/data/programs-live';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { dayLabel, isSealed, nextOpenSlot, sessionsPerWeek, shelvePrograms, viewForState } from '@/domain/program/progress-core';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { StartStrengthSheet } from '@/components/forge/compositions/StartStrengthSheet';
import { useQuery } from '@/lib/useQuery';
import { fetchTemplates, templateSummary } from '@/data/templates-live';
import { STARTER_TEMPLATES } from '@/domain/workout/starter-templates';
import type { Program } from '@/domain/training/schema';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';

/**
 * Workouts tab root (plural) — W-2 Program Browse / Programs Catalog.
 * Source of truth: the design handoff "Forge Programs Catalog.dc.html".
 *
 * Two tabs: "My Workouts" (what you own + train today) and "Discover" (find
 * something new). Distinct from `/workout` (singular) — the active session that
 * the header start button and Home's "Start Workout" push to.
 *
 * REAL data: the active program (getActiveProgram) and the Discover catalog
 * (getPrograms — the converted, LOCKED Strength programs), including each
 * program's family / difficulty / duration / frequency. The header start button
 * starts today's real workout via useWorkoutSession + /workout.
 *
 * DEFERRED to a follow-up sub-phase (noted at the gate, not faked here): the
 * three bottom sheets — Start Training (activity tiles), Train with others
 * (friends roster is placeholder social data), and Filters (needs a per-program
 * `equipment` field the runtime Program does not carry yet). Sections with no
 * backend — Planned, Your Programs (custom), Shared — are omitted while empty
 * rather than shown with fabricated rows. Library rows + program taps route to a
 * not-yet-built destination and are inert (consistent with Home's unbuilt links).
 */

// ── derivations from the runtime Program (all real, from the definition) ──
function freqAndWeeks(p: Program): { freq: number; weeks?: number } {
  const freq = p.frequencyPerWeek ?? p.schedule.length;
  const weeks = p.durationWeeks ?? (p.progress ? Math.round(p.progress.total / Math.max(1, freq)) : undefined);
  return { freq, weeks };
}
function compactMeta(p: Program): string {
  const { freq, weeks } = freqAndWeeks(p);
  return weeks ? `${p.family} · ${weeks} wk · ${freq}/wk` : `${p.family} · ${freq}/wk`;
}

export default function WorkoutsScreen() {
  /* Rank-ups and honours announce themselves on whichever main tab the athlete reaches first, so a
     day that never touches Legacy is not a day the moment is lost. Throttled and idempotent — see
     the hook. The active workout is a pushed route, so it can never be interrupted by one. */
  useEarnedMoments();
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [family, setFamily] = useState<string>('All');
  // Walkthrough anchors. The `+` is a bare Pressable in the AppBar, so it takes the ref directly;
  // the sections are compositions and get a wrapper.
  const startRef = useTourAnchor('workouts-start');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  // The athlete's own programs. Refetched on focus so a program just built, duplicated, or ended shows
  // up the moment they come back to this tab.
  const { data: myPrograms, refetch: refetchMine } = useQuery(fetchMyPrograms, []);
  const { data: templateData } = useQuery(fetchTemplates, []);
  useFocusEffect(
    useCallback(() => {
      refetchMine();
    }, [refetchMine]),
  );
  // Memoized: `?? []` would mint a fresh array every render and defeat the catalog memo below.
  const mine = useMemo(() => myPrograms ?? [], [myPrograms]);
  const templates = templateData ?? [];

  /**
   * Open a built-in program — to READ it.
   *
   * This used to adopt first: a built-in has no database row, and adopting was how it got an id to
   * navigate with. The cost was that looking at a program put it on the athlete's list as "Planned",
   * for a plan they had not chosen. Reported by the PO doing exactly what a catalog invites — browsing.
   *
   * Program Detail now takes a DEFINITION SLUG and renders a preview with no row behind it. Adoption
   * moves to the Start button on that screen, which is the first moment the athlete has said they want
   * it. If they already have this plan in flight, open THAT row instead so they land on their own
   * progress rather than a preview of a program they are halfway through.
   */
  const openCatalogProgram = (p: Program) => {
    const live = mine.find((m) => m.sourceDefinitionId === p.id && (m.state === 'future' || m.state === 'active'));
    router.push({ pathname: '/program/[id]', params: { id: live?.id ?? p.id } });
  };

  /**
   * ACTIVE IS THE ATHLETE'S OWN, NOT THE CATALOG'S DEMO DEFAULT.
   *
   * `getActiveProgram()` reads the shipped program DEFINITIONS and returns whichever one the catalog
   * marks active — a demo cursor from before an athlete-progress backend existed. Its own header says so.
   * That backend has existed since 0017: `programs` carries a per-athlete `state`, and `fetchMyPrograms`
   * reads it. So this screen was telling a brand-new athlete they had Strength Foundation I underway
   * before they had chosen anything — a claim about their own record, which is the one thing the app must
   * never invent.
   */
  const { catalog, families } = useMemo(() => {
    const programs = getPrograms();
    /*
     * DISCOVER SUBTRACTS NOTHING. It is the catalogue, and the catalogue is a fixed list of what Forge
     * offers — not a list of what the athlete has left to take.
     *
     * Two rounds of this. First it subtracted every program ever adopted in ANY state, so finishing one
     * removed it permanently: graduate Strength Foundation I and you could never browse to it again,
     * though the model has supported a second run since 0104 dropped the one-row-per-source index. That
     * was fixed by exempting finished ones — and the exemption's own argument, that a catalogue which
     * quietly shrinks as you train is the opposite of what a catalogue is for, applies just as well to
     * the planned ones it kept hiding. Planning something is not consuming it.
     *
     * Reported by the PO, who planned a program and watched it vanish from the page he found it on.
     *
     * They are MARKED instead — the card carries an "In your plans" / "Active" pill — and
     * `openCatalogProgram` already routes a live one to the athlete's own row rather than a preview, so
     * tapping it lands on real progress. Nothing about that needed the row to be hidden.
     */
    const families = ['All', ...Array.from(new Set(programs.map((p) => p.family)))];
    return { catalog: programs, families };
  }, []);

  const discover = useMemo(
    () => (family === 'All' ? catalog : catalog.filter((p) => p.family === family)),
    [family, catalog],
  );

  /**
   * ══ FOUR THINGS, NOT ONE LIST ══
   *
   * "Your Programs" used to be every row the athlete owned, in every state — so the active program was
   * listed twice (once under Active, once here), a program merely queued sat under a heading that reads
   * as "the ones I built", and a finished one sat beside a plan for next month as though they were the
   * same kind of object. The `.dc` never said that: it has an Active card, a PLANNED section, and a
   * "Your Programs · custom-built" list, and this screen's own header admitted Planned was omitted for
   * want of a backend. That backend arrived with 0017.
   *
   *   planned — queued, not started. Where the next block waits while this one finishes.
   *   built   — programs the athlete AUTHORED (no catalog source). What the heading has always meant.
   *   past    — sealed runs of Forge programs. They leave the live sections but not the screen: a
   *             permanent record with nowhere to be read from is a record you have lost.
   */
  // The athlete's own active program wins over the built-in one — it's the thing actually tracking.
  const { active: myActive, planned, built, past } = useMemo(() => shelvePrograms(mine), [mine]);
  /** The design collapses Planned to a digest at 2+, so a queue never outweighs the program in flight. */
  const [plannedExpanded, setPlannedExpanded] = useState(false);
  const plannedCollapsed = planned.length >= 2 && !plannedExpanded;
  const [startOpen, setStartOpen] = useState(false);
  const [strengthOpen, setStrengthOpen] = useState(false);

  const startToday = async () => {
    setStartOpen(false);
    if (myActive) {
      const next = nextOpenSlot(myActive.structure, await fetchProgramSessions(myActive.id));
      // `nextOpenSlot` already skips unbuilt slots, but its `day` is typed nullable for the fallback
      // shape a still-being-authored program can have. Nothing to train is not an error — it is a
      // finished program, or one with no schedule yet.
      if (!next?.day) return;
      await writeWorkoutLaunch({ programId: myActive.id });
      startWorkout(dayLabel(next.day, next.dayIndex));
      router.push('/workout');
      return;
    }
    // No active program: there is no "today's workout" to start, so ask how they want to begin rather
    // than assuming the one-off. Assuming it was how a saved template became unreachable from here.
    setStrengthOpen(true);
  };

  /** A one-off session, deliberately unattributed — it belongs to no program's progress. */
  /**
   * A run that IS the session — the same one-block workout Home builds, on the same card.
   *
   * This row used to push `/active-run`, a second full-screen surface for the same activity with its own
   * controls, its own ending and its own way of writing to the record. That screen is retired; what it
   * had that the card didn't — the distance goal, the pace target and its cues — moved onto the card,
   * and the ending it owned is the session's own Finish, which every other workout already uses.
   */
  const startTrackedRun = async () => {
    setStartOpen(false);
    await writeWorkoutLaunch({ conditioning: { activity: 'run', modality: 'outdoor' } });
    startWorkout('Outdoor Run');
    router.push('/workout');
  };

  /**
   * Build-as-you-go — one of THREE ways to start a lifting session, not the only one.
   *
   * Every entry that used to land here directly now opens the Start Strength chooser first
   * (`Forge Strength Start.dc.html`): from a template · build it first · build as you go. This is what
   * the third option does once it is chosen.
   */
  const startFreestyle = async () => {
    setStartOpen(false);
    setStrengthOpen(false);
    await writeWorkoutLaunch({ freestyle: true });
    startWorkout('Freestyle Workout');
    router.push('/workout');
  };

  /** Open the chooser. The `+` sheet closes first so two sheets are never stacked. */
  const chooseStrength = () => {
    setStartOpen(false);
    setStrengthOpen(true);
  };

  const todayLabel = myActive ? myActive.name : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />

      <AppBar
        title={<Text style={styles.barTitle}>Workouts</Text>}
        actions={
          <Pressable
            ref={startRef}
            onPress={() => setStartOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Start training"
            style={styles.startBtn}
            hitSlop={8}
          >
            <PlusIcon color={flColor.bronze400} />
          </Pressable>
        }
      />

      {/* segmented control — two mindsets: own/train vs. find new */}
      <View style={styles.segWrap}>
        <TourAnchor id="workouts-segments" style={styles.segTrack}>
          <Segment label="My Workouts" active={tab === 'mine'} onPress={() => setTab('mine')} />
          <Segment label="Discover" active={tab === 'discover'} onPress={() => setTab('discover')} />
        </TourAnchor>
      </View>

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'mine' ? (
          <View style={styles.stack}>
            {/* ACTIVE — the anchor */}
            <TourAnchor id="workouts-active">
              <SectionHeader label="Active" />
              <View style={styles.sectionBody}>
                {myActive ? (
                  <SavedProgramRow
                    program={myActive}
                    onPress={() => router.push({ pathname: '/program/[id]', params: { id: myActive.id } })}
                  />
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Forge Your Next Legacy</Text>
                    <Text style={styles.emptySub}>Build your own below, or find one in Discover.</Text>
                  </View>
                )}
              </View>
            </TourAnchor>

            {/* PLANNED — queued, not started. The section the `.dc` always had and this screen never
                built, which is why a planned program had to sit in "Your Programs" pretending to be one
                the athlete wrote. Omitted entirely when empty: a heading over nothing is not a queue. */}
            {planned.length > 0 ? (
              <TourAnchor id="workouts-planned">
                <SectionHeader
                  label="Planned"
                  action={plannedCollapsed ? 'View all' : undefined}
                  onAction={() => setPlannedExpanded(true)}
                />
                <View style={[styles.sectionBody, styles.stackTight]}>
                  {plannedCollapsed ? (
                    <PlannedDigest
                      programs={planned}
                      onOpen={(p) => router.push({ pathname: '/program/[id]', params: { id: p.id } })}
                      onExpand={() => setPlannedExpanded(true)}
                    />
                  ) : (
                    planned.map((p) => (
                      <SavedProgramRow
                        key={p.id}
                        program={p}
                        onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })}
                      />
                    ))
                  )}
                </View>
              </TourAnchor>
            ) : null}

            {/* YOUR PROGRAMS — always rendered, because the create row lives here and the moment you most
                need it is the moment you have none. It used to be gated on `mine.length > 0`, which hid
                authoring from exactly the athlete who had never authored anything. */}
            <TourAnchor id="workouts-programs">
              <SectionHeader label="Your Programs" />
              <View style={[styles.sectionBody, styles.stackTight]}>
                {built.map((p) => (
                  <SavedProgramRow
                    key={p.id}
                    program={p}
                    onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })}
                  />
                ))}
                {/* Creation beside what it creates. This was a dashed CTA in DISCOVER — which means "find
                    something someone else made", and where the thing you built then landed in the OTHER
                    tab. */}
                <CreateRow label="Build a Program" onPress={() => router.push('/program-builder')} />
              </View>
            </TourAnchor>

            {/* PAST PROGRAMS — Forge programs you finished. Sealed records (Amendment-001 §6), so they are
                out of the live sections above, but they keep a home here: they used to be the only place
                on this screen a graduated run could be read from, and dropping them to match the `.dc`'s
                custom-only "Your Programs" would have deleted that access rather than moved it. */}
            {past.length > 0 ? (
              <View>
                <SectionHeader label="Past Programs" />
                <View style={[styles.sectionBody, styles.stackTight]}>
                  {past.map((p) => (
                    <SavedProgramRow
                      key={p.id}
                      program={p}
                      onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* YOUR TEMPLATES — a personal artifact, so it sits with programs rather than under "Library"
                beside two platform surfaces everyone shares. That grouping was the real error. */}
            <TourAnchor id="workouts-templates">
              {/* `mine=1` — this link sits under "Your Templates", so it answers with the athlete's own
                  shelf and not the From Forge suggestions. Same defect the row taps had; the rows were
                  fixed and the section link was left pointing at the undifferentiated hub. */}
              <SectionHeader
                label="Your Templates"
                action={templates.length > 3 ? 'View all' : undefined}
                onAction={() => router.push({ pathname: '/templates', params: { mine: '1' } })}
              />
              <View style={[styles.sectionBody, styles.stackTight]}>
                {templates.slice(0, 3).map((t) => (
                  <LibraryRow
                    key={t.id}
                    title={t.name}
                    sub={templateSummary(t)}
                    icon={<TemplatesIcon />}
                    /* ⚠ THIS PUSHED `/templates` — the HUB — for every row. Tapping your own template
                       landed you on a screen whose first section is the "From Forge" suggested shelf, so
                       the app answered "open my template" with four sessions somebody else wrote. The
                       hub is still one tap away on the section header's "View all"; a row opens the
                       template it names. */
                    onPress={() => router.push({ pathname: '/template/[id]', params: { id: t.id } })}
                  />
                ))}
                {/* ⚠ THIS OPENED THE START STRENGTH CHOOSER, under a header that says "Your Templates".
                    W25-Amendment-001 listed six doors that dropped into an empty freestyle session and
                    routed them all to the chooser; this row was one of them, and for the other five that
                    was right — they ask "how do you want to train right now". This one does not. It asks
                    to AUTHOR a shape, and the athlete has already answered the chooser's question by
                    tapping it. The sixth door on that same list settles the treatment: Templates' own
                    "New" pushes the builder directly (`templates.tsx`), and so does this.

                    ⚠ AND THE LABEL IS "TEMPLATE", NOT "WORKOUT" — PO call, 2026-08-13, overturning the
                    note that used to sit here arguing for consistency with the builder's own title. The
                    consistency argument was answered by renaming the OTHER three instead: this row, the
                    Templates hub's button, and the builder's own AppBar all say Template now, because a
                    template is what the screen produces. "Build a Workout" described the activity; the
                    athlete is choosing an artifact. */}
                <CreateRow label="Build a Template" onPress={() => router.push('/workout-builder')} />
                {/* The week door, beside its sibling. It was reachable only from the Templates hub, so an
                    athlete looking for it on the tab that lists their templates found the one-session
                    builder and reasonably concluded weeks were not built yet (PO, 2026-08-13). */}
                <CreateRow label="Build a Week" onPress={() => router.push({ pathname: '/program-builder', params: { mode: 'week' } })} />
              </View>
            </TourAnchor>

            {/* REFERENCE — what's left once the personal things move out is genuinely reference, and the
                section name is finally true. */}
            <TourAnchor id="workouts-reference">
              <SectionHeader label="Reference" />
              <View style={[styles.sectionBody, styles.stackTight]}>
                <LibraryRow
                  title="Exercise Library"
                  sub="Browse every exercise, bookmark the ones you use."
                  icon={<DumbbellIcon />}
                  onPress={() => router.push('/exercise-library')}
                />
                {/* Stays here, deliberately. It answers "what did I lift Tuesday" — a training question at
                    set-level granularity. The Legacy Timeline answers "what has this amounted to". Moving
                    a set-by-set log into the museum would dilute the museum. */}
                <LibraryRow
                  title="Activity History"
                  sub="Every session you’ve logged, month by month."
                  icon={<HistoryIcon />}
                  onPress={() => router.push('/activity-history')}
                />
              </View>
            </TourAnchor>
          </View>
        ) : (
          <View style={styles.stack}>
            {/* Kept OUT of Discover: authorship is not discovery, and what you build lands in the other
                tab. The one honest mention is the exit line under empty results, below. */}
            <Pressable onPress={() => router.push('/program-builder')} accessibilityRole="button" accessibilityLabel="Build your own program" style={[styles.buildCta, styles.hidden]}>
              <View style={styles.buildIcon}>
                <PlusIcon color={flColor.bronze300} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Build Your Own</Text>
                <Text style={styles.rowSub}>Design a program around your lifts.</Text>
              </View>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </Pressable>

            {/* ── SINGLE SESSIONS ───────────────────────────────────────────────────────────────
                Discover was programs only, which made the 81 Forge sessions reachable from exactly
                one place: the Templates hub, behind "Browse all". But a ready-made day is DISCOVERY
                content in the same sense a program is — the difference is commitment, not kind, and
                somebody who wants a leg day on Thursday is not shopping for a six-week block. One
                row rather than a second card list: this tab's subject is programs, and the browse
                screen is already built to be filtered. ── */}
            <Pressable
              onPress={() => router.push('/forge-templates')}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${STARTER_TEMPLATES.length} single sessions built by Forge`}
              style={styles.libRow}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Single Sessions</Text>
                <Text style={styles.rowSub}>
                  {STARTER_TEMPLATES.length} ready-made workouts — push, pull, legs and more, for the gym or at home.
                </Text>
              </View>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </Pressable>

            {/* Family filter */}
            <View>
              <Text style={styles.filterLabel}>Family</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {families.map((f) => (
                  <FamilyChip key={f} label={f} active={family === f} onPress={() => setFamily(f)} />
                ))}
              </ScrollView>
            </View>

            {/* Recommended Next — real catalog */}
            <View>
              <Text style={styles.recTitle}>Recommended Next</Text>
              <Text style={styles.recBlurb}>
                {myActive
                  ? `Something to follow ${myActive.name}.`
                  : 'A curated starting point for your next chapter.'}
              </Text>
              <View style={styles.stackTight}>
                {discover.map((p) => (
                  <CompactProgramCard
                    key={p.id}
                    program={p}
                    mine={mine.find((m) => m.sourceDefinitionId === p.id && (m.state === 'future' || m.state === 'active'))?.state ?? null}
                    onOpen={() => void openCatalogProgram(p)}
                  />
                ))}
                {discover.length === 0 ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No programs in this family yet.</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Training — the `+`'s sheet (`openStart` in the .dc): today's session, a freestyle strength
          log, distance-activity logging ("Log a Run" → run/walk/ride/row/swim with miles), and building a
          program. "Train with others" still needs the social plumbing, so it stays absent. */}
      <BottomSheet open={startOpen} onClose={() => setStartOpen(false)} title="Start Training">
        <View style={styles.stackTight}>
          {todayLabel ? (
            <Pressable onPress={() => void startToday()} accessibilityRole="button" accessibilityLabel={`Start today's workout — ${todayLabel}`} style={styles.libRow}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Today’s Workout</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{todayLabel}</Text>
              </View>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={chooseStrength}
            accessibilityRole="button"
            accessibilityLabel="Start a strength workout"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Strength Workout</Text>
              <Text style={styles.rowSub}>From a template, planned first, or built as you go.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
          {/* Two different things, deliberately both here: TRACK measures a session as you do it,
              LOG records one you already did. Neither replaces the other — a treadmill run or a swim
              has nothing for GPS to measure, and a run you forgot to start still counts. */}
          <Pressable
            onPress={() => void startTrackedRun()}
            accessibilityRole="button"
            accessibilityLabel="Track a run with GPS"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Track a Run</Text>
              <Text style={styles.rowSub}>Start now — your phone measures distance, pace, and route.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
          <Pressable
            onPress={() => {
              setStartOpen(false);
              router.push('/log-activity');
            }}
            accessibilityRole="button"
            accessibilityLabel="Log a run"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Log a Run</Text>
              <Text style={styles.rowSub}>Already done it? Record a run, walk, ride, row, or swim.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
          <Pressable
            onPress={() => {
              setStartOpen(false);
              router.push('/program-builder');
            }}
            accessibilityRole="button"
            accessibilityLabel="Build a program"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Build a Program</Text>
              <Text style={styles.rowSub}>Design your own week, day by day.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
        </View>
      </BottomSheet>

      {/* The three ways into a lifting session (`Forge Strength Start.dc.html`). Every path that would
          otherwise drop into an empty session opens this first. */}
      <StartStrengthSheet open={strengthOpen} onClose={() => setStrengthOpen(false)} onFreestyle={() => void startFreestyle()} />

      {/* Held to the "My Workouts" side: four of the six steps ring sections that only exist there, and a
          walkthrough that opened on Discover would silently drop them and teach a third of the screen. */}
      <ScreenTour screenKey="workouts" ready={tab === 'mine'} restingBottom={108} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational pieces
// ─────────────────────────────────────────────────────────────────────────────

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.segment, active ? styles.segmentActive : null]}
    >
      {active ? (
        <LinearGradient
          colors={flGradient.bronzeFill.colors}
          locations={flGradient.bronzeFill.locations}
          start={flGradient.bronzeFill.start}
          end={flGradient.bronzeFill.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextIdle]}>{label}</Text>
    </Pressable>
  );
}


/**
 * `mine` — the athlete's state for this definition, when they already hold it ('future' | 'active').
 * The card says so rather than the catalogue hiding the row: a program you planned is still a program
 * Forge offers, and the tap already opens YOUR copy of it.
 */
function CompactProgramCard({ program, mine, onOpen }: { program: Program; mine?: string | null; onOpen: () => void }) {
  const held = mine === 'active' ? 'Active' : mine === 'future' ? 'In your plans' : null;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={held ? `Open ${program.name} — ${held}` : `Open ${program.name}`}
      style={styles.compactCard}
    >
      <View style={styles.compactBody}>
        <Text style={styles.compactName} numberOfLines={1}>
          {program.name}
        </Text>
        <Text style={styles.compactMeta} numberOfLines={1}>
          {compactMeta(program)}
        </Text>
      </View>
      <Pill tone={held ? 'bronze' : 'muted'} size="sm">
        {held ?? program.difficulty}
      </Pill>
    </Pressable>
  );
}

/**
 * Planned, at 2+ — one card instead of a stack of them.
 *
 * A queue is a fact about later, and at full size it competes with the program actually in flight. The
 * digest still names every one of them and still opens each: it is smaller, not shorter.
 */
function PlannedDigest({
  programs,
  onOpen,
  onExpand,
}: {
  programs: SavedProgram[];
  onOpen: (p: SavedProgram) => void;
  onExpand: () => void;
}) {
  return (
    <View style={styles.digest}>
      <Text style={styles.digestCount}>
        {programs.length} planned {programs.length === 1 ? 'program' : 'programs'}
      </Text>
      {programs.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onOpen(p)}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, planned`}
          style={styles.digestRow}
        >
          <View style={styles.digestMark} />
          <View style={styles.rowBody}>
            <Text style={styles.digestName} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {p.structure.weeks} wk · {sessionsPerWeek(p.structure)}/wk
            </Text>
          </View>
          <ChevronRightIcon size={16} color={flColor.gray600} />
        </Pressable>
      ))}
      <Pressable onPress={onExpand} accessibilityRole="button" accessibilityLabel="View all planned programs" style={styles.digestAll}>
        <Text style={styles.digestAllText}>View all</Text>
      </Pressable>
    </View>
  );
}

/** One athlete-authored program: name, lifecycle, shape. Taps through to the existing Program Detail. */
function SavedProgramRow({ program, onPress }: { program: SavedProgram; onPress: () => void }) {
  const { pill } = viewForState(program.state, true);
  const perWeek = sessionsPerWeek(program.structure);
  const isActive = program.state === 'active';
  const isRetired = isSealed(program.state);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${program.name}, ${pill}`} style={styles.libRow}>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, isRetired && styles.rowTitleRetired]} numberOfLines={1}>
          {program.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {program.structure.weeks} wk · {perWeek}/wk
        </Text>
      </View>
      <View style={[styles.statePill, isActive && styles.statePillActive]}>
        <Text style={[styles.statePillText, isActive && styles.statePillTextActive]}>{pill}</Text>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

/** Authoring, rendered as the last row of the section holding what it authors. */
function CreateRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.createRow, pressed ? styles.createRowPressed : null]}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round">
        <Path d="M12 5v14M5 12h14" />
      </Svg>
      <Text style={styles.createRowText}>{label}</Text>
    </Pressable>
  );
}

function LibraryRow({ title, sub, icon, onPress }: { title: string; sub: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={styles.libRow}>
      <View style={styles.libIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

function FamilyChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>{label}</Text>
    </Pressable>
  );
}

// ── inline glyphs (Forged DNA: square caps / miter joins on structural marks) ──
function PlusIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
      <Path d="M12 6v12M6 12h12" />
    </Svg>
  );
}
function TemplatesIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M4 6h16M4 12h16M4 18h10" />
    </Svg>
  );
}
function DumbbellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function HistoryIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 4v4h4" />
      <Path d="M12 8v4l3 2" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  createRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  createRowPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  createRowText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  root: { flex: 1 },
  barTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: flColor.cream100,
  },
  startBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },

  // segmented control
  segWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  segTrack: {
    flexDirection: 'row',
    gap: 5,
    padding: 5,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.base,
  },
  segment: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    borderColor: flColor.bronzeBorder,
    boxShadow: flShadow.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  segmentTextActive: {
    color: flColor.cream100,
    textShadowColor: 'rgba(8,5,2,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  segmentTextIdle: {
    color: flColor.gray400,
  },

  // scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },
  stack: { gap: 28 },
  stackTight: { gap: 10 },
  sectionBody: { marginTop: 12 },

  // active hero card
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.base,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 14,
    boxShadow: flShadow.missionCard,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTitleWrap: { flex: 1, minWidth: 0, gap: 4 },
  heroName: {
    fontFamily: flFont.display,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
    color: flColor.cream100,
  },
  heroMeta: { fontSize: 13, color: flColor.gray400 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroProgressBar: { flex: 1 },
  heroPct: {
    fontSize: 12,
    fontWeight: '700',
    color: flColor.bronze300,
    fontVariant: ['tabular-nums'],
  },
  heroWorkoutLabel: { fontSize: 12, color: flColor.gray600 },
  heroNextRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  diamond: {
    width: 5,
    height: 5,
    transform: [{ rotate: '45deg' }],
    backgroundColor: flColor.bronze400,
  },
  heroNext: { flex: 1, fontSize: 12.5, color: flColor.bronze400 },

  // empty state
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    borderRadius: flRadius.xl,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    backgroundColor: flColor.bronzeTint,
  },
  emptyTitle: {
    fontFamily: flFont.display,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
  },
  emptySub: { marginTop: 7, fontSize: 13.5, color: flColor.gray400 },

  // library / build rows
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  libIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // planned digest
  digest: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  digestCount: {
    paddingTop: 13,
    paddingHorizontal: 16,
    paddingBottom: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  digestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  digestMark: { width: 5, height: 5, flexShrink: 0, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  digestName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  digestAll: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  digestAllText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowTitleRetired: { color: flColor.gray400 },
  statePill: {
    flexShrink: 0,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  statePillActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  statePillText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  statePillTextActive: { color: flColor.bronze300 },
  rowSub: { marginTop: 1, fontSize: 12.5, color: flColor.gray400 },
  buildCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.bronzeTint,
  },
  buildIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // family filter
  filterLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 10,
  },
  chips: { gap: 8, paddingRight: 4 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: flRadius.pill,
    borderWidth: 1,
  },
  chipActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipIdle: { borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  chipTextActive: { color: flColor.bronze300 },
  chipTextIdle: { color: flColor.gray400 },

  // recommended
  recTitle: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
    marginBottom: 4,
  },
  recBlurb: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 14 },

  // compact card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  compactBody: { flex: 1, minWidth: 0, gap: 2 },
  compactName: { fontSize: 15, fontWeight: '600', lineHeight: 18, color: flColor.cream100 },
  compactMeta: { fontSize: 12, color: flColor.gray400 },

  noResults: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    alignItems: 'center',
  },
  noResultsText: { fontSize: 13, color: flColor.gray600 },
});
