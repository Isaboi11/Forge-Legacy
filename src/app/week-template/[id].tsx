import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { Button } from '@/components/forge/composites/Button/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import {
  deleteWeekTemplate,
  duplicateWeekTemplate,
  fetchWeekTemplate,
  startWeekTemplate,
  weekSummary,
} from '@/data/week-templates-live';
import { fetchActiveProgram } from '@/data/programs-live';
import { dayLabel, plannedDays, trainingDays } from '@/domain/program/progress-core';
import { schemeText } from '@/domain/program/prescription';

/**
 * W-29 Week Template Detail — one week you can run again.
 *
 * ══ WHAT THIS SCREEN IS, AND WHAT IT DELIBERATELY IS NOT ══
 *
 * It mirrors W-27 (Workout Template Detail) in shape: hero, contents, sticky action bar, destructive
 * action behind the overflow. It differs in one structural way, and the difference is the point:
 *
 * **A week template has no history section.** A workout template records how many times it was used,
 * because a session logged FROM it carries `template_id`. A week template's history is the PROGRAMS it
 * produced — and each of those has its own detail screen, its own log and its own sealed record. Listing
 * them here would be a worse version of a screen that already exists, so instead running one takes you
 * to it. That absence is a decision; an empty "Times used" row would have been the alternative.
 *
 * ══ THE ONE THING THIS SCREEN MUST NOT DO QUIETLY ══
 *
 * Starting a week ENDS whatever program is active — one Active program at a time, no exceptions
 * (Program-Architecture-Amendment-001 §2), enforced server-side inside `start_program`. So Start asks
 * first, by name, whenever there is something to lose. It is the same conflict the Program Detail screen
 * raises, and it must not be softer here just because a week feels smaller than a program: an athlete
 * six weeks into a twelve-week block would lose it to a deload week they thought was additive.
 */

