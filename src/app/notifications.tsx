import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchBriefing, fetchNotifPrefs, saveBriefing, saveNotifPrefs } from '@/data/settings-live';
import {
  BRIEFING_DEFAULT,
  BRIEFING_HOURS,
  DAY_LABELS,
  ISO_DAYS,
  describeDays,
  formatHour,
  type BriefingSchedule,
  type IsoDay,
} from '@/domain/settings/briefing';
import {
  ALWAYS_DELIVERED,
  NOTIF_DEFAULTS,
  NOTIF_FOOTER,
  NOTIF_SECTIONS,
  type NotifKey,
  type NotifMap,
} from '@/domain/settings/notifications';
import { usePersist } from '@/hooks/usePersist';
import { useQuery } from '@/lib/useQuery';

/**
 * P-5 Notifications (`Forge Notifications.dc.html`) — the push preference set.
 *
 * REAL, persisted preferences (`profiles.notif_prefs`, 0022) that save on every toggle, and since 0120
 * a real server sender reads them: a toggle turned off here stops a push leaving Postgres. It never hides
 * the in-app surface — the squad feed, the pending invite and the notification row all still appear
 * (P-5 §4). Ceremonies are never gated by these because ceremonies never push at all (P-5 §1).
 *
 * ⚠ ONE SECTION CARRIES AN EDITOR RATHER THAN JUST A SWITCH. Morning Briefing (0159) is the only
 * notification in the app that is not caused by another person, so it is the only one where "when" is a
 * question — everything else fires when the thing it is about happens. The days and hour live in
 * `briefing_schedule`, not in `notif_prefs`, and are revealed only once the toggle is on.
 */

const SHIELD = 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z';
const CHECK = 'M8.5 12.5l2.5 2.5 5-5';

/**
 * The one promise this screen makes about what a notification will NOT contain.
 *
 * It is here rather than in the section blurb because it answers the question the feature actually
 * raises — "is this going to nag me?" — and that is worth its own line under the card rather than a
 * clause inside a sentence about days and times.
 */
