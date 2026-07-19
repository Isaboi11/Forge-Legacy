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
import { getProgramIntent } from '@/lib/program-intent';
import { FirstProgramCard } from '@/components/forge/compositions/FirstProgramCard';
import { ProgramSavedCard } from '@/components/forge/compositions/ProgramSavedCard';
import { fetchMyPrograms } from '@/data/programs-live';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { getActiveProgram, getNextWorkout } from '@/domain/training/active-program';
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
 * ONB-D17 isNew hero — the fresh athlete's first-session empty state, up to Forge Home.dc's isNew card.
 * Two real, distinct actions: Start Training (primary → the demo-workout logger, the working first-workout
 * path) and Browse Programs (secondary → the catalog). No "build your own" copy until the Program Builder
 * exists (fast-follow).
 */
function FirstSessionCard({ onStart, onBrowse }: { onStart: () => void; onBrowse: () => void }) {
  return (
    <Card padding={24} style={styles.firstCard}>
      <View style={styles.firstIcon}>
        <BarbellIcon size={24} color={flColor.bronze400} />
      </View>
      <View style={styles.firstText}>
        <Text style={styles.firstTitle}>Forge your first program</Text>
        <Text style={styles.firstCopy}>Start your first session now, or browse the Forge library to see what&apos;s ahead.</Text>
      </View>
      <View style={styles.firstActions}>
        <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel="Start Training — begin your first workout">
          Start Training
        </Button>
        <Button variant="secondary" fullWidth onPress={onBrowse} accessibilityLabel="Browse Programs — explore the Forge library">
          Browse Programs
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
  // Onboarding program choice → which isNew card ('build_own' → the First Program Card).
  const { data: programIntent } = useQuery(getProgramIntent, []);
  // The athlete's saved programs — if any, Home reflects them instead of the empty first-program card.
  const { data: myPrograms, refetch: refetchPrograms } = useQuery(fetchMyPrograms, []);
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
    }, [refetchAwaiting, refetchPrograms]),
  );

  // Static this session (no athlete-progress backend) — resolve once.
  const { profile, program, workout, resolved } = useMemo(() => {
    const profile = getSelfProfile();
    const program = getActiveProgram();
    const workout = getNextWorkout();
    const resolved = resolveHomeWorkoutArtwork({
      user: profile,
      workout,
      program,
      exercises: workout ? enrichSessionExercises(workout.exercises ?? []) : [],
    });
    return { profile, program, workout, resolved };
  }, []);

  const { mission } = HOME_DATA;

  // Fresh-athlete Home — the ONB-D17 "awaiting first workout" empty state, built up to Forge Home.dc's
  // isNew card (title block + "Forge your first program" hero). Two real, distinct actions:
  //   Start Training (primary) → the demo-workout logger — the working first-workout path that fires the
  //     comes-alive spine (the logger serves the demo workout; freestyle/add-exercise is ruled-deferred).
  //   Browse Programs (secondary) → the catalog (Workouts tab) — browse-only for a fresh user.
  // INTERIM DIVERGENCE from the .dc (tracked, not drift): the design puts Browse primary + "Build a
  // Program" → Program Builder secondary. Neither the enroll funnel (W-3) nor the Program Builder exists,
  // so the app ships Start-primary; it converges to the design's labels/emphasis when both land.
  if (awaiting) {
    const { number: chapterNumber, name: chapterName } = splitChapterTitle(awaiting.chapterName);
    const startFirst = () => {
      startWorkout('First Workout');
      router.push('/workout');
    };
    const browsePrograms = () => router.push('/workouts');
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
            chapterNumber={chapterNumber}
            chapterName={chapterName}
            weekDay="Your first chapter"
            principle={todaysPrinciple()}
            showRankMedallion={false}
          />
          <View style={styles.content}>
            {myPrograms && myPrograms.length > 0 ? (
              <ProgramSavedCard program={myPrograms[0]} onStart={startFirst} onBuild={() => router.push('/program-builder')} />
            ) : programIntent === 'build_own' ? (
              <FirstProgramCard onBuild={() => router.push('/program-builder')} onStart={startFirst} />
            ) : (
              <FirstSessionCard onStart={startFirst} onBrowse={browsePrograms} />
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
          chapterNumber={HOME_CHAPTER.number}
          chapterName={HOME_CHAPTER.name}
          weekDay={HOME_CHAPTER.weekDay}
          principle={todaysPrinciple()}
          showRankMedallion={false}
        />

        <View style={styles.content}>
          {workout ? (
            <TodaysWorkoutCard
              resolved={resolved}
              title={workout.name}
              focus={workout.focus}
              exerciseCount={workout.exerciseCount ?? workout.exercises?.length ?? 0}
              onStart={() => {
                const lifts = (workout.exercises ?? [])
                  .filter((e) => e.section === 'main' && !e.optional)
                  .map((e) => ({ catalogKey: e.catalogKey, name: exerciseNameFor(e.catalogKey), workingSets: e.workingSets }));
                startWorkout(workout.name, lifts);
                router.push('/workout');
              }}
              onPreview={() => {
                // W-3 Program Detail / workout preview — not yet implemented.
              }}
            />
          ) : null}

          {program ? (
            <ProgramMissionGrid
              programName={program.name}
              completed={program.progress?.completed ?? 0}
              total={program.progress?.total ?? 0}
              missionTarget={mission.goal.label}
              goalsRemaining={2}
              onProgram={() => {
                // W-3 Program Detail — not yet implemented.
              }}
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
