import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { BarbellIcon, ForgeMarkIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { ChapterTitleBlock } from '@/components/forge/compositions/ChapterTitleBlock';
import { TodaysWorkoutCard } from '@/components/forge/compositions/TodaysWorkoutCard';
import { ProgramMissionGrid } from '@/components/forge/compositions/ProgramMissionGrid';
import { YourCircleCard } from '@/components/forge/compositions/YourCircleCard';
import { QuickActionsRow } from '@/components/forge/compositions/QuickActionsRow';
import { FriendActionSheet } from '@/components/forge/compositions/TrainTogetherCard';
import { FRIEND_ACTIVITY, HOME_CHAPTER, HOME_DATA, todaysPrinciple } from '@/data/home-placeholder';
import { LIVE_TRAINING_USERS } from '@/data/live-training-placeholder';
import { flColor, flFont } from '@/constants/foundation';
import { useQuery } from '@/lib/useQuery';
import { fetchAwaitingChapter } from '@/data/home-live';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
import { useProfile } from '@/lib/profile';
import { useAuth } from '@/lib/auth';
import { ExperienceLevelCard, EXPERIENCE_FOR, type IntakeResult } from '@/components/forge/compositions/ExperienceLevelCard';
import { getHomeLevel, setHomeLevel, clearHomeLevel } from '@/lib/home-level';
import { getHomeIntake, setHomeIntake, clearHomeIntake } from '@/lib/home-intake';
import { fetchMyPrograms } from '@/data/programs-live';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { getActiveProgram, getActiveProgramById } from '@/domain/training/active-program';
import { resolveRecommendationId } from '@/domain/onboarding/recommend-core';
import type { Program, Workout } from '@/domain/training/schema';
import { resolveHomeWorkoutArtwork } from '@/domain/home-artwork/resolver';
import { enrichSessionExercises } from '@/domain/home-artwork/catalog';

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

/** Interim account menu (avatar tap) — name + Sign out. The real home is the deferred Account screen (P-9). */
function AccountMenu({ open, name, onClose, onSignOut }: { open: boolean; name: string; onClose: () => void; onSignOut: () => void }) {
  if (!open) return null;
  return (
    <Pressable style={styles.menuBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close account menu">
      <Pressable style={styles.menuCard} onPress={() => {}}>
        <Text style={styles.menuName} numberOfLines={1}>
          {name || 'Athlete'}
        </Text>
        <View style={styles.menuDivider} />
        <Pressable onPress={onSignOut} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.menuItem}>
          <Text style={styles.menuItemText}>Sign out</Text>
        </Pressable>
      </Pressable>
    </Pressable>
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
 * Real data: the hero art + title/focus/count (resolver over the converted active
 * program), the Program tile (`getActiveProgram()`), the AppBar avatar
 * (`getSelfProfile()`), and the principle (`todaysPrinciple`). PLACEHOLDER
 * (no backend yet): chapter/week (HOME_DATA + HOME_CHAPTER), the Mission tile
 * goal, live presence + friend activity (LIVE_TRAINING_USERS / FRIEND_ACTIVITY),
 * and the Quick Actions. The Home hero rank medallion is temporarily REMOVED
 * (`showRankMedallion={false}`) pending user-supplied cycling artwork — see FORGE_DELTAS §19.
 * (Legacy's hero seal is a separate component and stays.)
 */
export default function HomeScreen() {
  const [friendSheetOpen, setFriendSheetOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();
  const { signOut } = useAuth();
  // Interim sign-out: on session flip the boot router swaps back to the auth route (Welcome). The real
  // home for this is the deferred Account/Settings screen (P-9); this avatar menu is the stopgap.
  const closeMenuAndSignOut = () => {
    setAccountMenu(false);
    void signOut();
  };
  // Live identity for the AppBar avatar. The artwork resolver below keeps its synchronous seed
  // profile — it must resolve the hero art on the first frame, and the art is static regardless.
  const { profile: liveProfile } = useProfile();
  // H-1 "awaiting first workout" (ONB-D17): a just-onboarded athlete (active chapter, 0 workouts) gets a
  // purpose-built hero instead of the static content, so a fresh user never lands on stale/blank Home.
  const { data: awaiting, refetch: refetchAwaiting } = useQuery(fetchAwaitingChapter, []);
  // The athlete's saved programs — if any, Home reflects them instead of the empty first-program card.
  const { data: myPrograms, refetch: refetchPrograms } = useQuery(fetchMyPrograms, []);
  // Opt-in Home experience-level LENS (local only, ONB-Amendment-002) — undefined = loading, null = not
  // chosen (show the question), a level = show the suggested starting program. No DB write; re-askable.
  const { data: homeLevel, refetch: refetchLevel } = useQuery(getHomeLevel, []);
  // Goals + equipment intake (local only) — feeds the recommendation on the suggested face.
  const { data: homeIntake, refetch: refetchIntake } = useQuery(getHomeIntake, []);
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
    }, [refetchAwaiting, refetchPrograms, refetchIntake]),
  );

  // The program that anchors Home's "Today's Workout" + "Current Program" slots. Precedence:
  //   built program (myPrograms[0]) → the fresh athlete's chosen suggestion → the demo active program.
  // Progress is 0/total (no athlete-progress backend); a built program has no catalog artwork, so the
  // resolver reads its exercises' composition (program=null) and degrades to the split/neutral art.
  const { profile, home } = useMemo(() => {
    const profile = getSelfProfile();
    const built = myPrograms && myPrograms.length > 0 ? myPrograms[0] : null;

    let program: Program | null = null;
    let workout: Workout | null = null;
    let name = '';
    let completed = 0;
    let total = 0;

    if (built) {
      const day = built.structure.days.find((d) => d.main.length > 0) ?? built.structure.days[0] ?? null;
      workout = day
        ? {
            name: day.name.trim() || `Day ${day.letter}`,
            focus: day.name.trim() || undefined,
            exerciseCount: day.main.length,
            exercises: day.main.map((ex) => ({ catalogKey: ex.catalogKey, workingSets: 3, section: 'main' as const })),
          }
        : null;
      name = built.name;
      total = (built.structure.weeks || 0) * (built.structure.daysPerWeek || 0);
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
          : getActiveProgram();
      program = prog;
      workout = prog?.nextWorkout ?? null;
      name = prog?.name ?? '';
      completed = prog?.progress?.completed ?? 0;
      total = prog?.progress?.total ?? 0;
    }

    const resolved = resolveHomeWorkoutArtwork({
      user: profile,
      workout: workout ?? ({} as Workout),
      program,
      exercises: workout ? enrichSessionExercises(workout.exercises ?? []) : [],
    });

    return { profile, home: { workout, resolved, name, completed, total } };
  }, [myPrograms, awaiting, homeLevel, homeIntake]);

  const { mission } = HOME_DATA;

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
    refetchLevel();
    refetchIntake();
  };
  const changeIntake = async () => {
    await clearHomeLevel();
    await clearHomeIntake();
    refetchLevel();
    refetchIntake();
  };
  // Start the Home program's next workout (built / chosen / demo). The demo logger runs it (BU-1 deferred).
  const startHomeWorkout = () => {
    const w = home.workout;
    if (!w) return;
    const lifts = (w.exercises ?? [])
      .filter((e) => e.section === 'main' && !e.optional)
      .map((e) => ({ catalogKey: e.catalogKey, name: exerciseNameFor(e.catalogKey), workingSets: e.workingSets }));
    startWorkout(w.name, lifts);
    router.push('/workout');
  };

  const hasProgram = !!(myPrograms && myPrograms.length > 0);
  // Chapter honesty: the full Home can now appear BEFORE the first workout (a suggestion/built program while
  // still `awaiting`), so show the real active chapter then — not the "Chapter III" placeholder.
  const chapter = awaiting
    ? { ...splitChapterTitle(awaiting.chapterName), weekDay: 'Your first chapter' }
    : { number: HOME_CHAPTER.number, name: HOME_CHAPTER.name, weekDay: HOME_CHAPTER.weekDay };

  // Phase B un-gate: the full Home opens as soon as the athlete has a program signal — a built program OR a
  // chosen level (a suggestion exists). The single-card gate remains ONLY while a fresh athlete is still
  // collecting their starting point (no program, no level yet). The first-workout ceremony (ONB-D18) is
  // unaffected — it lives in the workout-complete flow, not this gate.
  const stillCollecting = !!awaiting && !hasProgram && homeLevel == null;

  if (stillCollecting) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
        <AppBar
          title={<HomeWordmark />}
          avatar={<Avatar name={liveProfile?.name ?? ''} src={liveProfile?.avatarUrl ?? undefined} size="appBar" />}
          onAvatar={() => setAccountMenu(true)}
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
            ) : (
              // Still collecting — the intake stepper (level → goals → equipment), ALONE.
              <ExperienceLevelCard mode="collect" onComplete={completeIntake} onBuild={openBuilder} />
            )}
          </View>
        </ScrollView>
        <AccountMenu open={accountMenu} name={liveProfile?.name ?? ''} onClose={() => setAccountMenu(false)} onSignOut={closeMenuAndSignOut} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />

      <AppBar
        title={<HomeWordmark />}
        avatar={<Avatar name={liveProfile?.name ?? profile.name} src={liveProfile?.avatarUrl ?? undefined} size="appBar" />}
        onAvatar={() => setAccountMenu(true)}
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
              onPreview={() => {
                // W-3 Program Detail / workout preview — not yet implemented.
              }}
            />
          ) : null}

          {home.name ? (
            <ProgramMissionGrid
              programName={home.name}
              completed={home.completed}
              total={home.total}
              missionTarget={mission.goal.label}
              goalsRemaining={2}
              // Tap "Current Program": a fresh athlete's suggestion → re-pick (Change); otherwise browse programs.
              onProgram={awaiting && homeLevel != null && !hasProgram ? changeIntake : openPrograms}
              onMission={() => {
                // G-1 Goal Hub — not yet implemented.
              }}
            />
          ) : null}

          <YourCircleCard
            liveUsers={LIVE_TRAINING_USERS}
            friendActivity={FRIEND_ACTIVITY}
            onJoinLive={() => {
              // S-2 Squad Detail / S-10 Train Together join flow — not yet implemented.
            }}
            onFriendActivity={() => router.push('/friends')}
            onSeeCircle={() => router.push('/friends')}
          />

          <QuickActionsRow
            onChallenge={() => setFriendSheetOpen(true)}
            onCompetitions={() => {
              // Competitions Hub — not yet implemented.
            }}
          />
        </View>
      </ScrollView>

      <FriendActionSheet
        open={friendSheetOpen}
        onClose={() => setFriendSheetOpen(false)}
        onTrainTogether={() => {
          // S-10 Train Together (partner selection) — not yet implemented.
        }}
        onChallenge={() => {
          // C-2 Create Challenge, FRIENDS context — not yet implemented.
        }}
      />
      <AccountMenu open={accountMenu} name={liveProfile?.name ?? profile.name} onClose={() => setAccountMenu(false)} onSignOut={closeMenuAndSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
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
