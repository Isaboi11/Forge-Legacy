/**
 * CalendarField — a tap-to-open month grid for picking a date.
 *
 * WHY NOT THE NATIVE PICKER. `@react-native-community/datetimepicker` is a dependency and there is even a
 * legacy `ForgeDateInput` built on it, but `add-photo.tsx` already recorded the finding: it **does not
 * render on the web**, which is the surface this product is being tested on. A control that silently
 * disappears on the platform the athletes use is worse than a text field. So the grid is drawn here — plain
 * RN views, identical on web, iOS and Android, no dependency.
 *
 * WHY IT EXPANDS INLINE rather than opening a modal: this field lives INSIDE a BottomSheet (the squad goal
 * editor), and stacking a second modal over a sheet is the "never stack" rule the Modal Library exists to
 * prevent. Expanding in place also keeps the field you are editing visible while you pick.
 *
 * PURITY. The strict react-compiler rules forbid an impure read during render, so `new Date()` is never
 * called in the render path — the visible month is resolved in the PRESS HANDLER when the grid opens (an
 * event, where impurity is fine) and held in state from then on. That is also why "today" is passed down
 * from that same moment rather than read while drawing.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flRadius } from '@/constants/foundation';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** `2026-03-01` → parts, without `new Date('…')`'s UTC trap (which is the previous evening west of GMT). */
function parseYmd(iso: string | null): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function prettyDate(iso: string | null): string | null {
  const p = parseYmd(iso);
  return p ? `${MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}` : null;
}

export interface CalendarFieldProps {
  label: string;
  /** `YYYY-MM-DD`, or null for "not set". */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Shown when there's no value — e.g. "Today" or "No deadline". */
  placeholder?: string;
  /** Offers a "Clear" action inside the grid. For genuinely optional dates. */
  clearable?: boolean;
  /**
   * Suppress the drawn label when the surrounding form already draws its own (the accomplishment editor
   * has a `Field` wrapper with a different label treatment). `label` is still required — it names the
   * control for a screen reader either way.
   */
  hideLabel?: boolean;
}

export function CalendarField({ label, value, onChange, placeholder = 'Choose a date', clearable = false, hideLabel = false }: CalendarFieldProps) {
  const [open, setOpen] = useState(false);
  // The month on screen. Set when the grid opens, so nothing impure runs during render.
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [todayIso, setTodayIso] = useState<string | null>(null);

  const selected = parseYmd(value);

  const toggle = () => {
    if (!open) {
      const now = new Date();
      setTodayIso(ymd(now.getFullYear(), now.getMonth(), now.getDate()));
      setView(selected ? { y: selected.y, m: selected.m } : { y: now.getFullYear(), m: now.getMonth() });
    }
    setOpen((o) => !o);
  };

  const shiftMonth = (by: number) =>
    setView((v) => {
      if (!v) return v;
      const next = new Date(v.y, v.m + by, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  // Leading blanks so the 1st lands under its weekday, then the month's days.
  const cells: (number | null)[] = [];
  if (view) {
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    for (let i = 0; i < first; i += 1) cells.push(null);
    for (let d = 1; d <= days; d += 1) cells.push(d);
  }

  return (
    <View style={styles.wrap}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${prettyDate(value) ?? placeholder}. Tap to choose a date.`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.field, open ? styles.fieldOpen : null, pressed ? styles.pressed : null]}
      >
        <CalendarGlyph />
        <Text style={[styles.fieldText, !value ? styles.fieldPlaceholder : null]} numberOfLines={1}>
          {prettyDate(value) ?? placeholder}
        </Text>
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open && view ? (
        <View style={styles.grid}>
          <View style={styles.gridHead}>
            <Pressable onPress={() => shiftMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTHS[view.m]} {view.y}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.dowRow}>
            {DOW.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.dowText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.days}>
            {cells.map((d, i) => {
              if (d == null) return <View key={`blank-${i}`} style={styles.day} />;
              const iso = ymd(view.y, view.m, d);
              const isSel = value === iso;
              const isToday = todayIso === iso;
              return (
                <Pressable
                  key={iso}
                  onPress={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={`${MONTHS[view.m]} ${d}, ${view.y}`}
                  style={[styles.day, isSel ? styles.daySelected : null]}
                >
                  <Text style={[styles.dayText, isSel ? styles.dayTextSelected : null, isToday && !isSel ? styles.dayTextToday : null]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          {clearable ? (
            <Pressable
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Clear ${label}`}
              style={styles.clearRow}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CalendarGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={styles.glyphTop} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  fieldOpen: { borderColor: flColor.bronzeBorder },
  pressed: { opacity: 0.9 },
  fieldText: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  fieldPlaceholder: { fontWeight: '500', color: flColor.gray600 },
  chevron: { fontSize: 12, color: flColor.bronze400 },

  glyph: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.4, borderColor: flColor.bronze400, justifyContent: 'flex-start' },
  glyphTop: { height: 3.4, backgroundColor: flColor.bronze400, borderTopLeftRadius: 1, borderTopRightRadius: 1 },

  grid: {
    marginTop: 2,
    padding: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    gap: 8,
  },
  gridHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.sm },
  navText: { fontSize: 20, lineHeight: 22, color: flColor.bronze300 },
  monthLabel: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },

  dowRow: { flexDirection: 'row' },
  dowText: { flexBasis: '14.2857%', textAlign: 'center', fontSize: 10.5, fontWeight: '700', color: flColor.gray600 },

  days: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  day: { flexBasis: '14.2857%', height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.sm },
  daySelected: { backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder },
  dayText: { fontSize: 13.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  dayTextSelected: { color: flColor.bronze300, fontWeight: '700' },
  dayTextToday: { color: flColor.cream100, fontWeight: '700' },

  clearRow: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  clearText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
});
