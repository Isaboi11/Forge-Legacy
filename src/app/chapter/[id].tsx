import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { HonorInsignia } from '@/components/forge/profile-sections';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchChapterDetail } from '@/data/chapter-detail-live';
import { goalSections, isAchieved, isQuantifiable, progressLabel, progressPct, type Goal } from '@/domain/goals/goals';
import { useQuery } from '@/lib/useQuery';

/**
 * L-3/L-4 Chapter Detail — the chapter overview reached by tapping the chapter on Legacy.
 *
 * Real throughout: header + creed, the chapter's Primary/Supporting goals (0025), Current Programs with
 * live progress, Honors, Chapter Notes (the reflection), and the Timeline. Goals + Current Programs show
 * for the ACTIVE chapter only (a sealed chapter is a record). Seal Chapter (M-5) archives it after a
 * confirm.
 *
 * M-5 sealing is live: "Seal Chapter" opens the reflection ceremony (`chapter/reflect`), which writes the
 * closing reflection and archives the chapter (or "Skip for now" seals without one). A sealed chapter
 * with no reflection offers "Add one now" (the ceremony's post path).
 *
 * DEFERRED (flagged): the Media strip only — no photo/video upload backend yet.
 */

const CHEVRON = 'M9 6l6 6-6 6';
const FLAME = 'M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z';
const CHECK = 'M5 12.5l4 4 10-10';
const DASH = 'M6 12h12';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct 2026" — a goal's expected/target date (0025 `target_date`), month + year. */
function monthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return !y || !m ? iso : `${MONTHS[m - 1]} ${y}`;
}

