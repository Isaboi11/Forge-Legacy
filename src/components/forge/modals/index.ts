/**
 * Forge Modal & Overlay Library v1.0
 * Barrel export — import from '@/components/forge/modals'
 */

// Components
export { ForgeModal }              from './ForgeModal'
export { ForgeConfirmationModal }  from './ForgeConfirmationModal'
export { ForgeBottomSheet }        from './ForgeBottomSheet'
export { ForgeActionSheet }        from './ForgeActionSheet'
export { ForgePickerModal }        from './ForgePickerModal'
export { ForgeMediaModal }         from './ForgeMediaModal'
export { ForgeLoadingModal }       from './ForgeLoadingModal'
export { ForgeSuccessModal }       from './ForgeSuccessModal'
export { ForgeErrorModal }         from './ForgeErrorModal'
export { ForgePremiumModal }       from './ForgePremiumModal'
export { ForgeFormModal }          from './ForgeFormModal'

// Types
export type {
  // Shared
  ModalAction,

  // ForgeModal
  ModalVariant,
  ModalState,
  ForgeModalProps,

  // ForgeConfirmationModal
  ConfirmationTone,
  ForgeConfirmationModalProps,

  // ForgeBottomSheet
  BottomSheetSize,
  ForgeBottomSheetProps,

  // ForgeActionSheet
  ActionItemVariant,
  ActionSheetItem,
  ForgeActionSheetProps,

  // ForgePickerModal
  PickerItem,
  PickerFilter,
  PickerMode,
  ForgePickerModalProps,

  // ForgeMediaModal
  ForgeMediaModalProps,

  // ForgeLoadingModal
  LoadingStatus,
  ForgeLoadingModalProps,

  // ForgeSuccessModal
  ForgeSuccessModalProps,

  // ForgeErrorModal
  ErrorVariant,
  ForgeErrorModalProps,

  // ForgePremiumModal
  PremiumBenefit,
  ForgePremiumModalProps,

  // ForgeFormModal
  ForgeFormModalProps,
} from './types'
