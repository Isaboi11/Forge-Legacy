import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { itemByKey } from '@/domain/exercise-picker/data';
import {
  deleteTemplate,
  duplicateTemplate,
  durationText,
  fetchTemplateDetail,
  heroSummary,
  historyDate,
  renameTemplate,
  schemeText,
  statDate,
  templateSections,
  type TemplateExercise,
} from '@/data/templates-live';

/**
 * W-27 Workout Template Detail — built to `Forge Workout Template Detail.dc.html`.
 *
 * One template: identity, usage, structure, session history, and a three-tier action bar. The template
 * itself has existed since 0091 and has been saveable since 0094, but tapping one in the library went
 * nowhere — you could make a template and never open it.
 *
 * ══ WHAT THE DESIGN ASSUMED AND THE DATABASE DID NOT HAVE ══
 *
 * The design reads `useCount` and a `history` array off the template object. Neither existed: nothing
 * recorded that a WORKOUT came from a template. **Migration 0095** adds `workouts.template_id` and
 * derives both from it — see that header for why a stored counter was the wrong shape. The practical
 * consequence is visible here: "Times used" counts sessions you FINISHED, so a start you abandoned
 * doesn't inflate it, and the number can never disagree with the history listed directly beneath it.
 *
 * ══ DELTAS FROM THE `.dc`, EACH ONE DELIBERATE ══
 *
 *   · HISTORY ROWS OPEN THEIR OWN SESSION. In the design every row and "View all" navigated to the same
 *     session-less Activity Detail, so tapping March and tapping June landed identically — the largest
 *     functional gap on the page. Each row now carries its `workout_id` to `/activity/[id]`, and
 *     "View all" EXPANDS the list in place rather than leaving for an unfiltered history of every
 *     session the athlete has ever logged, which is not what "all sessions of this template" means.
 *   · A BROKEN ID IS NOT FOUND. The design fell back to the most recently used template when `?id` named
 *     nothing, so a stale link silently showed you a DIFFERENT template with no signal — worse than the
 *     not-found state it already had. A missing or unknown id lands on not-found.
 *   · EDIT IS NOW A REAL EDIT. It used to be RENAME, because the design's Edit opens a Free Workout
 *     Builder that did not exist here and a button labelled Edit that only renames is exactly the kind of
 *     small lie this codebase keeps removing. That builder now exists (W-25, `/workout-builder`), so Edit
 *     opens the template in it — exercises, order, sets, reps and supersets — and Rename stays beside it
 *     for the common case of changing only the title.
 *   · ONE DATE FORMAT PER JOB, not three. Stats drop the year in the current year (scanned); history rows
 *     always carry it (read, and a log spanning years must not show two rows that look like one day).
 *
 * Hover states are Pressable `pressed` styles — in the design the exercise row carried two `style`
 * attributes, so the parser dropped the second and its hover never applied at all.
 */

/** The equipment glyph, engraved in its disc. Mirrors the design's five hand-authored shapes. */
function EquipGlyph({ cls }: { cls: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (cls === 'Free Weight') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M6.5 9v6" {...p} /><Path d="M17.5 9v6" {...p} /><Path d="M4 10.5v3" {...p} /><Path d="M20 10.5v3" {...p} /><Path d="M6.5 12h11" {...p} />
      </Svg>
    );
  }
  if (cls === 'Machine') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M5 3v18" {...p} /><Path d="M5 7h9a3 3 0 0 1 0 6H9" {...p} /><Path d="M9 13v5" {...p} />
      </Svg>
    );
  }
  if (cls === 'Accessory' || cls === 'Conditioning') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M12 3v6" {...p} /><Path d="M8.5 9h7l-1 5a2.5 2.5 0 0 1-5 0z" {...p} />
      </Svg>
    );
  }
  // Bodyweight, Cardio, and anything unmapped — the figure, head first.
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={6} r={2.4} {...p} /><Path d="M6 20c0-4.2 2.8-7 6-7s6 2.8 6 7" {...p} />
    </Svg>
  );
}

