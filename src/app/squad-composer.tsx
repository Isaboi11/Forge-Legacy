import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  addSquadPost,
  buildWorkoutRecap,
  fetchRecentPRs,
  fetchRecentWorkouts,
  fmtDuration,
  fmtVolume,
  SQUAD_POST_TYPES,
  squadPostTypeDef,
  timeAgo,
  uploadPostMedia,
  type RecentPR,
  type RecentWorkout,
  type SquadMedia,
  type SquadMediaKind,
  type SquadPostType,
  type TransformationLayoutData,
  type WorkoutSummary,
} from '@/data/squad-feed-live';
import { elapsedBetween, fetchTransformationEntries, XFORM_POSES, type TransformationEntry } from '@/data/transformation-live';
import { errorMessage } from '@/lib/useQuery';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Composer — built to `Squad Composer.dc.html`, scoped to the 5 post types Squad Feed backs with real
 * data (checkin · recap · pr · discussion · announcement). Two steps: pick a type → compose. Announcement is
 * owner-only (locked card for members; the DB also rejects it via RLS).
 *
 * TRANSFORMATION posts a comparison assembled from the athlete's own Transformation entries (L-17), not from
 * loose photos. That distinction is the point: the gallery holds the captures AND their per-pose alignment, so
 * two entries produce a genuine before/after — two arbitrary photos would produce a visibly worse post the
 * renderer already knows how to beat. The same `TransformationLayoutData` the gallery's Share flow builds is
 * assembled here, so `squad-post/[id]` renders both identically. Fewer than two entries offers the gallery
 * rather than an empty picker.
 */

interface Form {
  body: string;
  prExercise: string;
  prValue: string;
  prLabel: string;
}
const EMPTY: Form = { body: '', prExercise: '', prValue: '', prLabel: 'Squad PR' };

