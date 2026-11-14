/**
 * Tagging squad-mates in a post or comment (@-mentions) — 0265, SQ-D9 Rule 4 / SQ-D12.
 *
 * PO, 2026-11-13: "I should be able to tag people in a post if I put their @ or name right? Like facebook
 * has it where i can type their name and it'll come up to click or their @ and it'll come up."
 *
 * So there are two ways in, and both end the same way:
 *
 *   · "@" then anything — the list opens at once (everyone in the squad on a bare "@"), and narrows as
 *     letters follow. Spaces are allowed, because names have them ("@Brady Al").
 *   · A name on its own — "Brady" — opens the list only when the word starts with a capital, is three
 *     letters or more, and actually begins someone's first or last name. Anything looser and ordinary
 *     words ("the", "and") would keep pulling a list up over the keyboard.
 *
 * Tapping a person writes "@Full Name " into the text in place of what was typed. The text stays plain —
 * the tag itself (who was picked) is stored server-side by `tag_squad_mentions`, so a name that two members
 * share, or a name edited out later, can never tag the wrong person. `pickedIn` decides which picks are
 * still in the words at send time; `splitMentions` draws the stored tags in a thread.
 *
 * ⚠ PURE, NO IMPORTS. `node --test` loads this file directly, and an `@/` import would break it.
 */

