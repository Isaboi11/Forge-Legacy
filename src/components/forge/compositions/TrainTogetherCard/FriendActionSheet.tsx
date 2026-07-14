/**
 * Tier: 3 (Composition)
 * Spec: Home v2 revision brief — "Friends card now supports two primary
 * actions: Train Together, Challenge."
 *
 * Opened from TrainTogetherCard's "Choose Someone" row — Home itself stays a
 * single-CTA-per-row surface (Product DNA: elegance over complexity), while
 * this sheet exposes both actions. Routes to S-10 Train Together and the
 * FRIENDS-context C-2 Create Challenge flow (Challenge Amendment 002) once
 * those screens exist — both handlers are currently caller-supplied no-ops
 * (see the screen's `home-navigation` TODOs).
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius } from '@/constants/foundation'
import { BottomSheet } from '../../composites/BottomSheet'
import { ChevronRightIcon, FlameIcon, SquadIcon } from '../../primitives/icons/HomeIcons'

export interface FriendActionSheetProps {
  open: boolean
  onClose: () => void
  onTrainTogether?: () => void
  onChallenge?: () => void
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.actionRow}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel}>{label}</Text>
      <ChevronRightIcon size={18} color={flColor.gray600} />
    </Pressable>
  )
}

export function FriendActionSheet({ open, onClose, onTrainTogether, onChallenge }: FriendActionSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Friends">
      <ActionRow
        icon={<FlameIcon size={20} />}
        label="Train Together"
        onPress={() => {
          onClose()
          onTrainTogether?.()
        }}
      />
      <ActionRow
        icon={<SquadIcon size={20} />}
        label="Challenge"
        onPress={() => {
          onClose()
          onChallenge?.()
        }}
      />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: flColor.cream100,
  },
})
