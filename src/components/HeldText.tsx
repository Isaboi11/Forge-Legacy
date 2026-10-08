import { useImperativeHandle, useState, type ReactNode, type Ref } from 'react';

/**
 * ══ A NAME FIELD THAT KEEPS ITS LETTERS TO ITSELF UNTIL IT LETS GO ══
 *
 * PO, 2026-10-08 (iPhone): *"When I'm building a program and it has the screen where I can add sets or add
 * reps and I click on the title … it lets me type one letter then the keyboard is gone, and then it does it
 * over and over."*
 *
 * The day's name lived in the builder's draft, so every letter re-drew the whole day — its title, every
 * exercise card, the footer — and on the phone something in that re-draw took the keyboard away. The
 * Program name field on Setup re-draws the same way and keeps its keyboard (PO checked, 10-08), so the
 * field itself is not it; what differs is everything ELSE that re-draws. Rather than bet on which piece (it
 * cannot be reproduced off a device), typing no longer re-draws anything but this field. The text reaches
 * the draft when the field lets go — Done, a tap anywhere else, focus moving — or when the screen calls
 * `flush()` before it moves on.
 *
 * ⚠ CALL `flush()` FIRST IN ANY HANDLER THAT LEAVES, OR CHANGES WHAT IS OPEN. The commit and the handler's
 *   own change then land in the same tick, so the caller's state update must be FUNCTIONAL
 *   (`setDraft((d) => …)`) or the second would be computed from a draft without the name, and drop it.
 * ⚠ A SAVE THAT RUNS BEFORE THE FIELD LETS GO reads `current()`, not the draft.
 */
export type HeldTextHandle = {
  /** Hand the typed text to `onCommit` now. Nothing held → nothing happens. */
  flush: () => void;
  /** The text as it stands right now — typed-but-held, or the committed value. */
  current: () => string;
};

export function HeldText({
  value,
  onCommit,
  handle,
  children,
}: {
  /** The committed text (the draft's). Shown whenever nothing is being held. */
  value: string;
  onCommit: (v: string) => void;
  handle?: Ref<HeldTextHandle>;
  children: (field: { text: string; onChange: (v: string) => void; onBlur: () => void }) => ReactNode;
}) {
  /* null = nothing held; the field shows the committed value. Only this component re-renders per letter. */
  const [held, setHeld] = useState<string | null>(null);

  /* After a flush the field's next render holds nothing, so the blur that follows (KeyboardTapAway's comes
     60 ms after the tap, a navigation's later still) finds `held` null and commits nothing a second time. */
  const flush = () => {
    if (held == null) return;
    setHeld(null);
    if (held !== value) onCommit(held);
  };

  useImperativeHandle(handle, () => ({ flush, current: () => held ?? value }));

  return children({ text: held ?? value, onChange: setHeld, onBlur: flush });
}
