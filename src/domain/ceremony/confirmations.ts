/**
 * M-5 / M-6 confirmation copy — EXACT locked strings from the specs, with entity names
 * interpolated by the caller. These are BottomSheet confirmations (per the reconciled
 * overlay system), NOT queued ceremonies: a surface invokes the relevant builder, renders
 * a ConfirmSheet, and owns the transaction on confirm.
 *
 * Sources: M-5-Chapter-Sealing-Confirmation-Spec §5.1; M-6-Destructive-Action-Confirmation-Spec §3 (M6-UC1–UC4).
 */

export interface ConfirmConfig {
  headline: string;
  body: string;
  confirmLabel: string;
  tone: 'primary' | 'destructive';
  cancelLabel: string;
}

/** M-5 Chapter Sealing (§5.1) — ceremonial (bronze) confirm; cancel is "Not yet". */
export function chapterSealConfirm(chapterName: string): ConfirmConfig {
  return {
    headline: `Seal ${chapterName}?`,
    body: 'Your goals, honors, and progress will be permanently locked. Active programs carry forward into your next chapter—their progress at this moment is preserved in this chapter’s record.',
    confirmLabel: 'Seal This Chapter',
    tone: 'primary',
    cancelLabel: 'Not yet',
  };
}

/** M-6 Destructive Action (§3) — the four locked use cases; forged-red confirm, cancel is "Cancel". */
export const destructiveConfirm = {
  /** M6-UC1 — memory entry deletion (L-3 / L-4). */
  memory: (chapterName: string): ConfirmConfig => ({
    headline: 'Delete this memory?',
    body: `This memory will be permanently removed from ${chapterName}.`,
    confirmLabel: 'Delete Memory',
    tone: 'destructive',
    cancelLabel: 'Cancel',
  }),
  /** M6-UC2 — squad deletion (S-2 / S-3). */
  squad: (squadName: string, memberCount: number): ConfirmConfig => ({
    headline: `Delete ${squadName}?`,
    body: `This will permanently remove the squad for all ${memberCount} members. This cannot be undone.`,
    confirmLabel: 'Delete Squad',
    tone: 'destructive',
    cancelLabel: 'Cancel',
  }),
  /** M6-UC3 — leave squad as the last member (S-3). */
  leaveDelete: (squadName: string): ConfirmConfig => ({
    headline: `Leave and delete ${squadName}?`,
    body: 'You are the last member. Leaving will permanently delete this squad. This cannot be undone.',
    confirmLabel: 'Leave and Delete',
    tone: 'destructive',
    cancelLabel: 'Cancel',
  }),
  /** M6-UC4 — squad member removal (S-3). */
  removeMember: (memberName: string, squadName: string): ConfirmConfig => ({
    headline: `Remove ${memberName}?`,
    body: `${memberName} will be removed from ${squadName}. They can only rejoin by invitation.`,
    confirmLabel: 'Remove Member',
    tone: 'destructive',
    cancelLabel: 'Cancel',
  }),
};
