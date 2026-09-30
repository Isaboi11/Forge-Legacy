import { Linking, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import { forgeOr } from '@/constants/theme-scrim';
import { linkParts } from '@/domain/settings/content';

/**
 * The in-app reading sheet for Terms, Privacy, Membership, About and the Apple Health note — one sheet,
 * opened from Sign In and from Account Settings (QA 09-26 auth-17).
 *
 * What it fixed, all four at once:
 *  · The header read "forgelegacy.app/terms" — a fake address bar. The document's own title is the title.
 *  · There was no way out but the grabber or the backdrop. A Done button sits in the footer.
 *  · The body padded itself on top of the sheet's own padding, so the text sat further in than the
 *    header. The sheet's padding is the only padding now.
 *  · support@forgelegacy.app and forgelegacy.app/terms were dead text. They open mail / the browser.
 */
export function DocSheet({
  open,
  onClose,
  title,
  updated,
  body,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  updated?: string;
  body: string[];
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      scroll
      footer={
        <Button variant="secondary" fullWidth onPress={onClose} accessibilityLabel="Done">
          Done
        </Button>
      }
    >
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {updated ? <Text style={styles.updated}>{updated}</Text> : null}
      {body.map((p) => (
        <Text key={p} style={styles.para}>
          {linkParts(p).map((part, i) =>
            part.href ? (
              <Text
                key={i}
                style={styles.link}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(part.href!).catch(() => {})}
              >
                {part.text}
              </Text>
            ) : (
              part.text
            ),
          )}
        </Text>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100, marginBottom: 6 },
  updated: { fontFamily: flFont.sans, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 18 },
  para: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 22, color: flColor.gray400, marginBottom: 14 },
  link: { color: forgeOr(flColor.bronze300, flColor.bronzeInk), textDecorationLine: 'underline' },
});
