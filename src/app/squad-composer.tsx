import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
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
  type WorkoutSummary,
} from '@/data/squad-feed-live';
import { createFriendPost, uploadFeedMedia, type PostAudience } from '@/data/friends-feed-live';
import { friendsTypeFor, offeredToFriends } from '@/domain/squad/post-audience';
import { fetchMySquads } from '@/data/squad-live';
import { fetchTransformationEntries, type TransformationEntry } from '@/data/transformation-live';
import {
  EntryStrip,
  PickPreview,
  canPostPick,
  layoutFromPick,
  mediaFromPick,
  useTransformationPick,
} from '@/components/forge/compositions/TransformationPicker';
import { errorMessage } from '@/lib/useQuery';
import { UploadError } from '@/lib/storage-upload';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Composer — built to `Squad Composer.dc.html`, scoped to the post types Squad Feed backs with real
 * data. Two steps: pick a type → compose. Announcement is owner-only (locked card for members; the DB
 * also rejects it via RLS).
 *
 * CHECK-IN IS RETIRED AND PROGRESS PHOTOS TOOK ITS PLACE at the head of the member section
 * (`design_handoff_progress_photo_post` §16). Its compose form is gone from this file because the type
 * can no longer be chosen — a branch nothing can reach is not a safety net, it is a second description
 * of the product that will drift. What is NOT gone: `leadFor`, `squadPostTypeDef` and the feed's glyph
 * map all still resolve `checkin`, so every historic check-in keeps rendering exactly as it did.
 *
 * Progress Photos does not compose here at all. It is a card to be laid out, not a paragraph to be
 * typed, so picking it navigates to Progress Photo Post instead of opening step 2.
 *
 * TRANSFORMATION posts a comparison assembled from the athlete's own Transformation entries (L-17), not from
 * loose photos. That distinction is the point: the gallery holds the captures AND their per-pose alignment, so
 * two entries produce a genuine before/after — two arbitrary photos would produce a visibly worse post the
 * renderer already knows how to beat. The same `TransformationLayoutData` the gallery's Share flow builds is
 * assembled here, so `squad-post/[id]` renders both identically. Fewer than two entries offers the gallery
 * rather than an empty picker.
 *
 * ══ IT COMPOSES FOR THE FRIENDS FEED TOO, AND THAT IS WHY IT IS A SCREEN ══
 *
 * The Friends feed had its OWN composer, a `BottomSheet` inside `friends.tsx`. Reported by the PO:
 * *"I clicked on the text bar at the top and it won't let me add a video or a picture. And now I'm
 * frozen on the friends feed page."*
 *
 * ⚠ A MEDIA PICKER CANNOT BE OPENED FROM INSIDE A SHEET. `useMediaPicker` presents its own
 * `BottomSheet`, and beneath that a system picker — and its header already documents, from a tester
 * report, that iOS silently refuses to present a view controller while another is on screen. That file
 * waits for the chooser IT owns to dismiss; it knows nothing about a CALLER that is itself a modal. So
 * the sheet stayed up, the picker was dropped, the button read as dead, and an invisible overlay kept
 * swallowing taps. Every other capture surface in the app — profile photo, transformation capture,
 * create squad, accomplishments, and this screen — is a pushed route with nothing above it. Friends was
 * the only exception, and the only one broken.
 *
 * Moving it here rather than giving it a second screen of its own also deletes the duplicate: two
 * composers writing the same table is how the recap stats strip drifted before `RecapStrip` was
 * extracted.
 *
 * ⚠ THE AUDIENCE DECIDES WHICH WRITER RUNS, NOT WHICH SCREEN YOU CAME FROM.
 * `Social-Architecture-Amendment-002` §4 is explicit: `BOTH` is ONE row and must be written through
 * `createFriendPost`, because `addSquadPost` never sets `audience` and so can only ever produce a SQUAD
 * row. Teaching it a third audience would give two functions the same job.
 *
 * The type list narrows with the audience rather than the screen changing shape: an Announcement is a
 * squad instrument (owner-only, and RLS rejects it anyway) and is not offered to friends.
 */

interface Form {
  body: string;
  prExercise: string;
  prValue: string;
  prLabel: string;
}
const EMPTY: Form = { body: '', prExercise: '', prValue: '', prLabel: 'Squad PR' };

/**
 * The three destinations, each with the sentence that says what it means. There is no public option and
 * no fourth row to add one to — `squad_posts.audience` admits exactly these (CC-D2 / FR-D3, restated by
 * SOC-A2-D4). Every note says who can see it, because that is the only question this control answers.
 */
