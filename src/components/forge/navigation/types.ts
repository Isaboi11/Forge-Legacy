/**
 * Forge Navigation Library — shared TypeScript types
 */

// ─── ForgeTopBar ─────────────────────────────────────────────────────────────

export type TopBarVariant =
  | 'default'
  | 'largeTitle'
  | 'backNavigation'
  | 'modal'
  | 'transparent'
  | 'collapsed'

export interface TopBarLeadingAction {
  /** Visible label (used for iconWithLabel back button) */
  label?: string
  onPress: () => void
  accessibilityLabel: string
}

export interface TopBarTrailingAction {
  /** Feather icon name */
  iconName: string
  onPress: () => void
  accessibilityLabel: string
  /** Show a numeric or dot badge on this action */
  badge?: boolean
  badgeCount?: number
}

export interface ForgeTopBarProps {
  variant?: TopBarVariant
  title?: string
  subtitle?: string
  /** Overline label shown above largeTitle */
  overline?: string
  leadingAction?: TopBarLeadingAction
  trailingActions?: TopBarTrailingAction[]
  /** Show avatar glyph in right slot (largeTitle variant) */
  showAvatar?: boolean
  /** Show search icon as trailing action */
  showSearch?: boolean
  /** Show bell notification icon as trailing action */
  showNotification?: boolean
  notificationCount?: number
  loading?: boolean
  /** Cancel label for modal variant */
  cancelLabel?: string
  /** Save / confirm label for modal variant */
  saveLabel?: string
  onCancel?: () => void
  onSave?: () => void
  accessibilityLabel?: string
}

// ─── ForgeBottomNav ──────────────────────────────────────────────────────────

export interface BottomNavItem {
  key: string
  /** Feather icon name */
  iconName: string
  label: string
  active?: boolean
  badgeCount?: number
  /** Show a dot badge (unread indicator) without a count */
  hasBadge?: boolean
  onPress: () => void
  disabled?: boolean
}

export interface ForgeBottomNavProps {
  /** Up to 5 tab items */
  items: BottomNavItem[]
}

// ─── ForgeBackButton ─────────────────────────────────────────────────────────

export type BackButtonVariant = 'icon' | 'iconWithLabel' | 'floating' | 'circular'

export interface ForgeBackButtonProps {
  variant?: BackButtonVariant
  /** Visible label for iconWithLabel variant */
  label?: string
  onPress: () => void
  disabled?: boolean
  accessibilityLabel?: string
}

// ─── ForgeTabNavigation ──────────────────────────────────────────────────────

export type TabVariant = 'pill' | 'underline' | 'segmented' | 'card' | 'scrollable'

export interface TabItem {
  key: string
  label: string
  /** Sub-value displayed under label in card variant */
  value?: string
  disabled?: boolean
}

export interface ForgeTabNavigationProps {
  variant?: TabVariant
  items: TabItem[]
  activeKey: string
  onPress: (key: string) => void
}

// ─── ForgeSegmentedControl ───────────────────────────────────────────────────

export interface SegmentOption {
  key: string
  label: string
}

export interface ForgeSegmentedControlProps {
  options: SegmentOption[]
  activeKey: string
  onChange: (key: string) => void
  disabled?: boolean
}

// ─── ForgeStepNavigation ─────────────────────────────────────────────────────

export type StepVariant = 'horizontalProgress' | 'numbered' | 'dots' | 'vertical'

export type StepStatus = 'completed' | 'current' | 'upcoming' | 'disabled'

export interface Step {
  key: string
  label?: string
  status: StepStatus
}

export interface ForgeStepNavigationProps {
  variant?: StepVariant
  steps: Step[]
}

// ─── ForgePagination ─────────────────────────────────────────────────────────

export type PaginationVariant = 'dots' | 'bars' | 'numbers' | 'fraction'

export interface ForgePaginationProps {
  variant?: PaginationVariant
  /** Total number of pages */
  total: number
  /** 0-indexed current page */
  current: number
  /** Called with 0-indexed page number */
  onPress?: (page: number) => void
}

// ─── ForgeBreadcrumbs ────────────────────────────────────────────────────────

export interface Breadcrumb {
  key: string
  label: string
  /** Omit onPress for the current (final) breadcrumb */
  onPress?: () => void
}

export interface ForgeBreadcrumbsProps {
  items: Breadcrumb[]
}

// ─── ForgeOverflowMenu ───────────────────────────────────────────────────────

export type MenuItemVariant = 'normal' | 'selected' | 'disabled' | 'destructive'

export interface MenuItem {
  key: string
  label: string
  /** Feather icon name */
  iconName?: string
  variant?: MenuItemVariant
  onPress?: () => void
}

export type OverflowTriggerStyle = 'dotsVertical' | 'dotsHorizontal' | 'dropdownButton'

export type OverflowPlacement = 'dropdown' | 'bottomSheet'

export interface ForgeOverflowMenuProps {
  items: MenuItem[]
  triggerStyle?: OverflowTriggerStyle
  /** Label shown on dropdown-button trigger */
  triggerLabel?: string
  placement?: OverflowPlacement
  accessibilityLabel?: string
}

// ─── ForgeSearchHeader ───────────────────────────────────────────────────────

export type SearchHeaderState = 'default' | 'focused' | 'typing' | 'results' | 'empty'

export interface ForgeSearchHeaderProps {
  placeholder?: string
  value: string
  onChangeText: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onClear?: () => void
  onCancel?: () => void
  onBack?: () => void
  onFilter?: () => void
  /** Controlled state — drives layout transitions */
  state?: SearchHeaderState
  loading?: boolean
  showFilter?: boolean
  accessibilityLabel?: string
}
