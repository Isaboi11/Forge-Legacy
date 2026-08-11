import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ExercisePoster } from '@/components/forge/ExercisePoster';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { buildExerciseDetail } from '@/domain/exercise-detail/view';
import { exerciseDemoUrl, type AthleteSex } from '@/domain/exercise-detail/media';
import { ExerciseDemo } from '@/components/forge/ExerciseDemo';
import { useProfile } from '@/lib/profile';

/**
 * W-22 Exercise Detail (`Forge Exercise Detail.dc.html`) — the read-only reference page for one
 * exercise: what it is, what it trains, how to do it, and what to swap it for.
 *
 * Real sources: the 809-exercise catalog (identity, equipment, difficulty, pattern, muscles), the
 * 5,698-edge relationship graph (alternatives), and the coaching system's sanctioned bridge.
 *
 * COACHING COPY IS GATED. `getExerciseDetailCoaching` serves Published records only; today none of the
 * 556 generated records are approved, so Why-it-matters / How-to / Cues / Mistakes are absent for every
 * exercise. That is the locked serving policy, not a bug — unreviewed coaching for someone under a
 * loaded barbell is the one thing this system is designed to prevent. Publish content and these sections
 * appear with no code change.
 *
 * SECTION ORDER IS THE `.dc`'s: demonstration · what it is · why it matters · what it trains · how to
 * do it · cues · common mistakes · alternatives. The demo leads deliberately — you look at the movement
 * before you read about it, and every word under "How to do it" is describing the thing on screen.
 *
 * DEFERRED vs the `.dc` (omitted, not faked):
 *  · Favourite button — the picker already owns bookmarking (long-press); a second, unpersisted toggle
 *    here would be a different answer to the same question.
 *  · Replace / Actions block — it needs a live workout slot to replace INTO. Reached from a past
 *    session's detail there is nothing to swap, so the block is absent rather than inert.
 */