export default function SquadComposerRoute() {
  const { id, owner } = useLocalSearchParams<{ id: string; owner?: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { pick: pickMediaSource, mediaPickerSheet } = useMediaPicker();
  const squadId = String(id ?? '');
  const isOwner = owner === '1';

  const [type, setType] = useState<SquadPostType | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [media, setMedia] = useState<SquadMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [recap, setRecap] = useState<{ workoutId: string; workoutName: string; summary: WorkoutSummary } | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[] | null>(null);
  const [recentPRs, setRecentPRs] = useState<RecentPR[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [buildingRecap, setBuildingRecap] = useState(false);
  const [entries, setEntries] = useState<TransformationEntry[] | null>(null);
  const [thenId, setThenId] = useState<string | null>(null);
  const [nowId, setNowId] = useState<string | null>(null);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // The two chosen captures, and the poses they BOTH have — a comparison needs the same pose on each side.
  const thenEntry = entries?.find((e) => e.id === thenId) ?? null;
  const nowEntry = entries?.find((e) => e.id === nowId) ?? null;
  const sharedPoses = useMemo(
    () => (thenEntry && nowEntry ? XFORM_POSES.filter((pose) => thenEntry.photos[pose.key] && nowEntry.photos[pose.key]) : []),
    [thenEntry, nowEntry],
  );

  const valid = useMemo(() => {
    if (!type || uploading || buildingRecap) return false;
    const body = form.body.trim();
    switch (type) {
      case 'checkin':
        return true;
      case 'formcheck':
        return !!media; // a form check needs a clip
      case 'recap':
        return !!recap; // a recap needs a real workout
      case 'pr':
        return !!form.prExercise.trim() && !!form.prValue.trim();
      case 'transformation':
        // Two different captures that share at least one pose. Anything less isn't a comparison.
        return !!thenEntry && !!nowEntry && thenEntry.id !== nowEntry.id && sharedPoses.length > 0;
      default:
        return !!body; // discussion / announcement
    }
  }, [type, form, media, recap, uploading, buildingRecap, thenEntry, nowEntry, sharedPoses.length]);

  const pick = (t: SquadPostType) => {
    setType(t);
    setForm(EMPTY);
    setMedia(null);
    setRecap(null);
    if (t === 'recap') {
      setRecentWorkouts(null);
      setLoadingList(true);
      fetchRecentWorkouts().then(
        (ws) => {
          setRecentWorkouts(ws);
          setLoadingList(false);
        },
        () => setLoadingList(false),
      );
    }
    if (t === 'pr') {
      setRecentPRs(null);
      fetchRecentPRs().then(setRecentPRs, () => setRecentPRs([]));
    }
    if (t === 'transformation') {
      setEntries(null);
      setThenId(null);
      setNowId(null);
      setLoadingList(true);
      fetchTransformationEntries().then(
        (rows) => {
          setEntries(rows);
          setLoadingList(false);
          // Newest is almost always the "now" and the oldest the "then", so pre-select the widest span the
          // athlete has. One tap to change either; zero taps if that's what they wanted.
          if (rows.length >= 2) {
            setThenId(rows[rows.length - 1].id);
            setNowId(rows[0].id);
          }
        },
        () => setLoadingList(false),
      );
    }
  };
  const backToPick = () => {
    setType(null);
    setForm(EMPTY);
    setMedia(null);
    setRecap(null);
  };

  const selectWorkout = (id: string) => {
    setBuildingRecap(true);
    buildWorkoutRecap(id).then(
      (r) => {
        setBuildingRecap(false);
        if (r) setRecap({ workoutId: id, workoutName: r.workoutName, summary: r.summary });
        else showToast('Couldn’t load that workout.');
      },
      () => {
        setBuildingRecap(false);
        showToast('Couldn’t load that workout.');
      },
    );
  };
  const selectPR = (pr: RecentPR) => setForm((f) => ({ ...f, prExercise: pr.exercise, prValue: pr.value, prLabel: f.prLabel || 'Squad PR' }));

  const pickMedia = async (videoOnly: boolean) => {
    const asset = await pickMediaSource({ kind: videoOnly ? 'videos' : 'both', title: videoOnly ? 'Add a video' : 'Add a photo or video', quality: 0.7, videoMaxDuration: 60 });
    if (!asset?.uri) return;
    const kind: SquadMediaKind = asset.type === 'video' ? 'video' : 'image';
    setUploading(true);
    try {
      const url = await uploadPostMedia(squadId, asset.uri, kind);
      setMedia({ url, kind });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!type || !valid || posting) return;

    // Assembled exactly as the gallery's Share flow does, so both render through one path. `transform` is
    // left undefined — the per-pose alignment tool lives in Compare; unaligned pairs still render.
    const layout: TransformationLayoutData | null =
      type === 'transformation' && thenEntry && nowEntry
        ? {
            template: 'slider',
            thenLabel: thenEntry.label,
            nowLabel: nowEntry.label,
            elapsed: elapsedBetween(thenEntry.label, nowEntry.label),
            pairs: sharedPoses.map((pose) => ({
              label: pose.label,
              then: { url: thenEntry.photos[pose.key]! },
              now: { url: nowEntry.photos[pose.key]! },
            })),
          }
        : null;

    // media carries the first pair so the feed card has something to show without reading the layout.
    const xformMedia =
      layout && layout.pairs.length > 0
        ? [
            { url: layout.pairs[0].then.url, kind: 'image' as SquadMediaKind },
            { url: layout.pairs[0].now.url, kind: 'image' as SquadMediaKind },
          ]
        : [];

    setPosting(true);
    addSquadPost({
      squadId,
      type,
      body: form.body,
      prValue: form.prValue,
      prExercise: form.prExercise,
      prLabel: form.prLabel,
      media: type === 'transformation' ? xformMedia : media ? [media] : [],
      workoutId: recap?.workoutId ?? null,
      workoutSummary: recap?.summary ?? null,
      layout,
    }).then(
      () => {
        setPosting(false);
        showToast('Posted to your squad');
        router.back();
      },
      (e: unknown) => {
        setPosting(false);
        showToast(errorMessage(e));
      },
    );
  };

  // ── Step 1: pick a type ──
  if (!type) {
    return (
      <View style={styles.root}>
        <ComposerBg />
        <AppBar title={<BarTitle title="Post to Squad" sub="Training, recognition & coordination" />} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.pickScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.groupLabel}>Anyone in the squad</Text>
          <View style={styles.grid}>
            {SQUAD_POST_TYPES.filter((t) => !t.ownerOnly).map((t) => (
              <TypeCard key={t.id} label={t.label} icon={<TypeGlyph type={t.id} />} onPress={() => pick(t.id)} />
            ))}
          </View>

          <Text style={[styles.groupLabel, styles.groupLabelGap]}>Owner only</Text>
          <View style={styles.grid}>
            {SQUAD_POST_TYPES.filter((t) => t.ownerOnly).map((t) =>
              isOwner ? (
                <TypeCard key={t.id} label={t.label} icon={<TypeGlyph type={t.id} />} onPress={() => pick(t.id)} />
              ) : (
                <TypeCard key={t.id} label={t.label} icon={<TypeGlyph type={t.id} locked />} locked subLabel="Owner only" onPress={() => showToast('Only the owner can post announcements')} />
              ),
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 2: compose ──
  const def = squadPostTypeDef(type);
  return (
    <View style={styles.root}>
      <ComposerBg />
      <AppBar
        title={<BarTitle title={def.label} sub="Your squad" />}
        onBack={backToPick}
        actions={
          <Pressable onPress={submit} disabled={!valid || posting} accessibilityRole="button" accessibilityLabel="Post" style={[styles.postBtn, valid ? styles.postBtnOn : styles.postBtnOff]}>
            <Text style={[styles.postBtnText, valid ? styles.postBtnTextOn : styles.postBtnTextOff]}>{posting ? 'Posting…' : 'Post'}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.composeScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.authorRow}>
          <View style={styles.authorDisc} />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>You</Text>
            <Text style={styles.authorMeta}>{def.label}</Text>
          </View>
        </View>

        {type === 'transformation' ? (
          loadingList ? (
            <View style={styles.xformLoading}>
              <ActivityIndicator color={flColor.bronze400} />
            </View>
          ) : (entries?.length ?? 0) < 2 ? (
            /* Not an empty picker: two captures are required, so send them where captures are made. */
            <View style={styles.xformEmpty}>
              <Text style={styles.xformEmptyTitle}>
                {(entries?.length ?? 0) === 0 ? 'No progress captures yet' : 'One capture so far'}
              </Text>
              <Text style={styles.xformEmptyBody}>
                A comparison needs two. Capture another in your Transformation archive and it’ll show up here.
              </Text>
              <Pressable
                onPress={() => router.push('/transformation')}
                accessibilityRole="button"
                accessibilityLabel="Open your transformation archive"
                style={({ pressed }) => [styles.xformEmptyBtn, pressed ? styles.xformPressed : null]}
              >
                <Text style={styles.xformEmptyBtnLabel}>Open Transformation</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <EntryStrip
                label="Then"
                entries={entries ?? []}
                selectedId={thenId}
                otherId={nowId}
                onSelect={setThenId}
              />
              <EntryStrip
                label="Now"
                entries={entries ?? []}
                selectedId={nowId}
                otherId={thenId}
                onSelect={setNowId}
              />

              {thenEntry && nowEntry && thenEntry.id !== nowEntry.id ? (
                sharedPoses.length > 0 ? (
                  <View style={styles.xformPreview}>
                    <Text style={styles.xformPreviewLabel}>
                      {sharedPoses.length} {sharedPoses.length === 1 ? 'pose' : 'poses'} in both
                      {elapsedBetween(thenEntry.label, nowEntry.label) ? ` · ${elapsedBetween(thenEntry.label, nowEntry.label)} apart` : ''}
                    </Text>
                    <View style={styles.xformPair}>
                      <View style={styles.xformHalf}>
                        <Image source={{ uri: thenEntry.photos[sharedPoses[0].key] }} style={styles.xformImg} contentFit="cover" />
                        <Text style={styles.xformCorner}>{thenEntry.label}</Text>
                      </View>
                      <View style={styles.xformHalf}>
                        <Image source={{ uri: nowEntry.photos[sharedPoses[0].key] }} style={styles.xformImg} contentFit="cover" />
                        <Text style={styles.xformCorner}>{nowEntry.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.xformHint}>
                      Every shared pose is included. To line them up precisely, use Compare in your Transformation archive.
                    </Text>
                  </View>
                ) : (
                  /* Says which pose is missing rather than just refusing to post. */
                  <View style={styles.xformWarn}>
                    <Text style={styles.xformWarnText}>
                      These two captures don’t share a pose, so there’s nothing to compare side by side. Pick a
                      different pair, or add a matching pose to one of them.
                    </Text>
                  </View>
                )
              ) : null}

              <Area label="Say something (optional)" value={form.body} onChange={(v) => set('body', v)} placeholder="What changed?…" rows={2} />
            </>
          )
        ) : type === 'formcheck' ? (
          <>
            <MediaAttach media={media} uploading={uploading} videoOnly onPick={() => pickMedia(true)} onRemove={() => setMedia(null)} />
            <Area label="What should the squad look at? (optional)" value={form.body} onChange={(v) => set('body', v)} placeholder="e.g. Does my hip rise look early?" rows={3} />
          </>
        ) : type === 'recap' ? (
          recap ? (
            <>
              <View style={styles.recapCard}>
                <Text style={styles.recapName}>{recap.workoutName}</Text>
                <View style={styles.recapStats}>
                  <RecapStat n={fmtVolume(recap.summary.volume)} label="Volume" />
                  <RecapStat n={fmtDuration(recap.summary.durationSec)} label="Under Iron" />
                  <RecapStat n={String(recap.summary.exercises.length)} label="Exercises" />
                  {recap.summary.prCount > 0 ? <RecapStat n={String(recap.summary.prCount)} label={recap.summary.prCount === 1 ? 'PR' : 'PRs'} /> : null}
                </View>
                <Pressable onPress={() => setRecap(null)} accessibilityRole="button" accessibilityLabel="Choose a different workout" style={styles.recapChange} hitSlop={6}>
                  <Text style={styles.recapChangeText}>Choose a different workout</Text>
                </Pressable>
              </View>
              <Area label="Say something (optional)" value={form.body} onChange={(v) => set('body', v)} placeholder="How did it go?…" rows={2} />
            </>
          ) : (
            <View style={styles.pickerWrap}>
              <Text style={styles.pickerLabel}>Choose a completed workout</Text>
              {buildingRecap || loadingList ? (
                <View style={styles.pickerBusy}>
                  <ActivityIndicator color={flColor.bronze400} />
                </View>
              ) : (recentWorkouts?.length ?? 0) === 0 ? (
                <Text style={styles.pickerEmpty}>No completed workouts yet. Finish a session and it’ll show up here.</Text>
              ) : (
                <View style={styles.pickerList}>
                  {recentWorkouts!.map((w, i) => (
                    <Pressable key={w.id} onPress={() => selectWorkout(w.id)} accessibilityRole="button" accessibilityLabel={`Recap ${w.name}`} style={[styles.pickerRow, i > 0 ? styles.pickerRowDiv : null]}>
                      <View style={styles.pickerRowText}>
                        <Text style={styles.pickerRowName} numberOfLines={1}>
                          {w.name}
                        </Text>
                        <Text style={styles.pickerRowSub}>{timeAgo(w.savedAt)}</Text>
                      </View>
                      <ChevronRight />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )
        ) : type === 'pr' ? (
          <>
            {(recentPRs?.length ?? 0) > 0 ? (
              <View style={styles.pickerWrap}>
                <Text style={styles.pickerLabel}>Recent PRs</Text>
                <View style={styles.pickerList}>
                  {recentPRs!.slice(0, 6).map((p, i) => (
                    <Pressable key={`${p.exercise}-${p.achievedOn}-${i}`} onPress={() => selectPR(p)} accessibilityRole="button" accessibilityLabel={`Use ${p.exercise} PR`} style={[styles.pickerRow, i > 0 ? styles.pickerRowDiv : null]}>
                      <View style={styles.pickerRowText}>
                        <Text style={styles.pickerRowName} numberOfLines={1}>
                          {p.exercise}
                        </Text>
                        <Text style={styles.pickerRowSub}>
                          {p.value} · {timeAgo(p.achievedOn)}
                        </Text>
                      </View>
                      <PlusInCircle />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <Field label="Lift / movement" value={form.prExercise} onChange={(v) => set('prExercise', v)} placeholder="Bench Press" />
            <Field label="Result" value={form.prValue} onChange={(v) => set('prValue', v)} placeholder="315 lb" />
            <Field label="Label" value={form.prLabel} onChange={(v) => set('prLabel', v)} placeholder="Squad PR" />
            <Area label="Say something (optional)" value={form.body} onChange={(v) => set('body', v)} placeholder="Bar speed felt easy…" rows={2} />
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewValue}>{form.prValue.trim() || '315 lb'}</Text>
                <Text style={styles.previewExercise}>{form.prExercise.trim() || 'Bench Press'}</Text>
                <Text style={styles.previewTag}>{(form.prLabel.trim() || 'Squad PR').toUpperCase()}</Text>
              </View>
            </View>
            <MediaAttach media={media} uploading={uploading} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
          </>
        ) : type === 'checkin' ? (
          <>
            <Area label="Note (optional)" value={form.body} onChange={(v) => set('body', v)} placeholder="How did today go?…" rows={3} />
            <MediaAttach media={media} uploading={uploading} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
          </>
        ) : type === 'discussion' ? (
          <>
            <Area label="Note to the squad" value={form.body} onChange={(v) => set('body', v)} placeholder="Keep it short…" rows={4} />
            <MediaAttach media={media} uploading={uploading} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
          </>
        ) : (
          <>
            <Area label="Announcement" value={form.body} onChange={(v) => set('body', v)} placeholder="Pins to the top of the squad feed…" rows={4} />
            <MediaAttach media={media} uploading={uploading} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
            <View style={styles.gateNote}>
              <ShieldIcon />
              <Text style={styles.gateNoteText}>You’re posting a squad announcement as the owner — every member sees it at the top of the feed.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {mediaPickerSheet}
    </View>
  );
}

function ComposerBg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.34)' }} />;
}

function BarTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <View>
      <Text style={styles.barTitle}>{title}</Text>
      <Text style={styles.barSub}>{sub}</Text>
    </View>
  );
}

function TypeCard({ label, icon, onPress, locked = false, subLabel }: { label: string; icon: React.ReactNode; onPress: () => void; locked?: boolean; subLabel?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.typeCard, locked ? styles.typeCardLocked : null, pressed ? styles.typeCardPressed : null]}>
      <View style={[styles.typeIcon, locked ? styles.typeIconLocked : null]}>{icon}</View>
      <View style={styles.typeLabelRow}>
        <Text style={[styles.typeLabel, locked ? styles.typeLabelLocked : null]}>{label}</Text>
        {locked ? <LockIcon /> : null}
      </View>
      {subLabel ? <Text style={styles.typeSubLabel}>{subLabel}</Text> : null}
    </Pressable>
  );
}

function RecapStat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.recapStat}>
      <Text style={styles.recapStatN}>{n}</Text>
      <Text style={styles.recapStatLabel}>{label}</Text>
    </View>
  );
}

function ChevronRight() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function PlusInCircle() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v8M8 12h8" />
    </Svg>
  );
}

function MediaAttach({ media, uploading, onPick, onRemove, videoOnly = false }: { media: SquadMedia | null; uploading: boolean; onPick: () => void; onRemove: () => void; videoOnly?: boolean }) {
  if (uploading) {
    return (
      <View style={styles.mediaBox}>
        <ActivityIndicator color={flColor.bronze400} />
        <Text style={styles.mediaHint}>Uploading…</Text>
      </View>
    );
  }
  if (media) {
    return (
      <View style={styles.mediaPreviewWrap}>
        {media.kind === 'image' ? (
          <Image source={{ uri: media.url }} style={styles.mediaPreview} contentFit="cover" />
        ) : (
          <View style={styles.videoPreview}>
            <View style={styles.playDisc}>
              <PlayIcon />
            </View>
            <Text style={styles.videoPreviewText}>Video attached</Text>
          </View>
        )}
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove attachment" style={styles.mediaRemove} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel={videoOnly ? 'Add a video' : 'Add a photo or video'} style={styles.mediaAddBtn}>
      {videoOnly ? <VideoIcon /> : <MediaIcon />}
      <Text style={styles.mediaAddText}>{videoOnly ? 'Add a video' : 'Add a photo or video'}</Text>
    </Pressable>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={flColor.gray600}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[styles.input, focus ? styles.inputFocus : null]}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Area({ label, value, onChange, placeholder, rows }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; rows: number }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={flColor.gray600}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        multiline
        textAlignVertical="top"
        maxLength={1000}
        style={[styles.input, styles.area, { minHeight: rows * 22 + 24 }, focus ? styles.inputFocus : null]}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ── glyphs ──
function TypeGlyph({ type, locked = false }: { type: SquadPostType; locked?: boolean }) {
  const c = locked ? flColor.gray600 : flColor.bronze300;
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'checkin':
      return (
        <Svg {...props}>
          <Path d="M5 12.5l4 4 10-10" />
        </Svg>
      );
    case 'recap':
      return (
        <Svg {...props}>
          <Path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11" />
        </Svg>
      );
    case 'pr':
      return (
        <Svg {...props}>
          <Path d="M7 5h10v3a5 5 0 0 1-10 0z" />
          <Path d="M7 6H4v1.5a3.5 3.5 0 0 0 3.5 3.5M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11M9.5 14h5M12 11v3M8.5 18.5h7" />
        </Svg>
      );
    case 'formcheck':
      return (
        <Svg {...props}>
          <Path d="M3.5 7h11v10h-11z" />
          <Path d="M14.5 10.2l6-3.2v10l-6-3.2z" />
        </Svg>
      );
    case 'discussion':
      return (
        <Svg {...props}>
          <Path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" />
        </Svg>
      );
    default: // announcement
      return (
        <Svg {...props}>
          <Path d="M4 9v6h3l8 4V5L7 9z" />
          <Path d="M18 9a4 4 0 0 1 0 6" />
        </Svg>
      );
  }
}
function LockIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={11} width={14} height={9} rx={1.5} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}
function ShieldIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
      <Path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </Svg>
  );
}
function MediaIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="M3 16l5-5 4 4 3-3 6 6" />
      <Circle cx={9} cy={9} r={1.4} />
    </Svg>
  );
}
function VideoIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.5 7h11v10h-11z" />
      <Path d="M14.5 10.2l6-3.2v10l-6-3.2z" />
    </Svg>
  );
}
function PlayIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}
function CloseIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

