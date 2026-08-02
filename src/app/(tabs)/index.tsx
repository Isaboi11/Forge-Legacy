import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { NotificationBell } from '@/components/forge/compositions/NotificationBell';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { BarbellIcon, ForgeMarkIcon, ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { WorkoutsTabIcon, LegacyTabIcon, SquadsTabIcon } from '@/components/forge/primitives/icons/NavIcons';
import { ChapterTitleBlock } from '@/components/forge/compositions/ChapterTitleBlock';
import { TodaysWorkoutCard } from '@/components/forge/compositions/TodaysWorkoutCard';
import { ProgramMissionGrid } from '@/components/forge/compositions/ProgramMissionGrid';
import { YourCircleCard } from '@/components/forge/compositions/YourCircleCard';
import { QuickActionsRow } from '@/components/forge/compositions/QuickActionsRow';
import { TrainingNowSheet } from '@/components/forge/TrainingNowSheet';
import { todaysPrinciple } from '@/data/home-principles';
import { fetchHomeGym, saveHomeGym } from '@/data/home-gym-live';
import { fetchActiveChapterGoals } from '@/data/goals-live';
import { goalSections } from '@/domain/goals/goals';
import { fetchFriendsFeed } from '@/data/friends-feed-live';
import { fetchChallengeHub } from '@/data/challenges-live';
import { fetchTrainingNow, trainingSummary } from '@/data/presence-live';
import { fetchFriendLists } from '@/data/friends-live';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { fetchAwaitingChapter, fetchHomeChapter } from '@/data/home-live';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useProfile } from '@/lib/profile';
import { ExperienceLevelCard, EXPERIENCE_FOR, type IntakeResult } from '@/components/forge/compositions/ExperienceLevelCard';
import { getHomeLevel, setHomeLevel, clearHomeLevel } from '@/lib/home-level';
import { getHomeIntake, setHomeIntake, clearHomeIntake } from '@/lib/home-intake';
import { claimInitiativeHonor } from '@/data/honors-live';
import { useTour } from '@/hooks/useTour';
import { adoptCatalogProgram, fetchMyPrograms, fetchProgramCompletedCount, startProgram } from '@/data/programs-live';
import { structureFromDefinition } from '@/domain/program/adopt-core';
import { itemByName } from '@/domain/exercise-picker/data';
import { getProgramDefinitions } from '@/domain/training/programs';
import { nextSession, totalSessions } from '@/domain/program/progress-core';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { getActiveProgramById } from '@/domain/training/active-program';
import { resolveRecommendationId } from '@/domain/onboarding/recommend-core';
import { CARDIO_ACTIVITIES, CARDIO_DEFAULTS, deriveName, type CardioActivity } from '@/domain/workout/conditioning';
import type { Program, Workout } from '@/domain/training/schema';
import { resolveHomeWorkoutArtwork } from '@/domain/home-artwork/resolver';
import { enrichSessionExercises, equipmentForCatalogKey } from '@/domain/home-artwork/catalog';

/** AppBar wordmark — pillar mark + serif "Forge Legacy", left-aligned. */
function HomeWordmark() {
  return (
    <View style={styles.wordmark}>
      <ForgeMarkIcon />
      <Text style={styles.wordmarkText}>Forge Legacy</Text>
    </View>
  );
}

/**
 * "Chapter I — Building Your Foundation" → { number, name }, from the live DB chapter name (no hardcode).
 * Robust: split on the em dash and trim; no dash → the whole string is the name, number defaults to
 * "Chapter I".
 */
function splitChapterTitle(full: string): { number: string; name: string } {
  const parts = full.split('—');
  if (parts.length >= 2) return { number: parts[0].trim(), name: parts.slice(1).join('—').trim() };
  return { number: 'Chapter I', name: full.trim() };
}

/**
 * ONB-D17 isNew hero — the fresh athlete's first-session empty state. Two real actions: Start Training
 * (primary → the demo-workout logger, the working first-workout path) and Programs (secondary → the
 * Programs tab, the hub for BOTH browsing prebuilt programs AND building your own). "Programs" — not
 * "Browse Programs" — deliberately, so someone who wants to build their own doesn't read it as prebuilt-only
 * (ONB-Amendment-002).
 */
