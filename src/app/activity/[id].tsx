import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ExercisePoster } from '@/components/forge/ExercisePoster';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { fetchActivityDetail } from '@/data/activity-live';
import {
  ordinalLine,
  programTag,
  sectionsOf,
  setLine,
  statTiles,
  summaryLine,
  whenLine,
  type ActivityDetail,
} from '@/domain/activity/detail-core';
import { WORKOUT_NAME_MAX, renameWorkout } from '@/data/workout-complete-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useUnits } from '@/lib/settings';
import { openPlaylist } from '@/components/forge/composites/Playlist';
import { playlistLabel, type WorkoutPlaylistLink } from '@/domain/workout/playlist';

/**
 * W-19 Activity Detail (`Forge Activity Detail.dc.html`) — one logged session, read-only. Reached from
 * an Activity History row; both screens read the same `workouts` table, so a tapped row always resolves.
 *
 * Polymorphic body: strength shows its Warm-up / Main / Cool-down breakdown with the real sets logged;
 * everything else shows stat tiles.
 *
 * DEFERRED vs the `.dc`, each because the data or destination doesn't exist (omitted, not faked):
 *  · Per-mile splits — nothing records split times; the design's are decorative offsets off the average.
 *  · Share / Export — the overflow menu's two items only raise toasts in the design; there is no share
 *    or export path here, and a button that only says "Exporting…" exports nothing.
 *  · The ordinal doesn't open the Legacy Timeline — that screen doesn't exist. Exercise rows and Program
 *    ARE tappable, because Exercise Detail (W-22) and Program Detail do.
 *  · Exercise media thumbs — the catalog has no media for any exercise, so the equipment glyph stands in.
 *  · The playlist row's cover-art thumbnail — Workout-Playlist-Amendment-001 §2 rules out fetching any
 *    playlist metadata, so there is no artwork to show. The row itself is BUILT (§9A, migration 0105).
 */

