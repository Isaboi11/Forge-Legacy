import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import type { RankHistory } from '@/data/rank-live';
import { clinchingSession, rungIndex } from '@/domain/rank/history';
import { rankAscent } from '@/domain/rank/identity';
import { structuredDevelopment, type RankSignals } from '@/domain/rank/rank';
import { rungStandards, type StandardRow } from '@/domain/rank/standards';
import type { RankFamily, RankLevel } from '@/domain/rank-artwork/resolver';

/**
 * ONE RUNG, OPENED — when it was earned and what it took, or what it asks and where you stand.
 *
 * PO, 2026-09-10: *"should each of those be clickable to see what we did to accomplish them/earn them?"*
 *
 * Every figure here is the rank engine's own, read on the day in question (`replayRungs`): the numbers an
 * earned rung shows are the numbers that earned it, and the bar it shows is `rungStandards` — the rows the
 * Rank Progression screen states, routed to one rung. Nothing here re-derives a rule.
 *
 * Information, not a card stack (PO rule: cards are for things you act inside of): section labels, figures
 * and hairlines on the sheet ground. The one tappable thing — the session that did it — gets a row.
 */

export interface RungTarget {
  family: RankFamily;
  /** The family's display name, e.g. "Builder". */
  name: string;
  level: RankLevel;
  state: 'earned' | 'current' | 'locked';
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Mar 4, 2026" from a YYYY-MM-DD, without leaning on Intl (not every Hermes build carries full locale data). */
const fmtDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

export function RankRungSheet({
  target,
  next,
  history,
  loading,
  badge,
  onClose,
  onOpenWorkout,
  onSeeAll,
}: {
  target: RungTarget | null;
  /** The rung above `target`, when `target` is the athlete's own — "what the next one asks". */
  next: RungTarget | null;
  history: RankHistory | null;
  loading: boolean;
  badge: ReactNode;
  onClose: () => void;
  onOpenWorkout: (id: string) => void;
  onSeeAll: () => void;
}) {
  const earned = target && history ? history.earned.get(rungIndex(target.family, target.level)) ?? null : null;
  const reached = target?.state !== 'locked';
  const title = target ? `${target.name} ${ROMAN[target.level]}` : '';

  const eyebrow = !target
    ? ''
    : target.state === 'locked'
      ? 'Not yet earned'
      : earned
        ? `${target.state === 'current' ? 'You are here · since' : 'Earned'} ${fmtDay(earned.date)}`
        : target.state === 'current'
          ? 'You are here'
          : 'Earned';

  const clinch = earned && history ? clinchingSession(history.sessions, earned.date) : null;

  return (
    <BottomSheet
      open={!!target}
      onClose={onClose}
      scroll
      header={
        target ? (
          <View style={styles.head}>
            <View style={styles.headBadge}>{badge}</View>
            <View style={styles.headText}>
              <Text style={[styles.eyebrow, !reached && styles.eyebrowAhead]}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.saying, !reached && styles.sayingAhead]}>{rankAscent(target.family, target.level)}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={6} style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
          </View>
        ) : undefined
      }
    >
      {!target ? null : loading && !history ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : reached ? (
        <View style={styles.body}>
          {earned ? (
            <>
              <Section label="What it took" />
              <Figures signals={earned.signals} />
              <Section label="What it asked" />
              <Standards rows={rungStandards(target.family, target.level, earned.signals)} />
              <Section label={target.family === 'foundation' && target.level === 1 ? 'Where it began' : 'The session that did it'} />
              {clinch ? (
                <Pressable
                  onPress={() => onOpenWorkout(clinch.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${clinch.name ?? 'Workout'}, ${fmtDay(clinch.date)}`}
                  style={({ pressed }) => [styles.session, pressed && styles.sessionPressed]}
                >
                  <View style={styles.sessionText}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {clinch.name ?? 'Workout'}
                    </Text>
                    <Text style={styles.sessionDate}>{fmtDay(clinch.date)}</Text>
                  </View>
                  <Chevron />
                </Pressable>
              ) : (
                <Text style={styles.note}>Nothing was logged that day — the last thing this rung waited on was time.</Text>
              )}
            </>
          ) : (
            /* Reached, but not by any day the replay can name — a rank carried from before the history the
               app holds. Say so rather than print a date nobody can stand behind. */
            <Text style={styles.note}>You reached this rung before the training history the app can replay, so there is no day to put on it.</Text>
          )}

          {target.state === 'current' && next ? (
            <>
              <Section label={`Next · ${next.name} ${ROMAN[next.level]}`} />
              <Standards rows={rungStandards(next.family, next.level, history?.current ?? null)} standing />
              <SeeAll onPress={onSeeAll} />
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          <Section label="What it asks · where you stand" />
          <Standards rows={rungStandards(target.family, target.level, history?.current ?? null)} standing />
          <SeeAll onPress={onSeeAll} />
        </View>
      )}
    </BottomSheet>
  );
}

function Section({ label }: { label: string }) {
  return <Text style={styles.section}>{label}</Text>;
}

/** The engine's signals on the day, as the figures an athlete recognises. Zero rows are left out. */
function Figures({ signals }: { signals: RankSignals }) {
  const figs: [number, string][] = [
    [signals.nativeSessions, signals.nativeSessions === 1 ? 'Workout' : 'Workouts'],
    [signals.nativeActiveWeeks, 'Active weeks'],
    [signals.journeyElapsedDays, 'Days on the path'],
    [signals.improvement.totalPBs, 'Personal bests'],
    [structuredDevelopment(signals), 'Programs or blocks'],
    [signals.sealedChapters, 'Chapters sealed'],
  ];
  const shown = figs.filter(([n], i) => i < 3 || n > 0);
  return (
    <View style={styles.figures}>
      {shown.map(([n, label]) => (
        <View key={label} style={styles.figure}>
          <Text style={styles.figureN}>{n}</Text>
          <Text style={styles.figureLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Standards({ rows, standing = false }: { rows: StandardRow[] | 'start' | 'none'; standing?: boolean }) {
  if (rows === 'start') return <Text style={styles.note}>Nothing — this is where every journey begins. Your first logged session put you here.</Text>;
  if (rows === 'none') return <Text style={styles.note}>Legacy is the last rank. The steps past Legacy · I aren’t defined yet.</Text>;
  return (
    <View>
      {rows.map((r, i) => (
        <View key={r.key} style={[styles.row, i > 0 && styles.rowRule]}>
          <View style={[styles.mark, r.met ? styles.markMet : null]}>
            {r.met ? (
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={flColor.onBronze} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12.5l4.5 4.5L19 7.5" />
              </Svg>
            ) : null}
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            {r.detail ? <Text style={styles.rowDetail}>{r.detail}</Text> : null}
          </View>
          <Text style={[styles.rowValue, !r.met && standing && styles.rowValueShort]}>
            {r.have != null ? `${r.have} / ${r.need}` : `${r.need}`}
            {r.unit ? ` ${r.unit}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SeeAll({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="See every rank" hitSlop={6} style={styles.seeAll}>
      <Text style={styles.seeAllText}>See every rank →</Text>
    </Pressable>
  );
}

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingTop: 10 },
  headBadge: { width: 48, alignItems: 'center' },
  headText: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronzeInk },
  eyebrowAhead: { color: flColor.gray600 },
  title: { fontFamily: flFont.display, fontSize: 24, lineHeight: 28, fontWeight: '600', color: flColor.cream100 },
  saying: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 19, color: flColor.bronze300 },
  sayingAhead: { color: flColor.gray400 },
  close: {
    alignSelf: 'flex-start',
    width: 34,
    height: 34,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { paddingVertical: 36, alignItems: 'center' },
  body: { gap: 10, paddingBottom: 6 },
  section: { marginTop: 10, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronzeInk },
  figures: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  figure: { width: '33.33%', gap: 2 },
  figureN: { fontFamily: flFont.display, fontSize: 22, lineHeight: 26, fontWeight: '600', color: flColor.cream100 },
  figureLabel: { fontSize: 11.5, color: flColor.gray400 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 10 },
  rowRule: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  mark: {
    marginTop: 2,
    width: 17,
    height: 17,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markMet: { borderColor: flColor.bronzeSolid, backgroundColor: flColor.bronzeSolid },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  rowDetail: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },
  rowValue: { marginTop: 1, fontSize: 13, fontWeight: '600', color: flColor.gray400, fontVariant: ['tabular-nums'] },
  rowValueShort: { color: flColor.cream100 },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  sessionPressed: { opacity: 0.85, borderColor: flColor.bronzeBorder },
  sessionText: { flex: 1, minWidth: 0, gap: 2 },
  sessionName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  sessionDate: { fontSize: 12, color: flColor.gray400 },
  note: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  seeAll: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6 },
  seeAllText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 13, color: flColor.bronzeInk },
});
