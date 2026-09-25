/**
 * ══ BUILD A PROGRAM → PASTE A PROGRAM / UPLOAD PICTURES ══
 *
 * The PO's mockup (2026-09-21): two dedicated screens where there used to be one bottom sheet carrying
 * four paragraphs, a text box, a PDF button and a screenshot button. *"Paste workout → Preview"* and
 * *"Upload screenshots → Review thumbnails → Preview"* — the user should know what to do in two seconds.
 *
 * ══ ⚠ NOTHING ABOUT READING A PROGRAM IS NEW HERE ══
 *
 * This file is presentation. Every decision about what a program IS stays where it was:
 *   · text      → `parseProgramTable` (the same parser the sheet runs)
 *   · a PDF     → `pickTextFile` → its text lands in the box, like any paste
 *   · a photo   → `readProgramPhoto` (the Edge Function transcribes; the parser decides)
 *   · the scope → `fitToScope('program')`
 *   · preview   → `ImportPreview`, the sheet's own preview component
 *   · the draft → `draftFromImport`, the builder's own conversion, then `/program-builder?o=imported`,
 *                 which spends the free import on Save exactly as the sheet path does.
 *
 * ⚠ SEVERAL PHOTOS ARE READ ONE AT A TIME AND PARSED ONE AT A TIME, then joined by
 * `mergeParsedWeeks` in thumbnail order. Each transcript carries its own header row; gluing the text
 * together first would make the second header a data row.
 *
 * ⚠ A READ IS CACHED PER PHOTO for the life of the screen. Each read costs Premium AI credits and API
 * money; going back from the preview to add one more photo must not re-read the three already read.
 */
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ImportPreview, PHOTO_IMPORT_LIVE, fitToScope } from '@/components/forge/ImportSpreadsheetSheet';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenBoundary } from '@/components/screen-boundary';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { readProgramPhoto, type PhotoReadResult } from '@/data/program-photo-live';
import { resolveExerciseName } from '@/domain/exercise-picker/data';
import { parseProgramTable, type ParsedWeek } from '@/domain/program/import-parse';
import { mergeParsedWeeks } from '@/domain/program/import-merge';
import { useToast } from '@/hooks/useCeremony';
import { pickTextFile } from '@/lib/pick-text-file';
import { loadProgramDraft, newDraft, saveProgramDraft } from '@/lib/program-draft';
import { draftHasContent } from '@/lib/program-draft-model';
import { usePremiumAi } from '@/lib/entitlement';
import { draftFromImport } from '@/lib/program-import-draft';
import { pickImagesFromLibrary } from '@/lib/useMediaPicker';

/** How many photos one import takes. Each is a paid read; six covers a six-day week, one photo a day. */
const MAX_PHOTOS = 6;

/** Enough to be worth a parse — one exercise line ("Squat 3x5") is about this long. */
const MIN_PASTE_CHARS = 6;

const EXAMPLE = 'Week 1\nDay 1 – Upper\nBench Press 4x8\nBarbell Row 4x8\n\nDay 2 – Lower\nBack Squat 4x6\nRDL 3x8';

/** The photo reader's outcomes, in words — kept identical to the sheet's, so both doors say the same. */
function photoError(r: Exclude<PhotoReadResult, { kind: 'ok' }>, n: number, total: number): string {
  const which = total > 1 ? `Photo ${n}: ` : '';
  switch (r.kind) {
    case 'not_a_program':
      return `${which}That doesn’t look like a training program. Try a photo of the table itself.`;
    case 'unreadable':
      return `${which}Couldn’t read a table out of that photo. A straighter, closer shot usually does it.`;
    case 'too_large':
      return `${which}That image is too big to read. Try a screenshot rather than a full-size photo.`;
    case 'out_of_credits':
      return 'You’re out of Premium AI credits for this month.';
    case 'daily_limit':
      return 'That’s a lot of photos for one day. Try again tomorrow, or paste the program as text.';
    case 'not_entitled':
      return 'Reading photos is part of Premium AI. Paste the program as text instead.';
    case 'unsupported_format':
      return `${which}That image type can’t be read. Take a screenshot of it and upload that instead.`;
    case 'unavailable':
      return 'Photo reading isn’t working right now. Try again in a bit, or paste the program as text.';
    default:
      return 'Couldn’t reach us to read that photo. Check your connection and try again.';
  }
}

export default function ProgramImportScreen() {
  const router = useRouter();
  return (
    <ScreenBoundary name="Program import" onBack={() => router.back()}>
      <ProgramImport />
    </ScreenBoundary>
  );
}