function FirstSessionCard({ onStart, onOpenPrograms }: { onStart: () => void; onOpenPrograms: () => void }) {
  return (
    <Card padding={24} style={styles.firstCard}>
      <View style={styles.firstIcon}>
        <BarbellIcon size={24} color={flColor.bronze400} />
      </View>
      <View style={styles.firstText}>
        <Text style={styles.firstTitle}>Forge your first program</Text>
        <Text style={styles.firstCopy}>Start your first session now, or head to Programs to browse the library or build your own.</Text>
      </View>
      <View style={styles.firstActions}>
        <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel="Start Training — begin your first workout">
          Start Training
        </Button>
        <Button variant="secondary" fullWidth onPress={onOpenPrograms} accessibilityLabel="Programs — browse the library or build your own">
          Programs
        </Button>
      </View>
    </Card>
  );
}

/** Two overlapping figures — the "friends" mark (distinct from the Squads glyph). */
function FriendsGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={7.5} cy={8} r={2.7} />
      <Circle cx={16.5} cy={8} r={2.7} />
      <Path d="M3 19a4.5 4.5 0 0 1 9 0M12 19a4.5 4.5 0 0 1 9 0" />
    </Svg>
  );
}

/** One "Explore Forge" tile — icon chip · label · one-line hint · chevron. */
function ExploreTile({ label, sub, icon, onPress }: { label: string; sub: string; icon: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} — ${sub}`} style={styles.exploreTile}>
      <View style={styles.exploreIcon}>{icon}</View>
      <View style={styles.exploreTileText}>
        <Text style={styles.exploreTileLabel}>{label}</Text>
        <Text style={styles.exploreTileSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <ChevronRightIcon size={16} color={flColor.bronze400} />
    </Pressable>
  );
}

/**
 * "Explore Forge" — the fresh athlete's invitation to the app's four pillars (ONB-A2-D4a). Four tiles that
 * route to Programs / Legacy / Squads / Friends. Pure navigation; the destinations are the real tabs/routes.
 */
function ExploreForgeSection({ onOpen }: { onOpen: (route: Href) => void }) {
  return (
    <View style={styles.explore}>
      <Text style={styles.exploreTitle}>Explore Forge</Text>
      <Text style={styles.exploreSub}>Four corners of your legacy — wander in anytime.</Text>
      <View style={styles.exploreGrid}>
        <ExploreTile label="Programs" sub="Browse & build" icon={<WorkoutsTabIcon size={22} color={flColor.bronze300} />} onPress={() => onOpen('/workouts')} />
        <ExploreTile label="Legacy" sub="Your record" icon={<LegacyTabIcon size={22} color={flColor.bronze300} />} onPress={() => onOpen('/legacy')} />
        <ExploreTile label="Squads" sub="Train together" icon={<SquadsTabIcon size={22} color={flColor.bronze300} />} onPress={() => onOpen('/squads')} />
        <ExploreTile label="Friends" sub="Your circle" icon={<FriendsGlyph />} onPress={() => onOpen('/friends')} />
      </View>
    </View>
  );
}

/**
 * H-1 Home — full-screen match of the design handoff "Forge Home.dc.html"
 * (Phase 2 core + STEP C follow-up).
 *
 * Sections, top to bottom: the ornate chapter title-block (chapter + diamond
 * divider + week/day + the rotating principle), the resolver-driven "Today's
 * Workout" hero, the Program|Mission grid, the "Your Circle" presence card, and
 * the Quick Actions row.
 *
 * EVERYTHING ON THIS SCREEN IS THE ATHLETE'S OWN. The hero and Program tile read their real program
 * (`fetchMyPrograms`) — never the catalog's demo cursor; the chapter and its week/day come from
 * `fetchHomeChapter`; the Mission tile from live goals; presence from 0086; Your Circle from the real
 * friends feed (0074); the avatar from `useProfile()`. The only authored constant is the daily principle
 * (`todaysPrinciple`), which is the product's own line and the same for everyone by design.
 *
 * The Home hero rank medallion is temporarily REMOVED (`showRankMedallion={false}`) pending user-supplied
 * cycling artwork — see FORGE_DELTAS §19. (Legacy's hero seal is a separate component and stays.)
 */

/**
 * THE CHOICE COMES BEFORE THE QUESTIONS. "Build my own" used to be a secondary button on step 1 of the
 * intake stepper — so the app asked what your experience level was, and only then mentioned you might
 * already know what you want to do. Someone arriving with a program in mind was walked through a
 * recommendation they never asked for. Two doors, same weight, neither the default.
 *
 * Shared by the first-run gate and the established athlete who has no program, because those two are the
 * same question asked at different times — and the second one used to be answered with a demo program.
 */
function ProgramPathChooser({
  title,
  subtitle,
  onGuided,
  onBuild,
  onBrowse,
}: {
  title: string;
  subtitle?: string;
  onGuided: () => void;
  onBuild: () => void;
  onBrowse: () => void;
}) {
  return (
    <View style={styles.pathBlock}>
      <Text style={styles.pathTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pathCardSub}>{subtitle}</Text> : null}
      <Pressable
        onPress={onGuided}
        accessibilityRole="button"
        accessibilityLabel="Help me find a program"
        style={({ pressed }) => [styles.pathCard, pressed ? styles.pathPressed : null]}
      >
        <Text style={styles.pathCardTitle}>Help me find one</Text>
        <Text style={styles.pathCardSub}>A few questions, then a program picked for where you are.</Text>
      </Pressable>
      <Pressable
        onPress={onBuild}
        accessibilityRole="button"
        accessibilityLabel="Build my own program"
        style={({ pressed }) => [styles.pathCard, pressed ? styles.pathPressed : null]}
      >
        <Text style={styles.pathCardTitle}>Build my own</Text>
        <Text style={styles.pathCardSub}>You know the work. Lay out the days and lifts yourself.</Text>
      </Pressable>
      <Pressable onPress={onBrowse} accessibilityRole="button" accessibilityLabel="Browse programs" hitSlop={8} style={styles.pathQuiet}>
        <Text style={styles.pathQuietText}>Or browse everything</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const [friendSheetOpen, setFriendSheetOpen] = useState(false);
  const [elseOpen, setElseOpen] = useState(false);
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();
  const { requestPrompt, markAnnounced } = useTour();
  const { showToast } = useToast();
  // Live identity for the AppBar avatar. The artwork resolver below keeps its synchronous seed
  // profile — it must resolve the hero art on the first frame, and the art is static regardless.
  const { profile: liveProfile } = useProfile();
  // H-1 "awaiting first workout" (ONB-D17): a just-onboarded athlete (active chapter, 0 workouts) gets a
  // purpose-built hero instead of the static content, so a fresh user never lands on stale/blank Home.
  const { data: awaiting, refetch: refetchAwaiting, loading: awaitingLoading } = useQuery(fetchAwaitingChapter, []);
  const { data: homeChapter } = useQuery(fetchHomeChapter, []);
  // The athlete's saved programs — if any, Home reflects them instead of the empty first-program card.
  const { data: myPrograms, refetch: refetchPrograms } = useQuery(fetchMyPrograms, []);
  // How far into the built program the athlete is, so Home previews the NEXT session rather than always
  // day 1 — and so the card matches the session the workout screen will actually open.
  // The ACTIVE program anchors Home, falling back to the most recent. Picking `[0]` alone meant starting
  // an older program changed nothing here — Home kept showing whichever was created last.
  const builtProgram = (myPrograms ?? []).find((p) => p.state === 'active') ?? myPrograms?.[0] ?? null;
  const builtId = builtProgram?.id ?? null;
  const { data: builtDone, refetch: refetchBuiltDone } = useQuery(
    () => (builtId ? fetchProgramCompletedCount(builtId) : Promise.resolve(0)),
    [builtId],
  );
  // Opt-in Home experience-level LENS (local only, ONB-Amendment-002) — undefined = loading, null = not
  // chosen (show the question), a level = show the suggested starting program. No DB write; re-askable.
  const { data: homeLevel, refetch: refetchLevel } = useQuery(getHomeLevel, []);
  // Goals + equipment intake (local only) — feeds the recommendation on the suggested face.
  const { data: homeIntake, refetch: refetchIntake } = useQuery(getHomeIntake, []);
  const { data: homeGymData, refetch: refetchHomeGym } = useQuery(fetchHomeGym, []);
  /* Your Circle's friend row, real since 0074 — the newest post from anyone the athlete is connected to.
     One post, not the feed: this is a doorway, and `/friends` is the room. Live presence is NOT read
     because there is nothing to read — an in-progress workout lives in a client-side session, not a
     table, so no athlete can observe another training. The fixture that claimed two squad-mates were
     mid-workout is retired rather than reproduced. */
  const { data: circlePosts } = useQuery(() => fetchFriendsFeed(1), []);
  /* The Competitions badge, real. It also advances any due challenge lifecycle transitions — there is no
     scheduler, so a season closes when someone opens a screen that reads it, and Home is the screen
     opened most. The badge is the cheap part; keeping every squad's competitions honest is the point. */
  const { data: challengeHub } = useQuery(fetchChallengeHub, []);
  /* Who from the circle is mid-workout (0086). Squad-mates outrank friends, and each athlete's own
     `visibility.training` audience decides whether they appear at all — "Only me" is the off switch. */
  const { data: trainingNow } = useQuery(fetchTrainingNow, []);
  const live = useMemo(() => trainingNow ?? [], [trainingNow]);
  /* Whether they have anyone at all, which an empty feed cannot tell us — "nobody posted" and "nobody to
     post" look identical from the posts alone, and they want opposite advice. */
  const { data: friendLists } = useQuery(fetchFriendLists, []);
  const hasCircle = (friendLists?.friends.length ?? 0) > 0 || live.length > 0;
  const circleActivity = useMemo(() => {
    const p = (circlePosts ?? []).find((x) => !x.isMine && (x.body ?? '').trim().length > 0);
    if (!p) return null;
    return { name: p.authorName, quote: (p.body ?? '').trim(), avatarUrl: p.authorAvatarUrl };
  }, [circlePosts]);
  // Re-read on focus so the hero flips OFF awaiting after the first workout AND reflects a program just
  // built in the builder (Home is a mounted tab; without this it fetches once and stays stale).
  const firstAwaitFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstAwaitFocus.current) {
        firstAwaitFocus.current = false;
        return;
      }
      refetchAwaiting();
      refetchPrograms();
      refetchIntake();
      refetchBuiltDone(); // a workout just finished → advance the card to the next session
    }, [refetchAwaiting, refetchPrograms, refetchIntake, refetchBuiltDone]),
  );

  // The program that anchors Home's "Today's Workout" + "Current Program" slots. Precedence:
  //   built program (myPrograms[0]) → the fresh athlete's chosen suggestion → the demo active program.
  // Progress is 0/total (no athlete-progress backend); a built program has no catalog artwork, so the
  // resolver reads its exercises' composition (program=null) and degrades to the split/neutral art.
  const { home } = useMemo(() => {
    const built = builtProgram;

    let program: Program | null = null;
    let workout: Workout | null = null;
    let name = '';
    let completed = 0;
    let total = 0;

    if (built) {
      // The NEXT unfinished session, not always the first — otherwise Home would keep offering Day A
      // forever while the program's progress moved on beneath it.
      const done = builtDone ?? 0;
      const next = nextSession(built.structure, done);
      const day = next?.day ?? built.structure.days.find((d) => d.main.length > 0) ?? built.structure.days[0] ?? null;
      workout = day
        ? {
            name: day.name.trim() || `Day ${day.letter}`,
            focus: day.name.trim() || undefined,
            exerciseCount: day.main.length,
            exercises: day.main.map((ex) => ({ catalogKey: ex.catalogKey ?? '', workingSets: ex.sets ?? 3, section: 'main' as const })),
          }
        : null;
      name = built.name;
      completed = done;
      total = totalSessions(built.structure);
    } else {
      const prog =
        awaiting && homeLevel != null
          ? getActiveProgramById(
              resolveRecommendationId({
                experience: EXPERIENCE_FOR[homeLevel],
                primaryGoal: homeIntake?.primaryGoal ?? null,
                equipment: homeIntake?.equipment ?? [],
              }),
            )
          : // NO PROGRAM IS A REAL STATE. This used to fall back to `getActiveProgram()`, which reads the
            // shipped program DEFINITIONS and returns whichever one the CATALOG marks active — so an
            // athlete who had chosen nothing (a freestyle-only athlete, past `awaiting` with no program
            // of their own) was shown Strength Foundation I on their hero as though it were theirs. Same
            // defect that was fixed on Workouts; this was the other half of it. They get the two doors
            // below instead.
            null;
      program = prog;
      workout = prog?.nextWorkout ?? null;
      name = prog?.name ?? '';
      completed = prog?.progress?.completed ?? 0;
      total = prog?.progress?.total ?? 0;
    }

    const resolved = resolveHomeWorkoutArtwork({
      // The athlete's REAL sex, which is all the resolver reads off the profile. It used to take the
      // fixture identity; `'unspecified'` is the honest default and the resolver's deliberate neutral
      // path (never `'male'`), so a profile that hasn't loaded degrades to neutral art rather than
      // guessing.
      user: { sex: liveProfile?.sex ?? 'unspecified' },
      workout: workout ?? ({} as Workout),
      program,
      exercises: workout ? enrichSessionExercises(workout.exercises ?? []) : [],
    });

    return { home: { workout, resolved, name, completed, total } };
  }, [builtProgram, builtDone, awaiting, homeLevel, homeIntake, liveProfile?.sex]);

  // The Mission tile shows the REAL chapter goal now (0025), not the HOME_DATA placeholder. Primary
  // preferred, else the newest goal; count = goals still in progress. No goals → an invite to set one.
  const { data: goalData } = useQuery(fetchActiveChapterGoals, []);
  const goalList = goalData?.goals ?? [];
  const { primary: primaryGoal, active: activeGoals } = goalSections(goalList);
  const missionTarget = (primaryGoal ?? activeGoals[0])?.name ?? 'Set a chapter goal';
  const goalsRemaining = goalList.filter((g) => g.achievedAt == null).length;

  // Shared actions (used by both the still-collecting gate and the un-gated Home hero).
  const startFirst = () => {
    startWorkout('First Workout');
    router.push('/workout');
  };
  const openPrograms = () => router.push('/workouts');
  const openBuilder = () => router.push('/program-builder');
  const completeIntake = async (r: IntakeResult) => {
    await setHomeLevel(r.level);
    await setHomeIntake({ goals: r.goals, primaryGoal: r.primaryGoal, equipment: r.equipment });
    // The quick-picked gym, when they trained one out. Absent = skipped, which must leave the profile
    // UNSET rather than empty — "I didn't answer" and "I own nothing" mean different things downstream.
    /*
     * NOT `.catch(() => {})`. The comment above draws a real distinction — absent must leave the
     * profile UNSET, because "I didn't answer" and "I own nothing" mean different things downstream —
     * and a swallowed failure produced exactly the "didn't answer" state while the athlete believed
     * they had answered. Their equipment then silently failed to filter the exercise list.
     * Still non-fatal: the rest of the intake is already saved and must not be lost, so this reports
     * and moves on rather than throwing the whole completion away.
     */
    if (r.homeGym) {
      try {
        await saveHomeGym(r.homeGym);
      } catch (e) {
        showToast(`Your gym setup didn’t save — ${errorMessage(e)}`);
      }
    }
    // NO honor here. Answering three questions about yourself is not a first move — Initiative is
    // earned by actually committing to a program (`acceptSuggestion`) or building one. Granting it at
    // intake meant the ceremony fired before the athlete had chosen anything at all.
    refetchLevel();
    refetchIntake();
    refetchHomeGym();
  };
  /**
   * Accept the recommendation. It's a catalog definition, so adopt it into a real program row and start
   * it — the same path as picking one from Discover. Without adoption the athlete would be "on" a program
   * that has no record, no progress and nothing for their workouts to attach to.
   */
  const acceptSuggestion = async (defId: string) => {
    const def = getProgramDefinitions().find((d) => d.id === defId);
    if (!def) return;
    try {
      const equipFor = (key: string) => equipmentForCatalogKey(key) ?? undefined;
      const adopted = await adoptCatalogProgram(def.id, structureFromDefinition(def, equipFor, (n) => itemByName(n)?.key));
      await startProgram(adopted.id);
      // NOW it's a first move: they picked a program and it's really started. Best-effort, DB dedupes
      // to one row; if it was already held there is nothing to celebrate, so retire the ceremony
      // rather than re-announcing an honor the athlete earned long ago.
      void claimInitiativeHonor()
        .then((newlyEarned) => {
          if (!newlyEarned) markAnnounced();
        })
        .catch(() => {});
      refetchPrograms();
      refetchBuiltDone();
    } catch {
      // leave them on the suggestion rather than dropping them somewhere unexplained
    }
  };

  const changeIntake = async () => {
    await clearHomeLevel();
    await clearHomeIntake();
    refetchLevel();
    refetchIntake();
  };
  // Start the Home program's next workout (built / chosen / demo). When it's a program the athlete built,
  // stamp the launch context first so the finished session is attributed to it — without this the workout
  // saves unattributed and the program's progress never moves.
  /**
   * A one-off, from the hero. The same freestyle path the Workouts tab and Templates use — one session
   * shape, three doors — and it clears any program context first so an ad-hoc workout is never credited
   * to a program the athlete deliberately stepped away from today.
   */
  /**
   * "Something else today?" opens a choice rather than assuming freestyle strength. Three things an
   * athlete plausibly means by it, and lifting is only one of them — the button used to answer for them.
   */
  const startFreestyleFromHome = () => setElseOpen(true);

  const startFreestyleStrength = async () => {
    setElseOpen(false);
    await writeWorkoutLaunch({ freestyle: true });
    startWorkout('Freestyle Workout', []);
    router.push('/workout');
  };

  /**
   * A run that IS the session — one cardio block, nothing else in it.
   *
   * BOTH modalities come through here now. Treadmill already did; Outdoor pushed to `/active-run`
   * instead, so two adjacent rows in the same sheet led to two entirely different surfaces with
   * different controls, different ways to finish, and different places the numbers ended up. A run is
   * a run whether it's the whole workout or the last leg of one, and it is the same card either way.
   */
  const startCardio = async (activity: CardioActivity) => {
    setElseOpen(false);
    /*
     * The modality is the activity's own default, not a choice forced at the door.
     *
     * Run, walk and ride open outdoors; the machines open indoors, because indoors is the only place a
     * rower exists. Either way the toggle lives on the card, where it belongs — the athlete decides on
     * the day, and for a machine `OUTDOOR_CAPABLE` means the toggle never appears at all.
     */
    const modality = CARDIO_DEFAULTS[activity].modality;
    await writeWorkoutLaunch({ conditioning: { activity, modality } });
    startWorkout(deriveName(activity, modality), []);
    router.push('/workout');
  };

  const startHomeWorkout = async () => {
    const w = home.workout;
    if (!w) return;
    if (builtId) await writeWorkoutLaunch({ programId: builtId });
    const lifts = (w.exercises ?? [])
      .filter((e) => e.section === 'main' && !e.optional)
      .map((e) => ({ catalogKey: e.catalogKey, name: exerciseNameFor(e.catalogKey), workingSets: e.workingSets }));
    startWorkout(w.name, lifts);
    router.push('/workout');
  };

  const hasProgram = !!(myPrograms && myPrograms.length > 0);
  // Chapter honesty: the full Home can now appear BEFORE the first workout (a suggestion/built program while
  // still `awaiting`), so show the real active chapter then — not the "Chapter III" placeholder.
  /* The athlete's OWN chapter. This used to fall back to the literal "Chapter III · The Rebuild · Week 6
     · Day 2" for anyone past their first workout — every athlete shown the same invented chapter on the
     first screen they land on. Null while it loads, which draws nothing rather than a placeholder. */
  const chapter = awaiting
    ? { ...splitChapterTitle(awaiting.chapterName), weekDay: 'Your first chapter' }
    : homeChapter
      ? { number: homeChapter.number, name: homeChapter.name, weekDay: homeChapter.weekDay }
      : { number: '', name: '', weekDay: '' };

  // Phase B un-gate: the full Home opens as soon as the athlete has a program signal — a built program OR a
  // chosen level (a suggestion exists). The single-card gate remains ONLY while a fresh athlete is still
  // collecting their starting point (no program, no level yet). The first-workout ceremony (ONB-D18) is
  // unaffected — it lives in the workout-complete flow, not this gate.
  const stillCollecting = !!awaiting && !hasProgram && homeLevel == null;
  /** Null until they pick a door. Local: it decides what to draw now, not anything worth persisting. */
  const [path, setPath] = useState<'guided' | null>(null);
  /**
   * Intake answered, but nothing chosen yet — show the recommendation and let the athlete decide.
   * This step existed on the card (`mode="suggested"`) but was never rendered: finishing the intake
   * dropped straight through to the full Home with a program silently assigned, so the athlete never
   * saw what was picked for them or had any say in it.
   */
  const showSuggestion = !!awaiting && !hasProgram && homeLevel != null;
  // A real "first move" — the athlete has built OR chosen a program (the unlock ceremony's trigger).
  //
  // This used to also accept `homeLevel != null`, which is only "they answered the experience question".
  // So the ceremony fired the moment the intake finished — while the athlete was still looking at the
  // suggestion, before they had picked anything. A program, and nothing less, is the first move.
  const hasProgramSignal = hasProgram;

  // First-move unlock (Onboarding-Amendment-003): once the full (un-gated) Home is settled AND a program
  // exists, announce the "Legacy Unlocked" ceremony (which hands to the guided tour). Guarded on the awaiting
  // query having resolved so the brief pre-load frame never fires early; `requestPrompt` is a no-op unless the
  // tour is still pending, so it's safe on every settled focus. The real chapter feeds the ceremony's stats.
  useFocusEffect(
    useCallback(() => {
      if (!awaitingLoading && !stillCollecting && hasProgramSignal) requestPrompt();
    }, [awaitingLoading, stillCollecting, hasProgramSignal, requestPrompt]),
  );

  if (stillCollecting || showSuggestion) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
        <AppBar
          title={<HomeWordmark />}
          actions={<NotificationBell />}
          avatar={<Avatar name={liveProfile?.name ?? ''} src={liveProfile?.avatarUrl ?? undefined} size="appBar" />}
          onAvatar={() => router.push('/account-settings')}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ChapterTitleBlock
            chapterNumber={chapter.number}
            chapterName={chapter.name}
            weekDay={chapter.weekDay}
            principle={todaysPrinciple()}
            showRankMedallion={false}
          />
          <View style={styles.content}>
            {homeLevel === undefined ? (
              // Level lens still loading — the first-session card (no flash of the stepper).
              <FirstSessionCard onStart={startFirst} onOpenPrograms={openPrograms} />
            ) : showSuggestion && homeLevel != null ? (
              // Answered — show WHAT was recommended and why, with a real choice about it.
              <ExperienceLevelCard
                mode="suggested"
                level={homeLevel}
                intake={homeIntake ?? null}
                homeGym={homeGymData ?? null}
                onStart={(programId) => void acceptSuggestion(programId)}
                onExplore={openPrograms}
                onChange={changeIntake}
              />
            ) : path == null ? (
              <ProgramPathChooser
                title="How do you want to start?"
                onGuided={() => setPath('guided')}
                onBuild={openBuilder}
                onBrowse={openPrograms}
              />
            ) : (
              // Guided — the intake stepper (level → goals → equipment).
              <ExperienceLevelCard mode="collect" onComplete={completeIntake} onBuild={openBuilder} />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />

      <AppBar
        title={<HomeWordmark />}
        actions={<NotificationBell />}
        avatar={<Avatar name={liveProfile?.name ?? ''} src={liveProfile?.avatarUrl ?? undefined} size="appBar" />}
        onAvatar={() => router.push('/account-settings')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ChapterTitleBlock
          chapterNumber={chapter.number}
          chapterName={chapter.name}
          weekDay={chapter.weekDay}
          principle={todaysPrinciple()}
          showRankMedallion={false}
        />

        <View style={styles.content}>
          {/* Phase B.1: the built / chosen / demo program feeds the EXISTING slots — the Today's Workout hero
              and the Current Program tile — not a separate card. */}
          {home.workout ? (
            <TodaysWorkoutCard
              resolved={home.resolved}
              title={home.workout.name}
              focus={home.workout.focus}
              exerciseCount={home.workout.exerciseCount ?? home.workout.exercises?.length ?? 0}
              onStart={startHomeWorkout}
              /* No `onPreview`: W-3 is unbuilt, and the card now renders as content rather than as a
                 button to nowhere when none is given. */
              onFreestyle={startFreestyleFromHome}
            />
          ) : null}

          {/* Past the first-run gate with no program of their own — a freestyle-only athlete. They used to
              be handed the catalog's demo program here. Now they get the same two doors the gate offers,
              plus the session they can start regardless. */}
          {!home.name ? (
            <>
              <ProgramPathChooser
                title="You don't have a program yet"
                subtitle="Train freely as long as you like — or give the work a shape."
                onGuided={changeIntake}
                onBuild={openBuilder}
                onBrowse={openPrograms}
              />
              <Pressable
                onPress={startFreestyleFromHome}
                accessibilityRole="button"
                accessibilityLabel="Start a workout without a program"
                hitSlop={8}
                style={styles.pathQuiet}
              >
                <Text style={styles.pathQuietText}>Or just train today</Text>
              </Pressable>
            </>
          ) : null}

          {home.name ? (
            <ProgramMissionGrid
              programName={home.name}
              completed={home.completed}
              total={home.total}
              missionTarget={missionTarget}
              goalsRemaining={goalsRemaining}
              // Tap "Current Program": a fresh athlete's suggestion → re-pick (Change); a program the
              // athlete built → its detail (schedule, progress, log); otherwise browse programs.
              onProgram={
                awaiting && homeLevel != null && !hasProgram
                  ? changeIntake
                  : builtId
                    ? () => router.push({ pathname: '/program/[id]', params: { id: builtId } })
                    : openPrograms
              }
              onMission={() => router.push('/goals')}
            />
          ) : null}

          <YourCircleCard
            liveUsers={live}
            friendActivity={circleActivity}
            hasCircle={hasCircle}
            onAddFriends={() => router.push('/add-friend')}
            onJoinLive={(userId) => router.push({ pathname: '/athlete/[id]', params: { id: userId } })}
            onFriendActivity={() => router.push('/friends')}
            onSeeCircle={() => router.push('/friends')}
          />

          {/* Two actions, both real. "Train Together" was "Challenge", which opened a sheet whose every
              row was inert — FRIENDS-context competitions are deferred, so it duplicated Competitions and
              then dead-ended. It now shows who is training, which is the honest form of working out with
              your people while S-10 is unbuilt. Competitions is unchanged: you start one from the hub. */}
          <QuickActionsRow
            competitionsCount={challengeHub?.active.length ?? 0}
            trainingCount={live.length}
            trainingSummary={trainingSummary(live)}
            onTrainTogether={() => setFriendSheetOpen(true)}
            onCompetitions={() => router.push('/competitions')}
          />

          {/* "Explore Forge" invitation (ONB-A2-D4a) — the fresh athlete's map to the four pillars. Shown
              only while awaiting the first workout; a returning athlete has already found their way around. */}
          {awaiting ? <ExploreForgeSection onOpen={(route) => router.push(route)} /> : null}
        </View>
      </ScrollView>

      {/*
        THE ACTIVITY TYPE PICKER (`Forge Activity Type Picker.dc.html` — "What are you training?").

        This was three hardcoded rows: freestyle, treadmill run, outdoor run. Walk and Ride were fully
        built — their own targets, glyphs, GPS gates and record labels — and unreachable from Home,
        because the sheet enumerated runs by hand instead of reading the list. Every conditioning
        activity now comes from `CARDIO_ACTIVITIES`, so adding one can never again leave it stranded
        behind a sheet that forgot to mention it.
      */}
      <BottomSheet open={elseOpen} onClose={() => setElseOpen(false)} title="What are you training?" scroll>
        <View style={styles.elseList}>
          <Pressable
            onPress={() => void startFreestyleStrength()}
            accessibilityRole="button"
            accessibilityLabel="Freestyle workout — add lifts as you go"
            style={({ pressed }) => [styles.elseRow, pressed ? styles.pathPressed : null]}
          >
            <Text style={styles.pathCardTitle}>Freestyle workout</Text>
            <Text style={styles.pathCardSub}>Add lifts as you go. Nothing planned.</Text>
          </Pressable>
          {CARDIO_ACTIVITIES.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => void startCardio(a.key)}
              accessibilityRole="button"
              accessibilityLabel={`${a.name} — ${a.sub}`}
              style={({ pressed }) => [styles.elseRow, pressed ? styles.pathPressed : null]}
            >
              <Text style={styles.pathCardTitle}>{a.name}</Text>
              <Text style={styles.pathCardSub}>{a.sub}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <TrainingNowSheet
        open={friendSheetOpen}
        onClose={() => setFriendSheetOpen(false)}
        athletes={live}
        onAthlete={(userId) => {
          setFriendSheetOpen(false);
          router.push({ pathname: '/athlete/[id]', params: { id: userId } });
        }}
        onFindPeople={() => {
          setFriendSheetOpen(false);
          router.push('/friends');
        }}
        onInvite={() => {
          setFriendSheetOpen(false);
          router.push('/train-invite');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  elseList: { gap: 10 },
  elseRow: { padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  pathBlock: { gap: 12 },
  pathTitle: { marginBottom: 4, fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  pathCard: { paddingHorizontal: 18, paddingVertical: 18, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card },
  pathPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  pathCardTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  pathCardSub: { marginTop: 6, fontSize: 13, lineHeight: 19, color: flColor.gray600 },
  pathQuiet: { alignSelf: 'center', marginTop: 4, paddingVertical: 6 },
  pathQuietText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  root: {
    flex: 1,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.45)',
    alignItems: 'flex-end',
    paddingTop: 64,
    paddingRight: 14,
    zIndex: 50,
  },
  menuCard: {
    minWidth: 190,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: 14,
    paddingVertical: 4,
    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
  },
  menuName: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray400, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  menuDivider: { height: 1, backgroundColor: flColor.charcoal600, marginHorizontal: 6 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 14 },
  menuItemText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  firstCard: { alignItems: 'center', gap: 16 },
  firstIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstText: { alignItems: 'center', gap: 6 },
  firstTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100, textAlign: 'center' },
  firstCopy: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 20, color: flColor.gray400, textAlign: 'center', maxWidth: 260 },
  firstActions: { width: '100%', gap: 10 },

  // "Explore Forge" invitation grid
  explore: { gap: 4 },
  exploreTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  exploreSub: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 19, color: flColor.gray400, marginBottom: 12 },
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  exploreTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  exploreIcon: {
    width: 40,
    height: 40,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exploreTileText: { flex: 1, minWidth: 0, gap: 2 },
  exploreTileLabel: { fontFamily: flFont.sans, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  exploreTileSub: { fontFamily: flFont.sans, fontSize: 11.5, color: flColor.gray400 },

  scrollContent: {
    paddingBottom: 44,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 20,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmarkText: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
  },
});
