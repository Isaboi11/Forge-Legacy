import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { deleteTemplate, fetchTemplates, templateSummary, type WorkoutTemplate } from '@/data/templates-live';
import { fetchWeekTemplates, weekSummary } from '@/data/week-templates-live';
import { STARTER_TEMPLATES, starterMeta, starterSummary, suggestedStarters } from '@/domain/workout/starter-templates';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useProfile } from '@/lib/profile';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { writeWorkoutLaunch } from '@/lib/workout-launch';

/**
 * Workout Templates (W-26).
 * Built to `Forge Workout Templates.dc.html`.
 *
 * ── WHERE A TEMPLATE COMES FROM: NOW BOTH WAYS ───────────────────────────────
 *
 * Templates were built from the CAPTURE end first (0091): you train, and The Record offers to keep the
 * shape. That is still the better loop for most sessions — a workout you already did is one you know you
 * can do, where a workout you author is a guess at your own capacity — and it is why capture was built
 * before authoring rather than after.
 *
 * But it answered only half the question. "I want to plan Thursday before Thursday" had no door at all,
 * which is the design's "Build it first". So **New Template now opens the Free Workout Builder (W-25,
 * `/workout-builder`)**, and the capture path is unchanged beside it.
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
  const { profile } = useProfile();
  const { data, loading, error, refetch } = useQuery(fetchTemplates, []);
  /* Declared HERE, beside the query it parallels, because the focus effect below closes over its
     `refetch` — a `const` further down the body is still in its temporal dead zone when that effect's
     dependency array is evaluated during render, which is a crash rather than a stale read. */
  const { data: weekData, refetch: refetchWeeks } = useQuery(fetchWeekTemplates, []);
  const [confirmDelete, setConfirmDelete] = useState<WorkoutTemplate | null>(null);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  // Coming back from a session that was saved as a template must show it.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchWeeks();
    }, [refetch, refetchWeeks]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/workouts'));

  const start = async (t: WorkoutTemplate) => {
    await writeWorkoutLaunch({ templateId: t.id, workoutName: t.name });
    router.push('/workout');
  };

  /* "New" opens the builder (W-25). Capture — train, then keep the shape — is still offered on The
     Record; the two are complementary doors to the same table, not rivals. */
  /* Pre-action (M-7 §2). The 81 Forge starter templates are catalogue content and never count against
     this — only athlete-authored rows in `workout_templates` do, which is why the count is a live read
     of that table and not of anything on this screen. */
  const guard = usePremiumGate();
  const newTemplate = () => {
    if (!guard('templates')) return;
    router.push('/workout-builder');
  };

  /*
   * ── WEEKS (0157) ──────────────────────────────────────────────────────────────────────────────
   *
   * A second kind of reusable shape lives here: a whole WEEK rather than one session. It belongs on this
   * screen because the athlete's mental model is already "reusable shapes I can run" — and this hub
   * already routes to two different detail screens, so a third is not a new idea.
   *
   * The `+` therefore has to ask WHICH, rather than assuming. Assuming is exactly what made a saved
   * template unreachable from the Workouts tab (W25-A1-D8): a door that answers a question the athlete
   * did not ask.
   */
  const weeks = weekData ?? [];
  const [newOpen, setNewOpen] = useState(false);

  const newWeek = () => {
    setNewOpen(false);
    if (!guard('short_programs')) return;
    router.push({ pathname: '/program-builder', params: { mode: 'week' } });
  };

  const onNew = () => {
    // With no weeks yet there is nothing to disambiguate: one door, no question.
    if (weeks.length === 0) newTemplate();
    else setNewOpen(true);
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
  /* The shelf shows what you HAVEN'T taken. An adopted starter is an ordinary template of yours and
     belongs in your list, not on the shelf offering it again — filtered here rather than by a second
     query, because the answer is already in hand. */
  const adopted = new Set(list.map((t) => t.sourceDefinitionId).filter((v): v is string => !!v));
  /* A SAMPLE, not the library. This shelf sits above the athlete's own templates, so at 81 definitions
     rendering all of them would bury the list they came here for under eighty cards of the list they
     didn't. Four, one per focus, matched to their profile — the rest are one tap away on
     `/forge-templates`, which is built to be filtered and this screen is not. */
  const starters = suggestedStarters(profile?.sex, adopted, 4);
  const remaining = STARTER_TEMPLATES.length - adopted.size;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar
        title="Templates"
        onBack={goBack}
        actions={
          list.length > 0 ? (
            <Pressable onPress={onNew} accessibilityRole="button" accessibilityLabel="New template or week" hitSlop={8} style={styles.barBtn}>
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
      ) : list.length === 0 && starters.length === 0 ? (
        /* Only reachable once every starter has been adopted AND every copy deleted — but it stays,
           because the alternative is a screen that says nothing when that happens. */
        <View style={styles.center}>
          <View style={styles.emptyCrest}>
            <LinesGlyph />
          </View>
          <Text style={styles.emptyTitle}>No templates yet</Text>
          <Text style={styles.emptyBody}>
            Plan one here, or train a session and keep its shape — after any workout, The Record offers to save it.
            No program required either way.
          </Text>
          <Pressable onPress={newTemplate} accessibilityRole="button" accessibilityLabel="Build a workout" style={styles.primaryBtn}>
            <Text style={styles.primaryBtnLabel}>Build a Workout</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={tourScroller}
          onScroll={onTourScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lede}>Reusable workouts, ready whenever you are. Recently used appear first.</Text>

          {/* ── FROM FORGE ────────────────────────────────────────────────────────────────────────
              Above your own, and the whole reason this screen no longer greets a new athlete with an
              empty panel under a heading that promised templates. The card body PREVIEWS; only Add
              writes anything — the same "body and action are distinct targets" rule the cards below
              follow. Taking one makes it yours: editable, deletable, keeping its own history. ── */}
          {starters.length > 0 ? (
            <View style={styles.shelf}>
              <View style={styles.shelfHead}>
                <Text style={styles.shelfLabel}>From Forge</Text>
                <Text style={styles.shelfSub}>Ready to train, or to make your own</Text>
              </View>
              {starters.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push({ pathname: '/starter-template/[id]', params: { id: s.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${s.name} — ${s.blurb}`}
                  style={({ pressed }) => [styles.starterCard, pressed ? styles.pressed : null]}
                >
                  <View style={styles.starterText}>
                    <Text style={styles.starterName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={styles.starterStructure}>
                      {starterSummary(s)} · {starterMeta(s)}
                    </Text>
                    <Text style={styles.starterBlurb} numberOfLines={2}>
                      {s.blurb}
                    </Text>
                  </View>
                  <View style={styles.starterCta}>
                    <Text style={styles.starterCtaLabel}>Preview</Text>
                  </View>
                </Pressable>
              ))}

              {/* The other seventy-odd. Counts what's LEFT rather than the catalogue total, so it stops
                  advertising sessions the athlete has already taken. */}
              {remaining > starters.length ? (
                <Pressable
                  onPress={() => router.push('/forge-templates')}
                  accessibilityRole="button"
                  accessibilityLabel={`Browse all ${remaining} Forge sessions`}
                  style={({ pressed }) => [styles.browseRow, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.browseText}>Browse all {remaining}</Text>
                  <Chevron />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* ── YOUR WEEKS (0157) ─────────────────────────────────────────────────────────────────
              A whole week, above the single sessions, because a week CONTAINS them — putting it below
              would read as a subtype of the thing it is made of. Body opens W-29; the footer's Start
              lives there rather than here, because starting a week ends your active program and that
              question needs a screen, not a row. ── */}
          {weeks.length > 0 ? (
            <View style={styles.shelf}>
              <View style={styles.shelfHead}>
                <Text style={styles.shelfLabel}>Your Weeks</Text>
              </View>
              <View style={styles.stack}>
                {weeks.map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => router.push({ pathname: '/week-template/[id]', params: { id: w.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${w.name}`}
                    style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.cardHead}>
                        <View style={styles.cardHeadText}>
                          <Text style={styles.cardName} numberOfLines={2}>{w.name}</Text>
                          <Text style={styles.cardStructure}>{weekSummary(w)}</Text>
                        </View>
                        <View style={styles.forgePill}>
                          <Text style={styles.forgePillText}>1 WEEK</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <TourAnchor id="templates-list" style={styles.stack}>
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
                    {/* Provenance, not ownership — this row is the athlete's and Remove still removes it. */}
                    {t.sourceDefinitionId ? (
                      <View style={styles.forgePill}>
                        <Text style={styles.forgePillText}>FORGE</Text>
                      </View>
                    ) : null}
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
          </TourAnchor>

          <TourAnchor id="templates-new">
            <Pressable onPress={newTemplate} accessibilityRole="button" accessibilityLabel="Build a workout" style={({ pressed }) => [styles.newRow, pressed ? styles.pressed : null]}>
              <PlusGlyph size={16} />
              <Text style={styles.newRowText}>Build a workout</Text>
            </Pressable>
            {/* Its own row rather than a second option behind the first: two distinct things to author,
                each one tap. The chooser sheet exists for the AppBar `+`, which has no room to say two
                words — it is not the primary door. */}
            <Pressable onPress={newWeek} accessibilityRole="button" accessibilityLabel="Build a week" style={({ pressed }) => [styles.newRow, pressed ? styles.pressed : null]}>
              <PlusGlyph size={16} />
              <Text style={styles.newRowText}>Build a week</Text>
            </Pressable>
          </TourAnchor>
        </ScrollView>
      )}

      {/* The empty state already says, in full sentences, the one thing this tour teaches — so it only
          fires once there are templates to point at. */}
      <ScreenTour screenKey="templates" ready={list.length > 0} />

      {/* The `+` asks which. Reusing ConfirmSheet rather than adding a chooser component: it is two
          options and a dismiss, which is exactly what this sheet already is. `tone="primary"` because
          neither answer destroys anything. */}
      <ConfirmSheet
        open={newOpen}
        headline="What are you building?"
        body="A workout is one session you can start any time. A week is several days you run in order, like a short program."
        confirmLabel="Build a week"
        cancelLabel="Build a workout"
        tone="primary"
        onConfirm={newWeek}
        onClose={() => {
          setNewOpen(false);
          newTemplate();
        }}
      />

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
function Chevron({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
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
  forgePill: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  forgePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: flColor.bronze300 },

  // "From Forge" shelf
  shelf: { marginBottom: 22, gap: 10 },
  shelfHead: { marginBottom: 2 },
  shelfLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  shelfSub: { marginTop: 3, fontSize: 12, color: flColor.gray600 },
  starterCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  starterText: { flex: 1, minWidth: 0 },
  starterName: { fontFamily: flFont.display, fontSize: 16.5, fontWeight: '600', color: flColor.cream100 },
  starterStructure: { marginTop: 3, fontSize: 11.5, color: flColor.bronze400 },
  starterBlurb: { marginTop: 5, fontSize: 12, lineHeight: 17, color: flColor.gray600 },
  starterCta: { flexShrink: 0, paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  starterCtaLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze300 },
  browseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600 },
  browseText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze300 },

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