function ProgramImport() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { m } = useLocalSearchParams<{ m?: string }>();
  /*
   * ⚠ THE PHOTO READER IS PREMIUM AI ONLY (0203), AND A LINK IS NOT A CARD. Build a Program hides the
   * Upload pictures card from everyone else, but `/program-import?m=photo` still opened the uploader —
   * and every read then failed at the server (stress test, 2026-09-21). Without the add-on this is the
   * paste screen, which is what that athlete can actually use.
   */
  const premiumAi = usePremiumAi();
  const photoOn = PHOTO_IMPORT_LIVE && premiumAi;
  const mode: 'paste' | 'photo' = m === 'photo' && photoOn ? 'photo' : 'paste';

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedWeek[] | null>(null);
  const [scopeNote, setScopeNote] = useState<string | null>(null);
  /** Lines the parser did not take as training — the preview lists them (`ParseResult.skipped`). */
  const [skipped, setSkipped] = useState<string[]>([]);
  /** uri → what that photo read. See the file header: a read costs money, so it happens once. */
  const reads = useRef(new Map<string, { weeks: ParsedWeek[]; skipped: string[] }>());

  const back = () => {
    if (preview) {
      setPreview(null);
      return;
    }
    router.back();
  };
  /* Cancel leaves Build a Program altogether — back to Workouts, which is where every door into it is. */
  const cancel = () => router.dismissTo('/workouts');

  const showPreview = (weeks: ParsedWeek[], notRead: string[] = []) => {
    const fit = fitToScope(weeks, 'program');
    setError(null);
    setScopeNote(fit.note);
    setSkipped(notRead);
    setPreview(fit.weeks);
  };

  // ── paste ────────────────────────────────────────────────────────────────────────────────────────
  const previewPaste = () => {
    const r = parseProgramTable(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    showPreview(r.weeks, r.skipped);
  };

  const uploadPdf = async () => {
    const r = await pickTextFile();
    if (!r.ok) {
      if (r.reason) setError(r.reason);
      return;
    }
    // The PDF's text lands in the box like any paste — the athlete can fix it, then preview.
    setError(null);
    setText(r.text);
  };

  // ── photos ───────────────────────────────────────────────────────────────────────────────────────
  const addPhotos = async () => {
    const picked = await pickImagesFromLibrary(MAX_PHOTOS - photos.length);
    if (picked === 'failed') {
      // The browser could not open one of them — on a computer that is nearly always an iPhone HEIC —
      // and the picker drops the whole selection when that happens. See `pickImagesFromLibrary`.
      setError(
        'One of those photos couldn’t be opened here — iPhone photos (HEIC) don’t open in every browser. Take a screenshot of it and upload that, or pick the others again without it.',
      );
      return;
    }
    if (!picked.length) return; // Cancelled — not an error.
    setError(null);
    setPhotos((cur) => [...cur, ...picked].slice(0, MAX_PHOTOS));
  };
  const removePhoto = (i: number) => setPhotos((cur) => cur.filter((_, k) => k !== i));
  /* Order is the order the days run (`mergeParsedWeeks`), so it is movable — one step earlier per tap. */
  const moveEarlier = (i: number) =>
    setPhotos((cur) => {
      if (i <= 0) return cur;
      const next = [...cur];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });

  /*
   * ⚠ ONE READ AT A TIME, HELD BY A REF. `busy` disables the button only once React re-renders, and a
   * fast double tap lands both taps before that — two loops, and every photo paid for twice. A ref is
   * set synchronously inside the first tap.
   */
  const reading = useRef(false);
  const previewPhotos = async () => {
    if (reading.current) return;
    reading.current = true;
    try {
      await readAllPhotos();
    } finally {
      reading.current = false;
    }
  };
  const readAllPhotos = async () => {
    setError(null);
    const parts: ParsedWeek[][] = [];
    const notRead: string[] = [];
    for (let i = 0; i < photos.length; i += 1) {
      const uri = photos[i];
      const cached = reads.current.get(uri);
      if (cached) {
        parts.push(cached.weeks);
        notRead.push(...cached.skipped);
        continue;
      }
      setBusy(photos.length > 1 ? `Reading photo ${i + 1} of ${photos.length}…` : 'Reading your photo…');
      const r = await readProgramPhoto(uri);
      if (r.kind !== 'ok') {
        setBusy(null);
        setError(photoError(r, i + 1, photos.length));
        return;
      }
      const parsed = parseProgramTable(r.tsv);
      if (!parsed.ok) {
        setBusy(null);
        setError(photos.length > 1 ? `Photo ${i + 1}: ${parsed.error}` : parsed.error);
        return;
      }
      reads.current.set(uri, { weeks: parsed.weeks, skipped: parsed.skipped ?? [] });
      parts.push(parsed.weeks);
      notRead.push(...(parsed.skipped ?? []));
    }
    setBusy(null);
    showPreview(mergeParsedWeeks(parts), notRead);
  };

  // ── create ───────────────────────────────────────────────────────────────────────────────────────
  /**
   * ⚠ CREATING REPLACES THE PROGRAM ALREADY IN THE BUILDER, so it asks first.
   *
   * There is ONE draft. An import writes over it, and a half-built program — a name, days, exercises
   * someone had been adding — disappeared without a word (PO, 2026-09-22). `draftHasContent` is the
   * same test the builder uses before it lets anybody leave.
   */
  const [confirmReplace, setConfirmReplace] = useState(false);

  const writeDraft = async () => {
    if (!preview?.length) return;
    const r = draftFromImport(newDraft(), preview, {
      isWeek: false,
      resolveKey: (n) => resolveExerciseName(n)?.key,
    });
    if (!r) return;
    await saveProgramDraft(r.draft);
    showToast(r.toast);
    router.replace('/program-builder?o=imported');
  };

  const create = async () => {
    if (!preview?.length) return;
    const existing = await loadProgramDraft();
    if (existing && draftHasContent(existing)) {
      setConfirmReplace(true);
      return;
    }
    await writeDraft();
  };

  const canPreview = mode === 'paste' ? text.trim().length >= MIN_PASTE_CHARS : photos.length > 0 && busy == null;

  return (
    <View style={styles.screen}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />
      <AppBar
        title="Build a Program"
        onBack={back}
        actions={
          <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          {preview ? (
            <ImportPreview weeks={preview} onChange={setPreview} scope="program" scopeNote={scopeNote} skipped={skipped} />
          ) : mode === 'paste' ? (
            <>
              <IconPlate>
                <DocGlyph />
              </IconPlate>
              <Text style={styles.title}>Paste your program</Text>
              <Text style={styles.sub}>Copy and paste your workout from anywhere — Notes, Google Sheets, a PDF, etc.</Text>

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <BulbGlyph />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>We’ll look for</Text>
                  <Text style={styles.infoStrong}>Week, Day, Exercise, Sets, Reps</Text>
                  <Text style={styles.infoSub}>One week or the full program — either works.</Text>
                </View>
              </View>

              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  if (error) setError(null);
                }}
                multiline
                scrollEnabled
                placeholder="Paste your program here…"
                placeholderTextColor={flColor.gray600}
                accessibilityLabel="Paste your program"
                style={styles.pasteBox}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable onPress={() => void uploadPdf()} accessibilityRole="button" hitSlop={6} style={styles.quietBtn}>
                <Text style={styles.quiet}>Upload a PDF instead</Text>
              </Pressable>

              <Text style={styles.exampleLabel}>Example format:</Text>
              <View style={styles.exampleCard}>
                <Text style={styles.exampleText}>{EXAMPLE}</Text>
                <Pressable
                  onPress={() => {
                    void Clipboard.setStringAsync(EXAMPLE);
                    showToast('Example copied');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Copy the example"
                  hitSlop={8}
                  style={styles.copyBtn}
                >
                  <CopyGlyph />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <IconPlate>
                <CameraGlyph />
              </IconPlate>
              <Text style={styles.title}>Upload pictures</Text>
              <Text style={styles.sub}>Upload screenshots or photos of your program and we’ll convert it for you.</Text>

              {photos.length === 0 ? (
                <Pressable
                  onPress={() => void addPhotos()}
                  accessibilityRole="button"
                  accessibilityLabel="Tap to upload photos"
                  style={({ pressed }) => [styles.dropZone, pressed ? styles.pressed : null]}
                >
                  <UploadGlyph />
                  <Text style={styles.dropTitle}>Tap to upload photos</Text>
                  <Text style={styles.dropSub}>You can select multiple images</Text>
                  <Text style={styles.dropFine}>JPG, PNG or HEIC · up to {MAX_PHOTOS}</Text>
                </Pressable>
              ) : (
                <>
                  <View style={styles.thumbs}>
                    {photos.map((uri, i) => (
                      <View key={uri} style={styles.thumb}>
                        <Image source={{ uri }} style={styles.thumbImg} resizeMode="contain" accessibilityLabel={`Photo ${i + 1}`} />
                        <Text style={styles.thumbOrder}>{i + 1}</Text>
                        <Pressable
                          onPress={() => removePhoto(i)}
                          disabled={busy != null}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove photo ${i + 1}`}
                          hitSlop={6}
                          style={styles.thumbRemove}
                        >
                          <EngravedIcon name="close" size={12} color={flColor.cream100} />
                        </Pressable>
                        {i > 0 ? (
                          <Pressable
                            onPress={() => moveEarlier(i)}
                            disabled={busy != null}
                            accessibilityRole="button"
                            accessibilityLabel={`Move photo ${i + 1} earlier`}
                            hitSlop={6}
                            style={styles.thumbMove}
                          >
                            <EngravedIcon name="chevron-left" size={12} color={flColor.cream100} />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>
                  {photos.length > 1 ? <Text style={styles.orderHint}>Days run in this order.</Text> : null}
                  {photos.length < MAX_PHOTOS ? (
                    <Pressable
                      onPress={() => void addPhotos()}
                      disabled={busy != null}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.addMore, pressed ? styles.pressed : null]}
                    >
                      <EngravedIcon name="plus" size={16} color={flColor.cream100} />
                      <Text style={styles.addMoreText}>Add more photos</Text>
                    </Pressable>
                  ) : null}
                </>
              )}
              {busy ? <Text style={styles.busy}>{busy}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={confirmReplace} transparent animationType="fade" onRequestClose={() => setConfirmReplace(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Replace the program you’re building?</Text>
            <Text style={styles.modalBody}>
              You have one in progress in the builder. Creating this import writes over it, and there is only
              one draft.
            </Text>
            <View style={styles.modalActions}>
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  setConfirmReplace(false);
                  void writeDraft();
                }}
              >
                Replace it
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setConfirmReplace(false)}>
                Keep what I have
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.column}>
          {preview ? (
            <View style={styles.previewActions}>
              <View style={styles.previewBack}>
                <Button variant="secondary" fullWidth onPress={() => setPreview(null)}>
                  Back
                </Button>
              </View>
              <View style={styles.previewCreate}>
                <Button variant="primary" fullWidth onPress={() => void create()}>
                  Create program
                </Button>
              </View>
            </View>
          ) : (
            <Button
              variant="primary"
              fullWidth
              disabled={!canPreview}
              onPress={mode === 'paste' ? previewPaste : () => void previewPhotos()}
              trailingIcon={<ArrowGlyph />}
            >
              {busy ? 'Reading…' : 'Preview import'}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PIECES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

function IconPlate({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconPlate}>{children}</View>;
}

function DocGlyph() {
  return <EngravedIcon name="document" size={26} color={flColor.gray400} />;
}
function CameraGlyph() {
  return <EngravedIcon name="camera" size={26} color={flColor.gray400} />;
}
function BulbGlyph() {
  return <EngravedIcon name="lightbulb" size={20} />;
}
function UploadGlyph() {
  return <EngravedIcon name="upload" size={34} color={flColor.cream100} />;
}
function CopyGlyph() {
  return <EngravedIcon name="copy" size={18} color={flColor.gray400} />;
}
function ArrowGlyph() {
  return <EngravedIcon name="arrow-right" size={16} color={flColor.onBronze} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  /* ⚠ CONTAINED ON WIDE SCREENS — the old sheet ran its text box edge to edge across a 1700px window. */
  column: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  cancel: { fontSize: 15, color: flColor.gray400 },
  pressed: { opacity: 0.86 },

  iconPlate: {
    width: 56,
    height: 56,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: flFont.display, fontSize: 28, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100, marginTop: 18 },
  sub: { fontSize: 15, lineHeight: 22, color: flColor.gray400, marginTop: 8 },

  infoCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    marginTop: 22,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 3 },
  infoLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  infoStrong: { fontSize: 13.5, color: flColor.cream100 },
  infoSub: { fontSize: 12.5, color: flColor.gray400 },

  pasteBox: {
    minHeight: 160,
    maxHeight: 320,
    marginTop: 16,
    padding: 16,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  error: { fontSize: 13, lineHeight: 18, color: flColor.redMuted, marginTop: 10 },
  quietBtn: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  quiet: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },

  exampleLabel: { fontSize: 13, color: flColor.gray400, marginTop: 22, marginBottom: 8 },
  exampleCard: {
    padding: 16,
    paddingRight: 44,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  exampleText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 22, color: flColor.gray400 },
  copyBtn: { position: 'absolute', top: 14, right: 14 },

  dropZone: {
    minHeight: 240,
    marginTop: 22,
    padding: 24,
    borderRadius: flRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: { fontSize: 16, fontWeight: '600', color: flColor.cream100, marginTop: 18 },
  dropSub: { fontSize: 13.5, color: flColor.gray400, marginTop: 8 },
  dropFine: { fontSize: 12, color: flColor.gray600, marginTop: 6 },

  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  thumb: {
    width: 104,
    aspectRatio: 0.78,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbOrder: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: flColor.onBronze,
    backgroundColor: flColor.bronze400,
  },
  thumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMove: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderHint: { fontSize: 12, color: flColor.gray600, marginTop: 10 },
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  addMoreText: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  busy: { fontSize: 13, color: flColor.bronze300, marginTop: 14, textAlign: 'center' },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.surfaceNav,
  },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    gap: 10,
    padding: 22,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  modalTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  modalBody: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400, marginBottom: 6 },
  modalActions: { gap: 8 },

  previewActions: { flexDirection: 'row', gap: 10 },
  previewBack: { flexBasis: 96 },
  previewCreate: { flex: 1 },
});
