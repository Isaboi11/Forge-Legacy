/**
 * WHAT HOLT IS TOLD WHEN AN ATHLETE ASKS HIM SOMETHING
 *
 * Coach-AI-Amendment-001 CA-D5, *"Retrieval, not generation"*: exercise questions answer from the published
 * coaching records, and "why does my plan look like this" answers from `rulebook/rationale.ts`. This builds
 * that retrieval for the `ask` job — the `AskContext` that `coach-ask` puts in the user turn.
 *
 * ══ SMALL ON PURPOSE ══
 *
 * A few hundred tokens: a one-line program summary, at most three coaching records trimmed to their best
 * points, and a rationale only when the question is a "why". Every token here is paid on every message,
 * uncached, so nothing goes in "just in case".
 *
 * ══ PURE, AND THE CATALOGUE IS INJECTED ══
 *
 * `exercise-picker/data.ts` imports JSON in a way `node --test` cannot load, and the coaching store is a
 * 4.6 MB JSON file. So both arrive as `AskSources` — the app passes `catalogForMatching()` and a lookup over
 * `getExerciseDetailCoaching` (`askSourcesLive()` in `data/coach-ask-live.ts`); the tests pass the real
 * files read from disk.
 *
 * ══ FINDING NAMES IN A SENTENCE ══
 *
 * The resolver (`resolveAgainstCatalog`) answers "what is this name?", not "which names are in this
 * sentence?". So this slides a window over the words, longest first, and asks the resolver about each
 * window whose every word is one the catalogue actually uses. The resolver's own safety properties —
 * abstaining on ambiguity, "front squat" never reaching "back squat" — carry over unchanged, and a word the
 * catalogue has never used ("my", "is", "why") is never sent to it at all.
 */

import { ALIAS_INDEX, aliasKey, resolveAgainstCatalog } from '../exercise-picker/aliases.ts';
import { ABBREVIATIONS, tokenize, type CatalogEntry } from '../program/exercise-match.ts';
import { rationaleFor, type RationaleInput } from './rulebook/rationale.ts';
import type { AskContext, AskTurn } from './ask-wire.ts';

export type { AskContext, AskTurn } from './ask-wire.ts';

/** The published coaching view for one exercise — `ExerciseCoachingView`'s fields this reads. */
export interface AskCoachingView {
  whyItMatters: string | null;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  safetyNotes: string[];
}

export interface AskSources {
  /** The VISIBLE catalogue — `catalogForMatching()`, never the raw file (hidden rows are not answers). */
  catalog: readonly CatalogEntry[];
  /** Published coaching only; null when the exercise has none. */
  coachingFor: (key: string) => AskCoachingView | null;
}

/** The parts of a program this reads. `ProgramStructure` (data/programs-live.ts) satisfies it. */
export interface AskProgramStructure {
  name: string;
  weeks: number;
  daysPerWeek: number;
  vary?: boolean;
  days: AskProgramDay[];
  weekPlans?: { days: AskProgramDay[] }[] | null;
}
export interface AskProgramDay {
  letter?: string;
  name: string;
  warmup?: AskProgramExercise[];
  main: AskProgramExercise[];
  cooldown?: AskProgramExercise[];
}
export interface AskProgramExercise {
  catalogKey?: string;
  name: string;
  sets?: number;
  reps?: number | null;
}

export interface AskContextInput {
  question: string;
  /** This conversation's turns (CA-D1). Scanned for exercise names after the question, newest first. */
  history?: readonly AskTurn[];
  /** The program the question is about — usually the active one. */
  program?: {
    structure: AskProgramStructure;
    /** 1-based current week, when known. */
    week?: number | null;
    /** Today's session names, when known ("Upper A"). */
    today?: readonly string[] | null;
  } | null;
  /**
   * Why the plan is shaped this way: the builder's own sentence, or the inputs to `rationaleFor`. Only
   * attached to "why"-type questions.
   */
  rationale?: string | RationaleInput | null;
}

/** At most this many coaching records per question (CA-D5 — the context stays small). */
export const ASK_COACHING_MAX = 3;
/** Characters per coaching record. ~100 tokens. */
const RECORD_CHARS = 420;
/** The longest exercise name worth a window ("single leg dumbbell romanian deadlift"). */
const WINDOW_MAX = 6;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Names in a sentence
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Vocab {
  words: Set<string>;
  /** Longer words only, for the typo pass. */
  long: string[];
}

const VOCAB_CACHE = new WeakMap<readonly CatalogEntry[], Vocab>();

