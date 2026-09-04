/**
 * Matching a written exercise name to the catalogue.
 *
 * A real six-day split imported with 0 of 18 names matched. Every one parsed perfectly and every one
 * resolved to nothing, because matching was exact-only and the catalogue names things fully — "Barbell
 * Bench Press", "Dumbbell Incline Bench Press" — while people write "Bench press" and "Incline Dumbbell
 * press". With no key an exercise has no detail page, no substitutions, no equipment and no honors.
 *
 * ══ TOKENS, NOT STRING SIMILARITY ══
 *
 * Edit distance would call "Front Squat" and "Back Squat" near-identical, which is how you end up
 * telling somebody they squatted something they did not. Instead the query's WORDS must all appear in
 * the candidate: "incline dumbbell press" ⊆ "dumbbell incline bench press". Word order stops mattering,
 * and a word the athlete wrote can never be ignored — so "Front Squat" cannot match "Back Squat",
 * because `front` appears in neither the other's name nor its aliases.
 *
 * ══ IT ABSTAINS ══
 *
 * Among candidates, the one carrying the FEWEST extra words wins — the closest thing to what was asked.
 * A tie is genuine ambiguity and returns nothing, except in the one documented case below. An unmatched
 * name is not a failure: it keeps what the athlete wrote and works perfectly well as a plain exercise.
 * A WRONG match is the failure, because it is invisible and permanent.
 */

export interface CatalogEntry {
  key: string;
  name: string;
  aliases?: string[];
}

export interface MatchResult {
  key: string;
  /** The catalogue's name for it, so the athlete can SEE what their words resolved to. */
  name: string;
  /** True when a documented preference broke a tie rather than the words settling it outright. */
  byPreference: boolean;
}

/**
 * How people abbreviate, expanded before anything else.
 *
 * Only unambiguous ones. "Press" could be bench, overhead or leg, so it is never expanded — a guess
 * here becomes a wrong lift in somebody's program.
 *
 * ⚠ EXPORTED SINCE 2026-09-04, AND THE REASON IS A BUG THIS TABLE COULD HAVE PREVENTED FOR MONTHS.
 *
 * PO: *"Romanian deadlift does not come up when you search RDL, which is how a lot of people know
 * it."* — and `rdl` was sitting in this table the whole time. The knowledge was never missing; it was
 * only reachable from `tokenize()`, which serves PROGRAM IMPORT. The Picker's search box runs a
 * different function (`search-core.ts`) that had never heard of any of these. So the app could read
 * "RDL" out of an imported spreadsheet and resolve it perfectly, and then fail to find it when the
 * same athlete typed the same three letters into the search field.
 *
 * One table, both readers, from here on.
 */
export const ABBREVIATIONS: Record<string, string> = {
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  bw: 'bodyweight',
  ez: 'ez bar',
  sldl: 'stiff leg deadlift',
  gm: 'good morning',
  pullup: 'pull up',
  pushup: 'push up',
  chinup: 'chin up',
  situp: 'sit up',
  latpulldown: 'lat pulldown',
  /*
   * ── ADDED 2026-09-04, EACH ONE MEASURED AT ZERO RESULTS FIRST ────────────────────────────────────
   *
   * ⚠ AN EXPANSION HERE BEATS AN ALIAS IN `aliases.ts` WHENEVER THE SHORTHAND IS ONE TOKEN, and the
   * difference is not stylistic. An alias pins a name to ONE catalogue id: `dl` would have had to
   * choose a single deadlift out of 22. Expanding to the WORD instead lets the ordinary matcher run,
   * so "dl" returns every deadlift the catalogue has and "dl romanian" narrows to the Romanian ones —
   * which is what the athlete meant by typing two letters instead of eight.
   *
   * Multi-word shorthand ("farmers walk") cannot live here, because this table is keyed per token.
   * That is what `EXERCISE_SYNONYMS` is for.
   */
  dl: 'deadlift',
  bss: 'bulgarian split squat',
  ghr: 'glute ham developer raise',
  ghd: 'glute ham developer',
  ohs: 'overhead squat',
  cgbp: 'close grip bench press',
  t2b: 'toes to bar',
  ttb: 'toes to bar',
  c2b: 'chest to bar',
  /* A spelling, not a different lift — so it is normalised here rather than aliased to one row. "Fly"
     names a FAMILY (chest, rear-delt, cable), and `aliases.ts` forbids pinning a family to a member. */
  flye: 'fly',
  /* What most gyms call the Back Extension. The catalogue holds no row with "hyper" in it at all. */
  hyper: 'back extension',
  hyperextension: 'back extension',
};

/** Words that carry no identity — dropping them lets "Seated row" reach "Seated Cable Row". */
const NOISE = new Set(['the', 'a', 'and', 'or', 'with', 'on', 'to', 'for', 'of', 'exercise', 'variation']);

/**
 * Equipment preference when the athlete named NO equipment at all.
 *
 * "Bench press" is every equipment variant at once by the words alone. In a gym it means the barbell,
 * and refusing to say so leaves the single most common lift in the catalogue permanently unmatched.
 *
 * Barbell first, then dumbbell — an order chosen by testing it, not by taste. Cable outranked dumbbell
 * in the first version and turned "Lateral Raises" into a CABLE lateral raise, which is not what anybody
 * means by those words. It is a convention rather than a fact, which is exactly why every match it makes
 * is flagged `byPreference` and shown to the athlete before a program is created.
 */
const EQUIPMENT_PREFERENCE = ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'kettlebell', 'band'];

