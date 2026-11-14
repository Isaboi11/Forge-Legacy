import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type NativeSyntheticEvent, type StyleProp, type TextInputSelectionChangeEventData, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/forge/composites/Avatar';
import { KEEP_KEYBOARD } from '@/components/KeyboardTapAway';
import { flColor, flRadius } from '@/constants/foundation';
import {
  insertMention,
  mentionSuggestions,
  pickedIn,
  splitMentions,
  type Mentionable,
  type PickedMention,
} from '@/domain/squad/mentions';

/**
 * Tag squad-mates while typing (0265) — PO 2026-11-13: "type their name and it'll come up to click or their
 * @ and it'll come up". The rules for WHEN the list opens live in `domain/squad/mentions`; this file is the
 * field wiring, the list, and the drawn tag.
 */

/**
 * Wire a text field for tagging. The field keeps owning its text — pass it in with its setter, then spread
 * `onSelectionChange` on the TextInput and route its `onChangeText` through `onChangeText` here.
 *
 * The cursor is ESTIMATED on every change (typing at the end is the common case), then corrected by
 * `onSelectionChange` where the platform reports it. Web reports selection only on some events, so the
 * estimate is what makes the list open there at all.
 */
export function useMentions(text: string, setText: (v: string) => void, people: readonly Mentionable[] | null | undefined) {
  const [cursor, setCursor] = useState<number | null>(null);
  const [picked, setPicked] = useState<PickedMention[]>([]);

  const suggestion = useMemo(
    () => (people && people.length ? mentionSuggestions(text, Math.min(cursor ?? text.length, text.length), people) : null),
    [text, cursor, people],
  );

  const onChangeText = (v: string) => {
    const prev = text;
    setCursor((c) => (c == null || c >= prev.length ? v.length : Math.max(0, Math.min(v.length, c + (v.length - prev.length)))));
    setText(v);
  };

  const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setCursor(e.nativeEvent.selection.end);
  };

  const pick = (p: Mentionable) => {
    if (!suggestion) return;
    const r = insertMention(text, suggestion.query, p.name);
    setCursor(r.cursor);
    setText(r.text);
    setPicked((xs) => (xs.some((x) => x.id === p.id) ? xs : [...xs, { id: p.id, name: p.name }]));
  };

  /** Clear the picks after a send, so the next comment starts clean. */
  const reset = () => {
    setPicked([]);
    setCursor(null);
  };

  return {
    /** The people to offer right now, or null when the list should be shut. */
    matches: suggestion?.matches ?? null,
    pick,
    onChangeText,
    onSelectionChange,
    /** The ids still tagged in `text` — what to send to `tagMentions` after the save. */
    taggedIds: () => pickedIn(text, picked),
    reset,
  };
}

/**
 * The list. Each row keeps the keyboard up (`KEEP_KEYBOARD`) so tagging never costs the athlete their
 * place in the sentence; the hosting ScrollView must be `keyboardShouldPersistTaps="handled"` for the
 * same reason — otherwise the first tap only closes the keyboard and a second is needed to pick.
 */
export function MentionSuggestions({
  matches,
  onPick,
  style,
}: {
  matches: readonly Mentionable[] | null;
  onPick: (p: Mentionable) => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (!matches || !matches.length) return null;
  return (
    <View style={[styles.panel, style]} accessibilityLabel="Squad-mates you can tag">
      <Text style={styles.hint}>Tag someone</Text>
      {matches.map((p, i) => (
        <Pressable
          key={p.id}
          onPress={() => onPick(p)}
          {...KEEP_KEYBOARD}
          accessibilityRole="button"
          accessibilityLabel={`Tag ${p.name}`}
          style={({ pressed }) => [styles.row, i > 0 ? styles.rowDivided : null, pressed ? styles.rowPressed : null]}
        >
          <Avatar src={p.avatarUrl ?? undefined} name={p.name} size={28} />
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * A body with its tags drawn: each tagged "@Name" in the accent ink, and tapping it opens that athlete.
 * Only the people the server says were tagged are drawn — an "@Name" typed without picking stays plain.
 */
export function MentionText({ text, tagged, style }: { text: string; tagged: readonly PickedMention[] | undefined; style?: StyleProp<TextStyle> }) {
  const router = useRouter();
  const segs = useMemo(() => splitMentions(text, tagged ?? []), [text, tagged]);
  if (segs.length === 1 && !segs[0].id) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {segs.map((s, i) =>
        s.id ? (
          <Text
            key={i}
            style={styles.tag}
            onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: s.id as string } })}
            accessibilityRole="link"
            accessibilityLabel={`${s.text.slice(1)}, open profile`}
          >
            {s.text}
          </Text>
        ) : (
          <Text key={i}>{s.text}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  hint: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.labelInk,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: flColor.charcoal600 },
  rowPressed: { backgroundColor: flColor.bronzeTint },
  name: { flex: 1, minWidth: 0, fontSize: 14.5, color: flColor.cream100 },
  tag: { color: flColor.bronze300, fontWeight: '600' },
});
