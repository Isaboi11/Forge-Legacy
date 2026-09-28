import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { HoltMark } from '@/components/forge/HoltMark';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { fetchRecapCheers, setRecapCheer, type WeeklyRecap } from '@/data/squad-feed-live';
import { buildWeekStory, type Chip, type Seg, type ShoutOut, type StoryFacts } from '@/domain/squad/week-story';
import { useHaptics } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';

/**
 * ══ THE WEEK, TOLD AS A STORY — Squad-Architecture-Amendment-008 ══
 *
 * PO, 2026-09-28: *"How can we tell a story of the week? Shout people out? Help everyone feel amazing that
 * they contributed?"* Built to the approved mockup (https://claude.ai/artifact/C2coURw351Dggbq4eTSKYE):
 * Holt's opening → the together number → the goal built from everyone's piece → a shout-out for each
 * person who trained (A→Z, never ranked) → trained-together moments → an open door to next week.
 *
 * Every word comes from `buildWeekStory`; this file only draws it. See that file for the rules the words
 * keep (no ranking, nobody called out, the squad's own goal title, a slow week never scolded).
 */

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** Bronze, light to deep — the goal bar reads as ONE squad, not a rainbow of individuals. */
const TONES = ['#E2B98C', '#D4A574', '#C99767', '#BA8654', '#A8764A', '#94663F', '#7F5634'];