/**
 * Implements a bare exercise name never means.
 *
 * "Leg curls" resolved to a BAND leg curl — the nearest candidate by word count, because the catalogue
 * happens to hold that variant under a shorter name than the machine one. Nobody writing "leg curls"
 * means a band. When the ONLY thing an athlete's words add up to is one of these, the catalogue does not
 * have the lift they meant, and saying so is better than handing them a different one.
 */
const OBSCURE_IMPLEMENTS = new Set(['band', 'smith', 'kettlebell']);

/**
 * ⚠ EXPORTED 2026-09-04, and for the same reason `ABBREVIATIONS` was: the search box had never heard
 * of it, so **every plural query in the app returned nothing**. "squats", "curls", "rows",
 * "deadlifts", "lunges", "dips", "shrugs", "crunches", "planks" — all zero, on a 733-row catalogue,
 * under both the old substring rule and its replacement. Measured, not assumed.
 *
 * That is very likely a larger everyday failure than the RDL report that started this, because typing
 * the plural is not a shorthand or a regionalism — it is just how people name a movement they are
 * about to do several sets of.
 */
export function singular(w: string): string {
  if (w.length > 3 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith('es') && /(sh|ch|ss|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 2 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** A name reduced to the set of words that identify it. */
export function tokenize(raw: string): Set<string> {
  const expanded = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .flatMap((w) => (ABBREVIATIONS[w] ?? w).split(' '));
  return new Set(expanded.map(singular).filter((w) => w && !NOISE.has(w)));
}

const isSubset = (small: Set<string>, big: Set<string>) => [...small].every((w) => big.has(w));

/**
 * Resolve a written name to a catalogue entry, or to nothing.
 *
 * `catalog` is injected so this stays pure and testable — the real 797-entry list arrives from the
 * picker's data module at the call site.
 */
export function matchExercise(written: string, catalog: readonly CatalogEntry[]): MatchResult | null {
  const q = tokenize(written);
  if (q.size === 0) return null;

  // Every name an entry answers to — its own, plus any aliases.
  const candidates: { entry: CatalogEntry; tokens: Set<string>; extra: number }[] = [];
  for (const entry of catalog) {
    let best: number | null = null;
    for (const name of [entry.name, ...(entry.aliases ?? [])]) {
      const t = tokenize(name);
      if (!isSubset(q, t)) continue;
      const extra = t.size - q.size;
      if (best == null || extra < best) best = extra;
    }
    if (best != null) candidates.push({ entry, tokens: tokenize(entry.name), extra: best });
  }
  if (candidates.length === 0) return null;

  const fewest = Math.min(...candidates.map((c) => c.extra));
  const tied = candidates.filter((c) => c.extra === fewest);

  const namedEquipmentEarly = [...q].some((w) => EQUIPMENT_PREFERENCE.includes(w));

  /*
   * ONE WORD IS NOT ENOUGH TO PICK A VARIANT.
   *
   * "Dips" matched "Bench Dip" — a unique nearest candidate, and the wrong exercise: bench dips are not
   * what anybody means by "dips". A single generic word may only resolve to an exact name or to an
   * equipment variant of itself; a qualifier the athlete never wrote ("bench", "assisted", "deficit")
   * cannot be assumed. Multi-word queries are specific enough that the nearest candidate is trustworthy
   * — "incline dumbbell press" reaching "Dumbbell Incline Bench Press" is right, and its extra word is
   * only "bench".
   */
  const usable =
    q.size === 1 && !namedEquipmentEarly
      ? tied.filter(
          (c) =>
            [...c.tokens].every((w) => q.has(w) || EQUIPMENT_PREFERENCE.includes(w)) &&
            /*
             * AND the implement must be one a bare word could plausibly mean.
             *
             * "Squats" resolved to a CABLE squat and "Leg curls" to a BAND leg curl — each the nearest
             * candidate by word count, and neither what anybody means. When somebody writes one generic
             * word they mean the barbell or the dumbbell; if the catalogue only offers a cable, machine
             * or band variant of it, the honest answer is that it does not have the lift they meant.
             */
            [...c.tokens].every((w) => q.has(w) || w === 'barbell' || w === 'dumbbell'),
        )
      : tied;
  if (usable.length === 0) return null;
  if (usable.length === 1) {
    const only = usable[0];
    // Purely an implement choice the athlete never made, and an implement nobody means by a bare name.
    if (!namedEquipmentEarly) {
      const added = [...only.tokens].filter((w) => !q.has(w));
      if (added.length === 1 && OBSCURE_IMPLEMENTS.has(added[0])) return null;
    }
    return { key: only.entry.key, name: only.entry.name, byPreference: only.extra > 0 && q.size === 1 };
  }

  /*
   * Tied. Break it ONLY when the athlete named no equipment and the candidates differ by nothing else —
   * every tied entry must carry exactly one preference word, and they must be different ones. Anything
   * more complicated than that is real ambiguity and gets no answer.
   */
  if (!namedEquipmentEarly) {
    const byEquip = new Map<string, (typeof usable)[number]>();
    let clean = true;
    for (const c of usable) {
      const equip = [...c.tokens].filter((w) => EQUIPMENT_PREFERENCE.includes(w));
      const rest = [...c.tokens].filter((w) => !EQUIPMENT_PREFERENCE.includes(w)).sort().join(' ');
      const qRest = [...q].sort().join(' ');
      if (equip.length !== 1 || rest !== qRest || byEquip.has(equip[0])) {
        clean = false;
        break;
      }
      byEquip.set(equip[0], c);
    }
    if (clean) {
      for (const pref of EQUIPMENT_PREFERENCE) {
        const win = byEquip.get(pref);
        if (win) return { key: win.entry.key, name: win.entry.name, byPreference: true };
      }
    }
  }

  return null; // genuinely ambiguous — keep what they wrote
}
