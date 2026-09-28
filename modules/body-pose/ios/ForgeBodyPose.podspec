#
# ForgeBodyPose — finds the athlete's joints in a form-check clip, on the phone, with Apple's Vision.
#
# A LOCAL Expo module, the same shape as `modules/label-reader`: autolinking scans `./modules`, and the
# `expo-module.config.json` beside it is the whole declaration. Self-contained on purpose (see the
# watch-bridge podspec for why there is no package.json). Vision and AVFoundation are system frameworks
# and link through the Swift imports, exactly as label-reader's Vision does.
#
Pod::Spec.new do |s|
  s.name           = 'ForgeBodyPose'
  s.version        = '1.0.0'
  s.summary        = 'On-device body pose for form-check clips.'
  s.description    = 'Runs VNDetectHumanBodyPoseRequest over a video (dense, sampled) or over still images and returns raw joints.'
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
