import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { addBodyEntry } from '@/data/body-metrics-live';
import type { UnitSystem } from '@/domain/settings/units';
import { usePersist } from '@/hooks/usePersist';

/**
 * Log Weight sheet (`Forge Progress Hub.dc.html` §12) — a quiet weigh-in: bodyweight (+ optional
 * waist/chest/arm in inches). Weight is entered in the display unit and stored canonically in pounds.
 * §15 fixes vs the .dc: Save is disabled until a valid weight is entered (no silent no-op), and the entry
 * carries a real date (the DB `logged_on` default) rather than the label "Now".
 *
 * The parent remounts this on open (a `key`) so fields re-seed empty — no setState-in-effect.
 */

const LB_PER_KG = 0.45359237;
const WELL_INSET = 'inset 0 2px 6px rgba(0,0,0,0.45)';

export function LogWeightSheet({ open, onClose, onSaved, units }: { open: boolean; onClose: () => void; onSaved: () => void; units: UnitSystem }) {
  const metric = units === 'metric';
  const unitLabel = metric ? 'kg' : 'lb';
  const [weight, setWeight] = useState('');
  const [showMeasures, setShowMeasures] = useState(false);
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arm, setArm] = useState('');
  const [busy, setBusy] = useState(false);
  const persist = usePersist();
  const [focus, setFocus] = useState<string | null>(null);

  const n = parseFloat(weight);
  const valid = Number.isFinite(n) && n > 0;
  const num = (s: string) => {
    const v = parseFloat(s);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  /*
   * ⚠ THE SHEET MUST NOT CLOSE ON A WRITE THAT DID NOT LAND.
   *
   * This was `.then(...).finally(() => setBusy(false))` with no rejection arm — `addBodyEntry` throws, so
   * on failure the sheet stayed open, the button re-enabled, and NOTHING said why. The athlete taps Save
   * again, gets the same silence, and concludes the app cannot record a weigh-in. Closing only on success
   * makes the two outcomes distinguishable without reading a toast.
   */
  const save = () => {
    if (!valid || busy) return;
    setBusy(true);
    const lb = Math.round(metric ? n / LB_PER_KG : n);
    persist(() => addBodyEntry({ weightLb: lb, waist: num(waist), chest: num(chest), arm: num(arm) }), {
      onOk: () => {
        setBusy(false);
        onSaved();
        onClose();
      },
      rollback: () => setBusy(false),
      message: 'Couldn’t save your weigh-in — check your connection and try again.',
    });
  };

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, key: string) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.well, { borderColor: focus === key ? flColor.bronze400 : flColor.charcoal500, boxShadow: focus === key ? `${WELL_INSET}, ${flShadow.glowSubtle}` : WELL_INSET }]}>
        <TextInput
          value={value}
          onChangeText={(t) => set(t.replace(/[^0-9.]/g, ''))}
          onFocus={() => setFocus(key)}
          onBlur={() => setFocus(null)}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={flColor.gray600}
          style={styles.input}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Weight" footer={<Button variant="primary" fullWidth disabled={!valid || busy} onPress={save}>Save weigh-in</Button>}>
      <View style={styles.wrap}>
        <Text style={styles.help}>A quiet record — no goal weight, no pressure.</Text>
        {field(`Bodyweight (${unitLabel})`, weight, setWeight, 'e.g. 199', 'w')}

        {!showMeasures ? (
          <Pressable onPress={() => setShowMeasures(true)} accessibilityRole="button" accessibilityLabel="Add measurements" style={styles.addMeasures}>
            <Text style={styles.addMeasuresText}>+ Add measurements (optional)</Text>
          </Pressable>
        ) : (
          <View style={styles.measureGrid}>
            {field('Waist (in)', waist, setWaist, 'in', 'wa')}
            {field('Chest (in)', chest, setChest, 'in', 'ch')}
            {field('Arms (in)', arm, setArm, 'in', 'ar')}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  help: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  fieldWrap: { gap: 7, flex: 1 },
  fieldLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray400 },
  well: { borderRadius: flRadius.lg, borderWidth: 1, backgroundColor: flColor.surfaceRecessed, paddingHorizontal: 14 },
  input: { height: 46, fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  addMeasures: { paddingVertical: 4 },
  addMeasuresText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  measureGrid: { flexDirection: 'row', gap: 10 },
});
