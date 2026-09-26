import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor } from '@/constants/foundation';
import { CONSENT_COPY, type ConsentKind } from '@/domain/consent/consent';
import { useAuth } from '@/lib/auth';
import { consentUserIs, registerConsentPrompter } from '@/lib/consent';
import { callerModalGone } from '@/lib/useMediaPicker';

/**
 * The health-data consent sheet (MHMDA / Nevada SB 370) — mounted ONCE at the root, raised by
 * `ensureConsent()` from anywhere, including the data layer.
 *
 * A plain BottomSheet (the Modal Library's confirmation surface): the words, a link to the health data
 * policy, Agree and Not now. Dismissing it by the backdrop or the grabber is "Not now". Role tokens only,
 * so Alabaster follows the theme with no second layout.
 *
 * ⚠ THE ANSWER IS HANDED BACK ONLY ONCE THE SHEET IS GONE. The AI features that ask are mostly photo
 * features, and the next thing they do is open the picker — iOS silently drops a picker presented over a
 * sheet that is still closing (`callerModalGone`).
 */
export function ConsentSheet({ open, kind, onAnswer }: { open: boolean; kind: ConsentKind; onAnswer: (agreed: boolean) => void }) {
  const copy = CONSENT_COPY[kind];

  return (
    <BottomSheet
      open={open}
      onClose={() => onAnswer(false)}
      title={copy.title}
      scroll
      footer={
        <>
          <Button variant="primary" fullWidth onPress={() => onAnswer(true)}>
            {copy.agree}
          </Button>
          <Button variant="text" fullWidth onPress={() => onAnswer(false)}>
            {copy.notNow}
          </Button>
        </>
      }
    >
      <View style={styles.body}>
        {copy.body.map((p) => (
          <Text key={p} style={styles.para}>
            {p}
          </Text>
        ))}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={copy.linkLabel}
          hitSlop={8}
          onPress={() => void Linking.openURL(copy.linkUrl).catch(() => {})}
        >
          <Text style={styles.link}>{copy.linkLabel}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

export function ConsentHost() {
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  const [ask, setAsk] = useState<{ kind: ConsentKind; resolve: (agreed: boolean) => void } | null>(null);
  /* The kind stays drawn while the sheet slides away, so its words do not change under the animation. */
  const [kind, setKind] = useState<ConsentKind>('nutrition');

  useEffect(() => consentUserIs(uid), [uid]);

  useEffect(
    () =>
      registerConsentPrompter(
        (asked) =>
          new Promise<boolean>((resolve) => {
            setKind(asked);
            setAsk({ kind: asked, resolve });
          }),
      ),
    [],
  );

  const answer = (agreed: boolean) => {
    if (!ask) return;
    const { resolve } = ask;
    setAsk(null);
    void callerModalGone().then(() => resolve(agreed));
  };

  return <ConsentSheet open={ask !== null} kind={kind} onAnswer={answer} />;
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 4 },
  para: { fontSize: 14.5, lineHeight: 22, color: flColor.gray400 },
  link: { fontSize: 14, fontWeight: '600', color: flColor.bronze300, marginTop: 2 },
});
