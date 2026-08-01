import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { flColor, flFont, flRadius } from '@/constants/foundation';
import { useWallClockTimer } from '@/hooks/useWallClockTimer';
import { useKeepScreenAwake } from '@/hooks/useKeepScreenAwake';
import {
  activityFromKey,
  clock,
  legComplete,
  legPaceSec,
  legProgress,
  parseDistance,
  presetFor,
  targetLabel,
} from '@/domain/workout/conditioning';
import { distanceLabel, fmtPace, toDistance, toPace, type UnitSystem } from '@/domain/run/run-core';
import type { SessionExercise } from '@/domain/workout/types';

/**
 * A conditioning leg inside a session — the panel that stands where the set table would.
 *
 * Two ways to do the same prescribed work, chosen here rather than written into the program: OUTDOORS,
 * where GPS measures both numbers, or INDOORS, where a wall clock measures the time and the athlete
 * reads the distance off the machine. The program said "run three miles"; it has no business deciding
 * whether it rained.
 *
 * The timer is `useWallClockTimer`, which computes elapsed from a stored start TIMESTAMP rather than
 * counting seconds — so it survives the screen locking, the app being switched away, and the tab being
 * throttled, none of which a counter survives. That is why indoor mode needs no background permission
 * and works on the web preview exactly as it will on a phone.
 */

interface Props {
  exercise: SessionExercise;
  /** Its index in the session — the address a returning GPS measurement comes back to. */
  index: number;
  units: UnitSystem;
  /** Commits the leg: marks its set done with what was actually measured. */
  onComplete: (durationSec: number, distanceMi: number | null) => void;
  /** Hands off to Active Run, which returns a measurement through `run-leg`. */
  onTrackOutdoors: () => void;
}