export function WeekStoryView({
  postId,
  recap,
  facts,
  meId,
  onStartWorkout,
}: {
  postId: string;
  recap: WeeklyRecap;
  facts: StoryFacts;
  meId: string | null;
  onStartWorkout: () => void;
}) {
  const story = useMemo(() => buildWeekStory(recap, facts), [recap, facts]);
  const haptics = useHaptics();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [piece, setPiece] = useState<string | null>(null);

  const { data: cheers } = useQuery(useCallback(() => fetchRecapCheers(postId), [postId]), [postId]);
  /* A tap shows at once; the write follows. `mine` flips back if the write did not land. */
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const cheerOf = (id: string) => {
    const server = cheers?.[id] ?? { count: 0, mine: false };
    const mine = local[id] ?? server.mine;
    return { mine, count: server.count - (server.mine ? 1 : 0) + (mine ? 1 : 0) };
  };
  const toggleCheer = (id: string) => {
    const next = !cheerOf(id).mine;
    setLocal((l) => ({ ...l, [id]: next }));
    if (next) haptics.light();
    void setRecapCheer(postId, id, next).then((ok) => {
      if (!ok) setLocal((l) => ({ ...l, [id]: !next }));
    });
  };

  const goal = story.goal;
  const picked = goal?.pieces.find((p) => p.id === piece) ?? null;

  return (
    <View style={styles.stack}>
      {/* ── Holt's opening ── */}
      <View style={styles.open}>
        <View style={styles.holtRow}>
          <HoltMark size={34} />
          <Text style={styles.eyebrow}>COACH HOLT</Text>
        </View>
        <Text style={styles.headline}>
          {story.headline.lead}, <Text style={styles.headlineEm}>{story.headline.em}</Text>
        </Text>
        <Text style={styles.body}>{story.body}</Text>
      </View>

      {/* ── together ── */}
      <View style={styles.together}>
        <Text style={styles.eyebrow}>TOGETHER THIS WEEK</Text>
        <Text style={styles.big}>
          {story.together.value}
          <Text style={styles.bigUnit}> {story.together.unit}</Text>
        </Text>
        {story.together.compare ? <Text style={styles.compare}>{story.together.compare}</Text> : null}
        <View style={styles.facts}>
          {story.facts.map((f) => (
            <Text key={f.text} style={[styles.fact, f.up && styles.factUp]}>
              {f.text}
            </Text>
          ))}
        </View>
      </View>

      {/* ── the goal, built from everyone's piece ── */}
      {goal ? (
        <View style={styles.card}>
          <View style={styles.goalHead}>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>SQUAD GOAL</Text>
              <Text style={styles.goalName}>{goal.title}</Text>
            </View>
            <Text style={styles.goalPct}>{goal.pct}%</Text>
          </View>
          <View style={styles.bar} accessibilityLabel={`${goal.title}: ${goal.pctBefore}% before this week, ${goal.pct}% now`}>
            <View style={[styles.barBefore, { flex: Math.max(0, goal.before) }]} />
            {goal.pieces.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => setPiece(p.id === piece ? null : p.id)}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}: ${p.value} ${goal.unit}`}
                style={[styles.barPiece, { flex: p.value, backgroundColor: TONES[i % TONES.length] }, piece === p.id && styles.barPiecePicked]}
              />
            ))}
            <View style={{ flex: Math.max(0, goal.target - goal.after) }} />
          </View>
          <Text style={styles.legend}>
            {picked ? (
              <>
                <Text style={styles.legendStrong}>{picked.name}</Text> added <Text style={styles.legendStrong}>{fmt(picked.value)} {goal.unit}</Text> this week.
              </>
            ) : (
              <>
                Grey is where the squad started the week. <Text style={styles.legendStrong}>Every bronze piece is someone&apos;s part of this week.</Text> Tap one.
              </>
            )}
          </Text>
        </View>
      ) : null}

      {/* ── everyone who showed up ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.eyebrow}>EVERYONE WHO SHOWED UP</Text>
        <Text style={styles.sectionNote}>A to Z · tap for their week</Text>
      </View>
      <View style={styles.roll}>
        {story.shoutOuts.map((s) => (
          <ShoutOutCard
            key={s.id}
            s={s}
            unit={goal?.unit ?? null}
            open={!!open[s.id]}
            onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
            cheer={s.id === meId ? null : cheerOf(s.id)}
            onCheer={() => toggleCheer(s.id)}
          />
        ))}
      </View>

      {story.moments.map((m) => (
        <View key={m} style={styles.moment}>
          <EngravedIcon name="people" size={18} color={flColor.bronze300} />
          <Text style={styles.momentText}>{m}</Text>
        </View>
      ))}

      {/* ── the open door ── */}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>NEXT WEEK</Text>
        <Text style={styles.closeTitle}>{story.close.title}</Text>
        <Text style={styles.body}>{story.close.body}</Text>
        <View style={styles.closeCta}>
          <Button variant="primary" fullWidth onPress={onStartWorkout} accessibilityLabel="Start a workout">
            Start a workout
          </Button>
        </View>
      </View>

      <Text style={styles.footer}>Everyone who trained, A to Z. No one is ranked here.</Text>
    </View>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10).toLocaleString('en-US');

const CHIP_TINT: Record<Chip, string> = {
  comeback: flColor.greenMuted,
  welcome: flColor.bronze300,
  first: flColor.bronze300,
  best: flColor.bronze300,
  streak: flColor.emberFlame,
  honor: flColor.bronze300,
  showed: flColor.gray400,
};

function ShoutOutCard({
  s,
  unit,
  open,
  onToggle,
  cheer,
  onCheer,
}: {
  s: ShoutOut;
  unit: string | null;
  open: boolean;
  onToggle: () => void;
  cheer: { mine: boolean; count: number } | null;
  onCheer: () => void;
}) {
  const tint = CHIP_TINT[s.chip];
  return (
    <View style={styles.who}>
      {/* The card body and the flame are SIBLINGS — a pressable inside a pressable eats the touch on web. */}
      <View style={styles.whoTop}>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${s.name}: ${s.chipLabel}`} style={styles.whoMain}>
          <Avatar name={s.name} size={40} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={[styles.chip, { color: tint, borderColor: tint }]}>{s.chipLabel.toUpperCase()}</Text>
            </View>
            <Text style={styles.line}>
              {s.line.map((seg: Seg, i) => (
                <Text key={i} style={seg.b ? styles.lineBold : null}>
                  {seg.t}
                </Text>
              ))}
            </Text>
          </View>
        </Pressable>
        {cheer ? (
          <Pressable
            onPress={onCheer}
            accessibilityRole="button"
            accessibilityState={{ selected: cheer.mine }}
            accessibilityLabel={cheer.mine ? `Take back your cheer for ${s.name}` : `Cheer ${s.name}`}
            hitSlop={6}
            style={[styles.fire, cheer.mine && styles.fireOn]}
          >
            <EngravedIcon name="flame" size={15} color={cheer.mine ? flColor.emberFlame : flColor.gray400} />
            {cheer.count > 0 ? <Text style={[styles.fireCount, cheer.mine && styles.fireCountOn]}>{cheer.count}</Text> : null}
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <View style={styles.more}>
          <View style={styles.days}>
            {s.week.map((on, i) => (
              <View key={i} style={styles.day}>
                <View style={[styles.dayBar, on && styles.dayBarOn]} />
                <Text style={styles.dayLabel}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.moreLine}>
            {s.detail}
            {s.goal != null && s.goal > 0 && unit ? (
              <>
                {' · '}
                <Text style={styles.lineBold}>
                  {fmt(s.goal)} {unit}
                </Text>{' '}
                toward the squad goal
              </>
            ) : null}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, color: flColor.labelInk },

  open: { gap: 12, padding: 18, borderRadius: flRadius.xl, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.card },
  holtRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headline: { fontFamily: flFont.display, fontSize: 25, lineHeight: 30, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  headlineEm: { fontStyle: 'italic', color: flColor.bronze300 },
  body: { fontSize: 15, lineHeight: 22, color: flColor.gray400 },

  together: { gap: 4, paddingHorizontal: 2, paddingVertical: 4 },
  big: { fontFamily: flFont.display, fontSize: 42, lineHeight: 48, fontWeight: '700', letterSpacing: -0.6, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  bigUnit: { fontFamily: flFont.sans, fontSize: 16, fontWeight: '600', letterSpacing: 0, color: flColor.gray400 },
  compare: { fontSize: 15, lineHeight: 21, color: flColor.cream100 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 4 },
  fact: { fontSize: 12.5, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  factUp: { color: flColor.greenMuted, fontWeight: '600' },

  card: { gap: 10, padding: 16, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal700 },
  goalHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  goalName: { marginTop: 3, fontFamily: flFont.display, fontSize: 16, lineHeight: 21, fontWeight: '600', color: flColor.cream100 },
  goalPct: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: flColor.charcoal700 },
  barBefore: { backgroundColor: flColor.charcoal500 },
  barPiece: { borderRightWidth: 1.5, borderRightColor: flColor.charcoal800 },
  barPiecePicked: { opacity: 0.7 },
  legend: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, minHeight: 36 },
  legendStrong: { color: flColor.cream100, fontWeight: '600' },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 6, paddingHorizontal: 2 },
  sectionNote: { fontSize: 11.5, color: flColor.gray600 },
  roll: { gap: 8 },

  who: { gap: 10, padding: 14, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal700 },
  whoTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whoMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  chip: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, overflow: 'hidden' },
  line: { marginTop: 3, fontSize: 14, lineHeight: 19.5, color: flColor.gray400 },
  lineBold: { color: flColor.cream100, fontWeight: '600' },
  fire: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  fireOn: { borderColor: flColor.emberFlame, backgroundColor: 'rgba(224, 145, 63, 0.10)' },
  fireCount: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400, fontVariant: ['tabular-nums'] },
  fireCountOn: { color: flColor.emberFlame },
  more: { gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  dayBar: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: flColor.charcoal700 },
  dayBarOn: { backgroundColor: flColor.bronze400 },
  dayLabel: { fontSize: 10, color: flColor.gray600 },
  moreLine: { fontSize: 13, lineHeight: 18, color: flColor.gray400 },

  moment: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: flRadius.lg, backgroundColor: flColor.bronzeTint },
  momentText: { flex: 1, fontSize: 14, lineHeight: 20, color: flColor.cream100 },

  closeTitle: { fontFamily: flFont.display, fontSize: 20, lineHeight: 26, fontWeight: '600', color: flColor.cream100 },
  closeCta: { marginTop: 4 },
  footer: { marginTop: 8, textAlign: 'center', fontSize: 11, letterSpacing: 0.6, color: flColor.charcoal500 },
});
