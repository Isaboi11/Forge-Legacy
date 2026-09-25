#
# ForgeLabelReader — reads the text on a Nutrition Facts photo, on the phone, with Apple's Vision.
#
# A LOCAL Expo module, the same shape as `modules/watch-bridge`: autolinking scans `./modules`, and the
# `expo-module.config.json` beside it is the whole declaration. Self-contained on purpose (see that
# podspec for why there is no package.json).
#
Pod::Spec.new do |s|
  s.name           = 'ForgeLabelReader'
  s.version        = '1.0.0'
  s.summary        = 'On-device text recognition for Nutrition Facts labels.'
  s.description    = 'Runs VNRecognizeTextRequest on a photo and returns each line with its confidence and position.'
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