export default function WeekTemplateDetail() {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const load = useCallback(async () => {
    if (!id) return { week: null, active: null };
    const [week, active] = await Promise.all([fetchWeekTemplate(id), fetchActiveProgram()]);
    return { week, active };
  }, [id]);

  const { data, loading, error, refetch } = useQuery(load);
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));

  const week = data?.week ?? null;
  const active = data?.active ?? null;

  const [busy, setBusy] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/templates'));

  const runIt = async () => {
    if (!week || busy) return;
    setConfirmStart(false);
    setBusy(true);
    try {
      const { programId, endedProgramId } = await startWeekTemplate(week.id);
      // Name what was ended. A silent swap is how an athlete discovers days later that their block
      // stopped, and by then the record says they ended it deliberately.
      if (endedProgramId) showToast('Your previous program was ended.');
      router.replace({ pathname: '/program/[id]', params: { id: programId } });
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  const onStart = () => {
    if (!week || busy) return;
    // Only ask when there is genuinely something to lose.
    if (active) setConfirmStart(true);
    else void runIt();
  };

  const doDuplicate = async () => {
    if (!week || busy) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      const { id: copyId } = await duplicateWeekTemplate(week.id);
      router.replace({ pathname: '/week-template/[id]', params: { id: copyId } });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!week) return;
    setConfirmDelete(false);
    try {
      await deleteWeekTemplate(week.id);
      // Deleting the SHAPE never touches the programs it produced — those are permanent records
      // (PA2-D7) and `on delete set null` keeps them whole. Say so, or the confirmation reads as a
      // threat to training the athlete has already done.
      showToast('Week deleted. Any programs you ran from it stay.');
      router.replace('/templates');
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const notFound = !loading && !error && !week;
  const days = week ? trainingDays(plannedDays(week.structure, 0)) : [];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.34)' }} />

      <AppBar
        onBack={goBack}
        title={
          <Text style={styles.barTitle} numberOfLines={1}>
            {week?.name ?? 'Week'}
          </Text>
        }
        actions={
          week ? (
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="More actions"
              hitSlop={8}
              style={styles.barBtn}
            >
              <Text style={styles.barBtnText}>•••</Text>
            </Pressable>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>Couldn&apos;t load this week.</Text>
          <Text style={styles.statusDetail}>{errorMessage(error)}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : notFound ? (
        <View style={styles.status}>
          <Text style={styles.notFoundTitle}>Week not found</Text>
          <Text style={styles.statusDetail}>It may have been deleted.</Text>
          <Pressable onPress={() => router.replace('/templates')} accessibilityRole="button" accessibilityLabel="Back to Templates" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Back to Templates</Text>
          </Pressable>
        </View>
      ) : week ? (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>WEEK TEMPLATE</Text>
            <Text style={styles.title}>{week.name}</Text>
            <Text style={styles.summary}>{weekSummary(week)}</Text>

            {/* States the two facts an athlete cannot infer from the contents: running it starts a real
                program that cues its own sessions, and it earns no rank credit (D-RCM-30). Said once,
                plainly, here — not repeated on the button, and never framed as a warning. */}
            <View style={styles.note}>
              <Text style={styles.noteText}>
                Starting this creates a one-week program that cues each session as you finish the last.
                It won&apos;t count toward your rank — everything you log still does.
              </Text>
            </View>

            {days.map((d, i) => {
              const rows = [...d.warmup, ...d.main, ...d.cooldown];
              return (
                <View key={i} style={styles.dayCard}>
                  <Text style={styles.dayName}>{dayLabel(d, i)}</Text>
                  {rows.length ? (
                    rows.map((ex, j) => (
                      <View key={j} style={styles.exRow}>
                        <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                        <Text style={styles.exScheme}>{schemeText(ex)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.exEmpty}>Nothing built yet</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Start is the one bronze thing on the screen. Edit and Duplicate are quiet peers; Delete is
              behind the overflow, per W-27's own rule that a destructive action must never be one tap
              from the primary one. */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              onPress={onStart}
              disabled={busy}
              accessibilityLabel="Start this week"
            >
              {busy ? 'Starting…' : 'Start This Week'}
            </Button>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => router.push({ pathname: '/program-builder', params: { mode: 'week', o: 'edit', id: week.id } })}
                accessibilityRole="button"
                accessibilityLabel="Edit this week"
                style={({ pressed }) => [styles.quietBtn, pressed && styles.pressed]}
              >
                <Text style={styles.quietBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={doDuplicate}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Duplicate this week"
                style={({ pressed }) => [styles.quietBtn, pressed && styles.pressed]}
              >
                <Text style={styles.quietBtnText}>Duplicate</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      <ConfirmSheet
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        headline="You already have an active program"
        body={`Starting “${week?.name ?? 'this week'}” will end ${active ? `“${active.name}”` : 'your current program'}. That can't be undone — the record will show it ended early.`}
        confirmLabel="End it and start this week"
        cancelLabel="Keep my program"
        tone="destructive"
        onConfirm={() => void runIt()}
      />

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        headline="Delete this week?"
        body="The week template goes. Any programs you already ran from it — and everything you logged — stay exactly as they are."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="destructive"
        onConfirm={() => void doDelete()}
      />

      <ConfirmSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        headline={week?.name ?? 'Week'}
        body="Delete this week template. Programs you ran from it are not affected."
        confirmLabel="Delete week"
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={() => {
          setMenuOpen(false);
          setConfirmDelete(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  barTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  barBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  barBtnText: { fontSize: 15, color: flColor.gray400, letterSpacing: 1 },

  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  statusText: { fontSize: 14, color: flColor.cream100 },
  statusDetail: { fontSize: 12, color: flColor.gray600, textAlign: 'center' },
  notFoundTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  outlineBtn: {
    marginTop: 6, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600,
  },
  outlineBtnText: { fontSize: 13, color: flColor.cream100 },

  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 176 },
  eyebrow: { fontSize: 10, letterSpacing: 1.6, color: flColor.bronze400, marginBottom: 6 },
  title: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', color: flColor.cream100 },
  summary: { marginTop: 4, fontSize: 13, color: flColor.gray400 },

  note: {
    marginTop: 16, padding: 14,
    borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  noteText: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  dayCard: {
    marginTop: 14, padding: 14,
    borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  dayName: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100, marginBottom: 8 },
  exRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  exName: { flex: 1, fontSize: 13, color: flColor.cream100 },
  exScheme: { fontSize: 12, color: flColor.gray600 },
  exEmpty: { fontSize: 12, color: flColor.gray600, fontStyle: 'italic' },

  actions: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30,
    backgroundColor: flColor.base, borderTopWidth: 1, borderTopColor: flColor.charcoal700,
    gap: 10,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  quietBtn: {
    flex: 1, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600,
  },
  quietBtnText: { fontSize: 13, color: flColor.cream100 },
  pressed: { opacity: 0.7 },
});
