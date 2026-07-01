import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glowing'

export type StatCardState = 'default' | 'positive' | 'warning' | 'locked'
export type TrendDirection = 'up' | 'down' | 'neutral'

export type ProgramCardState = 'notStarted' | 'inProgress' | 'completed' | 'locked'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export type WorkoutCardState = 'upcoming' | 'active' | 'completed' | 'missed'

export type HonorCardState = 'earned' | 'locked' | 'hidden' | 'featured'

export type ChallengeCardState = 'open' | 'active' | 'completed' | 'lost' | 'expired'

export type LegacyCardState = 'default' | 'featured' | 'achieved' | 'locked'

export type MediaCardState = 'default' | 'loading' | 'uploading' | 'error' | 'selected'

export type FeedPostCardState = 'default' | 'highlighted' | 'pinned' | 'loading'

export type CompactTrailingVariant = 'chevron' | 'badge' | 'toggle' | 'checkbox' | 'button' | 'number'

export type BannerVariant = 'bronze' | 'info' | 'warning' | 'success' | 'error'

export type SkeletonVariant = 'base' | 'stat' | 'media' | 'feed' | 'compact'

export interface BaseCardProps {
  variant?: CardVariant
  title?: string
  subtitle?: string
  leadingIcon?: ReactNode
  trailingAction?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  selected?: boolean
  style?: ViewStyle
  minHeight?: number
  accessibilityLabel?: string
  accessibilityHint?: string
}
