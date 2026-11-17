import { Fragment } from 'react';
import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { flColor } from '@/constants/foundation';
import { isOpenableLink, splitLinks } from '@/domain/coach/links';

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
 */
export function HoltWords({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = splitLinks(text);
  return (
    <Text style={style} selectable>
      {parts.map((p, i) =>
        p.kind === 'link' ? (
          <Text
            key={i}
            style={styles.link}
            accessibilityRole="link"
            accessibilityHint="Opens in your browser"
            onPress={() => {
              if (isOpenableLink(p.url)) void Linking.openURL(p.url).catch(() => undefined);
            }}
          >
            {p.text}
          </Text>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: flColor.bronzeInk, textDecorationLine: 'underline' },
});
