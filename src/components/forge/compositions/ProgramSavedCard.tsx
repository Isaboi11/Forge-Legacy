import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flFont, flGradient, flRadius, flShadow, flType } from '@/constants/foundation';
import { Button } from '@/components/forge/composites/Button';
import { BarbellIcon, FlameIcon } from '@/components/forge/primitives/icons/HomeIcons';
import type { SavedProgram } from '@/data/programs-live';

/**
 * ProgramSavedCard — the Home hero once the athlete has built their own program.
 *
 * Shares the exact "active program" hero frame and layout as TodaysWorkoutCard (charcoal-900 base +
 * bronze border + mission-card shadow + warm mission-card wash · icon chip · muted eyebrow · serif title ·
 * meta divider · primary Start Workout), so a self-built program reads identically to a Forge program —
 * just without the resolved workout artwork (there's none for a custom build; like the hero for an
 * unregistered workout, it degrades gracefully to the bronze wash + icon).
 *
 * "Start Workout" still runs the demo session — executing a user-authored program is the deeper BU-1
 * piece, deferred. "Build another" is the quieter secondary.
 */
export function ProgramSavedCard({
  program,
  onStart,
  onBuild,
}: {
  program: SavedProgram;
  onStart: () => void;
  onBuild: () => void;
}) {
  const dayCount = program.structure.days.length;
  const exCount = program.structure.days.reduce((n, d) => n + d.main.length, 0);
  return (
    <View style={styles.card}>
      {/* faint warm wash — identical to the active-program hero */}
      <LinearGradient
        pointerEvents="none"
        colors={flGradient.missionCardWash.colors}
        locations={flGradient.missionCardWash.locations}
        start={flGradient.missionCardWash.start}
        end={flGradient.missionCardWash.end}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.headRow}>
          <View style={styles.iconChip}>
            <BarbellIcon size={24} />
          </View>
          <View style={styles.headText}>
            <Text style={flType.missionEyebrowMuted}>Your Program</Text>
            <Text style={styles.title} numberOfLines={2}>
              {program.name}
            </Text>
          </View>
        </View>

        <View style={styles.metaBlock}>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <BarbellIcon size={16} color={flColor.bronze400} />
            <Text style={styles.metaText}>
              {dayCount} Day{dayCount === 1 ? '' : 's'} · {exCount} Exercise{exCount === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <Button variant="primary" fullWidth onPress={onStart} icon={<FlameIcon />} accessibilityLabel="Start workout">
          Start Workout
        </Button>

        <Pressable
          onPress={onBuild}
          accessibilityRole="button"
          accessibilityLabel="Build another program"
          style={styles.buildAnother}
        >
          <Text style={styles.buildAnotherText}>Build another</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── hero frame — mirrors TodaysWorkoutCard's `card` exactly ──
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.missionCard,
  },
  content: {
    padding: 22,
    gap: 18,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconChip: {
    width: 52,
    height: 52,
    marginTop: 4,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  headText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 32,
    color: flColor.cream100,
  },
  metaBlock: {
    gap: 9,
  },
  metaDivider: {
    height: 1,
    maxWidth: 150,
    backgroundColor: flColor.bronzeBorderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  buildAnother: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  buildAnotherText: {
    fontFamily: flFont.sans,
    fontSize: 13.5,
    fontWeight: '600',
    color: flColor.bronze300,
  },
});
