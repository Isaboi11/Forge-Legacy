import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import type { EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import { PHOTO_IMPORT_LIVE } from '@/components/forge/ImportSpreadsheetSheet';
import { START_ICON, StartOptionRow } from '@/components/forge/compositions/StartStrengthSheet';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { usePremiumAi } from '@/lib/entitlement';

/**
 * ══ ONE CREATION SYSTEM — Workouts restructure (PO, 2026-09-22) ══
 *
 * The Workouts hub used to show every builder at once: "Build a Program" under Your Programs, "Build a
 * Template" and "Build a Week" under Your Templates, and a `+` whose sheet was a fifth list (today's
 * workout · strength · track a run · log a run · build a program). Five doors, three vocabularies.
 *
 * Now the `+` in the header and the "Create New" card are the SAME sheet — this component, rendered once
 * by the tab and opened by either. A shortcut for the athlete who knows, a visible door for the one who
 * doesn't, and never two creation systems that can drift apart.
 *
 * ⚠ EVERY ROW ROUTES TO THE SCREEN THAT ALREADY OWNS THE JOB, behind the gate that screen's other doors
 * already run. Nothing here decides what a program or a template is:
 *   · Freestyle       → the caller's `onFreestyle` (the tab's own launch, which the name guard pins)
 *   · Workout Template → `/workout-builder`, gated on `templates` exactly as the Templates hub's New is
 *   · Program         → `/program-guided` — PO 2026-09-20: "build" is the guided lane, which carries
 *                       "I'll set it up myself" on every step, so the dense builder is one tap away
 *   · Import          → `/program-import`, gated on `imports` + `programs` exactly as Build a Program's
 *                       own import cards are (`program-guided.tsx` `openImport`)
 *
 * ⚠ WEEK TEMPLATES ARE NOT A ROW HERE, BY DECISION. The model is Program → Weeks → Workouts → Exercises;
 * a week is built inside a program. The `week_templates` data and everything reading it (Program
 * Builder's "use a saved week", W-29, Coach Holt's week artifact) are untouched.
 */
export interface CreateNewSheetProps {
  open: boolean;
  onClose: () => void;
  /** Start a freestyle session. The caller owns the launch so the session name stays in one place. */
  onFreestyle: () => void;
}

const ICON: Record<'program' | 'importProgram' | 'paste' | 'photo', EngravedName> = {
  program: 'layers',
  importProgram: 'download',
  paste: 'copy',
  photo: 'camera',
};

export function CreateNewSheet({ open, onClose, onFreestyle }: CreateNewSheetProps) {
  const router = useRouter();
  const guard = usePremiumGate();
  const premiumAi = usePremiumAi();
  const photoOn = PHOTO_IMPORT_LIVE && premiumAi;
  /** Import has two ways in only for Premium AI (photo reads are that tier's, 0203). Everyone else goes straight to paste. */
  const [step, setStep] = useState<'root' | 'import'>('root');

  const close = () => {
    setStep('root');
    onClose();
  };
  const go = (fn: () => void) => () => {
    close();
    fn();
  };

  const openImport = (m: 'paste' | 'photo') => {
    close();
    if (!guard('imports')) return;
    if (!guard('programs')) return;
    router.push({ pathname: '/program-import', params: { m } });
  };

  return (
    <BottomSheet open={open} onClose={close} title={step === 'import' ? 'Import a Program' : 'Create New'}>
      {step === 'root' ? (
        <View style={styles.stack}>
          <StartOptionRow
            title="Start Freestyle Workout"
            sub="Train now — no program, no plan. Add exercises as you lift."
            icon={START_ICON.buildAsYouGo}
            onPress={go(onFreestyle)}
          />
          <StartOptionRow
            title="Build Workout Template"
            sub="A reusable single workout you can start any time."
            icon={START_ICON.template}
            onPress={go(() => {
              if (guard('templates')) router.push('/workout-builder');
            })}
          />
          <StartOptionRow
            title="Build Program"
            sub="Weeks of training, built around your goal."
            icon={ICON.program}
            onPress={go(() => router.push('/program-guided'))}
          />
          <StartOptionRow
            title="Import Program"
            sub="Bring in a plan you already follow."
            icon={ICON.importProgram}
            onPress={() => (photoOn ? setStep('import') : openImport('paste'))}
          />
        </View>
      ) : (
        <View style={styles.stack}>
          <StartOptionRow title="Paste a program" sub="Copy it from a spreadsheet, note or message." icon={ICON.paste} onPress={() => openImport('paste')} />
          <StartOptionRow title="Upload pictures" sub="Screenshots or photos of the plan." icon={ICON.photo} onPress={() => openImport('photo')} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
});
