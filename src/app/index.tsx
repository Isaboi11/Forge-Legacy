import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ForgeMarkIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { HomepagePrinciple } from '@/components/forge/compositions/HomepagePrinciple';
import { TodaysWorkoutCard } from '@/components/forge/compositions/TodaysWorkoutCard';
import { ProgramMissionGrid } from '@/components/forge/compositions/ProgramMissionGrid';
import { FriendActionSheet, TrainTogetherCard } from '@/components/forge/compositions/TrainTogetherCard';
import { HOME_DATA, todaysPrinciple } from '@/data/home-placeholder';
import { LIVE_TRAINING_USERS } from '@/data/live-training-placeholder';
import { flColor, flFont, flGradient } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
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
 * H-1 Home (v2, Phase 2 re-layout)
 * Source of truth: the design handoff "Forge Home.dc.html".
 *
 * Supersedes the fused, artwork-less MissionCard: a dedicated artwork-driven
 * "Today's Workout" hero card (fed by the Home Workout Artwork Resolver) over a
 * separate Program|Mission grid. The hero + Program tile + AppBar avatar read
 * REAL data (converted programs + profile); the Mission tile + chapter heading
 * remain HOME_DATA placeholders (no Goal/Chapter backend yet). The ornate chapter
 * title-block, "Your Circle" rework, and Quick Actions row are a follow-up
 * full-match pass; HomepagePrinciple + TrainTogetherCard are kept as-is.
 */
export default function HomeScreen() {
  const [friendSheetOpen, setFriendSheetOpen] = useState(false);
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();

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

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={flGradient.bgAtmospheric.colors}
        locations={flGradient.bgAtmospheric.locations}
        start={flGradient.bgAtmospheric.start}
        end={flGradient.bgAtmospheric.end}
        style={StyleSheet.absoluteFill}
      />

      <AppBar
        title={<HomeWordmark />}
        avatar={<Avatar name={profile.name} size="appBar" />}
        onAvatar={() => {
          // P-1 Profile is not yet implemented (Code Implementation: 0%).
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Chapter heading — compact (ornate title block w/ rank medallion is the follow-up). */}
        <View style={styles.chapterHeading}>
          <Text style={styles.chapterEyebrow}>{mission.weekLabel}</Text>
          <Text style={styles.chapterName}>{mission.chapterName}</Text>
          <Text style={styles.forgingSince}>{mission.forgingSinceLabel}</Text>
        </View>

        <HomepagePrinciple text={todaysPrinciple()} />

        <View style={styles.content}>
          {workout ? (
            <TodaysWorkoutCard
              resolved={resolved}
              title={workout.name}
              focus={workout.focus}
              exerciseCount={workout.exerciseCount ?? workout.exercises?.length ?? 0}
              onStart={() => {
                // Starting a workout automatically goes live to squad/friends (useWorkoutSession).
                // Active workout logging (W-9–W-16) isn't built, so this starts the session and
                // hands off to the /workout tab placeholder for Finish/Abandon.
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

          <TrainTogetherCard
            liveUsers={LIVE_TRAINING_USERS}
            onJoinLiveUser={() => {
              // S-2 Squad Detail / S-10 Train Together join flow — not yet implemented.
            }}
            onChoosePartner={() => setFriendSheetOpen(true)}
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
    gap: 20,
  },
  chapterHeading: {
    paddingHorizontal: 26,
    paddingTop: 14,
    gap: 6,
  },
  chapterEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  chapterName: {
    fontFamily: flFont.display,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: flColor.cream100,
  },
  forgingSince: {
    fontSize: 13,
    color: flColor.gray400,
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
