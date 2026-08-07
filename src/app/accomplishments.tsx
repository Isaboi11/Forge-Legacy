import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  fetchAccomplishments,
  fetchChaptersForPicker,
  removeAccomplishment,
  saveAccomplishment,
  setAccomplishmentFeatured,
  uploadAccomplishmentMedia,
} from '@/data/accomplishments-live';
import { CalendarField } from '@/components/forge/composites/CalendarField';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import {
  accSubline,
  canToggleFeatured,
  featuredAccomplishments,
  featuredCount,
  FEATURED_MAX,
  formatAccDate,
  NAME_MAX,
  NOTE_MAX,
  validateForm,
  type Accomplishment,
} from '@/domain/legacy/accomplishments';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Accomplishments (L-12 list · L-13 detail · L-14 add/edit) — `Forge Accomplishments.dc.html`.
 *
 * Athlete-authored CRUD against the real `accomplishments` table (0023). Three views off one route, as
 * the design has them. The "Featured on Profile" star is capped at the design's top 3; the Legacy
 * accomplishments section shows featured ones with a star.
 *
 * ── THE MEDIA SLOT, BUILT (migration 0118) ───────────────────────────────────────────────────────
 *
 * This header used to say the optional photo was DEFERRED because "its file-drop slot needs an
 * image-picker + storage-bucket pass". Both of those had existed for months by the time the PO went to
 * add an accomplishment and found nowhere to put the picture — `useMediaPicker` is the app's single
 * camera-or-library path, and 0006's `media` bucket is already owner-scoped exactly the way an
 * athlete-owned keepsake wants. The deferral had outlived its reason, which is the failure mode this
 * project keeps rediscovering in a different costume.
 *
 * VIDEO TOO, which the `.dc` never drew: the PO asked for "the video or the picture", and a marathon
 * finish or a 500 lb pull is more often a clip than a frame. One URL and one kind, never a `photoUrl`
 * beside a `videoUrl` — see the `Accomplishment` model for why.
 *
 * THE DATE FIELD is `CalendarField`, not the native wheel the `.dc` draws — the native picker does not
 * render on the web, which is the surface being tested (the reasoning is written out in that component).
 * It replaced a plain text field that asked for `YYYY-MM-DD`, the one place in the app where an athlete
 * met a date that wasn't month-day-year. It stays optional; the design allows an undated accomplishment.
 */

const STAR = 'M12 3l2.6 5.6 6 .5-4.6 4 1.4 6-5.4-3.2-5.4 3.2 1.4-6-4.6-4 6-.5z';
const CHEVRON = 'M9 6l6 6-6 6';
const TRASH = 'M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13';
const PLUS = 'M12 5v14M5 12h14';
const CAMERA = 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';

type ChapterOpt = { id: string; label: string; active: boolean };
type ViewState = { mode: 'list' } | { mode: 'detail'; id: string } | { mode: 'form'; id?: string };

