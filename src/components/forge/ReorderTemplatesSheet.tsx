import React, { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { useListReorder } from '@/hooks/useListReorder';
import { useHaptics } from '@/lib/settings';

export interface TemplateReorderRow {
  id: string;
  name: string;
  /** "5 lifts · 18 sets" — the same line the card shows. */
  meta: string;
}

const GRIP = 'M4 9h16M4 15h16';
const UP = 'M18 15l-6-6-6 6';
const DOWN = 'M6 9l6 6 6-6';
/** Row height + gap — `ReorderWeekSheet`'s pitch, so the two drags feel identical under the thumb. */
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
 * "Reorder" on the Templates screen — put your templates in your own order (W26-Amendment-003, 0201).
 *
 * PO: *"Same drag and drop as the days in a program type of feel."* So it IS that drag: the same hook,
 * the same row pitch, the same grip and ▲▼ pair, the same haptics — `ReorderWeekSheet` minus what only a
 * program week has (pinned sessions, the this-week/rest-of-program choice).
 *
 * ⚠ IN A SHEET, NOT ON THE CARDS. The cards are variable height (a name can wrap, the lift pills wrap)
 * and `useListReorder` steps by one fixed pitch; the cards also carry Start and Remove, and a grip beside
 * those is three targets fighting for one edge. A one-line row per template is what the drag needs.
 *
 * Nothing is written until Save. The order is the whole list, sent in one call.
 */
export function ReorderTemplatesSheet({
  open,
  onClose,
  rows,
  busy,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  rows: readonly TemplateReorderRow[];
  busy?: boolean;
  onSave: (ids: string[]) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => rows.map((r) => r.id));
  const haptics = useHaptics();

  // Re-seed on the open transition only — see the same note in `ReorderWeekSheet`.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOrder(rows.map((r) => r.id));
  }

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const changed = order.some((id, i) => id !== rows[i]?.id);

  // Nothing is pinned in a template list, so a move is a plain splice.
  const apply = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
  };

  const drag = useListReorder({
    rowHeight: ROW + GAP,
    count: order.length,
    canMove: () => true,
    onMove: apply,
    haptics,
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Reorder templates"
      footer={
        <Button variant="primary" fullWidth disabled={!changed || busy} onPress={() => onSave(order)} accessibilityLabel="Save this order">
          {busy ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <View>
        <Text style={styles.note}>Drag to put them in your order. It’s the order you’ll see them in everywhere.</Text>

        <View style={[styles.list, { height: order.length * (ROW + GAP) }]}>
          {order.map((id, pos) => {
            const row = byId.get(id);
            if (!row) return null;
            const first = pos === 0;
            const last = pos === order.length - 1;
            return (
              <Animated.View
                key={id}
                style={[styles.row, { top: pos * (ROW + GAP) }, drag.dragging === pos && styles.rowLifted, drag.rowStyle(pos)]}
              >
                <View style={styles.text}>
                  <Text style={styles.name} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.meta}
                  </Text>
                </View>

                <View style={styles.controls}>
                  <Pressable
                    onPress={first ? undefined : () => apply(pos, pos - 1)}
                    disabled={first}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${row.name} up`}
                    style={styles.ctrl}
                  >
                    <Glyph d={UP} color={first ? flColor.charcoal500 : flColor.gray400} />
                  </Pressable>
                  <Pressable
                    onPress={last ? undefined : () => apply(pos, pos + 1)}
                    disabled={last}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${row.name} down`}
                    style={styles.ctrl}
                  >
                    <Glyph d={DOWN} color={last ? flColor.charcoal500 : flColor.gray400} />
                  </Pressable>
                  {/* ⚠ THE HANDLE CARRIES THE GESTURE, NOT THE ROW — a responder on the row cannot tell
                      "lift me" from "scroll the sheet". */}
                  <View {...drag.handlers(pos)} accessibilityLabel={`Drag ${row.name} to reorder`} style={styles.grip}>
                    <Glyph d={GRIP} size={18} color={flColor.gray600} />
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 19, color: flColor.gray400, marginBottom: 12 },
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
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal800,
  },
  rowLifted: { borderColor: flColor.bronzeBorder },
  text: { flex: 1 },
  name: { fontFamily: flFont.sans, fontSize: 15, color: flColor.cream100 },
  meta: { fontSize: 12, color: flColor.gray600, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  ctrl: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  // `userSelect: 'none'` is load-bearing on web — see `ReorderWeekSheet`.
  grip: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', userSelect: 'none' },
});