export default function ChapterDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useQuery(() => fetchChapterDetail(String(id)), [id]);

  if (loading || !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar title="Chapter" serif onBack={() => router.back()} />
        <View style={styles.center}>{loading ? <ActivityIndicator color={flColor.bronze400} /> : <Text style={styles.err}>Chapter not found.</Text>}</View>
      </View>
    );
  }

  const { primary, active: supporting } = goalSections(data.goals);
  const goalCount = data.goals.length;

  // Sealing runs through the M-5 reflection ceremony (write, or "Skip for now") — that screen commits the
  // seal. No native confirm; the ceremony IS the confirmation.
  const goSeal = () => router.push({ pathname: '/chapter/reflect', params: { id: data.id, path: 'sealing' } });
  const goReflect = () => router.push({ pathname: '/chapter/reflect', params: { id: data.id, path: 'post' } });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title={data.number} serif onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* hero */}
        <Text style={styles.eyebrow}>{data.number}</Text>
        <Text style={styles.title}>{data.title}</Text>
        <View style={styles.statusRow}>
          {data.isActive ? <View style={styles.dot} /> : <Glyph d={FLAME} size={14} color={flColor.bronze300} width={1.7} />}
          <Text style={styles.status}>{data.isActive ? 'ACTIVE' : 'SEALED'}</Text>
          <Text style={styles.statusDim}>·</Text>
          <Text style={styles.statusDim}>{data.statusLabel}</Text>
        </View>
        <Text style={styles.creed}>{data.creed}</Text>

        {data.isActive ? (
          <>
            {/* primary goal */}
            {primary ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Primary Goal</Text>
                <Pressable onPress={() => router.push('/goals')} accessibilityRole="button" accessibilityLabel={primary.name} style={styles.primaryCard}>
                  <Text style={styles.primaryName}>{primary.name}</Text>
                  {isQuantifiable(primary) ? (
                    <>
                      <View style={styles.primaryProgRow}>
                        <Text style={styles.primaryPct}>{progressPct(primary)}%</Text>
                        <Text style={styles.primaryVal}>{progressLabel(primary)}</Text>
                      </View>
                      <ProgressBar value={progressPct(primary)} max={100} height={8} />
                    </>
                  ) : (
                    <Text style={styles.narrative}>{isAchieved(primary) ? 'Achieved' : 'In progress'}</Text>
                  )}
                  <View style={styles.viewGoalRow}>
                    {primary.targetDate ? <Text style={styles.expected}>Expected by {monthYear(primary.targetDate)}</Text> : <View />}
                    <View style={styles.viewGoalLink}>
                      <Text style={styles.viewGoal}>View Goal</Text>
                      <Glyph d={CHEVRON} size={14} color={flColor.bronze400} width={2} />
                    </View>
                  </View>
                </Pressable>
              </View>
            ) : null}

            {/* supporting goals */}
            {supporting.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Supporting Goals</Text>
                {supporting.map((g) => (
                  <SupportingRow key={g.id} goal={g} onPress={() => router.push('/goals')} />
                ))}
              </View>
            ) : null}

            {goalCount > 0 ? (
              <Pressable onPress={() => router.push('/goals')} accessibilityRole="button" accessibilityLabel="All goals" style={styles.allRow}>
                <Text style={styles.allText}>
                  {goalCount} {goalCount === 1 ? 'Goal' : 'Goals'}
                </Text>
                <Glyph d={CHEVRON} size={15} color={flColor.bronze400} width={2} />
              </Pressable>
            ) : null}

            {/* current programs */}
            {data.programs.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Current Programs</Text>
                {data.programs.map((p) => (
                  <Pressable key={p.id} onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })} accessibilityRole="button" accessibilityLabel={p.name} style={styles.programRow}>
                    <View style={styles.programHead}>
                      <View style={styles.programIcon}>
                        <ForgeSymbol name="dumbbell" size={16} color={flColor.bronze300} />
                      </View>
                      <Text style={styles.programName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.programCount}>
                        {p.completed} / {p.total}
                      </Text>
                    </View>
                    <ProgressBar value={p.completed} max={Math.max(1, p.total)} height={6} />
                    {p.nextLabel ? <Text style={styles.programNext}>{p.nextLabel}</Text> : null}
                  </Pressable>
                ))}
                <View style={styles.workoutTally}>
                  <Text style={styles.tallyNum}>{data.workoutCount}</Text>
                  <View>
                    <Text style={styles.tallyLabel}>Workouts completed</Text>
                    <Text style={styles.tallySub}>this chapter</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {/* ── SEALED RECORD (L-4) ── */}
            {/* This Chapter · outcome summary */}
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>This Chapter</Text>
              <View style={styles.outcomeCard}>
                <View style={styles.outcomeHead}>
                  <Glyph d={CHECK} size={18} color={flColor.bronze300} width={2.4} />
                  <Text style={styles.outcomeHeadline}>{data.outcomeHeadline}</Text>
                </View>
                <View style={styles.statGrid}>
                  {data.outcomeStats.map((st) => (
                    <View key={st.label} style={styles.statCell}>
                      <Text style={styles.statValue}>{st.value}</Text>
                      <Text style={styles.statLabel}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Goal Outcomes */}
            {data.goals.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Goal Outcomes</Text>
                {data.goals.map((g) => {
                  const done = isAchieved(g);
                  return (
                    <View key={g.id} style={styles.outcomeRow}>
                      <Glyph d={done ? CHECK : DASH} size={16} color={done ? '#5FA271' : flColor.gray600} width={2.2} />
                      <Text style={[styles.outcomeName, !done && styles.outcomeUndone]} numberOfLines={1}>
                        {g.name}
                        {g.isPrimary ? ' · Primary' : ''}
                      </Text>
                      <Text style={done ? styles.outcomeDone : styles.outcomeMiss}>{done ? 'Achieved' : 'Not achieved'}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Reflection · centerpiece */}
            {data.reflection ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Reflection</Text>
                <View style={styles.reflectionCard}>
                  <Text style={styles.quoteMark}>&ldquo;</Text>
                  <Text style={styles.reflectionBody}>{data.reflection}</Text>
                  {data.sealedDateLabel ? <Text style={styles.reflectionMeta}>Written · {data.sealedDateLabel}</Text> : null}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Pressable onPress={goReflect} accessibilityRole="button" accessibilityLabel="Add a reflection" style={styles.addReflection}>
                  <Text style={styles.addReflectionText}>No reflection was written for this chapter. Add one now.</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* honors */}
        {data.honors.length ? (
          <View style={styles.section}>
            <SectionHeader label="Honors" action="View all" onAction={() => router.push('/honors')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.honorStrip}>
              {data.honors.slice(0, 6).map((h) => (
                <HonorInsignia key={h.id} honor={h} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* chapter notes — active only; a sealed chapter shows its Reflection centerpiece instead */}
        {data.isActive && data.reflection ? (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Chapter Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notes}>&ldquo;{data.reflection}&rdquo;</Text>
            </View>
          </View>
        ) : null}

        {/* timeline */}
        {data.timeline.length ? (
          <View style={styles.section}>
            <SectionHeader label="Timeline" />
            {data.timeline.slice(0, 4).map((e) => (
              <View key={e.id} style={styles.tlRow}>
                <View style={styles.tlDot} />
                <View style={styles.tlText}>
                  <Text style={styles.tlName}>{e.objectName}</Text>
                  <Text style={styles.tlType}>{e.eventType}</Text>
                </View>
                <Text style={styles.tlDate}>{e.dateLabel}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* seal */}
        {data.isActive ? (
          <View style={styles.sealBlock}>
            <Text style={styles.sealCopy}>You&rsquo;ve built everything this chapter contains. When you&rsquo;re ready, seal it permanently.</Text>
            <Button variant="primary" fullWidth onPress={goSeal} accessibilityLabel="Seal chapter">
              <View style={styles.sealInner}>
                <Glyph d={FLAME} size={16} color="#F7F5F1" width={1.8} />
                <Text style={styles.sealText}>Seal Chapter</Text>
              </View>
            </Button>
            <Text style={styles.sealNote}>Outcomes become permanent. Memories can still be added later.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SupportingRow({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const done = isAchieved(goal);
  const quant = isQuantifiable(goal);
  const right = quant ? `${progressPct(goal)}%` : done ? 'Achieved' : 'On track';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={goal.name} style={styles.supRow}>
      <View style={styles.supHead}>
        <View style={styles.supDot} />
        <Text style={[styles.supName, done && styles.supDone]} numberOfLines={1}>
          {goal.name}
        </Text>
        <Text style={styles.supRight}>{right}</Text>
      </View>
      {quant ? (
        <View style={styles.supBar}>
          <ProgressBar value={progressPct(goal)} max={100} height={5} />
          {progressLabel(goal) ? <Text style={styles.supVal}>{progressLabel(goal)}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function Glyph({ d, size = 16, color, width = 1.9 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 14, color: flColor.gray400 },
  body: { paddingHorizontal: 18, paddingTop: 8 },

  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', color: flColor.cream100, marginTop: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5FA271' },
  status: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: flColor.bronze300 },
  statusDim: { fontSize: 12.5, color: flColor.gray600 },
  creed: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 21, color: flColor.gray400, marginTop: 16 },

  section: { marginTop: 30 },
  sectionEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 12 },

  primaryCard: { padding: 18, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(46, 35, 20, 0.42)' },
  primaryName: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100, marginBottom: 14 },
  primaryProgRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  primaryPct: { fontFamily: flFont.display, fontSize: 38, fontWeight: '700', color: flColor.bronze300 },
  primaryVal: { fontSize: 13, color: flColor.gray400, marginBottom: 8 },
  narrative: { fontSize: 13, color: flColor.gray400 },
  viewGoalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  viewGoalLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewGoal: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  expected: { fontSize: 12, color: flColor.gray400 },

  supRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  supHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  supDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: flColor.bronze400 },
  supName: { flex: 1, fontSize: 14, fontWeight: '500', color: flColor.cream100 },
  supDone: { color: flColor.gray400 },
  supRight: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  supBar: { marginTop: 9, marginLeft: 16 },
  supVal: { fontSize: 11.5, color: flColor.gray400, marginTop: 5 },

  allRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  allText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze400 },

  programRow: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, marginBottom: 9 },
  programHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  programIcon: { width: 30, height: 30, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  programName: { flex: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  programCount: { fontSize: 13, fontWeight: '700', color: flColor.bronze400 },
  programNext: { fontSize: 11.5, color: flColor.gray600, marginTop: 8 },
  workoutTally: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, paddingVertical: 14, paddingHorizontal: 14, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.charcoal600 },
  tallyNum: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', color: flColor.cream100 },
  tallyLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400 },
  tallySub: { fontSize: 12, color: flColor.bronze400, marginTop: 2 },

  honorStrip: { gap: 18, paddingVertical: 4, paddingRight: 18 },

  notesCard: { padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, borderLeftWidth: 3, borderLeftColor: flColor.bronzeBorder },
  notes: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 16, lineHeight: 25, color: flColor.cream100 },

  // sealed record (L-4)
  outcomeCard: { padding: 18, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  outcomeHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  outcomeHeadline: { flex: 1, fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: flColor.bronzeBorderSubtle, paddingTop: 14 },
  statCell: { width: '50%', paddingVertical: 8 },
  statValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', color: flColor.bronze300 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', color: flColor.gray400, marginTop: 2 },

  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  outcomeName: { flex: 1, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  outcomeUndone: { color: flColor.gray400 },
  outcomeDone: { fontSize: 12.5, fontWeight: '700', color: '#5FA271' },
  outcomeMiss: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },

  reflectionCard: { padding: 20, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  quoteMark: { fontFamily: flFont.display, fontSize: 44, lineHeight: 40, color: flColor.bronze400, marginBottom: -6 },
  reflectionBody: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 18, lineHeight: 28, color: flColor.cream100 },
  reflectionMeta: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600, marginTop: 16 },
  addReflection: { padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  addReflectionText: { fontSize: 13, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },

  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  tlDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: flColor.bronze400 },
  tlText: { flex: 1 },
  tlName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  tlType: { fontSize: 11.5, color: flColor.gray600, marginTop: 1 },
  tlDate: { fontSize: 12, color: flColor.gray600 },

  sealBlock: { alignItems: 'center', gap: 16, marginTop: 44, paddingHorizontal: 8 },
  sealCopy: { fontFamily: flFont.display, fontSize: 20, lineHeight: 29, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  sealInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  sealText: { fontSize: 15, fontWeight: '700', color: '#F7F5F1' },
  sealNote: { fontSize: 12, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
});
