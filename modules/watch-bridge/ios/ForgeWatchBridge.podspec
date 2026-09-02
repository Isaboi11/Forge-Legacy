#
# ForgeWatchBridge — the phone half of the Apple Watch companion.
#
# A LOCAL Expo module. `expo-modules-autolinking` scans `./modules` by default (its
# `nativeModulesDir`), so nothing has to be registered anywhere for this to be picked up — the
# `expo-module.config.json` beside it is the whole declaration.
#
# ⚠ Self-contained on purpose. The podspecs in `node_modules` read a sibling `package.json` for their
#   version and author; a local module has none, and adding one only to satisfy a podspec would put a
#   second, drifting copy of the app's metadata in the tree.
#
# ⚠ iOS 16.4 matches `MinimumOSVersion` in the shipped binary. WatchConnectivity itself goes back much
#   further; there is no reason for this pod to be the thing that raises the app's floor.
#
Pod::Spec.new do |s|
  s.name           = 'ForgeWatchBridge'
  s.version        = '1.0.0'
  s.summary        = 'WatchConnectivity bridge between the Forge Legacy app and its watch companion.'
  s.description    = 'Pushes the active-session projection to the wrist and relays the three commands back.'
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'Forge Legacy'
  s.homepage       = 'https://forgelegacy.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
