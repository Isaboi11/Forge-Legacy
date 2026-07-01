/**
 * CLA-C07 — FeedPostCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §09
 *
 * Social and community feed posts.
 * Anatomy: avatar · name · timestamp · post text · optional media · reactions
 * States: default · highlighted · pinned · loading
 */

import React from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { FeedPostCardState } from './types'

export interface FeedPostCardProps {
  authorName: string
  /** Initials shown when avatarUri is absent */
  authorInitials?: string
  authorAvatarUri?: string
  timestamp: string
  postText?: string
  mediaUri?: string
  likeCount?: number
  commentCount?: number
  liked?: boolean
  state?: FeedPostCardState
  onPress?: () => void
  onLikePress?: () => void
  onCommentPress?: () => void
  onSharePress?: () => void
  onMorePress?: () => void
}

export function FeedPostCard({
  authorName,
  authorInitials = '?',
  authorAvatarUri,
  timestamp,
  postText,
  mediaUri,
  likeCount = 0,
  commentCount = 0,
  liked = false,
  state = 'default',
  onPress,
  onLikePress,
  onCommentPress,
  onSharePress,
  onMorePress,
}: FeedPostCardProps) {
  const isHighlighted = state === 'highlighted'
  const isPinned      = state === 'pinned'
  const isLoading     = state === 'loading'

  const borderColor: string = isHighlighted
    ? CARD.BORDER_BRONZE
    : CARD.BORDER

  if (isLoading) {
    return (
      <View style={[styles.base, { borderColor: CARD.BORDER }]}>
        <View style={styles.topHighlight} pointerEvents="none" />
        <View style={styles.loadingHeader}>
          <View style={styles.avatarSkeleton} />
          <View style={styles.loadingMeta}>
            <View style={[styles.loadingLine, { width: 120 }]} />
            <View style={[styles.loadingLine, { width: 80, marginTop: 4 }]} />
          </View>
        </View>
        <View style={[styles.loadingLine, { width: '90%', marginBottom: 6 }]} />
        <View style={[styles.loadingLine, { width: '70%' }]} />
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { borderColor },
        isHighlighted && styles.highlightedBase,
        pressed && onPress && styles.pressed,
      ]}
    >
      {/* Top highlight */}
      <View
        style={[
          styles.topHighlight,
          isHighlighted && styles.topHighlightBronze,
        ]}
        pointerEvents="none"
      />

      {/* Pinned label */}
      {isPinned && (
        <View style={styles.pinnedRow}>
          <Feather name="bookmark" size={11} color={color.accent.primary} />
          <Text style={styles.pinnedLabel}>Pinned</Text>
        </View>
      )}

      {/* Header row */}
      <View style={styles.header}>
        {/* Avatar */}
        {authorAvatarUri ? (
          <Image source={{ uri: authorAvatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{authorInitials.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}

        {/* Name + timestamp */}
        <View style={styles.authorMeta}>
          <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>

        {/* More options */}
        {onMorePress ? (
          <TouchableOpacity onPress={onMorePress} hitSlop={10} style={styles.moreBtn}>
            <Feather name="more-horizontal" size={16} color={color.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Post text */}
      {postText ? (
        <Text style={styles.postText}>{postText}</Text>
      ) : null}

      {/* Media */}
      {mediaUri ? (
        <View style={styles.mediaArea}>
          <Image
            source={{ uri: mediaUri }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Reaction row */}
      <View style={styles.reactions}>
        <TouchableOpacity onPress={onLikePress} style={styles.reactionBtn} activeOpacity={0.7}>
          <Feather
            name={liked ? 'heart' : 'heart'}
            size={16}
            color={liked ? color.accent.primary : color.text.tertiary}
          />
          {likeCount > 0 ? (
            <Text style={[styles.reactionCount, liked && styles.reactionCountActive]}>
              {likeCount}
            </Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCommentPress} style={styles.reactionBtn} activeOpacity={0.7}>
          <Feather name="message-circle" size={16} color={color.text.tertiary} />
          {commentCount > 0 ? (
            <Text style={styles.reactionCount}>{commentCount}</Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.reactionSpacer} />

        <TouchableOpacity onPress={onSharePress} style={styles.reactionBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={15} color={color.text.tertiary} />
        </TouchableOpacity>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    padding: CARD.PADDING,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
    gap: space.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  highlightedBase: {
    shadowColor: '#C8A97E',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: CARD.INNER_HIGHLIGHT,
  },
  topHighlightBronze: {
    backgroundColor: CARD.INNER_HIGHLIGHT_BRONZE,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: -space.xs,
  },
  pinnedLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: color.accent.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  avatar: {
    width: CARD.AVATAR_SIZE,
    height: CARD.AVATAR_SIZE,
    borderRadius: 9999,
    backgroundColor: color.background.elevated,
  },
  avatarFallback: {
    width: CARD.AVATAR_SIZE,
    height: CARD.AVATAR_SIZE,
    borderRadius: 9999,
    backgroundColor: color.info,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  timestamp: {
    fontSize: 13,
    color: color.text.tertiary,
  },
  moreBtn: {
    padding: space.xs,
  },
  postText: {
    fontSize: 15,
    color: color.text.primary,
    lineHeight: 22,
  },
  mediaArea: {
    borderRadius: 6,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: color.background.elevated,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  reactionCount: {
    fontSize: 13,
    color: color.text.tertiary,
  },
  reactionCountActive: {
    color: color.accent.primary,
  },
  reactionSpacer: {
    flex: 1,
  },
  // Loading skeleton
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.sm,
  },
  avatarSkeleton: {
    width: CARD.AVATAR_SIZE,
    height: CARD.AVATAR_SIZE,
    borderRadius: 9999,
    backgroundColor: color.skeleton,
  },
  loadingMeta: {
    flex: 1,
  },
  loadingLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: color.skeleton,
  },
  pressed: {
    opacity: 0.82,
  },
})
