import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { HoltMark } from '@/components/forge/HoltMark';
import { flColor, flFont } from '@/constants/foundation';

/**
 * ══ COACH HOLT'S WELCOME — ONCE, THE FIRST TIME A NEW ATHLETE LANDS ON HOME ══
 *
 * PO, 2026-09-28: *"When someone signs up there needs to be some kind of welcome from coach holt with their
 * name. And coach holt offering to be there for help and support if they have questions."*
 *
 * Owed by finishing onboarding (`holt-welcome.ts`); Home decides when it is visible and holds the tour until
 * it is answered, so the two never stack.
 *
 * ⚠ WHY THIS DOES NOT CONTRADICT PO 2026-09-21 ("Coach Holt in the bottom right doesn't need to say anything
 * right now"). That was the COIN talking on arrival — a speech bubble beside the first workout, competing
 * for the same tap. This is one deliberate greeting, answered once, and it is what tells a new athlete what
 * the coin is. The coin's own introduction still waits for the first session.
 *
 * ⚠ THE OFFER IS TRAINING AND THE APP — never "anything". Holt stops on medical questions by rule
 * (medical-routing, PO 09-22), so the welcome does not invite them.
 */
export function HoltWelcomeSheet({
  open,
  firstName,
  onDone,
  onAsk,
}: {
  open: boolean;
  /** Empty or null greets without a name rather than with a blank. */
  firstName: string | null | undefined;
  /** Closed with "Let's get to work", the X, or the backdrop. */
  onDone: () => void;
  /** "Ask me something" — the caller opens Holt once this sheet has actually gone. */
  onAsk: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const name = firstName?.trim();

  /*
   * ⚠ HOLT OPENS AFTER THIS SHEET IS GONE, NOT BESIDE IT. Both are Modals, and iOS will not present a second
   * one while the first is still animating out — the coach would silently fail to open. So on iOS the ask is
   * carried to `onDismiss`, which fires once the sheet has left; web and Android have no such rule (and no
   * `onDismiss`), so a short beat is enough there.
   */
  const ask = () => {
    onDone();
    if (Platform.OS === 'ios') setAsking(true);
    else setTimeout(onAsk, 250);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onDone}
      onDismiss={() => {
        if (!asking) return;
        setAsking(false);
        onAsk();
      }}
      footer={
        <>
          <Button variant="primary" fullWidth onPress={onDone} accessibilityLabel="Let's get to work">
            Let&apos;s get to work
          </Button>
          <Button variant="text" fullWidth onPress={ask} accessibilityLabel="Ask Coach Holt something">
            Ask me something
          </Button>
        </>
      }
    >
      <View style={styles.body}>
        <HoltMark size={64} />
        <Text style={styles.eyebrow}>COACH HOLT</Text>
        <Text style={styles.title}>{name ? `Welcome to Forge, ${name}.` : 'Welcome to Forge.'}</Text>
        <Text style={styles.line}>I&apos;m Coach Holt. I&apos;ll be in your corner the whole way — every workout, every chapter.</Text>
        <Text style={styles.line}>
          Got a question about a lift, your program, or how something works in here? Tap my coin in the corner of
          your screen and ask. I&apos;m here to help.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 10, paddingTop: 4 },
  eyebrow: { marginTop: 6, fontSize: 10, fontWeight: '700', letterSpacing: 2.4, color: flColor.labelInk },
  title: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100, textAlign: 'center' },
  line: { fontSize: 15, lineHeight: 22, color: flColor.gray400, textAlign: 'center' },
});
