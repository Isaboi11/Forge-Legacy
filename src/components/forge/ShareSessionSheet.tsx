import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flRadius } from '@/constants/foundation';
import { useToast } from '@/hooks/useCeremony';
import { addSquadPost, buildWorkoutRecap, fmtVolume, type WorkoutSummary } from '@/data/squad-feed-live';
import { createFriendPost, type PostAudience } from '@/data/friends-feed-live';
import { fetchMySquads, type SquadSummary } from '@/data/squad-live';

/**
 * WHERE A SESSION GOES — one sheet, every destination, wherever it is opened from.
 *
 * ══ WHY THIS IS A COMPONENT ══
 *
 * PO: *"Sharing to friends and squads should be more obvious… Same with when I go into recent activity.
 * I have to go two pages deep to get to the hidden share button."*
 *
 * This lived inline in `workout-complete.tsx`, which is why the only way to share a session was to have
 * just finished it. Activity Detail's own header comment recorded sharing as DEFERRED because *"there
 * is no share or export path here"* — true when it was written, and no longer. Extracted so a second
 * screen can offer it without a second copy of the audience rules, the squad-count edge cases and the
 * `(audience = 'FRIENDS') = (squad_id is null)` constraint.
 *
 * ══ ⚠ ONE SHEET, MECHANISM LAST ══
 *
 * The Workout Complete screen used to show "Share" beside "Share to Forge" — two buttons asking the
 * athlete to choose a MECHANISM before an AUDIENCE, with labels close enough that the difference was
 * learned by tapping one and finding out. The operating system is a destination here, listed last,
 * because the rows above keep the session inside Forge where it is a post somebody can answer rather
 * than an image in a camera roll.
 *
 * ══ WHY `createFriendPost` CARRIES 'BOTH' AND `addSquadPost` DOES NOT ══
 *
 * `addSquadPost` never writes the `audience` column, so it can only ever produce a SQUAD row; teaching
 * it a third audience would give two functions the same job. `createFriendPost` already takes
 * `audience` + `squadId` and applies `squad_id: audience === 'FRIENDS' ? null : squadId`, which is
 * exactly the shape of the database constraint.
 *
 * That constraint is an EQUIVALENCE stated both ways, so BOTH must carry a squad. An athlete in no
 * squads therefore gets Friends only — and the sheet SAYS so rather than hiding the rows, because a
 * missing option teaches nothing and a disabled one with a reason does.
 */

export interface ShareSessionSheetProps {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  /** What the OS share sheet says. The in-app post carries the snapshot instead. */
  workoutName: string;
  /**
   * The snapshot, when the caller already has it.
   *
   * ⚠ OPTIONAL, AND ABSENT IS THE NORMAL CASE AWAY FROM WORKOUT COMPLETE. Activity Detail holds a
   * DIFFERENT shape (a rendered detail, not a completion), so rather than teach two screens to build
   * the same object, an absent summary is fetched here through `buildWorkoutRecap` — the one function
   * that already knows how to turn a workout id into a recap.
   */
  summary?: WorkoutSummary | null;
}

