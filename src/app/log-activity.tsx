import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { InputField } from '@/components/forge/composites/InputField';
import { ForgeTextArea } from '@/components/forge/inputs/ForgeTextArea';
import { saveActivity, type DistanceActivity } from '@/domain/workout/save';
import { CARDIO_OF_DISTANCE_ACTIVITY, distanceUnitFor, fromDistanceIn, type DistanceUnit } from '@/domain/workout/conditioning';
import { useUnits } from '@/lib/settings';
import { errorMessage } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Log a Run — a lightweight distance-activity logger (Part 1 of auto-tracking goals). Records a run/walk/
 * bike/row/swim as a workout carrying `distance` (canonical MILES) via the `save_workout` RPC, so distance
 * goals have real data to track. Distinct from the strength logger (`workout.tsx`), which is sets/reps-centric.
 *
 * ══ THE FIELD IS THE ATHLETE'S UNIT; STORAGE IS ALWAYS MILES ══
 *
 * This screen used to label the input "Miles" unconditionally and pass the typed figure straight through as
 * `distanceMi`. On metric that is the exact defect `units.ts` forbids by name: an athlete who means 5 km
 * types 5 and a 5-MILE run is stored — not a rounding error but a run 61% longer than the one they did,
 * feeding distance goals and auto-tracking with it.
 *
 * It was invisible because `0139` put every athlete on imperial, where `fromDistanceIn(x, 'mi') === x`
 * exactly. So it only ever bit someone who chose Kgs/km — which is to say, it was waiting.
 *
 * ⚠ SWIMMING IS NOT MEASURED IN MILES BY ANYONE. `distanceUnitFor` gives the pool yards (metres on metric),
 *   the same scale the cardio card and the program builder already use, so "1000" here means 1000 yd rather
 *   than an unauthorable 0.568 mi.
 */

const ACTIVITIES: { key: DistanceActivity; label: string }[] = [
  { key: 'running', label: 'Run' },
  { key: 'walking', label: 'Walk' },
  { key: 'cycling', label: 'Bike' },
  { key: 'rowing', label: 'Row' },
  { key: 'swimming', label: 'Swim' },
];

/** The field's own label and example, per unit. A pool is written in whole lengths, a road in decimals. */
const UNIT_COPY: Record<DistanceUnit, { label: string; placeholder: string }> = {
  mi: { label: 'Miles', placeholder: '3.1' },
  km: { label: 'Kilometres', placeholder: '5.0' },
  yd: { label: 'Yards', placeholder: '1000' },
  m: { label: 'Metres', placeholder: '1000' },
};

