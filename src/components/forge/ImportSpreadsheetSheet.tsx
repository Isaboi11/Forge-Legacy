import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { readProgramPhoto } from '@/data/program-photo-live';
import { resolveExerciseName } from '@/domain/exercise-picker/data';
import { parseProgramTable, summarize, type ParsedWeek } from '@/domain/program/import-parse';
import { distanceUnitFor, fmtDistanceIn, fmtDuration, type CardioActivity } from '@/domain/workout/conditioning';
import { pickTextFile } from '@/lib/pick-text-file';
import { pickImageFromLibrary } from '@/lib/useMediaPicker';

/**
 * ══ IMPORT FROM A SPREADSHEET — the ONE sheet, wherever a plan gets built ══
 *
 * One sheet, two states, per `Forge Program Builder.dc.html`: paste, then preview what was read. It
 * lived inside the Program Builder from the day it was built; the PO then asked for it in the template
 * builders too — *"make sure the import feature for a workout is available in the template builder,
 * both the day and the week"* — and a 200-line sheet copied into a second and third screen is three
 * parsers' worth of drift waiting to happen. So the sheet moved here and the builders mount it.
 *
 * WHAT THE SHEET OWNS: the paste box, the file and screenshot readers, the parse, the preview with its
 * − / + corrections, and the SCOPE — how much of what was read this surface can hold. What it does NOT
 * own is what happens on confirm: it hands the caller the corrected `ParsedWeek[]` and the caller turns
 * that into its own draft, so the program, the week and the day each keep their own clamping and their
 * own toast.
 *
 * ⚠ THE PHOTO PATH IS A THIRD WAY TO FILL THE PASTE BOX, NOT A FOURTH IMPORT PATH. The transcript goes
 * into `pasteText` and through `runParse` — the same parser, the same preview, the same corrections.
 * That is what keeps it inside §4.3's locked *"No AI interpretation. No inference."*
 * `program-photo-wiring.test.mjs` reads THIS file to hold that line.
 */

/**
 * ⛔ PHOTO IMPORT IS HIDDEN FOR LAUNCH — A DECISION, NOT A BUG (PO, 2026-08-21).
 *
 * The feature is BUILT and its code below is untouched. What is missing is the two things it needs to
 * actually run: migration `0174` (the credit weight for `photo_import`) is not applied, and the
 * `program-photo-read` Edge Function is not deployed. `GO-LIVE.md` rules out AI spend before full
 * release, so both are deliberately still pending — which left a control that failed on EVERY tap.
 *
 * ⚠ THIS IS THE GUIDELINE 1.2 LESSON, APPLIED BEFORE IT COSTS US AGAIN. The last submission blocker
 * found in this repo was a button whose only behaviour was a toast reading "Reporting a squad is
 * coming soon" — and the finding was that the toast is WORSE than no button, because it proves inside
 * the binary that the need was known and unmet. A visible "Or read a screenshot" that always fails is
 * the same shape, on a screen a reviewer will certainly open.
 *
 * ⚠ THE HINT COPY IS GATED ON THIS TOO, AND THAT IS THE HALF THAT IS EASY TO FORGET. Hiding the
 * button while leaving the paragraph that promises "Only have a screenshot? Read it in below" is the
 * same defect written in prose — it just fails silently instead of loudly.
 *
 * TO RE-ENABLE: apply `supabase/apply/pending-0174.sql`, deploy `program-photo-read`, then flip this to
 * `true`. Nothing else. Do not flip it before both are true — that is what this constant is for.
 */
const PHOTO_IMPORT_ENABLED = false;

/**
 * How much of a paste the surface can hold.
 *
 *   program — everything: one week or the whole block, and "Add another week" extends it.
 *   week    — one week. A longer paste keeps its FIRST week, and the preview says so before anything
 *             is created; the alternative — clamping quietly on confirm — is the dead end the Program
 *             Builder's comment used to give as the reason for hiding import from week mode at all.
 *   day     — one day. Same rule one level down: a Day column is not needed, and a multi-day paste
 *             keeps its first day and says which.
 */