/** Every word the catalogue (and the curated aliases) uses, after the matcher's own normalisation. */
function vocabFor(catalog: readonly CatalogEntry[]): Vocab {
  const hit = VOCAB_CACHE.get(catalog);
  if (hit) return hit;
  const words = new Set<string>();
  for (const e of catalog) {
    for (const n of [e.name, ...(e.aliases ?? [])]) for (const w of tokenize(n)) words.add(w);
  }
  for (const k of ALIAS_INDEX.keys()) for (const w of k.split(' ')) if (w) words.add(w);
  const v = { words, long: [...words].filter((w) => w.length >= 5) };
  VOCAB_CACHE.set(catalog, v);
  return v;
}

/** Edit distance ≤ 1, counting an adjacent swap as one ("deadlfit" → "deadlift"). */
function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i += 1;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // swap
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * The sentence's words, each typo-corrected to a catalogue word when exactly one is a single edit away.
 *
 * Only words of 5+ letters, and never the first letter — a typo is a slip mid-word, while a different
 * first letter is usually a different word ("rounding" is not "bounding"). A plural abbreviation ("RDLs")
 * is singularised first, because the abbreviation table is keyed on the singular.
 */
function wordsOf(text: string, vocab: Vocab): string[] {
  const raw = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return raw.map((w) => {
    if (w.length > 2 && w.endsWith('s') && ABBREVIATIONS[w.slice(0, -1)]) return w.slice(0, -1);
    if (w.length < 5) return w;
    const known = [...tokenize(w)].every((t) => vocab.words.has(t));
    if (known) return w;
    const near = vocab.long.filter((v) => v[0] === w[0] && (withinOne(w, v) || withinOne(w.replace(/s$/, ''), v)));
    return near.length === 1 ? near[0] : w;
  });
}

/**
 * A sentence cut where one name ends and another begins — punctuation and the words people put between two
 * lifts. Without this, "bench press or incline dumbbell press" is one window that reads as a single
 * incline press, and "bigger arms, curls" as a single-arm curl.
 */
const SEGMENT_BREAK = /[,.;:!?/()&\n]+|\b(?:and|or|vs|versus|than|then|but|instead|plus)\b/i;
const segmentsOf = (text: string): string[] => text.split(SEGMENT_BREAK).filter((s) => s && s.trim());

export interface ExerciseMention {
  key: string;
  name: string;
}

/**
 * Catalogue exercises named in `text`, in the order they appear, longest name first where two overlap.
 * Abstains where the resolver abstains — an ambiguous name is left out, never guessed.
 */