function Glyph({ d, size = 16, color, width = 1.8 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const TROPHY = 'M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 15h6M12 12v3M8 21h8';

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useQuery(() => fetchActivityDetail(id), [id]);

  /*
   * RENAMING A SESSION AFTERWARDS.
   *
   * `workouts.workout_name` has existed since 0001 and the athlete could never set it: a program
   * session took its slot name, a free one took the literal "Freestyle Workout", and no control
   * existed anywhere in the app. It is now editable at the finish (W-17) and here — which is where
   * you are when you realise a session deserved a better name than the one it was handed.
   *
   * Same three-state idiom as W-17: `undefined` = untouched, `null` = deliberately cleared.
   */
  const [nameEdit, setNameEdit] = useState<string | null | undefined>(undefined);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const title = nameEdit !== undefined ? (nameEdit ?? 'Workout') : (data?.title ?? 'Workout');

  const openRename = () => {
    /* The STORED name, not the displayed fallback. `fetchActivityDetail` renders a nameless session
       as "Workout"; offering that word for editing would make an unnamed session look named, and
       tapping Save would then write it to a row that never had one. */
    const stored = nameEdit !== undefined ? (nameEdit ?? '') : data?.title === 'Workout' ? '' : (data?.title ?? '');
    setRenameDraft(stored);
    setRenameError(null);
    setRenameOpen(true);
  };

  const commitRename = async () => {
    if (savingName) return;
    setSavingName(true);
    setRenameError(null);
    try {
      setNameEdit(await renameWorkout(id, renameDraft));
      setRenameOpen(false);
    } catch (e) {
      setRenameError(errorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
      <AppBar title="" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t load this session</Text>
          <Text style={styles.errorDetail}>{error ?? 'It may have been deleted.'}</Text>
        </View>
      ) : (
        <>
          <Body
            detail={data}
            title={title}
            onRename={openRename}
            onOpenProgram={(pid) => router.push({ pathname: '/program/[id]', params: { id: pid } })}
            onOpenExercise={(key) => router.push({ pathname: '/exercise/[id]', params: { id: key } })}
            onOpenSummary={() => router.push({ pathname: '/workout-complete', params: { id, review: '1' } })}
          />
          {/* Mounted beside the Body that opens it, never at the bottom of the file — see
              `overlay-branch.test.mjs` for the session that rule cost. */}
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
            <Text style={renameError ? styles.nameError : styles.nameHint}>
              {renameError ?? 'This is how the session appears in your history. Leave it empty to drop the name.'}
            </Text>
            <View style={styles.nameActions}>
              <Button variant="secondary" fullWidth onPress={() => setRenameOpen(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
              <Button variant="primary" fullWidth onPress={() => void commitRename()} accessibilityLabel="Save name">
                {savingName ? 'Saving…' : 'Save Name'}
              </Button>
            </View>
          </BottomSheet>
        </>
      )}
    </View>
  );
}

function Body({
  detail,
  title,
  onRename,
  onOpenProgram,
  onOpenExercise,
  onOpenSummary,
}: {
  detail: ActivityDetail;
  /** Passed in rather than read off `detail`, so a rename shows without waiting for a refetch. */
  title: string;
  onRename: () => void;
  onOpenProgram: (programId: string) => void;
  onOpenExercise: (keyOrName: string) => void;
  onOpenSummary: () => void;
}) {
  const sections = sectionsOf(detail);
  const tiles = statTiles(detail);
  const isStrength = detail.type === 'strength';
  const { fmt } = useUnits(); // re-express logged "225 lbs × 5" in the athlete's chosen system
  /* Somebody else's session, opened from the recap post they shared (migration 0117). The session is
     all here; what changes is that nothing on this screen may WRITE to a row that is not theirs. */
  const shared = detail.viewer === 'shared';
  const ordinal = ordinalLine(detail);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Says whose this is before anything else, because every number below belongs to them and the
          screen is otherwise identical to the one showing your own training. */}
      {shared ? (
        <View style={styles.sharedBanner}>
          <Glyph d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" size={14} color={flColor.bronze300} width={1.7} />
          <Text style={styles.sharedBannerText}>{detail.authorName}&apos;s session · shared with you</Text>
        </View>
      ) : null}

      {/* hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <EquipIcon equip={detail.exercises[0]?.equip ?? undefined} size={24} />
        </View>
        <View style={styles.heroText}>
          {/* Renaming writes `workouts.workout_name`, which RLS would refuse for a viewer — so on a
              shared session the title is plain text, not a control that fails. */}
          {shared ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <Pressable
              onPress={onRename}
              accessibilityRole="button"
              accessibilityLabel={`Rename this workout. Currently ${title}`}
              style={styles.titleRow}
              hitSlop={8}
            >
              <Text style={styles.title}>{title}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 20h9" />
                <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </Svg>
            </Pressable>
          )}
          <Text style={styles.programTag}>{programTag(detail)}</Text>
        </View>
      </View>

      {detail.milestones.map((m) => (
        <View key={m} style={styles.milestone}>
          <Glyph d={TROPHY} size={13} color={flColor.bronze300} width={2} />
          <Text style={styles.milestoneText}>{m}</Text>
        </View>
      ))}

      <Text style={styles.summary}>{summaryLine(detail)}</Text>
      <Text style={styles.when}>{whenLine(detail.startedAt)}</Text>
      {/* Empty on a shared session — the ordinal counts the author's whole training life and the
          chapter is their own Legacy prose. Absent, not zeroed. */}
      {ordinal ? <Text style={styles.ordinal}>{ordinal}</Text> : null}

      <View style={styles.divider} />

      {/* body — strength breakdown, or stat tiles */}
      {isStrength ? (
        sections.length ? (
          <>
            <Text style={styles.sectionLabel}>Exercises</Text>
            {sections.map((sec) => (
              <View key={sec.key} style={styles.section}>
                <Text style={styles.sectionSub}>{sec.label}</Text>
                {sec.exercises.map((ex, i) => (
                  <View key={`${ex.name}-${i}`} style={styles.exCard}>
                    <Pressable
                      onPress={() => onOpenExercise(ex.catalogKey ?? ex.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`${ex.name} — exercise detail`}
                      style={styles.exHead}
                    >
                      <View style={styles.exIcon}>
                        <ExercisePoster exerciseId={ex.catalogKey} radius={18} fallback={<EquipIcon equip={ex.equip ?? undefined} size={19} />} />
                      </View>
                      <Text style={styles.exName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Glyph d="M9 6l6 6-6 6" size={16} color={flColor.gray600} width={2} />
                    </Pressable>
                    {ex.sets.length ? (
                      <View style={styles.setList}>
                        {ex.sets.map((s) => {
                          const line = fmt(setLine(s));
                          return (
                            <View key={s.setIndex} style={styles.setRow}>
                              <Text style={styles.setIndex}>{s.setIndex + 1}</Text>
                              <Text style={styles.setValue}>{line || '—'}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.noSets}>No sets logged</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.noSets}>No exercises were logged in this session.</Text>
        )
      ) : (
        <>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.tiles}>
            {tiles.map((t) => (
              <View key={t.label} style={styles.tile}>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileValue} numberOfLines={1}>
                  {t.value}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* attribution */}
      {detail.partners.length || detail.playlist || detail.chapterName || detail.programId || detail.programName ? (
        <>
          <View style={styles.divider} />
          {detail.partners.length ? (
            <AttrRow label="Trained With" value={detail.partners.join(', ')} />
          ) : null}
          {/*
            PLAYLIST — W-19 §9A, read-only. Between Trained With and Chapter, which is exactly where the
            `.dc` puts it. §9A: tapping opens the link; there is no edit affordance here, because W-19 is
            a record of a session and editing belongs to W-17's reflection window.

            `playlistLabel` and not the raw URL, per §5 — and the external-link glyph rather than the
            chevron the other rows use, because this one leaves the app.

            The design's row also carries a 34×34 cover-art thumbnail. It is omitted rather than faked:
            §2 rules out fetching any playlist metadata, so there is no artwork and never will be, and an
            empty bronze square would be a slot advertising an absence.
          */}
          {detail.playlist ? (
            <AttrRow
              label="Playlist"
              value={playlistLabel(detail.playlist)}
              external
              onPress={() => void openPlaylist(detail.playlist as WorkoutPlaylistLink)}
            />
          ) : null}
          {detail.chapterName ? <AttrRow label="Chapter" value={detail.chapterName} /> : null}
          {/* On a shared session the program is NAMED but not tappable — 0117 withholds its id
              deliberately, because a viewer cannot open somebody else's program and a link that leads
              to a permission error is worse than a label. */}
          {detail.programId ? (
            <AttrRow
              label="Program"
              value={detail.programName ? `${detail.programName} — ${title}` : title}
              onPress={() => onOpenProgram(detail.programId as string)}
            />
          ) : detail.programName ? (
            <AttrRow label="Program" value={detail.programName} />
          ) : null}
        </>
      ) : null}

      {/*
        THE FULL SUMMARY, RE-OPENABLE.
        W-17's completion screen is parameterised by a workout id, so it has always been able to describe
        any saved session — it was simply only ever reached in the seconds after Finish, and the medallion,
        the volume figure, the PR and the exercise-by-exercise breakdown were a thing you got one look at.
        `review=1` re-opens it as a record rather than a ceremony: no graduation replay, no first-workout
        reveal, no hold-to-seal over something already sealed.
      */}
      {/* W-17 reads the athlete's OWN completion (and offers to seal, rename and save as a template),
          so it is not a door on somebody else's session. Omitted, not disabled. */}
      {shared ? null : (
        <Pressable
          onPress={onOpenSummary}
          accessibilityRole="button"
          accessibilityLabel="See the full summary for this session"
          style={({ pressed }) => [styles.summaryRow, pressed ? styles.summaryRowPressed : null]}
        >
          <View style={styles.summaryIcon}>
            <Glyph d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" size={17} color={flColor.bronze400} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>See the full summary</Text>
            <Text style={styles.summarySub}>The seal, the volume, and the session in full</Text>
          </View>
          <Glyph d="M9 6l6 6-6 6" size={16} color={flColor.bronze400} width={2} />
        </Pressable>
      )}
    </ScrollView>
  );
}

/** `external` swaps the chevron for the ↗ the `.dc` uses on rows that leave the app. */
function AttrRow({ label, value, onPress, external }: { label: string; value: string; onPress?: () => void; external?: boolean }) {
  const content = (
    <>
      <Text style={styles.attrLabel}>{label}</Text>
      <Text style={styles.attrValue} numberOfLines={2}>
        {value}
      </Text>
      {onPress ? (
        external ? (
          <Glyph d="M7 17L17 7M9 7h8v8" size={15} color={flColor.bronze400} width={2} />
        ) : (
          <Glyph d="M9 6l6 6-6 6" size={16} color={flColor.gray600} width={2} />
        )
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.attrRow}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={styles.attrRow}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 34 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 4 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100, flexShrink: 1 },

  // the rename sheet — same metrics as W-17's, so the two read as one control in two places
  nameInput: {
    fontFamily: flFont.sans,
    fontSize: 16,
    color: flColor.cream100,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    outlineWidth: 0,
  },
  nameHint: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, marginTop: 10 },
  nameError: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.redMuted, marginTop: 10 },
  nameActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  programTag: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },

  milestone: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  milestoneText: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze300 },

  summary: { marginTop: 14, fontSize: 15, fontWeight: '500', color: flColor.gray400 },
  when: { marginTop: 4, fontSize: 13.5, color: flColor.gray600 },
  ordinal: { marginTop: 2, fontSize: 13.5, color: flColor.gray600 },
  sharedBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start', marginBottom: 14, paddingVertical: 7, paddingHorizontal: 12, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  sharedBannerText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze300 },

  divider: { height: 1, backgroundColor: flColor.charcoal700, marginVertical: 22 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 14,
  },
  section: { marginBottom: 18 },
  sectionSub: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 10,
  },
  exCard: {
    marginBottom: 8,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
    padding: 13,
    gap: 10,
  },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  exIcon: {
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exName: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  setList: { gap: 5 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setIndex: { width: 16, fontSize: 11, fontWeight: '700', color: flColor.gray600, fontVariant: ['tabular-nums'] },
  setValue: { fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  noSets: { fontSize: 12.5, fontStyle: 'italic', color: flColor.gray600 },

  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    gap: 5,
    alignItems: 'center',
  },
  tileLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  tileValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 22,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
  },
  summaryRowPressed: { opacity: 0.82 },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, minWidth: 0, gap: 2 },
  summaryTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  summarySub: { fontSize: 11.5, color: flColor.gray400 },
  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  attrLabel: { width: 100, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  attrValue: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.cream100 },

  errorTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  errorDetail: { fontSize: 12, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
});
