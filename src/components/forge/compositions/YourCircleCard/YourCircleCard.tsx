/**
 * YourCircleCard — the Home "Your Circle" living-presence card.
 * Source of truth: Forge Home.dc.html (§ Your Circle, lines 188–254).
 *
 * One card: LIVE NOW (whoever from the squad/friends is training right now — earns
 * the bronze accent ring only when someone is live), then a FRIEND ACTIVITY row
 * (reads like a miniature post), then a grouped-table footer into the feed. The
 * dc's optional "Workout Invite" sub-block is omitted for now (default no invite).
 *
 * Reworks the Phase-2 `TrainTogetherCard` to match the dc.
 *
 * DATA. Both halves are real. `friendActivity` is the newest post in the friends feed (0074);
 * `liveUsers` is `training_now()` (0086), squad-mates and accepted friends currently mid-workout, each
 * gated on their own `visibility.training` audience.
 *
 * SQUAD OUTRANKS FRIEND when several people are training at once — the person you actually lift
 * alongside leads, and the overflow line names their squad ("2 more from Iron Vigil") rather than
 * reporting a bare number. A count says only that a number exists; a squad name says who.
 *
 * TWO KINDS OF EMPTY, and they deserve different answers. An athlete WITH friends whose circle happens
 * to be quiet gets a quiet line — there is nothing for them to do, and a button would invent a task. An
 * athlete with NO friends gets the step that changes it. Same card, opposite advice, and telling them
 * apart is the whole reason `hasCircle` is a prop rather than something inferred from an empty list.
 *
 * THE INVITATION IS AN ASPIRATION, NOT A WARNING. The first draft read "training is better with people
 * who notice when you don't show up" — which casts the athlete as someone who doesn't, and the circle as
 * a watch rota. CC-D3 forbids exactly that shape: nothing here may imply a shortfall. "Every legacy is
 * built alongside someone" says why it is worth doing without saying anything about who they are.
 */

import React, { useMemo } from 'react'
import Svg, { Path } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flFont, flRadius, flShadow, flType } from '@/constants/foundation'
import { Avatar } from '../../composites/Avatar'
import { SectionHeader } from '../../composites/SectionHeader'
import { ChevronRightIcon } from '../../primitives/icons/HomeIcons'
import { minutesTraining, othersLine, type TrainingAthlete } from '@/data/presence-live'

export interface FriendActivity {
  name: string
  quote: string
  avatarUrl?: string | null
}

export interface YourCircleCardProps {
  liveUsers: TrainingAthlete[]
  /** Null when nobody in the circle has posted — the row is omitted rather than drawn empty. */
  friendActivity?: FriendActivity | null
  /** Whether they have anyone at all. False turns the empty state from an observation into a step. */
  hasCircle?: boolean
  onAddFriends?: () => void
  /** Opens the athlete. S-10 Train Together (joining their session) is unbuilt; their profile is real. */
  onJoinLive: (userId: string) => void
  onFriendActivity: () => void
  onSeeCircle: () => void
}

/** `training_now()` already returns squad-first then most-recent; this keeps the guarantee local too. */
function mostRelevantFirst(users: TrainingAthlete[]): TrainingAthlete[] {
  return [...users].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'squad' ? -1 : 1
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  })
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

export function YourCircleCard({ liveUsers, friendActivity, hasCircle = true, onAddFriends, onJoinLive, onFriendActivity, onSeeCircle }: YourCircleCardProps) {
  const sorted = useMemo(() => mostRelevantFirst(liveUsers), [liveUsers])
  const live = sorted[0]
  const others = othersLine(sorted.slice(1))

  return (
    <View>
      <SectionHeader label="Your Circle" />
      <View style={[styles.card, live ? styles.cardLive : null]}>
        {live ? (
          <View style={styles.liveBlock}>
            <View style={styles.liveHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Live Now</Text>
              {others ? <Text style={styles.othersText}>{others}</Text> : null}
            </View>
            <View style={styles.liveRow}>
              <Pressable
                onPress={() => onJoinLive(live.userId)}
                accessibilityRole="button"
                accessibilityLabel={`${live.name} is training${live.label ? ` ${live.label}` : ''}, started ${minutesTraining(live.startedAt)} minutes ago`}
                style={styles.livePerson}
              >
                <Avatar name={live.name} src={live.avatarUrl ?? undefined} size="listRow" presence />
                <View style={styles.livePersonText}>
                  <Text style={styles.liveName} numberOfLines={1}>
                    {live.name}
                  </Text>
                  <Text style={flType.bodySmall} numberOfLines={1}>
                    {[live.label, `${minutesTraining(live.startedAt)} min`, live.squadName].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => onJoinLive(live.userId)} accessibilityRole="button" accessibilityLabel={`View ${live.name}`} style={styles.joinBtn}>
                <Text style={styles.joinText}>View</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {friendActivity ? (
          <Pressable
            onPress={onFriendActivity}
            accessibilityRole="button"
            accessibilityLabel={`See ${friendActivity.name}'s update`}
            style={styles.friendRow}
          >
            <View style={styles.friendAvatar}>
              <Avatar name={friendActivity.name} src={friendActivity.avatarUrl ?? undefined} size="listRow" />
              <ProgressGlyph />
            </View>
            <View style={styles.friendBody}>
              <Text style={styles.friendName}>{friendActivity.name}</Text>
              <Text style={styles.friendQuote} numberOfLines={2}>
                {friendActivity.quote}
              </Text>
            </View>
          </Pressable>
        ) : !live ? (
          hasCircle ? (
            <View style={styles.quietRow}>
              <Text style={styles.quietText}>Nothing from your circle yet.</Text>
            </View>
          ) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Every legacy is built alongside someone.</Text>
              <Pressable
                onPress={onAddFriends}
                accessibilityRole="button"
                accessibilityLabel="Add friends"
                style={({ pressed }) => [styles.addBtn, pressed ? styles.addBtnPressed : null]}
              >
                <Text style={styles.addBtnText}>Add Friends</Text>
              </Pressable>
            </View>
          )
        ) : null}

        <Pressable onPress={onSeeCircle} accessibilityRole="button" accessibilityLabel="See your circle" style={styles.footer}>
          <Text style={styles.footerText}>See your circle</Text>
          <ChevronRightIcon size={14} color={flColor.gray400} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  quietRow: { paddingHorizontal: 16, paddingVertical: 18 },
  quietText: { fontSize: 13, color: flColor.gray600 },
  emptyRow: { alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 20 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  addBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  addBtnPressed: { opacity: 0.88 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
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