export type ImportScope = 'program' | 'week' | 'day';

type Props = {
  open: boolean;
  onClose: () => void;
  scope: ImportScope;
  /** The preview's CTA — "Create program", "Create week", "Add to workout". Naming what happens next. */
  cta: string;
  /** The corrected read, already cut to `scope`. Turning it into a draft is the caller's. */
  onConfirm: (weeks: ParsedWeek[]) => void;
};

/**
 * Cut a read down to what the scope can hold, and say what was cut. Returns the note the preview shows
 * ABOVE the summary, or null when nothing was lost.
 */
function fitToScope(weeks: ParsedWeek[], scope: ImportScope): { weeks: ParsedWeek[]; note: string | null } {
  if (scope === 'program' || weeks.length === 0) return { weeks, note: null };
  const first = weeks[0];
  if (scope === 'week') {
    if (weeks.length === 1) return { weeks, note: null };
    return {
      weeks: [{ ...first, index: 1 }],
      note: `Read ${weeks.length} weeks — a week template holds one, so this is week 1. Paste just the week you want for a different one.`,
    };
  }
  const day = first.days[0];
  if (!day) return { weeks, note: null };
  const dayCount = first.days.length;
  const kept: ParsedWeek = { index: 1, days: [day] };
  if (weeks.length === 1 && dayCount === 1) return { weeks: [kept], note: null };
  const what = dayCount > 1 ? `${dayCount} days` : `${weeks.length} weeks`;
  return {
    weeks: [kept],
    note: `Read ${what} — a workout is one day, so this is “${day.name}”. Paste just the day you want for a different one.`,
  };
}

/**
 * Says only what was actually read. A bout the sentence gave no target for reads "Open", which is a real
 * prescription and not a gap: the sheet said go ride, and it did not say how far.
 */
function cardioTargetText(it: { activity?: string; targetSec?: number | null; targetMi?: number | null }): string {
  const parts: string[] = [];
  if (it.targetMi != null) {
    const unit = distanceUnitFor((it.activity ?? 'run') as CardioActivity, false);
    parts.push(`${fmtDistanceIn(it.targetMi, unit)} ${unit}`);
  }
  if (it.targetSec != null) parts.push(fmtDuration(it.targetSec));
  return parts.length ? parts.join(' · ') : 'Open';
}

