/**
 * Forge Navigation Library v1.0
 * Barrel export — import from '@/components/forge/navigation'
 */

// Components
export { ForgeTopBar }          from './ForgeTopBar'
export { ForgeBottomNav }       from './ForgeBottomNav'
export { ForgeBackButton }      from './ForgeBackButton'
export { ForgeTabNavigation }   from './ForgeTabNavigation'
export { ForgeSegmentedControl } from './ForgeSegmentedControl'
export { ForgeStepNavigation }  from './ForgeStepNavigation'
export { ForgePagination }      from './ForgePagination'
export { ForgeBreadcrumbs }     from './ForgeBreadcrumbs'
export { ForgeOverflowMenu }    from './ForgeOverflowMenu'
export { ForgeSearchHeader }    from './ForgeSearchHeader'

// Types
export type {
  // TopBar
  TopBarVariant,
  ForgeTopBarProps,
  // BottomNav
  ForgeBottomNavProps,
  BottomNavItem,
  // BackButton
  BackButtonVariant,
  ForgeBackButtonProps,
  // TabNavigation
  TabVariant,
  TabItem,
  ForgeTabNavigationProps,
  // SegmentedControl
  SegmentOption,
  ForgeSegmentedControlProps,
  // StepNavigation
  StepVariant,
  StepStatus,
  Step,
  ForgeStepNavigationProps,
  // Pagination
  PaginationVariant,
  ForgePaginationProps,
  // Breadcrumbs
  Breadcrumb,
  ForgeBreadcrumbsProps,
  // OverflowMenu
  MenuItemVariant,
  MenuItem,
  OverflowTriggerStyle,
  OverflowPlacement,
  ForgeOverflowMenuProps,
  // SearchHeader
  SearchHeaderState,
  ForgeSearchHeaderProps,
} from './types'
