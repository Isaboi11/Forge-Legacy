import React, { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { moveInOrder, type ReorderScope } from '@/domain/program/schedule-edit';
import { useListReorder } from '@/hooks/useListReorder';
import { useHaptics } from '@/lib/settings';

/** One session in the week being reordered. */
export interface ReorderRow {
  /** Its CURRENT schedule-space index — what `order` is a permutation of. */
  dayIndex: number;
  name: string;
  /** "4 planned", "Skipped", "Jul 3 • 52 min · 18 sets" — whatever the log row says. */
  meta: string;
  /**
   * Trained or skipped, so it cannot move: `program_sessions` is keyed by position, and a session that
   * moves out from under its own record makes the app claim a workout nobody did.
   */
  pinned: boolean;
}

const GRIP = 'M4 9h16M4 15h16';
const UP = 'M18 15l-6-6-6 6';
const DOWN = 'M6 9l6 6 6-6';
/** Row height + gap. The drag maths steps by this exact pitch, so it is one number in one place. */
const ROW = 56;
const GAP = 8;

function Glyph({ d, size = 16, color }: { d: string; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

/**
 * "Reorder this week" — change the order the sessions are trained in, and choose how far it reaches.
 *
 * ══ WHAT THIS ANSWERS ══
 *
 * PO, 2026-09-09: a tester on a 6-day split took up Saturday soccer and does not want legs landing on
 * it. Forge programs are sequential — no weekdays, by three locked documents — so the answer is to move
 * the session in the ORDER and have the change stick, which the existing pairwise swap could not do.
 *
 * ⚠ TOUCHED SESSIONS ARE SHOWN, AND CANNOT BE MOVED. Not hidden: the athlete is looking at their week
 * and a week with sessions missing from it is not their week. They render with their mark and no
 * controls, and the drag steps over them. The same reasoning that keeps touched days OUT of the swap
 * sheet's list applies there because that list is a menu of things to do; this is a picture of the week.
 *
 * ══ DRAG AND CHEVRONS, BOTH ══
 *
 * The drag is what was asked for. The chevrons are not a consolation prize: they are how every other
 * reorder in this app works (the two builders, the metrics sheet), they are reachable by a screen reader
 * where a pan gesture is not, and they are what works when a mouse drag is interrupted by the browser.
 *
 * ⚠ ONE SHEET, TWO FACES. The confirmation replaces the list rather than opening a second sheet — iOS
 * refuses to present a view controller while another is on screen, which is exactly how "Choose from
 * library" silently did nothing until it was fixed.
 */
export function ReorderWeekSheet({
  open,
  onClose,
  weekNumber,
  rows,
  targetsFor,
  totalWeeks,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  /** 1-based, as the athlete counts weeks. */
  weekNumber: number;
  rows: readonly ReorderRow[];
  /** Which weeks each scope would actually change — 0-based. Drives the confirmation's sentence. */
  targetsFor: (scope: ReorderScope) => number[];
  totalWeeks: number;
  busy?: boolean;
  onSave: (order: number[], scope: ReorderScope) => void;
}) {
  /** `order[position]` = the schedule index of the session now sitting at that position. */
  const [order, setOrder] = useState<number[]>(() => rows.map((r) => r.dayIndex));
  const [pending, setPending] = useState<ReorderScope | null>(null);
  const haptics = useHaptics();

  /*
   * ⚠ RE-SEED ON THE OPEN TRANSITION — on `open` going false → true, and on nothing else.
   *
   * The first version of this keyed off the ROWS (`rows.map(r => r.dayIndex).join(',')`), which cannot
   * work: the parent numbers rows by position, so that string is always "0,1,…,n-1" and the comparison
   * is never unequal. It would have kept a half-finished ordering from the previous open and then saved
   * it — exactly the bug the guard was written to stop.
   *
   * Keyed on the transition instead, so it holds whether the parent mounts this conditionally (it does
   * today) or keeps it mounted for the life of the screen (a refactor away, and this must survive it).
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOrder(rows.map((r) => r.dayIndex));
      setPending(null);
    }
  }

  const byIndex = useMemo(() => new Map(rows.map((r) => [r.dayIndex, r])), [rows]);
  /** Pinned POSITIONS, recomputed from the live order — a pinned row never moves, so this is stable. */
  const pinned = useMemo(
    () => new Set(order.map((d, pos) => (byIndex.get(d)?.pinned ? pos : -1)).filter((p) => p >= 0)),
    [order, byIndex],
  );

  const changed = order.some((d, i) => d !== rows[i]?.dayIndex);
  const movableCount = order.length - pinned.size;

  const apply = (from: number, to: number) => {
    const next = moveInOrder(order, from, to, pinned);
    if (next.some((d, i) => d !== order[i])) setOrder(next);
  };

  const drag = useListReorder({
    rowHeight: ROW + GAP,
    count: order.length,
    canMove: (i) => !pinned.has(i),
    onMove: apply,
    haptics,
  });

  const close = () => {
    setPending(null);
    onClose();
  };

  /** "Weeks 3–8", "Week 3" — what a scope will actually touch. */
  const rangeLabel = (weeks: number[]): string => {
    if (weeks.length === 0) return 'no weeks';
    if (weeks.length === 1) return `week ${weeks[0] + 1}`;
    return `weeks ${weeks[0] + 1}–${weeks[weeks.length - 1] + 1}`;
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={pending ? 'Save this order?' : `Week ${weekNumber} — reorder`}
      footer={
        pending ? (
          <View style={styles.confirmActions}>
            <View style={styles.half}>
              <Button variant="secondary" fullWidth onPress={() => setPending(null)} accessibilityLabel="Go back">
                Back
              </Button>
            </View>
            <View style={styles.half}>
              <Button
                variant="primary"
                fullWidth
                disabled={busy}
                onPress={() => onSave(order, pending)}
                accessibilityLabel="Save the new order"
              >
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.saveActions}>
            <Button
              variant="primary"
              fullWidth
              disabled={!changed || busy}
              onPress={() => setPending('rest_of_block')}
              accessibilityLabel="Save this order for the rest of the program"
            >
              Save for the rest of the program
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={!changed || busy}
              onPress={() => setPending('this_week')}
              accessibilityLabel={`Save this order for week ${weekNumber} only`}
            >
              Save for this week only
            </Button>
          </View>
        )
      }
    >
      {pending ? (
        <View style={styles.confirm}>
          <Text style={styles.note}>You will train them in this order:</Text>
          {order.map((d, pos) => {
            const row = byIndex.get(d);
            return (
              <Text key={d} style={styles.confirmLine}>
                <Text style={styles.strong}>{pos + 1}. </Text>
                {row?.name ?? `Day ${d + 1}`}
                {row?.pinned ? <Text style={styles.dim}>  ·  already done</Text> : null}
              </Text>
            );
          })}

          {/* ⚠ SAY WHICH WEEKS, and say which ones will NOT change. A week with a different number of
              sessions keeps its own order — a deload, or the short week at the end of a block — and an
              athlete who is not told that will find it later and reasonably call it a bug.

              ⚠ AND DO NOT OVER-PROMISE THE ORDER ITSELF. Each week protects its OWN record: a later week
              the athlete has already trained into pins those sessions where they are, so it lands close
              to this list rather than exactly on it. The list above is titled for the week in front of
              them; this line is where the rest of the program is described honestly. */}
          <Text style={styles.scopeNote}>
            {pending === 'this_week'
              ? `Only week ${weekNumber} changes. The rest of the program keeps the order it has.`
              : `Applies to ${rangeLabel(targetsFor('rest_of_block'))}, as far as each one is still free — ` +
                'anything you have already trained or skipped stays where it is.'}
            {pending === 'rest_of_block' && targetsFor('rest_of_block').length < totalWeeks - weekNumber + 1
              ? ' Weeks built to a different shape keep their own order.'
              : ''}
          </Text>
        </View>
      ) : (
        <View>
          <Text style={styles.note}>
            Drag to change the order you train these in. Sessions you have already trained or skipped stay
            where they are.
          </Text>

          <View style={[styles.list, { height: order.length * (ROW + GAP) }]}>
            {order.map((d, pos) => {
              const row = byIndex.get(d);
              if (!row) return null;
              const isPinned = pinned.has(pos);
              // The nearest position this row could actually reach — the chevrons step over pinned rows
              // exactly as the drag does, so the two controls can never disagree.
              const upTo = nearestFree(pos, -1, order.length, pinned);
              const downTo = nearestFree(pos, 1, order.length, pinned);

              return (
                <Animated.View
                  key={d}
                  style={[
                    styles.row,
                    { top: pos * (ROW + GAP) },
                    isPinned && styles.rowPinned,
                    drag.dragging === pos && styles.rowLifted,
                    drag.rowStyle(pos),
                  ]}
                >
                  <View style={styles.num}>
                    <Text style={styles.numText}>{pos + 1}</Text>
                  </View>

                  <View style={styles.text}>
                    <Text style={[styles.name, isPinned && styles.namePinned]} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {row.meta}
                    </Text>
                  </View>

                  {isPinned ? (
                    <Text style={styles.lockedChip}>Done</Text>
                  ) : (
                    <View style={styles.controls}>
                      <Pressable
                        onPress={upTo != null ? () => apply(pos, upTo) : undefined}
                        disabled={upTo == null}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${row.name} earlier in the week`}
                        style={styles.ctrl}
                      >
                        <Glyph d={UP} color={upTo == null ? flColor.charcoal500 : flColor.gray400} />
                      </Pressable>
                      <Pressable
                        onPress={downTo != null ? () => apply(pos, downTo) : undefined}
                        disabled={downTo == null}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${row.name} later in the week`}
                        style={styles.ctrl}
                      >
                        <Glyph d={DOWN} color={downTo == null ? flColor.charcoal500 : flColor.gray400} />
                      </Pressable>
                      {/* ⚠ THE HANDLE CARRIES THE GESTURE, NOT THE ROW. A responder on the row cannot
                          tell "lift me" from "scroll the sheet". */}
                      <View
                        {...drag.handlers(pos)}
                        accessibilityLabel={`Drag ${row.name} to reorder`}
                        style={styles.grip}
                      >
                        <Glyph d={GRIP} size={18} color={flColor.gray600} />
                      </View>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {movableCount < 2 ? (
            <Text style={styles.note}>
              {movableCount === 0
                ? 'Every session this week is already done, so there is nothing left to move.'
                : 'Only one session this week is still to do, so there is nothing to reorder it with.'}
            </Text>
          ) : null}

          {/* The other question this sheet gets asked, answered in one line rather than absorbed. */}
          <Text style={styles.footNote}>
            Hurt, or need one of these built differently? Ask Holt on the session itself.
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

/** The nearest position in `dir` that is not pinned, or null when there is none that way. */
function nearestFree(from: number, dir: 1 | -1, count: number, pinned: ReadonlySet<number>): number | null {
  for (let i = from + dir; i >= 0 && i < count; i += dir) {
    if (!pinned.has(i)) return i;
  }
  return null;
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 19, color: flColor.gray400, marginBottom: 12 },
  footNote: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, marginTop: 4 },

  // Absolutely positioned so the drag can move a row without the others reflowing under it.
  list: { position: 'relative' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal800,
  },
  rowPinned: { opacity: 0.55, borderStyle: 'dashed' },
  rowLifted: { borderColor: flColor.bronzeBorder },

  num: {
    width: 26,
    height: 26,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  numText: { fontFamily: flFont.display, fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  text: { flex: 1 },
  name: { fontSize: 15, color: flColor.cream100 },
  namePinned: { color: flColor.gray400 },
  meta: { fontSize: 12, color: flColor.gray600, marginTop: 2 },

  lockedChip: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  controls: { flexDirection: 'row', alignItems: 'center' },
  ctrl: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  /* ⚠ `userSelect: 'none'` is web-only and load-bearing there: a text selection dragging out from under
     the cursor terminates the responder mid-drag, which reads as the row snapping back for no reason. */
  grip: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', userSelect: 'none' },

  saveActions: { gap: 8 },
  confirm: { gap: 6 },
  confirmLine: { fontSize: 14.5, lineHeight: 22, color: flColor.cream100 },
  strong: { fontWeight: '700', color: flColor.bronze300 },
  dim: { fontSize: 12.5, color: flColor.gray600 },
  scopeNote: { fontSize: 13, lineHeight: 19, color: flColor.gray400, marginTop: 10 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