export interface Mentionable {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface PickedMention {
  id: string;
  name: string;
}

export interface MentionQuery {
  /** First character the pick replaces — the "@" when one was typed, else the word's first letter. */
  start: number;
  /** One past the last character it replaces — the cursor. */
  end: number;
  /** What has been typed after the "@" (or the bare word). */
  query: string;
  /** True when the athlete typed "@": the list opens even on nothing, and lowercase is fine. */
  viaAt: boolean;
}

/** Longest stretch after an "@" still treated as a name being typed. Past this it is just text. */
const MAX_QUERY = 40;
/** "@Mary Ann Smith" is three words; a fourth means the athlete has gone on writing. */
const MAX_WORDS = 3;
/** A bare word must be at least this long before it is matched against names. */
const MIN_BARE = 3;

const isSpace = (ch: string | undefined): boolean => ch === undefined || /\s/.test(ch);
/** What may sit right before an "@" that starts a tag: nothing, a space, or opening punctuation. */
const canLeadTag = (ch: string | undefined): boolean => ch === undefined || /[\s(\[{"'“‘]/.test(ch);

/**
 * The tag being typed at the cursor, if there is one.
 *
 * Reads back from the cursor only — what follows it is never part of the query, so a tag can be added in
 * the middle of a sentence.
 */
export function activeMentionQuery(text: string, cursor: number): MentionQuery | null {
  return mentionQueries(text, cursor)[0] ?? null;
}

/** Both readings of the cursor's position, "@" first. Either, both or neither may be present. */
function mentionQueries(text: string, cursor: number): MentionQuery[] {
  const end = Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, end);
  const out: MentionQuery[] = [];

  // 1 · An "@" that starts a word, with a short single-line name-ish run after it.
  const at = before.lastIndexOf('@');
  if (at >= 0 && canLeadTag(before[at - 1])) {
    const query = before.slice(at + 1);
    const words = query.split(' ').filter(Boolean).length;
    if (!/[\n\r@]/.test(query) && query.length <= MAX_QUERY && words <= MAX_WORDS && !/^\s/.test(query)) {
      out.push({ start: at, end, query, viaAt: true });
    }
  }

  // 2 · A capitalised bare word, three letters or more, right at the cursor.
  let s = end;
  while (s > 0 && !isSpace(before[s - 1])) s--;
  const word = before.slice(s);
  if (word.length >= MIN_BARE && /^\p{Lu}[\p{L}'’-]*$/u.test(word)) {
    out.push({ start: s, end, query: word, viaAt: false });
  }
  return out;
}

/**
 * What the list should show right now: the first reading of the cursor that names somebody.
 *
 * "@" wins, but an "@" run that matches nobody falls through to the bare word — so after
 * "@Brady Altamirano Jak" the list offers Jake rather than staying shut on a three-word "@" search.
 */
export function mentionSuggestions(
  text: string,
  cursor: number,
  people: readonly Mentionable[],
): { query: MentionQuery; matches: Mentionable[] } | null {
  for (const q of mentionQueries(text, cursor)) {
    const matches = matchMentionables(people, q);
    if (matches.length) return { query: q, matches };
  }
  return null;
}

const norm = (s: string): string => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Who the list shows for a query. A bare "@" shows everyone (alphabetical); otherwise a person matches when
 * their full name starts with the query, or — for a one-word query — any of their names does.
 *
 * A bare word (no "@") must match the START of a first or last name, and shows fewer rows: it is a guess.
 */
export function matchMentionables(people: readonly Mentionable[], q: MentionQuery, limit = q.viaAt ? 6 : 4): Mentionable[] {
  const query = norm(q.query);
  if (!q.viaAt && query.length < MIN_BARE) return [];
  // A trailing space means the athlete finished the word and kept typing — "@Brady " is not a search for
  // "Brady " unless someone's name continues past it.
  const raw = q.query.toLowerCase();
  const out = people.filter((p) => {
    const name = norm(p.name);
    if (!name) return false;
    if (!query) return q.viaAt;
    if (raw.endsWith(' ')) return name.startsWith(norm(raw) + ' ');
    if (name.startsWith(query)) return true;
    if (query.includes(' ')) return false;
    return name.split(/\s+/).some((w) => w.startsWith(query));
  });
  return out.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
}

/**
 * Put "@Full Name" where the query was, followed by one space (not two, if one is already there).
 * Returns the new text and where the cursor belongs: just after that space.
 */
export function insertMention(text: string, q: MentionQuery, name: string): { text: string; cursor: number } {
  const head = text.slice(0, q.start);
  const tail = text.slice(q.end);
  const tag = `@${name.trim()}`;
  const glue = tail.startsWith(' ') ? '' : ' ';
  const next = head + tag + glue + tail;
  return { text: next, cursor: head.length + tag.length + 1 };
}

/**
 * The picks still in the words — by id, once each. A person tagged and then deleted from the text is NOT
 * tagged; neither is one whose name was edited (the "@Name" no longer appears whole).
 */
export function pickedIn(text: string, picked: readonly PickedMention[]): string[] {
  const ids: string[] = [];
  for (const p of picked) {
    if (!p.name.trim() || ids.includes(p.id)) continue;
    if (containsTag(text, p.name.trim())) ids.push(p.id);
  }
  return ids;
}

/** "@Name" appears as a whole tag: not followed by more letters ("@Bradyx" is not "@Brady"). */
function containsTag(text: string, name: string): boolean {
  const tag = `@${name}`;
  let from = 0;
  for (;;) {
    const i = text.indexOf(tag, from);
    if (i < 0) return false;
    const next = text[i + tag.length];
    if (next === undefined || !/[\p{L}\p{N}]/u.test(next)) return true;
    from = i + 1;
  }
}

export interface MentionSegment {
  text: string;
  /** Set on a tag — the person it names. */
  id?: string;
}

/**
 * Cut a body into plain runs and tags, for drawing. Only the people actually tagged (stored server-side)
 * are passed in, so an "@Name" typed without picking stays plain text. Longest names first, so "@Ann Lee"
 * wins over "@Ann" where both were tagged.
 */
export function splitMentions(text: string, tagged: readonly PickedMention[]): MentionSegment[] {
  const people = [...tagged].filter((p) => p.name.trim()).sort((a, b) => b.name.trim().length - a.name.trim().length);
  if (!text || !people.length) return [{ text }];
  const out: MentionSegment[] = [];
  let plain = '';
  let i = 0;
  while (i < text.length) {
    let hit: PickedMention | null = null;
    if (text[i] === '@') {
      for (const p of people) {
        const tag = `@${p.name.trim()}`;
        if (text.startsWith(tag, i)) {
          const next = text[i + tag.length];
          if (next === undefined || !/[\p{L}\p{N}]/u.test(next)) {
            hit = p;
            break;
          }
        }
      }
    }
    if (hit) {
      if (plain) out.push({ text: plain });
      plain = '';
      const tag = `@${hit.name.trim()}`;
      out.push({ text: tag, id: hit.id });
      i += tag.length;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (plain) out.push({ text: plain });
  return out;
}