export default function LogActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { units } = useUnits();

  const [activity, setActivity] = useState<DistanceActivity>('running');
  const [distance, setDistance] = useState('');
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const unit = distanceUnitFor(CARDIO_OF_DISTANCE_ACTIVITY[activity], units === 'metric');
  const copy = UNIT_COPY[unit];

  /*
   * ⚠ THE TYPED FIGURE IS IN `unit`, AND `unit` CHANGES WHEN THE ACTIVITY DOES.
   *
   * Run → Swim moves the scale from miles to yards. Keeping "3" across that switch would silently turn a
   * 3-mile run into a 3-yard swim: the number survives and its meaning does not, which is precisely the
   * relabel-without-converting that `units.ts` forbids. Converting it instead would be worse — nobody
   * types 3 for a run and means 5280 yd of swimming.
   *
   * So the field clears. Losing two keystrokes is the correct price for never storing a figure the athlete
   * did not mean. Duration and notes are unit-free and are deliberately kept.
   */
  const pickActivity = (next: DistanceActivity) => {
    if (distanceUnitFor(CARDIO_OF_DISTANCE_ACTIVITY[next], units === 'metric') !== unit) setDistance('');
    setActivity(next);
  };

  /*
   * The athlete's figure → canonical miles, which is what `save_workout` stores and what every distance
   * goal reads. Identity on imperial road activities (`PER_MILE.mi === 1`), so nothing moves for anyone
   * already logging today.
   *
   * `parseFloat('')` is NaN and NaN survives the division, so `canSave` stays false on an empty field
   * without a second guard.
   */
  const distanceMi = fromDistanceIn(parseFloat(distance), unit);
  const canSave = distanceMi > 0;

  const onSave = () => {
    if (!canSave || busy) return;
    setBusy(true);
    const durationSec = (parseInt(min || '0', 10) || 0) * 60 + (parseInt(sec || '0', 10) || 0);
    saveActivity({ activityType: activity, distanceMi, durationSec: durationSec || undefined, notes }).then(
      ({ workoutId }) => router.replace({ pathname: '/activity/[id]', params: { id: workoutId } }),
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Log a Run" serif onBack={() => router.back()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Activity */}
          <Text style={styles.sectionLabel}>Activity</Text>
          <View style={styles.chips}>
            {ACTIVITIES.map((a) => {
              const on = activity === a.key;
              return (
                <Pressable key={a.key} onPress={() => pickActivity(a.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on ? styles.chipOn : null]}>
                  <Text style={[styles.chipLabel, on ? styles.chipLabelOn : null]}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Distance + Duration */}
          <Text style={styles.sectionLabel}>Distance</Text>
          <View style={styles.card}>
            <InputField label={copy.label} value={distance} onChange={(v) => setDistance(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder={copy.placeholder} />
            <View>
              <Text style={styles.faLabel}>Duration (optional)</Text>
              {/*
                * ⚠ THE `flex: 1` WRAPPERS ARE WHY THESE TWO FIELDS EXIST AT ALL ON SCREEN.
                *
                * PO: *"When I go to log a run it's not letting me put in the time."* They were not
                * disabled and nothing threw — they had collapsed to a sliver of border with no room to
                * put a caret in.
                *
                * `InputField` takes no style prop, so its root `<View>` is unstyled. In a COLUMN parent
                * that is invisible — the Miles field directly above is a child of `card` and stretches
                * to full width, which is why distance worked and duration did not. In a ROW parent
                * (`durationCell`) an unstyled View is sized by its content, and its content is a
                * `TextInput` carrying `flex: 1, minWidth: 0` — which contributes NO intrinsic width in
                * Yoga. So the well shrank to its own 28pt of horizontal padding.
                *
                * Wrapped here rather than by adding a style prop to `InputField`: that is a Tier-2
                * composite used on eleven screens, and widening its API to fix one caller's layout is
                * the change most likely to move something else.
                */}
              <View style={styles.durationRow}>
                <View style={styles.durationCell}>
                  <View style={styles.durationInput}>
                    <InputField value={min} onChange={(v) => setMin(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="0" accessibilityLabel="Minutes" />
                  </View>
                  <Text style={styles.durationUnit}>min</Text>
                </View>
                <View style={styles.durationCell}>
                  <View style={styles.durationInput}>
                    <InputField value={sec} onChange={(v) => setSec(v.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="00" accessibilityLabel="Seconds" />
                  </View>
                  <Text style={styles.durationUnit}>sec</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.sectionLabel}>Notes</Text>
          <View style={styles.card}>
            <ForgeTextArea value={notes} onChangeText={setNotes} maxLength={280} minRows={2} placeholder="How did it feel? (Optional)" fullWidth autoCorrect />
          </View>
        </ScrollView>

        {/* Commit bar */}
        <LinearGradient colors={['rgba(9,9,9,0.4)', 'rgba(9,9,9,0.72)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.commitBar, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable onPress={onSave} disabled={!canSave || busy} accessibilityRole="button" accessibilityState={{ disabled: !canSave || busy }} accessibilityLabel="Save activity">
            {canSave ? (
              <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={[styles.commitBtn, styles.commitBtnOn]}>
                <ForgeGlyph color={flColor.bronze300} />
                <Text style={styles.commitLabel}>{busy ? 'Saving…' : 'Log It'}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.commitBtn, styles.commitBtnOff]}>
                <ForgeGlyph color={flColor.gray600} />
                <Text style={styles.commitLabelOff}>Log It</Text>
              </View>
            )}
          </Pressable>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

function ForgeGlyph({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },

  sectionLabel: { marginTop: 22, marginBottom: 12, marginLeft: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, padding: 16, gap: 18, boxShadow: flShadow.card },
  faLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 9 },

  // activity chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  chipLabelOn: { color: flColor.bronze300 },

  // duration
  durationRow: { flexDirection: 'row', gap: 12 },
  durationCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  /* `minWidth` as well as `flex`, because `flex: 1` alone still permits a shrink to nothing when the
     row is tight — and a field you cannot put a caret in is what this whole block is fixing. */
  durationInput: { flex: 1, minWidth: 64 },
  durationUnit: { fontSize: 13, color: flColor.gray400 },

  // commit bar
  commitBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  commitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1 },
  commitBtnOn: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  commitBtnOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600, opacity: 0.75 },
  commitLabel: { fontSize: 15, fontWeight: '600', color: flColor.bronze300 },
  commitLabelOff: { fontSize: 15, fontWeight: '600', color: flColor.gray600 },
});
