import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

// ─── Shared ──────────────────────────────────────────────────────────────────

export type BarHeight = 'thin' | 'default' | 'thick'
export type CircularSize = 'small' | 'medium' | 'large'
export type StreakState = 'active' | 'paused' | 'broken'
export type CountdownState = 'active' | 'warning' | 'complete'
export type MilestoneNodeState = 'completed' | 'current' | 'locked'

// ─── ForgeProgressBar ────────────────────────────────────────────────────────

export interface ForgeProgressBarProps {
  /** 0–100 */
  percentage: number
  height?: BarHeight
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeXPProgressBar ──────────────────────────────────────────────────────

export interface ForgeXPProgressBarProps {
  /** Current XP within the level */
  current: number
  /** XP required to reach next level */
  total: number
  currentLevel: number
  nextLevel: number
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeProgramProgress ────────────────────────────────────────────────────

export interface ForgeProgramProgressProps {
  programName: string
  completedSessions: number
  totalSessions: number
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeWorkoutProgress ────────────────────────────────────────────────────

export interface ForgeWorkoutProgressProps {
  totalSets: number
  completedSets: number
  /** Index of the set currently in progress (0-indexed). -1 = none active. */
  activeSet?: number
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeCircularProgress ───────────────────────────────────────────────────

export interface ForgeCircularProgressProps {
  /** 0–100 */
  percentage: number
  size?: CircularSize
  /** Content rendered at the center of the ring */
  centerContent?: ReactNode
  /** Background color of the hole (defaults to transparent for composability) */
  centerBg?: string
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeGoalProgress ───────────────────────────────────────────────────────

export type GoalType = 'strength' | 'consistency' | 'endurance' | 'habit'

export interface ForgeGoalProgressProps {
  goalLabel: string
  /** Formatted current value string, e.g. "145" */
  currentValue: string
  /** Formatted target value string, e.g. "200 lb" */
  targetValue: string
  /** 0–100 */
  percentage: number
  goalType: GoalType
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeChallengeProgress ──────────────────────────────────────────────────

export interface ForgeChallengeProgressProps {
  challengeName: string
  currentDay: number
  totalDays: number
  /** e.g. "On track", "Behind", "Complete" */
  statusLabel?: string
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeRankProgress ───────────────────────────────────────────────────────

export interface ForgeRankProgressProps {
  currentRank: string
  nextRank: string
  currentRP: number
  requiredRP: number
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeStreakIndicator ─────────────────────────────────────────────────────

export interface ForgeStreakIndicatorProps {
  count: number
  state?: StreakState
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeCountdownProgress ──────────────────────────────────────────────────

export interface ForgeCountdownProgressProps {
  /** Seconds remaining */
  secondsRemaining: number
  /** Total duration in seconds */
  totalSeconds: number
  state?: CountdownState
  /** Render style: 'circular' shows the ring; 'linear' shows the bar */
  variant?: 'circular' | 'linear'
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeLoadingProgress ────────────────────────────────────────────────────

export type LoadingVariant = 'determinate' | 'indeterminate' | 'spinner'

export interface ForgeLoadingProgressProps {
  variant?: LoadingVariant
  /** 0–100; only used for determinate */
  percentage?: number
  /** Optional label rendered below the bar */
  label?: string
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

// ─── ForgeMilestoneProgress ──────────────────────────────────────────────────

export interface MilestoneNode {
  key: string
  label: string
  state: MilestoneNodeState
}

export interface ForgeMilestoneProgressProps {
  milestones: MilestoneNode[]
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}