export function ImportSpreadsheetSheet({ open, onClose, scope, cta, onConfirm }: Props) {
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  /** A photo read is a network round-trip to a vision model — seconds, not milliseconds. It needs to say so. */
  const [photoBusy, setPhotoBusy] = useState(false);
  /** Non-null once a paste has parsed — the sheet flips to its preview state. */
  const [preview, setPreview] = useState<ParsedWeek[] | null>(null);
  /** What `fitToScope` cut, so the preview can say it. */
  const [scopeNote, setScopeNote] = useState<string | null>(null);

  /*
   * A photo read that was in flight when the sheet closed must not land in a sheet that has since been
   * reopened for something else. The close bumps the generation; a read that comes back to a different
   * one is dropped. A ref rather than state because it is read from an async handler, never in render.
   */
  const gen = useRef(0);

  /** The SAME resolver the preview renders and the callers commit — two resolvers would drift. */
  const resolveName = (n: string) => resolveExerciseName(n);

  /** Closing clears everything: the next open starts from an empty box, which is the whole contract. */
  const close = () => {
    gen.current += 1;
    setPasteText('');
    setImportError(null);
    setPreview(null);
    setScopeNote(null);
    setPhotoBusy(false);
    onClose();
  };

  const runParse = (text: string) => {
    const r = parseProgramTable(text);
    if (!r.ok) {
      setImportError(r.error);
      setPreview(null);
      setScopeNote(null);
      return;
    }
    const fit = fitToScope(r.weeks, scope);
    setImportError(null);
    setPreview(fit.weeks);
    setScopeNote(fit.note);
  };

  const onPickFile = async () => {
    const r = await pickTextFile();
    if (!r.ok) {
      if (r.reason) setImportError(r.reason);
      return;
    }
    setPasteText(r.text);
    runParse(r.text);
  };

  /**
   * ══ READ A PHOTO OF A PROGRAM ══
   *
   * `Architecture-Amendment-001-Import.md` §5 named this and deferred it — *"Image Import: screenshots
   * of training tables … requires OCR or vision model parsing. Post-MVP."* It lands as a third way to
   * fill the paste box (see the file comment): if the transcription is imperfect the athlete is looking
   * at editable text they can fix and re-preview, rather than a wrong result and a dead end.
   */
  const onPickPhoto = async () => {
    const uri = await pickImageFromLibrary();
    if (!uri) return; // Cancelled. Not an error, and it must not leave one on screen.

    const mine = gen.current;
    setImportError(null);
    setPhotoBusy(true);
    try {
      const r = await readProgramPhoto(uri);
      if (mine !== gen.current) return; // The sheet closed while we were reading.
      // ⚠ THREE FAILURES THAT FEEL IDENTICAL AND ARE NOT. Brief §6: an outage must be visibly different
      // from a verdict. "We couldn't read that" when the request never left the building tells somebody
      // their program is unreadable, and they will go and retake a photograph that was always fine.
      switch (r.kind) {
        case 'ok':
          setPasteText(r.tsv);
          runParse(r.tsv);
          break;
        case 'not_a_program':
          setImportError('That doesn’t look like a training program. Try a photo of the table itself.');
          break;
        case 'unreadable':
          setImportError('Couldn’t read a table out of that photo. A straighter, closer shot usually does it.');
          break;
        case 'too_large':
          setImportError('That image is too big to read. Try a screenshot rather than a full-size photo.');
          break;
        case 'out_of_credits':
          setImportError('You’re out of Coach AI credits for this month.');
          break;
        default:
          setImportError('Couldn’t reach us to read that photo. Check your connection and try again.');
      }
    } finally {
      // In a `finally` because every branch above needs it and the one that forgot would strand the
      // sheet in its loading state with no way back.
      if (mine === gen.current) setPhotoBusy(false);
    }
  };

  /** Adjust a parsed set/rep count before creating. The design's − / + on every preview row. */
  const bumpPreview = (wi: number, di: number, ii: number, field: 'sets' | 'reps', delta: number) =>
    setPreview((cur) =>
      !cur
        ? cur
        : cur.map((w, a) =>
            a !== wi
              ? w
              : {
                  ...w,
                  days: w.days.map((d, b) =>
                    b !== di
                      ? d
                      : {
                          ...d,
                          items: d.items.map((it, c) =>
                            c !== ii
                              ? it
                              : {
                                  ...it,
                                  [field]: Math.max(1, Math.min(field === 'sets' ? 20 : 100, it[field] + delta)),
                                  // Adjusting a value makes it authored, not assumed — the flag stops
                                  // claiming the sheet was silent once the athlete has spoken.
                                  [field === 'sets' ? 'setsAssumed' : 'repsAssumed']: false,
                                },
                          ),
                        },
                  ),
                },
          ),
    );

  /** "Add another week" — copies the last week forward, which is how a block is usually extended. */
  const addPreviewWeek = () =>
    setPreview((cur) => {
      if (!cur?.length) return cur;
      const last = cur[cur.length - 1];
      return [...cur, { index: last.index + 1, days: last.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })) }];
    });

  const confirm = () => {
    if (!preview?.length) return;
    const weeks = preview;
    close();
    onConfirm(weeks);
  };

  return (
    /* `scroll` because an imported program is long — six days and forty-five exercises ran off the top
       of the screen with no way back. The actions live in the FOOTER so they stay put while the
       preview scrolls; buried under forty-five rows they may as well not exist. */
    <BottomSheet
      open={open}
      onClose={close}
      title="Import from spreadsheet"
      scroll
      footer={
        preview == null ? undefined : (
          <View style={styles.impActions}>
            <View style={styles.impBackBtn}>
              <Button variant="secondary" fullWidth onPress={() => setPreview(null)}>
                Back
              </Button>
            </View>
            <View style={styles.impCreateBtn}>
              <Button variant="primary" fullWidth onPress={confirm}>
                {cta}
              </Button>
            </View>
          </View>
        )
      }
    >
      {preview == null ? (
        <View style={styles.impCol}>
          {/* The paste state's copy IS the parser's contract, so it states exactly what is read rather than
              describing a format vaguely. The last sentence is the scope's. */}
          <Text style={styles.impHint}>
            Paste rows from Excel or Google Sheets. Include a header row — columns can be in any order.
            We look for <Text style={styles.impHintStrong}>Week</Text>, <Text style={styles.impHintStrong}>Day</Text>,{' '}
            <Text style={styles.impHintStrong}>Exercise</Text>, <Text style={styles.impHintStrong}>Sets</Text>,{' '}
            <Text style={styles.impHintStrong}>Reps</Text>.{' '}
            {scope === 'program'
              ? 'One week or the whole program — either works.'
              : scope === 'week'
                ? 'One week at a time — a longer paste keeps its first week.'
                : 'One day at a time — Week and Day aren’t needed, and a longer paste keeps its first day.'}
            {'\n\n'}
            Keep it one row per <Text style={styles.impHintStrong}>day</Text> instead? That works too —
            write the session out (&ldquo;75min bike Z2 + 30min upper strength&rdquo;) and we&rsquo;ll read the
            rides, runs and swims out of it. Check what we read before you {scope === 'program' ? 'create it' : 'use it'}.
            {PHOTO_IMPORT_ENABLED ? (
              <>
              {'\n\n'}
              Only have a <Text style={styles.impHintStrong}>screenshot</Text>? Read it in below — we type
              the table out for you and it lands in the box above, where you can fix anything we misread
              before previewing it.
              </>
            ) : null}
          </Text>
          <TextInput
            value={pasteText}
            onChangeText={setPasteText}
            multiline
            placeholder={
              scope === 'day'
                ? 'Exercise, Sets, Reps\nBench Press, 3, 8\nIncline DB Press, 3, 10'
                : 'Week, Day, Exercise, Sets, Reps\n1, Push A, Bench Press, 3, 8\n1, Push A, Incline DB Press, 3, 10'
            }
            placeholderTextColor={flColor.gray600}
            accessibilityLabel="Paste your spreadsheet rows"
            style={styles.impPaste}
          />
          {importError ? <Text style={styles.impError}>{importError}</Text> : null}
          <Button variant="primary" fullWidth onPress={() => runParse(pasteText)}>
            Preview import
          </Button>
          <Pressable
            onPress={() => void onPickFile()}
            accessibilityRole="button"
            accessibilityLabel="Upload a CSV file"
            style={({ pressed }) => [styles.impFileBtn, pressed ? styles.impPressed : null]}
          >
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <Path d="M14 3v6h6" />
            </Svg>
            <Text style={styles.impFileText}>Or upload a .csv file</Text>
          </Pressable>
          {/* ⚠ LIBRARY ONLY, AND THAT IS A DECISION — see `pickImageFromLibrary`. The label says
              "screenshot" rather than "photo" because that is both the real use case and the honest
              description of what this opens: your camera roll, not your camera. */}
          {PHOTO_IMPORT_ENABLED ? (
            <Pressable
              onPress={() => void onPickPhoto()}
              disabled={photoBusy}
              accessibilityRole="button"
              accessibilityLabel="Read a screenshot of a program"
              accessibilityState={{ disabled: photoBusy, busy: photoBusy }}
              style={({ pressed }) => [
                styles.impFileBtn,
                pressed && !photoBusy ? styles.impPressed : null,
                photoBusy ? styles.impBusy : null,
              ]}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <Circle cx={8.5} cy={8.5} r={1.5} />
                <Path d="M21 15l-5-5L5 21" />
              </Svg>
              <Text style={styles.impFileText}>
                {photoBusy ? 'Reading your screenshot…' : 'Or read a screenshot'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.impCol}>
          {/* What the scope cut, said BEFORE the summary — the athlete should learn that three of their
              four days are not coming while they can still go back, not from the draft afterwards. */}
          {scopeNote ? <Text style={styles.impScopeNote}>{scopeNote}</Text> : null}
          <View style={styles.impSummary}>
            <Text style={styles.impSummaryLabel}>Here&apos;s what we read</Text>
            <Text style={styles.impSummaryText}>{summarize(preview)}</Text>
          </View>
          <Text style={styles.impNote}>
            Tap − / + to fix any sets × reps now. Grey text is the sentence we read it from — it is kept
            as a coaching note, so anything we couldn&rsquo;t turn into a number still reaches you. You can
            rename, reorder and add exercises after{scope === 'program' ? ' you create the program' : 'wards'}.
          </Text>

          {preview.map((w, wi) => (
            <View key={`w${w.index}`} style={styles.impWeekBlock}>
              {preview.length > 1 ? (
                <View style={styles.impWeekHead}>
                  <Text style={styles.impWeekLabel}>Week {w.index}</Text>
                  <View style={styles.impWeekRule} />
                </View>
              ) : null}
              {w.days.map((d, di) => (
                <View key={`${w.index}-${d.letter}`} style={styles.impDayCard}>
                  <Text style={styles.impDayName}>{d.name}</Text>
                  <View style={styles.impItems}>
                    {d.items.map((it, ii) => (
                      <View key={`${it.name}-${ii}`} style={styles.impItemRow}>
                        <View style={styles.impItemText}>
                          <Text style={styles.impItemName} numberOfLines={1}>
                            {it.name}
                          </Text>
                          {/*
                            ══ THE SENTENCE IT CAME FROM ══

                            Shown because this reader is a HEURISTIC and the preview is what makes that
                            honest. The athlete can see that "75min bike Z2 w/ 3x8min Z3" was read as a
                            75-minute ride, and that the interval detail it could not structure has been
                            kept as a coaching note rather than dropped. Without this line, a confident
                            wrong reading looks exactly like a right one.
                          */}
                          {it.note && it.note !== it.name ? (
                            <Text style={styles.impItemSource} numberOfLines={2}>
                              {it.note}
                            </Text>
                          ) : null}
                          {/* WHAT THE NAME RESOLVED TO, before anything is created.
                              A match found by the equipment convention rather than by the words is a
                              judgement, not a fact — showing it is what makes the convention honest,
                              and the athlete can swap the exercise in the builder afterwards. */}
                          {(() => {
                            // A bout is not looked up: its key is the `cardio:<activity>` convention.
                            if (it.kind === 'cardio') return null;
                            const hit = resolveName(it.name);
                            if (!hit) return <Text style={styles.impItemUnmatched}>not in the library · kept as written</Text>;
                            if (hit.name.toLowerCase() === it.name.trim().toLowerCase()) return null;
                            return (
                              <Text style={styles.impItemMatched} numberOfLines={1}>
                                {hit.byPreference ? '≈ ' : '→ '}
                                {hit.name}
                              </Text>
                            );
                          })()}
                        </View>
                        {/* A bout states its TARGET. Sets × reps is not a thing a 75-minute ride has,
                            and steppers for them would invite editing a number that does not exist. */}
                        {it.kind === 'cardio' ? (
                          <Text style={styles.impTarget}>{cardioTargetText(it)}</Text>
                        ) : (
                        <View style={styles.impSteppers}>
                          <ImpStep label={`Fewer sets of ${it.name}`} glyph="−" onPress={() => bumpPreview(wi, di, ii, 'sets', -1)} />
                          <Text style={[styles.impNum, it.setsAssumed ? styles.impNumAssumed : null]}>{it.sets}</Text>
                          <ImpStep label={`More sets of ${it.name}`} glyph="+" onPress={() => bumpPreview(wi, di, ii, 'sets', 1)} />
                          <Text style={styles.impTimes}>×</Text>
                          <ImpStep label={`Fewer reps of ${it.name}`} glyph="−" onPress={() => bumpPreview(wi, di, ii, 'reps', -1)} />
                          <Text style={[styles.impNum, styles.impNumWide, it.repsAssumed ? styles.impNumAssumed : null]}>{it.reps}</Text>
                          <ImpStep label={`More reps of ${it.name}`} glyph="+" onPress={() => bumpPreview(wi, di, ii, 'reps', 1)} />
                        </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}

          {/* Only a PROGRAM grows by the week — a week template is one and a workout is one day. */}
          {scope === 'program' ? (
            <Pressable
              onPress={addPreviewWeek}
              accessibilityRole="button"
              accessibilityLabel="Add another week"
              style={({ pressed }) => [styles.impAddWeek, pressed ? styles.impPressed : null]}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 5v14M5 12h14" />
              </Svg>
              <Text style={styles.impAddWeekText}>Add another week</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

function ImpStep({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.impStep, pressed ? styles.impPressed : null]}
    >
      <Text style={styles.impStepGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  impCol: { gap: 12, paddingTop: 2 },
  impHint: { fontFamily: flFont.sans, fontSize: 12.5, lineHeight: 19, color: flColor.gray400 },
  impHintStrong: { color: flColor.cream100, fontWeight: '700' },
  impPaste: {
    height: 148,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    textAlignVertical: 'top',
  },
  impError: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.redMuted },
  impFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10 },
  impFileText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  impPressed: { opacity: 0.6 },
  /** Distinct from `impPressed` — a press is momentary, this holds for the length of the read. */
  impBusy: { opacity: 0.45 },

  /* The scope's cut, in the same voice as the error line but not its colour: nothing went wrong. */
  impScopeNote: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.bronze300 },
  impSummary: { padding: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  impSummaryLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 5 },
  impSummaryText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  impNote: { fontFamily: flFont.sans, fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  impWeekBlock: { gap: 10 },
  impWeekHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  impWeekLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  impWeekRule: { flex: 1, height: 1, backgroundColor: flColor.charcoal600 },

  impDayCard: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, overflow: 'hidden' },
  impDayName: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '700', color: flColor.cream100, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  impItems: { gap: 6, paddingVertical: 10, paddingHorizontal: 12 },
  impItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  impItemText: { flex: 1, gap: 1 },
  impItemName: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  impItemSource: { fontFamily: flFont.sans, fontSize: 10.5, lineHeight: 14, color: flColor.gray600 },
  impItemMatched: { fontFamily: flFont.sans, fontSize: 10.5, color: flColor.bronze400 },
  impItemUnmatched: { fontFamily: flFont.sans, fontSize: 10.5, color: flColor.gray600 },
  impTarget: { fontFamily: flFont.sans, fontSize: 12, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  impSteppers: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  impStep: { width: 22, height: 22, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  impStepGlyph: { fontSize: 13, lineHeight: 15, color: flColor.gray400 },
  impNum: { fontSize: 12, color: flColor.cream100, width: 16, textAlign: 'center', fontVariant: ['tabular-nums'] },
  impNumWide: { width: 22 },
  /* An assumed number is dimmer — the sheet did not say it, and the athlete should see the difference. */
  impNumAssumed: { color: flColor.gray600 },
  impTimes: { fontSize: 11, color: flColor.gray600, marginHorizontal: 1 },

  impAddWeek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal500 },
  impAddWeekText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  impActions: { flexDirection: 'row', gap: 10 },
  impBackBtn: { flexBasis: 96 },
  impCreateBtn: { flex: 1 },
});