const BRIEFING_NOTE =
  'It names what’s next and stops. It never counts days off, never mentions a session you skipped, and ' +
  'goes quiet on its own if you don’t train — no reminder about the reminder.';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, loading } = useQuery(fetchNotifPrefs, []);
  const [override, setOverride] = useState<Partial<NotifMap>>({});
  const value = (k: NotifKey): boolean => override[k] ?? data?.[k] ?? NOTIF_DEFAULTS[k];
  const persist = usePersist();

  /* 0159. Read alongside the preferences; an absent row resolves to the default schedule rather than to
     silence, so the editor below always has something to draw. */
  const { data: briefingRow } = useQuery(fetchBriefing, []);
  const [briefingOverride, setBriefingOverride] = useState<BriefingSchedule | null>(null);
  const briefing: BriefingSchedule = briefingOverride ?? briefingRow ?? BRIEFING_DEFAULT;

  /*
   * ⚠ A SWITCH THAT MOVED AND DID NOT SAVE IS WORSE THAN ONE THAT REFUSED.
   *
   * This was a bare `void saveNotifPrefs(next)`. `writeColumn` throws, nothing caught it, and the
   * optimistic override stayed — so turning "Friend Requests" off on a bad connection showed OFF while
   * the server kept sending them. The athlete's conclusion is that the toggle does nothing, which is
   * true, and that the app is ignoring them, which is worse than an error.
   */
  const toggle = (k: NotifKey, on: boolean) => {
    const before = override;
    setOverride((o) => ({ ...o, [k]: on })); // optimistic — the switch must not lag the tap
    const next: NotifMap = { ...NOTIF_DEFAULTS, ...data, ...override, [k]: on };

    /*
     * ⚠ SWITCHING THE BRIEFING ON HAS TO WRITE THE SCHEDULE ROW TOO.
     *
     * `briefing_send()` walks `briefing_schedule` and joins the preference — no row means it never
     * considers the athlete at all. Without this, turning the toggle on and never opening the day picker
     * would leave a switch that says ON and a server that has never heard of you: the same class of
     * inert control as `squad_invites`, arrived at from the other direction.
     */
    if (k === 'training_briefing' && on) {
      persist(async () => {
        await saveBriefing(briefing);
        await saveNotifPrefs(next);
      }, { rollback: () => setOverride(before) });
      return;
    }

    persist(() => saveNotifPrefs(next), { rollback: () => setOverride(before) });
  };

  const writeBriefing = (nextSchedule: BriefingSchedule) => {
    const before = briefingOverride;
    setBriefingOverride(nextSchedule);
    persist(() => saveBriefing(nextSchedule), { rollback: () => setBriefingOverride(before) });
  };

  const toggleDay = (day: IsoDay) => {
    const has = briefing.days.includes(day);
    // ⚠ The last day cannot be removed. An empty selection is a second, hidden off switch that would
    // disagree with the toggle above it — and the table's own check constraint refuses it anyway.
    if (has && briefing.days.length === 1) return;
    const days = has ? briefing.days.filter((d) => d !== day) : ISO_DAYS.filter((d) => d === day || briefing.days.includes(d));
    writeBriefing({ ...briefing, days });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Notifications" onBack={back} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {NOTIF_SECTIONS.map((sec) => (
            <View key={sec.key} style={styles.section}>
              <Text style={styles.sectionLabel}>{sec.label}</Text>
              <Text style={styles.blurb}>{sec.blurb}</Text>
              <View style={styles.card}>
                {sec.toggles.map((t, i) => (
                  <View key={t.key} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={styles.iconTile}>
                      <ForgeSymbol name={t.icon} size={18} color={flColor.bronze300} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{t.label}</Text>
                      <Text style={styles.rowHint}>{t.desc}</Text>
                    </View>
                    <SettingsToggle value={value(t.key)} onChange={(on) => toggle(t.key, on)} accessibilityLabel={t.label} />
                  </View>
                ))}

                {/* 0159 — revealed only when the briefing is on, because "when" is not a question the
                    other eleven toggles have: they fire when the thing they are about happens. */}
                {sec.key === 'briefing' && value('training_briefing') ? (
                  <View style={[styles.row, styles.rowBorder, styles.editor]}>
                    <Text style={styles.editorLabel}>Days</Text>
                    <View style={styles.dayRow}>
                      {ISO_DAYS.map((d) => {
                        const on = briefing.days.includes(d);
                        return (
                          <Pressable
                            key={d}
                            onPress={() => toggleDay(d)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={DAY_LABELS[d]}
                            style={[styles.dayChip, on && styles.dayChipOn]}
                          >
                            <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{DAY_LABELS[d]}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={[styles.editorLabel, styles.editorLabelSpaced]}>Time</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
                      {BRIEFING_HOURS.map((h) => {
                        const on = briefing.hour === h;
                        return (
                          <Pressable
                            key={h}
                            onPress={() => writeBriefing({ ...briefing, hour: h })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={formatHour(h)}
                            style={[styles.hourChip, on && styles.hourChipOn]}
                          >
                            <Text style={[styles.hourChipText, on && styles.hourChipTextOn]}>{formatHour(h)}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <Text style={styles.editorSummary}>
                      {describeDays(briefing.days)} at {formatHour(briefing.hour)}, your time.
                    </Text>
                  </View>
                ) : null}
              </View>
              {sec.key === 'briefing' ? <Text style={styles.sectionNote}>{BRIEFING_NOTE}</Text> : null}
            </View>
          ))}

          {/* always-delivered callout */}
          <View style={styles.callout}>
            <View style={styles.calloutIcon}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <Path d={SHIELD} />
                <Path d={CHECK} />
              </Svg>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.calloutTitle}>{ALWAYS_DELIVERED.title}</Text>
              <Text style={styles.calloutBody}>{ALWAYS_DELIVERED.body}</Text>
            </View>
          </View>

          <Text style={styles.footer}>{NOTIF_FOOTER}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 4 },
  blurb: { fontSize: 12, lineHeight: 18, color: flColor.gray400, marginBottom: 11 },

  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 15 },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 2 },

  /* 0159 — the schedule editor. A column inside the card, not a row: it is the one control here that
     needs two lines of its own rather than a switch at the end of a sentence. */
  editor: { flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingTop: 13, paddingBottom: 15 },
  editorLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 9 },
  editorLabelSpaced: { marginTop: 16 },
  editorSummary: { fontSize: 12, lineHeight: 18, color: flColor.gray400, marginTop: 14 },

  dayRow: { flexDirection: 'row', gap: 6 },
  dayChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal800,
  },
  dayChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  dayChipText: { fontSize: 11, fontWeight: '600', color: flColor.gray600 },
  dayChipTextOn: { color: flColor.bronze300 },

  hourRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  hourChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal800,
  },
  hourChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  hourChipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  hourChipTextOn: { color: flColor.bronze300 },

  sectionNote: { fontSize: 11.5, lineHeight: 18, color: flColor.gray600, marginTop: 10, paddingHorizontal: 2 },

  callout: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, marginBottom: 16 },
  calloutIcon: { width: 34, height: 34, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(186, 134, 84,0.14)' },
  calloutTitle: { fontSize: 13.5, fontWeight: '700', color: flColor.bronze300, marginBottom: 3 },
  calloutBody: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  footer: { fontSize: 11.5, lineHeight: 18, color: flColor.gray600, paddingHorizontal: 2 },
});
