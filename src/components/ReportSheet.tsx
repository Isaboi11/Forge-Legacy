import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { reportContent } from '@/data/moderation-live';
import {
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  REPORT_SENT_MESSAGE,
  REPORT_TARGET_LABEL,
  canSubmitReport,
  reportNoteRequired,
  type ReportReason,
  type ReportTargetKind,
} from '@/domain/moderation/moderation-core';

/**
 * THE ONE REPORT SHEET — every surface carrying user-generated content opens this.
 *
 * ══ WHY ONE COMPONENT AND NOT A CONTROL PER SURFACE ══
 *
 * App Store Guideline 1.2 asks for a reporting mechanism, and a mechanism that exists on three of five UGC
 * surfaces is the same finding as one that exists nowhere — a reviewer looks at the surface they happen to
 * open. Posts, comments, check-ins, people and squads all differ in what they point at and in nothing else,
 * so `targetKind` and `targetId` are the only props that change.
 *
 * ⚠ THIS REPLACES THE DEFECT THAT STARTED THIS WORK. `squad-settings.tsx:688` shipped a Report Squad row
 *   that showed a toast reading *"Reporting a squad is coming soon"* — a control that demonstrated, inside
 *   the binary, that the need was known and unmet.
 *
 * ⚠ SUBMISSION FAILURE IS SHOWN, NEVER SWALLOWED. Every other read in this app degrades quietly because a
 *   failed read costs a screen some content. A report that silently fails costs someone the belief that
 *   they reported it — they do not try again, and nothing ever reaches the queue.
 */
export function ReportSheet({
  open,
  onClose,
  targetKind,
  targetId,
  targetAthleteId = null,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  targetKind: ReportTargetKind;
  targetId: string;
  /** Resolved at report time so the report still names a person after the content is deleted. */
  targetAthleteId?: string | null;
  /** Shown in the sheet so the athlete can see what they are about to report. */
  targetName?: string;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * ⚠ NO RESET EFFECT, AND THAT IS DELIBERATE ON TWO COUNTS.
   *
   * The mechanical one: this repo's lint runs react-compiler, which ERRORS on a synchronous `setState`
   * inside an effect. A `useEffect(() => { if (open) setReason(null) … })` here took the baseline from 1
   * error to 2 — real drift, not a warning.
   *
   * The better one: clearing on close empties the sheet in front of the athlete during the slide-out, and
   * clearing on open throws away a draft they may have cancelled by accident. Keeping the draft across a
   * cancel is the friendlier behaviour anyway — the only moment the form MUST be empty is after a
   * successful send, so that a second report does not inherit the first one's note. That is done
   * explicitly in `submit()`, where the reason for it is visible.
   */

  const submit = async () => {
    if (!canSubmitReport(reason, note) || sending) return;
    setSending(true);
    setError(null);
    try {
      await reportContent({
        targetKind,
        targetId,
        reason: reason as ReportReason,
        note,
        targetAthleteId,
      });
      showToast(REPORT_SENT_MESSAGE);
      // Cleared HERE and nowhere else — a second report must not inherit this one's reason or note.
      setReason(null);
      setNote('');
      setSending(false);
      onClose();
    } catch (e) {
      setSending(false);
      setError(
        e instanceof Error && /too many reports/i.test(e.message)
          ? 'You’ve sent a lot of reports recently. Try again a bit later.'
          : 'That didn’t send. Check your connection and try again.',
      );
    }
  };

  const noun = REPORT_TARGET_LABEL[targetKind];
  const canSend = canSubmitReport(reason, note) && !sending;

  return (
    <BottomSheet open={open} onClose={onClose} title={`Report this ${noun}`} scroll>
      <View style={styles.body}>
        <Text style={styles.lead}>
          {targetName
            ? `Tell us what’s wrong with ${targetName}’s ${noun}. Only we see this — they aren’t told.`
            : `Tell us what’s wrong. Only we see this — they aren’t told.`}
        </Text>

        <View style={styles.reasons}>
          {REPORT_REASONS.map((r) => {
            const selected = reason === r;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={REPORT_REASON_LABEL[r]}
                style={[styles.reason, selected && styles.reasonOn]}
              >
                {/* The dot carries the state as SHAPE as well as colour — never hue alone. */}
                <View style={[styles.dot, selected && styles.dotOn]}>
                  {selected ? <View style={styles.dotCore} /> : null}
                </View>
                <Text style={[styles.reasonLabel, selected && styles.reasonLabelOn]}>
                  {REPORT_REASON_LABEL[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {reason ? (
          <View style={styles.noteWrap}>
            <Text style={styles.noteLabel}>
              {reportNoteRequired(reason) ? 'What happened?' : 'Anything else? (optional)'}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={REPORT_NOTE_MAX}
              placeholder={reportNoteRequired(reason) ? 'A sentence is enough.' : ''}
              placeholderTextColor={flColor.gray600}
              style={styles.note}
              accessibilityLabel="Report details"
            />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Button variant="text" onPress={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onPress={submit} disabled={!canSend}>
          {sending ? 'Sending…' : 'Send report'}
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingBottom: 8 },
  lead: { color: flColor.gray400, fontSize: 14, lineHeight: 20, fontFamily: flFont.sans },
  reasons: { gap: 2 },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: flColor.gray600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { borderColor: flColor.bronze400 },
  dotCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: flColor.bronze400 },
  reasonLabel: { color: flColor.gray400, fontSize: 15, fontFamily: flFont.sans, flexShrink: 1 },
  reasonLabelOn: { color: flColor.cream100 },
  noteWrap: { gap: 8 },
  noteLabel: { color: flColor.gray400, fontSize: 13, fontFamily: flFont.sans },
  note: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    borderRadius: flRadius.md,
    padding: 12,
    color: flColor.cream100,
    fontSize: 15,
    fontFamily: flFont.sans,
    textAlignVertical: 'top',
  },
  error: { color: flColor.redMuted, fontSize: 13, fontFamily: flFont.sans },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' },
});