function Chevron({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 6l6 6-6 6" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function TemplateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const templateId = typeof id === 'string' && id.length > 0 ? id : null;
  const { showToast } = useToast();

  const { data: t, error, loading, refetch } = useQuery(
    () => (templateId ? fetchTemplateDetail(templateId) : Promise.resolve(null)),
    [templateId],
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // A session trained from here lands back on this screen — the count and the history must reflect it.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/templates'));

  const start = async () => {
    if (!t) return;
    await writeWorkoutLaunch({ templateId: t.id, workoutName: t.name });
    router.push('/workout');
  };

  const doRename = async () => {
    if (!t) return;
    const next = draftName.trim();
    if (!next || next === t.name) return setRenameOpen(false);
    setBusy(true);
    try {
      await renameTemplate(t.id, next);
      setRenameOpen(false);
      refetch();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doDuplicate = async () => {
    if (!t || busy) return;
    setBusy(true);
    try {
      const copyId = await duplicateTemplate(t.id);
      // Land on the copy — the thing you just made is the thing you're looking at. `replace` so Back
      // doesn't walk you through every duplicate you made on the way here.
      if (copyId) router.replace({ pathname: '/template/[id]', params: { id: copyId } });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!t) return;
    setDeleteOpen(false);
    try {
      await deleteTemplate(t.id);
      // The confirmation promised the sessions stay; say so on arrival, or the deletion lands silent.
      showToast('Template deleted. Your logged sessions stay.');
      router.replace('/templates');
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const notFound = !loading && !error && !t;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.34)' }} />

      <AppBar
        onBack={goBack}
        title={
          <Text style={styles.barTitle} numberOfLines={1}>
            {t?.name ?? 'Template'}
          </Text>
        }
      />

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>Couldn&apos;t load this template.</Text>
          <Text style={styles.statusDetail}>{errorMessage(error)}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : notFound ? (
        <View style={styles.status}>
          <Text style={styles.notFoundTitle}>Template not found</Text>
          <Text style={styles.statusDetail}>It may have been deleted.</Text>
          <Pressable onPress={() => router.replace('/templates')} accessibilityRole="button" accessibilityLabel="Back to Templates" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Back to Templates</Text>
          </Pressable>
        </View>
      ) : t ? (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* hero */}
            <Text style={styles.eyebrow}>WORKOUT TEMPLATE</Text>
            <Text style={styles.title}>{t.name}</Text>
            <Text style={styles.summary}>{heroSummary(t)}</Text>

            {/* usage stats — 1px gaps over a charcoal ground draw the hairline dividers */}
            <View style={styles.stats}>
              {[
                { label: 'TIMES USED', value: String(t.useCount) },
                { label: 'LAST TRAINED', value: statDate(t.lastUsedAt) },
                { label: 'CREATED', value: statDate(t.createdAt) },
              ].map((s) => (
                <View key={s.label} style={styles.statCell}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* structure */}
            <View style={styles.block}>
              <SectionHeader label="Structure" />
              {templateSections(t).map((sec) => (
                <View key={sec.key} style={styles.secBlock}>
                  <View style={styles.secHead}>
                    {/* Bronze marks the block that matters; warm-up and cool-down recede. */}
                    <Text style={[styles.secLabel, sec.key === 'main' ? styles.secLabelMain : null]}>{sec.label.toUpperCase()}</Text>
                    <View style={styles.spacer} />
                    <Text style={styles.secCount}>{sec.items.length}</Text>
                  </View>
                  <View style={styles.exList}>
                    {sec.items.map((e, i) => (
                      <ExerciseRow key={`${e.catalogKey ?? e.name}-${i}`} ex={e} />
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* session history */}
            <View style={styles.block}>
              <SectionHeader label="Session history" />
              {t.history.length === 0 ? (
                <View style={styles.emptyHist}>
                  <Text style={styles.emptyHistText}>No sessions logged yet. Tap Start to train it for the first time.</Text>
                </View>
              ) : (
                <>
                  {(showAllHistory ? t.history : t.history.slice(0, 4)).map((h) => (
                    <Pressable
                      key={h.workoutId}
                      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: h.workoutId } })}
                      accessibilityRole="button"
                      accessibilityLabel={`Session on ${historyDate(h.at)}`}
                      style={({ pressed }) => [styles.histRow, pressed ? styles.histRowPressed : null]}
                    >
                      <View style={styles.histDot} />
                      <View style={styles.histBody}>
                        <View style={styles.histTop}>
                          <Text style={styles.histDate}>{historyDate(h.at)}</Text>
                          <Text style={styles.histDur}>{durationText(h.durationSec)}</Text>
                        </View>
                        {h.note?.trim() ? <Text style={styles.histNote}>{h.note.trim()}</Text> : null}
                      </View>
                      <Chevron />
                    </Pressable>
                  ))}
                  {!showAllHistory && t.history.length > 4 ? (
                    <Pressable
                      onPress={() => setShowAllHistory(true)}
                      accessibilityRole="button"
                      accessibilityLabel="View all sessions"
                      style={({ pressed }) => [styles.viewAll, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.viewAllText}>View all {t.history.length} sessions</Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>

          {/* sticky action bar — one bronze primary, two quiet peers, one escape hatch */}
          <View style={styles.actionBar}>
            <Pressable
              onPress={() => void start()}
              accessibilityRole="button"
              accessibilityLabel="Start this workout"
              style={({ pressed }) => [styles.startBtn, pressed ? styles.pressed : null]}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M7 5l12 7-12 7z" fill={flColor.cream100} />
              </Svg>
              <Text style={styles.startText}>Start Workout</Text>
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => router.push({ pathname: '/workout-builder', params: { id: t.id } })}
                accessibilityRole="button"
                accessibilityLabel="Edit this template"
                style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
              >
                <Svg width={15} height={15} viewBox="0 0 24 24">
                  <Path d="M12 20h9" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" />
                  <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.secondaryText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => void doDuplicate()}
                accessibilityRole="button"
                accessibilityLabel="Duplicate this template"
                style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
              >
                <Svg width={15} height={15} viewBox="0 0 24 24">
                  <Path d="M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinejoin="round" />
                  <Path d="M5 15V5a2 2 0 0 1 2-2h10" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={styles.secondaryText}>Duplicate</Text>
              </Pressable>
              <Pressable
                onPress={() => setMoreOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="More actions"
                style={({ pressed }) => [styles.moreBtn, pressed ? styles.pressed : null]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Circle cx={5} cy={12} r={1.7} fill={flColor.gray400} />
                  <Circle cx={12} cy={12} r={1.7} fill={flColor.gray400} />
                  <Circle cx={19} cy={12} r={1.7} fill={flColor.gray400} />
                </Svg>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {/* Delete lives behind the overflow deliberately — it should never be one tap from Start. */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        {/* Renaming moved here when Edit became a real edit. It is still worth its own action — changing
            only the title should not mean opening a builder and saving a whole shape back. */}
        <Pressable
          onPress={() => {
            setMoreOpen(false);
            setDraftName(t?.name ?? '');
            setRenameOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Rename template"
          style={({ pressed }) => [styles.moreRow, pressed ? styles.pressed : null]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 20h9" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" />
            <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.moreRowText}>Rename template</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMoreOpen(false);
            setDeleteOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete template"
          style={({ pressed }) => [styles.destructiveRow, pressed ? styles.pressed : null]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" fill="none" stroke={flColor.redMuted} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.destructiveText}>Delete template</Text>
        </Pressable>
        <Pressable onPress={() => setMoreOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancelRow}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename template">
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Template name"
          placeholderTextColor={flColor.gray600}
          style={styles.input}
          accessibilityLabel="Template name"
          maxLength={60}
          autoFocus
        />
        <Pressable
          onPress={() => void doRename()}
          disabled={busy || !draftName.trim()}
          accessibilityRole="button"
          accessibilityLabel="Save name"
          style={({ pressed }) => [styles.startBtn, styles.renameSave, busy || !draftName.trim() ? styles.disabled : null, pressed ? styles.pressed : null]}
        >
          <Text style={styles.startText}>Save</Text>
        </Pressable>
      </BottomSheet>

      {/* The design's copy, kept whole: it names the template, states what survives, states finality. */}
      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        headline="Delete this template?"
        body={`“${t?.name ?? ''}” will be removed from your library. Logged sessions in your history stay. This can’t be undone.`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={() => void doDelete()}
      />
    </View>
  );
}

/** One lift: engraved icon disc · name over equipment · scheme in mono · chevron only when it opens. */
function ExerciseRow({ ex }: { ex: TemplateExercise }) {
  const router = useRouter();
  const rec = ex.catalogKey ? itemByKey(ex.catalogKey) : undefined;
  // A custom exercise has no catalog record and correctly stays inert — no chevron, no press.
  const open = rec ? () => router.push({ pathname: '/exercise/[id]', params: { id: rec.key } }) : undefined;

  return (
    <Pressable
      onPress={open}
      disabled={!open}
      accessibilityRole={open ? 'button' : undefined}
      accessibilityLabel={open ? `${ex.name} — open exercise` : ex.name}
      style={({ pressed }) => [styles.exRow, open && pressed ? styles.exRowPressed : null]}
    >
      <View style={styles.exIcon}>
        <EquipGlyph cls={rec?.equipClass ?? 'Bodyweight'} />
      </View>
      <View style={styles.exText}>
        <Text style={styles.exName} numberOfLines={1}>
          {ex.name}
        </Text>
        <Text style={styles.exEquip} numberOfLines={1}>
          {rec?.equip ?? 'Custom'}
        </Text>
      </View>
      <Text style={styles.exScheme}>{schemeText(ex)}</Text>
      {open ? <Chevron /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  barTitle: { fontSize: 16, fontWeight: '600', color: flColor.cream100, letterSpacing: 0.2 },

  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  statusText: { fontSize: 15, color: flColor.gray400, textAlign: 'center' },
  statusDetail: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
  notFoundTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  outlineBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  outlineBtnText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  scroll: { padding: 20, paddingBottom: 28 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: flColor.bronze400, marginBottom: 8 },
  title: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', lineHeight: 33, color: flColor.cream100 },
  summary: { marginTop: 10, fontSize: 13, color: flColor.gray400 },

  stats: { flexDirection: 'row', gap: 1, marginTop: 18, backgroundColor: flColor.charcoal700, borderWidth: 1, borderColor: flColor.charcoal700, borderRadius: flRadius.lg, overflow: 'hidden' },
  statCell: { flex: 1, gap: 5, paddingVertical: 15, paddingHorizontal: 10, backgroundColor: flColor.surfaceRecessed, alignItems: 'center' },
  statValue: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', color: flColor.cream100 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: flColor.bronze400, textAlign: 'center' },

  block: { marginTop: 26 },
  secBlock: { marginBottom: 20 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingHorizontal: 2, paddingBottom: 9 },
  secLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: flColor.gray600 },
  secLabelMain: { fontSize: 11, color: flColor.bronze400 },
  spacer: { flex: 1 },
  secCount: { fontSize: 10, fontWeight: '600', color: flColor.gray600 },
  exList: { gap: 8 },

  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  exRowPressed: { borderColor: flColor.bronzeBorderSubtle },
  exIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center', color: flColor.bronze300 },
  exText: { flex: 1, minWidth: 0, gap: 2 },
  exName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  exEquip: { fontSize: 11.5, color: flColor.gray600 },
  exScheme: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  histRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingVertical: 13, paddingHorizontal: 2, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  histRowPressed: { backgroundColor: 'rgba(255,255,255,0.02)' },
  histDot: { marginTop: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: flColor.bronze400 },
  histBody: { flex: 1, minWidth: 0, gap: 3 },
  histTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  histDate: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  histDur: { fontSize: 12, color: flColor.gray600 },
  histNote: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400, fontStyle: 'italic' },
  viewAll: { marginTop: 12, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center' },
  viewAllText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },
  emptyHist: { padding: 20, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600, alignItems: 'center' },
  emptyHistText: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },

  actionBar: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: 'rgba(6,7,8,0.86)' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronze600, boxShadow: flShadow.card },
  startText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: flColor.cream100 },
  secondaryRow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  secondaryText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  moreBtn: { width: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },

  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, marginBottom: 8 },
  moreRowText: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  destructiveRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700 },
  destructiveText: { fontSize: 14.5, fontWeight: '600', color: flColor.redMuted },
  cancelRow: { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray600 },

  input: { paddingHorizontal: 13, paddingVertical: 11, minHeight: 44, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 14, color: flColor.cream100 },
  renameSave: { marginTop: 12 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