const AUDIENCES: { key: PostAudience; label: string; note: string }[] = [
  { key: 'FRIENDS', label: 'Friends', note: 'Only athletes you’ve accepted as friends. Never public.' },
  { key: 'SQUAD', label: 'A Squad', note: 'Only the members of the squad you pick.' },
  { key: 'BOTH', label: 'Friends & Squad', note: 'One post, both feeds — one thread, one set of acknowledgements.' },
];

export default function SquadComposerRoute() {
  const { id, owner, name, audience: audienceParam } = useLocalSearchParams<{
    id?: string;
    owner?: string;
    name?: string;
    audience?: string;
  }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { pick: pickMediaSource, mediaPickerSheet } = useMediaPicker();
  const isOwner = owner === '1';
  const squadName = name ? String(name) : '';

  /*
   * Entered from a squad, the squad is fixed and the audience is SQUAD. Entered from the Friends feed,
   * there is no squad yet and the athlete chooses — so the picker below loads their squads only when a
   * choice actually needs one.
   */
  const [audience, setAudience] = useState<PostAudience>(audienceParam === 'FRIENDS' ? 'FRIENDS' : 'SQUAD');
  const [squadId, setSquadId] = useState<string>(String(id ?? ''));
  const [squads, setSquads] = useState<{ id: string; name: string }[] | null>(null);
  const fromSquad = !!String(id ?? '');

  const [type, setType] = useState<SquadPostType | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const postRef = useTourAnchor('composer-post');
  const [media, setMedia] = useState<SquadMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPct, setMediaPct] = useState(0);
  const mediaAbortRef = useRef<AbortController | null>(null);
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

  // Shared with the friends composer: one definition of what a comparison is.
  const xform = useTransformationPick(entries, thenId, nowId);

  /*
   * Loaded on the tap that needs them, not on mount: entering from a squad never needs this list, and
   * an effect that fetched it anyway would pay for a choice most athletes never make.
   */
  const chooseAudience = (a: PostAudience) => {
    setAudience(a);
    if (a === 'FRIENDS') return;
    if (squads) return;
    fetchMySquads().then(
      (rows) => setSquads(rows.map((r) => ({ id: r.id, name: r.name }))),
      () => setSquads([]),
    );
  };

  /** SOC-A2-D3: `BOTH` is one row and the check constraint is an equivalence, so it MUST carry a squad. */
  const needsSquad = audience !== 'FRIENDS';

  const valid = useMemo(() => {
    if (!type || uploading || buildingRecap) return false;
    if (needsSquad && !squadId) return false;
    const body = form.body.trim();
    switch (type) {
      case 'formcheck':
        return !!media; // a form check needs a clip
      case 'recap':
        return !!recap; // a recap needs a real workout
      case 'pr':
        return !!form.prExercise.trim() && !!form.prValue.trim();
      case 'transformation':
        return canPostPick(xform);
      default:
        return !!body; // discussion / announcement
    }
  }, [type, form, media, recap, uploading, buildingRecap, xform, needsSquad, squadId]);

  const pick = (t: SquadPostType) => {
    /*
     * PROGRESS PHOTOS LEAVES THIS SCREEN. It is a card to be laid out, not a paragraph to be typed, so
     * it gets its own composer rather than a text form with photos bolted on. This is the only type
     * that routes out — everything else composes here.
     */
    if (t === 'progress') {
      router.push({ pathname: '/progress-photo-post', params: { origin: 'squad', squadId, squadName } });
      return;
    }
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

  /**
   * Attach a photo or clip. The upload runs here, at pick time, so the Post button is only ever
   * pressed against media that already exists.
   *
   * Progress and cancel arrived with `storage-upload.ts` — the Post button is blocked while this runs,
   * so a stalled attachment used to block the whole composer behind an "Uploading…" that could not be
   * dismissed. Tapping the box now aborts.
   */
  const pickMedia = async (videoOnly: boolean) => {
    if (uploading) {
      mediaAbortRef.current?.abort();
      return;
    }
    const asset = await pickMediaSource({ kind: videoOnly ? 'videos' : 'both', title: videoOnly ? 'Add a video' : 'Add a photo or video', quality: 0.7 });
    if (!asset?.uri) return;
    const kind: SquadMediaKind = asset.type === 'video' ? 'video' : 'image';
    const controller = new AbortController();
    mediaAbortRef.current = controller;
    setMediaPct(0);
    setUploading(true);
    try {
      /*
       * ⚠ TWO UPLOAD PATHS, because the object path encodes who may read it (0075). A squad post's media
       * is keyed by squad; a friends post's is keyed by the uploader, since there is no squad to scope
       * it to. `BOTH` takes the friends path — the row is written by `createFriendPost`, and media that
       * lived under a squad prefix would be scoped to a squad the post is only half addressed to.
       */
      const url = needsSquad && audience === 'SQUAD'
        ? await uploadPostMedia(squadId, asset.uri, kind, {
            contentType: asset.mimeType,
            onProgress: setMediaPct,
            signal: controller.signal,
          })
        : await uploadFeedMedia(asset.uri, kind);
      setMedia({ url, kind });
    } catch (e) {
      if (e instanceof UploadError && e.kind === 'cancelled') showToast('Upload cancelled.');
      else showToast(errorMessage(e));
    } finally {
      mediaAbortRef.current = null;
      setUploading(false);
      setMediaPct(0);
    }
  };

  const submit = () => {
    if (!type || !valid || posting) return;

    const layout = type === 'transformation' ? layoutFromPick(xform) : null;
    const xformMedia = layout
      ? mediaFromPick(xform).map((m) => ({ url: m.url, kind: 'image' as SquadMediaKind }))
      : [];

    setPosting(true);

    /*
     * ⚠ THE AUDIENCE PICKS THE WRITER (Amendment 002 §4). `addSquadPost` never sets `audience`, so it can
     * only produce a SQUAD row; `BOTH` is one row carrying one comment thread and one set of
     * acknowledgements, and only `createFriendPost` can write it.
     */
    const done = () => {
      setPosting(false);
      showToast(audience === 'SQUAD' ? 'Posted to your squad' : audience === 'BOTH' ? 'Posted to your friends and squad' : 'Posted to your friends');
      router.back();
    };
    const failed = (e: unknown) => {
      setPosting(false);
      showToast(errorMessage(e));
    };

    if (audience === 'SQUAD') {
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
      }).then(done, failed);
      return;
    }

    /*
     * The friends card reads a before/after from media that carry `slot`, not from `layout` — see
     * `FRIENDS_TYPE`. `mediaFromPick` returns them oldest-first, which is what makes index 0 the
     * "before"; the same assignment the retired sheet made.
     */
    const friendsMedia = type === 'transformation'
      ? mediaFromPick(xform).map((m, i) => ({ url: m.url, kind: 'image' as const, slot: i === 0 ? ('before' as const) : ('after' as const) }))
      : media
        ? [{ url: media.url, kind: media.kind }]
        : [];

    createFriendPost({
      body: form.body,
      audience,
      squadId: audience === 'BOTH' ? squadId : null,
      media: friendsMedia,
      type: friendsTypeFor(type),
      workoutId: recap?.workoutId ?? null,
      workoutSummary: recap?.summary ?? null,
      prValue: form.prValue,
      prExercise: form.prExercise,
      prLabel: form.prLabel,
    }).then(done, failed);
  };

  // ── Step 1: pick a type ──
  if (!type) {
    return (
      <View style={styles.root}>
        <ComposerBg />
        <AppBar
          title={<BarTitle title={fromSquad ? 'Post to Squad' : 'New Post'} sub={fromSquad ? 'Training, recognition & coordination' : 'Share it where it belongs'} />}
          onBack={() => router.back()}
        />
        <ScrollView contentContainerStyle={styles.pickScroll} showsVerticalScrollIndicator={false}>
          {/*
            The destination, chosen before the type, and only when it IS a choice — entering from a
            squad has already answered it.

            SOC-A2-D3: unavailable destinations are SHOWN, disabled, with the reason. A hidden option
            teaches nothing; a disabled one with a sentence teaches what a squad is for.
          */}
          {fromSquad ? null : (
            <>
              <Text style={styles.groupLabel}>Where does this go?</Text>
              <View style={styles.audienceRow}>
                {AUDIENCES.map((a) => {
                  const blocked = a.key !== 'FRIENDS' && squads !== null && squads.length === 0;
                  return (
                    <Pressable
                      key={a.key}
                      onPress={() => (blocked ? showToast('You’re not in a squad yet.') : chooseAudience(a.key))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: audience === a.key, disabled: blocked }}
                      accessibilityLabel={`${a.label}. ${blocked ? 'You are not in a squad yet.' : a.note}`}
                      style={({ pressed }) => [
                        styles.audienceChip,
                        audience === a.key && !blocked ? styles.audienceChipOn : null,
                        blocked ? styles.audienceChipOff : null,
                        pressed && !blocked ? styles.xformPressed : null,
                      ]}
                    >
                      <Text style={[styles.audienceLabel, audience === a.key && !blocked ? styles.audienceLabelOn : null]}>{a.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.audienceNote}>
                {needsSquad && squads !== null && squads.length === 0
                  ? 'You’re not in a squad yet, so Friends is the only place inside Forge to share this.'
                  : (AUDIENCES.find((a) => a.key === audience)?.note ?? '')}
              </Text>

              {/* Which squad, once one is needed. */}
              {needsSquad && (squads ?? []).length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squadStrip}>
                  {(squads ?? []).map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setSquadId(s.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: squadId === s.id }}
                      accessibilityLabel={`Post to ${s.name}`}
                      style={({ pressed }) => [styles.squadChip, squadId === s.id ? styles.squadChipOn : null, pressed ? styles.xformPressed : null]}
                    >
                      <Text style={[styles.squadChipText, squadId === s.id ? styles.squadChipTextOn : null]} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </>
          )}

          <Text style={[styles.groupLabel, fromSquad ? null : styles.groupLabelGap]}>
            {audience === 'FRIENDS' ? 'What are you sharing?' : 'Anyone in the squad'}
          </Text>
          {/*
            Only types the destination can actually take. `offeredToFriends` is the SAME map the write
            uses, so the grid can never offer a type the writer would mistranslate.

            ⚠ PROGRESS PHOTOS IS EXCLUDED FROM A FRIENDS-ONLY POST, and not because of that map.
            Picking it leaves this screen for `/progress-photo-post`, which posts through `addSquadPost`
            and refuses without a `squadId` — its primary button falls back to a system share. Offering
            it here would hand the athlete a dead end. Transformation is the before/after that reaches
            the friends feed, and it is offered.
          */}
          <View style={styles.grid}>
            {SQUAD_POST_TYPES.filter((t) => !t.ownerOnly)
              .filter((t) => audience !== 'FRIENDS' || offeredToFriends(t.id))
              .map((t) => (
                <TypeCard key={t.id} label={t.label} icon={<TypeGlyph type={t.id} />} onPress={() => pick(t.id)} />
              ))}
          </View>

          {/* An announcement is a squad instrument — owner-only, and RLS rejects it regardless. On a
              friends-only post there is nobody to announce to, so the section is absent, not locked. */}
          {audience === 'FRIENDS' ? null : (
            <>
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
            </>
          )}
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
        /* The subtitle names the DESTINATION, not the screen. It read "Your squad" unconditionally,
           which becomes a falsehood the moment this composer can post to friends. */
        title={<BarTitle title={def.label} sub={audience === 'FRIENDS' ? 'Your friends' : audience === 'BOTH' ? 'Your friends & squad' : 'Your squad'} />}
        onBack={backToPick}
        actions={
          <Pressable ref={postRef} onPress={submit} disabled={!valid || posting} accessibilityRole="button" accessibilityLabel="Post" style={[styles.postBtn, valid ? styles.postBtnOn : styles.postBtnOff]}>
            <Text style={[styles.postBtnText, valid ? styles.postBtnTextOn : styles.postBtnTextOff]}>{posting ? 'Posting…' : 'Post'}</Text>
          </Pressable>
        }
      />
      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.composeScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TourAnchor id="composer-body" style={styles.authorRow}>
          <View style={styles.authorDisc} />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>You</Text>
            <Text style={styles.authorMeta}>{def.label}</Text>
          </View>
        </TourAnchor>

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
              <EntryStrip label="Then" entries={entries ?? []} selectedId={thenId} otherId={nowId} onSelect={setThenId} />
              <EntryStrip label="Now" entries={entries ?? []} selectedId={nowId} otherId={thenId} onSelect={setNowId} />
              <PickPreview pick={xform} />
              <Area label="Say something (optional)" value={form.body} onChange={(v) => set('body', v)} placeholder="What changed?…" rows={2} />
            </>
          )
        ) : type === 'formcheck' ? (
          <>
            <MediaAttach media={media} uploading={uploading} pct={mediaPct} videoOnly onPick={() => pickMedia(true)} onRemove={() => setMedia(null)} />
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
            <MediaAttach media={media} uploading={uploading} pct={mediaPct} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
          </>
        ) : type === 'discussion' ? (
          <>
            <Area label="Note to the squad" value={form.body} onChange={(v) => set('body', v)} placeholder="Keep it short…" rows={4} />
            <MediaAttach media={media} uploading={uploading} pct={mediaPct} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
          </>
        ) : (
          <>
            <Area label="Announcement" value={form.body} onChange={(v) => set('body', v)} placeholder="Pins to the top of the squad feed…" rows={4} />
            <MediaAttach media={media} uploading={uploading} pct={mediaPct} onPick={() => pickMedia(false)} onRemove={() => setMedia(null)} />
            <View style={styles.gateNote}>
              <ShieldIcon />
              <Text style={styles.gateNoteText}>You’re posting a squad announcement as the owner — every member sees it at the top of the feed.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <ScreenTour screenKey="squad-composer" ready={!!type} />

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

function MediaAttach({ media, uploading, pct, onPick, onRemove, videoOnly = false }: { media: SquadMedia | null; uploading: boolean; pct: number; onPick: () => void; onRemove: () => void; videoOnly?: boolean }) {
  if (uploading) {
    const percent = Math.round(pct * 100);
    return (
      // Pressable, not a dead box: `onPick` aborts while an upload is running, which is the only way
      // out of a stalled attachment now that it blocks the Post button.
      <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel={`Cancel upload, ${percent} percent done`} style={styles.mediaBox}>
        <ActivityIndicator color={flColor.bronze400} />
        <Text style={styles.mediaHint}>Uploading… {percent}%</Text>
        <View style={styles.mediaProgressTrack}>
          <View style={[styles.mediaProgressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.mediaHint}>Tap to cancel</Text>
      </Pressable>
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
    case 'progress':
      return (
        <Svg {...props}>
          <Path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" />
          <Circle cx={12} cy={13} r={3.5} />
        </Svg>
      );
    // Retired from the palette, kept so a legacy check-in still draws its own mark wherever one is asked for.
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

const styles = StyleSheet.create({
  xformLoading: { paddingVertical: 40, alignItems: 'center' },
  xformEmpty: { gap: 8, padding: 18, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  xformEmptyTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  xformEmptyBody: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },
  xformEmptyBtn: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  xformEmptyBtnLabel: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  xformPressed: { opacity: 0.85 },



  root: { flex: 1 },
  barTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  barSub: { fontSize: 11.5, color: flColor.gray600 },

  // pick step
  pickScroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32 },
  groupLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginLeft: 2, marginBottom: 12 },
  groupLabelGap: { marginTop: 24 },

  // ── audience (composer merge) ──
  audienceRow: { flexDirection: 'row', gap: 8 },
  audienceChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal700,
  },
  audienceChipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.charcoal600 },
  /* Shown, not hidden — SOC-A2-D3. Dimmed enough to read as unavailable and still legible enough to
     read at all, because the sentence under it is the whole point of leaving it on screen. */
  audienceChipOff: { opacity: 0.45 },
  audienceLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600, textAlign: 'center' },
  audienceLabelOn: { color: flColor.cream100 },
  audienceNote: { fontSize: 12, lineHeight: 17, color: flColor.gray600, marginTop: 10, marginLeft: 2 },
  squadStrip: { gap: 8, paddingTop: 12, paddingRight: 18 },
  squadChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal700,
    maxWidth: 190,
  },
  squadChipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.charcoal600 },
  squadChipText: { fontSize: 12.5, color: flColor.gray600 },
  squadChipTextOn: { color: flColor.cream100 },
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
  previewValue: { fontFamily: flFont.display, fontSize: 46, fontWeight: '700', lineHeight: 48, color: flColor.bronze300, textShadowColor: 'rgba(186, 134, 84,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 20 },
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
  mediaProgressTrack: { width: '60%', height: 3, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  mediaProgressFill: { height: '100%', backgroundColor: flColor.bronze400 },
  mediaHint: { fontSize: 12.5, color: flColor.gray400 },
  mediaPreviewWrap: { position: 'relative', borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  mediaPreview: { width: '100%', height: 200, backgroundColor: flColor.charcoal900 },
  videoPreview: { height: 140, backgroundColor: '#171009', alignItems: 'center', justifyContent: 'center', gap: 10 },
  playDisc: { width: 44, height: 44, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: flColor.bronzeBorder },
  videoPreviewText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  mediaRemove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
});
