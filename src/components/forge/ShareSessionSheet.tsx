import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { flColor, flRadius } from '@/constants/foundation';
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
  /**
   * The card the athlete is about to send, drawn by the caller and shown ABOVE the destinations.
   *
   * ⚠ PASSED IN RATHER THAN BUILT HERE, and optional. The seal mark, the chapter name and the lb/kg
   * conversion all live on Workout Complete; Activity Detail opens this same sheet holding a different
   * shape entirely, and giving it nothing is the honest answer rather than a card assembled from
   * whatever happens to be to hand. No preview, no preview block — never a placeholder.
   */
  preview?: ReactNode;
}

export function ShareSessionSheet({ open, onClose, workoutId, workoutName, summary, preview }: ShareSessionSheetProps) {
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

  const sentence = () => {
    const vol = snapshot ? ` ${fmtVolume(snapshot.volume)} moved.` : '';
    return `${workoutName} — sealed.${vol}`;
  };

  const shareOutside = () => {
    onClose();
    void Share.share({ title: 'Forge Legacy', message: sentence() });
  };

  /**
   * Straight into the messages app, rather than through the OS sheet to get there.
   *
   * ⚠ IT FALLS BACK RATHER THAN FAILING. `sms:` is a native URL scheme with two spellings — iOS wants
   * `sms:&body=`, Android `sms:?body=` — and on the web preview there is usually no handler at all. Any
   * of those lands on the OS/Web share sheet, which is where the athlete was going anyway.
   */
  const shareToMessages = () => {
    onClose();
    const text = sentence();
    if (Platform.OS === 'web') {
      void Share.share({ title: 'Forge Legacy', message: text });
      return;
    }
    const url = `sms:${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`;
    void Linking.canOpenURL(url).then(
      (ok) => (ok ? Linking.openURL(url) : Share.share({ title: 'Forge Legacy', message: text })),
      () => Share.share({ title: 'Forge Legacy', message: text }),
    );
  };

  const close = () => {
    setSquadStep(null);
    onClose();
  };

  /*
   * ══ ONE PASS, PREVIEW FIRST ══
   *
   * The sheet does NOT ask "in the app or outside?" and then show you a list. Inside and outside are
   * both on screen at once, under one label each, because the choice an athlete is making is *who sees
   * this*, and splitting it into two questions makes them answer a question about plumbing first.
   *
   * The card preview sits above every destination for the same reason: you should see what you are
   * sending before you pick where it goes.
   */
  return (
    <BottomSheet open={open} onClose={close} scroll title={squadStep ? (squadStep === 'BOTH' ? 'Friends and which squad?' : 'Share to which squad?') : 'Share your workout'}>
      {/* A plain View, not a second ScrollView: `scroll` above already gives the sheet one, and nesting
          two on the same axis is what `BottomSheet`'s own header warns against. */}
      {squadStep ? (
        <View>
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
        </View>
      ) : (
        <View style={styles.body}>
          {preview ? <View style={styles.preview}>{preview}</View> : null}

          <Text style={styles.group}>Within Forge</Text>
          {/*
            ⚠ THREE TILES, NOT TWO. The handoff draws Friends and Squads; "Friends & Squad" is a THIRD
            audience the database models directly — `(audience = 'FRIENDS') = (squad_id is null)` is an
            equivalence, so BOTH is one post carrying a squad, not two posts. Dropping it to match a
            two-tile sketch would delete a shipped capability, so it stays, and it stays VISIBLE with a
            reason when it can't be used: a missing option teaches nothing, a disabled one does.
          */}
          <View style={styles.tiles}>
            <Tile
              icon={<FriendsGlyph />}
              label="Friends"
              onPress={() => choose('FRIENDS')}
              disabled={sharing || !snapshot}
              hint="Everyone you're connected to"
            />
            <Tile
              icon={<SquadGlyph />}
              label="Squads"
              onPress={() => choose('SQUAD')}
              disabled={sharing || !hasSquad || !snapshot}
              hint={hasSquad ? 'Just the people you train with' : 'You’re not in a squad yet'}
            />
            <Tile
              icon={<BothGlyph />}
              label="Both"
              onPress={() => choose('BOTH')}
              disabled={sharing || !hasSquad || !snapshot}
              hint={hasSquad ? 'One post, both audiences' : 'Needs a squad'}
            />
          </View>
          {!hasSquad ? (
            <Text style={styles.note}>You’re not in a squad yet, so Friends is the only place inside Forge to share this.</Text>
          ) : null}

          <Text style={styles.group}>Outside Forge</Text>
          {/*
            ⚠ TWO ROWS, NOT FOUR — AND THE TWO MISSING ONES ARE MISSING HONESTLY.
            The handoff also lists "Save workout card" and "Instagram Stories". Both need the card above
            rendered to an IMAGE, and nothing in this project can do that: there is no view-shot
            dependency, `expo-image-manipulator` only transforms images it is handed, and a Stories
            deep link with no image attached opens an empty story. Shipping either as a row that quietly
            does nothing is worse than not shipping it. They come back with an image renderer.
            Neither row is ever disabled by a missing snapshot: they carry a sentence, not the recap.
          */}
          <View style={styles.outside}>
            <OutsideRow icon={<MessageGlyph />} label="Messages" onPress={shareToMessages} disabled={sharing} />
            <OutsideRow divided icon={<MoreGlyph />} label="More…" onPress={shareOutside} disabled={sharing} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

/** One in-app audience. Disabled tiles keep their place and carry the reason underneath. */
function Tile({
  icon,
  label,
  hint,
  onPress,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${hint}`}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.tile, disabled ? styles.tileOff : null, pressed && !disabled ? styles.tilePressed : null]}
    >
      {icon}
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function OutsideRow({
  icon,
  label,
  onPress,
  disabled,
  divided = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  divided?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.outRow, divided ? styles.outRowDiv : null, pressed && !disabled ? styles.outRowPressed : null]}
    >
      {icon}
      <Text style={styles.outRowLabel}>{label}</Text>
    </Pressable>
  );
}

const ICON = { size: 22, stroke: flColor.bronze400, width: 1.7 } as const;
function FriendsGlyph() {
  return (
    <Svg width={ICON.size} height={ICON.size} viewBox="0 0 24 24" fill="none" stroke={ICON.stroke} strokeWidth={ICON.width} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6S13.9 16 14.5 19" />
      <Path d="M16.2 6.2a3 3 0 0 1 0 5.6M17.5 14.6c2 .5 3.2 2 3.6 4.4" />
    </Svg>
  );
}
function SquadGlyph() {
  return (
    <Svg width={ICON.size} height={ICON.size} viewBox="0 0 24 24" fill="none" stroke={ICON.stroke} strokeWidth={ICON.width} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={7} r={2.7} />
      <Circle cx={5.4} cy={10.4} r={2.2} />
      <Circle cx={18.6} cy={10.4} r={2.2} />
      <Path d="M7.4 18c.5-2.5 2.3-3.8 4.6-3.8S16.1 15.5 16.6 18" />
      <Path d="M2.5 18c.3-1.9 1.4-2.9 3-3.1M21.5 18c-.3-1.9-1.4-2.9-3-3.1" />
    </Svg>
  );
}
function BothGlyph() {
  return (
    <Svg width={ICON.size} height={ICON.size} viewBox="0 0 24 24" fill="none" stroke={ICON.stroke} strokeWidth={ICON.width} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={12} r={5.2} />
      <Circle cx={15} cy={12} r={5.2} />
    </Svg>
  );
}
function MessageGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 12a7.5 7.5 0 0 1-8 7.4L7 21l.7-3A7.5 7.5 0 1 1 20 12z" />
    </Svg>
  );
}
function MoreGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.5} />
      <Circle cx={17} cy={6} r={2.5} />
      <Circle cx={17} cy={18} r={2.5} />
      <Path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  preview: { alignItems: 'center', marginBottom: 6 },

  group: { marginTop: 6, fontSize: 10.5, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.gray600 },

  tiles: { flexDirection: 'row', gap: 9 },
  tile: {
    flex: 1,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  tilePressed: { borderColor: flColor.bronzeBorder },
  tileOff: { opacity: 0.45 },
  tileLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },

  outside: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, overflow: 'hidden' },
  outRow: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15 },
  outRowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  outRowPressed: { backgroundColor: flColor.charcoal900 },
  outRowLabel: { flex: 1, fontSize: 14, color: flColor.cream100 },

  note: { fontSize: 12, lineHeight: 18, color: flColor.gray600 },
  row: { paddingVertical: 13 },
  rowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
});