export function ConditioningLeg({ exercise, index, units, onComplete, onTrackOutdoors }: Props) {
  const activity = activityFromKey(exercise.catalogKey) ?? 'running';
  const preset = presetFor(activity);
  const set = exercise.sets[0];
  const alreadyDone = !!set?.done;

  // Indoors by default: it is the mode that always works, and the one someone standing on a treadmill
  // with the app open is overwhelmingly likely to want.
  const [outdoor, setOutdoor] = useState(false);
  const [distanceText, setDistanceText] = useState('');

  const timer = useWallClockTimer(alreadyDone ? null : `forge_leg_timer_v1:${index}`);
  useKeepScreenAwake(timer.running);

  const dUnit = distanceLabel(units);
  const target = { distanceMi: exercise.targetDistanceMi, durationSec: exercise.targetDurationSec };
  const prescribed = targetLabel(target, dUnit, (m) => toDistance(m, units));

  // A recorded leg shows what it was; a live one shows what it is.
  const liveDistance = parseDistance(distanceText);
  const shownDuration = alreadyDone ? (set?.durationSec ?? 0) : timer.elapsedSec;
  const shownDistance = alreadyDone ? (set?.distanceMi ?? null) : liveDistance;

  const progress = legProgress({ distanceMi: shownDistance ?? 0, durationSec: shownDuration }, target);
  const met = legComplete({ distanceMi: shownDistance ?? 0, durationSec: shownDuration }, target);
  const pace = legPaceSec(shownDistance, shownDuration);

  const canFinish = !alreadyDone && shownDuration > 0;

  if (alreadyDone) {
    return (
      <View style={styles.panel}>
        <View style={styles.doneHead}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M5 13l4 4L19 7" fill="none" stroke={flColor.greenMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.doneText}>Logged</Text>
        </View>
        <View style={styles.readout}>
          <View style={styles.readCell}>
            <Text style={styles.readValue}>{clock(shownDuration)}</Text>
            <Text style={styles.readLabel}>TIME</Text>
          </View>
          {shownDistance != null ? (
            <>
              <View style={styles.readDiv} />
              <View style={styles.readCell}>
                <Text style={styles.readValue}>{toDistance(shownDistance, units).toFixed(2)}</Text>
                <Text style={styles.readLabel}>{dUnit.toUpperCase()}</Text>
              </View>
            </>
          ) : null}
          {pace != null ? (
            <>
              <View style={styles.readDiv} />
              <View style={styles.readCell}>
                <Text style={[styles.readValue, styles.readValueAccent]}>{fmtPace(toPace(pace, units))}</Text>
                <Text style={styles.readLabel}>{`/${dUnit.toUpperCase()}`}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headRow}>
        <Text style={styles.eyebrow}>{(preset?.name ?? 'Conditioning').toUpperCase()}</Text>
        <Text style={styles.target}>{prescribed ?? 'No target — just go'}</Text>
      </View>

      {/* Mode. Only offered where GPS could actually measure it: a rowing machine and a pool go
          nowhere, so "outdoors" would be a button that produces zero miles. */}
      {preset?.gps ? (
        <View style={styles.segment}>
          <Pressable
            onPress={() => setOutdoor(false)}
            accessibilityRole="button"
            accessibilityState={{ selected: !outdoor }}
            accessibilityLabel="Indoors — time it and enter the distance"
            style={[styles.seg, !outdoor ? styles.segOn : null]}
          >
            <Text style={[styles.segText, !outdoor ? styles.segTextOn : null]}>{preset.indoorName}</Text>
          </Pressable>
          <Pressable
            onPress={() => setOutdoor(true)}
            accessibilityRole="button"
            accessibilityState={{ selected: outdoor }}
            accessibilityLabel="Outdoors — track it with GPS"
            style={[styles.seg, outdoor ? styles.segOn : null]}
          >
            <Text style={[styles.segText, outdoor ? styles.segTextOn : null]}>Outdoors · GPS</Text>
          </Pressable>
        </View>
      ) : null}

      {outdoor ? (
        <View style={styles.outdoorBlock}>
          <Text style={styles.outdoorCopy}>
            We&apos;ll track distance, pace and route, then bring the result straight back to this session.
          </Text>
          <Pressable
            onPress={onTrackOutdoors}
            accessibilityRole="button"
            accessibilityLabel={`Track this ${preset?.name.toLowerCase() ?? 'run'} outdoors`}
            style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
          >
            <Text style={styles.primaryText}>Track Outdoors</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {prescribed ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }, met ? styles.progressMet : null]} />
            </View>
          ) : null}

          <Text style={styles.clock}>{clock(timer.elapsedSec)}</Text>

          <View style={styles.timerRow}>
            {timer.elapsedSec === 0 && !timer.running ? (
              <Pressable
                onPress={timer.start}
                accessibilityRole="button"
                accessibilityLabel="Start the timer"
                style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
              >
                <Text style={styles.primaryText}>Start</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={timer.running ? timer.pause : timer.resume}
                accessibilityRole="button"
                accessibilityLabel={timer.running ? 'Pause the timer' : 'Resume the timer'}
                style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}
              >
                <Text style={styles.secondaryText}>{timer.running ? 'Pause' : 'Resume'}</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.keepAwakeNote}>
            The clock reads the time of day, so it stays right even if your screen sleeps or you switch away.
          </Text>

          <View style={styles.distanceRow}>
            <Text style={styles.distanceLabel}>Distance</Text>
            <TextInput
              value={distanceText}
              onChangeText={setDistanceText}
              placeholder="0.00"
              placeholderTextColor={flColor.gray600}
              keyboardType="decimal-pad"
              accessibilityLabel={`Distance in ${dUnit}`}
              style={styles.distanceInput}
              maxLength={6}
            />
            <Text style={styles.distanceUnit}>{dUnit}</Text>
          </View>
          <Text style={styles.distanceHint}>Read it off the machine when you&apos;re done. Optional.</Text>

          <Pressable
            onPress={() => {
              // The typed distance is in the athlete's display unit; miles are what the record stores.
              const mi = liveDistance == null ? null : units === 'metric' ? liveDistance / 1.609344 : liveDistance;
              onComplete(timer.elapsedSec, mi);
            }}
            disabled={!canFinish}
            accessibilityRole="button"
            accessibilityLabel="Log this leg"
            style={({ pressed }) => [styles.primary, styles.finish, !canFinish ? styles.disabled : null, pressed ? styles.pressed : null]}
          >
            <Text style={styles.primaryText}>{canFinish ? 'Log It' : 'Start the timer to log this'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, gap: 12 },
  headRow: { gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: flColor.bronze400 },
  target: { fontSize: 13.5, color: flColor.gray400 },

  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: flRadius.md, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  seg: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: flRadius.sm ?? 8 },
  segOn: { backgroundColor: flColor.bronzeTint },
  segText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  progressTrack: { height: 4, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: flColor.bronze400 },
  progressMet: { backgroundColor: flColor.greenMuted },

  clock: { fontFamily: flFont.display, fontSize: 46, lineHeight: 50, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  timerRow: { flexDirection: 'row', gap: 10 },
  keepAwakeNote: { fontSize: 11, lineHeight: 16, color: flColor.gray600, textAlign: 'center' },

  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distanceLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  distanceInput: { width: 92, paddingHorizontal: 12, paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 16, color: flColor.cream100, textAlign: 'right' },
  distanceUnit: { width: 24, fontSize: 12, fontWeight: '600', color: flColor.gray600 },
  distanceHint: { fontSize: 11, color: flColor.gray600, marginTop: -6 },

  outdoorBlock: { gap: 12 },
  outdoorCopy: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400 },

  primary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, backgroundColor: flColor.bronze600 },
  primaryText: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  secondaryText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  finish: { marginTop: 2 },

  doneHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: flColor.greenMuted },
  readout: { flexDirection: 'row', alignItems: 'center' },
  readCell: { flex: 1, alignItems: 'center', gap: 3 },
  readDiv: { width: 1, height: 28, backgroundColor: flColor.charcoal700 },
  readValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  readValueAccent: { color: flColor.bronze300 },
  readLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: flColor.gray600 },

  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
