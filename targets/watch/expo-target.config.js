/**
 * Forge Legacy — Apple Watch companion target.
 *
 * Read by `@bacons/apple-targets` at `expo prebuild`. Everything in this directory is linked into the
 * generated Xcode project as its own watchOS app target; nothing here is React Native. The watch is a
 * REMOTE for the phone (Docs/Apple-Watch-Companion-Build-Plan.md §0) — the phone stays the source of
 * truth for the session and this app only ever mirrors it.
 *
 * ⚠ Any change to THIS file or to app.json needs a fresh `expo prebuild --clean`; Swift edits do not.
 * ⚠ This is a native change: it needs a new build number and a real `eas build`, never an OTA.
 *   Run `eas fingerprint:compare` before publishing anything after this lands.
 */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'watch',

  // Product/target name in Xcode vs. the name under the icon on the wrist.
  name: 'ForgeLegacyWatch',
  displayName: 'Forge Legacy',

  // Leading dot = appended to the iOS app's bundle id → com.qest4.forgelegacy.watchkitapp.
  // The plugin also writes WKCompanionAppBundleIdentifier from the main target, so pairing is implicit.
  bundleIdentifier: '.watchkitapp',

  // watchOS 10: SwiftUI-only lifecycle, vertical TabView, TimelineView for the rest ring. Nothing
  // older has a tester.
  deploymentTarget: '10.0',

  // The plugin flattens this to the opaque, square 1024 set watchOS requires; the system masks the
  // circle itself. Same source as the phone icon so the two never drift.
  icon: '../../assets/images/icon.png',

  // Colour sets the SwiftUI code reads by name. `$accent` also becomes the target's global accent.
  // Values are the Forge dark tokens from src/constants/tokens.ts — the watch is always OLED-black,
  // so Alabaster does not apply here.
  colors: {
    $accent: '#C8A97E', // bronze400 — PRIMARY accent
    ForgeGround: '#0E0E12', // charcoal900 — primary app background
    ForgeMuted: '#765B44', // bronze600 — progress track / muted accent
  },

  entitlements: {
    /* none for the spike; WatchConnectivity needs no entitlement */
  },
})
