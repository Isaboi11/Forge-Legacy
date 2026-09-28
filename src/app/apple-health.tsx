import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  beginConnect,
  disconnectAppleHealth,
  fetchAppleHealthStatus,
  fetchHeldReview,
  finishConnect,
  resolveHeld,
  setWriteBack,
  syncAppleHealth,
  type ConnectReview,
  type HeldReview,
  type ImportOutcome,
} from '@/data/apple-health-sync-live';
import type { ImportCandidate, PossibleDuplicate } from '@/domain/health/dedup';
import { addButtonLabel, foundSummary, historyHonorsLine, needsLookBadge, notImportedLine } from '@/domain/health/import-rows';
import { duplicateReasonLine, FIRST_PULL_DAYS, lastCheckedLine } from '@/domain/health/sync-state';
import { fmtDistanceIn } from '@/domain/workout/conditioning';
import { useToast } from '@/hooks/useCeremony';
import { useUnits } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';

/**
 * Apple Health — Settings → Training → Apple Health (Build 10 · `Docs/Apple-Health-Build-Plan.md` §3.3–3.5).
 * The first P-7 Connected Apps screen (P-4 §2.1).
 *
 *   before connecting   what is read and what is not, and one button: Connect Apple Health
 *   Review              "Found N workouts from the last 90 days" · each possible duplicate with Keep / Skip
 *                       (Skip pre-selected, DEDUP §3.3) · one "Add N workouts" button
 *   connected           last checked · Check now · "Save Forge workouts to Apple Health" · held possible
 *                       duplicates ("1 workout needs a look") · recent imports · Disconnect + how to revoke
 *
 * No `.dc` exists for this screen; it is built from `health-consent.tsx`'s pieces (same background, bar,
 * section labels and cards), so it reads as one of the Settings family in both themes. Colour comes from
 * role tokens only — bronze marks what the athlete earned or chose (the status, Keep), never decoration.
 *
 * ⚠ THE REVIEW LIST LIVES IN THIS SCREEN'S STATE AND NOWHERE ELSE (§7): HealthKit data is never written to
 *   the device. Leaving the screen before "Add" drops it, and nothing is connected.
 *
 * Apple's wording, not ours, names the thing (Guideline 2.5.1): "Apple Health", and no Health app icon.
 */

type Review = { mode: 'connect'; data: ConnectReview } | { mode: 'held'; data: HeldReview };

