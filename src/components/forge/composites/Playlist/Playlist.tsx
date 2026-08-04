/**
 * Playlist — the chip, the attach/edit sheet, and the one path that opens a link.
 *
 * Workout-Playlist-Amendment-001 §4 gives the link TWO attach points: the "⋯ Options" menu during the
 * active workout (W-9–W-16 §8.5) and the Reflect step of W-17 (§8A.2), which is explicit that the second
 * "opens the same Playlist sheet defined in §8.5". Same sheet means one component — two screens with
 * their own copy is how the validation rule and the placeholder copy drift apart.
 *
 * §5 is the reason `PlaylistChip` exists rather than each surface assembling its own row: "If displayName
 * is null, the chip falls back to a generic label naming the service — NEVER the raw URL." That rule has
 * to hold on W-17, on W-19 and on a squad check-in card, and `playlistLabel` is the only thing that knows
 * it.
 *
 * W-19 does NOT use `PlaylistChip` — its `.dc` (Forge Activity Detail.dc.html) draws the playlist as a
 * labelled detail row matching the Partners and Chapter rows above it, not as a chip. It calls
 * `playlistLabel` and `openPlaylist` directly, which is where the shared rules actually live.
 */

import React, { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { Button } from '../Button'
import { BottomSheet } from '../BottomSheet'
import { InputField } from '../InputField'
import { flColor, flFont, flRadius } from '@/constants/foundation'
import {
  parsePlaylistLink,
  playlistLabel,
  PLAYLIST_NAME_MAX,
  type WorkoutPlaylistLink,
} from '@/domain/workout/playlist'

/**
 * Open the link — §5: "the OS resolves the Spotify/Apple Music URL to the installed app if present, or
 * the browser otherwise. Forge Legacy does nothing app-specific here."
 *
 * `Linking.openURL`, deliberately, and NOT the app's own `openBrowserAsync` helper: an in-app browser
 * would force every athlete into a web player and defeat the entire behaviour the amendment describes.
 * Handing the URL to the OS is what lets the installed app claim it.
 *
 * Resolves false rather than throwing so a caller can say something honest; §2 rules out validating that
 * the link resolves to a real playlist, so a dead link is between the athlete and the service.
 */
export async function openPlaylist(link: WorkoutPlaylistLink): Promise<boolean> {
  try {
    await Linking.openURL(link.url)
    return true
  } catch {
    return false
  }
}

function NoteGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18V5l11-2v13" />
      <Path d="M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
    </Svg>
  )
}

export interface PlaylistChipProps {
  link: WorkoutPlaylistLink
  /** Tapping the chip opens the link. Omit on a surface where it must not be interactive. */
  onOpen?: () => void
  /** Shown only where the link is editable (W-17). W-19 is read-only, so it passes neither. */
  onEdit?: () => void
  onRemove?: () => void
}

/**
 * §5's chip: a music-note glyph, the display name (or the generic service label), and "Open ›".
 *
 * The [×] removal control sits where the partner-tag remove control sits (§8A.2, "identical in placement
 * and behavior"), which is why it is a sibling of the row rather than something inside the open target —
 * a remove button that is also part of a tap-to-open surface removes things by accident.
 */
