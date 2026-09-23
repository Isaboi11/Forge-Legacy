import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { Pill } from '@/components/forge/composites/Pill';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { LegacyTabIcon } from '@/components/forge/primitives/icons/NavIcons';
import { flColor, flFont, flGradient, flRadius, flShadow, flText } from '@/constants/foundation';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { HoltMark } from '@/components/forge/HoltMark';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { getPrograms } from '@/domain/training/active-program';
import { PROGRAM_FAMILIES, type ProgramFamily } from '@/domain/training/schema';
import { fetchMyPrograms } from '@/data/programs-live';
import { fetchCoachProfile, EMPTY_COACH_PROFILE, type CoachProfile } from '@/data/coach-profile-live';
import { nextAfter, recommendProgramOptions } from '@/domain/onboarding/recommend';
import type { EquipmentId } from '@/domain/onboarding/derive';
import { sessionsPerWeek, shelvePrograms, totalSessions } from '@/domain/program/progress-core';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { CreateNewSheet } from '@/components/forge/compositions/CreateNewSheet';
import { ProgramCatalogRow } from '@/components/forge/compositions/ProgramCatalogRow';
import { useQuery } from '@/lib/useQuery';
import { fetchTemplates } from '@/data/templates-live';
import { fetchTrainedWithin } from '@/data/recent-work-live';
import { STARTER_TEMPLATES, focusLabel, starterMeta, starterSummary } from '@/domain/workout/starter-templates';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';

/**
 * Workouts tab root (plural). Distinct from `/workout` (singular) — the active session.
 *
 * ══ A HUB, NOT A LIST — Workouts restructure (PO, 2026-09-22, with a mockup as north star) ══
 *
 * *"We are not reducing Forge's workout capabilities. We are reducing how many concepts the user has to
 * understand at once."* Before: programs, templates, weeks, three builders, discovery and reference all
 * exposed at once. Now each half of the segmented control answers a small set of questions:
 *
 *   MY WORKOUTS                                   DISCOVER
 *   What am I doing?      → Active Program /      Looking for one?     → Search · Browse by Focus
 *                           Build What's Next     A structured block?  → For You (2) · All Programs
 *   What have I made?     → Your Library          A workout today?     → Single Sessions
 *   I want to make one.   → the `+`               I don't know.        → Coach Holt
 *   Supporting reference. → Library · History
 *
 * (2026-09-23 hierarchy pass, PO mockup: Create New card removed — the `+` is the same sheet; Programs and
 * Templates share one "Your Library" label; Discover reordered so programs lead and sessions follow.)
 *
 * WHERE EVERYTHING THAT LEFT THIS SCREEN WENT — nothing was deleted, only moved one tap in:
 *   · Planned / built / imported / past program rows → `/programs` (the "Programs" card)
 *   · The inline template rows                     → `/templates` (the "Workout Templates" card)
 *   · The full catalogue + family filter           → `/program-catalog?family=` (focus chips, All Programs)
 *   · Build a Program / Build a Template           → the `+` (CreateNewSheet)
 *   · "Log a Run" (the only door to /log-activity) → Activity History's header
 *   · Today's Workout / Track a Run                → Home, which owns starting today's session and
 *                                                    already starts outdoor and treadmill runs
 *
 * ⚠ "BUILD A WEEK" IS GONE FROM THE HUB BY DECISION. The model is Program → Weeks → Workouts → Exercises.
 * The `week_templates` data, W-29, Program Builder's "use a saved week" and Holt's week artifact are all
 * untouched — only the standalone top-level door is removed.
 */

/**
 * The coach profile's environment, in the recommender's equipment vocabulary.
 *
 * ⚠ NOT OPTIONAL: `accessFor` reads an EMPTY list as "bodyweight only", so passing `[]` for an athlete who
 * never answered would recommend them a no-equipment block. Unknown is treated as a gym — the catalogue's
 * own fallback (Strength Foundation I) is a gym program, and that is what an unanswered intake gets on
 * Home too.
 */
function equipmentFor(p: CoachProfile): EquipmentId[] {
  switch (p.environment) {
    case 'home':
      return ['homegym'];
    case 'bodyweight':
    case 'outdoor':
      return ['bodyweight'];
    default:
      return ['fullgym'];
  }
}

