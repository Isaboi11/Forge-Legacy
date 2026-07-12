import type { ReactNode } from 'react'

// ─── Shared primitives ────────────────────────────────────────────────────────

export interface ModalAction {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  accessibilityLabel?: string
}

// ─── ForgeModal ───────────────────────────────────────────────────────────────

export type ModalVariant = 'small' | 'medium' | 'large' | 'fullScreen'
export type ModalState   = 'default' | 'loading' | 'disabled' | 'error'

export interface ForgeModalProps {
  visible: boolean
  onClose?: () => void

  // Content slots
  title?: string
  subtitle?: string
  /** Feather icon name shown in the 40×40 header icon box */
  iconName?: string
  /** Overrides the icon box entirely (e.g. an Image) */
  illustration?: ReactNode
  children?: ReactNode
  footer?: ReactNode

  // Actions (rendered in the footer when `footer` is not provided)
  primaryAction?: ModalAction
  secondaryAction?: ModalAction

  // Behaviour
  variant?: ModalVariant
  state?: ModalState
  scrollable?: boolean
  dismissible?: boolean
  loading?: boolean

  // Accessibility
  accessibilityLabel?: string
}

// ─── ForgeConfirmationModal ───────────────────────────────────────────────────

export type ConfirmationTone = 'success' | 'warning' | 'danger'

export interface ForgeConfirmationModalProps {
  visible: boolean
  tone?: ConfirmationTone

  /** Feather icon name displayed in the tone circle */
  iconName?: string
  title: string
  description?: string

  primaryAction: ModalAction
  secondaryAction?: ModalAction

  dismissible?: boolean
  onClose?: () => void
  accessibilityLabel?: string
}

// ─── ForgeBottomSheet ─────────────────────────────────────────────────────────

export type BottomSheetSize = 'small' | 'medium' | 'large' | 'fullHeight'

export interface ForgeBottomSheetProps {
  visible: boolean
  onClose?: () => void

  size?: BottomSheetSize
  dragHandle?: boolean
  header?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  scrollableContent?: boolean

  dismissible?: boolean
  accessibilityLabel?: string
}

// ─── ForgeActionSheet ─────────────────────────────────────────────────────────

export type ActionItemVariant = 'normal' | 'selected' | 'destructive' | 'disabled'

export interface ActionSheetItem {
  key: string
  label: string
  /** Feather icon name */
  iconName?: string
  variant?: ActionItemVariant
  onPress?: () => void
}

export interface ForgeActionSheetProps {
  visible: boolean
  onClose: () => void

  /** Optional context label shown above the items */
  title?: string
  items: ActionSheetItem[]
  cancelLabel?: string

  accessibilityLabel?: string
}

// ─── ForgePickerModal ─────────────────────────────────────────────────────────

export interface PickerItem {
  key: string
  label: string
  subtitle?: string
  /** Feather icon name */
  iconName?: string
}

export interface PickerFilter {
  key: string
  label: string
}

/** 'list' — search/filter/select; 'date' — month calendar grid (spec §06) */
export type PickerMode = 'list' | 'date'

export interface ForgePickerModalProps {
  visible: boolean
  onClose: () => void

  mode?: PickerMode

  title?: string
  placeholder?: string
  searchValue?: string
  onSearchChange?: (text: string) => void

  filters?: PickerFilter[]
  activeFilter?: string
  onFilterChange?: (key: string) => void

  /** List mode only */
  items?: PickerItem[]
  selectedKeys?: string[]
  multiSelect?: boolean
  onSelectionChange?: (keys: string[]) => void

  confirmLabel?: string
  onConfirm?: (keys: string[]) => void

  // Date mode (spec §06 date-grid variant)
  selectedDate?: Date
  onDateChange?: (date: Date) => void
  onConfirmDate?: (date: Date) => void

  accessibilityLabel?: string
}

// ─── ForgeMediaModal ──────────────────────────────────────────────────────────

export interface ForgeMediaModalProps {
  visible: boolean
  onClose: () => void

  /** Image or Video element */
  media: ReactNode
  caption?: string
  metadata?: string

  showZoom?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void

  // Video chrome (spec §07 video variant — playback · scrubber · close)
  /** Context chip in the top chrome, e.g. "Form Check" */
  badge?: string
  /** Title above the scrubber, e.g. "Squat · Depth Review" */
  videoTitle?: string
  /** Current playback position in seconds */
  positionSeconds?: number
  /** Clip length in seconds — when set, the scrubber chrome renders */
  durationSeconds?: number
  /** Tap-to-seek on the scrubber track */
  onSeek?: (seconds: number) => void

  accessibilityLabel?: string
}

// ─── ForgeLoadingModal ────────────────────────────────────────────────────────

export type LoadingStatus = 'loading' | 'success' | 'failure'

export interface ForgeLoadingModalProps {
  visible: boolean
  status?: LoadingStatus
  title?: string
  message?: string
  progress?: number   // 0-1 for optional progress display
  onDismiss?: () => void
  accessibilityLabel?: string
}

// ─── ForgeSuccessModal ────────────────────────────────────────────────────────

export interface ForgeSuccessModalProps {
  visible: boolean
  onClose?: () => void

  /** Feather icon name inside the ceremony circle */
  iconName?: string
  overline?: string
  title: string
  description?: string

  primaryAction?: ModalAction
  secondaryAction?: ModalAction

  accessibilityLabel?: string
}

// ─── ForgeErrorModal ──────────────────────────────────────────────────────────

export type ErrorVariant = 'network' | 'upload' | 'session' | 'generic'

export interface ForgeErrorModalProps {
  visible: boolean
  onClose?: () => void

  variant?: ErrorVariant
  /** Feather icon name */
  iconName?: string
  title?: string
  description?: string

  primaryAction?: ModalAction
  secondaryAction?: ModalAction

  accessibilityLabel?: string
}

// ─── ForgePremiumModal ────────────────────────────────────────────────────────

export interface PremiumBenefit {
  key: string
  label: string
}

export interface ForgePremiumModalProps {
  visible: boolean
  onClose?: () => void

  illustration?: ReactNode
  overline?: string
  title?: string
  benefits?: PremiumBenefit[]
  pricingLine?: string

  primaryAction?: ModalAction
  secondaryAction?: ModalAction

  accessibilityLabel?: string
}

// ─── ForgeFormModal ───────────────────────────────────────────────────────────

export interface ForgeFormModalProps {
  visible: boolean
  onClose?: () => void

  title?: string
  description?: string
  children?: ReactNode

  primaryAction?: ModalAction
  secondaryAction?: ModalAction

  /** Inline validation error shown below children */
  errorMessage?: string
  loading?: boolean

  accessibilityLabel?: string
}
