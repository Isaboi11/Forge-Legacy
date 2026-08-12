/**
 * RecapStrip — the four numbers a shared workout is: Vol · Time · Lifts · PRs.
 *
 * EXTRACTED, not written. This lived inline in `src/app/squad/[id].tsx` as `RecapStatSmall` plus four
 * style rules, and the Friends feed needed the identical strip once a recap could be shared there
 * (migration 0113). Two feeds rendering the same four numbers from two copies of the same code is how
 * they drift: one gains the PR pluralisation, or the hour-aware clock, and the other quietly stops
 * matching it. One component, both callers.
 *
 * PRs are omitted rather than shown as zero. "0 PRs" reads as a result — a session judged and found
 * wanting — when the honest statement is that this session was not about records. Same reasoning that
 * keeps `weight: 0` (bodyweight, an answer) distinct from `null` (nothing entered) in the logger.
 */

import { StyleSheet, Text, View } from 'react-native';

import { flColor, flFont } from '@/constants/foundation';
import { fmtDuration, fmtVolume, type WorkoutSummary } from '@/data/squad-feed-live';
import { openPlaylist, PlaylistChip } from '@/components/forge/composites/Playlist';

function RecapStat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function RecapStrip({ summary }: { summary: WorkoutSummary }) {
  return (
    <>
      <View style={styles.strip}>
        <RecapStat n={fmtVolume(summary.volume)} label="Vol" />
        <RecapStat n={fmtDuration(summary.durationSec)} label="Time" />
        <RecapStat n={String(summary.exercises.length)} label="Lifts" />
        {summary.prCount > 0 ? <RecapStat n={String(summary.prCount)} label={summary.prCount === 1 ? 'PR' : 'PRs'} /> : null}
      </View>
      {/*
        WHAT THEY TRAINED TO — on the card, where it is worth something.

        ⚠ IT WAS ALREADY BEING SNAPSHOTTED AND THEN DROPPED. `recapSummaryFrom` has carried
        `playlist` since 0105, deliberately frozen at share time so removing the link from the workout
        later cannot rewrite a card squadmates have already seen — and no feed has ever rendered it.
        PO: *"the playlist attached should be on the card of the post. That's part of the fun."*

        A chip rather than a stat: the four numbers above are what the session WAS, and this is a door
        out of the app. No cover art — Workout-Playlist-Amendment-001 §2 rules out fetching any playlist
        metadata, so an empty square would be a slot advertising an absence.
      */}
      {summary.playlist ? (
        <View style={styles.playlist}>
          {/* ⚠ THE EXISTING CHIP, NOT A NEW ONE. `PlaylistChip` already draws this on the post DETAIL
              screen and on the logger; a second hand-rolled pill would be two things to keep matching.
              No `onEdit`/`onRemove` — a snapshot on somebody else's card is not editable. */}
          <PlaylistChip link={summary.playlist} onOpen={() => void openPlaylist(summary.playlist!)} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 8 },
  playlist: { alignSelf: 'flex-start', marginTop: 10 },
  stat: { gap: 2 },
  statN: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.bronze300 },
  statLabel: { fontSize: 8.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
});
