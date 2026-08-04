import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { fetchSquadGoalDetail, GOAL_UNITS, type GoalContribution } from '@/data/squad-live';
import { barPct, milestones, pctOf, projectedClose, recentPace, sharePct } from '@/domain/squad/goal-progress';
import { useQuery } from '@/lib/useQuery';

/**
 * S-2b Squad Goal Detail — built to `Squad Goal Detail.dc.html` (Design `b029488a`).
 *
 * ══ WHAT IT IS ══
 *
 * The squad goal had exactly one surface: a three-line card on Squad Detail whose only tap target was
 * "edit". The number moved and nobody could ask why. This is the whole answer — the goal, the pace, who
 * has done what, the last eight weeks, the waypoints between here and done, what moved it recently, and
 * what happens when it closes.
 *
 * ══ ⚠ IT REVERSES A LOCKED DECISION, DELIBERATELY ══
 *
 * `Squad-System-Architecture-v1.0` **SQ-D3.4** locks squad goal progress as aggregate-only, never a
 * per-member leaderboard. The Contribution section is exactly that: members, ranked, with bars. The
 * design answers the objection in its own copy — *"Contribution is a record of work, not a ranking.
 * Nobody is behind."* — and per **PD-7 (design governs, docs corrected)** the design wins.
 *
 * That is a product decision, not an oversight, and it is recorded as one in
 * `Docs/Amendments/Squad-Architecture-Amendment-004-Goal-Detail-Screen.md` — which also supersedes
 * SQ-D3.2: setting and editing a goal is the owner's action (SQ-A4-D5). The anti-shame guardrails it
 * has to live beside are honoured in the details: no rank numbers, no "behind", no arrows, no callout of
 * the smallest contributor, and the closing line is on the card rather than in a tooltip nobody opens.
 *
 * ══ EVERY NUMBER IS EITHER REAL OR ABSENT ══
 *
 * Pace, projection and milestone dates come from `domain/squad/goal-progress` and each returns null
 * rather than a placeholder: a squad with no completed week has no pace, a squad with no pace has no
 * projected close, and a milestone crossed before the eight-week window has no date. Those render as
 * "—", never as a confident, specific, false claim.
 */

const METRIC_LABEL: Record<string, string> = {
  workout_count: 'workouts',
  distance_total: 'miles',
  volume_total: 'lb of volume',
  time_total: 'hours',
  pr_count: 'personal records',
};

