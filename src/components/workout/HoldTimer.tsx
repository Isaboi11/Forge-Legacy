import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { flColor, flFont, flRadius } from '@/constants/foundation';
import { playRestDing, primeDing } from '@/lib/ding';
import { clockText, holdProgress, holdRemaining, holdResult } from '@/domain/workout/hold-timer';

/**
 * The countdown for a timed set — the control that finally makes a plank loggable.
 *
 * ══ WHAT THIS REPLACES ══
 *
 * A timed set drew its duration in the Target column and then offered a REPS box and a tick. There was
 * no clock anywhere in the app except the rest timer and a cardio bout, so the athlete held the plank
 * against their own phone clock, guessed, and pressed a check.
 *
 * ══ TAP TO START, TAP TO STOP, AND STOPPING IS NOT CANCELLING ══
 *
 * The second tap is the one that matters. A plank you could only hold for forty of the prescribed sixty
 * seconds is not a failed set — it is a forty-second set, and it is the most useful number in the
 * session because it is the one that will move. So stopping RECORDS what the clock said. Cancelling
 * outright is the long-press, deliberately harder to reach than the thing you meant to do.
 *
 * ══ WHY IT OWNS ITS OWN TICKER ══
 *
 * The screen already runs one for rest and one for an AMRAP, and both are the SCREEN's business — one
 * rest at a time, one AMRAP at a time. A hold belongs to a set: a superset can have two of them on
 * screen, and the round after this one has three more. Keeping the deadline local means the component
 * that is counting is also the one being watched, and no parent has to model which row owns the clock.
 *
 * The deadline is an epoch, not a decrementing counter — the same shape the rest timer uses, and for the
 * same reason: a re-render, a dropped frame or a backgrounded app cannot lose count of a timestamp.
 */
export function HoldTimer({
  targetSec,
  soundOn,
  onDone,
  label,
}: {
  targetSec: number;
  /** Follows the screen's own rest-timer sound preference — one switch for every noise the logger makes. */
  soundOn: boolean;
  /** Seconds actually held. Never called for a mis-tap (see `holdResult`). */
  onDone: (heldSec: number) => void;
  /** Exercise name, for the screen reader — "Start 30 second hold, Plank". */
  label: string;
}) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef<number | null>(null);
  /* The callback, held in a ref so the ticker effect does not re-subscribe — and restart the interval —
     every time the parent re-renders with a fresh closure. */
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(
    (expired: boolean) => {
      const began = startedAt.current;
      setEndsAt(null);
      startedAt.current = null;
      if (began == null) return;
      const held = holdResult({ targetSec, elapsedMs: Date.now() - began, expired });
      if (held != null) doneRef.current(held);
    },
    [targetSec],
  );

  useEffect(() => {
    if (endsAt == null) return;
    const t = setInterval(() => {
      const ms = Date.now();
      if (ms >= endsAt) {
        /* The sound is the whole point of a hold timer: you are staring at the floor under a plank, not
           at your phone. Same switch as the rest ding, so one preference silences the logger. */
        if (soundOn) playRestDing();
        finish(true);
      } else setNow(ms);
    }, 250);
    return () => clearInterval(t);
  }, [endsAt, finish, soundOn]);

  const start = () => {
    /* Inside the tap, exactly as `startRest` does it: iOS Safari starts an AudioContext suspended and
       only resumes it inside a user gesture, so the press that STARTS the clock is what buys the
       permission to end it out loud. No-op on native. */
    primeDing();
    const ms = Date.now();
    startedAt.current = ms;
    setNow(ms);
    setEndsAt(ms + Math.max(1, targetSec) * 1000);
  };

  const cancel = () => {
    setEndsAt(null);
    startedAt.current = null;
  };

  const running = endsAt != null;
  const remaining = running ? holdRemaining(endsAt, now) : targetSec;
  const progress = running ? holdProgress(targetSec, remaining) : 0;

  return (
    <Pressable
      onPress={running ? () => finish(false) : start}
      onLongPress={running ? cancel : undefined}
      accessibilityRole="button"
      accessibilityLabel={
        running
          ? `Stop hold at ${remaining} seconds remaining, ${label}. Long press to cancel.`
          : `Start ${targetSec} second hold, ${label}`
      }
      style={({ pressed }) => [styles.btn, running ? styles.btnRunning : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.ring}>
        <Svg width={30} height={30} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={15.6} fill="none" stroke={flColor.charcoal600} strokeWidth={3} />
          {running ? (
            /* Drawn with a dash offset rather than an arc path: one number to animate, no trigonometry,
               and it degrades to a full ring at progress 1 instead of collapsing at the wrap-around. */
            <Circle
              cx={18}
              cy={18}
              r={15.6}
              fill="none"
              stroke={flColor.bronze300}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15.6}
              strokeDashoffset={2 * Math.PI * 15.6 * (1 - progress)}
              transform="rotate(-90 18 18)"
            />
          ) : (
            <Path d="M14.5 12l9 6-9 6z" fill={flColor.bronze300} />
          )}
        </Svg>
      </View>
      <View style={styles.text}>
        <Text style={[styles.clock, running ? styles.clockRunning : null]}>{clockText(remaining)}</Text>
        <Text style={styles.hint}>{running ? 'Tap to stop' : 'Hold'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
  },
  btnRunning: { borderColor: flColor.bronze400, backgroundColor: 'rgba(176,124,68,0.12)' },
  pressed: { opacity: 0.85 },
  ring: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  text: { minWidth: 42 },
  clock: { fontFamily: flFont.display, fontSize: 15, fontWeight: '700', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  clockRunning: { color: flColor.bronze300 },
  hint: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: flColor.gray600, textTransform: 'uppercase' },
});