function Glyph({ d, size = 16, color, width = 1.8 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useMemo(() => (id ? buildExerciseDetail(id) : null), [id]);
  /* The clip is rendered for the athlete's own sex where they gave one; `demoVariant` decides, not
     this screen. Reading the shared profile costs nothing here — it is already loaded app-wide. */
  const { profile } = useProfile();
  const demoUrl = useMemo(() => exerciseDemoUrl(id, profile?.sex as AthleteSex | undefined), [id, profile?.sex]);

  if (!detail) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />
        <AppBar title="Exercise" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Exercise not found</Text>
          <Text style={styles.errorDetail}>“{id}” isn’t in the catalog.</Text>
        </View>
      </View>
    );
  }

  const c = detail.coaching;
  const attrs = [
    { label: 'Equipment', value: detail.equip },
    { label: 'Difficulty', value: detail.difficulty },
    { label: 'Pattern', value: detail.pattern },
    { label: 'Prime target', value: detail.primaryMuscles[0] ?? detail.categoryLabel },
  ];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />
      <AppBar title="Exercise" serif onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 1 · demonstration — the `.dc`'s first block, above the name */}
        <ExerciseDemo url={demoUrl} />

        {/* 2 · identity */}
        <Text style={[styles.tag, styles.tagAfterDemo]}>
          {detail.modality} · {detail.categoryLabel}
        </Text>
        <Text style={styles.name}>{detail.name}</Text>
        <View style={styles.equipLine}>
          <EquipIcon equip={detail.equipId} size={16} />
          <Text style={styles.equipText}>{detail.equip}</Text>
        </View>

        <View style={styles.attrGrid}>
          {attrs.map((a) => (
            <View key={a.label} style={styles.attrTile}>
              <Text style={styles.attrLabel}>{a.label}</Text>
              <Text style={styles.attrValue} numberOfLines={2}>
                {a.value || '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* what it trains — real muscle data */}
        {detail.primaryMuscles.length || detail.secondaryMuscles.length ? (
          <View style={styles.block}>
            <SectionHeader label="What it trains" />
            <View style={styles.card}>
              {detail.primaryMuscles.length ? (
                <>
                  <Text style={styles.muscleLabel}>Prime movers</Text>
                  <View style={styles.pillRow}>
                    {detail.primaryMuscles.map((m) => (
                      <View key={m} style={styles.pillPrimary}>
                        <View style={styles.diamond} />
                        <Text style={styles.pillPrimaryText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
              {detail.secondaryMuscles.length ? (
                <View style={detail.primaryMuscles.length ? styles.secondaryBlock : undefined}>
                  <Text style={styles.muscleLabel}>Secondary</Text>
                  <View style={styles.pillRow}>
                    {detail.secondaryMuscles.map((m) => (
                      <View key={m} style={styles.pillSecondary}>
                        <View style={styles.dot} />
                        <Text style={styles.pillSecondaryText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* coaching — only ever rendered from Published content */}
        {c?.whyItMatters ? (
          <View style={styles.block}>
            <SectionHeader label="Why it matters" />
            <View style={[styles.card, styles.cardBronze]}>
              <Text style={styles.body}>{c.whyItMatters}</Text>
            </View>
          </View>
        ) : null}

        {c && c.instructions.length ? (
          <View style={styles.block}>
            <SectionHeader label="How to do it" />
            <View style={styles.card}>
              {c.instructions.map((step, i) => (
                <View key={step} style={[styles.stepRow, i > 0 && styles.stepDivider]}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {c && c.tips.length ? (
          <View style={styles.block}>
            <SectionHeader label="Coaching cues" />
            <View style={styles.card}>
              {c.tips.map((t) => (
                <View key={t} style={styles.cueRow}>
                  <View style={styles.diamond} />
                  <Text style={styles.body}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {c && c.commonMistakes.length ? (
          <View style={styles.block}>
            <SectionHeader label="Common mistakes" />
            {c.commonMistakes.map((m) => (
              <View key={m} style={styles.mistakeRow}>
                <View style={styles.mistakeMark}>
                  <Glyph d="M18 6L6 18M6 6l12 12" size={11} color={flColor.redMuted} width={2.4} />
                </View>
                <Text style={styles.body}>{m}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {c && c.safetyNotes.length ? (
          <View style={styles.block}>
            <SectionHeader label="Safety" />
            <View style={styles.card}>
              {c.safetyNotes.map((s) => (
                <View key={s} style={styles.cueRow}>
                  <View style={styles.diamond} />
                  <Text style={styles.body}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* alternatives — from the relationship graph */}
        {detail.alternatives.length ? (
          <View style={styles.block}>
            <SectionHeader label="Alternatives" />
            <View style={styles.altList}>
              {detail.alternatives.map((a) => (
                <Pressable
                  key={a.key}
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: a.key } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.name}${a.best ? ', best substitute' : ''}`}
                  style={[styles.altRow, a.best && styles.altRowBest]}
                >
                  <View style={styles.altIcon}>
                    <ExercisePoster exerciseId={a.key} radius={21} fallback={<EquipIcon equip={a.equipId} size={19} />} />
                  </View>
                  <View style={styles.altText}>
                    <View style={styles.altNameLine}>
                      <Text style={styles.altName} numberOfLines={1}>
                        {a.name}
                      </Text>
                      {a.best ? (
                        <View style={styles.bestPill}>
                          <Text style={styles.bestText}>Best substitute</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.altNote} numberOfLines={1}>
                      {a.equip} · {a.note}
                    </Text>
                  </View>
                  <Glyph d="M9 6l6 6-6 6" size={16} color={flColor.gray600} width={2} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* One honest line when there is no published coaching, rather than a page that just stops. */}
        {!c ? <Text style={styles.pending}>Coaching guidance for this exercise hasn’t been published yet.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 34 },
  scroll: { paddingHorizontal: 22, paddingBottom: 44 },

  tag: { marginTop: 6, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  // The demo now sits above the identity block; the `.dc` breathes here rather than butting them up.
  tagAfterDemo: { marginTop: 20 },
  name: { marginTop: 6, fontFamily: flFont.display, fontSize: 30, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100 },
  equipLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  equipText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },

  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  attrTile: {
    width: '48%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    gap: 4,
  },
  attrLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  attrValue: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },

  block: { marginTop: 26 },
  card: {
    padding: 15,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
  },
  cardBronze: { borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  body: { flex: 1, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },

  muscleLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 10 },
  secondaryBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  pillPrimaryText: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },
  pillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  pillSecondaryText: { fontSize: 12, color: flColor.gray400 },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: flColor.gray600 },

  stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 11 },
  stepDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  stepBadge: {
    width: 26,
    height: 26,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { transform: [{ rotate: '-45deg' }], fontSize: 11.5, fontWeight: '700', color: flColor.bronze300 },
  stepText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: flColor.gray400, paddingTop: 3 },

  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
    marginBottom: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  mistakeMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(190,90,76,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  altList: { gap: 8 },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  altRowBest: { borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  altIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altText: { flex: 1, minWidth: 0, gap: 2 },
  altNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  altName: { flexShrink: 1, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  bestPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  bestText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: flColor.bronze300 },
  altNote: { fontSize: 11.5, color: flColor.gray600 },

  pending: { marginTop: 26, fontSize: 12.5, lineHeight: 19, fontStyle: 'italic', color: flColor.gray600 },

  errorTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  errorDetail: { fontSize: 13, color: flColor.gray400, textAlign: 'center' },
});
