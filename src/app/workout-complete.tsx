import { WELCOME_BACK_COPY } from '@/domain/home/welcome-back';
import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { NotFoundBody, guardRoute, hasId } from '@/components/forge/NotFound';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { holdOverlays, useCeremony, useToast } from '@/hooks/useCeremony';
import { saveWorkoutAsTemplate } from '@/data/templates-live';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { useUnits } from '@/lib/settings';
import { consentForRoute } from '@/lib/consent';
import { useNutritionAccess } from '@/lib/entitlement';
import { localToday, totals } from '@/domain/nutrition/day';
import { fetchDay } from '@/data/nutrition-live';
import { rowMetresText } from '@/domain/workout/conditioning';
import { displayWeight, exactWeight } from '@/domain/settings/units';
import { WORKOUT_NAME_MAX, fetchCompletion, renameWorkout, savePlaylist, saveReflection, saveWorkoutNote, type CompletionCardio, type CompletionHero, type ExerciseDelta } from '@/data/workout-complete-live';
import { fetchWorkoutAsSession } from '@/data/continue-workout-live';
import { persistSession } from '@/domain/workout/autosave';
import { withinContinueWindow } from '@/domain/workout/save';
import { markSessionSealed, unmarkSessionSealed, wasSessionSealed } from '@/lib/sealed-sessions';
import { PlaylistSheet } from '@/components/forge/composites/Playlist';
import { playlistLabel, type WorkoutPlaylistLink } from '@/domain/workout/playlist';
import { distanceLabel, fmtClock, fmtPace, toDistance, toPace, type UnitSystem } from '@/domain/run/run-core';
import { recapSummaryFrom, fetchWorkoutShares } from '@/data/squad-feed-live';
import { fetchTodaysChapterPhotos, type ChapterPhoto } from '@/data/photos-live';
import { fetchRecentPlaylists } from '@/data/playlists-live';
import { PhotoLookChoice, type PhotoLook } from '@/components/forge/PhotoLookChoice';
import { workoutStats } from '@/components/forge/compositions/LedgerPost';
import { composePostPicture, storyInputFrom } from '@/domain/share/story-card';
import { postPictureBits } from '@/lib/post-picture';
import { StoryCardHost } from '@/lib/story-card-host';
import { SquadSelectList } from '@/components/forge/SquadSelectList';
import { fetchWorkoutPostId, fetchWorkoutSharesStrict, runAutoPost } from '@/data/auto-post-live';
import { postWorkoutRecap } from '@/data/workout-post-live';
import { clearAutoPostPending, markAutoPostPending } from '@/lib/auto-post-pending';
import { readLastDestinations, saveLastDestinations } from '@/lib/post-destinations';
import { fetchMySquads } from '@/data/squad-live';
import {
  NO_DESTINATIONS,
  autoPostStanding,
  destinationTargets,
  parseDestinations,
  postedFor,
  postedLine,
  startingDestinations,
  withinAutoPostWindow,
  type AutoPostPref,
  type Destinations,
} from '@/domain/share/auto-post';
import { shareState, squadList } from '@/domain/share/fanout';
import { foodLine } from '@/domain/share/recap-stats';
import { plainError } from '@/lib/plain-error';
import { useAutoPost } from '@/hooks/useAutoPost';
import { EngravedIcon, engravedTint, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import type { PriorShare } from '@/domain/share/fanout';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { forgeOr } from '@/constants/theme-scrim';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * TWO STAGES AND A DETOUR — `handoff/workout-complete-flow-change.md`.
 *
 * `seal` is the ceremony and it is finished the moment the hold completes. `capture` is a SECOND,
 * distinct moment that happens after closure: the note, the photo and the playlist, with Share as the
 * one filled button. `record` ("See the details") is an optional detour off either of them and returns
 * to whichever one opened it.
 *
 * There is deliberately no path from `capture` back to `seal`. The seal is a one-time moment, and a
 * screen that lets you walk back into it is offering a ritual whose outcome already happened.
 */
type Stage = 'seal' | 'capture' | 'record';

// "Under Iron" clock, mm:ss (h:mm:ss past an hour) — matches the design's 52:18.
function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
// thousands separators without Intl (Hermes-safe) — matches "18,140".
function thousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
// One stable quote per session (design uses ForgeQuotes.random()); picked by workout id so a re-render won't reshuffle.
const QUOTES = [
  'History is permanent. Outcomes cannot change.',
  'The iron never lies. It only records.',
  'What you built today is already yours forever.',
  'Every session is a page. This one is written.',
  'Strength is a story told one rep at a time.',
];
function quoteFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}
/**
 * W-17 Workout Complete (minimal-real, 4-stage: Seal · Record · Reflect · Share). A separate route
 * reached by W-9 Finish (`router.replace('/workout-complete?id=…')`) — the workout is already durably
 * committed (seam (b)); this renders it back from the DB. The Reflect note is the one post-commit write
 * (optional, `workouts.reflection`). Deferred: honor hero moment, "How You Improved" deltas, resurfaced
 * memory (need the honor service / set-history). Primary path = Seal → hold → Legacy; the note lives on
 * the secondary "See the details → Reflect" branch, so most workouts intentionally carry no reflection.
 */
/** How long ceremonies and toasts wait while this screen closes — comfortably past iOS's ~0.5 s dismissal. */
const OVERLAY_HOLD_MS = 900;

export default guardRoute(WorkoutComplete, hasId, { title: 'There’s no workout to show.', reason: 'Open a session from your activity history to see its summary.' });

