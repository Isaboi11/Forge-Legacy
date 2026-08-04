import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { saveMyLiftMax, setProgramLiftMaxes } from '@/data/lift-maxes-live';
import { ESTIMATE_MAX_REPS, estimateMaxFromSet, type LiftMax, type LiftMaxes } from '@/domain/program/percent-max';
import type { UnitSystem } from '@/domain/settings/units';

/**
 * The max-entry gate — what a percentage-based program asks for before it can prescribe anything.
 *
 * Every load in such a program is a fraction of a tested one-rep max, so without this the athlete gets
 * a month of sessions reading "5 × 5 @ 75%" with no number attached. One screen of friction beats that.
 *
 * ══ TWO WAYS TO ANSWER, AND WHY BOTH ══
 *
 * "I know it" is for the athlete who has tested. "From a set" is for everyone else — which is MOST
 * people, since few have ever taken a true single. It asks for a hard set they remember and runs it
 * through the same Epley helper the app already owns, and it is the only route that works with no
 * logged history at all.
 *
 * An estimate is LABELLED, here and everywhere it is shown. `metrics.ts` bars an estimate from ever
 * being a record and nothing here changes that: this is a starting anchor the athlete corrects by feel
 * in week one, not a claim about what they have lifted.
 *
 * ══ WHAT SAVING WRITES ══
 *
 * Two places, deliberately (0111). The PROGRAM freezes its own copy, so a PR in week 2 cannot silently
 * raise the remaining prescriptions. The PROFILE keeps the current figure, so the next program does not
 * ask again from scratch.
 *
 * The parent remounts this on open (a `key`) so fields re-seed — no setState-in-effect.
 */

const LB_PER_KG = 0.45359237;
const WELL_INSET = 'inset 0 2px 6px rgba(0,0,0,0.45)';

type Mode = 'known' | 'fromSet';

export interface LiftMaxSheetProps {
  open: boolean;
  onClose: () => void;
  /** Written to this run's frozen snapshot. */
  programId: string;
  /** Catalog keys this program needs, in program order. */
  keys: string[];
  /** Key → the lift's display name. */
  names: Record<string, string>;
  /** Already-known maxes (pounds), used to pre-fill. */
  known: LiftMaxes;
  units: UnitSystem;
  onSaved: (maxes: LiftMaxes) => void;
  /** Copy differs when correcting one lift mid-program rather than answering the gate. */
  title?: string;
  /** Shown above the rows when changing a max on a program already under way. */
  warning?: string | null;
}