export function PlaylistChip({ link, onOpen, onEdit, onRemove }: PlaylistChipProps) {
  const label = playlistLabel(link)
  return (
    <View style={styles.chipRow}>
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? `Open ${label}` : label}
        style={({ pressed }) => [styles.chip, pressed && onOpen ? styles.chipPressed : null]}
      >
        <NoteGlyph />
        <Text style={styles.chipLabel} numberOfLines={1}>
          {label}
        </Text>
        {onOpen ? <Text style={styles.chipOpen}>Open ›</Text> : null}
      </Pressable>

      {onEdit ? (
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit this playlist" hitSlop={8} style={styles.chipAction}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 20h4L19 9l-4-4L4 16zM14.5 5.5l4 4" />
          </Svg>
        </Pressable>
      ) : null}
      {onRemove ? (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove this playlist" hitSlop={8} style={styles.chipAction}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  )
}

export interface PlaylistSheetProps {
  /**
   * The link being edited, or null to attach a new one. Read ONCE, when the sheet mounts.
   *
   * ══ MOUNT THIS CONDITIONALLY: `{open ? <PlaylistSheet … /> : null}` ══
   *
   * The draft fields seed from `initial` in a `useState` initialiser, so the sheet must be mounted at the
   * moment it opens for them to seed. Syncing them in an effect instead is exactly the sync-setState-in-
   * an-effect that this repo's react-compiler lint treats as an error, and keying the component to force
   * a remount is the same trick with a footgun attached.
   */
  initial: WorkoutPlaylistLink | null
  onClose: () => void
  /** Null means REMOVE. The caller persists; §8A.2 requires it to save immediately, not on "Done". */
  onSave: (link: WorkoutPlaylistLink | null) => void
  saving?: boolean
}

/**
 * The attach/edit sheet — §8.5: "URL field, optional display-name field, Save Playlist."
 *
 * There is no "Connect Spotify" or "Connect Apple Music" affordance here and there never will be (§8A.1,
 * §7): V1 stores a link and a service tag. No OAuth, no SDK, no metadata fetch, no cover art. The athlete
 * pastes what their share sheet gave them.
 */
export function PlaylistSheet({ initial, onClose, onSave, saving = false }: PlaylistSheetProps) {
  const [url, setUrl] = useState(() => initial?.url ?? '')
  const [name, setName] = useState(() => initial?.displayName ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const parsed = parsePlaylistLink(url, name)
    if (!parsed.ok) {
      // §3's inline message. Shown under the field that caused it rather than as a toast, because the
      // athlete has to change that field to get past it.
      setError(parsed.message)
      return
    }
    setError(null)
    onSave(parsed.link)
  }

  return (
    <BottomSheet open onClose={onClose} title={initial ? 'Edit playlist' : 'Attach a playlist'}>
      <View style={styles.sheetBody}>
        <Text style={styles.sheetBlurb}>
          Paste a link from Spotify or Apple Music. Forge Legacy just keeps it with the session — it
          won&apos;t play anything.
        </Text>

        <InputField
          label="Playlist link"
          value={url}
          onChange={(v) => {
            setUrl(v)
            if (error) setError(null) // clear the refusal as soon as they act on it
          }}
          error={error ?? undefined}
          placeholder="https://open.spotify.com/playlist/…"
          placeholderTextColor={flColor.gray600}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Playlist link"
        />

        <View style={styles.nameGap}>
          <InputField
            label="Name it (optional)"
            value={name}
            onChange={setName}
            helper="Leave this blank and it'll just say “Spotify Playlist”."
            maxLength={PLAYLIST_NAME_MAX}
            placeholder="Leg Day Bangers"
            placeholderTextColor={flColor.gray600}
            accessibilityLabel="Playlist name"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>

        <View style={styles.sheetActions}>
          <Button variant="primary" fullWidth onPress={submit} accessibilityLabel="Save playlist">
            {saving ? 'Saving…' : 'Save Playlist'}
          </Button>
          {initial ? (
            <Button variant="text" fullWidth onPress={() => onSave(null)} accessibilityLabel="Remove this playlist">
              Remove
            </Button>
          ) : (
            <Button variant="text" fullWidth onPress={onClose} accessibilityLabel="Cancel">
              Cancel
            </Button>
          )}
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
  },
  chipPressed: { opacity: 0.75 },
  chipLabel: { flex: 1, fontFamily: flFont.sans, fontSize: 14, color: flColor.cream100 },
  chipOpen: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', color: flColor.bronze400 },
  chipAction: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },

  sheetBody: { gap: 14 },
  sheetBlurb: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  nameGap: { marginTop: 2 },
  sheetActions: { marginTop: 6, gap: 8 },
})