export function findExerciseMentions(text: string, catalog: readonly CatalogEntry[], max = ASK_COACHING_MAX): ExerciseMention[] {
  const vocab = vocabFor(catalog);
  const found: { at: number; key: string; name: string }[] = [];
  const seen = new Set<string>();
  let offset = 0;

  for (const segment of segmentsOf(text)) {
    const words = wordsOf(segment, vocab);
    const used = new Array<boolean>(words.length).fill(false);
    for (let size = Math.min(WINDOW_MAX, words.length); size >= 1; size -= 1) {
      for (let start = 0; start + size <= words.length; start += 1) {
        if (used.slice(start, start + size).some(Boolean)) continue;
        const phrase = words.slice(start, start + size).join(' ');
        const tokens = [...tokenize(phrase)];
        if (tokens.length === 0) continue;
        const inCatalogue = tokens.every((t) => vocab.words.has(t)) || ALIAS_INDEX.has(aliasKey(phrase));
        if (!inCatalogue) continue;
        const hit = resolveAgainstCatalog(phrase, catalog);
        if (!hit) continue;
        for (let i = start; i < start + size; i += 1) used[i] = true;
        if (seen.has(hit.key)) continue;
        seen.add(hit.key);
        found.push({ at: offset + start, key: hit.key, name: hit.name });
      }
    }
    offset += words.length;
  }
  return found
    .sort((a, b) => a.at - b.at)
    .slice(0, max)
    .map(({ key, name }) => ({ key, name }));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Coaching records → a few lines
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const firstSentence = (s: string): string => {
  const m = s.match(/^.+?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
};

/** The record's best points: the one cue that matters most leads, then setup, then what goes wrong. */
export function coachingText(v: AskCoachingView): string {
  const parts: string[] = [];
  if (v.tips.length) parts.push(`Cues: ${v.tips.slice(0, 3).join(' ')}`);
  if (v.instructions.length) parts.push(`Setup: ${v.instructions.slice(0, 2).join(' ')}`);
  if (v.commonMistakes.length) parts.push(`Watch for: ${v.commonMistakes.slice(0, 2).join(' ')}`);
  if (v.safetyNotes.length) parts.push(`Safety: ${v.safetyNotes[0]}`);
  if (v.whyItMatters) parts.push(`Why: ${firstSentence(v.whyItMatters)}`);
  let out = '';
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > RECORD_CHARS) break;
    out = next;
  }
  return out || parts[0]?.slice(0, RECORD_CHARS) || '';
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The program and the "why"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** "Why is X in my plan", "what's the point of", "how come", "explain my program". */
const WHY = /\b(why|how come|what'?s the (point|reason|idea)|reason(ing)? (for|behind)|point of|explain (my|the|this) (plan|program|block|week|split))\b/i;

export const isWhyQuestion = (q: string): boolean => WHY.test(q);

const daysOfWeek = (s: AskProgramStructure, weekIndex: number): AskProgramDay[] =>
  s.vary && s.weekPlans && s.weekPlans[weekIndex] ? s.weekPlans[weekIndex].days : s.days;

/** "Strength Block — week 3 of 8, 4 days a week. Today: Upper A." */
export function programSummary(p: NonNullable<AskContextInput['program']>): string {
  const s = p.structure;
  const weeks = Math.max(1, s.weeks);
  const week = p.week && p.week >= 1 ? `week ${Math.min(p.week, weeks)} of ${weeks}` : `${weeks} week${weeks === 1 ? '' : 's'}`;
  const today = (p.today ?? []).filter(Boolean);
  return `${s.name.trim() || 'Untitled program'} — ${week}, ${s.daysPerWeek} day${s.daysPerWeek === 1 ? '' : 's'} a week.${
    today.length ? ` Today: ${today.join(', ')}.` : ''
  }`;
}

/** Where a named exercise sits in the program this week: "Barbell Romanian Deadlift: Lower B, 3×8." */
function placementOf(m: ExerciseMention, p: NonNullable<AskContextInput['program']>): string | null {
  const weekIndex = p.week && p.week >= 1 ? p.week - 1 : 0;
  const places: string[] = [];
  for (const d of daysOfWeek(p.structure, weekIndex)) {
    for (const x of [...(d.warmup ?? []), ...d.main, ...(d.cooldown ?? [])]) {
      const same = x.catalogKey ? x.catalogKey === m.key : x.name.trim().toLowerCase() === m.name.toLowerCase();
      if (!same) continue;
      const rx = x.sets && x.reps ? `, ${x.sets}×${x.reps}` : x.sets ? `, ${x.sets} sets` : '';
      places.push(`${d.name}${rx}`);
      break;
    }
  }
  return places.length ? `${m.name} is on ${places.slice(0, 3).join('; ')}.` : null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The context
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Build the `ask` context for one question. Never throws on odd input; an empty result is a valid answer
 * (Holt answers from general knowledge and the prompt tells him not to pretend otherwise).
 */
export function buildAskContext(input: AskContextInput, sources: AskSources): AskContext {
  const ctx: AskContext = {};
  const question = (input.question ?? '').trim();

  // Exercises: the question first, then this conversation newest-first, so "and what about the grip?"
  // after a turn about RDLs still gets the RDL record.
  const mentions: ExerciseMention[] = [];
  const seen = new Set<string>();
  const texts = [question, ...[...(input.history ?? [])].reverse().map((t) => t.text)];
  for (const text of texts) {
    if (mentions.length >= ASK_COACHING_MAX) break;
    if (!text) continue;
    for (const m of findExerciseMentions(text, sources.catalog, ASK_COACHING_MAX)) {
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      mentions.push(m);
      if (mentions.length >= ASK_COACHING_MAX) break;
    }
  }

  const coaching: { name: string; text: string }[] = [];
  for (const m of mentions) {
    const view = sources.coachingFor(m.key);
    const text = view ? coachingText(view) : '';
    if (text) coaching.push({ name: m.name, text });
  }
  if (coaching.length) ctx.coaching = coaching;

  if (input.program?.structure) ctx.program = programSummary(input.program);

  if (isWhyQuestion(question)) {
    const why: string[] = [];
    const r = input.rationale;
    if (typeof r === 'string' && r.trim()) why.push(r.trim());
    else if (r && typeof r === 'object') {
      const line = rationaleFor(r);
      if (line) why.push(line);
    }
    // Where the exercise they asked about actually sits — only for names in the QUESTION, so an earlier
    // turn's lift does not answer a new "why".
    if (input.program?.structure) {
      for (const m of findExerciseMentions(question, sources.catalog, ASK_COACHING_MAX)) {
        const at = placementOf(m, input.program);
        if (at) why.push(at);
      }
    }
    if (why.length) ctx.rationale = why.join(' ');
  }

  return ctx;
}