/** A goal figure, in the metric's own units — never a bare number that could be anything. */
function fmtValue(v: number, kind: string): string {
  if (kind === 'workout_count' || kind === 'pr_count') return String(Math.round(v));
  if (kind === 'volume_total') return Math.round(v).toLocaleString('en-US');
  return (Math.round(v * 10) / 10).toString();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const monthOf = (d: Date) => `${MONTHS[d.getMonth()]}`;

export default function SquadGoalScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const squadId = id ?? '';
  const { data, loading, error, refetch } = useQuery(() => fetchSquadGoalDetail(squadId), [squadId]);

  // Logging a workout elsewhere moves this number; coming back must show that.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/squad/[id]', params: { id: squadId } }));

  /*
   * ⚠ `loading` ALONE. It used to read `loading || (!data && !error)`, and that second clause was a trap:
   * a query that legitimately resolves to NULL leaves `{ data: null, loading: false, error: null }`, which
   * satisfies it — so the screen spun forever instead of ever reaching the not-found branch below, which
   * became unreachable. From the outside that is indistinguishable from the screen refusing to open.
   *
   * `useQuery` starts with `loading: true`, so there is no flash of "not found" before the first fetch.
   */
  if (loading) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Couldn’t load this goal</Text>
          {/* `useQuery` hands back a string it has already made readable — showing it verbatim is the
              difference between "something went wrong" and a message you can act on. */}
          <Text style={styles.emptyBody}>{error}</Text>
        </View>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Goal not found</Text>
          <Text style={styles.emptyBody}>This squad may have been deleted, or it isn’t one you can see.</Text>
        </View>
      </Shell>
    );
  }

  /*
   * A squad with NO GOAL SET is an ordinary state, not a failure — and it is not the same thing as a
   * squad you cannot see. Without this the hero rendered "0 / 0 · 0%" over an empty rail, which is a
   * confident claim about a goal that does not exist.
   */
  if (data.target == null) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No goal yet</Text>
          <Text style={styles.emptyBody}>
            {data.isOwner
              ? `${data.squadName} hasn’t set a goal. Set one from the squad’s page and its progress will show up here.`
              : `${data.squadName} hasn’t set a goal yet.`}
          </Text>
        </View>
      </Shell>
    );
  }

  const target = data.target;
  const done = data.total;
  const unit = GOAL_UNITS[data.metricKind];
  const pct = pctOf(done, target);
  const completed = target > 0 && done >= target;
  const remaining = Math.max(0, target - done);

  const pace = recentPace(data.weeks);
  const close = projectedClose(done, target, pace, new Date());
  const stones = milestones(target, done, data.weeks);
  const top = data.contributions.reduce((m, c) => Math.max(m, c.value), 0);
  const weekMax = data.weeks.reduce((m, w) => Math.max(m, w.value), 0);

  return (
    <Shell
      onBack={goBack}
      action={
        /*
         * OWNER ONLY — SQ-A4-D5 (PO decision 2026-08-03), which supersedes SQ-D3.2's "any member".
         *
         * A goal is longer-lived and more consequential than a squad's name: one runs at a time, and
         * changing it mid-flight resets what everybody is working toward. It is also what the database
         * has always enforced — `squads_update` (0029) is `owner_id = auth.uid()`, and `setSquadGoal`
         * writes the `squads` row directly, so a member's edit would have been rejected server-side.
         * That policy stays at its narrowest: opening it would also expose the squad's name, privacy
         * and crest, which nothing asked for.
         *
         * Members still see the goal, their own contribution and everyone else's. They just don't set it.
         */
        !completed && data.isOwner ? (
          <Pressable
            onPress={() => router.replace({ pathname: '/squad/[id]', params: { id: squadId, editGoal: '1' } })}
            accessibilityRole="button"
            accessibilityLabel="Edit goal"
            hitSlop={8}
            style={styles.barBtn}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </Svg>
          </Pressable>
        ) : undefined
      }
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ═══ HERO ═══ */}
        <View style={styles.hero}>
          <LinearGradient colors={['rgba(181,138,97,0.09)', 'transparent']} locations={[0, 0.68]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={styles.heroKicker}>
            <TargetGlyph size={15} />
            <Text style={styles.kickerText}>
              {completed ? 'Goal Complete' : 'Current Goal'} · {data.squadName}
            </Text>
          </View>
          <Text style={styles.goalTitle}>{data.goal?.trim() || 'A goal, together'}</Text>

          <View style={styles.figures}>
            <Text style={styles.done}>{fmtValue(done, data.metricKind)}</Text>
            <Text style={styles.of}>/ {fmtValue(target, data.metricKind)}</Text>
            <Text style={styles.pct}>{pct}%</Text>
          </View>

          <View style={styles.bar}>
            <LinearGradient
              colors={flGradient.bronzeMetallic.colors}
              locations={flGradient.bronzeMetallic.locations}
              start={flGradient.bronzeMetallic.start}
              end={flGradient.bronzeMetallic.end}
              style={[styles.barFill, { width: `${pct}%` }]}
            />
          </View>
          <Text style={styles.remaining}>
            {completed
              ? `Reached · ${fmtValue(target, data.metricKind)} ${unit} logged together`
              : pace != null && pace > 0
                ? `${fmtValue(remaining, data.metricKind)} ${unit} to go · ${data.squadName} logs about ${fmtValue(pace, data.metricKind)} a week`
                : `${fmtValue(remaining, data.metricKind)} ${unit} to go`}
          </Text>
        </View>

        {/* ═══ PACE ═══ */}
        <View style={styles.pace}>
          <PaceCell icon={<CalendarGlyph />} value={shortDate(data.startedAt) ?? '—'} label="Started" divider />
          <PaceCell icon={<FlameGlyph />} value={pace != null ? `${fmtValue(pace, data.metricKind)} / wk` : '—'} label="Recent Pace" divider />
          <PaceCell
            icon={<TargetGlyph size={20} />}
            value={completed ? 'Closed' : close ? `${monthOf(close)} ${close.getDate()}` : '—'}
            label={completed ? 'Goal Complete' : 'Projected Close'}
          />
        </View>
        <Text style={styles.paceNote}>
          {completed
            ? 'Completed goals stay in the squad record. Every member contributed to this one.'
            : close
              ? `At the squad’s recent pace this closes around ${monthOf(close)} ${close.getDate()}. Progress only moves forward — a quiet week slows it, nothing takes it back.`
              : 'There isn’t enough recent work to project a close yet. Progress only moves forward — a quiet week slows it, nothing takes it back.'}
        </Text>

        {/* ═══ CONTRIBUTION ═══ */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Contribution</Text>
          <Text style={styles.sectionMeta}>
            {data.memberCount} {data.memberCount === 1 ? 'member' : 'members'} · {fmtValue(done, data.metricKind)} {unit}
          </Text>
        </View>
        <View style={styles.contribCard}>
          {data.contributions.map((c, i) => (
            <ContribRow
              key={c.athleteId}
              c={c}
              kind={data.metricKind}
              total={done}
              top={top}
              last={i === data.contributions.length - 1}
              onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: c.athleteId } })}
            />
          ))}
          {data.contributions.length === 0 ? <Text style={styles.emptyRow}>No members yet.</Text> : null}
        </View>
        {/* The design's own line, verbatim. It is the whole reason this section is allowed to exist. */}
        <Text style={styles.contribNote}>Contribution is a record of work, not a ranking. Nobody is behind.</Text>

        {/* ═══ WEEKLY RHYTHM ═══ */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Weekly Rhythm</Text>
          <Text style={styles.sectionMeta}>Last {data.weeks.length} weeks</Text>
        </View>
        <View style={styles.rhythm}>
          <View style={styles.bars}>
            {data.weeks.map((w, i) => {
              const current = i === data.weeks.length - 1;
              const h = weekMax > 0 ? Math.max(10, Math.round((w.value / weekMax) * 72)) : 10;
              return (
                <View key={w.weekStart} style={styles.barCol}>
                  <Text style={[styles.barNum, current && styles.barNumOn]}>{fmtValue(w.value, data.metricKind)}</Text>
                  {current ? (
                    <LinearGradient
                      colors={flGradient.bronzeMetallic.colors}
                      locations={flGradient.bronzeMetallic.locations}
                      start={flGradient.bronzeMetallic.start}
                      end={flGradient.bronzeMetallic.end}
                      style={[styles.weekBar, { height: h }]}
                    />
                  ) : (
                    <View style={[styles.weekBar, styles.weekBarOff, { height: h }]} />
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.barLabels}>
            {data.weeks.map((w) => (
              <Text key={w.weekStart} style={styles.barLabel}>
                {shortDate(w.weekStart)}
              </Text>
            ))}
          </View>
        </View>

        {/* ═══ MILESTONES ═══ */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Milestones</Text>
        </View>
        <View>
          {stones.map((m, i) => {
            const last = i === stones.length - 1;
            return (
              <View key={m.value} style={styles.mileRow}>
                <View style={styles.mileRail}>
                  <View style={[styles.mileDot, m.reached && styles.mileDotOn]}>
                    {m.reached ? (
                      <CheckGlyph color="#1A1206" />
                    ) : m.isTarget ? (
                      <MedalGlyph />
                    ) : (
                      <TargetGlyph size={14} color={flColor.gray600} />
                    )}
                  </View>
                  {!last ? <View style={[styles.mileLine, m.reached && styles.mileLineOn]} /> : null}
                </View>
                <View style={[styles.mileBody, !last && styles.mileBodyPad]}>
                  <Text style={[styles.mileTitle, m.reached && styles.mileTitleOn]}>
                    {fmtValue(m.value, data.metricKind)} {unit}
                  </Text>
                  <Text style={styles.mileMeta}>
                    {m.reached
                      ? m.crossedAt
                        ? `Crossed ${shortDate(m.crossedAt)}`
                        : 'Crossed'
                      : m.isTarget
                        ? 'The goal closes · Honor awarded to the squad'
                        : 'Ahead'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ═══ RECENT PROGRESS ═══ */}
        {data.events.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Recent Progress</Text>
            </View>
            <View style={styles.eventList}>
              {data.events.map((e) => (
                <Pressable
                  key={e.workoutId}
                  onPress={() => router.push({ pathname: '/activity/[id]', params: { id: e.workoutId } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${e.who} logged ${e.name ?? 'a workout'}`}
                  style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}
                >
                  <View style={styles.eventIcon}>
                    <DumbbellGlyph />
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventText} numberOfLines={1}>
                      <Text style={styles.eventWho}>{e.isSelf ? 'You' : e.who}</Text> logged {e.name?.trim() || 'a workout'}.
                    </Text>
                    <Text style={styles.eventTime}>{shortDate(e.at)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* ═══ WHAT HAPPENS WHEN IT CLOSES ═══ */}
        <View style={styles.closeCard}>
          <LinearGradient colors={['rgba(181,138,97,0.07)', 'transparent']} locations={[0, 0.58]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Text style={styles.closeLabel}>{completed ? 'Recorded' : 'When this closes'}</Text>
          <Text style={styles.closeTitle}>{completed ? 'Sealed into the squad’s record.' : 'The squad earns an Honor, and the goal is kept.'}</Text>
          <Text style={styles.closeBody}>
            {completed
              ? 'The goal, its final count, and every member’s contribution are permanent. It sits in the squad record next to the competitions and titles.'
              : `Reaching ${fmtValue(target, data.metricKind)} ${METRIC_LABEL[data.metricKind] ?? unit} awards the squad Honor for a completed goal and files this goal in the squad’s record with its final count. Then you set the next one.`}
          </Text>
        </View>

        {/* ═══ PAST GOALS ═══ */}
        {data.past.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Past Goals</Text>
              <Text style={styles.sectionMeta}>{data.past.length} completed</Text>
            </View>
            <View style={styles.eventList}>
              {data.past.map((h) => (
                <View key={`${h.startedAt}`} style={styles.pastRow}>
                  <View style={styles.eventIcon}>
                    <MedalGlyph />
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.pastTitle} numberOfLines={1}>
                      {h.goal?.trim() || `${h.target} ${GOAL_UNITS[h.metricKind]}`}
                    </Text>
                    <Text style={styles.eventTime}>
                      Completed {shortDate(h.completedAt)} · {h.target} {GOAL_UNITS[h.metricKind]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Shell>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

function Shell({ children, onBack, action }: { children: React.ReactNode; onBack: () => void; action?: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title="Squad Goal" onBack={onBack} actions={action} />
      {children}
    </View>
  );
}

function PaceCell({ icon, value, label, divider }: { icon: React.ReactNode; value: string; label: string; divider?: boolean }) {
  return (
    <View style={[styles.paceCell, divider && styles.paceCellDiv]}>
      {icon}
      <Text style={styles.paceValue}>{value}</Text>
      <Text style={styles.paceLabel}>{label}</Text>
    </View>
  );
}

function ContribRow({
  c,
  kind,
  total,
  top,
  last,
  onPress,
}: {
  c: GoalContribution;
  kind: string;
  total: number;
  top: number;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${fmtValue(c.value, kind)}`}
      style={({ pressed }) => [styles.contribRow, !last && styles.contribRowDiv, pressed && styles.pressed]}
    >
      <Avatar src={c.avatarUrl ?? undefined} name={c.name} size={40} />
      <View style={styles.contribBody}>
        <View style={styles.contribTop}>
          <Text style={styles.contribName} numberOfLines={1}>
            {c.name}
            {c.isSelf ? ' (You)' : ''}
          </Text>
          <Text style={[styles.contribValue, c.isSelf && styles.contribValueSelf]}>{fmtValue(c.value, kind)}</Text>
        </View>
        <View style={styles.contribTrack}>
          {c.isSelf ? (
            <LinearGradient
              colors={flGradient.bronzeMetallic.colors}
              locations={flGradient.bronzeMetallic.locations}
              start={flGradient.bronzeMetallic.start}
              end={flGradient.bronzeMetallic.end}
              style={[styles.contribFill, { width: `${barPct(c.value, top)}%` }]}
            />
          ) : (
            <View style={[styles.contribFill, styles.contribFillOther, { width: `${barPct(c.value, top)}%` }]} />
          )}
        </View>
        <Text style={styles.contribShare}>
          {sharePct(c.value, total)}% of the work so far{c.isSelf ? ' · your work' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const stroke = { fill: 'none' as const, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function TargetGlyph({ size = 15, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Circle cx={12} cy={12} r={8.5} />
      <Circle cx={12} cy={12} r={4.6} />
      <Circle cx={12} cy={12} r={1.2} fill={color} stroke="none" />
    </Svg>
  );
}
function FlameGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" stroke={flColor.bronze400} {...stroke}>
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function CalendarGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" stroke={flColor.bronze400} {...stroke}>
      <Path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />
    </Svg>
  );
}
function MedalGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" stroke={flColor.bronze400} {...stroke}>
      <Circle cx={12} cy={14.5} r={4.8} />
      <Circle cx={12} cy={14.5} r={1.8} />
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
    </Svg>
  );
}
function CheckGlyph({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function DumbbellGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" stroke={flColor.bronze300} {...stroke}>
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, color: flColor.gray400, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  barBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.82 },

  hero: { marginHorizontal: -16, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 24, position: 'relative' },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  kickerText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  goalTitle: { fontFamily: flFont.display, fontSize: 27, fontWeight: '600', color: flColor.cream100, lineHeight: 32, marginTop: 12 },
  figures: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginTop: 20 },
  done: { fontFamily: flFont.display, fontSize: 46, fontWeight: '700', letterSpacing: -1.2, color: flColor.cream100, lineHeight: 46 },
  of: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.gray600, paddingBottom: 4 },
  pct: { marginLeft: 'auto', fontFamily: flFont.display, fontSize: 22, fontWeight: '700', color: flColor.bronze300, paddingBottom: 4 },
  bar: { marginTop: 14, height: 12, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: flRadius.pill, boxShadow: flShadow.glowSubtle },
  remaining: { fontSize: 12, fontWeight: '500', color: flColor.gray400, marginTop: 10 },

  pace: { flexDirection: 'row', marginTop: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: flColor.charcoal700 },
  paceCell: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 17, paddingHorizontal: 6 },
  paceCellDiv: { borderRightWidth: 1, borderRightColor: flColor.charcoal700 },
  paceValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '700', color: flColor.cream100, textAlign: 'center' },
  paceLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center', lineHeight: 13 },
  paceNote: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400, marginTop: 14, marginHorizontal: 2 },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28, marginBottom: 12, marginHorizontal: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionMeta: { fontSize: 11.5, color: flColor.gray600 },

  contribCard: { backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card, paddingHorizontal: 16 },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 },
  contribRowDiv: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  contribBody: { flex: 1, minWidth: 0 },
  contribTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  contribName: { flex: 1, fontSize: 14.5, color: flColor.cream100 },
  contribValue: { fontFamily: flFont.display, fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  contribValueSelf: { color: flColor.bronze300 },
  contribTrack: { marginTop: 9, height: 5, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  contribFill: { height: '100%', borderRadius: flRadius.pill },
  contribFillOther: { backgroundColor: flColor.bronzeDark },
  contribShare: { fontSize: 11, color: flColor.gray600, marginTop: 6 },
  contribNote: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 11, marginHorizontal: 4 },
  emptyRow: { fontSize: 12.5, color: flColor.gray600, paddingVertical: 16 },

  rhythm: { backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal700, borderRadius: flRadius.lg, boxShadow: flShadow.borderInset, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 13 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8, height: '100%' },
  barNum: { fontSize: 10.5, fontWeight: '600', color: flColor.gray600 },
  barNumOn: { color: flColor.bronze300 },
  weekBar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  weekBarOff: { backgroundColor: '#3A342C' },
  barLabels: { flexDirection: 'row', gap: 8, marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 9.5, letterSpacing: 0.4, color: flColor.gray600 },

  mileRow: { flexDirection: 'row', gap: 14 },
  mileRail: { width: 34, alignItems: 'center' },
  mileDot: { width: 34, height: 34, borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  mileDotOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronze400, boxShadow: flShadow.glowSubtle },
  mileLine: { width: 1, flex: 1, minHeight: 14, backgroundColor: flColor.charcoal700 },
  mileLineOn: { backgroundColor: flColor.bronzeBorder },
  mileBody: { flex: 1, minWidth: 0 },
  mileBodyPad: { paddingBottom: 18 },
  mileTitle: { fontFamily: flFont.display, fontSize: 15.5, fontWeight: '600', color: flColor.gray400, lineHeight: 19 },
  mileTitleOn: { color: flColor.cream100 },
  mileMeta: { fontSize: 11.5, color: flColor.gray600, marginTop: 4 },

  eventList: { gap: 9 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.borderInset, paddingVertical: 12, paddingHorizontal: 14 },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.borderInset, paddingVertical: 12, paddingHorizontal: 14 },
  eventIcon: { width: 32, height: 32, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, alignItems: 'center', justifyContent: 'center' },
  eventBody: { flex: 1, minWidth: 0 },
  eventText: { fontSize: 13.5, lineHeight: 18, color: flColor.cream100 },
  eventWho: { fontWeight: '600' },
  eventTime: { fontSize: 11, color: flColor.gray600, marginTop: 3 },
  pastTitle: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },

  closeCard: { marginTop: 26, paddingVertical: 17, paddingHorizontal: 18, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card, overflow: 'hidden' },
  closeLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  closeTitle: { fontFamily: flFont.display, fontSize: 16.5, fontWeight: '600', color: flColor.cream100, lineHeight: 21, marginTop: 7 },
  closeBody: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400, marginTop: 8 },
});
