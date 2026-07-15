/**
 * ConfirmSheet — the confirmation surface for M-5 (Chapter Sealing) and M-6 (Destructive
 * Action). Per the reconciled overlay system (Modal Library §03) every confirmation is a
 * BottomSheet, not a centered modal — this composes the committed `BottomSheet` with a
 * full-width confirm button (bronze for a ceremonial confirm, forged-red for destructive)
 * and a text-link cancel. The caller owns the transaction; this only collects intent.
 *
 * (The M-5/M-6 specs predate the overlay reconciliation and name CLA-C20 Modal; the
 * reconciled Modal Library + this build use BottomSheet for confirmations.)
 */

import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { flColor } from '@/constants/foundation'
import { BottomSheet } from '../BottomSheet'
import { Button } from '../Button'

export interface ConfirmSheetProps {
  open: boolean
  /** Cancel / dismiss. */
  onClose: () => void
  headline: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  /** `primary` = ceremonial bronze (M-5); `destructive` = forged red (M-6). */
  tone?: 'primary' | 'destructive'
  cancelLabel?: string
}

export function ConfirmSheet({
  open,
  onClose,
  headline,
  body,
  confirmLabel,
  onConfirm,
  tone = 'destructive',
  cancelLabel = 'Cancel',
}: ConfirmSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={headline}
      footer={
        <>
          <Button variant={tone} fullWidth onPress={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="text" fullWidth onPress={onClose}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      <Text style={styles.body}>{body}</Text>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14.5,
    lineHeight: 22,
    color: flColor.gray400,
  },
})
