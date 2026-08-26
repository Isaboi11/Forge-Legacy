import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { HoltMark } from '@/components/forge/HoltMark';
import { AppBar } from '@/components/forge/composites/AppBar';
import { NotificationBell } from '@/components/forge/compositions/NotificationBell';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { ChevronRightIcon, PlanSheetIcon, BarbellIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { WorkoutsTabIcon, LegacyTabIcon, SquadsTabIcon } from '@/components/forge/primitives/icons/NavIcons';
import { ChapterTitleBlock } from '@/components/forge/compositions/ChapterTitleBlock';
import { TodaysWorkoutCard } from '@/components/forge/compositions/TodaysWorkoutCard';
import { ProgramMissionGrid } from '@/components/forge/compositions/ProgramMissionGrid';
import { YourCircleCard } from '@/components/forge/compositions/YourCircleCard';
import { circleActivity as circleActivityFor } from '@/domain/home/circle-activity';
import { displayWeight } from '@/domain/settings/units';
import { useUnits } from '@/lib/settings';
import { WeeklyReviewCard } from '@/components/forge/WeeklyReviewCard';
import { fetchWeeklyReview, type WeeklyReview } from '@/data/weekly-review-live';
import { reviewWindowOpen } from '@/domain/coach/rulebook/review';
import { getRetiredReviewWeeks, isWeekRetired, retireReviewWeek } from '@/lib/weekly-review-seen';
import { useEntitlement } from '@/lib/entitlement';
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
import { getStartChoice, setStartChoice, type StartChoice } from '@/lib/program-intent';
import { getHomeIntake, setHomeIntake, clearHomeIntake } from '@/lib/home-intake';
import { claimInitiativeHonor } from '@/data/honors-live';
import { useTour } from '@/hooks/useTour';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { adoptCatalogProgram, fetchAllProgramSessions, fetchMyPrograms, startProgram, updateProgram } from '@/data/programs-live';
import type { ProgramDay } from '@/data/programs-live';
import type { SessionMark } from '@/domain/program/progress-core';
import { WorkoutPreviewSheet } from '@/components/forge/WorkoutPreviewSheet';
import { SwapWorkoutSheet, type SwapOption } from '@/components/forge/SwapWorkoutSheet';
import { structureFromDefinition } from '@/domain/program/adopt-core';
import { itemByName } from '@/domain/exercise-picker/data';
import { getProgramDefinitions } from '@/domain/training/programs';
import { dayLabel, nextOpenSlot, plannedDays, swapSessionOrder, totalSessions, trainingDays } from '@/domain/program/progress-core';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { clearPlannedWorkout, fetchPlannedWorkout } from '@/data/planned-workout-live';
import { StartStrengthSheet } from '@/components/forge/compositions/StartStrengthSheet';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { getActiveProgramById } from '@/domain/training/active-program';
import { resolveRecommendationId } from '@/domain/onboarding/recommend-core';
import { catalogCanRecommend } from '@/domain/onboarding/recommend';
import { CARDIO_ACTIVITIES, CARDIO_DEFAULTS, OUTDOOR_CAPABLE, deriveName, type CardioActivity, type Modality } from '@/domain/workout/conditioning';
import { loadSession, resumeSummary } from '@/domain/workout/autosave';
import { composeHome, isHomeReady, selectHomePrograms, HOME_READY_CEILING_MS } from '@/domain/home/composition';
import { ForgeSplash } from '@/components/forge-splash';
import { doneSetCount } from '@/domain/workout/metrics';
import type { Program, Workout } from '@/domain/training/schema';
import { resolveHomeWorkoutArtwork } from '@/domain/home-artwork/resolver';
import { enrichSessionExercises, equipmentForCatalogKey } from '@/domain/home-artwork/catalog';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';

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
 *
 * THE FIRST DOOR IS FREESTYLE UNTIL THE CATALOG EARNS IT BACK. `onGuided` is undefined while
 * `catalogCanRecommend()` is false, and the slot that asked "Help me find one" offers to train today
 * instead. Two programs are authored, both Strength Foundation — so the intake's three questions about
 * goal, experience and equipment had one answer waiting whatever you said, and a runner with no barbell
 * got it too. Offering to train now is the honest thing this screen can do; offering to find you a
 * program is not, yet. The stepper, the recommendation and their tests are untouched and return on
 * their own when the families land — see `canRecommend`.
 */
function ProgramPathChooser({
  title,
  subtitle,
  onGuided,
  onCoach,
  onImport,
  onBuild,
  onBrowse,
  onFreestyle,
}: {
  title: string;
  subtitle?: string;
  /** Undefined = the catalog cannot answer the intake's questions, so it is not asked. */
  onGuided?: () => void;
  /** Hand over to Coach Holt, who builds one rather than picking one off a shelf. */
  onCoach: () => void;
  /** Bring across a plan they already run. The door an experienced athlete is actually looking for. */
  onImport: () => void;
  onBuild: () => void;
  onBrowse: () => void;
  onFreestyle: () => void;
}) {
  return (
    <View style={styles.pathBlock}>
      <Text style={styles.pathTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pathCardSub}>{subtitle}</Text> : null}
      {/*
        ══ THREE DOORS, AND EACH ONE MATCHES SOMETHING THE ATHLETE ALREADY KNOWS ABOUT THEMSELVES ══

        This card had drifted to SIX options: Build it with me · Help me find one · I've got a program
        already · Build my own · Or browse everything · Or just train today. Two of them said the same
        thing to the person reading — "Build it with me" and "Help me find one" both mean *help me get a
        program*, and which one BUILDS versus which one PICKS OFF A SHELF is an implementation detail no
        beginner should have to reason about. A fourteen-program shelf standing beside a coach who writes
        to order is not a real choice; it is two doors to the same room.

        So the question each door answers is now one the athlete can actually answer about themselves:
        do I want one written for me, do I already have one, or do I just want to train today.

        ⚠ THE LIBRARY IS DEMOTED, NOT DELETED. The quiet link below still opens the guided intake, which
        is the thing that picks well and ends in a real recommendation. Named, authored programs are real
        work and some athletes want to choose one — they are simply not the primary door.
      */}
      {/*
        ⚠ THE RECOMMENDED PATH HAS TO LOOK RECOMMENDED, AND A BRONZE BORDER ALONE DID NOT DO IT.
        Three cards of equal weight read as "three menu buttons", whichever one is outlined. The eyebrow
        names the recommendation in words, the mark says WHO you are choosing rather than which setup
        method, and the extra height and warmth carry it at a glance. Everything else on the card is
        deliberately unchanged — the background is already doing the brand work, and more gold here would
        read as theatrical rather than premium.
      */}
      <Pressable
        onPress={onCoach}
        accessibilityRole="button"
        accessibilityLabel="Recommended — build a program with Coach Holt"
        style={({ pressed }) => [styles.pathCard, styles.pathCardLead, pressed ? styles.pathPressed : null]}
      >
        <View style={styles.leadRow}>
          <View style={styles.leadText}>
            <Text style={styles.leadEyebrow}>
              Recommended <Text style={styles.leadEyebrowDim}>· with Coach Holt</Text>
            </Text>
            <Text style={styles.pathCardTitle}>Build it with me</Text>
            <Text style={styles.pathCardSub}>Coach Holt asks what you&apos;re after, then writes the block around it.</Text>
          </View>
          {/*
            Low visual weight on purpose — it is a signature, not an illustration.

            ⚠ 44, NOT 54. It was 54, which made this the LARGEST Holt in the app — bigger than the
            floating coin that is his actual tap target — while its own comment called it low weight.
            The 2026-08-26 artwork pass closed the medallion's 9% dead margin so the coin now fills its
            frame, which made the same number read about a tenth larger again: at 54 the mark stood as
            tall as the title and sub-line together and pushed the sub into a different wrap.

            The ladder is now hierarchy rather than drift — 52 floating coin · 44 here · 40 chat gutter
            · 34 session sheet header. Below 44 the row regains enough width that the sub-line reflows,
            so this is also the smallest it can be without moving the copy.
          */}
          <View style={styles.leadMark}>
            <HoltMark size={44} />
          </View>
          <ChevronRightIcon size={18} color={flColor.bronze400} />
        </View>
      </Pressable>
      {/* ⚠ NO LONGER STRAIGHT TO THE PASTE SHEET. "I have a program" does not mean "I have a spreadsheet"
          — it may be on a whiteboard, in a coach's message, or in their head. Holt asks which. */}
      <Pressable
        onPress={onImport}
        accessibilityRole="button"
        accessibilityLabel="Bring a program you already have"
        style={({ pressed }) => [styles.pathCard, pressed ? styles.pathPressed : null]}
      >
        <View style={styles.pathRow}>
          <View style={styles.pathIcon}>
            <PlanSheetIcon size={22} color={flColor.gray400} />
          </View>
          <View style={styles.pathText}>
            <Text style={styles.pathCardTitle}>I&apos;ve got a program already</Text>
            <Text style={styles.pathCardSub}>Paste it in, build it here, or log it as you go.</Text>
          </View>
          <ChevronRightIcon size={18} color={flColor.gray600} />
        </View>
      </Pressable>
      <Pressable
        onPress={onFreestyle}
        accessibilityRole="button"
        accessibilityLabel="Just train today"
        style={({ pressed }) => [styles.pathCard, pressed ? styles.pathPressed : null]}
      >
        <View style={styles.pathRow}>
          <View style={styles.pathIcon}>
            <BarbellIcon size={22} color={flColor.gray400} />
          </View>
          <View style={styles.pathText}>
            <Text style={styles.pathCardTitle}>Just train today</Text>
            {/* ⚠ NOT "nothing planned" — that phrasing made the option sound like the athlete had failed
                to prepare, when choosing to train without a plan is a legitimate way to train. The tap
                opens the "What are you training?" sheet, so this is also the only door to cardio here. */}
            <Text style={styles.pathCardSub}>No plan. Just start training and log as you go.</Text>
          </View>
          <ChevronRightIcon size={18} color={flColor.gray600} />
        </View>
      </Pressable>
      {onGuided ? (
        <Pressable onPress={onGuided} accessibilityRole="button" accessibilityLabel="Browse training programs" hitSlop={8} style={styles.pathQuiet}>
          <Text style={styles.pathQuietText}>Browse training programs →</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onBrowse} accessibilityRole="button" accessibilityLabel="Browse programs" hitSlop={8} style={styles.pathQuiet}>
          <Text style={styles.pathQuietText}>Or browse everything</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  /*
   * Last week, read once on mount. ⚠ NOT on focus: `ensure_weekly_review()` generates on first call, and
   * re-running it every time the athlete returns to Home would be a write attempt per tab switch for a
   * row that changes once a week.
   */
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [reviewRetired, setReviewRetired] = useState(false);
  const { entitled: reviewEntitled } = useEntitlement('weekly_review');
  /*
   * ⚠ BOTH READS SETTLE BEFORE EITHER IS SHOWN. The retired list is device-local and resolves in a
   * millisecond, the RPC does not — so setting `weeklyReview` the moment the network answers would paint a
   * card the athlete retired last night and pull it a frame later. `Promise.all` makes the pair one fact.
   */
  useEffect(() => {
    let alive = true;
    void Promise.all([fetchWeeklyReview(), getRetiredReviewWeeks()]).then(([r, retired]) => {
      if (!alive) return;
      setReviewRetired(isWeekRetired(retired, r?.weekStart));
      setWeeklyReview(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * The card is done with — for THIS WEEK, on this device.
   *
   * ⚠ VIEWING RETIRES IT TOO, not just Skip. Reading the review is the strongest possible signal that the
   * card has done its job; leaving it up afterwards asked the athlete to dismiss something they had already
   * acted on. Skip and View differ in where they send you, not in what they mean about the card.
   */
  const retireReview = useCallback(() => {
    if (!weeklyReview) return;
    setReviewRetired(true);
    void retireReviewWeek(weeklyReview.weekStart);
  }, [weeklyReview]);

  const [friendSheetOpen, setFriendSheetOpen] = useState(false);
  /**
   * Unfinished work sitting in local storage, re-read every time Home comes into focus.
   *
   * MUST be per-focus, not once on mount. Home is a mounted tab: read a single time, it would still be
   * advertising "Continue Workout · 12 sets logged" after the athlete had finished and saved that very
   * session — an offer to resume something that no longer exists.
   *
   * The NAME and COUNT now come with it, because the card that shows this no longer necessarily has a
   * program behind it to supply them. For an athlete who never builds one, this local record is the only
   * thing that knows what they were in the middle of.
   */
  const [resume, setResume] = useState<{ name: string; exerciseCount: number; sets: number } | null>(null);
  /**
   * The local autosave read counts toward the first paint like any other, so it needs the same latch
   * `useQuery` grows for the network reads.
   *
   * Without it the hero is the one thing that could still pop AFTER the reveal: `resume` is null both
   * while the read is in flight and when there is genuinely nothing to resume, so Home would open on
   * "Train Today" and swap to "In Progress · 12 sets" a beat later — the loudest possible version of the
   * stutter, on the card the athlete is actually looking at. Only ever set true, so returning to the tab
   * cannot re-close the gate.
   */
  const [resumeSettled, setResumeSettled] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadSession().then((saved) => {
        if (!alive) return;
        const summary = resumeSummary(saved);
        setResume(summary ? { ...summary, sets: doneSetCount(saved!) } : null);
        setResumeSettled(true);
      });
      return () => {
        alive = false;
      };
    }, []),
  );
  const resumeSets = resume?.sets ?? null;

  const [elseOpen, setElseOpen] = useState(false);
  const [strengthOpen, setStrengthOpen] = useState(false);
  /**
   * The sheet has two pages: the choice, then the cardio list.
   *
   * A flat list put seven conditioning rows in front of an athlete whose most likely answer is
   * "freestyle" — the common case paying for the rare one, and the same mistake the exercise picker
   * already fixed by moving cardio BELOW the catalogue. Two taps to a rower is cheaper than seven rows
   * to a bench press.
   */
  const [elseView, setElseView] = useState<'root' | 'cardio'>('root');
  /**
   * WHICH ACTIVITY IS WAITING ON AN OUTDOOR/INDOOR ANSWER — null when nothing is.
   *
   * ══ "KIMJOVI DID A TREADMILL WALK BUT IT LOGGED AS AN OUTDOOR WALK" ══
   *
   * It was not a bug in the save; it was a default nobody was asked about. This sheet listed seven
   * activities and started each on `CARDIO_DEFAULTS[activity].modality` — outdoors for a walk — with the
   * only correction being a segmented toggle on the card, one screen later. Don't notice it and the app
   * has already decided: the name says Outdoor Walk, the card offers GPS instead of a clock, and the
   * saved bout agrees with all of it. Nothing looked wrong at any point.
   *
   * PO: *"I think ask at the door when you get to that exercise or choose that exercise."*
   *
   * ⚠ ONLY WHERE THERE IS A CHOICE. Run, walk and ride are the three `OUTDOOR_CAPABLE` activities; a
   * rower, an elliptical, a pool swim and a stair climber have exactly one honest answer, and asking
   * would be a step that cannot be got wrong — which is a step that should not exist. Those still start
   * on one tap. The same gate the card's own toggle uses, so the two cannot disagree about what is
   * askable.
   */
  const [cardioAsk, setCardioAsk] = useState<CardioActivity | null>(null);
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();
  const { requestPrompt, markAnnounced, requestTour } = useTour();
  /* Holt is mounted outside the navigator, so opening him is a context call rather than a route
     push — the sheet grows out of the bubble instead of taking Home off the screen. */
  const { open: coachOpen, openCoach } = useCoachDoor();
  // The guided tour measures Home's real cards, and four of the seven sit below the fold — so it needs the
  // scroll view itself, not just the anchors inside it.
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const { showToast } = useToast();
  // Live identity for the AppBar avatar. The artwork resolver below keeps its synchronous seed
  // profile — it must resolve the hero art on the first frame, and the art is static regardless.
  const { profile: liveProfile } = useProfile();
  // H-1 "awaiting first workout" (ONB-D17): a just-onboarded athlete (active chapter, 0 workouts) gets a
  // purpose-built hero instead of the static content, so a fresh user never lands on stale/blank Home.
  const {
    data: awaiting,
    refetch: refetchAwaiting,
    loading: awaitingLoading,
    settled: awaitingSettled,
  } = useQuery(fetchAwaitingChapter, []);
  const { data: homeChapter, settled: chapterSettled } = useQuery(fetchHomeChapter, []);
  // The athlete's saved programs — if any, Home reflects them instead of the empty first-program card.
  const { data: myPrograms, refetch: refetchPrograms, settled: programsSettled } = useQuery(fetchMyPrograms, []);
  // How far into the built program the athlete is, so Home previews the NEXT session rather than always
  // day 1 — and so the card matches the session the workout screen will actually open.
  /*
   * The ACTIVE program anchors Home, then a PLANNED one. Picking `[0]` alone meant starting an older
   * program changed nothing here — Home kept showing whichever was created last.
   *
   * A SEALED PROGRAM IS NOT A WORKOUT TO OFFER. The fallback used to be `myPrograms[0]` — newest-first,
   * which after a graduation is the program that just finished. Home would then advertise Day A of a
   * completed program (`nextSession` returns null, so the card falls back to the first built day), and
   * tapping it dropped the athlete into an empty session attributed to nothing. Latent while nothing
   * could graduate; the normal ending the moment something could.
   */
  /*
   * ══ A PLANNED PROGRAM IS NOT A PROGRAM YOU ARE ON ══
   *
   * Only an ACTIVE program may hand Home a session. The fallback here used to reach for a `future` one
   * too, which meant the mere existence of a planned program turned Home into the enrolled Home — hero
   * showing its Day A, "Continue Training" offering it — for somebody who had never pressed Start. There
   * is no visual difference between that and being enrolled, because being enrolled is what it renders.
   *
   * It is the same defect already fixed twice in this file and once on Workouts: Home asserting a program
   * relationship the athlete never entered. With no active program the hero falls to `open`, whose button
   * IS the freestyle choice — the honest offer when nothing is running.
   *
   * The planned program is NOT hidden. It still names the Current Program tile and still links there, so
   * Start is one tap away; it simply stops pretending to be underway.
   */
  const { active: activeProgram, anchor: anchorProgram } = selectHomePrograms(myPrograms);
  const builtId = anchorProgram?.id ?? null;
  /*
   * WHICH sessions are accounted for, not merely HOW MANY (0119). The count it used to fetch could only
   * describe a program done strictly in order; with swapping and skipping it would offer the wrong
   * session the moment one was done out of turn.
   */
  /*
   * ⚠ EVERY program's marks, in ONE read that depends on nothing — not `fetchProgramSessions(builtId)`.
   *
   * That call took the id out of `fetchMyPrograms`, so the two were strictly sequential: a round trip to
   * learn which program, then a round trip to ask about it. Every other read on this screen starts at
   * mount and runs alongside the rest; this one could not start until another had finished, and it now
   * decides when the whole screen appears. It was also a lie to the gate below — with `builtId` still
   * null it resolved INSTANTLY with `[]`, reporting itself settled before it had asked anything.
   *
   * `fetchAllProgramSessions` returns the same rows grouped by program (RLS already scoped them to this
   * athlete), so the lookup is local and the fetch is parallel. See its own note.
   */
  const { data: allMarks, refetch: refetchBuiltDone, settled: marksSettled } = useQuery(fetchAllProgramSessions, []);
  const builtMarks = useMemo<SessionMark[]>(() => (builtId ? (allMarks?.[builtId] ?? []) : []), [allMarks, builtId]);
  // Opt-in Home experience-level LENS (local only, ONB-Amendment-002) — undefined = loading, null = not
  // chosen (show the question), a level = show the suggested starting program. No DB write; re-askable.
  const { data: homeLevel, refetch: refetchLevel, settled: levelSettled } = useQuery(getHomeLevel, []);
  // How they answered the starting-point question, if they have. Local; see `program-intent.ts`.
  /* The athlete's unit. Volume is stored canonical pounds everywhere in this app and converted at the
     moment of drawing — a friend's session on the circle row is no exception. */
  const { units } = useUnits();
  const { data: startChoice, refetch: refetchStartChoice, settled: startChoiceSettled } = useQuery(getStartChoice, []);
  // Goals + equipment intake (local only) — feeds the recommendation on the suggested face.
  const { data: homeIntake, refetch: refetchIntake, settled: intakeSettled } = useQuery(getHomeIntake, []);
  const { data: homeGymData, refetch: refetchHomeGym, settled: homeGymSettled } = useQuery(fetchHomeGym, []);
  /* Your Circle's friend row, real since 0074 — the newest post from anyone the athlete is connected to.
     One ROW, not the feed: this is a doorway, and `/friends` is the room. Live presence is NOT read
     because there is nothing to read — an in-progress workout lives in a client-side session, not a
     table, so no athlete can observe another training. The fixture that claimed two squad-mates were
     mid-workout is retired rather than reproduced.

     ⚠ IT FETCHES TEN AND SHOWS ONE. It used to fetch exactly one and then filter it — for not being the
     athlete's own, and for having something to say — so the row went blank whenever the newest post in
     the whole feed failed either test. A card reporting an empty circle because of what the athlete
     themselves had just posted. Ten is a doorway's worth of looking, not a second feed. */
  const { data: circlePosts, settled: circleSettled } = useQuery(() => fetchFriendsFeed(10), []);
  /* The Competitions badge, real. It also advances any due challenge lifecycle transitions — there is no
     scheduler, so a season closes when someone opens a screen that reads it, and Home is the screen
     opened most. The badge is the cheap part; keeping every squad's competitions honest is the point. */
  const { data: challengeHub, settled: challengeSettled } = useQuery(fetchChallengeHub, []);
  /* Who from the circle is mid-workout (0086). Squad-mates outrank friends, and each athlete's own
     `visibility.training` audience decides whether they appear at all — "Only me" is the off switch. */
  const { data: trainingNow, settled: trainingNowSettled } = useQuery(fetchTrainingNow, []);
  const live = useMemo(() => trainingNow ?? [], [trainingNow]);
  /* Whether they have anyone at all, which an empty feed cannot tell us — "nobody posted" and "nobody to
     post" look identical from the posts alone, and they want opposite advice. */
  /* The one-off built in advance (0136). Its own read rather than part of `fetchHomeData` so an
     unapplied migration costs the hero its planned face and nothing else. */
  const { data: planned, refetch: refetchPlanned, settled: plannedSettled } = useQuery(fetchPlannedWorkout, []);
  const { data: friendLists, settled: friendListsSettled } = useQuery(fetchFriendLists, []);
  const hasCircle = (friendLists?.friends.length ?? 0) > 0 || live.length > 0;
  /*
   * ⚠ A POST NO LONGER HAS TO CARRY WORDS TO REACH THIS CARD.
   *
   * PO: *"Moses posted his workout. It showed up when I clicked see your circle, but shouldn't it show up
   * in that card on the Home Screen?"* It should. The old rule demanded a non-empty `body` and rendered
   * it italic, so the row could only ever hold somebody's SENTENCE — and a shared workout has none unless
   * a note was written. `circleActivity` lets a session describe itself instead, and marks the difference
   * so a derived line is not dressed as a quotation. See `domain/home/circle-activity`.
   */
  const circleRow = useMemo(
    () => circleActivityFor(circlePosts ?? [], (lb) => displayWeight(lb, units)),
    [circlePosts, units],
  );
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
      refetchPlanned(); // built one for later, or just trained the one that was waiting
    }, [refetchAwaiting, refetchPrograms, refetchIntake, refetchBuiltDone, refetchPlanned]),
  );

  // The program that anchors Home's "Today's Workout" + "Current Program" slots. Precedence:
  //   built program (myPrograms[0]) → the fresh athlete's chosen suggestion → the demo active program.
  // Progress is 0/total (no athlete-progress backend); a built program has no catalog artwork, so the
  // resolver reads its exercises' composition (program=null) and degrades to the split/neutral art.
  const { home, plannedDay } = useMemo(() => {
    // The tile names and counts the anchor (planned included); only an ACTIVE one yields a session.
    const built = anchorProgram;
    const offersSession = activeProgram != null;

    let program: Program | null = null;
    let workout: Workout | null = null;
    /**
     * The planned day as AUTHORED — full prescriptions, not the resolver's flattened shape.
     *
     * `workout.exercises` below keeps only `catalogKey` + `workingSets`, because that is all the artwork
     * resolver needs. The preview needs what the athlete is actually being asked for — reps, ranges,
     * per-side, ladders, circuit membership — so it reads the day itself rather than the summary.
     */
    let day2: ProgramDay | null = null;
    let name = '';
    let completed = 0;
    let total = 0;

    if (built) {
      // The NEXT unfinished session, not always the first — otherwise Home would keep offering Day A
      // forever while the program's progress moved on beneath it.
      const done = builtMarks.length;
      const next = nextOpenSlot(built.structure, builtMarks);
      const day = next?.day ?? built.structure.days.find((d) => d.main.length > 0) ?? built.structure.days[0] ?? null;
      // A planned program contributes its NAME and its 0-of-N, never a session — `hasProgramSession`
      // is what promotes the hero to a program day, and it must stay false until Start is pressed.
      day2 = offersSession ? day : null;
      workout = offersSession && day
        ? {
            name: day.name.trim() || `Day ${day.letter}`,
            /*
              NO `focus`. It was `day.name` — the same string as `name` — so the hero drew "Squat & Sled"
              and then "Squat & Sled" again beneath it, and the preview sheet inherited the duplicate
              under its own title. `focus` is a SUBTITLE: it earns its line by saying something the title
              does not ("Nothing planned. Build it as you go." on the open face does). A program day has
              nothing else to say here — the day's shape is what the meta line below is for.

              The definition's own `split` ("legs") and `modality` ("strength") would be a real subtitle,
              but `ProgramDay` carries neither: `adopt-core` drops them at `workoutToDay`, and every
              already-adopted program's stored `structure` is missing them too. That is a plumbing change
              of its own, not a rename here.
            */
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

    return { home: { workout, resolved, name, completed, total }, plannedDay: day2 };
  }, [anchorProgram, activeProgram, builtMarks, awaiting, homeLevel, homeIntake, liveProfile?.sex]);

  // The Mission tile shows the REAL chapter goal now (0025), not the HOME_DATA placeholder. Primary
  // preferred, else the newest goal; count = goals still in progress. No goals → an invite to set one.
  const { data: goalData, settled: goalsSettled } = useQuery(fetchActiveChapterGoals, []);
  const goalList = goalData?.goals ?? [];
  const { primary: primaryGoal, active: activeGoals } = goalSections(goalList);
  const missionTarget = (primaryGoal ?? activeGoals[0])?.name ?? 'Set a chapter goal';
  const goalsRemaining = goalList.filter((g) => g.achievedAt == null).length;

  /**
   * The three doors off the starting-point chooser. Each RECORDS the choice before navigating.
   *
   * Walking through a door is the answer to "How do you want to start?" — so Home stops asking from that
   * moment, not from the moment a workout is finally saved. Waiting for the save meant an athlete could
   * be looking at their own half-logged session with the question still printed underneath it.
   *
   * `chooseStart` is called from the chooser only. The same two handlers are reused elsewhere on Home
   * (the quiet program link, the suggestion card's "Explore") where there is no question to answer, so
   * those pass the raw navigation and record nothing.
   */
  const chooseStart = (choice: StartChoice, go: () => void) => {
    void setStartChoice(choice).finally(refetchStartChoice);
    go();
  };
  const openPrograms = () => router.push('/workouts');
  const openBuilder = () => router.push('/program-builder');
  /*
   * ⚠ THE SUGGESTION CARD'S EXIT, NOT HOME'S DOOR — and the two are deliberately different.
   *
   * By the time somebody is looking at a recommendation they did not want, "bring your own" means the
   * fastest route in, which is the paste sheet. On the CHOOSER, the same words mean something vaguer:
   * *"I have a program"* does not say whether it is a spreadsheet, a whiteboard or a memory. That door
   * opens Holt, who asks which — see `onImport` on the chooser.
   */
  const openImport = () => router.push('/program-builder?o=import');
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
    } catch (e) {
      /*
       * ⚠ STAYING PUT IS RIGHT. SAYING NOTHING IS NOT.
       *
       * Leaving them on the suggestion rather than dropping them somewhere unexplained is the correct
       * call — but with no message the screen simply did not react to a tap, which reads as a dead
       * button on the day-one onramp, the first thing a new athlete ever presses.
       */
      showToast(errorMessage(e) || 'Couldn’t start that program — check your connection and try again.');
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
  const startFreestyleFromHome = () => {
    setElseView('root'); // never reopen mid-drill: the sheet always starts at the question it asks
    setElseOpen(true);
  };
  const closeElse = () => {
    setElseOpen(false);
    setElseView('root');
    setCardioAsk(null);
  };

  /**
   * "Strength" from the What-are-you-training sheet opens the CHOOSER, not an empty session.
   *
   * Build-as-you-go is one of three legitimate answers (`Forge Strength Start.dc.html`) and Home was
   * applying it as though it were the only one — so a template the athlete had saved was reachable
   * from Home only by remembering that Workouts → Templates exists.
   */
  const chooseStrengthFromHome = () => {
    closeElse();
    setStrengthOpen(true);
  };

  /** …and this is what the third option does once it has actually been chosen. */
  /**
   * Start the workout they built earlier, and consume it — it was an intention for ONE session.
   *
   * Cleared fire-and-forget: a delete that fails leaves a card offering a session already under way,
   * which the resume face covers on the next read, while blocking the start on it would strand the
   * athlete at the door of their own workout.
   */
  const startPlannedWorkout = async () => {
    if (!planned) return;
    await writeWorkoutLaunch({ exercises: planned.exercises, workoutName: planned.name });
    void clearPlannedWorkout().then(refetchPlanned);
    router.push('/workout');
  };

  /** Home's quiet second door — the builder, in one-off mode rather than authoring a template. */
  const buildForLater = () => {
    closeElse();
    router.push({ pathname: '/workout-builder', params: { for: 'later' } });
  };

  const buildAsYouGo = async () => {
    setStrengthOpen(false);
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
  /**
   * Tapping an activity. Where the answer is genuinely open, this ASKS; where it is not, it starts.
   *
   * ⚠ THE DEFAULT USED TO BE THE ANSWER. This read `CARDIO_DEFAULTS[activity].modality` and went, on the
   * reasoning that "the toggle lives on the card, where it belongs — the athlete decides on the day".
   * The toggle does belong there and still is there; what was wrong is that a silent guess stood in
   * until it was touched, and a tester's treadmill walk was filed as an outdoor one because nothing ever
   * put the question. See `cardioAsk`.
   */
  const pickCardio = (activity: CardioActivity) => {
    if (OUTDOOR_CAPABLE[activity]) return setCardioAsk(activity);
    return void startCardio(activity, CARDIO_DEFAULTS[activity].modality);
  };

  const startCardio = async (activity: CardioActivity, modality: Modality) => {
    closeElse();
    await writeWorkoutLaunch({ conditioning: { activity, modality } });
    startWorkout(deriveName(activity, modality), []);
    router.push('/workout');
  };

  /**
   * Continue: straight into the logger, writing NO launch intent.
   *
   * That absence is the whole point. `startHomeWorkout` writes one, and the logger reads a launch
   * arriving on top of unfinished work as a conflict — "resume it, or start what you just picked?" —
   * which is an incoherent question to ask somebody who just pressed Continue. With no intent the
   * logger shows its plain "Resume where you left off?" card, which also still offers to discard.
   */
  const continueWorkout = () => router.push('/workout');

  /**
   * Looking at the day is not committing to it.
   *
   * The preview deliberately does NOT call `writeWorkoutLaunch` or touch the session — opening it leaves
   * no trace, and Start from inside it runs the identical `startHomeWorkout` the card's own button does.
   * One start path, so the preview can never become a second way to begin a workout that behaves subtly
   * differently from the first.
   */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapBusy, setSwapBusy] = useState(false);

  /** The session Home is offering — the one a swap moves. */
  const nextSlot = useMemo(
    () => (anchorProgram && activeProgram ? nextOpenSlot(anchorProgram.structure, builtMarks) : null),
    [anchorProgram, activeProgram, builtMarks],
  );

  /**
   * What the offered workout can trade places with: the OUTSTANDING workouts in its OWN week.
   *
   * The week is the unit an athlete reorders within — the rack is busy today, so do the pull day now and
   * squat later this week. Reaching across weeks would be rescheduling the program, which is a different
   * question and nobody asked it.
   *
   * ⚠ Outstanding only. A trained or skipped session has a `program_sessions` row keyed by its POSITION,
   * so moving it would leave that record pointing at a different workout and the app would claim a
   * session nobody did. Its own position is excluded too — swapping a thing with itself is not a choice.
   */
  const swapOptions = useMemo<SwapOption[]>(() => {
    if (!anchorProgram || !activeProgram || !nextSlot) return [];
    const touched = new Set(builtMarks.filter((m) => m.weekIndex === nextSlot.weekIndex).map((m) => m.dayIndex));
    return trainingDays(plannedDays(anchorProgram.structure, nextSlot.weekIndex))
      .map((d, di) => ({ d, di }))
      .filter(({ di }) => di !== nextSlot.dayIndex && !touched.has(di))
      .map(({ d, di }) => ({ dayIndex: di, name: dayLabel(d, di), position: di + 1 }));
  }, [anchorProgram, activeProgram, nextSlot, builtMarks]);

  /** Trade the offered workout with the chosen one; the hero then re-resolves from the saved order. */
  const swapFromHome = async (dayIndex: number) => {
    if (!anchorProgram || !nextSlot || swapBusy) return;
    setSwapBusy(true);
    try {
      const next = swapSessionOrder(anchorProgram.structure, nextSlot.weekIndex, nextSlot.dayIndex, dayIndex);
      await updateProgram(anchorProgram.id, next);
      setSwapOpen(false);
      // Re-read rather than patch a local copy: the hero, the preview and the progress tile all rebuild
      // from what was actually saved, so none of them can drift from the plan on the server.
      await refetchPrograms();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSwapBusy(false);
    }
  };

  /*
    SKIPPING A SESSION IS NO LONGER OFFERED FROM HOME.

    The preview sheet used to carry "Skip this one" beside Start, and Home carried the `nextSlot` memo and
    a `skipFromHome` helper to serve it. Skipping WRITES to the program's schedule — it marks the session
    passed and carries the athlete a session further along the program — which is not a decision an
    inspection sheet should offer as a peer of "Start Workout". It moved to Program Detail, which lists
    every outstanding session with its own Train and Skip and is where "Choose another workout" now lands.
  */

  const startHomeWorkout = async () => {
    const w = home.workout;
    if (!w) return;
    // The ACTIVE program's id, never the anchor's: a workout must not be attributed to a program the
    // athlete has not started, or its progress would advance before it began.
    if (activeProgram) await writeWorkoutLaunch({ programId: activeProgram.id });
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

  /**
   * THE HOME GATE IS GONE. Full Home from the very first launch — chapter, circle, quick actions and all —
   * with the starting-point question living IN it rather than INSTEAD of it.
   *
   * This is Onboarding-Amendment-002 finally being applied, not a new direction. Its own origin section
   * names the behaviour that was here as the defect it was written to remove: *"First Home is a pure program
   * funnel — the awaiting-first-workout Home surfaces only a program card and omits every social/explore
   * surface, so a new athlete dead-ends at 'start a workout'."* ONB-D13 is blunter still: the recommendation
   * is **"an offer, never a gate."** A full-screen takeover that will not let you past until you answer is a
   * gate however gently it asks.
   *
   * So these three are no longer branches AROUND Home. They are the states of one slot ON it, sitting where
   * the Program | Mission grid will eventually go. The first-workout ceremony (ONB-D18) is untouched — it
   * lives in the workout-complete flow and never had anything to do with this.
   *
   * ══ AND THE SLOT IS FOR ARRIVING, NOT FOR LACKING ══
   *
   * It used to draw for anyone without a program, which meant an athlete who trains day to day and will
   * never build one read **"You don't have a program yet"** on every launch of their lives. `awaiting` goes
   * false the moment they log a session, so there was no exit from that sentence except to build a program
   * they didn't want. That is the literal message `Home-Screen-Wireframe-Spec-H1.md` §6 forbids — *"No
   * placeholder. No 'no program' message."* — on a screen whose own failure list ends with *"the screen
   * communicates what the athlete has NOT done."*
   *
   * The question is now asked once, on arrival, and never again. Everyone past it gets the Tier 3 Workout
   * CTA the same spec marks **Always** present and never disabled.
   */
  /**
   * Whether the guided on-ramp is offered at all — false while the catalog cannot answer the questions
   * the intake asks (`canRecommend`). Derived from the authored programs, so it turns itself back on.
   *
   * It also gates `hasSuggestion` below, so an athlete carrying a level in local storage from before this
   * turned off is not left looking at a recommendation by a path nobody can reach. Nothing is cleared —
   * their answers are still there when the on-ramp comes back.
   */
  const guidedOnRamp = catalogCanRecommend();
  /** Null until they pick a door. Local: it decides what to draw now, not anything worth persisting. */
  const [path, setPath] = useState<'guided' | null>(null);
  /**
   * Intake answered, but nothing chosen yet — show the recommendation and let the athlete decide.
   * This step existed on the card (`mode="suggested"`) but was never rendered: finishing the intake
   * dropped straight through to the full Home with a program silently assigned, so the athlete never
   * saw what was picked for them or had any say in it.
   */
  const hasSuggestion = !hasProgram && homeLevel != null && guidedOnRamp;

  /**
   * WHAT HOME DRAWS — one call, so the rules can be read and tested in one place (`src/domain/home`).
   *
   * `awaitingLoading` matters more than it looks: `useQuery` starts at `data: null`, so `awaiting` reads
   * false for a frame on every cold load. Passing it through means Home says nothing about the athlete
   * until it knows something, instead of flashing a claim it then takes back.
   */
  /*
   * ⚠ HOLT CAN ANSWER HOME'S OWN QUESTION, SO HOME HAS TO LOOK AGAIN WHEN HE CLOSES.
   *
   * The sheet is an OVERLAY, not a route — Home never loses focus while it is up, so the focus effect
   * that refreshes everything else never runs for it. And Holt now writes a start choice: "I'll log as I
   * go" records `freestyle`. Without this, the athlete answered the question and watched the same chooser
   * sit there behind him, which is the defect this closes.
   *
   * Keyed on the door SHUTTING rather than on every render, and `refetch` is idempotent, so a close that
   * changed nothing costs one cheap read.
   */
  const coachWasOpen = useRef(false);
  useEffect(() => {
    if (coachOpen) {
      coachWasOpen.current = true;
      return;
    }
    if (!coachWasOpen.current) return;
    coachWasOpen.current = false;
    refetchStartChoice();
  }, [coachOpen, refetchStartChoice]);

  const composition = composeHome({
    chapterLoading: awaitingLoading,
    awaiting: !!awaiting,
    startChosen: startChoice != null,
    hasProgram,
    hasProgramSession: home.workout != null,
    hasPlannedWorkout: planned != null,
    resumeSets,
    guidedOnRamp,
    hasSuggestion,
    guidedPathOpen: path === 'guided',
  });
  /**
   * The hero's three faces, resolved to one set of props. Null = nothing to say yet (the loading frame).
   *
   *   resume  — unfinished work in local storage. It is named and counted from the SESSION, because the
   *             athlete showing this card may have no program to name it for them. This face was
   *             unreachable for them before: `resumeSets` was computed and had no card to live in.
   *   program — the planned next session. Unchanged.
   *   open    — no program, nothing planned. "Train Today", and the button opens the same "What are you
   *             training?" sheet that IS the spec's W-8 Activity Type Picker.
   *
   * `open` passes no `exerciseCount` — there is nothing to count, and "0 Exercises" is not that fact but
   * a confident claim of emptiness.
   */
  const hero: {
    eyebrow?: string;
    title: string;
    focus?: string;
    exerciseCount?: number;
    onStart: () => void;
    resumeSets: number | null;
  } | null =
    composition.hero === 'resume'
      ? {
          eyebrow: 'In Progress',
          title: resume?.name || 'Your workout',
          exerciseCount: resume?.exerciseCount,
          onStart: continueWorkout,
          resumeSets,
        }
      : composition.hero === 'planned'
        ? {
            eyebrow: 'Built for later',
            title: planned?.name || 'Your workout',
            focus: 'Waiting for you. Start when you are ready.',
            exerciseCount: planned?.exercises.length ?? 0,
            onStart: startPlannedWorkout,
            resumeSets: null,
          }
        : composition.hero === 'open'
          ? {
              eyebrow: 'Today',
              title: 'Train Today',
              focus: 'Nothing planned. Build it as you go.',
              onStart: startFreestyleFromHome,
              resumeSets: null,
            }
        : composition.hero === 'program' && home.workout
          ? {
              title: home.workout.name,
              focus: home.workout.focus,
              exerciseCount: home.workout.exerciseCount ?? home.workout.exercises?.length ?? 0,
              onStart: startHomeWorkout,
              resumeSets: null,
            }
          : null;

  // A real "first move" — the athlete has built OR chosen a program (the unlock ceremony's trigger).
  //
  // This used to also accept `homeLevel != null`, which is only "they answered the experience question".
  // So the ceremony fired the moment the intake finished — while the athlete was still looking at the
  // suggestion, before they had picked anything. A program, and nothing less, is the first move.
  const hasProgramSignal = hasProgram;

  /**
   * ══ ONE OPEN, NOT FOURTEEN ══
   *
   * Home makes fourteen reads and every section used to draw the instant its OWN read landed — so the
   * chapter block appeared, then the hero, then the mission tile, then Your Circle, then a badge on the
   * quick actions, each shoving the next one down the screen. The PO's words for it: the home screen
   * "doesn't all load at once… I see it all get pieced together."
   *
   * So the whole screen waits, and then arrives. Every first-paint read is listed here — there is no
   * defensible subset, because any read left out is a section that appears after the rest, which is the
   * defect itself. `HOME_READY_CEILING_MS` is what stops one slow read holding the rest hostage; the
   * rule and its reasoning live in `domain/home/composition.ts` where they can be tested, and
   * `app/__tests__/home-first-paint.test.mjs` fails if a fifteenth read is ever added without one.
   *
   * ⚠ NOTHING HERE IS ALLOWED TO GO BACKWARDS. Every flag is latched — `useQuery().settled` stays true
   * through a refetch, `resumeSettled` is only ever set true, and the ceiling only ever fires. Home
   * refetches five of these on every focus, so a gate that could re-close would black the screen out
   * each time the athlete came back from another tab: a worse stutter than the one being fixed.
   *
   * ⚠ IT SITS ABOVE THE TOUR AND THE CEREMONY BECAUSE BOTH NOW READ IT. Everything below this point
   * that can draw over Home has to know whether Home is visible yet — being focused stopped meaning
   * being seen the moment the screen started holding its first paint.
   */
  const [ceilingReached, setCeilingReached] = useState(false);
  useEffect(() => {
    // setState from a timer callback, never from the effect body — the react-compiler lint errors on the
    // latter, and a sync set here would cascade a render on every mount.
    const t = setTimeout(() => setCeilingReached(true), HOME_READY_CEILING_MS);
    return () => clearTimeout(t);
  }, []);
  const ready = isHomeReady(
    [
      awaitingSettled, // chapter block, Explore Forge, and which face the hero wears
      chapterSettled, // the chapter's number, name and week/day
      programsSettled, // hero + Current Program tile
      marksSettled, // WHICH session of the program the hero offers
      plannedSettled, // the one-off built for later (0136)
      resumeSettled, // unfinished work in local storage — the loudest pop of the lot
      levelSettled, // ┐
      startChoiceSettled, // ├ the starting-point slot: chooser / intake / suggestion
      intakeSettled, // │
      homeGymSettled, // ┘
      goalsSettled, // the Mission tile
      circleSettled, // ┐
      friendListsSettled, // ├ Your Circle
      trainingNowSettled, // ┘ (also the Quick Actions "training now" count)
      challengeSettled, // the Competitions badge — two round trips deep, so usually the last one in
    ],
    ceilingReached,
  );

  /*
   * The two moments the guided tour hangs off, both reported from here because Home is the only screen that
   * knows which of its two faces is up (Onboarding-Amendment-003).
   *
   * FIRST-RUN → the four-pillar tabs leg. Reported only while the athlete has just arrived, has touched
   * nothing, and the screen in front of them is one card. That is the moment a map of the app is worth
   * having and costs nothing. An athlete who skips past it simply keeps the leg owed — the planner chains
   * it ahead of the Home leg later.
   *
   * SETTLED → the spotlight walkthrough of the real cards, plus (once a program exists) the "Legacy
   * Unlocked" ceremony that hands into it.
   *
   * ══ SETTLED IS NOT "HAS A PROGRAM", AND THAT WAS THE BUG ══
   *
   * This reported `has-program` / `no-program`, and the provider owed the Home leg only for the first. So
   * the athlete who trains day to day and never builds a program was never, ever shown around the screen
   * they open every morning — the same "forever" defect as the copy above, in a second place. The Home leg
   * only ever needed cards to ring, and a settled Home now draws six of the seven it wants; the planner
   * already drops the seventh (Current Program) because its anchor isn't mounted.
   */
  /*
   * ⚠ GATED ON `ready`, NOT ON `awaitingLoading`, and the difference is the whole point now that Home
   * holds its first paint. `awaitingLoading` goes false as soon as ONE read lands, which is well before
   * the screen is visible — and `TourOverlay` is mounted by `AppTabs`, a sibling ABOVE the tab slot, so
   * it draws over Home and over Home's cover alike. The tour would have spotlit real, measured,
   * correctly-positioned cards that the athlete could not see, on a splash.
   *
   * Strictly stronger than the old guard: `ready` cannot be true unless the awaiting read has settled.
   */
  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      requestTour(hasProgram || !awaiting ? 'settled' : 'first-run');
      if (hasProgramSignal) requestPrompt();
    }, [ready, awaiting, hasProgram, hasProgramSignal, requestPrompt, requestTour]),
  );

  /**
   * The reveal. The real screen is mounted and laid out the whole time UNDERNEATH this cover — so when
   * it lifts there is nothing left to measure, position or reflow, which is the difference between a
   * screen appearing and a screen assembling.
   *
   * It fades rather than cuts because the cover and the screen are different pictures; 240ms is long
   * enough not to snap and short enough not to feel like waiting a second time.
   *
   * Kept mounted at opacity 0 rather than unmounted: the alternative needs a worklet callback to flip a
   * state on the JS thread just to drop one `<Image>`, and it can only ever run once per launch anyway.
   * `pointerEvents` is derived from `ready`, so the moment the screen is real it is also tappable.
   */
  const coverOpacity = useSharedValue(1);
  useEffect(() => {
    if (ready) coverOpacity.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.ease) });
  }, [ready, coverOpacity]);
  const coverStyle = useAnimatedStyle(() => ({ opacity: coverOpacity.value }));

  /*
   * Rank-ups and honours announce themselves on whichever main tab the athlete reaches first, so a day
   * that never touches Legacy is not a day the moment is lost. Throttled and idempotent — see the hook.
   * The active workout is a pushed route, so it can never be interrupted by one.
   *
   * ⚠ HELD UNTIL HOME IS ACTUALLY VISIBLE, and it lives down here rather than at the top of the
   * component for exactly that reason — `ready` is not known until every read above has reported in.
   * A ceremony is rendered by `CeremonyProvider` at the ROOT, which is above Home and therefore above
   * Home's own cover: unheld, a promotion earned on the last session would play its full-screen moment
   * over the splash, on the one launch it most needed to be seen.
   */
  useEarnedMoments({ enabled: ready });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />

      <AppBar
        title="Forge Legacy"
        actions={<NotificationBell />}
        avatar={<Avatar name={liveProfile?.name ?? ''} src={liveProfile?.avatarUrl ?? undefined} size="appBar" />}
        onAvatar={() => router.push('/account-settings')}
      />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TourAnchor id="chapter">
          <ChapterTitleBlock
            chapterNumber={chapter.number}
            chapterName={chapter.name}
            weekDay={chapter.weekDay}
            principle={todaysPrinciple()}
            showRankMedallion={false}
          />
        </TourAnchor>

        <View style={styles.content}>
          {/*
            THE WORKOUT CTA — H-1 Tier 3, "Always present. Never disabled. One button."

            Phase B.1: the built / chosen / demo program feeds the EXISTING slots — this hero and the
            Current Program tile — not a separate card. What's new is that the hero no longer REQUIRES a
            program to exist. It wears three faces, and `composeHome` decides which:

              resume  — unfinished work in local storage. Outranks a program day on purpose: the logger
                        reads a launch intent landing on top of logged work as a conflict and asks about
                        it, so proposing the program day here would walk the athlete into a question they
                        never asked. It is also the face that was UNREACHABLE for anyone without a
                        program — `resumeSets` was computed and then had no card to live in.
              program — the planned next session. Unchanged.
              open    — no program, nothing planned: "Train Today", and the button opens the same
                        "What are you training?" sheet that IS the spec's W-8 Activity Type Picker.

            The `open` face passes no `exerciseCount` (there is nothing to count and "0 Exercises" would be
            a confident false claim) and no `onFreestyle` (its button already asks that question).
          */}
          {hero ? (
            <TourAnchor id="todays-workout">
              <TodaysWorkoutCard
                resolved={home.resolved}
                eyebrow={hero.eyebrow}
                title={hero.title}
                focus={hero.focus}
                exerciseCount={hero.exerciseCount}
                onStart={hero.onStart}
                resumeSets={hero.resumeSets}
                /* Preview is offered ONLY when there is an authored day to show. The `resume` face has a
                   session in progress (the logger itself is the view of it) and the `open` face has
                   nothing planned at all — a preview of neither would be a button onto an empty list. */
                onPreview={composition.hero === 'program' && plannedDay ? () => setPreviewOpen(true) : undefined}
                onFreestyle={composition.heroOffersFreestyle ? startFreestyleFromHome : undefined}
                /* Only the `open` face renames its button and offers the builder: with nothing planned,
                   "Start Workout" claimed a workout that did not exist, and this is the one state where
                   planning one in advance is the obvious second thing to want. */
                startLabel={composition.hero === 'open' ? 'Start Freestyle Workout' : undefined}
                onBuildLater={composition.hero === 'open' ? buildForLater : undefined}
              />
            </TourAnchor>
          ) : null}

          {/*
            THE STARTING-POINT SLOT — where the gate used to be a screen.

            Three states of one card, sitting exactly where the Program | Mission grid will go once there
            IS a program. Everything around it — chapter, circle, quick actions, Explore Forge — is on
            screen the whole time, which is the point: the question is an offer beside the app, not a door
            in front of it (ONB-D13, "an offer, never a gate").

            IT IS ASKED ON ARRIVAL AND NEVER AGAIN. It used to draw for anyone without a program, so the
            athlete who trains day to day and never wants one read "You don't have a program yet" on every
            launch, permanently. They now get the Workout CTA above instead, which is what H-1 always said
            they should have. "Or just train today" stays under the chooser — the answer to "how do you want
            to start" is allowed to be "I don't" — EXCEPT where the chooser has already promoted freestyle
            into the card slot (no guided on-ramp), because the same action twice on one card is not two
            choices.
          */}
          {composition.startingPoint !== 'none' ? (
            <>
              {composition.startingPoint === 'suggestion' ? (
                // Answered the questions — show WHAT was picked and why, with a real choice about it.
                <ExperienceLevelCard
                  mode="suggested"
                  level={homeLevel!}
                  intake={homeIntake ?? null}
                  homeGym={homeGymData ?? null}
                  onStart={(programId) => void acceptSuggestion(programId)}
                  onExplore={openPrograms}
                  onChange={changeIntake}
                  onCoach={() => openCoach('build')}
                  onImport={openImport}
                />
              ) : composition.startingPoint === 'intake' ? (
                // Chose "Help me find one" — the intake stepper (level → goals → equipment), inline.
                <ExperienceLevelCard mode="collect" onComplete={completeIntake} onBuild={openBuilder} />
              ) : (
                /* Only ever seen on arrival now, so the title no longer has a second, sadder variant for
                   the athlete who had simply been here a while. */
                <ProgramPathChooser
                  title="How do you want to start?"
                  /* ⚠ RECORDS NOTHING, for the same reason "Help me find one" does not: it opens a
                     conversation that ends in a program, and settling the slot on the way in would take
                     the question away from an athlete who then closed the sheet without building. */
                  onCoach={() => openCoach('build')}
                  /* "Help me find one" records nothing — it opens a stepper that lives on this same slot
                     and ends in a program. The other three are exits, and an exit is an answer. */
                  onGuided={guidedOnRamp ? () => setPath('guided') : undefined}
                  onImport={() => openCoach('import')}
                  onBuild={() => chooseStart('build_own', openBuilder)}
                  onBrowse={() => chooseStart('browse', openPrograms)}
                  onFreestyle={() => chooseStart('freestyle', startFreestyleFromHome)}
                />
              )}
              {composition.showQuietFreestyle ? (
                <Pressable
                  onPress={() => chooseStart('freestyle', startFreestyleFromHome)}
                  accessibilityRole="button"
                  accessibilityLabel="Start a workout without a program"
                  hitSlop={8}
                  style={styles.pathQuiet}
                >
                  <Text style={styles.pathQuietText}>Or just train today</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {/* THE MISSION TILE IS NOT THE PROGRAM'S. It reads live chapter goals and always did — but this
              grid was guarded on the program's NAME, so an athlete without a program silently lost their
              goal too. One `&&` over two tiles. The program half is now optional and Mission stands alone
              (full width) when there is no program to sit beside. */}
          {composition.showMissionTile ? (
            <ProgramMissionGrid
              programName={composition.showProgramTile ? home.name : undefined}
              // The tile names the ANCHOR, which falls back to a planned program so Start stays one tap
              // away. Saying "Current Program" over one nobody pressed Start on is the same claim
              // `selectHomePrograms` already refuses to let the hero make.
              programPlanned={!activeProgram && anchorProgram?.state === 'future'}
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
              programAnchor="current-program"
              missionAnchor="mission"
            />
          ) : null}


          {/*
            ══ YOUR WEEK, FROM HOLT ══

            PO: *"the review should appear on the Home screen the next time they open it and the review
            is ready. Should be a card that they can view review or skip."*

            ⚠ THIS IS ALSO THE DELIVERY MECHANISM, not just a nice placement. The review generates
            LAZILY — `ensure_weekly_review()` writes the row the first time the athlete opens the app in
            a new week — so by the time it exists they are already here and a push has nothing to
            announce. A Home card needs no notification permission, no token and no scheduler.

            ⚠ IT SITS BELOW THE HERO AND NEVER OUTRANKS IT. An unfinished workout or today's session is
            what somebody opened the app to do; a summary of last week can wait four inches. Same
            reasoning that keeps `showQuietProgramLink` one line under the real content.

            ⚠ AND IT IS NOT IN `composition.ts`. That module derives the hero and the tiles from program
            state, purely and synchronously. Whether a review exists is an async fact about a different
            table — threading it through would make a pure function depend on a network read.
          */}
          {/* ⚠ THE 24-HOUR WINDOW (0152). Checked HERE rather than at fetch time on purpose: Home is a
              mounted tab that can sit open across the boundary, and a card whose welcome ran out three
              hours ago should not still be sitting there because the app happened not to be restarted.
              This re-evaluates on every render, which is exactly as often as it needs to.

              ⚠ AND `reviewRetired` IS THE HALF THAT DOES NOT DEPEND ON A MIGRATION. The window above is
              only real once 0152 is applied — until then `createdAt` is null, `reviewWindowOpen` returns
              true by design, and the card would sit on Home for the full seven days. Retirement is
              device-local and works either way, so View and Skip are the athlete's guaranteed way out.
              See `weekly-review-seen-model.ts`. */}
          {weeklyReview && !reviewRetired && reviewWindowOpen(weeklyReview.createdAt) ? (
            <WeeklyReviewCard
              review={weeklyReview}
              entitled={reviewEntitled}
              onView={() => {
                retireReview();
                router.push({ pathname: '/weekly-review/[week]', params: { week: weeklyReview.weekStart } });
              }}
              onSkip={retireReview}
            />
          ) : null}

          {/* A program is an OPTION, not a prerequisite — so it is not a card competing with the screen's
              real content. `/workouts` already holds both doors (Build a Program and Discover), so this is
              one tap to either rather than two cards for one decision.

              ══ AND IT IS THE JOINT, NOT A BUTTON ══

              It used to be a centred 12.5sp line of bold sans, which read as a footnote to Mission rather
              than as the door it is. It now runs EDGE TO EDGE — past the content padding, on two neutral
              hairlines — so it separates the athlete's own material above (chapter, today, objective) from
              other people below (circle, train together). PO: *"a connective editorial element."*

              ⚠ FULL-BLEED IS THE WHOLE DEVICE. `marginHorizontal: -18` cancels `content`'s padding, and
              the padding is added back inside, so the rules reach the screen edge while the contents stay
              on the same left margin as everything else. Losing that makes it another boxed row.

              ⚠ THE HAIRLINES ARE NEUTRAL ON PURPOSE. Bronze is Home's "do this now" signal and it was
              already edging nine separate things; a band that merely offers something does not get it.
              Holt's own mark carries the warmth here. */}
          {composition.showQuietProgramLink ? (
            <Pressable
              onPress={() => openCoach('build')}
              accessibilityRole="button"
              accessibilityLabel="Ask Coach Holt to build you a program"
              style={({ pressed }) => [styles.holtBand, pressed ? styles.holtBandPressed : null]}
            >
              {/*
                ⚠ NO HOLT MARK HERE — THERE WAS ONE, AND IT MADE TWO HOLTS ON ONE SCREEN.

                PO design review, 2026-08-25: *"Holt is starting to appear too many times… Because
                they're physically close together on this screen, I'm effectively seeing two Holts."*
                The floating coin is persistent and sits a few inches below this band, so the row read
                as `Holt avatar → Holt recommendation → Holt floating avatar`.

                The floating coin is the one that stays — it is the app's single "Holt is here" object
                and it is on every surface. This band keeps the sentence and the chevron, which is all
                it ever needed: the words already say whose offer it is.

                ⚠ FORM, NOT COLOUR — so it lands on BOTH themes (Design System §2.0). Nothing here is
                theme-conditional.
              */}
              <Text style={styles.holtBandText}>Want a plan? Holt will build you one.</Text>
              <View style={styles.holtBandChevron}>
                <ChevronRightIcon size={15} color={flColor.gray400} />
              </View>
            </Pressable>
          ) : null}

          <TourAnchor id="your-circle">
            <YourCircleCard
              liveUsers={live}
              friendActivity={circleRow}
              hasCircle={hasCircle}
              onAddFriends={() => router.push('/add-friend')}
              /* Two handlers, not one (0121). The BUTTON asks to join the session they are in; the ROW
                 still opens their profile. Sharing a handler would have meant tapping someone's name
                 fired a request to join their workout. */
              onAskToJoin={(a) => router.push({ pathname: '/workout-join', params: { athlete: a.userId } })}
              onViewAthlete={(userId) => router.push({ pathname: '/athlete/[id]', params: { id: userId } })}
              onFriendActivity={() => router.push('/friends')}
              onSeeCircle={() => router.push('/friends')}
            />
          </TourAnchor>

          {/* Two actions, both real. "Train Together" was "Challenge", which opened a sheet whose every
              row was inert — FRIENDS-context competitions are deferred, so it duplicated Competitions and
              then dead-ended. It shows who is training, and since 0121 each of those rows can be JOINED:
              you ask, they accept, and you open on the exercise they are on. Competitions is unchanged. */}
          <QuickActionsRow
            competitionsCount={challengeHub?.active.length ?? 0}
            trainingCount={live.length}
            trainingSummary={trainingSummary(live)}
            onTrainTogether={() => setFriendSheetOpen(true)}
            onCompetitions={() => router.push('/competitions')}
            trainAnchor="train-together"
            competitionsAnchor="competitions"
          />

          {/* "Explore Forge" invitation (ONB-A2-D4a) — the fresh athlete's map to the four pillars. Shown
              only while awaiting the first workout; a returning athlete has already found their way around. */}
          {awaiting ? <ExploreForgeSection onOpen={(route) => router.push(route)} /> : null}
        </View>
      </ScrollView>

      {/* The splash, held over the whole screen — AppBar included — until every read above is in. Last
          sibling so it covers the background, the bar and the scroll view alike; the sheets below it are
          modals in their own window and cannot be open during a launch anyway. Same artwork, same
          background and same position as the native splash and the boot hold, so the athlete sees one
          continuous picture from the icon tap to the finished screen. */}
      <Animated.View
        style={[styles.cover, coverStyle]}
        pointerEvents={ready ? 'none' : 'auto'}
        accessibilityElementsHidden={ready}
        importantForAccessibility={ready ? 'no-hide-descendants' : 'yes'}
      >
        <ForgeSplash />
      </Animated.View>

      {/*
        TWO PAGES: the choice, then the cardio list.

        Every conditioning activity still comes from `CARDIO_ACTIVITIES` rather than being typed out —
        that is what stopped Walk and Ride being built and reachable from nowhere. The list simply lives
        one tap in, behind a single Cardio row, so the athlete who wants to lift is not asked to read
        past a stair climber first.
      */}
      {/* The three ways into a lifting session (`Forge Strength Start.dc.html`), reached from every Home
          door that would otherwise have assumed build-as-you-go. */}
      <StartStrengthSheet
        open={strengthOpen}
        onClose={() => setStrengthOpen(false)}
        onFreestyle={() => void buildAsYouGo()}
        /* Promoted to the hero's own "Build for later", where it makes a one-off rather than a template. */
        offerBuildFirst={false}
      />

      <BottomSheet
        open={elseOpen}
        onClose={closeElse}
        title={elseView === 'root' ? 'What are you training?' : cardioAsk ? 'Where?' : 'Cardio'}
        scroll
      >
        <View style={styles.elseList}>
          {elseView === 'root' ? (
            <>
              <Pressable
                onPress={chooseStrengthFromHome}
                accessibilityRole="button"
                accessibilityLabel="Strength — from a template, or built as you go"
                style={({ pressed }) => [styles.elseRow, pressed ? styles.pathPressed : null]}
              >
                <Text style={styles.pathCardTitle}>Strength</Text>
                <Text style={styles.pathCardSub}>From a template, or built as you go.</Text>
              </Pressable>
              <Pressable
                onPress={() => setElseView('cardio')}
                accessibilityRole="button"
                accessibilityLabel="Cardio — run, walk, ride, row, elliptical, stair climber or swim"
                style={({ pressed }) => [styles.elseRow, pressed ? styles.pathPressed : null]}
              >
                <Text style={styles.pathCardTitle}>Cardio</Text>
                <Text style={styles.pathCardSub}>Run, ride, row, swim and more. Measured in distance and time.</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                /* One step back, not all the way out: from the modality question to the activity list,
                   and only then to the root. Sending a mis-tap on "Walk" back to the top would make the
                   question feel like a dead end rather than a step. */
                onPress={() => (cardioAsk ? setCardioAsk(null) : setElseView('root'))}
                accessibilityRole="button"
                accessibilityLabel={cardioAsk ? 'Back to the cardio list' : 'Back to what are you training'}
                style={({ pressed }) => [styles.elseBack, pressed ? styles.pathPressed : null]}
              >
                <Text style={styles.elseBackLabel}>← Back</Text>
              </Pressable>
              {/*
                ══ THE MODALITY QUESTION, ASKED WHERE THE ACTIVITY IS CHOSEN ══

                Replaces the activity list rather than sitting under it: one question on screen at a
                time, and the Back row above already leads out of it. Two options only, because there
                are only two — no "remember this", which would be a preference invented on a tester
                report rather than asked for.
              */}
              {cardioAsk ? (
                (['outdoor', 'indoor'] as Modality[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => void startCardio(cardioAsk, m)}
                    accessibilityRole="button"
                    accessibilityLabel={deriveName(cardioAsk, m)}
                    style={({ pressed }) => [styles.elseRow, pressed ? styles.pathPressed : null]}
                  >
                    <Text style={styles.pathCardTitle}>{deriveName(cardioAsk, m)}</Text>
                    {/* Says what the CARD will do, which is the part the athlete cannot see yet and the
                        part that actually differs: one measures by GPS, the other hands you a clock. */}
                    <Text style={styles.pathCardSub}>
                      {m === 'outdoor' ? 'Measured by GPS as you go' : 'You enter the distance and time'}
                    </Text>
                  </Pressable>
                ))
              ) : (
                CARDIO_ACTIVITIES.map((a) => (
                  <Pressable
                    key={a.key}
                    onPress={() => pickCardio(a.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${a.name} — ${a.sub}`}
                    style={({ pressed }) => [styles.elseRow, pressed ? styles.pathPressed : null]}
                  >
                    <Text style={styles.pathCardTitle}>{a.name}</Text>
                    <Text style={styles.pathCardSub}>{a.sub}</Text>
                  </Pressable>
                ))
              )}
            </>
          )}
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
        onAskToJoin={(a) => {
          setFriendSheetOpen(false);
          router.push({ pathname: '/workout-join', params: { athlete: a.userId } });
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

      {/* The planned session, readable before it is started. Mounted unconditionally rather than inside
          the hero branch — a sheet declared in a branch that has already returned is the defect
          `overlay-branch.test.mjs` exists to catch. */}
      {plannedDay ? (
        <WorkoutPreviewSheet
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={home.workout?.name ?? plannedDay.name}
          focus={home.workout?.focus}
          warmup={plannedDay.warmup}
          main={plannedDay.main}
          onStart={() => {
            setPreviewOpen(false);
            void startHomeWorkout();
          }}
          /*
            The one deviation the preview offers — Start is the other, and there is deliberately no third.

            ⚠ SKIP IS NOT REACHABLE FROM HERE. It was removed from the preview's footer on the reasoning
            that this button landed on Program Detail, which carries Train and Skip per session. It no
            longer does; the picker below stays on Home and only swaps. Skipping is still reachable by
            opening the program itself, but the preview flow no longer offers it and that is an open gap,
            not a decision.
          */
          /*
            Stays on Home. It used to push Program Detail, which answers "show me the whole program" when
            the question was "not this one — what else is there this week". The picker is the smaller
            answer, and the athlete never leaves the card they were looking at. Absent when the week has
            nothing left to trade with, rather than opening onto an empty list.
          */
          onChooseAnother={
            swapOptions.length > 0
              ? () => {
                  setPreviewOpen(false);
                  setSwapOpen(true);
                }
              : undefined
          }
        />
      ) : null}

      {activeProgram && nextSlot ? (
        <SwapWorkoutSheet
          open={swapOpen}
          onClose={() => setSwapOpen(false)}
          weekNumber={nextSlot.weekIndex + 1}
          currentName={home.workout?.name ?? 'this workout'}
          options={swapOptions}
          busy={swapBusy}
          onSwap={(dayIndex) => void swapFromHome(dayIndex)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  elseList: { gap: 10 },
  elseBack: { paddingVertical: 6, paddingHorizontal: 2, alignSelf: 'flex-start' },
  elseBackLabel: { fontSize: 14, fontWeight: '600', color: flColor.gray600 },
  /* Bronze, matching the Start Strength rows this sheet leads INTO. They were charcoal, so the first
     step of the flow looked like a list and the second like a decision. Same weight, same door. */
  elseRow: {
    padding: 15,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.trainTogetherCard,
  },
  /* Tightened from 12 — the stack read as a web form at its old height. The lead card carries the
     hierarchy now, so the gaps no longer have to do it. */
  pathBlock: { gap: 10 },
  pathTitle: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.cream100,
  },
  /*
   * THE RECOMMENDED CARD. Warm rather than bright: a bronze edge, the faintest internal tint, and a low
   * glow that lifts it off the stone. Deliberately NOT a gradient or a heavier border — the background is
   * already ornate, and stacking gold on gold turns luxury into theatre.
   */
  pathCardLead: {
    paddingVertical: 20,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
    boxShadow: flShadow.cardLead,
  },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  leadText: { flex: 1, minWidth: 0 },
  leadEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze300, marginBottom: 7 },
  leadEyebrowDim: { color: flColor.bronze600, fontWeight: '600' },
  leadMark: { opacity: 0.9 },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  /* Fixed width so both titles start on the same vertical line — a ragged left edge between two adjacent
     cards reads as a mistake long before anyone works out why. */
  pathIcon: { width: 26, alignItems: 'center' },
  pathText: { flex: 1, minWidth: 0 },
  /* The two alternatives, quieter than they were: less padding, a flatter ground and no card shadow, so
     they read as the choices BESIDE the recommendation rather than as peers of it. */
  pathCard: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  pathPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  pathCardTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  pathCardSub: { marginTop: 5, fontSize: 13, lineHeight: 18.5, color: flColor.gray600 },
  pathQuiet: { alignSelf: 'center', marginTop: 6, paddingVertical: 8 },
  /* The connective band. `-18` cancels `content.paddingHorizontal` so the rules run to the screen edge;
     the same 18 is paid back inside so the mark lines up with every other left margin on Home. */
  holtBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: -18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: flColor.charcoal700,
  },
  holtBandPressed: { opacity: 0.82 },
  /* Set in the display face, because this is a sentence Holt says rather than a control label. */
  holtBandText: {
    flex: 1,
    minWidth: 0,
    fontFamily: flFont.display,
    fontSize: 16,
    lineHeight: 22,
    color: flColor.bronze400,
  },
  holtBandChevron: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Lifted from gray600 — a real exit that some athletes genuinely want should be readable, not a
     watermark. Named plainly too: "library" is a word this app has never taught anybody. */
  pathQuietText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6, color: flColor.bronze400 },
  root: {
    flex: 1,
  },
  /* Above every sibling in `root`, not merely after them: `ScreenBackground` is absolutely positioned
     and the AppBar carries a shadow, so paint order alone is not something to rely on here. */
  cover: { ...StyleSheet.absoluteFill, zIndex: 100 },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: flColor.overlayScrim,
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
    boxShadow: flShadow.float,
  },
  menuName: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray400, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  menuDivider: { height: 1, backgroundColor: flColor.charcoal600, marginHorizontal: 6 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 14 },
  menuItemText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },

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
});
