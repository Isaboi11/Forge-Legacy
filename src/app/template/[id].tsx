import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { NotFoundBody, guardRoute, hasId } from '@/components/forge/NotFound';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { Button } from '@/components/forge/composites/Button/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { SCREEN_GUTTER, useBarBottom } from '@/lib/screen-insets';
import { forgeOr, themeScrim } from '@/constants/theme-scrim';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { usePlanNext } from '@/hooks/usePlanNext';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { itemByKey } from '@/domain/exercise-picker/data';
import { activityFromKey, deriveEquip, resolveModality } from '@/domain/workout/conditioning';
import { useUnits } from '@/lib/settings';
import { groupMarks } from '@/domain/workout/template-groups';
import { customIdOf } from '@/domain/exercise-picker/custom-core';
import { restoreCustomExercise } from '@/data/custom-exercises-live';
import { ExercisePoster } from '@/components/forge/ExercisePoster';
import { nameNearLimit, WORKOUT_NAME_MAX } from '@/domain/text/name-limits';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import {
  deleteTemplate,
  duplicateTemplate,
  durationText,
  fetchTemplateDetail,
  heroSummary,
  historyDate,
  removeTemplateExercise,
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

/** The equipment glyph, engraved in its disc. Bodyweight, Cardio, and anything unmapped get the figure. */
function EquipGlyph({ cls }: { cls: string }) {
  return (
    <EngravedIcon
      name={cls === 'Free Weight' ? 'dumbbell' : cls === 'Machine' ? 'machine' : cls === 'Accessory' || cls === 'Conditioning' ? 'cable' : 'bodyweight'}
      size={18}
    />
  );
}

function Chevron({ size = 15 }: { size?: number }) {
  return <EngravedIcon name="chevron-right" size={size} color={flColor.gray600} />;
}

export default guardRoute(TemplateDetailScreen, hasId, { title: 'Template not found' });

function TemplateDetailScreen() {
  const barBottom = useBarBottom();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const templateId = typeof id === 'string' && id.length > 0 ? id : null;
  const { showToast } = useToast();

  const { data: t, error, loading, refetch } = useQuery(
    () => (templateId ? fetchTemplateDetail(templateId) : Promise.resolve(null)),
    [templateId],
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const { planNext, planSheet } = usePlanNext();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const primeKeyboard = useKeyboardPrimer();
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

  /*
   * ══ THE [DELETED EXERCISE] TOMBSTONE (library-12, `Exercise-001` §8.2, LOCKED) ══
   *
   * Deleting a custom exercise promised that "any template using it will show it as removed until you
   * restore it" — and nothing looked. `fetchTemplateDetail` now reads the athlete's exercises live, so a
   * rename shows here as the new name and a delete marks the row; this is where the athlete meets the
   * problem and its three answers. Restore is the exercise (every template recovers at once, §7.2);
   * Replace and Remove change only this template's row.
   */
  const [removeAsk, setRemoveAsk] = useState<TemplateExercise | null>(null);
  const rowTarget = (e: TemplateExercise) => ({ index: t ? t.exercises.indexOf(e) : -1, catalogKey: e.catalogKey, name: e.name });

  const restoreRow = async (e: TemplateExercise) => {
    const id = customIdOf(e.catalogKey);
    if (!id || busy) return;
    setBusy(true);
    try {
      await restoreCustomExercise(id);
      showToast(`${e.name} is back in your library.`);
      refetch();
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const replaceRow = (e: TemplateExercise) => {
    if (!t) return;
    router.push({
      pathname: '/exercise-picker',
      params: { mode: 'replace', dest: 'template', ex: e.name, template: t.id, row: String(rowTarget(e).index), rowKey: e.catalogKey ?? '', rowName: e.name },
    });
  };

  const doRemoveRow = async () => {
    const e = removeAsk;
    setRemoveAsk(null);
    if (!t || !e) return;
    try {
      const ok = await removeTemplateExercise(t.id, rowTarget(e));
      showToast(ok ? `${e.name} removed from this template.` : 'That template changed — nothing was removed.');
      refetch();
    } catch (err) {
      showToast(errorMessage(err));
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
          <NotFoundBody title="Couldn’t load this template." reason={error} onRetry={refetch} onBack={goBack} />
        </View>
      ) : notFound ? (
        <View style={styles.status}>
          <NotFoundBody title="Template not found" reason="It may have been deleted." onBack={() => router.replace('/templates')} />
        </View>
      ) : t ? (
        <>
          <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
              {templateSections(t).map((sec) => {
                /* The blocks and the tags, per section — the same letters the builder drew when this
                   was authored and the logger will show when it is trained (library-11). */
                const marks = groupMarks(sec.items);
                return (
                <View key={sec.key} style={styles.secBlock}>
                  <View style={styles.secHead}>
                    {/* Bronze marks the block that matters; warm-up and cool-down recede. */}
                    <Text style={[styles.secLabel, sec.key === 'main' ? styles.secLabelMain : null]}>{sec.label.toUpperCase()}</Text>
                    <View style={styles.spacer} />
                    <Text style={styles.secCount}>{sec.items.length}</Text>
                  </View>
                  <View style={styles.exList}>
                    {sec.items.map((e, i) => (
                      <View key={`${e.catalogKey ?? e.name}-${i}`} style={styles.exGroup}>
                        {/* A label, not a card: it says what the rows under it ARE. */}
                        {marks[i].head ? <Text style={styles.groupHead}>{marks[i].head}</Text> : null}
                        {e.customDeleted ? (
                          <DeletedExerciseRow
                            ex={e}
                            busy={busy}
                            onRestore={() => void restoreRow(e)}
                            onReplace={() => replaceRow(e)}
                            onRemove={() => setRemoveAsk(e)}
                          />
                        ) : (
                          <ExerciseRow ex={e} tag={marks[i].tag} />
                        )}
                        <CoachCue note={e.coachNote} />
                      </View>
                    ))}
                  </View>
                </View>
                );
              })}
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
          <View style={[styles.actionBar, { paddingBottom: barBottom }]}>
            <Button
              variant="primary"
              fullWidth
              onPress={() => void start()}
              accessibilityLabel="Start this workout"
              icon={
                <EngravedIcon name="play" size={14} color={flColor.cream100} />
              }
            >
              Start Workout
            </Button>
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => router.push({ pathname: '/workout-builder', params: { id: t.id } })}
                accessibilityRole="button"
                accessibilityLabel="Edit this template"
                style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name="edit" size={15} color={flColor.gray400} />
                <Text style={styles.secondaryText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => void planNext(t)}
                accessibilityRole="button"
                accessibilityLabel="Plan this workout next, on Home"
                style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name="calendar" size={15} color={flColor.gray400} />
                <Text style={styles.secondaryText}>Plan next</Text>
              </Pressable>
              <Pressable
                onPress={() => void doDuplicate()}
                accessibilityRole="button"
                accessibilityLabel="Duplicate this template"
                style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name="copy" size={15} color={flColor.gray400} />
                <Text style={styles.secondaryText}>Duplicate</Text>
              </Pressable>
              <Pressable
                onPress={() => setMoreOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="More actions"
                style={({ pressed }) => [styles.moreBtn, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name="more" size={18} color={flColor.gray400} />
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {/* Delete lives behind the overflow deliberately — it should never be one tap from Start. */}
      {planSheet}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        {/* Renaming moved here when Edit became a real edit. It is still worth its own action — changing
            only the title should not mean opening a builder and saving a whole shape back. */}
        <Pressable
          onPress={() => {
            /* First and synchronously — the rename sheet's field is inside a `<Modal>` that has not
               mounted yet, so its `autoFocus` fires outside this gesture. See `KeyboardPrimer`. */
            primeKeyboard();
            setMoreOpen(false);
            setDraftName(t?.name ?? '');
            setRenameOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Rename template"
          style={({ pressed }) => [styles.moreRow, pressed ? styles.pressed : null]}
        >
          <EngravedIcon name="edit" size={18} color={flColor.gray400} />
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
          <EngravedIcon name="trash" size={18} color={flColor.redMuted} />
          <Text style={styles.destructiveText}>Delete template</Text>
        </Pressable>
        <Pressable onPress={() => setMoreOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancelRow}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename template">
        <TextInput returnKeyType="done"
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Template name"
          placeholderTextColor={flColor.gray600}
          style={styles.input}
          accessibilityLabel="Template name"
          maxLength={WORKOUT_NAME_MAX}
          autoFocus
        />
        {/* Never a silent cut (QA 09-26 library-23): the count shows as the name nears its cap. */}
        {nameNearLimit(draftName.length, WORKOUT_NAME_MAX) ? (
          <Text style={styles.nameCount}>
            {draftName.length}/{WORKOUT_NAME_MAX}
          </Text>
        ) : null}
        <View style={styles.renameSave}>
          <Button
            variant="primary"
            fullWidth
            onPress={() => void doRename()}
            disabled={busy || !draftName.trim()}
            accessibilityLabel="Save name"
          >
            Save
          </Button>
        </View>
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
      <ConfirmSheet
        open={removeAsk != null}
        onClose={() => setRemoveAsk(null)}
        headline="Remove from this template?"
        body={`“${removeAsk?.name ?? ''}” and its sets come out of “${t?.name ?? ''}”. Your other templates and your logged sessions are not touched.`}
        confirmLabel="Remove"
        tone="destructive"
        onConfirm={() => void doRemoveRow()}
      />
    </View>
  );
}

/**
 * `[Deleted Exercise]` — a row whose own custom exercise was deleted (`Exercise-001` §8.2). The name and
 * the prescription stay readable ("retained read-only"); the three answers sit inside the row, because
 * this row is something to act on. Nothing opens on the row itself — there is no exercise to open.
 */
function DeletedExerciseRow({
  ex,
  busy,
  onRestore,
  onReplace,
  onRemove,
}: {
  ex: TemplateExercise;
  busy: boolean;
  onRestore: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const { units, rowUnit } = useUnits();
  return (
    <View style={[styles.exRow, styles.tombRow]} accessible={false}>
      <View style={styles.tombTop}>
        <View style={styles.exIcon}>
          <EngravedIcon name="trash" size={16} color={flColor.gray600} />
        </View>
        <View style={styles.exText}>
          <Text style={[styles.exName, styles.tombName]} numberOfLines={1}>
            {ex.name}
          </Text>
          <Text style={styles.exEquip} numberOfLines={1}>
            Deleted exercise
          </Text>
        </View>
        <Text style={[styles.exScheme, styles.tombScheme]}>{schemeText(ex, { metric: units === 'metric', rowUnit })}</Text>
      </View>
      <View style={styles.tombActions}>
        {[
          { label: 'Restore', a11y: `Restore ${ex.name} to your library`, on: onRestore },
          { label: 'Replace', a11y: `Replace ${ex.name} in this template`, on: onReplace },
          { label: 'Remove', a11y: `Remove ${ex.name} from this template`, on: onRemove },
        ].map((b) => (
          <Pressable
            key={b.label}
            onPress={b.on}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={b.a11y}
            style={({ pressed }) => [styles.tombBtn, pressed ? styles.pressed : null, busy ? styles.disabled : null]}
          >
            <Text style={[styles.tombBtnText, b.label === 'Remove' ? styles.tombBtnDanger : null]}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** One lift: engraved icon disc · name over equipment · scheme in mono · chevron only when it opens. */
function ExerciseRow({ ex, tag }: { ex: TemplateExercise; tag: string | null }) {
  const router = useRouter();
  const { units, rowUnit } = useUnits();
  const rec = ex.catalogKey ? itemByKey(ex.catalogKey) : undefined;
  /* A cardio block is not in the exercise catalogue, so the lookup above finds nothing — and "nothing"
     used to print as "Custom · 1 × 0" (library-03). It names its own ground, the same word the builder's
     card shows, and `schemeText` states its distance and clock. */
  const activity = ex.kind === 'cardio' ? (activityFromKey(ex.catalogKey) ?? 'run') : null;
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
        {/* Only a catalogue row has a poster — a cardio or custom key can only ever 404. */}
        <ExercisePoster exerciseId={rec ? ex.catalogKey : null} radius={18} fallback={<EquipGlyph cls={rec?.equipClass ?? 'Bodyweight'} />} />
      </View>
      <View style={styles.exText}>
        <Text style={styles.exName} numberOfLines={1}>
          {tag ? `${tag}  ` : ''}
          {ex.name}
        </Text>
        <Text style={styles.exEquip} numberOfLines={1}>
          {activity ? deriveEquip(activity, resolveModality(activity, ex.modality)) : (rec?.equip ?? 'Custom')}
        </Text>
      </View>
      <Text style={styles.exScheme}>{schemeText(ex, { metric: units === 'metric', rowUnit })}</Text>
      {open ? <Chevron /> : null}
    </Pressable>
  );
}

/**
 * The author's cue, under the row it belongs to — "4 seconds down, then push up".
 *
 * Written in the builder and shown in the logger, and absent from the one screen that describes the
 * template (library-11). Outside the row's press target on purpose: the row opens the exercise, and a
 * sentence you are reading should not navigate when your thumb rests on it. Italic, as the builder and
 * the logger show it.
 */
function CoachCue({ note }: { note: string | null | undefined }) {
  const text = note?.trim();
  if (!text) return null;
  return (
    <View style={styles.cue} accessible accessibilityLabel={`Coaching note: ${text}`}>
      <EngravedIcon name="document" size={12} color={flColor.gray600} />
      <Text style={styles.cueText}>{text}</Text>
    </View>
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
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: flColor.labelInk, marginBottom: 8 },
  title: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', lineHeight: 33, color: flColor.cream100 },
  summary: { marginTop: 10, fontSize: 13, color: flColor.gray400 },

  stats: { flexDirection: 'row', gap: 1, marginTop: 18, backgroundColor: flColor.charcoal700, borderWidth: 1, borderColor: flColor.charcoal700, borderRadius: flRadius.lg, overflow: 'hidden' },
  statCell: { flex: 1, gap: 5, paddingVertical: 15, paddingHorizontal: 10, backgroundColor: flColor.surfaceRecessed, alignItems: 'center' },
  statValue: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', color: flColor.cream100 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: flColor.labelInk, textAlign: 'center' },

  block: { marginTop: 26 },
  secBlock: { marginBottom: 20 },
  secHead: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingHorizontal: 2, paddingBottom: 9 },
  secLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: flColor.gray600 },
  secLabelMain: { fontSize: 11, color: flColor.labelInk },
  spacer: { flex: 1 },
  secCount: { fontSize: 10, fontWeight: '600', color: flColor.gray600 },
  exList: { gap: 8 },
  exGroup: { gap: 6 },
  groupHead: { marginTop: 4, paddingHorizontal: 2, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.labelInk },
  cue: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 14, paddingBottom: 2 },
  cueText: { flex: 1, fontSize: 12, lineHeight: 17, fontStyle: 'italic', color: flColor.gray400 },

  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  exRowPressed: { borderColor: flColor.accentBorderSubtle },
  exIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center', color: flColor.bronze300 },
  exText: { flex: 1, minWidth: 0, gap: 2 },
  exName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  exEquip: { fontSize: 11.5, color: flColor.gray600 },
  exScheme: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  tombRow: { flexDirection: 'column', alignItems: 'stretch', gap: 10, borderStyle: 'dashed' },
  tombTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tombName: { color: flColor.gray400, textDecorationLine: 'line-through' },
  tombScheme: { color: flColor.gray600 },
  tombActions: { flexDirection: 'row', gap: 8 },
  tombBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  tombBtnText: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },
  tombBtnDanger: { color: flColor.redMuted },

  histRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingVertical: 13, paddingHorizontal: 2, borderTopWidth: 1, borderTopColor: forgeOr<string>('rgba(255,255,255,0.04)', flColor.charcoal700) },
  histRowPressed: { backgroundColor: forgeOr<string>('rgba(255,255,255,0.02)', flColor.hoverWash) },
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

  /* `paddingBottom` comes from `useBarBottom` — see `lib/screen-insets`. */
  actionBar: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.divider, backgroundColor: themeScrim('rgba(6,7,8,0.86)') },
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
  nameCount: { marginTop: 6, alignSelf: 'flex-end', fontSize: 12, color: flColor.gray400 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