export default function AppleHealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { units } = useUnits();
  const unit = units === 'metric' ? 'km' : 'mi';

  const { data: status, loading, refetch } = useQuery(fetchAppleHealthStatus, []);
  const [busy, setBusy] = useState<null | 'connect' | 'add' | 'check' | 'held' | 'disconnect'>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [keep, setKeep] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  const dist = (mi: number | null) => (mi == null ? null : `${fmtDistanceIn(mi, unit)} ${unit}`);
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const line = (r: ImportCandidate) => [day(r.startedAt), dist(r.distanceMi), r.sourceLabel].filter(Boolean).join(' · ');

  const connect = async () => {
    if (busy) return;
    setBusy('connect');
    setEmptyNotice(null);
    try {
      const res = await beginConnect();
      if (res.kind === 'review') {
        setKeep(new Set());
        setReview({ mode: 'connect', data: res.review });
      } else if (res.kind === 'failed') {
        showToast('Couldn’t read Apple Health just now. Try again in a moment.');
      } else if (res.kind === 'unavailable') {
        showToast('Apple Health isn’t available on this device.');
      }
      // 'no_consent': the athlete chose Not now on the consent sheet — nothing to say.
    } finally {
      setBusy(null);
    }
  };

  const openHeld = async () => {
    if (busy) return;
    setBusy('held');
    try {
      const data = await fetchHeldReview();
      if (!data) showToast('Couldn’t read Apple Health just now. Try again in a moment.');
      else {
        setKeep(new Set());
        setReview({ mode: 'held', data });
      }
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!review || busy) return;
    setBusy('add');
    try {
      const out = review.mode === 'connect' ? await finishConnect(review.data, keep) : await resolveHeld(review.data, keep);
      if (review.mode === 'connect' && review.data.found === 0) setEmptyNotice(foundSummary(0, FIRST_PULL_DAYS));
      setReview(null);
      setResult(out);
      if (!out.complete) showToast('Some workouts didn’t save. Forge will try again next time it checks.');
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const checkNow = async () => {
    if (busy) return;
    setBusy('check');
    try {
      const out = await syncAppleHealth({ force: true });
      if (!out) showToast('Couldn’t check Apple Health just now.');
      else if (out.inserted > 0) showToast(`Added ${out.inserted} workout${out.inserted === 1 ? '' : 's'}`);
      else if (out.held > 0) showToast(needsLookBadge(out.held) ?? '');
      else showToast('Up to date');
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const toggleWriteBack = async (on: boolean) => {
    await setWriteBack(on);
    refetch();
  };

  const disconnect = async (remove: boolean) => {
    setDisconnectOpen(false);
    setBusy('disconnect');
    try {
      const removed = await disconnectAppleHealth(remove);
      setResult(null);
      setEmptyNotice(null);
      if (removed == null) showToast('Disconnected. Some imported workouts couldn’t be removed — try again later.');
      else showToast(remove ? `Disconnected. Removed ${removed} imported workout${removed === 1 ? '' : 's'}.` : 'Disconnected');
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const toggleKeep = (id: string, on: boolean) =>
    setKeep((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Apple Health" onBack={review ? () => setReview(null) : back} />

      {loading && !status ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {!status?.available ? (
            <Text style={styles.intro}>
              Apple Health connects on iPhone, in the latest version of Forge. Nothing is read from this device.
            </Text>
          ) : review ? (
            <ReviewView
              review={review}
              keep={keep}
              onKeep={toggleKeep}
              line={line}
              busy={busy === 'add'}
              onAdd={() => void add()}
              onCancel={() => setReview(null)}
            />
          ) : !status.connected ? (
            <>
              <Text style={styles.intro}>
                Runs, walks, rides, swims and rows recorded on your watch or in other apps — Garmin Connect, Apple
                Watch, Strava — show up in your Forge history without typing them in again.
              </Text>

              <Text style={styles.sectionLabel}>What Forge reads</Text>
              <View style={styles.card}>
                <Text style={styles.para}>
                  Your workouts: the type, when it started and ended, the distance, and which app or device recorded
                  it. The first time, Forge looks back {FIRST_PULL_DAYS} days, and you choose what to add.
                </Text>
                <Text style={[styles.para, styles.paraLast]}>
                  Not heart rate, calories, routes, sleep or anything else in Health. Strength, HIIT and yoga
                  sessions aren’t imported — log those in Forge.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>What Forge writes</Text>
              <View style={styles.card}>
                <Text style={[styles.para, styles.paraLast]}>
                  The workouts you finish in Forge, so they count toward your rings in Apple Fitness. You can turn
                  this off after connecting.
                </Text>
              </View>

              {emptyNotice ? <Text style={styles.notice}>{emptyNotice}</Text> : null}

              <View style={styles.action}>
                <Button variant="primary" fullWidth disabled={busy !== null} onPress={() => void connect()} accessibilityLabel="Connect Apple Health">
                  {busy === 'connect' ? 'Reading Apple Health…' : 'Connect Apple Health'}
                </Button>
              </View>
              <Text style={styles.footnote}>
                Free, and you can disconnect at any time. Apple asks you which data to share; Forge only ever sees
                what you allow.
              </Text>
            </>
          ) : (
            <>
              {result ? (
                <View style={styles.card}>
                  <Text style={styles.rowLabel}>
                    {result.inserted > 0 ? `Added ${result.inserted} workout${result.inserted === 1 ? '' : 's'}` : 'Connected'}
                  </Text>
                  {historyHonorsLine(result.honors) ? <Text style={styles.statusOn}>{historyHonorsLine(result.honors)}</Text> : null}
                </View>
              ) : null}
              {emptyNotice ? <Text style={styles.notice}>{emptyNotice}</Text> : null}

              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.card}>
                <Text style={styles.rowLabel}>Connected</Text>
                <Text style={styles.rowHint}>
                  {lastCheckedLine(status.lastCheckedAt, status.readAtMs)} · {status.importedCount} workout
                  {status.importedCount === 1 ? '' : 's'} imported
                </Text>
                <Text style={styles.rowHint}>Forge checks for new workouts each time you open it.</Text>
                <View style={styles.action}>
                  <Button variant="secondary" fullWidth disabled={busy !== null} onPress={() => void checkNow()} accessibilityLabel="Check Apple Health now">
                    {busy === 'check' ? 'Checking…' : 'Check now'}
                  </Button>
                </View>
              </View>

              {status.held > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.rowLabel}>{needsLookBadge(status.held)}</Text>
                  <Text style={styles.rowHint}>They look like workouts already in Forge. Add them, or skip them.</Text>
                  <View style={styles.action}>
                    <Button variant="primary" fullWidth disabled={busy !== null} onPress={() => void openHeld()} accessibilityLabel="Review possible duplicates">
                      {busy === 'held' ? 'Reading Apple Health…' : 'Review'}
                    </Button>
                  </View>
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Write-back</Text>
              <View style={[styles.card, styles.toggleRow]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Save Forge workouts to Apple Health</Text>
                  <Text style={styles.rowHint}>Workouts you finish in Forge count toward your rings.</Text>
                </View>
                <SettingsToggle value={status.writeBack} onChange={(v) => void toggleWriteBack(v)} accessibilityLabel="Save Forge workouts to Apple Health" />
              </View>

              {status.recent.length ? (
                <>
                  <Text style={styles.sectionLabel}>Recent imports</Text>
                  <View style={[styles.card, styles.listCard]}>
                    {status.recent.map((w, i) => (
                      <View key={w.id} style={[styles.listRow, i > 0 && styles.rowBorder]}>
                        <Text style={styles.rowLabel}>{w.name}</Text>
                        <Text style={styles.rowHint}>
                          {[day(w.startedAt), dist(w.distanceMi), w.sourceLabel ? `from ${w.sourceLabel}` : null].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.action}>
                <Button variant="secondary" fullWidth disabled={busy !== null} onPress={() => setDisconnectOpen(true)} accessibilityLabel="Disconnect Apple Health">
                  {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
                </Button>
              </View>
              <Text style={styles.footnote}>
                To fully revoke access, open the Health app → Sharing → Apps → Forge Legacy.
              </Text>
            </>
          )}
        </ScrollView>
      )}

      {/* Disconnect — keeping the imports is the default: they are owned records (DEDUP §1, plan §3.3 step 6). */}
      <BottomSheet open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Disconnect">
        <View style={styles.sheetBody}>
          <Text style={styles.sheetTitle}>Keep your imported workouts?</Text>
          <Text style={styles.para}>
            Forge stops checking Apple Health. The {status?.importedCount ?? 0} workout{status?.importedCount === 1 ? '' : 's'} already
            imported stay in your history unless you remove them.
          </Text>
          <View style={styles.sheetActions}>
            <Button variant="primary" fullWidth onPress={() => void disconnect(false)} accessibilityLabel="Disconnect and keep imported workouts">
              Disconnect, keep them
            </Button>
            <Button variant="destructive" fullWidth onPress={() => void disconnect(true)} accessibilityLabel="Disconnect and remove imported workouts">
              Disconnect and remove them
            </Button>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

/** The Review step — the DEDUP "confirm" moment of ownership (plan §3.3 step 4). */
function ReviewView({
  review,
  keep,
  onKeep,
  line,
  busy,
  onAdd,
  onCancel,
}: {
  review: Review;
  keep: ReadonlySet<string>;
  onKeep: (id: string, on: boolean) => void;
  line: (r: ImportCandidate) => string;
  busy: boolean;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const clean: ImportCandidate[] = review.mode === 'connect' ? review.data.classification.importRows : review.data.clean;
  const dups: PossibleDuplicate[] = review.mode === 'connect' ? review.data.classification.possibleDuplicates : review.data.possibleDuplicates;
  const addCount = clean.length + dups.filter((d) => keep.has(d.row.externalId)).length;
  const other = review.mode === 'connect' ? notImportedLine(review.data.notImported) : null;
  const heading = review.mode === 'connect' ? foundSummary(review.data.found, FIRST_PULL_DAYS) : needsLookBadge(dups.length) ?? 'Nothing to review';

  return (
    <>
      <Text style={styles.intro}>{heading}</Text>
      {other ? <Text style={styles.notice}>{other}</Text> : null}

      {clean.length ? (
        <>
          <Text style={styles.sectionLabel}>To add</Text>
          <View style={[styles.card, styles.listCard]}>
            {clean.map((r, i) => (
              <View key={r.externalId} style={[styles.listRow, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{r.name}</Text>
                <Text style={styles.rowHint}>{line(r)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {dups.length ? (
        <>
          <Text style={styles.sectionLabel}>Possible duplicates</Text>
          <View style={[styles.card, styles.listCard]}>
            {dups.map((d, i) => {
              const on = keep.has(d.row.externalId);
              return (
                <View key={d.row.externalId} style={[styles.listRow, styles.toggleRow, i > 0 && styles.rowBorder]}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{d.row.name}</Text>
                    <Text style={styles.rowHint}>{line(d.row)}</Text>
                    <Text style={styles.rowHint}>{duplicateReasonLine(d.reason)}</Text>
                    <Text style={[styles.keepState, on && styles.statusOn]}>{on ? 'Keep' : 'Skip'}</Text>
                  </View>
                  <SettingsToggle value={on} onChange={(v) => onKeep(d.row.externalId, v)} accessibilityLabel={`Keep ${d.row.name}, ${line(d.row)}`} />
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={styles.action}>
        <Button variant="primary" fullWidth disabled={busy} onPress={onAdd} accessibilityLabel={addCount ? addButtonLabel(addCount) : 'Finish'}>
          {busy ? 'Adding…' : addCount ? addButtonLabel(addCount) : review.mode === 'connect' ? 'Finish connecting' : 'Done'}
        </Button>
      </View>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel} style={styles.linkWrap}>
        <Text style={styles.link}>{review.mode === 'connect' ? 'Not now' : 'Decide later'}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  intro: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 16 },
  notice: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400, marginBottom: 16 },

  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.labelInk,
    marginBottom: 11,
  },

  card: {
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    marginBottom: 16,
  },
  listCard: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  listRow: { paddingVertical: 12, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 2 },
  statusOn: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300, marginTop: 6 },
  keepState: { fontSize: 11.5, fontWeight: '700', color: flColor.gray400, marginTop: 6 },
  para: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 10 },
  paraLast: { marginBottom: 0 },
  action: { marginTop: 4, marginBottom: 12 },

  footnote: { fontSize: 12, lineHeight: 18, color: flColor.gray600, marginTop: 4 },
  linkWrap: { alignSelf: 'center', paddingVertical: 12 },
  link: { fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },

  sheetBody: { paddingHorizontal: 4, paddingBottom: 20 },
  sheetTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100, marginBottom: 10 },
  sheetActions: { gap: 9, marginTop: 8 },
});
