import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { flColor, flRadius } from '@/constants/foundation';
import type { SquadSummary } from '@/data/squad-live';

/**
 * WHICH SQUADS — plural, because it was singular and shouldn't have been.
 *
 * PO: *"If I click squads then I can only pick one. I want to be able to easily select 1/3, 2/3, or 3/3
 * of those."* Every squad picker in the app was a LIST OF BUTTONS: tapping a name posted to it and closed
 * the question. Sharing the same session to two squads meant opening the sheet twice, and to all three,
 * three times — with three separate posts and no way to tell that was what you were doing.
 *
 * ══ THE ALL ROW IS THE POINT, NOT A CONVENIENCE ══
 *
 * "3/3 of those" is the common case and it must not cost three taps. The header row is both the readout
 * (`2 of 3 selected`) and the control, and it toggles rather than only selecting: once everything is on,
 * the same tap clears it, so the extremes are always one tap apart.
 *
 * ⚠ SELECTING NOTHING IS ALLOWED HERE and refused by the caller's button. This list does not know whether
 * Friends is also selected — on the session sheet "friends, no squads" is a legitimate share — so it
 * cannot decide that an empty set is an error. It reports; the footer decides.
 *
 * Rows carry the member count because squad names are chosen by athletes and two of them are routinely
 * near-identical; "12 members" is what actually distinguishes them at the moment of posting.
 */
export interface SquadSelectListProps {
  squads: SquadSummary[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  /** Shown under the header when the caller wants to say what the selection means. */
  hint?: string;
}

export function SquadSelectList({ squads, selected, onChange, disabled, hint }: SquadSelectListProps) {
  const all = squads.length > 0 && squads.every((s) => selected.has(s.id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <View>
      <Pressable
        onPress={() => onChange(all ? new Set() : new Set(squads.map((s) => s.id)))}
        disabled={disabled || squads.length === 0}
        accessibilityRole="button"
        accessibilityLabel={all ? 'Clear all squads' : 'Select all squads'}
        style={styles.header}
      >
        <Text style={styles.count}>
          {selected.size} of {squads.length} selected
        </Text>
        <Text style={styles.allBtn}>{all ? 'Clear' : 'Select all'}</Text>
      </Pressable>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.list}>
        {squads.map((s, i) => {
          const on = selected.has(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => toggle(s.id)}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: !!disabled }}
              accessibilityLabel={s.name}
              style={({ pressed }) => [styles.row, i > 0 ? styles.rowDiv : null, pressed && !disabled ? styles.rowPressed : null]}
            >
              <View style={[styles.box, on ? styles.boxOn : styles.boxOff]}>
                {on ? (
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12.5l4.5 4.5L19 7" />
                  </Svg>
                ) : null}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.meta}>
                  {s.memberCount} {s.memberCount === 1 ? 'member' : 'members'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The names behind a selection, in the order they are shown — what the toast is built from. */
export function selectedSquads(squads: SquadSummary[], selected: ReadonlySet<string>): SquadSummary[] {
  return squads.filter((s) => selected.has(s.id));
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9 },
  count: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray600 },
  allBtn: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },
  hint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, paddingBottom: 9 },

  list: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  rowPressed: { backgroundColor: flColor.charcoal900 },

  box: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  boxOff: { borderColor: flColor.charcoal500, backgroundColor: 'transparent' },

  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  meta: { marginTop: 2, fontSize: 11, color: flColor.gray600 },
});
