import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { ForgeMarkIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { ChapterTitleBlock } from '@/components/forge/compositions/ChapterTitleBlock';
import { TodaysWorkoutCard } from '@/components/forge/compositions/TodaysWorkoutCard';
import { ProgramMissionGrid } from '@/components/forge/compositions/ProgramMissionGrid';
import { YourCircleCard } from '@/components/forge/compositions/YourCircleCard';
import { QuickActionsRow } from '@/components/forge/compositions/QuickActionsRow';
import { FriendActionSheet } from '@/components/forge/compositions/TrainTogetherCard';
import { FRIEND_ACTIVITY, HOME_CHAPTER, HOME_DATA, todaysPrinciple } from '@/data/home-placeholder';
import { LIVE_TRAINING_USERS } from '@/data/live-training-placeholder';
import { flColor } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
import { getActiveProgram, getNextWorkout } from '@/domain/training/active-program';
import { resolveHomeWorkoutArtwork } from '@/domain/home-artwork/resolver';
import { enrichSessionExercises } from '@/domain/home-artwork/catalog';
import { PLACEHOLDER_RANK, resolveRankArtwork } from '@/domain/rank-artwork/resolver';
import { resolveRankArtworkSource } from '@/domain/rank-artwork/rank-source';

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
 * and the Quick Actions. The rank medallion is a pending-asset placeholder — no
 * rank artwork exists yet, so it is not fabricated.
 */
export default function HomeScreen() {
  const [friendSheetOpen, setFriendSheetOpen] = useState(false);
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();

  // Static this session (no athlete-progress backend) — resolve once.
  const { profile, program, workout, resolved, rankArtwork } = useMemo(() => {
    const profile = getSelfProfile();
    const program = getActiveProgram();
    const workout = getNextWorkout();
    const resolved = resolveHomeWorkoutArtwork({
      user: profile,
      workout,
      program,
      exercises: workout ? enrichSessionExercises(workout.exercises ?? []) : [],
    });
    // Rank badge for the chapter medallion. TIER is placeholder (no rank backend);
    // sex only matters for the sex-specific Established family. undefined → placeholder seal.
    const rankArtwork = resolveRankArtworkSource(
      resolveRankArtwork({ ...PLACEHOLDER_RANK, sex: profile.sex }).assetPath,
    );
    return { profile, program, workout, resolved, rankArtwork };
  }, []);

  const { mission } = HOME_DATA;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} />

      <AppBar
        title={<HomeWordmark />}
        avatar={<Avatar name={profile.name} size="appBar" />}
        onAvatar={() => {
          // P-1 Profile is not yet implemented.
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ChapterTitleBlock
          chapterNumber={HOME_CHAPTER.number}
          chapterName={HOME_CHAPTER.name}
          weekDay={HOME_CHAPTER.weekDay}
          principle={todaysPrinciple()}
          rankArtwork={rankArtwork}
        />

        <View style={styles.content}>
          {workout ? (
            <TodaysWorkoutCard
              resolved={resolved}
              title={workout.name}
              focus={workout.focus}
              exerciseCount={workout.exerciseCount ?? workout.exercises?.length ?? 0}
              onStart={() => {
                startWorkout(workout.name);
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
