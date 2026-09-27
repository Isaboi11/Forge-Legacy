import { useState } from 'react'
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native'
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon'

import { ACTIVE_THEME, flColor } from '@/constants/foundation'
import { applyThemeAndReload, type ThemeName } from '@/constants/theme-choice'
import { saveAppPrefs } from '@/data/settings-live'
import { useToast } from '@/hooks/useCeremony'
import { useAppPrefs } from '@/lib/settings'

/** `expo-splash-screen`'s background (app.json) — the fade lands on the colour the restart opens on. */
const SPLASH_GROUND = '#0E0E12'
const FADE_MS = 280

/**
 * The Home header's sun/moon — the fast way to change theme (PO, 2026-09-26). Settings → Preferences
 * keeps the full choice; this is one tap from the screen the athlete opens most.
 *
 * It shows where it GOES: a moon on Alabaster, a sun on Forge.
 *
 * ⚠ DELIBERATELY QUIETER THAN THE AVATAR. PO: the two circles competed, and the avatar must win. The
 *   disc is 30px against the avatar's 36 (≈17% smaller), with a subtle edge and the card ground — it
 *   reads as a tool. The tap target is still 44×44 via `hitSlop`.
 *
 * ⚠ CHANGING THEME RESTARTS THE APP — the palette is frozen into module-scope stylesheets at launch
 *   (`foundation.ts`). So, exactly like Preferences, it SAVES FIRST and restarts only once the save
 *   landed; a restart into a theme the server rejected would flip back on the next launch. The fade to
 *   the splash colour is what makes the restart read as a deliberate change rather than a crash.
 *
 * ⚠ DISABLED UNTIL PREFS HAVE LOADED. `saveAppPrefs({ ...prefs, theme })` before the read lands would
 *   write the defaults over every other preference (see `SettingsState.loaded`).
 */
export function ThemeSwitch() {
  const { prefs, loaded } = useAppPrefs()
  const { showToast } = useToast()
  const [fade] = useState(() => new Animated.Value(0))
  const [busy, setBusy] = useState(false)

  const target: ThemeName = ACTIVE_THEME === 'paper' ? 'forge' : 'paper'
  const label = target === 'paper' ? 'Switch to light mode' : 'Switch to dark mode'

  const onPress = () => {
    if (busy || !loaded) return
    setBusy(true)
    const faded = new Promise<void>((resolve) =>
      Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start(() => resolve()),
    )
    Promise.all([saveAppPrefs({ ...prefs, theme: target }), faded])
      .then(() => applyThemeAndReload(target))
      .catch(() => {
        Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setBusy(false))
        showToast('Couldn’t change the theme — check your connection and try again.')
      })
  }

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!loaded || busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Forge restarts to change theme"
        style={styles.btn}
        hitSlop={7}
      >
        {({ pressed }) => (
          <View style={[styles.disc, pressed && styles.discPressed]}>
            <EngravedIcon name={target === 'paper' ? 'sun' : 'moon'} size={16} />
          </View>
        )}
      </Pressable>
      <Modal visible={busy} transparent animationType="none" statusBarTranslucent>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, { opacity: fade }]} />
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
  },
  discPressed: { opacity: 0.7 },
  veil: { backgroundColor: SPLASH_GROUND },
})
