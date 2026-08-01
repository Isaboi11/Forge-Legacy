import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { deleteTemplate, fetchTemplates, templateSummary, type WorkoutTemplate } from '@/data/templates-live';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { writeWorkoutLaunch } from '@/lib/workout-launch';

/**
 * Workout Templates (W-26).
 * Built to `Forge Workout Templates.dc.html`.
 *
 * ── THE ONE STRUCTURAL DELTA: WHERE A TEMPLATE COMES FROM ────────────────────
 *
 * The design's "New Template" opens a Free Workout Builder — author a workout from nothing, then keep it.
 * That builder does not exist here, and building it would be the second answer to a question already
 * answered: in this app a template is a session you ALREADY DID and want again (0091). You train, and The
 * Record offers to keep the shape.
 *
 * That is the better loop, not a substitute for one. Authoring a workout you have never done is guessing
 * at your own capacity; saving one you just finished is recording it. So New Template starts a freestyle
 * session — build it as you go, then keep it — and the empty state says exactly that instead of promising
 * a builder.
 *
 * ── OTHER DELTAS ────────────────────────────────────────────────────────────
 *
 * DROPPED-FREE — cards were `role="button" tabindex="0"` with no key handler (fifth screen running), and
 * the back link hard-navigated to the Programs Catalog whatever you came from.
 *
 * DEFERRED-HONEST — the muscle-group pills ("Legs · Core"). They need a per-exercise catalog join this
 * list has no other reason to make, and the figure they would displace — "6 lifts · 18 sets" — answers
 * the question you actually have standing in a gym, which is whether you have time for it.
 *
 * CHANGED — the used pill reads relative time ("Used today") rather than a count. `last_used_at` is what
 * 0091 stores; a use COUNT would be a second fact to keep in step for no more meaning.
 */