function WorkoutComplete() {
  const { id, review: reviewParam } = useLocalSearchParams<{ id?: string; review?: string }>();
  /*
   * ══ REVIEW: THE SAME SUMMARY, RE-OPENED FROM HISTORY ══
   *
   * This screen is parameterised by a workout id, so it can already describe ANY saved session — it was
   * simply only ever reached once, in the seconds after Finish. Activity Detail now links back to it so
   * the full summary is a thing you can return to rather than a thing you got one look at.
   *
   * Three things must NOT replay, because they are moments rather than facts:
   *   · the PROGRAM GRADUATION ceremony — enqueueing it here would throw a full-screen celebration at
   *     somebody idly scrolling their history months later;
   *   · the FIRST-WORKOUT reveal ("Your Chapter begins") — an arrival, and you only arrive once;
   *   · HOLD TO SEAL — it is already sealed. The hold writes nothing (the session was committed by
   *     `save_workout` long before this screen drew), so re-holding is harmless but dishonest: it offers
   *     a ritual whose outcome already happened.
   *
   * Everything that is a FACT stays: the medallion, the stats, the PR, the record breakdown. And the
   * writes that are still meaningful later stay available too — add a reflection, save it as a template,
   * attach a playlist, share it to a squad. None of those expire at the end of the session.
   */
  /*
   * ⚠ AND ANY SESSION THIS DEVICE HAS ALREADY SEALED, whatever the route says (workout-18, QA 09-26). A
   * reload of this page, or any way back to the same id without `review=1`, used to offer Hold to Seal
   * again over a workout that had been sealed. `null` while the device is being asked — the page waits
   * for the answer (see the loading gate) so the seal face cannot flash up and vanish.
   */
  const [sealedBefore, setSealedBefore] = useState<boolean | null>(reviewParam === '1' ? true : null);
  const review = reviewParam === '1' || sealedBefore === true;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  // Volume is stored in lb; show it in the athlete's system. `fmt` re-expresses per-set strings.
  const { units, fmt, rowUnit } = useUnits();
  const { data, loading, error } = useQuery(() => fetchCompletion(String(id), units), [id, units]);

  /*
   * The session's TRAINING note — how it went. Deliberately on The Record and not beside the Reflect
   * step: the reflection is the keepsake ("you'll read it again someday") and this is the training log
   * ("felt flat, slept badly"). Two boxes asking the same question on one screen would be a worse
   * product than either; two boxes asking different ones, a page apart, is the honest split.
   *
   * ⚠ DERIVED, NOT SYNCED. The obvious version holds a draft string and hydrates it from `data.note` in
   * an effect — which the react-compiler lint rejects outright (sync setState in an effect body), and
   * rightly: it is a second copy of a value that already exists, kept in step by hand. `null` here means
   * "not typed in yet", so what renders falls back to what is stored, and no effect is needed at all.
   */
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const sessNote = noteDraft ?? data?.note ?? '';
  const [sessNoteSaved, setSessNoteSaved] = useState(false);

  /**
   * M-4 PROGRAM GRADUATED — fired here because W-17's load IS the consumption point (M-4 §6.2), and
   * because W-17 is the only screen that knows the session just landed.
   *
   * The fact comes from `data.graduation`, which the data layer derived from the database rather than
   * being told by whoever navigated here — so a cold start into this screen still fires it, and nothing
   * can announce a graduation that did not happen.
   *
   * The ceremony renders in the app-level `CeremonyProvider`, so W-17 stays visible and dimmed beneath
   * it and this screen owns none of the presentation. `mergeCeremonies` dedupes on the id, which matters
   * because `useQuery` refetches whenever the units preference changes.
   */
  const { enqueue } = useCeremony();
  // Not in review — a graduation is a moment, and it has already had it. See the note on `review`.
  const graduation = review || sealedBefore == null ? null : (data?.graduation ?? null);
  /* Its quiet twin (M4-A1-D2). Suppressed in review for the same reason: the week finished once, and a
     reopened session must not announce it again. Deliberately NOT enqueued anywhere — it is a line on
     this screen, which is the whole of the decision. */
  const completion = review ? null : (data?.completion ?? null);
  useEffect(() => {
    if (!graduation) return;
    enqueue({
      id: `program-grad-${graduation.programId}`,
      kind: 'programGraduated',
      programName: graduation.programName,
      startedAt: graduation.startedAt,
      graduatedAt: graduation.graduatedAt,
      workouts: graduation.workouts,
    });
  }, [graduation, enqueue]);

  /* ⚠ `mySquads`, `squadStep` and `sharing` moved into `ShareSessionSheet` with the destination logic.
     They were screen state serving a sheet that is no longer this screen's, and leaving them here would
     be three variables that look like they still decide something. */
  const vol = (lb: number) => thousands(displayWeight(lb, units).value);
  const volUnit = displayWeight(0, units).unit;
  /*
   * ⚠ A REVIEWED SESSION OPENS ON `capture`, NOT ON `seal`.
   *
   * The seal face is a ceremony, and this screen's own rule (see the `review` note above) is that the
   * ritual must not replay — so in review it had already been reduced to a medallion with a "Done"
   * button under it, a ceremony with its ceremony removed. `capture` says exactly what is true of a
   * session you have come back to: *the workout is sealed, what surrounds it is still yours to add*. It
   * also carries every write that stays meaningful later — the note, the playlist, the photo, and Share
   * — which the corner share glyph used to be the only door to.
   *
   * Nothing is lost by it. The medallion is here at 72px, the numbers are on the meta line, and the PR
   * badges, the deltas and the record breakdown are one tap away on "See workout details".
   */
  const [stage, setStage] = useState<Stage>(review ? 'capture' : 'seal');
  /** Which stage opened The Record, so its back control returns there instead of a hardcoded target. */
  const [from, setFrom] = useState<Exclude<Stage, 'record'>>(review ? 'capture' : 'seal');
  /* The device's answer lands in a promise, so the stage moves there — never in the effect body. */
  useEffect(() => {
    if (reviewParam === '1') return;
    let alive = true;
    void wasSessionSealed(String(id ?? '')).then((was) => {
      if (!alive) return;
      setSealedBefore(was);
      if (was) {
        setStage('capture');
        setFrom('capture');
      }
    });
    return () => {
      alive = false;
    };
  }, [id, reviewParam]);
  const openRecord = () => {
    setFrom(stage === 'capture' ? 'capture' : 'seal');
    setStage('record');
  };
  /** The one sheet the capture stage has open, if any. */
  const [sheet, setSheet] = useState<'note' | 'playlist' | 'squads' | null>(null);
  /* Saving the day as a template. Offered on The Record and nowhere else — it belongs beside the shape it
     would keep, and the primary path (Seal → hold → Legacy) never sees it, which is the point. Most
     sessions should not be templates. */
  const [savedTemplate, setSavedTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  /* Naming happens at save time, not afterwards. A template called "Freestyle Workout" is one you have
     to open to identify, and by the time you notice you're on a different screen. */
  const [nameOpen, setNameOpen] = useState(false);
  const primeKeyboard = useKeyboardPrimer();
  const [templateName, setTemplateName] = useState('');
  /*
   * The session's own name, once the athlete has changed it. Same three-state idiom as `playlistEdit`
   * below and for the same reason: `undefined` means "not edited, show what loaded", while `null` is a
   * real answer meaning the name was CLEARED. A plain `useState(data?.workoutName)` would be reset by
   * the refetch that any units change triggers.
   */
  const [nameEdit, setNameEdit] = useState<string | null | undefined>(undefined);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  /* The reflection being typed in the note sheet, and the one that has been SEALED from this screen.
     Same three-state idiom as `playlistEdit` below: `undefined` means "untouched — whatever the database
     said", so a units-change refetch cannot wipe a note that was just written. */
  const [note, setNote] = useState('');
  const [reflectionEdit, setReflectionEdit] = useState<string | undefined>(undefined);
  const [savingNote, setSavingNote] = useState(false);
  /*
   * Posts this session already has — read on arrival, kept current by the sheet. PO: *"it's still not
   * showing me that I shared it in any way … or else people will double post."* The toast said so for
   * three seconds; this is what says so when they come back to the screen.
   */
  const [shares, setShares] = useState<PriorShare[] | null>(null);
  const workoutIdForShares = data?.workoutId ?? null;
  useEffect(() => {
    if (!workoutIdForShares) return;
    let alive = true;
    void fetchWorkoutShares(workoutIdForShares).then((p) => alive && setShares(p));
    return () => {
      alive = false;
    };
  }, [workoutIdForShares]);
  const reflection = (reflectionEdit !== undefined ? reflectionEdit : (data?.reflection ?? '')).trim();

  /*
   * ══ AUTO-POST — AFTER THE SAVE, NEVER IN THE WAY OF IT ══
   *
   * This screen is only ever reached with a workout `save_workout` already committed, so the post below
   * can fail in any way it likes and the session is still sealed — it is a second thing, reported on the
   * capture stage with the error under the button, never a gate.
   *
   * ══ IT FIRES WHEN THEY LEAVE, NOT WHEN THEY ARRIVE (PO 2026-09-30) ══
   *
   * *"It auto posted before I could attach the playlist and my comment."* It fired on arrival, so the
   * post was the session as it stood before this screen had offered anything. Since 2026-10-02 auto-post's
   * destinations are simply what the Friends / Squads rows START on, and the button posts what they show
   * — with the note, the photos and the playlist added here. Three ways out, all covered:
   *
   *   · the button                → `finish` (posts the rows as they stand, whatever the pref says)
   *   · any other navigation away → the unmount effect below, ONLY while the rows are untouched — a row
   *                                 the athlete changed is their answer, and posting the pref over it
   *                                 would post to a squad they had just unticked
   *   · closing the app           → the marker, posted on the next launch (`AutoPostCatchUp`), on the
   *                                 same condition
   *
   * Never in review (a session reopened from history is not "just finished"), never outside the window
   * `withinAutoPostWindow` allows (a stale tab or reload hours later), and never before the prefs have
   * actually loaded — until then the pref reads OFF, and deciding on that would silently skip it.
   */
  const autoPost = useAutoPost();
  /* One automatic attempt per visit — the button was pressed, after which leaving posts nothing more. */
  const [autoTried, setAutoTried] = useState(false);
  const autoEligible = !review && withinAutoPostWindow(data?.savedAt ?? null);
  /* The athlete's squads — the Squads row, its picker, and the names in "Posted to …". A failed read is
     said as such on the row, never drawn as "No Squads yet". */
  const { data: mySquads, error: squadsError } = useQuery(() => fetchMySquads(), []);
  const memberIds = mySquads ? mySquads.map((s) => s.id) : null;
  const autoStanding =
    !autoTried &&
    autoPost.loaded &&
    /* Not until the session's posts have been READ: "unknown" must not be taken for "nowhere yet". */
    shares !== null &&
    autoPostStanding(autoPost.pref, memberIds, shares, autoEligible);

  /*
   * ══ FRIENDS AND SQUADS ARE CHOSEN ON THE SCREEN (PO 2026-10-02) ══
   *
   * The destinations used to live behind "Post to Forge" in a sheet; they are two rows on the capture
   * stage now, and the one button below them posts to exactly what they show. `null` means "untouched —
   * whatever `startingDestinations` says", which is auto-post's destinations when it is on, else where
   * this phone last posted by hand, else nothing. Touching either row makes the choice the athlete's own.
   *
   * ⚠ NOTHING IS POSTED UNTIL THE BUTTON IS PRESSED, with one exception kept from auto-post: an athlete
   * who has it on and leaves some other way without touching the rows still gets it posted (below).
   */
  const [lastRaw, setLastRaw] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void readLastDestinations().then((r) => alive && setLastRaw(r));
    return () => {
      alive = false;
    };
  }, []);
  const [friendsPick, setFriendsPick] = useState<boolean | null>(null);
  const [squadPick, setSquadPick] = useState<ReadonlySet<string> | null>(null);
  const touched = friendsPick !== null || squadPick !== null;
  const starting: Destinations =
    shares !== null && autoPost.loaded && memberIds && lastRaw !== undefined
      ? startingDestinations({ eligible: autoEligible, prior: shares, pref: autoPost.pref, last: parseDestinations(lastRaw), memberSquadIds: memberIds })
      : NO_DESTINATIONS;
  const selection: Destinations = {
    friends: friendsPick ?? starting.friends,
    squadIds: squadPick ? [...squadPick] : starting.squadIds,
  };
  /* Per-post ticks, off on every visit and never remembered — the map by D-RS-3, the food by PO 09-28. */
  const [shareRoute, setShareRoute] = useState(false);
  const [shareFood, setShareFood] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  /* The closing-the-app marker stands only while leaving would auto-post — i.e. while the rows are untouched. */
  const savedAtForAuto = data?.savedAt ?? null;
  useEffect(() => {
    if (touched) void clearAutoPostPending();
    else if (workoutIdForShares && savedAtForAuto && autoEligible) void markAutoPostPending(workoutIdForShares, savedAtForAuto);
  }, [workoutIdForShares, savedAtForAuto, autoEligible, touched]);

  /* What the unmount below would post, kept in a ref because it must read the LATEST answer from a
     cleanup that was created on the first render. The button nulls it directly — see `finish`. */
  const autoOnLeave = useRef<{ id: string; pref: AutoPostPref } | null>(null);
  useEffect(() => {
    autoOnLeave.current = autoStanding && !touched && workoutIdForShares ? { id: workoutIdForShares, pref: autoPost.pref } : null;
  }, [autoStanding, touched, workoutIdForShares, autoPost.pref]);
  useEffect(
    () => () => {
      /* Leaving inside a running app settles it one way or the other, so the marker always goes —
         only an app that was CLOSED on this screen leaves one for the next launch to find. */
      void clearAutoPostPending();
      const a = autoOnLeave.current;
      if (a) void runAutoPost(a.id, a.pref);
    },
    [],
  );

  /*
   * HOW MANY PHOTOS THIS SCREEN PUT IN THE ARCHIVE — a delta, not a count.
   *
   * ⚠ A PHOTO IS NOT ATTACHED TO A WORKOUT. `chapter_photos` hangs off a CHAPTER and a date (L-15
   * §2); there is no workout column and adding one is not this change's job. So "N photos attached"
   * cannot be read back from the session — it has to be measured as *what you added while you were
   * here*, which is the difference between today's photo count when this screen opened and now.
   *
   * Re-measured on focus rather than after the push resolves, because `/add-photo` is a route: it can
   * be left by its own Close, by the system back gesture or by adding a photo, and only one of those
   * ever comes back through a promise.
   *
   * ⚠ THE BASELINE IS A SET OF IDS NOW, NOT A COUNT, and that is two fixes rather than one. Sharing has
   * to send the actual photos, so their urls have to survive the read — a delta of two integers knows
   * how many appeared and nothing about which. It also makes the count itself honest: `now - base` goes
   * negative-clamped-to-zero if a photo is deleted from the archive in another tab, hiding a shot that
   * WAS added here. Identity cannot drift that way.
   */
  const [photoState, setPhotoState] = useState<{ baseIds: string[]; today: ChapterPhoto[] } | null>(null);
  /** Only what was added on this visit — the archive's older shots are not this session's to post. */
  const addedPhotos = photoState ? photoState.today.filter((p) => !photoState.baseIds.includes(p.id)) : [];
  const photos = addedPhotos.length;
  /* What Share sends. `is_video` decides the kind, because the archive takes both and a video posted as
     an image renders a dead grey frame. */
  const sharePhotos = addedPhotos.map((p) => ({ url: p.url, kind: p.isVideo ? ('video' as const) : ('image' as const) }));
  /* The line typed under a photo or video on `/add-photo` — "A line about it". It reached the archive and
     never the post: `sharePhotos` carried the URL and dropped the caption, so PO: *"I put a comment when I
     was creating the post after the workout and it's not showing the comment."* It is the post's body
     when no reflection was sealed; a sealed reflection still wins, being the more deliberate of the two. */
  const mediaCaption = addedPhotos.map((p) => p.caption?.trim() ?? '').find(Boolean) ?? '';
  /*
   * ══ STATS ON THE PHOTO, OR UNDER IT ══ (PO 2026-10-02) — offered once a photo was added here. The first
   * PHOTO (not a clip) is the one the numbers go on; any others post beside it as they always have. The
   * strip stays the default: a post looks the way it always has until the athlete picks the other.
   */
  const firstPhoto = addedPhotos.find((p) => !p.isVideo) ?? null;
  const [photoLook, setPhotoLook] = useState<PhotoLook>('strip');
  const { data: pictureBits } = useQuery(
    () => (firstPhoto ? postPictureBits(String(id), firstPhoto.url).catch(() => null) : Promise.resolve(null)),
    [id, firstPhoto?.url],
  );
  const { width: windowW } = useWindowDimensions();
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void fetchTodaysChapterPhotos().then(
        (p) => {
          // Functional update: the baseline is whatever the FIRST read saw, and must survive every later one.
          if (alive) setPhotoState((prev) => ({ baseIds: prev ? prev.baseIds : p.map((x) => x.id), today: p }));
        },
        () => {
          // A failed read just means the row keeps saying "Add photo or video" — never a wrong number.
        },
      );
      return () => {
        alive = false;
      };
    }, []),
  );
  /*
   * The playlist, as it stands after any edit made on this screen (§8A.2).
   *
   * `undefined` means "untouched — whatever the database said"; null means "the athlete removed it". The
   * distinction matters because `useQuery` refetches whenever the units preference changes, and a plain
   * `useState(data?.playlist)` seeded from a load would either be reset by that refetch or need an effect
   * to re-sync it. Deriving it during render instead is one expression and no effect, which is also what
   * this repo's react-compiler lint requires.
   */
  /**
   * ⚠ **THE ONE TIE BETWEEN TRAINING AND FOOD, AND IT LIVES ON `capture`, NEVER ON `seal`.** The seal is
   * the ceremony and it is finished the moment the hold completes; hanging an errand off it would ask
   * the athlete to go shopping inside a ritual. `capture` is explicitly the SECOND moment "after
   * closure" where the note, the photo and the playlist already live, and a meal is the same kind of
   * thing — optional, yours, and about the session you just finished.
   *
   * ⚠ Gated on `0206`: an athlete who cannot reach Nutrition is never shown a row that leads there.
   * ⚠ And never on a REVIEWED workout — "log what you ate" makes no sense while reading back a session
   *   from three weeks ago, and it would be ambiguous which day it meant.
   */
  const mayUseNutrition = useNutritionAccess();
  const showFoodRow = mayUseNutrition && !review;
  const { data: today } = useQuery(
    useCallback(() => (showFoodRow ? fetchDay(localToday()) : Promise.resolve(null)), [showFoodRow]),
    [showFoodRow],
  );
  const eatenToday = today ? totals(today.entries).kcal : 0;

  const [playlistEdit, setPlaylistEdit] = useState<WorkoutPlaylistLink | null | undefined>(undefined);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  /* Read on load rather than when the sheet opens: it is one small query, and a list that appears a
     beat after the sheet does is a list the athlete has already scrolled past. */
  const { data: recentPlaylists } = useQuery(() => fetchRecentPlaylists().catch(() => []), []);
  const playlist = playlistEdit !== undefined ? playlistEdit : (data?.playlist ?? null);
  const [sealed, setSealed] = useState(false);
  const [hold] = useState(() => new Animated.Value(0));
  const [holdPct, setHoldPct] = useState(0); // mirror of the hold value → "Keep holding…" + ink-flip past 55%
  const reduce = useReducedMotion();
  /* The capture stage arrives as ONE rise — opacity 0→1 with a 14px lift, 560ms, on the whole block.
     Deliberately not staggered per child: this is a second moment settling into place, not a list
     assembling itself. Instant under reduced motion, with the layout unchanged. */
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (stage !== 'capture') return;
    if (reduce) {
      rise.setValue(1);
      return;
    }
    rise.setValue(0);
    const a = Animated.timing(rise, { toValue: 1, duration: 560, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [stage, reduce, rise]);
  // First-run "Chapter comes alive" reveal (ONB-D18) — a restrained bronze fade/scale-in on workout #1.
  const [reveal] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!review && sealedBefore === false && data?.isFirstWorkout) Animated.timing(reveal, { toValue: 1, duration: 1100, useNativeDriver: true }).start();
  }, [review, sealedBefore, data?.isFirstWorkout, reveal]);
  useEffect(() => {
    const listenerId = hold.addListener(({ value }) => setHoldPct(value));
    return () => hold.removeListener(listenerId);
  }, [hold]);

  /* Finishing a workout lands in Legacy, where the session just went. Reviewing an old one returns to
     wherever it was opened from — Activity Detail, usually — because nothing has moved. */
  const goHome = () => {
    if (review) {
      if (router.canGoBack()) router.back();
      else router.replace('/activity-history');
      return;
    }
    /*
     * ⚠ CLOSE BACK TO THE TABS THAT ARE ALREADY THERE, THEN GO TO LEGACY (PO 2026-09-29: a tester tapped
     * "See your Legacy" and the app froze). `replace` swapped this full-screen modal for a SECOND `(tabs)`
     * navigator — a native modal-to-card swap — while Legacy's focus fires the rank/honor checks whose
     * ceremony is its own `Modal`, presented mid-transition. Dismissing unwinds the modal instead, the way
     * every other full-screen modal here leaves. `replace` stays only for a cold start with nothing under it.
     */
    // ⚠ Hold every ceremony and toast until the close has finished (PO 10-01: the same tester froze twice
    // on "Post and see your Legacy", which toasts AND leaves). See `holdOverlays` in hooks/useCeremony.
    holdOverlays(OVERLAY_HOLD_MS);
    if (router.canDismiss()) {
      router.dismissAll();
      router.navigate('/(tabs)/legacy');
      return;
    }
    router.replace('/(tabs)/legacy');
  };


  /*
   * What this session is CALLED right now — the edit if there is one, otherwise what loaded.
   * Everything below renders this rather than `data.workoutName`, so a rename shows immediately
   * instead of waiting for a refetch that may never come.
   */
  const sessionName = (nameEdit !== undefined ? nameEdit : (data?.workoutName ?? null))?.trim() || null;
  /* A cleared name shows the same word the data layer already falls back to, so this screen and
     Activity Detail never disagree about what an unnamed session is called. */
  const shownName = sessionName ?? 'Workout';

  /** Opens the naming sheet, prefilled with what the session was called. */
  /* ⚠ BOTH PRIME FIRST, SYNCHRONOUSLY. Each opens a `BottomSheet`, which is a bare `<Modal>` — its field
     does not exist at the moment of the tap, so `autoFocus` fires one commit later, outside the gesture,
     and iOS Safari focuses the field without raising a keyboard. See `KeyboardPrimer`.
     After the early return, so a tap that opens nothing does not put a keyboard up over the screen. */
  const openTemplateName = () => {
    if (!data || savingTemplate || savedTemplate) return;
    primeKeyboard();
    setTemplateName(sessionName ?? '');
    setNameOpen(true);
  };

  const openRename = () => {
    if (!data || savingName) return;
    primeKeyboard();
    setRenameDraft(sessionName ?? '');
    setRenameOpen(true);
  };

  /**
   * Name the session, or clear its name.
   *
   * ══ WHY THIS IS OFFERED AT THE FINISH ══
   *
   * The name is decided at the START today — a program hands over its slot name, and a free workout
   * gets the literal "Freestyle Workout" — and the athlete has never been able to touch it. But at the
   * start you do not yet know what the session was. "Freestyle Workout" is what the app calls a day
   * you have not done yet; "Heavy pull, felt strong" is what you call it afterwards.
   *
   * Blank is allowed and means something: it writes NULL, and Activity History then shows the activity
   * type per W-18 §5.2 rather than an empty row.
   */
  const commitRename = async () => {
    if (!data || savingName) return;
    setSavingName(true);
    try {
      const saved = await renameWorkout(data.workoutId, renameDraft);
      setNameEdit(saved);
      setRenameOpen(false);
      showToast(saved ? `Named “${saved}”.` : 'Name cleared.');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  const keepAsTemplate = async () => {
    if (!data || savingTemplate || savedTemplate) return;
    setSavingTemplate(true);
    try {
      // Blank falls back to the database's own default (the session's name) rather than saving an
      // empty title — the sheet allows clearing the field, and that shouldn't produce a nameless row.
      const id = await saveWorkoutAsTemplate(data.workoutId, templateName.trim() || undefined);
      if (id) {
        setSavedTemplate(true);
        setNameOpen(false);
        showToast(`Saved “${templateName.trim() || shownName}” to your templates.`);
      } else {
        // Nothing was logged, so there is no shape to keep — say that rather than claiming a success.
        setNameOpen(false);
        showToast('Nothing to save from this one.');
      }
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSavingTemplate(false);
    }
  };

  /**
   * ⚠ THIS SHEET MUST RENDER IN THE SAME BRANCH AS THE BUTTON THAT OPENS IT.
   *
   * That is not a style note — it is the bug this variable exists to fix. This screen is four early
   * returns (`seal` / `record` / `reflect` / `share`), and the sheet was written once at the bottom of
   * the file, inside the LAST of them. "Save this day as a template" lives on the Record step, which
   * returns long before that line is reached — so the button set `nameOpen` to true and absolutely
   * nothing appeared. The feature, the data layer, the RPC and the table were all correct and had been
   * for weeks; the sheet was simply never mounted when it was asked for.
   *
   * Held in a variable so both branches render the identical sheet rather than a copy that drifts.
   */
  const templateNameSheet = (
    // Name it here, while you still remember what it was. Prefilled with the session's own name so
    // keeping that is one tap, and changing it is the same one tap it would have been later.
    <BottomSheet open={nameOpen} onClose={() => setNameOpen(false)} title="Name this template">
      <TextInput
        value={templateName}
        onChangeText={setTemplateName}
        placeholder="e.g. Push Day A"
        placeholderTextColor={flColor.gray600}
        style={styles.nameInput}
        accessibilityLabel="Template name"
        maxLength={60}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={() => void keepAsTemplate()}
      />
      <Text style={styles.nameHint}>You&apos;ll find it under Workouts → Templates.</Text>
      <View style={styles.nameActions}>
        <View style={styles.nameAction}>
          <Button variant="secondary" fullWidth onPress={() => setNameOpen(false)} accessibilityLabel="Cancel">
            Cancel
          </Button>
        </View>
        <View style={styles.nameAction}>
          <Button variant="primary" fullWidth onPress={() => void keepAsTemplate()} accessibilityLabel="Save template">
            {savingTemplate ? 'Saving…' : 'Save Template'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );

  /* Held in a variable and rendered alongside `templateNameSheet` for the reason written above it: on a
     screen of four early returns, a sheet declared once at the bottom is mounted in only one of them. */
  const renameSheet = (
    <BottomSheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Name this workout">
      <TextInput
        value={renameDraft}
        onChangeText={setRenameDraft}
        placeholder="e.g. Heavy pull"
        placeholderTextColor={flColor.gray600}
        style={styles.nameInput}
        accessibilityLabel="Workout name"
        maxLength={WORKOUT_NAME_MAX}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={() => void commitRename()}
      />
      <Text style={styles.nameHint}>This is how the session appears in your history. Leave it empty to drop the name.</Text>
      <View style={styles.nameActions}>
        <View style={styles.nameAction}>
          <Button variant="secondary" fullWidth onPress={() => setRenameOpen(false)} accessibilityLabel="Cancel">
            Cancel
          </Button>
        </View>
        <View style={styles.nameAction}>
          <Button variant="primary" fullWidth onPress={() => void commitRename()} accessibilityLabel="Save name">
            {savingName ? 'Saving…' : 'Save Name'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );

  const startHold = () => {
    Animated.timing(hold, { toValue: 1, duration: 900, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        setSealed(true);
        if (data) void markSessionSealed(data.workoutId);
        const nav = typeof navigator !== 'undefined' ? (navigator as { vibrate?: (p: number[]) => void }) : null;
        nav?.vibrate?.([10, 28, 45]); // haptics (web only; no-ops on native)
        /*
         * ⚠ THE SEAL NO LONGER LEAVES. It used to `goHome()` — the ceremony ended and the athlete was
         * put on the Legacy tab, which is why the note, the photo and the playlist all had to be
         * offered BEFORE the seal, in front of the moment instead of after it.
         *
         * 850ms is the stamp ring finishing (700ms) plus a beat to read "Sealed". Instant under
         * reduced motion, where there is no stamp to wait for.
         */
        if (reduce) setStage('capture');
        else setTimeout(() => setStage('capture'), 850);
      }
    });
  };
  const cancelHold = () => {
    if (sealed) return;
    hold.stopAnimation();
    Animated.timing(hold, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  /*
   * ⚠ THE NOTE IS OPTIONAL. LOSING ONE THE ATHLETE WROTE IS NOT.
   *
   * This used to `catch {}` and then `goHome()` unconditionally — so a reflection typed on a bad
   * connection was discarded, the screen went to Legacy, and the athlete had every reason to believe it
   * was kept. This is the one surface whose own copy promises they will read it again someday.
   *
   * On failure we now STAY — the sheet does not close and the text stays in the field. The workout
   * itself is already committed, so staying costs nothing and is the only way the words survive long
   * enough to retry. Dismissing with an apology would be honest and still lose the note.
   */
  const onSealNote = async () => {
    if (!data || savingNote) return;
    const text = note.trim();
    if (!text) {
      setSheet(null);
      return;
    }
    setSavingNote(true);
    try {
      await saveReflection(data.workoutId, text);
      setReflectionEdit(text);
      setSheet(null);
      showToast('Sealed with this session.');
    } catch (e) {
      showToast(errorMessage(e) || 'Couldn’t save your note — your workout is saved. Try again.');
    } finally {
      setSavingNote(false);
    }
  };
  /* The sheet seeds its field from what is already stored, so re-opening a sealed note shows it back
     rather than an empty box that looks like the note was lost. */
  const openNote = () => {
    /* The two notes know about each other (QA 09-26 workout-28): with no reflection sealed yet, the sheet starts
       from the training note already written under "How did it go?", so nothing is typed twice. Sealing writes
       the reflection only — the training note stays exactly as it was. */
    setNote(reflection || sessNote.trim());
    setSheet('note');
  };
  /*
   * §8A.2: the link "saves immediately on 'Save Playlist' confirmation, independent of 'Done'." There is
   * no save state on W-17 and no Save button — additions here persist the moment they are confirmed,
   * exactly as notes do (§9.2).
   *
   * The optimistic write is reverted on failure rather than left standing. A chip that survives the
   * failure of the write behind it is the worst outcome available: the athlete stops thinking about it,
   * and the link is quietly gone by the time they look at W-19.
   */
  const onSavePlaylist = (link: WorkoutPlaylistLink | null) => {
    if (!data || savingPlaylist) return;
    const previous = playlist;
    setPlaylistEdit(link);
    setSheet(null);
    setSavingPlaylist(true);
    savePlaylist(data.workoutId, link).then(
      () => {
        setSavingPlaylist(false);
        showToast(link ? 'Playlist saved to this session.' : 'Playlist removed.');
      },
      (e: unknown) => {
        setSavingPlaylist(false);
        setPlaylistEdit(previous);
        showToast(errorMessage(e));
      },
    );
  };
  /* ⚠ `onOpenPlaylist` WENT WITH THE CHIP. The capture row is an attach/edit control — one tap, one
     sheet — so there is no "Open ›" here any more. Following the link is still offered where it belongs,
     on Activity Detail, which is the screen you go to when you want to look at a session rather than
     finish one. */

  if (loading || !data || sealedBefore == null) {
    return (
      <Shell>
        {error ? <NotFoundBody title="Couldn’t load your summary." reason={error} /> : <View style={styles.center}><ActivityIndicator color={flColor.bronze400} /></View>}
      </Shell>
    );
  }

  /*
   * ── THE CAPTURE STAGE'S THREE SHEETS — note, playlist, and the squad picker ──
   *
   * Declared here, below the loading guard, so they can read `data` without threading `?.` through every
   * line of a card that is only ever drawn once the session has loaded. They are mounted in the capture
   * branch and nowhere else, which is the rule `__tests__/overlay-branch.test.mjs` exists to hold.
   */

  const noteSheet = (
    <BottomSheet open={sheet === 'note'} onClose={() => setSheet(null)} title="A note for future you">
      <View style={styles.noteSheet}>
        {/* Said here because it is true: a sealed note is the caption when this workout is shared. */}
        <Text style={styles.noteHelper}>One line. You&apos;ll read it again someday — and it goes with the workout if you share it.</Text>
        {/* SMART OMISSION: no past note, no block — never an empty state explaining what a memory would be.
            The label is the data layer's, because only it knows whether this was a year ago or last time. */}
        {data.pastReflection ? (
          <View style={styles.pastRef}>
            <Text style={styles.pastRefLabel}>{data.pastReflection.label}</Text>
            <Text style={styles.pastRefText}>“{data.pastReflection.text}”</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.noteInput}
          placeholder="Today I…"
          placeholderTextColor={flColor.gray600}
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
          accessibilityLabel="Your reflection"
        />
        <Button variant="primary" fullWidth onPress={() => void onSealNote()} accessibilityLabel="Seal the note">
          {savingNote ? 'Sealing…' : 'Seal the Note'}
        </Button>
      </View>
    </BottomSheet>
  );

  /*
   * ⚠ THE ATTACH SHEET, NOT A LIST OF PLAYLISTS — and that is a product fact, not a shortcut.
   *
   * The handoff draws this as rows you pick from, which presumes a library the app can read.
   * Workout-Playlist-Amendment-001 §7/§8A.1 rules that out in as many words: V1 stores a link and a
   * service tag, "no OAuth, no SDK, no metadata fetch, no cover art". There is nothing to list. What the
   * handoff is actually insisting on — *this is a manual picker, there is no auto-detection of what was
   * playing* — is exactly what this sheet already is, and §8.5 requires both attach points to open this
   * same one rather than a second copy.
   *
   * Mounted conditionally because its draft fields seed from `initial` in a `useState` initialiser.
   */
  const playlistSheet =
    sheet === 'playlist' ? (
      <PlaylistSheet
        initial={playlist}
        /* What they trained to before, one tap each. The nearest thing to "detect what was playing"
           that this stack can honestly do — see `fetchRecentPlaylists`. */
        recent={recentPlaylists ?? []}
        onClose={() => setSheet(null)}
        onSave={onSavePlaylist}
        saving={savingPlaylist}
      />
    ) : null;

  /*
   * ══ WHAT A PRESS OF THE BUTTON POSTS — built from the session as it stands on THIS screen ══
   *
   * ⚠ `sessionName` AND `playlist`, NOT THE VALUES ON `data`. `data` is the completion as it was FETCHED.
   * Renaming the session or attaching a playlist writes to the database and updates this screen's own
   * derived state — it does not refetch — so a snapshot read off `data` is the session as it looked before
   * the athlete touched it (the reported regression: a playlist attached here never reached the post).
   */
  const postSummary = recapSummaryFrom({ ...data, workoutName: sessionName, playlist });
  const postPicture = pictureBits
    ? (showRoute: boolean) => composePostPicture(storyInputFrom({ ...data, workoutName: shownName }, pictureBits.extras, units), pictureBits.size, { showRoute })
    : null;
  /* The post's words: the sealed reflection, else the line typed under a photo on `/add-photo`. The note
     sheet says so — there is no second box on this screen to catch a sentence the athlete didn't mean. */
  const postBody = reflection || mediaCaption;
  /* Only a session that stored a shape may be asked about the map; only a day with food about the food. */
  const canShareRoute = postSummary.hasRoute === true;
  const foodTotals = showFoodRow && today ? totals(today.entries) : null;
  const foodText = foodLine(foodTotals);

  /* Where this session already is, and what the rows would add to that. */
  const postedState = shareState(shares ?? []);
  const unshared = (mySquads ?? []).filter((s) => !postedState.squadIds.includes(s.id));
  const chosenSquads = unshared.filter((s) => selection.squadIds.includes(s.id));
  const pendingTargets = destinationTargets(selection, memberIds ?? [], shares ?? []);
  const forgeSelected = pendingTargets.length > 0;

  const toggleFriends = () => {
    setPostError(null);
    setFriendsPick(!selection.friends);
  };
  const pickSquads = (next: ReadonlySet<string>) => {
    setPostError(null);
    setSquadPick(new Set(next));
  };

  /*
   * ══ THE ONE BUTTON — "SAVE & SHARE" OR "SAVE TO LEGACY" ══
   *
   * ⚠ THE WORKOUT IS ALREADY SAVED. `save_workout` committed before this screen drew, so nothing here
   * decides whether the session exists: "Save to Legacy" closes the record, and "Save & Share" posts to
   * the rows' destinations first. A post that fails leaves the athlete HERE, with what landed recorded and
   * the button ready to send only the rest — leaving would put them on Legacy believing it posted.
   *
   * ⚠ RE-READ, STRICTLY, BEFORE POSTING. The rows were drawn from a read that never throws (an unreadable
   * list reads as "nowhere yet"), and auto-post may have landed from another launch since. A failed strict
   * read fails the press; it never guesses, because guessing "nowhere" is how a session posts twice.
   *
   * The selection is frozen into the rows on the press, so a retry after a partial failure posts the same
   * choice rather than whatever the defaults would now say about a session that is posted somewhere.
   */
  const finish = async () => {
    if (posting) return;
    autoOnLeave.current = null;
    setAutoTried(true);
    void clearAutoPostPending();
    const sel = selection;
    setFriendsPick(sel.friends);
    setSquadPick(new Set(sel.squadIds));
    if (!forgeSelected) {
      goHome();
      return;
    }
    setPosting(true);
    setPostError(null);
    let prior: PriorShare[];
    try {
      prior = await fetchWorkoutSharesStrict(data.workoutId);
    } catch (e) {
      setPosting(false);
      setPostError(`${plainError(e, 'Couldn’t check where this is already posted.')} Your workout is saved — try again.`);
      return;
    }
    setShares(prior);
    const targets = destinationTargets(sel, memberIds ?? [], prior);
    if (!targets.length) {
      // Everything chosen already has it (posted from another launch) — nothing to add, nothing doubled.
      setPosting(false);
      goHome();
      return;
    }
    const r = await postWorkoutRecap({
      workoutId: data.workoutId,
      body: postBody,
      media: sharePhotos,
      summary: {
        ...postSummary,
        shareRoute: canShareRoute && shareRoute,
        food: shareFood && foodText && foodTotals ? { kcal: foodTotals.kcal, protein: foodTotals.protein } : null,
      },
      targets,
      squads: mySquads ?? [],
      photoOverlay: photoLook === 'overlay' && firstPhoto && postPicture ? { photoUri: firstPhoto.url, compose: postPicture } : null,
    });
    setShares([...prior, ...r.done]);
    setPosting(false);
    if (r.error) {
      const landed = r.landed.length || r.friends ? ` ${postedLine(r.landed, r.friends)}, but the rest didn’t post.` : '';
      setPostError(`${plainError(r.error, 'Couldn’t post your workout.')}${landed} Your workout is saved.`);
      return;
    }
    void saveLastDestinations({ friends: sel.friends, squadIds: sel.squadIds });
    showToast(r.pictureFailed ? `${postedLine(r.landed, r.friends)} — your stats went under the photo.` : postedLine(r.landed, r.friends));
    goHome();
  };

  /*
   * ══ SHARE TO SQUADS — the picker, so a squad count never adds height to the screen ══
   *
   * It edits the selection DIRECTLY — no draft — so closing it any way at all keeps what was ticked; Done
   * only says how many. Squads that already have this session are not offered (the same rule
   * `ShareSessionSheet` follows) and the hint says how many are left out.
   */
  const chosenIds = new Set(chosenSquads.map((s) => s.id));
  const squadSheet = (
    <BottomSheet
      open={sheet === 'squads'}
      onClose={() => setSheet(null)}
      title="Share to Squads"
      scroll
      footer={
        <Button variant="primary" fullWidth onPress={() => setSheet(null)} accessibilityLabel={`Done, ${chosenSquads.length} selected`}>
          {`Done (${chosenSquads.length})`}
        </Button>
      }
    >
      <Text style={styles.pickerSub}>Select which squads to share this workout to.</Text>
      <SquadSelectList
        squads={unshared}
        selected={chosenIds}
        onChange={pickSquads}
        disabled={posting}
        showCrest
        hint={
          postedState.squadIds.length
            ? postedState.squadIds.length === 1
              ? 'One squad already has it and isn’t listed.'
              : `${postedState.squadIds.length} squads already have it and aren’t listed.`
            : undefined
        }
      />
    </BottomSheet>
  );

  /*
   * ── Stage 1 · Seal ── UNTOUCHED BY THIS CHANGE EXCEPT IN TWO PLACES.
   *
   * Its only job is "you finished, it is sealed", and nothing may be added to it — so the corner share
   * chip is GONE (Share lives on the capture stage now, as the one filled button) and the hold's outcome
   * changed from "leave" to "become the capture stage". The hold interaction, the fill, the haptics, the
   * "Sealed" label swap and the stamp ring are all exactly as they were.
   *
   * Unreachable in review: a reviewed session opens on `capture` and there is no path back here, which
   * is why the `|| review` guards this branch used to carry are gone rather than left reading as live.
   */
  if (stage === 'seal') {
    const fillW = hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    /*
     * "Up next" comes from the program this workout actually belonged to, and from nowhere else.
     *
     * It used to fall back to the SHIPPED DEMO PROGRAM: look the finished workout's name up in that
     * catalog and, on a match, announce its next session. A freestyle workout has no next session — that
     * is what freestyle means — and an athlete who had never opened that program would be told what they
     * were doing on Thursday. The fallback also fired when the real lookup THREW, so a transient failure
     * did not degrade to silence, it degraded to fiction.
     *
     * Null now means null: no program, no line.
     */
    const nextName = data.nextWorkoutName;

    // First-run reveal (ONB-D18): the chapter comes alive on workout #1. Arrival, not achievement — no
    // reward/rank/honor/streak language (honest against D22; leaves the First-Honor check for ONB-D19).
    if (data.isFirstWorkout && !review) {
      const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
      return (
        <Shell>
          <View style={styles.center}>
            <Text style={styles.firstEyebrow}>Your Chapter begins</Text>
            <Animated.View style={{ opacity: reveal, transform: [{ scale }] }}>
              <SealMedallion size={132} sealed={sealed} />
            </Animated.View>
            <Animated.Text style={[styles.revealChapter, { opacity: reveal, transform: [{ scale }] }]}>
              {data.chapterName ?? 'Your Chapter'}
            </Animated.Text>
            <Animated.Text style={[styles.revealLine, { opacity: reveal }]}>The first page is written.</Animated.Text>
            <View style={styles.sealStats}>
              <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
              <View style={styles.statDivider} />
              <Stat n={vol(data.volume)} label="Volume" />
            </View>
            {data.hero ? <Hero hero={data.hero} /> : null}
            <Pressable style={[styles.holdBtn, noCallout]} onPressIn={startHold} onPressOut={cancelHold} accessibilityRole="button" accessibilityLabel="Press and hold to seal">
              <AnimatedGradient
              colors={flGradient.bronzeMetallic.colors}
              locations={flGradient.bronzeMetallic.locations}
              start={flGradient.bronzeMetallic.start}
              end={flGradient.bronzeMetallic.end}
              style={[styles.holdFill, { width: fillW }]}
            />
              <Text selectable={false} style={[styles.holdText, (sealed || holdPct > 0.55) && styles.holdTextDark]}>{sealed ? 'Sealed' : holdPct > 0 ? 'Keep holding…' : 'Hold to Seal'}</Text>
            </Pressable>
            <Pressable onPress={openRecord} accessibilityRole="button" accessibilityLabel="View workout details" style={styles.textLink}>
              <Text style={styles.textLinkText}>View details</Text>
            </Pressable>
          </View>
        </Shell>
      );
    }

    return (
      <Shell>
        <View style={styles.center}>
          {data.chapterName ? <Text style={styles.eyebrow}>{data.chapterName}</Text> : null}
          {/* ⚠ 116, NOT 132 (design review 2026-09-04). *"The emblem is beautiful, but it occupies a
              lot of visual real estate for something that isn't actionable."* Correct — it was the
              largest thing on a screen whose actual subject is the session and its two numbers, and
              shrinking it is what lets everything below move up into one composition. The FIRST-RUN
              branch above keeps 132 on purpose: that screen has no stats, no milestone and no quote,
              so the medallion is genuinely the subject there rather than the ornament. */}
          <SealMedallion size={116} sealed={sealed} />
          {/*
            ══ ONE IDENTITY BLOCK, NOT THREE SIBLINGS ══

            *"The current spacing makes SESSION COMPLETE feel almost like a separate section heading…
            I'd make the relationship more like SESSION COMPLETE / Less / Sep 4 — one cohesive identity
            block."*

            ⚠ THE GAP WAS NEVER IN THESE STYLES, WHICH IS WHY TUNING THEIR MARGINS WOULD NOT HAVE FIXED
            IT. `styles.center` sets `gap: 12`, so every direct child paid 12pt on top of whatever
            margin it carried — the status line, the title and the date were three separate rows of a
            centred stack that happened to be adjacent. Wrapping them makes them ONE child: the
            container's gap applies once, to the group, and the three lines inside it are spaced by
            their own much tighter rule.

            Name the destination. "Session Sealed" tells the athlete something happened but not where
            it went — and the chapter card is the only place it lands, so say so.
          */}
          <View style={styles.identity}>
            <Text style={[styles.sealStatus, sealed && styles.sealStatusSealed]}>
              {sealed ? (data.chapterName ? `Sealed to ${data.chapterName}` : 'Session Sealed') : 'Session Complete'}
            </Text>
            <Text style={styles.sealTitle}>{shownName}</Text>
            {data.dateLabel ? <Text style={styles.sealSubtitle}>{data.dateLabel}</Text> : null}
          </View>
          {/* ⚠ THE TWO NUMBERS ARE THE POINT OF THE SCREEN. *"Those are arguably the most useful
              pieces of information on this entire screen, yet visually they're subordinate to the
              emblem and the decorative elements."* They now outrank everything except the session
              name — see `statN`. */}
          <View style={styles.sealStats}>
            <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
            <View style={styles.statDivider} />
            <Stat n={vol(data.volume)} label="Volume" />
          </View>
          {data.hero ? <Hero hero={data.hero} /> : null}
          {!data.hero || !data.hero.featured ? (
            <View style={styles.quoteRow}>
              <LinearGradient colors={[flColor.bronze400, forgeOr<string>('rgba(0,0,0,0)', 'rgba(164,122,61,0)')]} style={styles.quoteRule} />
              <Text style={styles.quote}>{data.firstSessionBack ? WELCOME_BACK_COPY.firstSessionBack : quoteFor(data.workoutId)}</Text>
            </View>
          ) : null}

          <View style={styles.sealBottom}>
            {/* ══ WEEK COMPLETE (M4-A1-D2) ══
                A program under four weeks just reached its last session. It gets NO ceremony — no M-4, no
                queue entry, no new CeremonyKind — because the ladder does not count it and a modal that
                celebrates something the product itself does not credit is the product overstating.

                It gets this instead: one line, in place of "Up next", which is exactly the slot the fact
                belongs in — there IS no up next, and saying nothing would let a plan the athlete built
                and finished simply stop. It claims nothing about rank or honors (M4-A1-D3). */}
            {completion ? (
              <View style={styles.upNext}>
                <View style={styles.upNextDiamond} />
                <Text style={styles.upNextText}>Week complete · {completion.programName}</Text>
              </View>
            ) : nextName ? (
              <View style={styles.upNext}>
                <View style={styles.upNextDiamond} />
                <Text style={styles.upNextText}>Up next · {nextName}</Text>
              </View>
            ) : null}
            {/* REVIEW NEVER REACHES THIS. The ritual already happened, and the hold writes nothing —
                offering it again would be theatre over a settled fact, so a reviewed session opens on
                the capture stage instead of on a ceremony with its ceremony taken out. */}
            <Pressable
              style={[styles.holdBtn, styles.holdBtnInSection, noCallout]}
              onPressIn={startHold}
              onPressOut={cancelHold}
              accessibilityRole="button"
              accessibilityLabel="Press and hold to seal"
            >
              <AnimatedGradient
                colors={flGradient.bronzeMetallic.colors}
                locations={flGradient.bronzeMetallic.locations}
                start={flGradient.bronzeMetallic.start}
                end={flGradient.bronzeMetallic.end}
                style={[styles.holdFill, { width: fillW }]}
              />
              <Text selectable={false} style={[styles.holdText, (sealed || holdPct > 0.55) && styles.holdTextDark]}>{sealed ? 'Sealed' : holdPct > 0 ? 'Keep holding…' : 'Hold to Seal'}</Text>
            </Pressable>
            <Pressable onPress={openRecord} accessibilityRole="button" accessibilityLabel="View workout details" style={styles.textLink}>
              <Text style={styles.textLinkText}>View details</Text>
            </Pressable>
          </View>
        </View>
      </Shell>
    );
  }

  /*
   * ── Stage 2 · Capture — a second, distinct moment that happens AFTER closure ──
   *
   * REDESIGNED 2026-10-02 (PO mockup) to read as five things, in order: the workout is complete · the one
   * accomplishment, if there is one · add to the record · decide where it appears · finish. The record
   * offers became four equal tiles and the destinations became rows ON the screen (Friends toggles,
   * Squads opens a picker, outside Forge opens the picture), so neither grows with a squad count.
   *
   * Nothing here is required and nothing is "skipped". Nothing here can lose the workout either — it was
   * committed before this screen drew, which is why there is no "Leave without …" exit any more: every way
   * out is safe, and the button's label only says whether it posts on the way.
   */
  if (stage === 'capture') {
    /* What this session's posts add up to — named, for the line under the share rows. */
    const postedWhere = postedFor(postedState, mySquads ?? []);
    /* A squad post has a page; a friends-only post lives in the friends feed. */
    const viewPost = async () => {
      const id = await fetchWorkoutPostId(data.workoutId);
      if (id) router.push({ pathname: '/squad-post/[id]', params: { id } });
      else router.push('/friends');
    };
    const noteFilled = reflection.length > 0;
    const playlistName = playlist ? playlistLabel(playlist) : '';
    const riseY = rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

    /* The second number: volume when iron moved, else the distance a run or a row covered, else nothing —
       never a "0 lb" on a session that moved none. */
    const distanceMi = data.exercises.reduce((n, ex) => n + (ex.cardio?.distanceMi ?? 0), 0);
    const second =
      data.volume > 0
        ? { icon: 'barbell' as const, n: `${vol(data.volume)} ${volUnit}`, label: 'Total Volume' }
        : distanceMi > 0
          ? { icon: 'route' as const, n: `${toDistance(distanceMi, units).toFixed(2)} ${distanceLabel(units)}`, label: 'Distance' }
          : null;

    /*
     * ══ ONE ACCOMPLISHMENT, AND ONLY A REAL ONE ══
     *
     * Every source here is derived by the data layer from the database — a PR or honor this session set, a
     * chapter milestone, a program finished or a week of one completed. "Consistency · Another one down" is
     * deliberately NOT surfaced: it is true of every workout, which is the definition of manufactured.
     */
    const moment: { glyph: EngravedName; title: string; sub: string } | null = graduation
      ? { glyph: 'medal', title: 'Program complete', sub: graduation.programName }
      : data.hero && data.hero.kind !== 'consistency'
        ? {
            glyph: MOMENT_GLYPHS[data.hero.kind],
            title: data.hero.featured ? data.hero.eyebrow : data.hero.title,
            sub: data.hero.featured ? data.hero.title : [data.hero.eyebrow, data.hero.note].filter(Boolean).join(' · '),
          }
        : completion
          ? { glyph: 'milestone', title: 'Week complete', sub: completion.programName }
          : null;

    /* The Squads row says how many, and which — never one row per squad, whatever the count. */
    const squadRow: { title: string; sub: string; disabled: boolean } = !mySquads
      ? { title: 'Squads', sub: squadsError ? 'Couldn’t load your Squads' : 'Loading your Squads…', disabled: true }
      : mySquads.length === 0
        ? { title: 'No Squads yet', sub: 'Join a Squad to share here', disabled: true }
        : unshared.length === 0
          ? { title: postedState.squadIds.length === 1 ? 'Posted to your Squad' : 'Posted to your Squads', sub: squadList(mySquads.filter((s) => postedState.squadIds.includes(s.id)).map((s) => s.name)), disabled: true }
          : {
              title: chosenSquads.length === 0 ? 'No Squads selected' : `${chosenSquads.length} ${chosenSquads.length === 1 ? 'Squad' : 'Squads'} selected`,
              sub: chosenSquads.length
                ? chosenSquads.map((s) => s.name).join(', ')
                : postedState.squadIds.length
                  ? `Already posted to ${squadList(mySquads.filter((s) => postedState.squadIds.includes(s.id)).map((s) => s.name))}`
                  : 'Choose which Squads see it',
              disabled: posting,
            };

    const ctaLabel = forgeSelected ? 'SAVE & SHARE' : review ? 'DONE' : 'SAVE TO LEGACY';

    /* The picture, not a screenshot — `/share-story` draws the branded card in its templates and hands it
       to the phone's own share sheet, which lists only the apps that are actually installed. */
    const shareOutside = () => {
      const photo = sharePhotos.find((m) => m.kind === 'image')?.url;
      router.push({ pathname: '/share-story', params: photo ? { workoutId: data.workoutId, photo } : { workoutId: data.workoutId } });
    };

    return (
      <Shell>
        <ScrollView
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.capScroll, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.capBlock, { opacity: rise, transform: [{ translateY: riseY }] }]}>
            {/* ── 1 · the completion moment ── No ember glow and no pulse: the glow belongs to the ceremony. */}
            <CaptureSeal size={56} />
            <Text style={styles.capName} numberOfLines={2} accessibilityRole="header">
              {shownName}
            </Text>
            <Text style={styles.capEyebrow}>{review && data.dateLabel ? `Workout complete · ${data.dateLabel}` : 'Workout complete'}</Text>
            <View style={styles.capStats}>
              <CapStat icon="clock" n={fmtDuration(data.durationSec)} label="Duration" />
              {second ? (
                <>
                  <View style={styles.capStatDiv} />
                  <CapStat icon={second.icon} n={second.n} label={second.label} />
                </>
              ) : null}
            </View>

            {/* ── 2 · the accomplishment, when there is one ── */}
            {moment ? (
              <Pressable
                onPress={openRecord}
                accessibilityRole="button"
                accessibilityLabel={`${moment.title}. ${moment.sub}. View workout details`}
                style={({ pressed }) => [styles.moment, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name={moment.glyph} size={24} color={flColor.bronze300} />
                <View style={styles.momentText}>
                  <Text style={styles.momentTitle} numberOfLines={1}>
                    {moment.title}
                  </Text>
                  <Text style={styles.momentSub} numberOfLines={1}>
                    {moment.sub}
                  </Text>
                </View>
                <EngravedIcon name="chevron-right" size={15} color={flColor.gray600} />
              </Pressable>
            ) : null}

            {/* ── 3 · add to the record ── four offers, never a checklist: an attached one reads as attached. */}
            <View style={styles.capSection}>
              <SectionHead title="Add to your record" sub="Add something worth remembering." />
              <View style={styles.tiles}>
                <RecordTile icon="edit" label="Note" done={noteFilled} a11y={noteFilled ? `Note added: ${reflection}` : 'Add a note'} onPress={openNote} />
                <RecordTile
                  icon="camera"
                  label={photos > 1 ? `${photos} Photos` : 'Photo'}
                  done={photos > 0}
                  a11y={photos > 0 ? `${photos} ${photos === 1 ? 'photo' : 'photos'} attached` : 'Add a photo or video'}
                  /*
                   * ROUTES TO THE ARCHIVE'S ONE DOOR rather than opening a bare picker. `/add-photo` is where
                   * the 75-photo / 5-video cap is enforced (M-7's pre-action check) and where a photo gets its
                   * date, its label and its caption.
                   */
                  onPress={() => router.push('/add-photo')}
                />
                <RecordTile icon="music" label="Playlist" done={!!playlist} a11y={playlist ? `Playlist: ${playlistName}` : 'Add a playlist'} onPress={() => setSheet('playlist')} />
                {/* Gated on Nutrition access, and never on a reviewed session — "log what you ate" would be ambiguous about which day. */}
                {showFoodRow ? (
                  <RecordTile
                    icon="bowl"
                    label="Meal"
                    done={eatenToday > 0}
                    a11y={eatenToday > 0 ? `${thousands(eatenToday)} calories logged today` : 'Log what you ate'}
                    /* Outside the Nutrition tab, so it asks for the Nutrition consent itself (MHMDA). */
                    onPress={() => void consentForRoute('/log-food').then((ok) => ok && router.push('/log-food'))}
                  />
                ) : null}
              </View>
            </View>

            {/* ── 4 · where it appears ── POST inside Forge (Friends, Squads); SHARE leaves it. */}
            <View style={styles.capSection}>
              <SectionHead title="Share this workout" sub="Choose where it appears." aside="Optional" />
              <View style={styles.shareRows}>
                <ShareRow
                  icon="partners"
                  title="Friends"
                  sub={postedState.friends ? 'Posted' : null}
                  mode="toggle"
                  selected={postedState.friends || selection.friends}
                  disabled={postedState.friends || posting}
                  onPress={toggleFriends}
                />
                <ShareRow icon="people" title={squadRow.title} sub={squadRow.sub} mode="open" disabled={squadRow.disabled} onPress={() => setSheet('squads')} />
                <ShareRow icon="share" title="Share outside Forge" sub="Instagram, Stories, Messages + More" mode="open" onPress={shareOutside} />
              </View>

              {/* Per-post ticks, asked only when there is something to ask and somewhere in Forge to post it. */}
              {forgeSelected && canShareRoute ? (
                <PostTick
                  on={shareRoute}
                  onPress={() => setShareRoute((v) => !v)}
                  disabled={posting}
                  label="Include the map"
                  sub="Shows where you went, start and finish included."
                  a11y="Include the map of your route on this post"
                />
              ) : null}
              {forgeSelected && foodText ? (
                <PostTick on={shareFood} onPress={() => setShareFood((v) => !v)} disabled={posting} label="Post what I ate?" sub={foodText} a11y="Include what you ate today on this post" />
              ) : null}
              {/* Stats ON the photo or under it (PO 10-02) — a choice about the Forge post, so it appears with one. */}
              {forgeSelected && firstPhoto ? (
                <View style={styles.photoLook}>
                  <PhotoLookChoice
                    value={photoLook}
                    onChange={setPhotoLook}
                    overlay={postPicture ? postPicture(false) : null}
                    photoUrl={firstPhoto.url}
                    stats={workoutStats(postSummary, units, rowUnit)}
                    width={Math.min(360, windowW - 40)}
                  />
                </View>
              ) : null}

              {/* Where it already is — the durable answer to "did that post?", so nobody posts it twice. */}
              {postedWhere ? (
                <View style={styles.postedLine} accessibilityRole="text">
                  <EngravedIcon name="check" size={14} color={flColor.bronze300} />
                  <Text style={styles.postedText} numberOfLines={2}>
                    {postedWhere}
                  </Text>
                  <Pressable onPress={() => void viewPost()} accessibilityRole="button" accessibilityLabel="View post" hitSlop={10}>
                    <Text style={styles.postedLink}>View post</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* ── 5 · finish ── The workout is already saved; this button only decides whether it is also posted. */}
            <View style={styles.capCta}>
              <Button
                variant="primary"
                fullWidth
                icon={<ForgeMarkGlyph size={20} color={flColor.onBronze} />}
                /* Not mid-save: a post built while the note or playlist is still writing is the session without it. */
                disabled={posting || savingNote || savingPlaylist || savingName}
                onPress={() => void finish()}
                accessibilityLabel={forgeSelected ? 'Save and share' : review ? 'Done' : 'Save to Legacy'}
              >
                {posting ? 'POSTING…' : ctaLabel}
              </Button>
              {postError ? (
                <Text style={styles.postError} accessibilityRole="alert">
                  {postError}
                </Text>
              ) : null}
              <Pressable onPress={openRecord} accessibilityRole="button" accessibilityLabel="View workout details" style={styles.detailsLink} hitSlop={6}>
                <Text style={styles.detailsText}>View workout details</Text>
                <EngravedIcon name="chevron-right" size={14} color={flColor.gray400} />
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>

        {noteSheet}
        {playlistSheet}
        {squadSheet}
        {/* The phone draws the stats-on-the-photo picture here when the post is sent (`renderStoryImage`). */}
        <StoryCardHost />
      </Shell>
    );
  }

  /*
   * ── The Record — "See the details" / "See workout details" ──
   *
   * No longer a step in a forced sequence: it is an optional detour off either stage, it auto-advances
   * to nothing, and both its back arrow and its bottom button return to whichever stage opened it.
   */
  if (stage === 'record') {
    const volUp = data.volumeDelta != null && data.volumeDelta > 0;
    return (
      <Shell>
        <SafeTop />
        <View style={styles.recHeader}>
          <Pressable onPress={() => setStage(from)} accessibilityRole="button" accessibilityLabel="Back" style={styles.recBack}>
            <EngravedIcon name="chevron-left" size={22} color={flColor.gray400} />
          </Pressable>
          <EngravedIcon name="book" size={20} />
          <Text style={styles.recHeaderTitle}>The Record</Text>
        </View>
        <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets contentContainerStyle={styles.recScroll} showsVerticalScrollIndicator={false}>
          {/* NAME IT HERE, WHERE YOU ALREADY KNOW WHAT IT WAS. The eyebrow has always shown the
              session's name; it was simply not a control, and nothing anywhere else was either — the
              app could name a workout and the athlete could not. Tapping opens the same sheet the
              ⋯ Options menu uses mid-session, so there is one way to do this and one place it lives. */}
          <Pressable
            onPress={openRename}
            accessibilityRole="button"
            accessibilityLabel={`Rename this workout. Currently ${shownName}`}
            style={styles.recEyebrowRow}
            hitSlop={8}
          >
            <Text style={styles.recEyebrow}>
              {shownName}
              {data.dateLabel ? ` · Sealed ${data.dateLabel}` : ''}
            </Text>
            <EngravedIcon name="edit" size={13} />
          </Pressable>

          <View style={styles.recEvidence}>
            <View style={styles.recEvidenceLeft}>
              <Text style={styles.recVolume}>{vol(data.volume)}</Text>
              <Text style={styles.recVolumeLabel}>
                Total volume
                {data.volumeDelta != null ? (
                  <Text>
                    {' · '}
                    <Text style={volUp ? styles.deltaUp : styles.deltaFlat}>
                      {volUp ? '+' : ''}
                      {vol(data.volumeDelta)}
                    </Text>
                    {' vs last'}
                  </Text>
                ) : (
                  <Text>{` · ${volUnit}`}</Text>
                )}
              </Text>
            </View>
            <View style={styles.recEvidenceRight}>
              <Text style={styles.recDuration}>{fmtDuration(data.durationSec)}</Text>
              <Text style={styles.recDurationLabel}>Under Iron</Text>
            </View>
          </View>

          {volUp ? (
            <View style={styles.tangible}>
              <View style={styles.tangibleDiamond} />
              <Text style={styles.tangibleText}>Your heaviest {shownName} in a while</Text>
            </View>
          ) : null}

          {/* WHAT THIS RUN BEAT — computed against the athlete's own prior sessions, never asserted.
              The retired Active Run screen owned this and it was the last thing it had that nothing
              else did. Absent for a strength session, and absent for a first-ever run: there is no
              best to beat yet, and "your longest ever" on a first walk is a hollow thing to be told. */}
          {data.runBests.length ? (
            <View style={styles.bestsBlock}>
              {data.runBests.map((b) => (
                <View key={b.label} style={styles.bestRow}>
                  <View style={styles.bestMark} />
                  <View style={styles.bestText}>
                    <Text style={styles.bestLabel}>{b.label}</Text>
                    <Text style={styles.bestDetail}>{b.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.recHeading}>How You Improved</Text>
          <View style={styles.recTable}>
            {data.exercises.map((ex) =>
              /* A run gets the whole row. "1 set · top —" is true of it and says nothing; the distance,
                 the clock, the pace, the grade and WHERE it was done are the record of what happened,
                 and they don't fit on one line beside a delta that a run never has. */
              ex.cardio ? (
                <CardioRecordRow key={ex.name} name={ex.name} cardio={ex.cardio} units={units} />
              ) : (
                <View key={ex.name} style={styles.recRow}>
                  <View style={styles.recRowText}>
                    <View style={styles.recNameLine}>
                      <Text style={styles.recExName}>{ex.name}</Text>
                      {ex.isPR ? (
                        <View style={styles.prBadge}>
                          <Text style={styles.prBadgeText}>PR</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.recTop}>
                      {`${ex.sets} set${ex.sets === 1 ? '' : 's'}${ex.topSet ? ` · top ${fmt(ex.topSet)}` : ''}`}
                      {/* QA F9: the record, labelled for what it is, so a PR badge beside "top 500 lb × 8"
                          cannot be read as a 500 PR when the record was 150 × 5. */}
                      {ex.prSet ? ` · PR (1–5 reps) ${fmt(ex.prSet)}` : ''}
                    </Text>
                  </View>
                  {ex.delta ? <Text style={[styles.recDelta, ex.delta.kind === 'hold' ? styles.deltaFlat : styles.deltaUp]}>{deltaLabel(ex.delta, units)}</Text> : null}
                </View>
              ),
            )}
          </View>

          {/* Quiet, and only here. A program day is already reusable BY its program; this is for the
              sessions with no home — one built as you went, or one reshaped past its program. */}
          <Pressable
            onPress={openTemplateName}
            disabled={savingTemplate || savedTemplate}
            accessibilityRole="button"
            accessibilityLabel={savedTemplate ? 'Saved to your templates' : 'Save this day as a template'}
            accessibilityState={{ disabled: savingTemplate || savedTemplate }}
            style={({ pressed }) => [styles.templateRow, pressed && !savedTemplate ? styles.templateRowPressed : null]}
          >
            {savedTemplate ? <CheckGlyph /> : <TemplateGlyph />}
            <Text style={[styles.templateText, savedTemplate ? styles.templateTextDone : null]}>
              {savedTemplate ? 'Saved to your templates' : savingTemplate ? 'Saving…' : 'Save this day as a template'}
            </Text>
          </Pressable>

          {/*
            ⚠ THE ACCIDENT THIS EXISTS FOR: you tapped End, the screen appeared, and you realised you
            were not finished. Offered for an hour and then gone — past that it stops being one workout,
            and a session reopened at night would let a single entry claim the whole day.

            It reopens rather than starting something new: the sets you already logged come back marked
            done, and Finish appends to this same workout instead of writing a second one.
          */}
          {data.savedAt && withinContinueWindow(data.savedAt) ? (
            <Pressable
              onPress={() => {
                void (async () => {
                  const s = await fetchWorkoutAsSession(data.workoutId);
                  if (!s) return;
                  await unmarkSessionSealed(data.workoutId);
                  await persistSession(s);
                  router.replace('/workout');
                })();
              }}
              accessibilityRole="button"
              accessibilityLabel="Continue this workout"
              style={({ pressed }) => [styles.continueRow, pressed ? styles.continuePressed : null]}
            >
              <Text style={styles.continueText}>Not finished? Continue this workout</Text>
            </Pressable>
          ) : null}

          {/* Training note. Best-effort like every other annotation on this screen — the session is
              already durably committed, so a failed write costs a note and never the workout. */}
          <View style={styles.sessNoteWrap}>
            <Text style={styles.sessNoteLabel}>HOW DID IT GO?</Text>
            <TextInput
              style={styles.sessNoteInput}
              placeholder="Felt flat. Slept badly. Left two in the tank."
              placeholderTextColor={flColor.gray600}
              multiline
              maxLength={280}
              value={sessNote}
              onChangeText={(t) => {
                setNoteDraft(t);
                setSessNoteSaved(false);
              }}
              /*
               * ⚠ THE HINT LINE IS THE ONLY FEEDBACK THIS FIELD HAS, and its default text reads exactly
               * like the pre-save state. So a swallowed failure was invisible by construction: the note
               * vanished and the hint went on saying "For the next time you train this."
               */
              onBlur={() => {
                void saveWorkoutNote(data.workoutId, sessNote)
                  .then(() => setSessNoteSaved(true))
                  .catch(() => showToast('Couldn’t save that note — check your connection and try again.'));
              }}
              accessibilityLabel="A note about this session"
            />
            <Text style={styles.sessNoteHint}>
              {sessNoteSaved ? 'Saved — you’ll see this in your history.' : 'For the next time you train this.'}
            </Text>
            {/* …and this box knows about the sealed one, so the two never read as the same question twice. */}
            {reflection ? <Text style={styles.sessNoteHint}>Your note for future you: “{reflection}”</Text> : null}
          </View>

          <View style={styles.longGameWrap}>
            <Text style={styles.longGameLabel}>The Long Game</Text>
            <Text style={styles.longGameCopy}>This session is now permanent — another entry in a chapter still being written.</Text>
            <View style={styles.chapterCard}>
              <View style={styles.chapterGlyph}>
                <EngravedIcon name="book" size={20} />
              </View>
              <View style={styles.chapterText}>
                <Text style={styles.chapterName}>{data.chapterName ?? 'Your Chapter'}</Text>
                <Text style={styles.chapterSub}>{data.chapterOrdinal ? `Your ${ord(data.chapterOrdinal)} session in this chapter · ongoing` : 'ongoing'}</Text>
              </View>
            </View>
          </View>

          {/* CONTEXTUAL, because this screen is now reached from two places and popping is all it does.
              "Done" ends a ceremony you have not finished yet; "Back to your record" is what returning to
              the capture stage actually is. */}
          <View style={styles.recAction}>
            <Button
              variant="primary"
              fullWidth
              onPress={() => setStage(from)}
              accessibilityLabel={from === 'capture' ? 'Back to your record' : 'Done'}
            >
              {from === 'capture' ? 'Back to Your Record' : 'Done'}
            </Button>
          </View>
        </ScrollView>
        {/* The Record step owns "Save this day as a template" and the name on its eyebrow, so it has to
            own both sheets too — see the note where `templateNameSheet` is built. */}
        {templateNameSheet}
        {renameSheet}
      </Shell>
    );
  }

  /*
   * ⚠ THE STANDALONE REFLECT AND SHARE STEPS ARE GONE, and they were the whole reason this flow was
   * four screens deep.
   *
   * Reflect is the note sheet on the capture stage. It kept the resurfaced memory block and lost the
   * "Skip for today" button, because nothing is being skipped any more — the workout was already sealed
   * two screens earlier and the note was never required.
   *
   * Share is the share sheet, reached from the one filled button on the capture stage instead of from a
   * glyph in the corner of a ceremony that nobody found.
   */
  return null; // unreachable: `stage` is exhausted above
}

// ── pieces ──
/** One destination in the share sheet. Disabled rows stay visible and carry their reason. */

/**
 * The status bar's height, as space. ⚠ The Record's back arrow sat UNDER the status bar / Dynamic Island
 * — hidden and untappable — because this route is a `fullScreenModal` with no header, and nothing above
 * The Record's own header reserved the inset. The other stages centre their content and clear it by
 * padding; the Record is the one that puts a control at the very top.
 */
function SafeTop() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top }} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.4)' }} />
      {children}
    </View>
  );
}
/** The design's flat forge-mark: three ascending pillars on a stepped plinth, filled (from forge-symbols.js). */
function ForgeMarkGlyph({ size = 66, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10.9 3.2H13.1V15H10.9Z" fill={color} />
      <Path d="M7.6 7.1L9.6 5.8V15H7.6Z" fill={color} />
      <Path d="M16.4 7.1L14.4 5.8V15H16.4Z" fill={color} />
      <Path d="M6.8 15.4H17.2V16.2H6.8Z" fill={color} />
      <Path d="M5.6 16.6H18.4V17.4H5.6Z" fill={color} />
      <Path d="M4.4 17.8H19.6V18.6H4.4Z" fill={color} />
    </Svg>
  );
}

/**
 * The forged completion seal — layered exactly as the design: a breathing ember halo, a charcoal disc with
 * a bronze rim (glow-subtle + border-inset), an inner bronze-subtle ring, and the flat forge-mark in bronze,
 * with a stamp-ring that expands + fades on seal. Reduced-motion collapses the animations.
 */
function SealMedallion({ size = 132, sealed = false }: { size?: number; sealed?: boolean }) {
  const reduce = useReducedMotion();
  const [glow] = useState(() => new Animated.Value(0.6));
  const [stamp] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) {
      glow.setValue(0.65);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.9, duration: 1700, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, reduce]);
  useEffect(() => {
    if (sealed) Animated.timing(stamp, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [sealed, stamp]);
  const gs = size + 28;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -14, left: -14, opacity: glow }}>
        <Svg width={gs} height={gs}>
          <Defs>
            <RadialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#E0913F" stopOpacity={0.45} />
              <Stop offset="60%" stopColor="#C8853E" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#C8853E" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={gs} height={gs} fill="url(#sealGlow)" />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: flColor.accentBorder, backgroundColor: flColor.charcoal800, boxShadow: `${flShadow.glowSubtle}, ${flShadow.borderInset}` }} />
      <View style={{ position: 'absolute', top: 10, left: 10, width: size - 20, height: size - 20, borderRadius: (size - 20) / 2, borderWidth: 1, borderColor: flColor.accentBorderSubtle }} />
      <View style={{ position: 'relative', zIndex: 1 }}>
        <ForgeMarkGlyph size={Math.round(size * 0.5)} />
      </View>
      {sealed ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -14,
            left: -14,
            width: gs,
            height: gs,
            borderRadius: gs / 2,
            borderWidth: 2,
            borderColor: flColor.bronze300,
            opacity: stamp.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
            transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) }],
          }}
        />
      ) : null}
    </View>
  );
}
/**
 * The seal at rest — the same mark, with the ceremony taken out of it.
 *
 * ⚠ NO EMBER GLOW AND NO PULSE, deliberately. `SealMedallion` breathes because it is waiting to be
 * pressed; by the capture stage it has been, and a disc still glowing at you is asking for something
 * that already happened. Same rim, same inner ring, same forge-mark, no animation and no state.
 *
 * ⚠ THE SHARE CHIP THAT USED TO BE HERE IS GONE. It was a bare glyph in a corner and nobody found it
 * (PO: *"Unless you know the top right button no one will share"*); labelling it helped and did not fix
 * it, because a corner control on a ceremony screen is competing with the ceremony. Share is now the one
 * filled button on the stage that follows, which is the only place on this flow it can't be missed.
 */
