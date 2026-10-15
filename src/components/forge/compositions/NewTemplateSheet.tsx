import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { PHOTO_IMPORT_LIVE } from '@/components/forge/ImportSpreadsheetSheet';
import { START_ICON, StartOptionRow } from '@/components/forge/compositions/StartStrengthSheet';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { usePremiumAi } from '@/lib/entitlement';

/**
 * ══ NEW WORKOUT TEMPLATE — HOW DO YOU WANT TO START? (PO 2026-10-15) ══
 *
 * PO: *"in the templates, when i go to add a template, i should be able to paste text or paste a picture
 * (depending on subscription and functions) in there as well. Just the same as a program. But for a
 * templated day."*
 *
 * The Templates screen's `+` used to open the blank builder, where the only import was a small "Import
 * from a spreadsheet" link under the name. Build a Program opens on a chooser instead (`program-guided.tsx`:
 * Paste a program · Upload pictures · Build from scratch), so this is that chooser for one workout. Same
 * three answers, same order, same rule for the photo row.
 *
 * ⚠ EVERY ROW ROUTES TO A SCREEN THAT ALREADY OWNS THE JOB — nothing here decides what a template is:
 *   · Paste / Upload → `/program-import?for=template`, the import Create New's "Import Workout Template"
 *                      opens (`CreateNewSheet.tsx`)
 *   · Build          → `/workout-builder`
 *
 * ⚠ THE CALLER ASKS `templates` BEFORE OPENING THIS (M-7 §2) — every row ends in a new template, so the
 * athlete at their cap hears it on the `+`, not after choosing. The import rows add the `imports` check,
 * as every other import door does. Asking `templates` again here would only count each crossing twice
 * in `cap_attempt`.
 *
 * ⚠ THE PHOTO ROW IS PREMIUM AI ONLY (0203), hidden rather than locked — exactly as Build a Program and
 * Create New hide theirs.
 */
export interface NewTemplateSheetProps {
  open: boolean;
  onClose: () => void;
}

export function NewTemplateSheet({ open, onClose }: NewTemplateSheetProps) {
  const router = useRouter();
  const guard = usePremiumGate();
  const premiumAi = usePremiumAi();
  const photoOn = PHOTO_IMPORT_LIVE && premiumAi;

  const openImport = (m: 'paste' | 'photo') => {
    onClose();
    if (!guard('imports')) return;
    router.push({ pathname: '/program-import', params: { m, for: 'template' } });
  };
  const build = () => {
    onClose();
    router.push('/workout-builder');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New Workout Template">
      <View style={styles.stack}>
        <StartOptionRow
          title="Paste a workout"
          sub="Copy it from a note, spreadsheet or message."
          icon="copy"
          onPress={() => openImport('paste')}
        />
        {photoOn ? (
          <StartOptionRow
            title="Upload a picture"
            sub="A screenshot or photo of the workout."
            icon="camera"
            onPress={() => openImport('photo')}
          />
        ) : null}
        <StartOptionRow
          title="Build from scratch"
          sub="Add the exercises yourself, one at a time."
          icon={START_ICON.template}
          onPress={build}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
});