export function ShareSessionSheet({ open, onClose, workoutId, workoutName, summary }: ShareSessionSheetProps) {
  const { showToast } = useToast();
  const [mySquads, setMySquads] = useState<SquadSummary[] | null>(null);
  const [squadStep, setSquadStep] = useState<PostAudience | null>(null);
  const [sharing, setSharing] = useState(false);
  const [fetched, setFetched] = useState<WorkoutSummary | null>(null);

  const snapshot = summary ?? fetched;

  /* Both reads happen on OPEN rather than on mount: this sheet sits in a screen that may never share,
     and a squad list nobody asked for is a request nobody needed. */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    if (!mySquads) void fetchMySquads().then((s) => alive && setMySquads(s), () => alive && setMySquads([]));
    if (!summary && !fetched) {
      void buildWorkoutRecap(workoutId).then((r) => {
        if (alive && r) setFetched(r.summary);
      });
    }
    return () => {
      alive = false;
    };
  }, [open, workoutId, summary, fetched, mySquads]);

  const hasSquad = (mySquads ?? []).length > 0;

  const post = (audience: PostAudience, squad: SquadSummary | null) => {
    if (sharing || !snapshot) return;
    if (audience !== 'FRIENDS' && !squad) return; // unreachable via the sheet; the constraint's belt-and-braces
    setSharing(true);
    const settle = (message: string) => {
      setSharing(false);
      setSquadStep(null);
      onClose();
      showToast(message);
    };
    const failed = (e: unknown) => {
      setSharing(false);
      showToast(e instanceof Error ? e.message : 'Couldn’t share that.');
    };

    if (audience === 'SQUAD' && squad) {
      addSquadPost({ squadId: squad.id, type: 'recap', body: '', workoutId, workoutSummary: snapshot }).then(
        () => settle(`Shared to ${squad.name}`),
        failed,
      );
      return;
    }
    createFriendPost({
      body: '',
      audience,
      squadId: squad?.id ?? null,
      media: [],
      type: 'recap',
      workoutId,
      workoutSummary: snapshot,
    }).then(() => settle(squad ? `Shared to your friends and ${squad.name}` : 'Shared with your friends'), failed);
  };

  const choose = (audience: PostAudience) => {
    if (audience === 'FRIENDS') return post('FRIENDS', null);
    const squads = mySquads ?? [];
    if (squads.length === 1) return post(audience, squads[0]);
    setSquadStep(audience);
  };

  const shareOutside = () => {
    onClose();
    const vol = snapshot ? ` ${fmtVolume(snapshot.volume)} moved.` : '';
    void Share.share({ title: 'Forge Legacy', message: `${workoutName} — sealed.${vol}` });
  };

  const close = () => {
    setSquadStep(null);
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          {squadStep ? (
            <>
              <Text style={styles.title}>{squadStep === 'BOTH' ? 'Friends and which squad?' : 'Share to which squad?'}</Text>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {(mySquads ?? []).map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => post(squadStep, s)}
                    disabled={sharing}
                    accessibilityRole="button"
                    accessibilityLabel={`Share to ${s.name}`}
                    style={[styles.row, i > 0 ? styles.rowDiv : null]}
                  >
                    <Text style={styles.rowName} numberOfLines={1}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.title}>Share this session with</Text>
              <View style={styles.dests}>
                <DestRow label="Friends" sub="Everyone you're connected to" onPress={() => choose('FRIENDS')} disabled={sharing || !snapshot} />
                <DestRow
                  label="A Squad"
                  sub={hasSquad ? 'Just the people you train with' : 'You’re not in a squad yet'}
                  onPress={() => choose('SQUAD')}
                  disabled={sharing || !hasSquad || !snapshot}
                />
                <DestRow
                  label="Friends & Squad"
                  sub={hasSquad ? 'Both, as one post' : 'Needs a squad'}
                  onPress={() => choose('BOTH')}
                  disabled={sharing || !hasSquad || !snapshot}
                />
                {/* Outside Forge, last — see the header. Never disabled on a missing snapshot: the OS
                    sheet carries a sentence, not the recap, so it works whatever the read did. */}
                <DestRow label="Anywhere else" sub="Messages, Instagram, anywhere on your phone" onPress={shareOutside} disabled={sharing} />
              </View>
              {!hasSquad ? (
                <Text style={styles.note}>You’re not in a squad yet, so Friends is the only place inside Forge to share this.</Text>
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DestRow({ label, sub, onPress, disabled }: { label: string; sub: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${sub}`}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.dest, disabled && styles.destOff]}
    >
      <Text style={[styles.destLabel, disabled && styles.destLabelOff]}>{label}</Text>
      <Text style={styles.destSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,9,12,0.62)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100, marginBottom: 14 },
  dests: { gap: 8 },
  dest: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal800 },
  destOff: { opacity: 0.45 },
  destLabel: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  destLabelOff: { color: flColor.gray400 },
  destSub: { marginTop: 2, fontSize: 12, color: flColor.gray600 },
  note: { marginTop: 12, fontSize: 12, lineHeight: 18, color: flColor.gray600 },
  scroll: { maxHeight: 320 },
  row: { paddingVertical: 13 },
  rowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
});
