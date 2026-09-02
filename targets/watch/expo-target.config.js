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

  // ⚠ THE PALETTE LIVES IN `Theme.swift` NOW, NOT HERE. watchOS has no user-facing light mode — SwiftUI's
  // `ColorScheme` on a watch is always `.dark` — so a colour set with a light appearance can never
  // resolve, and Alabaster cannot be inherited the way it is on the phone. The phone SENDS `theme` in
  // every `WatchState` push and `Palette` selects from it. Both themes are drawn in
  // `design-drafts/ForgeWatchCompanion.dc.html`.
  //
  // What remains here is the one colour the SYSTEM uses rather than our views: `$accent` becomes the
  // target's global tint (focus rings, the crown indicator, system controls).
  //
  // ⚠ CORRECTED. This was `#C8A97E`, from `src/constants/tokens.ts` — a palette the app stopped
  // rendering months ago. The live bronze is `foundation.forge.ts`'s `bronze400`.
  colors: {
    $accent: '#BA8654', // bronze400 — PRIMARY accent
  },

  entitlements: {
    /* none for the spike; WatchConnectivity needs no entitlement */
  },
})
