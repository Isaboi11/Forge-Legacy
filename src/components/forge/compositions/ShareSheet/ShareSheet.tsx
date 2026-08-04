/**
 * ShareSheet — SH-1 Share Configuration. A BottomSheet (utility surface) that shows the
 * live Share Card preview, lets the athlete toggle what the card includes, pick a
 * destination, and share. `shareType` is fixed by the entry point (SH-1 §2); SH-1 controls
 * the variables, not whether to share.
 *
 * ══ THE DESTINATIONS POST FOR REAL NOW ══
 *
 * They did not. `onForgeShare` flashed "Shared to Squad" on a 900ms timer and closed the sheet, with
 * no insert behind it — a surface reporting a success that never happened, which is the one thing this
 * codebase treats as unshippable. It had been that way since before there was a social backend, and it
 * stayed that way after there was one: every ceremony's "Share …" secondary (rank-up, honor, goal,
 * program graduation) ended here, told the athlete their squad had seen it, and dropped it.
 *
 * `share-config.tsx` had already made exactly these two destinations real for transformation photos —
 * `addSquadPost` and `createFriendPost`, the same calls the composer uses. This is that fix, applied to
 * the surface every other share in the app goes through.
 *
 * REMOVED, not repaired:
 *   - **Community** — there is no community pillar in this build. `/community` is deferred out of the
 *     routed tree, so the destination could not be made real, only convincing.
 *   - **Copy link** — it flashed "Link copied" and copied nothing. There are no public URLs: every post
 *     is audience-scoped, so a link needs a sharing model and a privacy decision, not a clipboard call.
 *
 * STILL HONESTLY PLACEHOLDER: image export. The card is rendered on screen but not captured, so an
 * external share carries the text snippet. The note under the button says so rather than implying a
 * picture went with it.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { BottomSheet } from '../../composites/BottomSheet'
import { Button } from '../../composites/Button'
import { Toast } from '../../composites/Toast'
import { ShareCard } from '../ShareCard'
import { flColor, flRadius } from '@/constants/foundation'
import { addSquadPost } from '@/data/squad-feed-live'
import { createFriendPost } from '@/data/friends-feed-live'
import { fetchMySquads, type SquadSummary } from '@/data/squad-live'
import { errorMessage } from '@/lib/useQuery'
import { shareSnippet, type ShareContent } from '@/domain/share/content'

export interface ShareSheetProps {
  open: boolean
  onClose: () => void
  content: ShareContent
}

type DestId = 'squad' | 'friends'
const FORGE_DESTS: { id: DestId; label: string; verb: string }[] = [
  { id: 'squad', label: 'Squad', verb: 'Share to Squad' },
  { id: 'friends', label: 'Friends', verb: 'Share with Friends' },
]

export function ShareSheet({ open, onClose, content }: ShareSheetProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [includeName, setIncludeName] = useState(true)
  const [forgingSince, setForgingSince] = useState(false)
  const [dest, setDest] = useState<DestId>('squad')
  const [toast, setToast] = useState<string | null>(null)
  const [squads, setSquads] = useState<SquadSummary[] | null>(null)
  const [squadId, setSquadId] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  // The squad list is only needed once the sheet is up, and it decides whether the Squad destination
  // can be offered at all — an athlete in no squads must not be handed a button with nowhere to post.
  useEffect(() => {
    if (!open) return undefined
    let alive = true
    fetchMySquads().then(
      (rows) => {
        if (!alive) return
        setSquads(rows)
        setSquadId((cur) => cur ?? rows[0]?.id ?? null)
      },
      () => alive && setSquads([]),
    )
    return () => {
      alive = false
    }
  }, [open])

  const toggleField = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const snippet = useMemo(() => shareSnippet(content, hidden, includeName), [content, hidden, includeName])
  const destVerb = FORGE_DESTS.find((d) => d.id === dest)?.verb ?? 'Share'
  const noSquads = squads != null && squads.length === 0
  const chosenSquad = squads?.find((s) => s.id === squadId) ?? null
  const canPost = !posting && (dest === 'friends' || !!squadId)

  const flash = (msg: string) => setToast(msg)

  /**
   * Post it. The card is not captured, so what lands in the feed is the SNIPPET — the same text the
   * external share carries, and the same text the preview above is built from. No media, because
   * claiming an image was attached would be the original lie in a new place.
   */
  const onForgeShare = async () => {
    if (posting || !canPost) return
    setPosting(true)
    try {
      if (dest === 'squad') {
        if (!squadId) return
        await addSquadPost({ squadId, type: 'discussion', body: snippet })
        flash(chosenSquad ? `Shared to ${chosenSquad.name}` : 'Shared to your squad')
      } else {
        await createFriendPost({ body: snippet, audience: 'FRIENDS', squadId: null, media: [] })
        flash('Shared with your friends')
      }
      setTimeout(onClose, 900)
    } catch (e) {
      // The toast reports the failure instead of the success. This is the case the old code could not
      // reach, because it never attempted anything that could fail.
      flash(errorMessage(e))
    } finally {
      setPosting(false)
    }
  }
  const onSystemShare = async () => {
    try {
      await Share.share({ message: snippet })
    } catch {
      // user dismissed the OS sheet — no-op
    }
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={content.verb}
        footer={
          <Button variant="primary" fullWidth disabled={!canPost} onPress={onForgeShare} accessibilityLabel={destVerb}>
            {posting ? 'Sharing…' : destVerb}
          </Button>
        }
      >
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.previewWrap}>
            <ShareCard content={content} hiddenKeys={hidden} includeName={includeName} />
          </View>

          <Text style={styles.section}>Card Details</Text>
          <View style={styles.group}>
            {content.fields.map((f, i) => (
              <ToggleRow key={f.key} label={f.label} on={!hidden.has(f.key)} first={i === 0} onToggle={() => toggleField(f.key)} />
            ))}
            <ToggleRow label={content.rankInFooter ? 'Name & Rank' : 'Name'} on={includeName} onToggle={() => setIncludeName((v) => !v)} />
            <ToggleRow label="“Forging since”" on={forgingSince} onToggle={() => setForgingSince((v) => !v)} />
          </View>

          <Text style={styles.section}>Share in Forge</Text>
          <View style={styles.destRow}>
            {FORGE_DESTS.map((d) => {
              // Squad is unselectable with nothing to post to. Disabled and labelled, rather than
              // hidden — "you could share this to a squad" is worth knowing when you have none.
              const off = d.id === 'squad' && noSquads
              return (
                <Pressable
                  key={d.id}
                  onPress={() => !off && setDest(d.id)}
                  disabled={off}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dest === d.id, disabled: off }}
                  style={[styles.dest, dest === d.id && !off ? styles.destOn : null, off ? styles.destOff : null]}
                >
                  <Text style={[styles.destText, dest === d.id && !off ? styles.destTextOn : null]}>{d.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {noSquads ? <Text style={styles.note}>You’re not in a squad yet, so Friends is the only place inside Forge to share this.</Text> : null}

          {/* WHICH squad. Only asked when the answer isn't already decided — one squad needs no picker,
              and none needs no question. Posting to the wrong squad is not undoable from here. */}
          {dest === 'squad' && (squads?.length ?? 0) > 1 ? (
            <View style={styles.squadRow}>
              {squads!.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSquadId(s.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Share to ${s.name}`}
                  accessibilityState={{ selected: squadId === s.id }}
                  style={[styles.squadChip, squadId === s.id ? styles.squadChipOn : null]}
                >
                  <Text style={[styles.squadChipText, squadId === s.id ? styles.squadChipTextOn : null]} numberOfLines={1}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {dest === 'squad' && squads == null ? (
            <View style={styles.squadLoading}>
              <ActivityIndicator size="small" color={flColor.bronze400} />
            </View>
          ) : null}

          <Text style={styles.section}>Share outside Forge</Text>
          <View style={styles.outRow}>
            <Pressable onPress={onSystemShare} accessibilityRole="button" accessibilityLabel="Share to another app" style={styles.outBtn}>
              <Text style={styles.outText}>Share…</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>Image export is not wired yet — shares carry the text above, not the card.</Text>
        </ScrollView>
      </BottomSheet>

      <Toast open={toast != null} message={toast ?? ''} onDismiss={() => setToast(null)} />
    </>
  )
}

function ToggleRow({ label, on, first, onToggle }: { label: string; on: boolean; first?: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} style={[styles.row, first ? null : styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 440 },
  previewWrap: { paddingVertical: 8, marginBottom: 14 },
  section: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  group: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowLabel: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '500', color: flColor.cream100 },
  track: { width: 44, height: 26, borderRadius: flRadius.pill, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 3 },
  trackOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder, alignItems: 'flex-end' },
  trackOff: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal600, alignItems: 'flex-start' },
  knob: { width: 18, height: 18, borderRadius: 9 },
  knobOn: { backgroundColor: flColor.bronze300 },
  knobOff: { backgroundColor: flColor.charcoal500 },
  destRow: { flexDirection: 'row', gap: 9 },
  dest: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  destOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  destOff: { opacity: 0.4 },
  destText: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  squadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  squadChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    maxWidth: '100%',
  },
  squadChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  squadChipText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  squadChipTextOn: { color: flColor.bronze300 },
  squadLoading: { paddingVertical: 12, alignItems: 'center' },
  destTextOn: { color: flColor.cream100 },
  outRow: { flexDirection: 'row', gap: 9 },
  outBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  outText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  note: { fontSize: 11, color: flColor.gray600, marginTop: 12, marginHorizontal: 2 },
})
