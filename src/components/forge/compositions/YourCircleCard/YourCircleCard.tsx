/**
 * YourCircleCard — the Home "Your Circle" living-presence card.
 * Source of truth: Forge Home.dc.html (§ Your Circle, lines 188–254).
 *
 * One card: LIVE NOW (whoever from the squad/friends is training right now — earns
 * the bronze accent ring only when someone is live), then a FRIEND ACTIVITY row
 * (reads like a miniature post), then a grouped-table footer into the feed. The
 * dc's optional "Workout Invite" sub-block is omitted for now (default no invite).
 *
 * Reworks the Phase-2 `TrainTogetherCard` to match the dc. Data: live presence +
 * friend activity are PLACEHOLDER (`LIVE_TRAINING_USERS` / `FRIEND_ACTIVITY`) — no
 * Social/presence backend yet.
 */

import React, { useMemo } from 'react'
import Svg, { Path } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flFont, flRadius, flShadow, flType } from '@/constants/foundation'
import { Avatar } from '../../composites/Avatar'
import { SectionHeader } from '../../composites/SectionHeader'
import { ChevronRightIcon } from '../../primitives/icons/HomeIcons'
import type { LiveTrainingUser } from '@/types/liveTraining'

export interface FriendActivity {
  name: string
  quote: string
}

export interface YourCircleCardProps {
  liveUsers: LiveTrainingUser[]
  friendActivity: FriendActivity
  onJoinLive: (userId: string) => void
  onFriendActivity: () => void
  onSeeCircle: () => void
}

function mostRelevantFirst(users: LiveTrainingUser[]): LiveTrainingUser[] {
  return [...users].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'squad' ? -1 : 1
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  })
}
function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

/** Post-type glyph (progress comparison) — the corner badge on a friend-activity avatar. */
function ProgressGlyph() {
  return (
    <View style={styles.glyphBadge}>
      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
        <Path d="M12 20V4" />
        <Path d="M6 10l6-6 6 6" />
      </Svg>
    </View>
  )
}

export function YourCircleCard({ liveUsers, friendActivity, onJoinLive, onFriendActivity, onSeeCircle }: YourCircleCardProps) {
  const sorted = useMemo(() => mostRelevantFirst(liveUsers), [liveUsers])
  const live = sorted[0]
  const others = sorted.length - 1

  return (
    <View>
      <SectionHeader label="Your Circle" />
      <View style={[styles.card, live ? styles.cardLive : null]}>
        {live ? (
          <View style={styles.liveBlock}>
            <View style={styles.liveHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Live Now</Text>
              {others > 0 ? <Text style={styles.othersText}>+{others} more training</Text> : null}
            </View>
            <View style={styles.liveRow}>
              <Pressable
                onPress={() => onJoinLive(live.id)}
                accessibilityRole="button"
                accessibilityLabel={`${live.name} is training ${live.workoutName}, started ${minutesAgo(live.startedAt)} minutes ago`}
                style={styles.livePerson}
              >
                <Avatar name={live.name} src={live.avatarUrl} size="listRow" presence />
                <View style={styles.livePersonText}>
                  <Text style={styles.liveName} numberOfLines={1}>
                    {live.name}
                  </Text>
                  <Text style={flType.bodySmall} numberOfLines={1}>
                    {live.workoutName} · {minutesAgo(live.startedAt)} min
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => onJoinLive(live.id)} accessibilityRole="button" accessibilityLabel="Join workout" style={styles.joinBtn}>
                <Text style={styles.joinText}>Join</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onFriendActivity}
          accessibilityRole="button"
          accessibilityLabel={`See ${friendActivity.name}'s update`}
          style={styles.friendRow}
        >
          <View style={styles.friendAvatar}>
            <Avatar name={friendActivity.name} size="listRow" />
            <ProgressGlyph />
          </View>
          <View style={styles.friendBody}>
            <Text style={styles.friendName}>{friendActivity.name}</Text>
            <Text style={styles.friendQuote}>{friendActivity.quote}</Text>
          </View>
        </Pressable>

        <Pressable onPress={onSeeCircle} accessibilityRole="button" accessibilityLabel="See your circle" style={styles.footer}>
          <Text style={styles.footerText}>See your circle</Text>
          <ChevronRightIcon size={14} color={flColor.gray400} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    padding: 16,
    boxShadow: flShadow.trainTogetherCard,
  },
  cardLive: {
    borderColor: flColor.bronzeBorder,
  },
  liveBlock: {
    gap: 12,
    padding: 14,
    marginBottom: 16,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: flColor.greenMuted,
    boxShadow: flShadow.presenceDotGlow,
  },
  liveLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  othersText: {
    marginLeft: 'auto',
    fontSize: 12,
    color: flColor.gray400,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  livePerson: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  livePersonText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  liveName: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
  },
  joinBtn: {
    flexShrink: 0,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: flColor.bronze300,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    marginHorizontal: -8,
    padding: 8,
    borderRadius: flRadius.lg,
  },
  friendAvatar: {
    position: 'relative',
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  glyphBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: flRadius.round,
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBody: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: flColor.cream100,
  },
  friendQuote: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 23,
    color: flColor.cream100,
    opacity: 0.9,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: -16,
    marginTop: 16,
    marginBottom: -16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: flColor.bronzeBorderSubtle,
    borderBottomLeftRadius: flRadius.xl,
    borderBottomRightRadius: flRadius.xl,
    backgroundColor: flColor.charcoal800,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: flColor.gray400,
  },
})
