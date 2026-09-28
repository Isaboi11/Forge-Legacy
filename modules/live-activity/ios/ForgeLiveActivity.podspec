#
# ForgeLiveActivity — the phone half of the lock-screen / Dynamic Island workout card.
#
# A LOCAL Expo module, picked up by `expo-modules-autolinking` from `./modules` exactly like
# `modules/watch-bridge` (see that podspec's header). `Docs/Live-Activities-Build-Plan.md` §3.
#
# ⚠ Its own pod, NOT folded into ForgeWatchBridge. That one links WatchConnectivity, this one ActivityKit,
#   and they fail independently: a paired watch with Live Activities switched off is normal.
#
# ⚠ iOS 16.4 matches `MinimumOSVersion` in the shipped binary. ActivityKit needs 16.1 and the
#   `ActivityContent` / `staleDate` API 16.2, so nothing in the Swift needs an `#available` branch.
#
Pod::Spec.new do |s|
  s.name           = 'ForgeLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Starts, updates and ends the Forge Legacy workout Live Activity.'
  s.description    = 'ActivityKit bridge: JSON in from the workout screen, one Live Activity out.'
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'Forge Legacy'
  s.homepage       = 'https://forgelegacy.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