export function LiftMaxSheet({
  open,
  onClose,
  programId,
  keys,
  names,
  known,
  units,
  onSaved,
  title = 'Your maxes',
  warning = null,
}: LiftMaxSheetProps) {
  const metric = units === 'metric';
  const unit = metric ? 'kg' : 'lb';

  /** Display-unit strings, seeded from whatever is already known. */
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      keys.map((k) => {
        const lb = known[k]?.lb;
        return [k, lb ? String(Math.round(metric ? lb * LB_PER_KG : lb)) : ''];
      }),
    ),
  );
  const [mode, setMode] = useState<Record<string, Mode>>({});
  const [setWeight, setSetWeight] = useState<Record<string, string>>({});
  const [setReps, setSetReps] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string | undefined) => {
    const v = parseFloat(s ?? '');
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  /** The estimate a "from a set" row currently implies, in the display unit. Null until it can be read. */
  const estimateFor = (k: string): number | null => {
    const w = num(setWeight[k]);
    const r = num(setReps[k]);
    if (w == null || r == null) return null;
    return estimateMaxFromSet(w, Math.round(r));
  };

  /** What this row will save, display-unit. An estimate row uses its computed figure. */
  const resolvedFor = (k: string): number | null =>
    (mode[k] ?? 'known') === 'fromSet' ? estimateFor(k) : num(values[k]);

  const answered = keys.filter((k) => resolvedFor(k) != null);
  const canSave = answered.length > 0 && !busy;

  const save = () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);

    const patch: LiftMaxes = {};
    for (const k of keys) {
      const display = resolvedFor(k);
      if (display == null) continue;
      const lb = Math.round(metric ? display / LB_PER_KG : display);
      patch[k] = {
        lb,
        source: (mode[k] ?? 'known') === 'fromSet' ? 'estimated' : 'entered',
        // Null on purpose: we do not know WHEN they hit this, and stamping today would describe a
        // session that never happened.
        setAt: null,
      };
    }

    void setProgramLiftMaxes(programId, patch)
      .then(async (merged) => {
        // The profile copy is a convenience for the NEXT program and must never block this one. A
        // failure here is reported but does not undo the write that matters.
        await Promise.all(
          Object.entries(patch).map(([k, m]: [string, LiftMax]) => saveMyLiftMax(k, m.lb, m.source).catch(() => {})),
        );
        onSaved(merged);
        onClose();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not save that.'))
      .finally(() => setBusy(false));
  };

  const well = (key: string, node: React.ReactNode) => (
    <View
      style={[
        styles.well,
        {
          borderColor: focus === key ? flColor.bronze400 : flColor.charcoal500,
          boxShadow: focus === key ? `${WELL_INSET}, ${flShadow.glowSubtle}` : WELL_INSET,
        },
      ]}
    >
      {node}
    </View>
  );

  const input = (key: string, value: string, set: (v: string) => void, placeholder: string, label: string) =>
    well(
      key,
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
      />,
    );

  const row = (k: string) => {
    const m = mode[k] ?? 'known';
    const est = estimateFor(k);
    const name = names[k] ?? k;

    return (
      <View key={k} style={styles.row}>
        <Text style={styles.liftName}>{name}</Text>

        <View style={styles.tabs}>
          {(['known', 'fromSet'] as Mode[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setMode((prev) => ({ ...prev, [k]: t }))}
              accessibilityRole="button"
              accessibilityState={{ selected: m === t }}
              accessibilityLabel={t === 'known' ? `${name}: enter max directly` : `${name}: work out from a set`}
              style={[styles.tab, m === t && styles.tabOn]}
            >
              <Text style={[styles.tabText, m === t && styles.tabTextOn]}>
                {t === 'known' ? 'I know it' : 'From a set'}
              </Text>
            </Pressable>
          ))}
        </View>

        {m === 'known' ? (
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>One-rep max ({unit})</Text>
            {input(`${k}-max`, values[k] ?? '', (v) => setValues((p) => ({ ...p, [k]: v })), 'e.g. 405', `${name} max`)}
          </View>
        ) : (
          <>
            <View style={styles.pair}>
              <View style={styles.pairItem}>
                <Text style={styles.fieldLabel}>Weight ({unit})</Text>
                {input(`${k}-w`, setWeight[k] ?? '', (v) => setSetWeight((p) => ({ ...p, [k]: v })), 'e.g. 315', `${name} set weight`)}
              </View>
              <View style={styles.pairItem}>
                <Text style={styles.fieldLabel}>Reps</Text>
                {input(`${k}-r`, setReps[k] ?? '', (v) => setSetReps((p) => ({ ...p, [k]: v })), 'e.g. 5', `${name} set reps`)}
              </View>
            </View>
            <Text style={styles.estimate}>
              {est != null
                ? `Estimated max — about ${est} ${unit}. You can change this any time.`
                : `A hard set you remember. Up to ${ESTIMATE_MAX_REPS} reps — above that the estimate stops being honest.`}
            </Text>
          </>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="primary" fullWidth disabled={!canSave} onPress={save}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        <Text style={styles.help}>
          This program prescribes weight as a percentage of your max, so it needs a number to work from.
          It stays fixed for this run — a PR mid-program won&apos;t move the rest of your sessions.
        </Text>

        {keys.map(row)}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.footnote}>
          Don&apos;t know it and can&apos;t guess? Save what you can and start anyway — sessions will show the
          percentage, and you can fill this in whenever.
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  wrap: { gap: 18, paddingBottom: 8 },
  help: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 13, lineHeight: 19 },
  warning: {
    color: flColor.bronze300,
    fontFamily: flFont.sans,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: flColor.bronzeTint,
    borderColor: flColor.bronzeBorder,
    borderWidth: 1,
    borderRadius: flRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { gap: 10 },
  liftName: { color: flColor.cream100, fontFamily: flFont.display, fontSize: 15, letterSpacing: 0.3 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
  },
  tabOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  tabText: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 12 },
  tabTextOn: { color: flColor.bronze300 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 12 },
  pair: { flexDirection: 'row', gap: 10 },
  pairItem: { flex: 1, gap: 6 },
  well: {
    borderWidth: 1,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal700,
    paddingHorizontal: 12,
  },
  input: { color: flColor.cream100, fontFamily: flFont.sans, fontSize: 16, paddingVertical: 10 },
  estimate: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 12, lineHeight: 18 },
  error: { color: flColor.redMuted, fontFamily: flFont.sans, fontSize: 13 },
  footnote: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 12, lineHeight: 18 },
});