export default function WorkoutsScreen() {
  /* Rank-ups and honours announce themselves on whichever main tab the athlete reaches first, so a
     day that never touches Legacy is not a day the moment is lost. Throttled and idempotent — see
     the hook. The active workout is a pushed route, so it can never be interrupted by one. */
  useEarnedMoments();
  const router = useRouter();
  const { openCoach } = useCoachDoor();
  const { startWorkout } = useWorkoutSession();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  // Walkthrough anchors. The `+` is a bare Pressable in the AppBar, so it takes the ref directly;
  // the sections are compositions and get a wrapper.
  const startRef = useTourAnchor('workouts-start');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  /*
   * Both reads refetch on focus. ⚠ The templates read once sat on `[]` directly under a comment
   * promising the opposite, so a template just built "didn't show up" until the tab remounted (PO,
   * 2026-08-24). A `[]` effect reading a fact that changes on another screen is the recurring version of
   * this bug in this codebase. The hub no longer lists either inline, but both still decide whether the
   * athlete owns anything at all (`hasOwnWork`), and the active program is read from the first.
   */
  const { data: myPrograms, refetch: refetchMine, settled: mineSettled } = useQuery(fetchMyPrograms, []);
  const { data: templateData, refetch: refetchTemplates, settled: templatesSettled } = useQuery(fetchTemplates, []);
  const { data: profileData } = useQuery(fetchCoachProfile, []);
  const { data: trainedRecently, error: trainedError, refetch: refetchTrained, settled: trainedSettled } = useQuery(fetchTrainedWithin, []);
  useFocusEffect(
    useCallback(() => {
      refetchMine();
      refetchTemplates();
      refetchTrained();
    }, [refetchMine, refetchTemplates, refetchTrained]),
  );
  // Memoized: `?? []` would mint a fresh array every render and defeat the memos below.
  const mine = useMemo(() => myPrograms ?? [], [myPrograms]);
  const templates = templateData ?? [];
  const catalog = useMemo(() => getPrograms(), []);

  /**
   * ACTIVE IS THE ATHLETE'S OWN, NOT THE CATALOG'S DEMO DEFAULT. `getActiveProgram()` reads the shipped
   * DEFINITIONS and returns whichever one the catalog marks active — a demo cursor from before 0017.
   * Telling a brand-new athlete they had Strength Foundation I underway is a claim about their own record,
   * which is the one thing the app must never invent. `shelvePrograms` reads the per-athlete `state`.
   */
  const { active: myActive, planned, past } = useMemo(() => shelvePrograms(mine), [mine]);
  /** The Forge definition behind the active program, when there is one — for its focus + difficulty tags. */
  const activeDef = myActive?.sourceDefinitionId ? catalog.find((p) => p.id === myActive.sourceDefinitionId) ?? null : null;

  /**
   * Whether "My Workouts" has anything in it at all — the test for showing the tab control.
   *
   * ⚠ EVERY KIND OF OWN WORK, NOT JUST THE ACTIVE PROGRAM. A saved template or a finished program is
   * still the athlete's, and hiding the control on somebody who owns twelve templates would strand them:
   * `mine` is the only door back from Discover once the toggle is gone.
   */
  const hasOwnWork =
    myActive != null || planned.length > 0 || past.length > 0 || mine.length > 0 || templates.length > 0 ||
    /* ⚠ OR THEY TRAIN (PO, 2026-09-23): anyone who has saved a workout in the last 14 days gets the full
       tab — a tester logging every week with no program or template was still being shown the arrival view. */
    trainedRecently === true ||
    /* A read that failed is unknown, and unknown gets the full tab, not the arrival view. */
    trainedError != null;
  /**
   * The arrival view — `Onboarding-Amendment-006` ONB-A6-D3 (PO mockup, 2026-09-21). ⚠ ONLY ONCE BOTH
   * READS HAVE LANDED: `hasOwnWork` reads false while they are in flight, so keying on it alone would
   * flash the arrival view at every returning athlete on a cold open.
   */
  const ownWorkKnown = mineSettled && templatesSettled && trainedSettled;

  /* The ONE creation sheet, behind the header `+`. See `CreateNewSheet`. */
  const [createOpen, setCreateOpen] = useState(false);

  /**
   * Freestyle — train now, attributed to no program. The session name is the literal the logger's rename
   * guard compares against (`cardio-manual-log.test.mjs` pins it in this file), which is why the launch
   * stays here and the sheet only calls it.
   */
  const startFreestyle = async () => {
    setCreateOpen(false);
    await writeWorkoutLaunch({ freestyle: true });
    startWorkout('Freestyle Workout');
    router.push('/workout');
  };

  // ── DISCOVER ────────────────────────────────────────────────────────────────────────────────────
  /** Focus chips: the families the catalogue actually carries, in the schema's canonical order. */
  const focuses = useMemo(() => {
    const present = new Set(catalog.map((p) => p.family));
    return PROGRAM_FAMILIES.filter((f) => present.has(f));
  }, [catalog]);

  const profile = profileData ?? EMPTY_COACH_PROFILE;
  /**
   * ══ "RECOMMENDED FOR YOU" IS A RECOMMENDATION, NOT THE CATALOGUE RELABELLED ══
   *
   * Four at most, from the mechanisms that already exist and nothing invented:
   *   1. What comes after the program they last finished — `nextAfter`, only when the named successor is
   *      REAL (six of seven authored successors are not, and a miss is simply skipped).
   *   2. The intake recommendation — goal × experience × equipment, from the SERVER coach profile, the
   *      same lookup Home's starting point runs. Its first entry is the recommendation; the rest are its
   *      own alternates (Home Gym coverage order when a profile exists, catalogue order otherwise).
   * Then: the program already active is dropped (you are doing it), and duplicates collapse.
   */
  const recommended = useMemo(() => {
    const ids: string[] = [];
    const lastPast = past[0]?.sourceDefinitionId ?? null;
    const after = lastPast ? nextAfter(lastPast) : null;
    if (after?.kind === 'program') ids.push(after.program.id);
    for (const v of recommendProgramOptions(
      {
        experience: profile.experience,
        primaryGoal: profile.goalIds[0] ?? null,
        equipment: equipmentFor(profile),
        homeGym: profile.ownedEquipment,
      },
      catalog.length,
    )) {
      ids.push(v.id);
    }
    const activeSource = myActive?.sourceDefinitionId ?? null;
    const out: typeof catalog = [];
    for (const id of ids) {
      if (out.length === 4) break;
      if (id === activeSource || out.some((p) => p.id === id)) continue;
      const p = catalog.find((c) => c.id === id);
      if (p) out.push(p);
    }
    return out;
  }, [catalog, past, profile, myActive]);

  /**
   * Open a Forge program — to READ it. Program Detail takes a DEFINITION SLUG and renders a preview with
   * no row behind it; adoption waits for its Start (`browse-is-not-adopt.test.mjs`). A program already
   * held live opens THAT row, so the athlete lands on their own progress.
   */
  /**
   * Discover's search — over the two shelves the page already offers, both shipped content, so it is a
   * local filter and not a new index. Every query word must hit (name, family / focus, level, blurb), so
   * "home beginner" narrows instead of widening. Sessions are capped with a door to their full browser.
   */
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const searchHits = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return { programs: [], sessions: [], sessionTotal: 0 };
    const hits = (hay: string) => words.every((w) => hay.includes(w));
    const programs = catalog.filter((p) => hits(`${p.name} ${p.family} ${p.difficulty}`.toLowerCase()));
    const sessions = STARTER_TEMPLATES.filter((t) =>
      hits(`${t.name} ${focusLabel(t.focus)} ${t.blurb} ${starterMeta(t)}`.toLowerCase()),
    );
    return { programs, sessions: sessions.slice(0, 8), sessionTotal: sessions.length };
  }, [query, catalog]);

  const liveFor = (id: string) => mine.find((m) => m.sourceDefinitionId === id && (m.state === 'future' || m.state === 'active'));
  const openCatalogProgram = (id: string) => router.push({ pathname: '/program/[id]', params: { id: liveFor(id)?.id ?? id } });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />

      <AppBar
        title="Workouts"
        actions={
          <Pressable
            ref={startRef}
            onPress={() => setCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new"
            style={styles.startBtn}
            hitSlop={8}
          >
            <PlusIcon color={flColor.bronze400} />
          </Pressable>
        }
      />

      {/* segmented control — two mindsets: own/train vs. find new.
          ⚠ HIDDEN WHILE "MY WORKOUTS" HOLDS NOTHING. A toggle between something and nothing is not a
          choice, it is a wrong first guess with a fix hidden inside it. It returns permanently the moment
          the athlete owns anything at all — see `hasOwnWork`. */}
      {hasOwnWork ? (
        <View style={styles.segWrap}>
          <TourAnchor id="workouts-segments" style={styles.segTrack}>
            <Segment label="My Workouts" active={tab === 'mine'} onPress={() => setTab('mine')} />
            <Segment label="Discover" active={tab === 'discover'} onPress={() => setTab('discover')} />
          </TourAnchor>
        </View>
      ) : tab === 'discover' ? (
        /* ⚠ A BACK BUTTON, NOT THE TABS — PO, 2026-09-21: *"there should just be a back button for right
           now and not those two tabs."* The tabs arrive with the first thing they own. */
        <Pressable
          onPress={() => setTab('mine')}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => [styles.discoverBack, pressed ? styles.pressed : null]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square">
            <Path d="M15 5l-7 7 7 7" />
          </Svg>
          <Text style={styles.discoverBackText}>Back</Text>
        </Pressable>
      ) : null}

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'mine' && !hasOwnWork ? (
          ownWorkKnown ? (
            <View style={styles.firstRun}>
              <View style={styles.firstRunHead}>
                <Text style={styles.kicker}>Get started</Text>
                <Text style={styles.firstRunTitle}>Build Your Training.</Text>
                <Text style={styles.firstRunBody}>
                  Create your own workouts and programs, or choose from templates to get started.
                </Text>
              </View>
              {/* ⚠ "BUILD" GOES TO THE GUIDED LANE (PO, 2026-09-20) — one question per screen, with "I'll
                  set it up myself" on every step, so the dense builder is still one tap away. */}
              <View style={styles.firstRunDoors}>
                <FirstRunDoor
                  icon={<PlusIcon />}
                  title="Build a Program"
                  sub="Create your own program from scratch."
                  onPress={() => router.push('/program-guided')}
                />
                <FirstRunDoor
                  icon={<LegacyTabIcon size={22} color={flColor.bronze400} />}
                  title="Choose a Program"
                  sub="Browse Forge programs and templates."
                  onPress={() => setTab('discover')}
                />
              </View>
              <View style={styles.tip}>
                <LightbulbIcon />
                <View style={styles.tipText}>
                  <Text style={styles.tipTitle}>Tip</Text>
                  <Text style={styles.tipBody}>
                    Not sure where to start? You can always build your own or choose a program and make it yours.
                  </Text>
                </View>
              </View>
            </View>
          ) : null
        ) : tab === 'mine' ? (
          <View style={styles.stack}>
            {/*
              ══ ACTIVE PROGRAM — WHAT AM I CURRENTLY DOING ══

              ⚠ A SURFACE NOW, WHERE IT WAS EDITORIAL. The 2026-08-25 pass drew this as type on the ground
              ("the anchor is not a card, you leave it for the program screen"). The PO's 2026-09-22 mockup
              — the north star for this restructure — puts it on a restrained surface with a round chevron,
              and says *"visually important, but not oversized"*. Newer instruction wins; the surface is
              neutral (`charcoal600` hairline), because bronze on this half is reserved for Build My Own.

              ⚠ AND IT IS NOT A SECOND COPY OF HOME. Home answers *what do I train now* and owns the start
              button. This answers *what am I following* — the program as an object.

              Without an active program: the existing invitation, unchanged — no fabricated program.
            */}
            <TourAnchor id="workouts-active">
              {myActive ? (
                <SectionHeader
                  label="Active Program"
                  action="View Program"
                  onAction={() => router.push({ pathname: '/program/[id]', params: { id: myActive.id } })}
                />
              ) : null}
              {myActive ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/program/[id]', params: { id: myActive.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${myActive.name} — open your active program`}
                  style={({ pressed }) => [styles.activeCard, pressed ? styles.pressed : null]}
                >
                  <View style={styles.activeBody}>
                    <Text style={styles.kicker}>Following</Text>
                    <Text style={styles.activeTitle} numberOfLines={2}>
                      {myActive.name}
                    </Text>
                    <Text style={styles.activeMeta}>
                      {sessionsPerWeek(myActive.structure)}× per week · {totalSessions(myActive.structure)} sessions
                    </Text>
                    {/* Tags only where the definition carries them — an imported or built program has no
                        family or difficulty, and inventing one would be a claim nobody made. */}
                    {activeDef ? (
                      <View style={styles.tags}>
                        <Pill tone="muted" size="sm">{activeDef.family}</Pill>
                        <Pill tone="muted" size="sm">{activeDef.difficulty}</Pill>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.activeGo}>
                    <ChevronRightIcon size={18} color={flColor.cream100} />
                  </View>
                </Pressable>
              ) : (
                /* ══ NO ACTIVE PROGRAM — "BUILD WHAT'S NEXT" (PO mockup, 2026-09-23) ══
                   No "Active Program" header above it: the eyebrow already says there isn't one, and a
                   heading announcing an empty slot was the same fact twice. Build My Own is THE action
                   (bronze fill); Find Me One is the quiet sibling. The plate behind it is a background
                   detail at 7% — if it is noticeable, it is too loud. */
                <View style={styles.hero}>
                  <HeroPlate style={styles.heroPlateMine} />
                  <Text style={styles.kicker}>No active program</Text>
                  <Text style={styles.heroTitle}>Build What’s Next</Text>
                  <Text style={styles.heroBody}>Create your own program or find one built for your goals.</Text>
                  {/* ⚠ "BUILD" GOES TO THE GUIDED LANE, NOT THE DENSE BUILDER — PO, 2026-09-20. */}
                  <View style={styles.heroActions}>
                    <View style={styles.heroAction}>
                      <Pressable
                        onPress={() => router.push('/program-guided')}
                        accessibilityRole="button"
                        accessibilityLabel="Build my own program — create a program from scratch"
                        style={({ pressed }) => [styles.heroCta, styles.heroCtaPrimary, pressed ? styles.pressed : null]}
                      >
                        <LinearGradient
                          colors={flGradient.bronzeFill.colors}
                          locations={flGradient.bronzeFill.locations}
                          start={flGradient.bronzeFill.start}
                          end={flGradient.bronzeFill.end}
                          style={StyleSheet.absoluteFill}
                        />
                        <HammerIcon />
                        <Text style={styles.heroCtaPrimaryText} numberOfLines={1}>
                          Build My Own
                        </Text>
                        <ChevronRightIcon size={15} color={flColor.onBronze} />
                      </Pressable>
                      <Text style={styles.heroCaption}>Create a program from scratch.</Text>
                    </View>
                    <View style={styles.heroAction}>
                      <Pressable
                        onPress={() => setTab('discover')}
                        accessibilityRole="button"
                        accessibilityLabel="Find me a program — get a personalized plan"
                        style={({ pressed }) => [styles.heroCta, styles.heroCtaQuiet, pressed ? styles.pressed : null]}
                      >
                        <CompassIcon />
                        <Text style={styles.heroCtaQuietText} numberOfLines={1}>
                          Find Me One
                        </Text>
                        <ChevronRightIcon size={15} color={flColor.gray400} />
                      </Pressable>
                      <Text style={styles.heroCaption}>Get a personalized plan.</Text>
                    </View>
                  </View>
                </View>
              )}
            </TourAnchor>

            {/*
              YOUR LIBRARY — programs and workout templates under ONE label (PO, 2026-09-23). Two separate
              doors to two separate screens; only their presentation is shared. No "See all": each card IS
              the navigation. "Workout" stays in the templates' name on purpose — these are reusable single
              workouts, and the word keeps them from being read as week or program templates.

              ⚠ NO CREATE NEW CARD. It duplicated the `+` (same sheet) and, with no program, Build My Own.
              The `+` still opens `CreateNewSheet`: freestyle · workout template · program · import.
            */}
            <View>
              <SectionHeader label="Your Library" />
              <View style={styles.stackTight}>
                <TourAnchor id="workouts-programs">
                  <NavCard
                    title="Programs"
                    sub="Programs you’ve built, imported, or saved."
                    icon={<StackIcon />}
                    onPress={() => router.push('/programs')}
                  />
                </TourAnchor>
                <TourAnchor id="workouts-templates">
                  <NavCard
                    title="Workout Templates"
                    sub="Reusable individual workouts."
                    icon={<TemplateIcon />}
                    onPress={() => router.push('/templates')}
                  />
                </TourAnchor>
              </View>
            </View>

            {/* REFERENCE — genuinely reference: platform surfaces, not personal artefacts. */}
            <TourAnchor id="workouts-reference">
              <SectionHeader label="Reference" />
              <View style={styles.stackTight}>
                <NavCard
                  title="Exercise Library"
                  sub="Browse exercises, muscle groups, and equipment."
                  icon={<DumbbellIcon />}
                  onPress={() => router.push('/exercise-library')}
                />
                {/* Stays here, deliberately. It answers "what did I lift Tuesday" — a training question at
                    set-level granularity. The Legacy Timeline answers "what has this amounted to". */}
                <NavCard
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
            {/*
              ══ DISCOVER — Search → Browse by Focus → For You → Single Sessions → Holt (PO, 2026-09-23) ══
              Programs are the structured path, so they lead; a single session is the "just today" option
              beneath them; Holt is the last door — "I've looked and still don't know".
            */}
            <View style={styles.hero}>
              <HeroPlate style={styles.heroPlateDiscover} />
              <Text style={styles.kicker}>Discover</Text>
              <Text style={styles.heroTitle}>Find Your Next Program</Text>
              <Text style={styles.heroBody}>Search programs, single workouts, or browse by focus.</Text>
              <View style={styles.searchWrap}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" style={styles.searchIcon}>
                  <Circle cx={11} cy={11} r={7} />
                  <Path d="M20 20l-3.2-3.2" />
                </Svg>
                <TextInput
                  style={styles.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search programs & workouts…"
                  placeholderTextColor={flColor.gray600}
                  accessibilityLabel="Search programs and workouts"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} style={styles.searchClear}>
                    <Glyph size={16} color={flColor.gray400}>
                      <Path d="M6 6l12 12M18 6L6 18" />
                    </Glyph>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {searching ? (
              /* ── SEARCH RESULTS — the same two shelves the landing page samples, matched in full. ── */
              <>
                {searchHits.programs.length === 0 && searchHits.sessions.length === 0 ? (
                  <View style={styles.searchEmpty}>
                    <Text style={styles.rowTitle}>Nothing matches “{query.trim()}”</Text>
                    <Text style={styles.rowSub}>Try a focus, a lift, or a level — or browse all programs.</Text>
                  </View>
                ) : null}
                {searchHits.programs.length > 0 ? (
                  <View>
                    <SectionHeader label="Programs" action="All Programs ›" onAction={() => router.push('/program-catalog')} />
                    <View style={styles.stackTight}>
                      {searchHits.programs.map((p) => (
                        <ProgramCatalogRow key={p.id} program={p} held={liveFor(p.id)?.state ?? null} onPress={() => openCatalogProgram(p.id)} />
                      ))}
                    </View>
                  </View>
                ) : null}
                {searchHits.sessions.length > 0 ? (
                  <View>
                    <SectionHeader
                      label="Single Sessions"
                      action={searchHits.sessionTotal > searchHits.sessions.length ? 'All Sessions ›' : undefined}
                      onAction={() => router.push('/forge-templates')}
                    />
                    <View style={styles.stackTight}>
                      {searchHits.sessions.map((t) => (
                        <NavCard
                          key={t.id}
                          title={t.name}
                          sub={`${starterSummary(t)} · ${starterMeta(t)}`}
                          icon={<DumbbellIcon />}
                          onPress={() => router.push({ pathname: '/starter-template/[id]', params: { id: t.id } })}
                          accessibilityLabel={`Preview ${t.name}`}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {/* ── BROWSE BY FOCUS — compact filters, each opening the ONE catalogue filtered to its
                    family. One row that scrolls sideways when it runs out of width, rather than a tall
                    wrapped block; no "See all" — All Programs sits on For You. ── */}
                <View>
                  <SectionHeader label="Browse by Focus" />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.focusScroller}
                    contentContainerStyle={styles.focusRow}
                  >
                    {focuses.map((f) => (
                      <Pressable
                        key={f}
                        onPress={() => router.push({ pathname: '/program-catalog', params: { family: f } })}
                        accessibilityRole="button"
                        accessibilityLabel={`${f} programs`}
                        style={({ pressed }) => [styles.focusChip, pressed ? styles.pressed : null]}
                      >
                        <FocusIcon family={f} />
                        <Text style={styles.focusText} numberOfLines={1}>
                          {f}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* ── FOR YOU — the top two of `recommended`. "All Programs" is the WHOLE catalogue, not
                    "more recommendations". ── */}
                <View>
                  <SectionHeader label="For You" action="All Programs ›" onAction={() => router.push('/program-catalog')} />
                  <View style={styles.stackTight}>
                    {recommended.slice(0, 2).map((p) => (
                      <ProgramCatalogRow key={p.id} program={p} held={liveFor(p.id)?.state ?? null} onPress={() => openCatalogProgram(p.id)} />
                    ))}
                  </View>
                </View>

                {/* ── SINGLE SESSIONS — "I want a workout to do today." Below the programs on purpose: the
                    difference is commitment, not kind, and the structured path leads. ── */}
                <NavCard
                  title="Single Sessions"
                  sub="Ready-made workouts for today."
                  icon={<DumbbellIcon />}
                  onPress={() => router.push('/forge-templates')}
                  accessibilityLabel={`Browse ${STARTER_TEMPLATES.length} single sessions built by Forge`}
                />

                {/* ── COACH HOLT — the last door, not the primary CTA. Opens the coach that already exists
                    with `recommend`, so Holt arrives reading the catalogue as a program recommendation.
                    His established medallion, not a new portrait; neutral hairline so it cannot outweigh
                    the programs above it. ── */}
                <Pressable
                  onPress={() => openCoach('recommend')}
                  accessibilityRole="button"
                  accessibilityLabel="Not sure where to start? Ask Coach Holt to build around your goals"
                  style={({ pressed }) => [styles.holtCard, pressed ? styles.pressed : null]}
                >
                  <HoltMark size={44} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>Not sure where to start?</Text>
                    <Text style={styles.rowSub}>Let Coach Holt build around your goals.</Text>
                  </View>
                  <View style={styles.holtCta}>
                    <Text style={styles.holtCtaText}>Ask Holt</Text>
                    <ChevronRightIcon size={13} color={flColor.bronze300} />
                  </View>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <CreateNewSheet open={createOpen} onClose={() => setCreateOpen(false)} onFreestyle={() => void startFreestyle()} />

      {/* Held to the "My Workouts" side: the steps ring sections that only exist there. */}
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

/** One navigation card: icon tile · title · one line · chevron. The hub's only row shape. */
function NavCard({
  title,
  sub,
  icon,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  sub: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [styles.navCard, pressed ? styles.pressed : null]}
    >
      <View style={styles.navIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

/** One of the arrival view's two doors — icon ring · title · one line · chevron. */
function FirstRunDoor({ icon, title, sub, onPress }: { icon: ReactNode; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${sub}`}
      style={({ pressed }) => [styles.door, pressed ? styles.pressed : null]}
    >
      <View style={styles.doorRing}>{icon}</View>
      <View style={styles.doorText}>
        <Text style={styles.doorTitle}>{title}</Text>
        <Text style={styles.doorSub}>{sub}</Text>
      </View>
      <ChevronRightIcon size={16} color={flColor.bronze400} />
    </Pressable>
  );
}

// ── inline glyphs (Forged DNA: square caps / miter joins on structural marks) ──
function Glyph({ children, size = 20, color = flColor.bronze300 }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      {children}
    </Svg>
  );
}
function LightbulbIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </Svg>
  );
}
function PlusIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
      <Path d="M12 6v12M6 12h12" />
    </Svg>
  );
}
function StackIcon() {
  return <Glyph><Path d="M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" /></Glyph>;
}
function TemplateIcon() {
  return <Glyph><Path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /></Glyph>;
}
function DumbbellIcon() {
  return <Glyph><Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" /></Glyph>;
}
function HistoryIcon() {
  return (
    <Glyph>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 4v4h4" />
      <Path d="M12 8v4l3 2" />
    </Glyph>
  );
}
function HammerIcon() {
  return (
    <Glyph size={18} color={flColor.onBronze}>
      <Path d="M13.5 4.5l6 6-2.5 2.5-6-6zM11 7L4 14M4 14l6 6M10 20l7-7" />
    </Glyph>
  );
}
function CompassIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </Svg>
  );
}
/**
 * The heroes' background detail — a weight plate in outline, bronze at 7%, bled off the right edge.
 * Drawn, not a raster: it takes the theme's own bronze in both palettes, and at this opacity it reads as
 * part of the slate texture rather than an illustration. Never under the text column's first ~60%.
 */
function HeroPlate({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.heroPlate, style]}>
      <Svg width={190} height={190} viewBox="0 0 200 200" fill="none" stroke={flColor.bronze400}>
        <Circle cx={100} cy={100} r={96} strokeWidth={3} />
        <Circle cx={100} cy={100} r={82} strokeWidth={1.2} />
        <Circle cx={100} cy={100} r={40} strokeWidth={1.5} />
        <Circle cx={100} cy={100} r={14} strokeWidth={3} />
      </Svg>
    </View>
  );
}
/** One mark per program family, for the focus chips. */
const FOCUS_PATHS: Record<ProgramFamily, ReactNode> = {
  Strength: <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />,
  Conditioning: <Path d="M13 3l-7 10h5l-1 8 7-10h-5z" />,
  'Muscle Building': <Path d="M5 19c0-5 2-9 5-11l2-4 3 1-1 4c3 1 5 4 5 7v3z" />,
  'Full Body & Home': <Path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  Mobility: <Path d="M12 5.5a1.5 1.5 0 1 0 0-.01M12 8v6M7 10l5-1 5 1M9 21l3-7 3 7" />,
  Running: <Path d="M14 5.5a1.5 1.5 0 1 0 0-.01M9 20l2.5-5 3-2-1-4-3.5 2-1.5 3M14.5 9l3 2 1.5-1" />,
};
function FocusIcon({ family }: { family: ProgramFamily }) {
  return <Glyph size={18}>{FOCUS_PATHS[family]}</Glyph>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.86 },
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
    color: flColor.onBronze,
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
    paddingBottom: SCREEN_BOTTOM_GAP,
  },
  stack: { gap: 36 },
  stackTight: { gap: 10 },
  discoverBack: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10 },
  discoverBackText: { fontSize: 14, fontWeight: '600', color: flColor.bronze400 },

  /* ── THE ARRIVAL VIEW (ONB-A6-D3) ─────────────────────────────────────────────────────────────── */
  firstRun: { gap: 26 },
  firstRunHead: { gap: 12 },
  firstRunTitle: {
    fontFamily: flFont.display,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -0.8,
    color: flColor.cream100,
  },
  firstRunBody: { fontSize: 16, lineHeight: 23, color: flColor.gray400 },
  firstRunDoors: { gap: 12 },
  door: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  doorRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doorText: { flex: 1, minWidth: 0, gap: 4 },
  doorTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  doorSub: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400 },
  tip: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorderSubtle,
  },
  tipText: { flex: 1, minWidth: 0, gap: 6 },
  tipTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.bronze400 },
  tipBody: { fontSize: 14, lineHeight: 20, color: flColor.gray400 },

  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: flText.bronzeLabel,
  },

  /* ── ACTIVE PROGRAM ───────────────────────────────────────────────────────────────────────────── */
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  activeBody: { flex: 1, minWidth: 0, gap: 6 },
  /* The display face at hero scale — the one typographic moment on this half. Everything else is sans. */
  activeTitle: {
    fontFamily: flFont.display,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: flColor.cream100,
  },
  activeMeta: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  activeGo: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── HEROES — "Build What's Next" and Discover's intro. Type on the ground, no container. ─────────── */
  hero: { gap: 8 },
  heroPlate: { position: 'absolute', opacity: 0.07 },
  heroPlateMine: { top: -30, right: -64 },
  heroPlateDiscover: { top: -34, right: -70 },
  heroTitle: {
    fontFamily: flFont.display,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: flColor.cream100,
    marginTop: 2,
  },
  heroBody: { fontSize: 14.5, lineHeight: 21, color: flColor.gray400, maxWidth: 330 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroAction: { flex: 1, minWidth: 0, gap: 7 },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroCtaPrimary: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.card },
  heroCtaPrimaryText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: flColor.onBronze,
    textShadowColor: 'rgba(8,5,2,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  heroCtaQuiet: { borderColor: flColor.charcoal600 },
  heroCtaQuietText: { flex: 1, fontSize: 14.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.cream100 },
  heroCaption: { fontSize: 12, lineHeight: 16, color: flColor.gray600, paddingHorizontal: 2 },

  searchWrap: { position: 'relative', justifyContent: 'center', marginTop: 12 },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  search: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    borderRadius: flRadius.md,
    paddingVertical: 12,
    paddingLeft: 42,
    paddingRight: 40,
    fontFamily: flFont.sans,
    fontSize: 14.5,
    color: flColor.cream100,
  },
  searchClear: { position: 'absolute', right: 12, zIndex: 1 },
  searchEmpty: { gap: 2 },

  /* ── NAV CARDS ────────────────────────────────────────────────────────────────────────────────── */
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  navIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  rowSub: { marginTop: 2, fontSize: 12.5, lineHeight: 17.5, color: flColor.gray400 },

  /* ── DISCOVER ─────────────────────────────────────────────────────────────────────────────────── */
  /* Bleeds to the screen edges so a scrolled chip runs off the edge, not into an invisible wall. */
  focusScroller: { marginHorizontal: -20 },
  focusRow: { gap: 8, paddingHorizontal: 20 },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  focusText: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  holtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.surfaceRecessed,
  },
  holtCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 9,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  holtCtaText: { fontSize: 13, fontWeight: '700', color: flColor.bronze300 },
});