function CaptureSeal({ size }: { size: number }) {
  const inset = Math.round(size * 0.097); // 7px at 72 — the ring holds its proportion on the share card
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: flColor.accentBorder,
          backgroundColor: flColor.charcoal800,
          boxShadow: flShadow.borderInset,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: inset,
          left: inset,
          width: size - inset * 2,
          height: size - inset * 2,
          borderRadius: (size - inset * 2) / 2,
          borderWidth: 1,
          borderColor: flColor.accentBorderSubtle,
        }}
      />
      {/* ⚠ LIFTED ABOVE THE DISC, as `SealMedallion` lifts its own (workout-17, QA 09-26). The two rings are
          `position: absolute` and the glyph was not — on the web a positioned box paints OVER a static
          sibling whatever the order, so the opaque disc covered the mark and the sealed screen and the share
          card both showed an empty circle. */}
      <View style={{ position: 'relative', zIndex: 1 }}>
        <ForgeMarkGlyph size={Math.round(size * 0.47)} color={flColor.bronze300} />
      </View>
    </View>
  );
}

/** One number in the capture hero: an engraved glyph beside the figure, its label under it. */
function CapStat({ icon, n, label }: { icon: EngravedName; n: string; label: string }) {
  return (
    <View style={styles.capStat} accessible accessibilityLabel={`${label}: ${n}`}>
      <EngravedIcon name={icon} size={22} color={flColor.bronze300} />
      <View>
        <Text style={styles.capStatN}>{n}</Text>
        <Text style={styles.capStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

/** A section label in the screen's label voice, its one-line purpose under it, an optional aside on the right. */
function SectionHead({ title, sub, aside }: { title: string; sub: string; aside?: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadTop}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {aside ? <Text style={styles.sectionAside}>{aside}</Text> : null}
      </View>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

/**
 * One of the four things that can be added to the record — glyph over a short label, an equal share of the row.
 *
 * ⚠ ATTACHED READS AS ATTACHED. The rows this replaced only brightened the icon, and on a tile that is not
 * enough to tell an added note from an untouched one. So a done tile takes the app's one selected
 * vocabulary — `accentBorder` + `selectedFill` + `selectedInk` (bronze is earned) — and a small check in
 * its corner. It stays tappable: the same tap edits what was added.
 */
function RecordTile({ icon, label, done, a11y, onPress }: { icon: EngravedName; label: string; done: boolean; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: done }}
      style={({ pressed }) => [styles.tile, done ? styles.tileDone : null, pressed ? styles.pressed : null]}
    >
      <EngravedIcon name={icon} size={22} color={done ? flColor.bronze300 : flColor.bronze400} />
      <Text style={[styles.tileLabel, done ? styles.tileLabelDone : null]} numberOfLines={1}>
        {label}
      </Text>
      {done ? (
        <View style={styles.tileCheck}>
          <EngravedIcon name="check" size={9} color={flColor.onBronze} />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * One destination row. `toggle` selects in place (Friends) and shows a check disc; `open` leads somewhere
 * (the squad picker, the picture) and shows a chevron. Selected is the restrained bronze edge, never a fill
 * of colour across the row.
 */
function ShareRow({
  icon,
  title,
  sub,
  mode,
  selected = false,
  disabled = false,
  onPress,
}: {
  icon: EngravedName;
  title: string;
  sub: string | null;
  mode: 'toggle' | 'open';
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={mode === 'toggle' ? 'checkbox' : 'button'}
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      accessibilityState={mode === 'toggle' ? { checked: selected, disabled } : { disabled }}
      style={({ pressed }) => [styles.shareRow, selected ? styles.shareRowOn : null, pressed && !disabled ? styles.pressed : null]}
    >
      <EngravedIcon name={icon} size={22} color={selected ? flColor.bronze300 : flColor.gray400} />
      <View style={styles.shareRowText}>
        <Text style={[styles.shareRowTitle, selected ? styles.shareRowTitleOn : null]} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.shareRowSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {mode === 'toggle' ? (
        <View style={[styles.checkDisc, selected ? styles.checkDiscOn : null]}>
          {selected ? <EngravedIcon name="check" size={12} color={flColor.onBronze} /> : null}
        </View>
      ) : disabled ? null : (
        <EngravedIcon name="chevron-right" size={15} color={flColor.gray600} />
      )}
    </Pressable>
  );
}

/** A per-post tick — the map, the food. Off on every visit; nothing here is ever remembered. */
function PostTick({ on, onPress, disabled, label, sub, a11y }: { on: boolean; onPress: () => void; disabled: boolean; label: string; sub: string; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={a11y}
      style={[styles.tick, on ? styles.tickOn : null]}
    >
      <View style={[styles.tickBox, on ? styles.tickBoxOn : null]}>{on ? <EngravedIcon name="check" size={11} color={flColor.onBronze} /> : null}</View>
      <View style={styles.tickText}>
        <Text style={[styles.tickLabel, on ? styles.tickLabelOn : null]}>{label}</Text>
        <Text style={styles.tickSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

/** The accomplishment card's glyph per hero kind — a trophy for a record, as the design draws it. */
const MOMENT_GLYPHS: Record<CompletionHero['kind'], EngravedName> = {
  honor: 'laurel',
  pr: 'trophy',
  milestone: 'medal',
  consistency: 'flame',
};

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
function deltaLabel(d: ExerciseDelta, units: import('@/domain/settings/units').UnitSystem): string {
  if (d.kind === 'hold') return 'Held';
  if (d.kind === 'reps') return `+${d.n} reps`;
  /* Exact: a 2.5 lb step up is what the athlete did, and "+3" is not. Volume above still rounds. */
  const w = exactWeight(d.n, units);
  return `+${w.value} ${w.unit}`;
}
// The design's glyphs: laurel (honor) · spark (pr) · medal (milestone) · flame (consistency).
const HERO_GLYPHS: Record<CompletionHero['kind'], EngravedName> = {
  honor: 'laurel',
  pr: 'spark',
  milestone: 'medal',
  consistency: 'flame',
};
function HeroGlyph({ kind, size = 22 }: { kind: CompletionHero['kind']; size?: number }) {
  return <EngravedIcon name={HERO_GLYPHS[kind]} size={size} />;
}
/** The "one true thing" — featured (honor/PR) dominates; standard (milestone/consistency) is a quiet line. */
function Hero({ hero }: { hero: CompletionHero }) {
  if (hero.featured) {
    return (
      <View style={styles.heroFeatured}>
        <HeroGlyph kind={hero.kind} size={26} />
        <View style={styles.heroTextF}>
          <Text style={styles.heroEyebrowF}>{hero.eyebrow}</Text>
          <Text style={styles.heroTitleF}>{hero.title}</Text>
          {hero.note ? <Text style={styles.heroNoteF}>{hero.note}</Text> : null}
        </View>
      </View>
    );
  }
  /*
   * ══ THE MILESTONE IS NOT A CARD ANY MORE ══
   *
   * Design review 2026-09-04: *"The card is good, but it currently feels slightly like a notification
   * inserted into the middle of a ceremonial screen… I'd make it feel less like a standard app card."*
   *
   * The fix the project already has a rule for. A card says *you act inside this*, and there is nothing
   * to do inside a milestone — it is a fact about the session, and a fact gets a label. So the recessed
   * fill and the charcoal border come off and what is left is the glyph, the label and the fact, on the
   * same ground as everything else on the screen. Subtraction, not a new treatment.
   *
   * ⚠ ONE LINE, NOT TWO. "MILESTONE" over "20th Session" was a stacked block roughly the height of the
   * stats it sits under, which is what made it read as a competing element. Joined by a middle dot, it
   * becomes a caption — the register the review asked for ("MILESTONE · 20TH SESSION").
   *
   * ⚠ `featured` (an honor or a PR) IS STILL A CARD, deliberately. That branch is the "one true thing"
   * and is supposed to dominate; the review's complaint was about the quiet variant sitting in the
   * ceremony wearing a card's clothes.
   */
  return (
    <View style={styles.heroStandard}>
      <HeroGlyph kind={hero.kind} size={19} />
      <Text style={styles.heroLineS} numberOfLines={1}>
        <Text style={styles.heroEyebrowS}>{hero.eyebrow}</Text>
        <Text style={styles.heroDotS}> · </Text>
        <Text style={styles.heroTitleS}>{hero.title}</Text>
      </Text>
    </View>
  );
}

function TemplateGlyph({ size = 15, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return <EngravedIcon name="document" size={size} color={engravedTint(color)} />;
}
function CheckGlyph({ size = 15, color = '#8FB295' }: { size?: number; color?: string }) {
  return <EngravedIcon name="check" size={size} color={color} />;
}

/**
 * One conditioning bout on the Record — everything that was measured about it.
 *
 * This row exists because a run rendered through the strength row was a name above "1 set", and after
 * that a single joined string with a hardcoded `mi` in it. A run has more to say than a lift does and it
 * says it differently: four numbers, none of which is a weight, plus where it was done.
 *
 * EVERY CELL IS CONDITIONAL, and that is the point. Incline shows only when it was recorded and only
 * indoors; pace only when there was enough distance to divide by; distance only when something measured
 * it. A treadmill bout with no distance typed in renders as a duration and a place, which is exactly
 * what is known about it — a dash under a "MILES" heading would be a shrug where the app should just
 * not ask the question.
 */
function CardioRecordRow({ name, cardio, units }: { name: string; cardio: CompletionCardio; units: UnitSystem }) {
  const u = distanceLabel(units);
  const { rowUnit } = useUnits();
  const cells: { value: string; label: string; accent?: boolean }[] = [];
  if (cardio.distanceMi != null) {
    // A row reads in metres, as it did on the card (`rowUnit`); pace below stays per mile or km.
    const metres = rowMetresText(cardio.distanceMi, cardio.isRow, rowUnit);
    cells.push(metres ? { value: metres, label: 'M' } : { value: toDistance(cardio.distanceMi, units).toFixed(2), label: u.toUpperCase() });
  }
  /* Floors sit where miles would, and take the accent for the same reason a distance does: on a stair
     session it is the number the athlete came for. ⚠ NOT passed through `toDistance` — there is no
     metric floor, and converting one would invent a measurement. */
  if (cardio.floors != null) {
    cells.push({ value: String(cardio.floors), label: 'FLOORS', accent: cardio.distanceMi == null });
  }
  if (cardio.durationSec != null) cells.push({ value: fmtClock(cardio.durationSec), label: 'TIME' });
  if (cardio.paceSecPerMi != null) {
    cells.push({ value: fmtPace(toPace(cardio.paceSecPerMi, units)), label: `AVG /${u.toUpperCase()}`, accent: true });
  }
  // Grade is a treadmill fact. Outdoors it is not something the app measured, so it is not shown.
  if (cardio.modality === 'indoor' && cardio.inclinePct != null) {
    cells.push({ value: `${cardio.inclinePct.toFixed(1)}%`, label: 'INCLINE' });
  }

  const where =
    cardio.modality === 'indoor' ? (cardio.onBelt === false ? 'Indoors' : 'On the belt') : cardio.modality === 'outdoor' ? 'Outdoors' : null;

  return (
    <View style={styles.cardioRow}>
      <View style={styles.recNameLine}>
        <Text style={styles.recExName}>{name}</Text>
        {where ? <Text style={styles.cardioWhere}>{where}</Text> : null}
      </View>
      {cells.length ? (
        <View style={styles.cardioCells}>
          {cells.map((c, i) => (
            <View key={c.label} style={[styles.cardioCell, i === 0 ? null : styles.cardioCellDiv]}>
              <Text style={[styles.cardioValue, c.accent ? styles.cardioValueAccent : null]}>{c.value}</Text>
              <Text style={styles.cardioLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** iOS Safari's long-press callout (Copy / Look Up) — web-only, untyped in RN. See `holdBtn`. */
const noCallout = Platform.OS === 'web' ? ({ WebkitTouchCallout: 'none' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  nameInput: { paddingHorizontal: 13, paddingVertical: 12, minHeight: 46, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 15, color: flColor.cream100 },
  nameHint: { marginTop: 8, fontSize: 12, color: flColor.gray600 },
  nameActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  /** Each button's `fullWidth` is `width: 100%` — of THIS cell, not the row; bare in the row, two of them pushed Save off the screen (QA F8). */
  nameAction: { flex: 1 },

  templateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 12 },
  templateRowPressed: { opacity: 0.82 },
  templateText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronzeInk },
  templateTextDone: { color: flColor.gray600 },
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 12 },
  scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  err: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15 },

  /* ── capture stage (PO 2026-10-02: completed · accomplishment · add · share · finish) ──
     ⚠ EVERYTHING FLOWS FROM THE TOP. No `marginTop: 'auto'`, no space-between, no pinned footer: a pinned
     button leaves a dead band under the content on a tall phone. The sections are spaced by ONE rule
     (`capSection`'s 18pt + its rule) so the screen reads as five steps rather than a stack of cards, and the 420pt cap
     keeps it a column on a tablet or a wide browser. */
  capScroll: { paddingHorizontal: 20, alignItems: 'center' },
  capBlock: { width: '100%', maxWidth: 420, alignItems: 'center' },
  capName: { fontFamily: flFont.display, fontSize: 30, fontWeight: '700', lineHeight: 34, letterSpacing: 0.2, color: flColor.cream100, textAlign: 'center', marginTop: 12 },
  capEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', color: flColor.labelInk, textAlign: 'center', marginTop: 6 },
  capStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  capStat: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  capStatN: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  capStatLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray400, marginTop: 1 },
  capStatDiv: { width: 1, alignSelf: 'stretch', marginVertical: 2, backgroundColor: flColor.bronzeBorderSubtle },

  /* The one accomplishment — the "featured" hero card's language (bronze tint + edge), one line tall. */
  moment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    width: '100%',
    minHeight: 58,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
    backgroundColor: flColor.bronzeTint,
  },
  momentText: { flex: 1, minWidth: 0, gap: 2 },
  momentTitle: { fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  momentSub: { fontSize: 12.5, color: flColor.gray400 },
  pressed: { opacity: 0.82 },

  capSection: { width: '100%', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: flColor.divider },
  sectionHead: { gap: 3, marginBottom: 10 },
  sectionHeadTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 11.5, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.labelInk },
  sectionAside: { fontSize: 13, color: flColor.gray400 },
  sectionSub: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 19, color: flColor.gray400 },

  /* Four equal tiles — 72pt tall, the whole tile is the tap target. */
  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    minWidth: 0,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  tileDone: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  tileLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400, paddingHorizontal: 4 },
  tileLabelDone: { color: flColor.selectedInk },
  tileCheck: { position: 'absolute', top: 6, right: 6, width: 15, height: 15, borderRadius: 8, backgroundColor: flColor.bronze300, alignItems: 'center', justifyContent: 'center' },

  shareRows: { gap: 8 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 54,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  shareRowOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  shareRowText: { flex: 1, minWidth: 0, gap: 1 },
  shareRowTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  shareRowTitleOn: { color: flColor.selectedInk },
  shareRowSub: { fontSize: 12.5, color: flColor.gray400 },
  checkDisc: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  checkDiscOn: { borderColor: flColor.bronze300, backgroundColor: flColor.bronze300 },

  tick: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 8, paddingVertical: 9, paddingHorizontal: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  tickOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  tickBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: flColor.bronzeBorderSubtle, alignItems: 'center', justifyContent: 'center' },
  tickBoxOn: { borderColor: flColor.bronze300, backgroundColor: flColor.bronze300 },
  tickText: { flex: 1, minWidth: 0, gap: 1 },
  tickLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  tickLabelOn: { color: flColor.selectedInk },
  tickSub: { fontSize: 11.5, color: flColor.gray600 },
  photoLook: { marginTop: 12, alignItems: 'center' },

  postedLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 2 },
  postedText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17, color: flColor.bronze300 },
  postedLink: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '700', color: flColor.bronze300 },

  capCta: { width: '100%', marginTop: 22 },
  postError: { marginTop: 10, fontSize: 12.5, lineHeight: 18, color: flColor.gray400, textAlign: 'center' },
  detailsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', minHeight: 44, marginTop: 6, paddingHorizontal: 14 },
  detailsText: { fontFamily: flFont.sans, fontSize: 14.5, color: flColor.gray400 },
  pickerSub: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400, marginBottom: 12 },

  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 2.6, textTransform: 'uppercase', color: flColor.gray400 },

  /* ══ THE QUOTE IS THE PRE-SEAL STATEMENT, AND SPACING IS WHAT SAYS SO ══
     *"I'd create a stronger closing sequence… the quote feels like the narrative justification for the
     action."* It was already in the right ORDER; what it lacked was punctuation. More air ABOVE cuts it
     free of the milestone it was competing with, and `sealBottom`'s much smaller `marginTop` binds it
     to the button underneath: what you did · then the sentence · then the act. Left rule and left
     alignment untouched — the review called this element excellent, and it is not what was wrong. */
  quoteRow: { flexDirection: 'row', gap: 12, maxWidth: 300, marginTop: 26, alignSelf: 'center' },
  quoteRule: { width: 2, borderRadius: 1 },

  firstEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.labelInk },
  revealChapter: { fontFamily: flFont.display, fontSize: 30, fontWeight: '600', color: flColor.cream100, textAlign: 'center', marginTop: 6, letterSpacing: -0.3 },
  revealLine: { fontFamily: flFont.sans, fontSize: 14.5, color: flColor.gray400, textAlign: 'center', marginTop: 4 },
  /* The status line, the name and the date as ONE child of the centred stack — see the note at the
     call site. 6pt inside it against the container's 12pt between groups: the three lines read as one
     thing, and the block reads as separate from the medallion above and the numbers below. */
  identity: { alignItems: 'center', gap: 6 },
  /* ⚠ `marginTop` REMOVED from all three. It was compounding with `center`'s `gap: 12` — the exact
     stretch the review objected to. Spacing for this group now lives in `identity` alone. */
  sealStatus: { fontSize: 12, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronzeInk },
  sealStatusSealed: { color: flColor.bronze300 },
  sealTitle: { fontFamily: flFont.display, fontSize: 38, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100, textAlign: 'center' },
  sealSubtitle: { fontFamily: flFont.sans, fontSize: 14, letterSpacing: 1, color: flColor.gray400 },
  sealStats: { flexDirection: 'row', marginTop: 12 },
  statDivider: { width: 1, backgroundColor: flColor.bronzeBorderSubtle },
  /* ⚠ THE NUMBERS GAIN ~12%, THE LABELS GAIN CONTRAST — the review's biggest UX point, and the two
     halves are separate fixes. 24→27 is the size; `gray600`→`gray400` is the one that actually makes
     the block read as important, because a label nobody can see makes the number above it ambiguous.
     Wider gutters too: the pair has to hold its own against the medallion, and air is what does that. */
  stat: { alignItems: 'center', gap: 4, paddingHorizontal: 22 },
  statN: { fontFamily: flFont.display, fontSize: 27, fontWeight: '600', color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.gray400 },

  honorHero: { alignItems: 'center', gap: 3, marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  honorKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronzeInk },
  honorName: { fontFamily: flFont.display, fontSize: 17, color: flColor.cream100 },
  prCallout: { alignItems: 'center', gap: 3, marginTop: 8 },
  prKicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronzeInk },
  prLine: { fontFamily: flFont.display, fontSize: 18, color: flColor.bronzeInk },
  quote: { flex: 1, fontFamily: flFont.display, fontSize: 16, fontStyle: 'italic', lineHeight: 22, color: flColor.bronze300, textAlign: 'left' },

  holdBtn: { marginTop: 26, width: '100%', height: 54, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.borderInset, userSelect: 'none' },
  /* ⚠ `userSelect` + `WebkitTouchCallout` are load-bearing on web (PO 09-29, Racine): the hold is 900ms and
     iOS Safari turns a ~500ms press on text into a text selection, which cancels the touch — the words
     highlight, `onPressOut` fires, and the fill drains back to zero. Only when the thumb lands ON the
     label, hence "sometimes". Native text isn't selectable, so the installed app never did this. */
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  holdBtnInSection: { marginTop: 0 },
  /* 32→14: the seal belongs TO the sentence above it, not to a separate footer region. */
  sealBottom: { width: '100%', maxWidth: 320, marginTop: 14 },
  upNext: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 15 },
  upNextDiamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  upNextText: { fontSize: 12, color: flColor.gray600 },
  holdText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300, userSelect: 'none' },
  holdTextDark: { color: flColor.onBronze },
  // alignSelf, not just textAlign: the Pressable would otherwise stretch to the column's full width and
  // sit its label on the left edge, off-axis from the medallion and the Hold-to-Seal button above it.
  /* ══ "VIEW DETAILS", IN THE SCREEN'S OWN LABEL VOICE ══
     *"This is probably the weakest visual element on the screen… I'd make it slightly more obviously
     interactive without making it look like a button."* It was 14pt sentence-case grey — the one thing
     here written in no particular language, which is why it read as a footnote rather than a door.
     Small tracked-out uppercase is the register `eyebrow`, `statLabel` and `sealStatus` already speak,
     and bronze is what the screen uses for "this responds". Still not a button: no fill, no border. */
  textLink: { alignSelf: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  textLinkText: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: flColor.bronzeInk,
  },

  back: { alignSelf: 'flex-start', marginBottom: 14 },
  backText: { fontFamily: flFont.sans, fontSize: 15, color: flColor.gray400 },
  recVolume: { fontFamily: flFont.display, fontSize: 46, fontWeight: '600', color: flColor.cream100 },
  recVolumeLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600, marginTop: -2 },
  recList: { marginTop: 26, gap: 2 },
  recHeading: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk, marginTop: 28, marginBottom: 10 },
  recRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: flColor.divider },
  recRowText: { gap: 2 },
  recExName: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  recTop: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  bestsBlock: {
    gap: 1,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
    borderRadius: flRadius.md,
    backgroundColor: 'rgba(191,143,79,0.05)',
    overflow: 'hidden',
  },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 14 },
  bestMark: { width: 7, height: 7, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  bestText: { flex: 1, gap: 2 },
  bestLabel: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze300 },
  bestDetail: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.gray400 },
  cardioRow: { gap: 10, paddingVertical: 14, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: flColor.divider },
  cardioWhere: {
    fontFamily: flFont.sans,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  cardioCells: { flexDirection: 'row', alignItems: 'stretch' },
  cardioCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  cardioCellDiv: { borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  cardioValue: {
    fontFamily: flFont.display,
    fontSize: 21,
    lineHeight: 24,
    color: flColor.cream100,
    fontVariant: ['tabular-nums'],
  },
  cardioValueAccent: { color: flColor.bronze300 },
  cardioLabel: { fontFamily: flFont.sans, fontSize: 8.5, letterSpacing: 1.1, color: flColor.gray600 },
  prBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronze400 },
  prBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: flColor.bronzeInk },
  longGame: { marginTop: 26, gap: 8 },
  longGameCopy: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  longGameChapter: { fontFamily: flFont.display, fontSize: 15, color: flColor.bronzeInk },
  recAction: { marginTop: 30 },

  // ── the note sheet (the retired Reflect step) ──
  noteSheet: { gap: 14 },
  noteHelper: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  noteInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    borderRadius: flRadius.lg,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 23,
    color: flColor.cream100,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },

  // hero ladder
  heroFeatured: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', maxWidth: 312, marginTop: 24, paddingVertical: 16, paddingHorizontal: 18, borderRadius: flRadius.lg, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  heroTextF: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  heroEyebrowF: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk },
  heroTitleF: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, lineHeight: 22 },
  heroNoteF: { fontSize: 11.5, color: flColor.gray400 },
  /* No fill, no border, no card — see the note on `Hero`. What is left is a centred caption: glyph,
     label, fact. `marginTop: 4` because `center`'s own 12pt gap is now doing the separating. */
  heroStandard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, maxWidth: 300, marginTop: 4 },
  heroLineS: { flexShrink: 1, textAlign: 'center' },
  heroEyebrowS: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk },
  heroDotS: { fontSize: 10, color: flColor.bronzeBorder },
  heroTitleS: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },

  // record
  recHeader: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6, paddingLeft: 6, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: flColor.divider },
  recBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recHeaderTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  recScroll: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 30 },
  recEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  recEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.gray600, flexShrink: 1 },
  recEvidence: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  recEvidenceLeft: { gap: 6, flexShrink: 1 },
  recEvidenceRight: { alignItems: 'flex-end', gap: 2, paddingBottom: 4 },
  recDuration: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.bronze300 },
  recDurationLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  deltaUp: { color: flColor.greenMuted, fontWeight: '600' },
  deltaFlat: { color: flColor.gray600 },
  tangible: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: flRadius.pill, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, alignSelf: 'flex-start' },
  tangibleDiamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  tangibleText: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },
  recTable: { borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.charcoal900 },
  recNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDelta: { fontSize: 12.5, fontWeight: '600' },
  continueRow: {
    marginTop: 20,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
  },
  continuePressed: { opacity: 0.85 },
  continueText: { fontSize: 14.5, fontWeight: '600', color: flColor.bronze300 },
  sessNoteWrap: { gap: 8, marginTop: 22 },
  sessNoteLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600 },
  sessNoteInput: {
    fontFamily: flFont.sans,
    fontSize: 15.5,
    lineHeight: 23,
    color: flColor.cream100,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 84,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  sessNoteHint: { fontSize: 12, color: flColor.gray600 },
  longGameWrap: { marginTop: 32, paddingTop: 26, borderTopWidth: 1, borderTopColor: flColor.bronzeBorderSubtle },
  longGameLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk, marginBottom: 8 },
  chapterCard: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 4, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chapterGlyph: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  chapterText: { flex: 1, minWidth: 0, gap: 2 },
  chapterName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  chapterSub: { fontSize: 12, color: flColor.gray600 },

  // share-to-squad picker
  pickerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  pickerCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, paddingVertical: 20, paddingHorizontal: 20, boxShadow: flShadow.ambient },
  pickerTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, marginBottom: 12 },
  pickerScroll: { maxHeight: 300 },
  pickerRow: { paddingVertical: 14 },
  pickerRowDiv: { borderTopWidth: 1, borderTopColor: flColor.divider },
  pickerName: { fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },

  // share destinations (Friends · A Squad · Friends & Squad)
  destList: { gap: 8 },
  destRow: { paddingVertical: 13, paddingHorizontal: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  destRowOff: { opacity: 0.45 },
  destLabel: { fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  destLabelOff: { color: flColor.gray400 },
  destSub: { fontSize: 12, color: flColor.gray600, marginTop: 2 },
  destNote: { fontSize: 12, lineHeight: 18, color: flColor.gray600, marginTop: 12 },

  // resurfaced memory
  pastRef: { width: '100%', maxWidth: 320, marginTop: 6, paddingVertical: 13, paddingHorizontal: 15, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600, borderLeftWidth: 2, borderLeftColor: flColor.bronze400, gap: 5 },
  pastRefLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.gray600 },
  pastRefText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 20, color: flColor.gray400 },
});