export default function AccomplishmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, loading, refetch } = useQuery(fetchAccomplishments, []);
  const { data: chapters } = useQuery(fetchChaptersForPicker, []);
  const list = data ?? [];
  const chapterOpts = chapters ?? [];
  const chapterLabel = (id: string) => chapterOpts.find((c) => c.id === id)?.label ?? null;

  /**
   * Opening ONE accomplishment, from wherever it was tapped.
   *
   * Legacy's pinned museum and its accomplishment strip both used to `router.push('/accomplishments')`,
   * so tapping a specific keepsake landed the athlete on the full list and left them to find it again.
   * The detail view they wanted already existed — it was simply unreachable from outside this screen,
   * because `view` starts at `list` and nothing could seed it.
   *
   * The id arrives as a param and is applied ONCE, as the initial state. It is deliberately not an
   * effect that syncs on every change: the athlete can navigate list → detail → back inside this screen,
   * and a param that kept re-asserting itself would drag them back to where they entered every time.
   */
  const { id: focusId } = useLocalSearchParams<{ id?: string }>();
  const [view, setView] = useState<ViewState>(focusId ? { mode: 'detail', id: focusId } : { mode: 'list' });
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const addRef = useTourAnchor('accomplishments-add');

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(6,7,8,0.34)' }} />
        <AppBar title="Accomplishments" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  if (view.mode === 'form') {
    return (
      <AccomplishmentForm
        existing={view.id ? list.find((a) => a.id === view.id) : undefined}
        chapters={chapterOpts}
        insets={insets}
        onCancel={() => setView(view.id ? { mode: 'detail', id: view.id } : { mode: 'list' })}
        onSaved={(saved) => {
          refetch();
          setView({ mode: 'detail', id: saved.id });
        }}
      />
    );
  }

  if (view.mode === 'detail') {
    const sel = list.find((a) => a.id === view.id);
    if (!sel) return <Redirect onDone={() => setView({ mode: 'list' })} />;
    return (
      <AccomplishmentDetail
        item={sel}
        all={list}
        chapterLabel={chapterLabel}
        insets={insets}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'form', id: sel.id })}
        onChanged={refetch}
        onDeleted={() => {
          refetch();
          setView({ mode: 'list' });
        }}
      />
    );
  }

  // ── L-12 · list ──
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(6,7,8,0.34)' }} />
      <AppBar
        title="Accomplishments"
        serif
        onBack={() => router.back()}
        actions={
          <Pressable ref={addRef} onPress={() => setView({ mode: 'form' })} accessibilityRole="button" accessibilityLabel="Add accomplishment" hitSlop={8} style={styles.addBtn}>
            <Glyph d={PLUS} size={22} color={flColor.bronze300} width={2} />
          </Pressable>
        }
      />

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Glyph d={STAR} size={30} color={flColor.charcoal500} width={1.6} />
          <Text style={styles.emptyText}>Add your first accomplishment — a milestone you&rsquo;re proud of, in your own words.</Text>
          <Button variant="primary" onPress={() => setView({ mode: 'form' })} accessibilityLabel="Add Accomplishment">
            Add Accomplishment
          </Button>
        </View>
      ) : (
        <ScrollView
          ref={tourScroller}
          onScroll={onTourScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {list.map((a, ai) => {
            const sub = accSubline(a, chapterLabel);
            return (
              <TourAnchor key={a.id} id={ai === 0 ? 'accomplishments-list' : undefined}>
              <Pressable onPress={() => setView({ mode: 'detail', id: a.id })} accessibilityRole="button" accessibilityLabel={a.name} style={styles.row}>
                <TourAnchor id={ai === 0 ? 'accomplishments-featured' : undefined}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill={a.featured ? flColor.bronze300 : 'none'} stroke={a.featured ? flColor.bronze300 : flColor.gray600} strokeWidth={1.5} strokeLinejoin="round">
                    <Path d={STAR} />
                  </Svg>
                </TourAnchor>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {a.name}
                  </Text>
                  {sub ? <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text> : null}
                </View>
                <Glyph d={CHEVRON} size={16} color={flColor.gray600} width={2} />
              </Pressable>
              </TourAnchor>
            );
          })}
        </ScrollView>
      )}

      <ScreenTour screenKey="accomplishments" ready={view.mode === 'list' && list.length > 0} />
    </View>
  );
}