export default function TemplatesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, loading, error, refetch } = useQuery(fetchTemplates, []);
  const [confirmDelete, setConfirmDelete] = useState<WorkoutTemplate | null>(null);

  // Coming back from a session that was saved as a template must show it.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/workouts'));

  const start = async (t: WorkoutTemplate) => {
    await writeWorkoutLaunch({ templateId: t.id, workoutName: t.name });
    router.push('/workout');
  };

  /* "New" starts a freestyle session rather than opening an authoring builder — see the header. */
  const newTemplate = async () => {
    await writeWorkoutLaunch({ freestyle: true });
    router.push('/workout');
  };

  const remove = async (t: WorkoutTemplate) => {
    setConfirmDelete(null);
    try {
      await deleteTemplate(t.id);
      showToast(`${t.name} removed.`);
      refetch();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const list = data ?? [];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar
        title="Templates"
        onBack={goBack}
        actions={
          list.length > 0 ? (
            <Pressable onPress={newTemplate} accessibilityRole="button" accessibilityLabel="New template" hitSlop={8} style={styles.barBtn}>
              <PlusGlyph />
            </Pressable>
          ) : undefined
        }
      />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load your templates.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCrest}>
            <LinesGlyph />
          </View>
          <Text style={styles.emptyTitle}>No templates yet</Text>
          <Text style={styles.emptyBody}>
            Train a session and keep the shape — after any workout, The Record offers to save it. No program required.
          </Text>
          <Pressable onPress={newTemplate} accessibilityRole="button" accessibilityLabel="Start a workout" style={styles.primaryBtn}>
            <Text style={styles.primaryBtnLabel}>Start a Workout</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.lede}>Reusable workouts, ready whenever you are. Recently used appear first.</Text>

          <View style={styles.stack}>
            {list.map((t) => (
              <View key={t.id} style={[styles.card, t.lastUsedAt ? styles.cardUsed : null]}>
                {/* The card body opens W-27. Only the body — the footer's Start and Remove are their own
                    targets, and nesting them inside one big pressable would make every Start also a
                    navigation. The card used to be inert entirely: you could save a template and never
                    open it. */}
                <Pressable
                  onPress={() => router.push({ pathname: '/template/[id]', params: { id: t.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${t.name}`}
                  style={({ pressed }) => (pressed ? styles.pressed : null)}
                >
                <View style={styles.cardTop}>
                  <View style={styles.cardHead}>
                    <View style={styles.cardHeadText}>
                      <Text style={styles.cardName} numberOfLines={2}>
                        {t.name}
                      </Text>
                      <Text style={styles.cardStructure}>{templateSummary(t)}</Text>
                    </View>
                    <View style={styles.usedPill}>
                      <View style={[styles.usedDot, t.lastUsedAt ? styles.usedDotOn : null]} />
                      <Text style={styles.usedLabel}>{usedLabel(t.lastUsedAt)}</Text>
                    </View>
                  </View>

                  {/* The lifts themselves — the design shows muscle groups; this shows what you'll do. */}
                  <View style={styles.pillRow}>
                    {t.exercises.slice(0, 4).map((e, i) => (
                      <View key={`${t.id}-${i}`} style={styles.pill}>
                        <Text style={styles.pillText} numberOfLines={1}>
                          {e.name}
                        </Text>
                      </View>
                    ))}
                    {t.exercises.length > 4 ? (
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>+{t.exercises.length - 4}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                </Pressable>

                <View style={styles.cardFoot}>
                  <Pressable
                    onPress={() => void start(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${t.name}`}
                    style={({ pressed }) => [styles.footBtn, styles.footBtnStart, pressed ? styles.pressed : null]}
                  >
                    <PlayGlyph />
                    <Text style={styles.footStartText}>Start</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmDelete(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${t.name}`}
                    style={({ pressed }) => [styles.footBtn, styles.footBtnQuiet, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.footQuietText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={newTemplate} accessibilityRole="button" accessibilityLabel="Start a workout to make another" style={({ pressed }) => [styles.newRow, pressed ? styles.pressed : null]}>
            <PlusGlyph size={16} />
            <Text style={styles.newRowText}>Train one and keep it</Text>
          </Pressable>
        </ScrollView>
      )}

      <ConfirmSheet
        open={!!confirmDelete}
        headline={confirmDelete ? `Remove ${confirmDelete.name}?` : ''}
        body="The workouts you did from it stay in your record. Only the saved shape goes."
        confirmLabel="Remove"
        tone="destructive"
        onConfirm={() => confirmDelete && void remove(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </View>
  );
}

/** "Used today", "Used 3 weeks ago", or "New" — from `last_used_at`, the only thing 0091 stores. */
function usedLabel(iso: string | null): string {
  if (!iso) return 'New';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Used today';
  if (days === 1) return 'Used yesterday';
  if (days < 7) return `Used ${days} days ago`;
  const wk = Math.round(days / 7);
  if (wk < 5) return wk === 1 ? 'Used 1 week ago' : `Used ${wk} weeks ago`;
  const mo = Math.round(days / 30);
  return mo <= 1 ? 'Used 1 month ago' : `Used ${mo} months ago`;
}

// ── glyphs ──
function PlusGlyph({ size = 22, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function PlayGlyph({ size = 13, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 5l12 7-12 7z" />
    </Svg>
  );
}
function LinesGlyph({ size = 26, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M4 6h16M4 12h16M4 18h10" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.86 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26 },
  lede: { marginBottom: 18, fontSize: 13, lineHeight: 19.5, color: flColor.gray600 },

  stack: { gap: 12 },
  card: { borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden', boxShadow: `${flShadow.borderInset}, ${flShadow.card}` },
  /* A template you've used carries a bronze edge — the design's one signal of what's proven. */
  cardUsed: { borderColor: flColor.bronzeBorderSubtle },
  cardTop: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardHeadText: { flex: 1, minWidth: 0 },
  cardName: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', lineHeight: 21.3, color: flColor.cream100 },
  cardStructure: { marginTop: 5, fontSize: 12, color: flColor.gray600 },
  usedPill: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  usedDot: { width: 5, height: 5, borderRadius: flRadius.round, backgroundColor: flColor.charcoal500 },
  usedDotOn: { backgroundColor: flColor.bronze400 },
  usedLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  pill: { maxWidth: '48%', paddingHorizontal: 9, paddingVertical: 4, borderRadius: flRadius.xs, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  pillText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400 },

  cardFoot: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  footBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  footBtnStart: { flex: 1, borderRightWidth: 1, borderRightColor: flColor.charcoal700 },
  footBtnQuiet: { width: 96 },
  footStartText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  footQuietText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },

  newRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  newRowText: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  emptyCrest: { width: 58, height: 58, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  emptyTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 10, maxWidth: 260, fontSize: 13.5, lineHeight: 21, textAlign: 'center', color: flColor.gray400 },
  primaryBtn: { marginTop: 22, paddingHorizontal: 22, paddingVertical: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, backgroundColor: flColor.bronze600, boxShadow: `${flShadow.bronzeMetalTopRim}, ${flShadow.card}` },
  primaryBtnLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: '#F7F5F1' },

  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
