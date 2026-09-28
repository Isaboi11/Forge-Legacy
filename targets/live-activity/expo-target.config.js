/**
 * Forge Legacy — Live Activity (lock screen + Dynamic Island) widget extension.
 *
 * Read by `@bacons/apple-targets` at `expo prebuild`, like `targets/watch/`. Everything in this directory
 * is linked into the generated Xcode project as its own WidgetKit extension; nothing here is React Native.
 * `Docs/Live-Activities-Build-Plan.md` §5. The card is READ-ONLY in build 10 (PO 09-28): no buttons, no
 * App Intents, no push.
 *
 * ⚠ Any change to THIS file or to app.json needs a fresh `expo prebuild --clean`; Swift edits do not.
 * ⚠ This is a native change: it needs a new build number and a real `eas build`, never an OTA.
 *   Run `eas fingerprint:compare` before publishing anything after this lands.
 * ⚠ NEW APP ID. `.liveactivity` → com.qest4.forgelegacy.liveactivity is created by EAS on the first
 *   build and needs Apple credentials — run build 10 with the PO at the keyboard.
 * ⚠ The plugin prints "Apple target may require the App Groups entitlement". EXPECTED — every byte the
 *   card needs travels in its ContentState, so there is no shared container. Add a group only if the
 *   v1.1 intents need shared storage.
 * ⚠ NOTHING GOES IN A ROOT `targets/_shared/` — that links into EVERY target, the Watch included.
 */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',

  // Product/target name in Xcode vs. the name iOS shows in Settings → Live Activities.
  name: 'ForgeLegacyLive',
  displayName: 'Forge Legacy',

  // Leading dot = appended to the iOS app's bundle id → com.qest4.forgelegacy.liveactivity.
  bundleIdentifier: '.liveactivity',

  // ⚠ SET EXPLICITLY. The plugin defaults widgets to 18.0 (`with-widget.js`), which would quietly leave
  // every iOS 16–17 phone without the card. 16.4 is the app's own minimum; ActivityKit needs 16.1 and
  // `ActivityContent`/`staleDate` 16.2. Confirm `MinimumOSVersion` in the IPA's extension Info.plist.
  deploymentTarget: '16.4',

  // The two colours the SYSTEM uses. Everything our views paint comes from `Palette.swift`, which is
  // copied from the Watch's `Theme.swift` so the lock screen follows the app theme (Alabaster included).
  colors: {
    $accent: '#BA8654', // bronze400 — PRIMARY accent
    $widgetBackground: '#0E0E12', // Forge ground
  },

  entitlements: {
    /* none for v1: no push (so no aps-environment) and no App Group */
  },
})