// ── L-13 · detail ──
function AccomplishmentDetail({
  item,
  all,
  chapterLabel,
  insets,
  onBack,
  onEdit,
  onChanged,
  onDeleted,
}: {
  item: Accomplishment;
  all: Accomplishment[];
  chapterLabel: (id: string) => string | null;
  insets: { bottom: number };
  onBack: () => void;
  onEdit: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [featured, setFeatured] = useState(item.featured);
  const [delOpen, setDelOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const nFeatured = featuredCount(all.map((a) => (a.id === item.id ? { ...a, featured } : a)));
  // The current featured three (persisted) — the pool the replace picker offers when we're at the cap.
  const currentFeatured = featuredAccomplishments(all);

  const toggleFeatured = (next: boolean) => {
    // At the cap, featuring a 4th doesn't block — it opens the replace picker (design AC "featured replace
    // prompt"): choose one of the current three to swap out for this one.
    if (next && !canToggleFeatured(all, item.id, next)) {
      setReplaceOpen(true);
      return;
    }
    setFeatured(next);
    void setAccomplishmentFeatured(item.id, next).then(onChanged);
  };

  // Swap: un-feature the chosen one, feature this one.
  const doReplace = (targetId: string) => {
    setReplaceOpen(false);
    setFeatured(true);
    void setAccomplishmentFeatured(targetId, false)
      .then(() => setAccomplishmentFeatured(item.id, true))
      .then(onChanged);
  };

  const doDelete = () => {
    setDelOpen(false);
    void removeAccomplishment(item.id).then(onDeleted);
  };

  const chapter = item.chapterId ? chapterLabel(item.chapterId) : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(6,7,8,0.34)' }} />
      <AppBar title="" onBack={onBack} actions={<Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit" hitSlop={8} style={styles.addBtn}><Text style={styles.editLink}>Edit</Text></Pressable>} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {featured ? (
          <View style={styles.featBadge}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill={flColor.bronze300} stroke="none">
              <Path d={STAR} />
            </Svg>
            <Text style={styles.featBadgeText}>Featured</Text>
          </View>
        ) : null}

        <Text style={styles.detailName}>{item.name}</Text>
        {formatAccDate(item.date) ? <Text style={styles.detailDate}>{formatAccDate(item.date)}</Text> : null}

        {/* The keepsake, above the reflection and below the name — it is evidence of the thing named,
            and the note is what the athlete made of it. */}
        {item.mediaUrl ? (
          <View style={styles.detailMedia}>
            {item.mediaKind === 'video' ? (
              <AccomplishmentVideo url={item.mediaUrl} />
            ) : (
              <Image source={{ uri: item.mediaUrl }} style={styles.mediaPreview} contentFit="cover" />
            )}
          </View>
        ) : null}

        {chapter ? (
          <View style={styles.detailChapter}>
            <Text style={styles.detailChapterLabel}>Chapter</Text>
            <Text style={styles.detailChapterName}>{chapter}</Text>
          </View>
        ) : null}

        {item.note ? <Text style={styles.detailNote}>&ldquo;{item.note}&rdquo;</Text> : null}

        {/* Featured on Profile */}
        <View style={styles.featRow}>
          <View style={styles.rowText}>
            <Text style={styles.rowName}>Featured on Profile</Text>
            <Text style={styles.rowSub}>Show among your top 3 · {nFeatured}/{FEATURED_MAX}</Text>
          </View>
          <SettingsToggle value={featured} onChange={toggleFeatured} accessibilityLabel="Featured on profile" />
        </View>

        <Pressable onPress={() => setDelOpen(true)} accessibilityRole="button" accessibilityLabel="Delete accomplishment" style={styles.deleteBtn}>
          <Glyph d={TRASH} size={15} color={flColor.emberFlame} width={1.9} />
          <Text style={styles.deleteText}>Delete Accomplishment</Text>
        </Pressable>
      </ScrollView>

      <ConfirmSheet
        open={delOpen}
        onClose={() => setDelOpen(false)}
        headline="Delete Accomplishment"
        body={`Delete “${item.name}”? This can’t be undone.`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={doDelete}
      />

      <FeaturedReplaceSheet open={replaceOpen} pendingName={item.name} current={currentFeatured} onReplace={doReplace} onClose={() => setReplaceOpen(false)} />
    </View>
  );
}

/** AC "featured replace prompt" — at the 3-featured cap, choose one to swap out for the pending one. */
function FeaturedReplaceSheet({
  open,
  pendingName,
  current,
  onReplace,
  onClose,
}: {
  open: boolean;
  pendingName: string;
  current: Accomplishment[];
  onReplace: (targetId: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} footer={<Button variant="secondary" fullWidth onPress={onClose}>Keep current three</Button>}>
      <View style={styles.replaceWrap}>
        <Text style={styles.replaceTitle}>You can feature {FEATURED_MAX}</Text>
        <Text style={styles.replaceBody}>
          Choose one to replace with <Text style={styles.replaceName}>{pendingName}</Text>.
        </Text>
        <View style={styles.replaceList}>
          {current.map((a) => (
            <View key={a.id} style={styles.replaceRow}>
              <Glyph d={STAR} size={15} color={flColor.bronze300} width={0} fill={flColor.bronze300} />
              <Text style={styles.replaceItemName} numberOfLines={1}>
                {a.name}
              </Text>
              <Pressable onPress={() => onReplace(a.id)} accessibilityRole="button" accessibilityLabel={`Replace ${a.name}`} style={styles.replaceBtn}>
                <Text style={styles.replaceBtnText}>Replace</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

// ── L-14 · add / edit form ──
function AccomplishmentForm({
  existing,
  chapters,
  insets,
  onCancel,
  onSaved,
}: {
  existing?: Accomplishment;
  chapters: ChapterOpt[];
  insets: { bottom: number };
  onCancel: () => void;
  onSaved: (saved: Accomplishment) => void;
}) {
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();
  const [name, setName] = useState(existing?.name ?? '');
  const [date, setDate] = useState(existing?.date ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [chapterId, setChapterId] = useState<string | null>(existing?.chapterId ?? null);
  const [saving, setSaving] = useState(false);

  /**
   * THE MEDIA SLOT — the `.dc`'s file drop, which had been DEFERRED since this screen was built.
   *
   * Local until Save, deliberately. The upload happens on the tap that chooses the file (so the athlete
   * sees the real thing, not a spinner promise), but the ROW is only written when they save — so
   * cancelling out of the form leaves the accomplishment exactly as it was. The cost is an orphaned
   * object in the bucket on a cancelled edit, which is the same standing gap every media surface in this
   * app has and is recorded in 0118 rather than papered over.
   *
   * `draftId` keys the object path. An existing accomplishment uses its own id, so re-uploading
   * overwrites in place instead of accumulating a file per edit; a new one gets a fresh id, because the
   * row it will belong to does not exist yet.
   */
  const [draftId] = useState(() => existing?.id ?? `acc-${Date.now().toString(36)}`);
  const [mediaUrl, setMediaUrl] = useState<string | null>(existing?.mediaUrl ?? null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(existing?.mediaKind ?? null);
  const [uploading, setUploading] = useState(false);

  const valid = validateForm({ name, note });

  const attach = async () => {
    if (uploading) return;
    const asset = await pick({
      kind: 'both',
      title: 'Add a photo or video',
      hint: 'One keepsake — the medal, the finish line, the lift. Choosing another replaces it.',
      quality: 0.85,
    });
    if (!asset) return;
    const kind: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
    setUploading(true);
    try {
      const url = await uploadAccomplishmentMedia(draftId, asset.uri, kind);
      setMediaUrl(url);
      setMediaKind(kind);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    if (!valid.ok) return;
    setSaving(true);
    saveAccomplishment({
      id: existing?.id,
      name,
      date: date.trim() || null,
      chapterId,
      note: note.trim() || null,
      mediaUrl,
      mediaKind,
    }).then(onSaved, (e: unknown) => {
      setSaving(false);
      showToast(errorMessage(e));
    });
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(6,7,8,0.34)' }} />
      <AppBar title={existing ? 'Edit Accomplishment' : 'New Accomplishment'} onClose={onCancel} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Field label="Accomplishment" counter={`${name.length}/${NAME_MAX}`}>
          <TextInput style={styles.input} value={name} onChangeText={(t) => setName(t.slice(0, NAME_MAX))} placeholder="e.g. Marathon Finisher" placeholderTextColor={flColor.gray600} maxLength={NAME_MAX} />
        </Field>

        <Field label="Date · optional">
          <CalendarField label="Date" hideLabel value={date || null} onChange={(v) => setDate(v ?? '')} placeholder="Choose a date" clearable />
        </Field>

        {/* The design draws this as a dashed drop zone; on a phone the equivalent is a tappable frame
            that becomes the thing you chose. */}
        <Field label="Photo or video · optional">
          {mediaUrl ? (
            <View style={styles.mediaWrap}>
              {mediaKind === 'video' ? (
                <AccomplishmentVideo url={mediaUrl} />
              ) : (
                <Image source={{ uri: mediaUrl }} style={styles.mediaPreview} contentFit="cover" />
              )}
              <View style={styles.mediaActions}>
                <Pressable
                  onPress={() => void attach()}
                  disabled={uploading}
                  accessibilityRole="button"
                  accessibilityLabel="Replace this media"
                  style={styles.mediaBtn}
                >
                  <Text style={styles.mediaBtnText}>{uploading ? 'Uploading…' : 'Replace'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMediaUrl(null);
                    setMediaKind(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove this media"
                  style={styles.mediaBtn}
                >
                  <Text style={styles.mediaBtnRemove}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => void attach()}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Add a photo or video"
              style={({ pressed }) => [styles.mediaDrop, pressed ? styles.mediaDropPressed : null]}
            >
              {uploading ? (
                <ActivityIndicator color={flColor.bronze400} />
              ) : (
                <>
                  <Glyph d={CAMERA} size={22} color={flColor.bronze400} width={1.7} />
                  <Text style={styles.mediaDropText}>Add a photo or video</Text>
                  <Text style={styles.mediaDropSub}>The medal, the finish line, the lift</Text>
                </>
              )}
            </Pressable>
          )}
        </Field>

        <Field label="Why it mattered · optional" counter={`${note.length}/${NOTE_MAX}`}>
          <TextInput style={[styles.input, styles.noteInput]} value={note} onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))} placeholder="What made this accomplishment meaningful?" placeholderTextColor={flColor.gray600} multiline maxLength={NOTE_MAX} />
        </Field>

        <Field label="Chapter · optional">
          <View style={styles.chapterList}>
            <ChapterChip label="No chapter" sub="Before Forge Legacy" on={chapterId === null} onPress={() => setChapterId(null)} />
            {chapters.map((c) => (
              <ChapterChip key={c.id} label={c.label} sub={c.active ? 'Active' : undefined} on={chapterId === c.id} onPress={() => setChapterId(c.id)} />
            ))}
          </View>
        </Field>

        <View style={styles.saveWrap}>
          <Button variant="primary" fullWidth disabled={!valid.ok || saving || uploading} onPress={save} accessibilityLabel="Save accomplishment">
            {existing ? 'Save Changes' : 'Add Accomplishment'}
          </Button>
        </View>
      </ScrollView>

      {/* Mounted in the branch that opens it — see `overlay-branch.test.mjs` for the session that rule
          cost, on this exact mistake in the workout screen. */}
      {mediaPickerSheet}
    </View>
  );
}

/** One attached clip, paused. The keepsake is the moment, not an autoplaying loop over a form. */
function AccomplishmentVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.mediaPreview} nativeControls contentFit="cover" />;
}

function Field({ label, counter, children }: { label: string; counter?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {counter ? <Text style={styles.fieldCounter}>{counter}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ChapterChip({ label, sub, on, onPress }: { label: string; sub?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} style={[styles.chapterChip, on && styles.chapterChipOn]}>
      <View style={styles.rowText}>
        <Text style={[styles.chapterChipLabel, on && styles.chapterChipLabelOn]}>{label}</Text>
        {sub ? <Text style={styles.chapterChipSub}>{sub}</Text> : null}
      </View>
      {on ? <Glyph d="M5 12.5l4 4 10-10" size={15} color={flColor.bronze300} width={2.4} /> : null}
    </Pressable>
  );
}

function Redirect({ onDone }: { onDone: () => void }) {
  onDone();
  return null;
}

function Glyph({ d, size = 16, color, width = 1.9, fill = 'none' }: { d: string; size?: number; color: string; width?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 8 },
  addBtn: { padding: 6 },
  editLink: { fontSize: 13, fontWeight: '700', color: flColor.bronze400 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 44 },
  emptyText: { fontSize: 14, lineHeight: 21, color: flColor.gray400, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    marginBottom: 9,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rowSub: { fontSize: 12, color: flColor.gray600, marginTop: 2 },

  // detail
  featBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 5, paddingHorizontal: 11, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  featBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  detailName: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', color: flColor.cream100 },
  detailDate: { fontSize: 13, color: flColor.gray400, marginTop: 6 },
  detailChapter: { marginTop: 18 },
  detailChapterLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  detailChapterName: { fontSize: 14, fontWeight: '600', color: flColor.bronze400, marginTop: 3 },
  detailNote: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 17, lineHeight: 26, color: flColor.gray400, marginTop: 20 },

  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, paddingVertical: 15, paddingHorizontal: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: 'rgba(190,90,76,0.4)', backgroundColor: 'rgba(190,90,76,0.1)' },
  deleteText: { fontSize: 14, fontWeight: '600', color: flColor.emberFlame },

  // featured replace picker
  replaceWrap: { gap: 0 },
  replaceTitle: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', color: flColor.cream100, marginBottom: 6 },
  replaceBody: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400, marginBottom: 18 },
  replaceName: { color: flColor.cream100, fontWeight: '600' },
  replaceList: { gap: 8 },
  replaceRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  replaceItemName: { flex: 1, minWidth: 0, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  replaceBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, backgroundColor: flColor.bronze400 },
  replaceBtnText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, color: '#F7F5F1' },

  // form
  field: { marginBottom: 20 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  fieldCounter: { fontSize: 11, color: flColor.gray600 },
  input: {
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 15,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  noteInput: { minHeight: 84, textAlignVertical: 'top' },

  // the photo / video slot (0118)
  mediaDrop: { alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 128, paddingVertical: 24, paddingHorizontal: 18, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  mediaDropPressed: { opacity: 0.85 },
  mediaDropText: { marginTop: 4, fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  mediaDropSub: { fontSize: 11.5, color: flColor.gray600 },
  mediaWrap: { gap: 9 },
  mediaPreview: { width: '100%', height: 220, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal900 },
  mediaActions: { flexDirection: 'row', gap: 8 },
  mediaBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  mediaBtnText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  mediaBtnRemove: { fontSize: 12.5, fontWeight: '600', color: flColor.emberFlame },
  detailMedia: { marginTop: 18 },

  chapterList: { gap: 8 },
  chapterChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chapterChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chapterChipLabel: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  chapterChipLabelOn: { color: flColor.cream100 },
  chapterChipSub: { fontSize: 11, color: flColor.gray600, marginTop: 1 },

  saveWrap: { marginTop: 8 },
});
