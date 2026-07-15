/**
 * ShareSheet — SH-1 Share Configuration. A BottomSheet (utility surface) that shows the
 * live Share Card preview, lets the athlete toggle what the card includes, pick a
 * destination, and share. `shareType` is fixed by the entry point (SH-1 §2); SH-1 controls
 * the variables, not whether to share.
 *
 * REAL: the card renderer, the content toggles (local state), the text snippet, and the
 * "Share…" hand-off to the OS via RN `Share`. PLACEHOLDER (no backend): the in-Forge
 * destinations (Squad / Friends / Community) resolve to a confirmation toast; image capture
 * (view-shot) is deferred, so the external share carries the text snippet only.
 */

import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { BottomSheet } from '../../composites/BottomSheet'
import { Button } from '../../composites/Button'
import { Toast } from '../../composites/Toast'
import { ShareCard } from '../ShareCard'
import { flColor, flRadius } from '@/constants/foundation'
import { shareSnippet, type ShareContent } from '@/domain/share/content'

export interface ShareSheetProps {
  open: boolean
  onClose: () => void
  content: ShareContent
}

type DestId = 'squad' | 'friends' | 'community'
const FORGE_DESTS: { id: DestId; label: string; verb: string }[] = [
  { id: 'squad', label: 'Squad', verb: 'Share to Squad' },
  { id: 'friends', label: 'Friends', verb: 'Share with Friends' },
  { id: 'community', label: 'Community', verb: 'Post to Community' },
]

export function ShareSheet({ open, onClose, content }: ShareSheetProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [includeName, setIncludeName] = useState(true)
  const [forgingSince, setForgingSince] = useState(false)
  const [dest, setDest] = useState<DestId>('squad')
  const [toast, setToast] = useState<string | null>(null)

  const toggleField = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const snippet = useMemo(() => shareSnippet(content, hidden, includeName), [content, hidden, includeName])
  const destVerb = FORGE_DESTS.find((d) => d.id === dest)?.verb ?? 'Share'

  const flash = (msg: string) => setToast(msg)

  const onForgeShare = () => {
    // No social backend — confirm the (placeholder) post, then close.
    flash(destVerb.replace(/^Share to /, 'Shared to ').replace(/^Share with /, 'Shared with ').replace(/^Post to /, 'Posted to '))
    setTimeout(onClose, 900)
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
          <Button variant="primary" fullWidth onPress={onForgeShare} accessibilityLabel={destVerb}>
            {destVerb}
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
            {FORGE_DESTS.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setDest(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: dest === d.id }}
                style={[styles.dest, dest === d.id ? styles.destOn : null]}
              >
                <Text style={[styles.destText, dest === d.id ? styles.destTextOn : null]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>Share outside Forge</Text>
          <View style={styles.outRow}>
            <Pressable onPress={onSystemShare} accessibilityRole="button" accessibilityLabel="Share to another app" style={styles.outBtn}>
              <Text style={styles.outText}>Share…</Text>
            </Pressable>
            <Pressable onPress={() => flash('Link copied')} accessibilityRole="button" style={styles.outBtn}>
              <Text style={styles.outText}>Copy link</Text>
            </Pressable>
          </View>
          <Text style={styles.note}>Image export is not wired yet — external shares carry the text snippet for now.</Text>
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
  destText: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
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