/**
 * One row of captures to choose from. The other side's pick is dimmed rather than removed — a disappearing
 * option makes the two strips look like different lists, and you'd lose your place scrolling.
 */
function EntryStrip({
  label,
  entries,
  selectedId,
  otherId,
  onSelect,
}: {
  label: string;
  entries: TransformationEntry[];
  selectedId: string | null;
  otherId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.stripBlock}>
      <Text style={styles.stripLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {entries.map((e) => {
          const on = e.id === selectedId;
          const taken = e.id === otherId;
          const cover = XFORM_POSES.map((pose) => e.photos[pose.key]).find(Boolean);
          return (
            <Pressable
              key={e.id}
              onPress={() => !taken && onSelect(e.id)}
              disabled={taken}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: taken }}
              accessibilityLabel={`${label}: ${e.label}${taken ? ', already chosen on the other side' : ''}`}
              style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, taken ? styles.chipTaken : null, pressed ? styles.xformPressed : null]}
            >
              {cover ? (
                <Image source={{ uri: cover }} style={styles.chipImg} contentFit="cover" />
              ) : (
                <View style={[styles.chipImg, styles.chipImgEmpty]} />
              )}
              <Text style={[styles.chipLabel, on ? styles.chipLabelOn : null]} numberOfLines={1}>
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  xformLoading: { paddingVertical: 40, alignItems: 'center' },
  xformEmpty: { gap: 8, padding: 18, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  xformEmptyTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  xformEmptyBody: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },
  xformEmptyBtn: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  xformEmptyBtnLabel: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  xformPressed: { opacity: 0.85 },

  stripBlock: { gap: 8 },
  stripLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  strip: { gap: 9, paddingRight: 4 },
  chip: { width: 76, gap: 5, padding: 5, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  chipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  chipTaken: { opacity: 0.35 },
  chipImg: { width: '100%', height: 74, borderRadius: flRadius.sm, backgroundColor: flColor.charcoal800 },
  chipImgEmpty: { borderWidth: 1, borderColor: flColor.charcoal700 },
  chipLabel: { fontSize: 9.5, textAlign: 'center', color: flColor.gray600 },
  chipLabelOn: { color: flColor.bronze300, fontWeight: '600' },

  xformPreview: { gap: 9, padding: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800 },
  xformPreviewLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: flColor.bronze400 },
  xformPair: { flexDirection: 'row', gap: 3 },
  xformHalf: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: flRadius.sm },
  xformImg: { width: '100%', aspectRatio: 4 / 5, backgroundColor: flColor.charcoal900 },
  xformCorner: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: flRadius.pill, backgroundColor: 'rgba(0,0,0,0.6)', fontSize: 9, fontWeight: '600', color: flColor.cream100 },
  xformHint: { fontSize: 11, lineHeight: 16, color: flColor.gray600 },
  xformWarn: { padding: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  xformWarnText: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  root: { flex: 1 },
  barTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  barSub: { fontSize: 11.5, color: flColor.gray600 },

  // pick step
  pickScroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },
  groupLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginLeft: 2, marginBottom: 12 },
  groupLabelGap: { marginTop: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '48%',
    flexGrow: 1,
    gap: 9,
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  typeCardLocked: { borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed, opacity: 0.72, boxShadow: 'none' },
  typeCardPressed: { transform: [{ scale: 0.98 }], borderColor: flColor.bronzeBorder },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
  },
  typeIconLocked: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  typeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  typeLabelLocked: { color: flColor.gray400 },
  typeSubLabel: { fontSize: 10.5, color: flColor.gray600 },

  // compose step
  composeScroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40, gap: 14 },
  postBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: flRadius.md, borderWidth: 1 },
  postBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.glowSubtle },
  postBtnOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  postBtnText: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.3 },
  postBtnTextOn: { color: flColor.bronze300 },
  postBtnTextOff: { color: flColor.gray600 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  authorDisc: { width: 40, height: 40, borderRadius: flRadius.round, backgroundColor: '#2c2118', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  authorText: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 14.5, fontWeight: '500', color: flColor.cream100 },
  authorMeta: { fontSize: 11.5, color: flColor.gray600, marginTop: 1 },

  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400, marginLeft: 2 },
  input: {
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14.5,
    color: flColor.cream100,
  },
  inputFocus: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  area: { lineHeight: 22 },

  preview: { gap: 9, marginTop: 4 },
  previewLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400, marginLeft: 2 },
  previewCard: {
    height: 170,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: '#171109',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewValue: { fontFamily: flFont.display, fontSize: 46, fontWeight: '700', lineHeight: 48, color: flColor.bronze300, textShadowColor: 'rgba(191,143,79,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 20 },
  previewExercise: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  previewTag: { fontSize: 9, fontWeight: '600', letterSpacing: 2.5, color: flColor.bronze400 },

  gateNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: flRadius.md, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal700 },
  gateNoteText: { flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 17, color: flColor.gray400 },

  // recap / pr pickers
  pickerWrap: { gap: 10 },
  pickerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400, marginLeft: 2 },
  pickerBusy: { height: 90, alignItems: 'center', justifyContent: 'center' },
  pickerEmpty: { fontSize: 13, lineHeight: 20, color: flColor.gray400, paddingVertical: 18, paddingHorizontal: 4 },
  pickerList: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, overflow: 'hidden' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15 },
  pickerRowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  pickerRowText: { flex: 1, minWidth: 0, gap: 2 },
  pickerRowName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  pickerRowSub: { fontSize: 12, color: flColor.gray600 },
  recapCard: { gap: 14, padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#171109', boxShadow: `${flShadow.borderInset}, ${flShadow.card}` },
  recapName: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  recapStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
  recapStat: { gap: 3 },
  recapStatN: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.bronze300 },
  recapStatLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  recapChange: { alignSelf: 'flex-start' },
  recapChangeText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },

  // media attach
  mediaAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderStyle: 'dashed',
    backgroundColor: flColor.surfaceRecessed,
  },
  mediaAddText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  mediaBox: { height: 120, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center', gap: 10 },
  mediaHint: { fontSize: 12.5, color: flColor.gray400 },
  mediaPreviewWrap: { position: 'relative', borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  mediaPreview: { width: '100%', height: 200, backgroundColor: flColor.charcoal900 },
  videoPreview: { height: 140, backgroundColor: '#171009', alignItems: 'center', justifyContent: 'center', gap: 10 },
  playDisc: { width: 44, height: 44, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: flColor.bronzeBorder },
  videoPreviewText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  mediaRemove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
});
