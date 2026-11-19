import { Fragment } from 'react';
import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { flColor } from '@/constants/foundation';
import { holtMarkdown } from '@/domain/coach/holt-markdown';
import { isOpenableLink } from '@/domain/coach/links';

/**
 * Holt's words on screen — SELECTABLE, with every http(s) link tappable (AI audit 2026-11-16, C-D3).
 *
 * A tapped online search costs the larger web credit and its answer is a site and a link, which used to be
 * neither tappable nor copyable. Now a long press copies anything he said, and a link opens in the browser.
 *
 * ⚠ ONLY http(s) OPENS. `splitLinks` never makes another scheme a link, and the tap checks again, so a
 * model's words can never reach `tel:`, an app scheme or `javascript:` through here.
 *
 * Colour is a token, not a value: `bronzeInk` — "Links and actions keep `bronzeInk`" (the Alabaster palette)
 * — so Forge draws it bronze on black and Alabaster its deeper, legible bronze, with nothing added to either.
 *
 * Holt Listens HL-1a (2026-11-18): his `**bold**`, `- ` bullets and headings are drawn as formatting (`holtMarkdown`),
 * not raw asterisks. Still ONE selectable `<Text>` — styled runs nest inside it, so copy and layout are unchanged.
 */
export function HoltWords({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const runs = holtMarkdown(text);
  return (
    <Text style={style} selectable>
      {runs.map((r, i) => {
        const look = [r.bold && styles.bold, r.italic && styles.italic];
        const url = r.url;
        return url ? (
          <Text
            key={i}
            style={[...look, styles.link]}
            accessibilityRole="link"
            accessibilityHint="Opens in your browser"
            onPress={() => {
              if (isOpenableLink(url)) void Linking.openURL(url).catch(() => undefined);
            }}
          >
            {r.text}
          </Text>
        ) : r.bold || r.italic ? (
          <Text key={i} style={look}>
            {r.text}
          </Text>
        ) : (
          <Fragment key={i}>{r.text}</Fragment>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: flColor.bronzeInk, textDecorationLine: 'underline' },
  bold: { fontWeight: '600' },
  italic: { fontStyle: 'italic' },
});
