/**
 * Tier: 3 (Composition)
 * Spec: Home v2 revision — unified Train Together card.
 *
 * Replaces the old two-row Squad/Friends split (formerly
 * TrainTogetherSection) with a single presence-first card: whoever from the
 * athlete's squad or friends is training right now leads; "Choose Someone"
 * (the existing Friends sheet entry point) always follows, and becomes the
 * primary action when no one is live. There is no manual "Go Live" control
 * anywhere in the app — presence is derived entirely from an athlete's own
 * workout session (`useWorkoutSession`), never toggled directly.
 */

import React, { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius, flShadow, flType } from '@/constants/foundation'
import { Avatar } from '../../composites/Avatar'
import { SectionHeader } from '../../composites/SectionHeader'
import { ChevronRightIcon, FriendsIcon } from '../../primitives/icons/HomeIcons'
import type { LiveTrainingUser } from '@/types/liveTraining'

export interface TrainTogetherCardProps {
  liveUsers: LiveTrainingUser[]
  onJoinLiveUser: (userId: string) => void
  onChoosePartner: () => void
}

/** Squad ranks above friends (closer-trust default, matching the existing Performance Firewall squad/friends split); within a source, the freshest session is most relevant. */
function mostRelevantFirst(users: LiveTrainingUser[]): LiveTrainingUser[] {
  return [...users].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'squad' ? -1 : 1
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  })
}

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

export function TrainTogetherCard({ liveUsers, onJoinLiveUser, onChoosePartner }: TrainTogetherCardProps) {
  const sortedLiveUsers = useMemo(() => mostRelevantFirst(liveUsers), [liveUsers])
  const primary = sortedLiveUsers[0]

  return (
    <View>
      <SectionHeader label="Train Together" />
      <View style={styles.container}>
        {primary ? (
          <>
            <Pressable
              onPress={() => onJoinLiveUser(primary.id)}
              accessibilityRole="button"
              accessibilityLabel={`${primary.name} is training ${primary.workoutName}. Started ${minutesAgo(primary.startedAt)} minutes ago. Double-tap to join or view.`}
              style={styles.row}
            >
              <Avatar name={primary.name} src={primary.avatarUrl} size="listRow" presence />
              <View style={styles.rowBody}>
                <Text style={styles.liveLabel}>Live Now</Text>
                <Text style={flType.displayCardName} numberOfLines={1}>
                  {primary.name} is training {primary.workoutName}
                </Text>
                <Text style={flType.bodySmall} numberOfLines={1}>
                  Started {minutesAgo(primary.startedAt)} min ago
                  {sortedLiveUsers.length > 1 ? ` · ${sortedLiveUsers.length} training now` : ''}
                </Text>
              </View>
              <View style={styles.joinAction}>
                <Text style={styles.joinText}>Join / View</Text>
                <ChevronRightIcon size={16} color={flColor.bronze400} />
              </View>
            </Pressable>

            <View style={styles.divider} />
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Text style={flType.bodySmall}>No one training now</Text>
          </View>
        )}

        <Pressable
          onPress={onChoosePartner}
          accessibilityRole="button"
          accessibilityLabel="Choose someone to train with — pick a squadmate or friend."
          style={styles.row}
        >
          <View style={[styles.friendsIcon, !primary && styles.friendsIconEmphasized]}>
            <FriendsIcon />
          </View>
          <View style={styles.rowBody}>
            <Text style={flType.displayCardName}>Choose Someone</Text>
            <Text style={flType.bodySmall}>Train with a squadmate or friend</Text>
          </View>
          <ChevronRightIcon size={20} color={flColor.gray600} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 16,
    boxShadow: flShadow.trainTogetherCard,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 14,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: flColor.greenMuted,
  },
  joinAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  joinText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: flColor.bronze400,
  },
  emptyRow: {
    paddingVertical: 14,
  },
  friendsIcon: {
    width: 54,
    height: 54,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsIconEmphasized: {
    borderColor: flColor.bronzeBorder,
    boxShadow: flShadow.glowSubtle,
  },
  divider: {
    height: 1,
    backgroundColor: flColor.charcoal600,
  },
})
