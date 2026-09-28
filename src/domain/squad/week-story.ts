/**
 * ══ THE SQUAD'S WEEK, TOLD AS A STORY ══
 *
 * PO, 2026-09-28: *"How can we make the squad summaries feel more emotionally … grabbing? Right now it's
 * just a list of things. How can we tell a story of the week? Shout people out? Help everyone feel amazing
 * that they contributed? How we worked as a team to accomplish something great?"* Approved mockup:
 * https://claude.ai/artifact/C2coURw351Dggbq4eTSKYE · governed by `Squad-Architecture-Amendment-008`.
 *
 * The database snapshots the FACTS once, when the week closes (`squad_week_story`, 0233). This file writes
 * the WORDS from them, so the voice can be tuned by a phone update and never needs SQL.
 *
 * ⚠ THE RULES THE WORDS KEEP:
 *   · NOBODY IS RANKED (SQ-D8 §4, kept by A-008). Everyone who trained gets ONE line about their own best
 *     moment, listed A→Z. No "top performer", no ordering by size, no "most" across people.
 *   · NOBODY IS CALLED OUT. A member who did not train is never named. The opening counts everyone
 *     ("7 of 9 of you") and the close is an open door.
 *   · THE SQUAD'S OWN GOAL, NEVER A THEME. Holt says "the squad goal" and uses the goal's own title — a
 *     monthly theme like Squatober is not something he should remember (PO 2026-09-28).
 *   · A SLOWER WEEK IS NOT SCOLDED. "↑ 5 on last week" appears only when it went up.
 */

export interface StoryMember {
  id: string;
  name: string;
  workouts: number;
  /** ISO weekdays trained, 1 = Monday … 7 = Sunday. */
  days: number[];
  lb: number;
  mi: number;
  new_to_squad: boolean;
  first_ever: boolean;
  /** Days between their last workout before this week and their first this week. Null when first_ever. */
  gap_days: number | null;
  /** More workouts this week than in any week before it. */
  best_week: boolean;
  prs: { exercise: string; value: string }[];
  honors: string[];
  /** Their piece of the squad goal this week, in the goal's unit. Null when there is no goal. */
  goal: number | null;
}

export interface StoryFacts {
  prev_workouts: number;
  lb: number;
  mi: number;
  goal_before: number | null;
  members: StoryMember[];
  together: { a: string; b: string; day: number }[];
}

export interface StoryRecap {
  workouts: number;
  participation: { active: number; total: number };
  prCount: number;
  honorCount: number;
  goal: { title: string | null; kind: string; target: number } | null;
}

/** A run of text, bold or not — so a line can say "Pulled **245 lb** on deadlift". */
export type Seg = { t: string; b?: boolean };

export type Chip = 'comeback' | 'welcome' | 'first' | 'best' | 'streak' | 'honor' | 'showed';

export interface ShoutOut {
  id: string;
  name: string;
  chip: Chip;
  chipLabel: string;
  line: Seg[];
  /** Mon…Sun, trained or not. */
  week: boolean[];
  detail: string;
  goal: number | null;
}

export interface WeekStory {
  headline: { lead: string; em: string };
  body: string;
  together: { value: string; unit: string; compare: string | null };
  facts: { text: string; up?: boolean }[];
  goal: {
    title: string;
    unit: string;
    target: number;
    before: number;
    after: number;
    pct: number;
    pctBefore: number;
    pieces: { id: string; name: string; value: number }[];
  } | null;
  shoutOuts: ShoutOut[];
  moments: string[];
  close: { title: string; body: string };
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => (n >= 0 && n < WORDS.length ? WORDS[n] : n.toLocaleString('en-US'));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const fmt = (n: number) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10).toLocaleString('en-US');

/** The squad goal's unit, spoken. Mirrors `GOAL_UNITS` in the squad data layer. */
export const GOAL_UNIT_WORDS: Record<string, string> = {
  workout_count: 'workouts',
  distance_total: 'miles',
  volume_total: 'lb',
  time_total: 'hours',
  pr_count: 'new bests',
};

/*
 * ══ HOLT HAS MORE THAN ONE WAY TO SAY IT ══
 *
 * PO, 2026-09-28: *"make sure that coach holt has a variety and it's not the same every time. He's a person
 * and coach so we want things to be creative and fun and encouraging and coach like. He has a personality so
 * use it."*
 *
 * Every line below has several phrasings, written to `Holt-Voice-Amendment-001`: warm and on your side
 * (HV-D1), praise that is earned and specific, never cheesy (HV-D2), at most one "!" and only on a real win
 * (HV-D3), the size of the moment sets the size of the reaction (HV-D4), and he never counts misses (HV-D5 —
 * so a comeback is "good to have Jay back", never "back after two weeks off").
 *
 * ⚠ CHOSEN, NOT RANDOM. The whole squad reads the same summary, and it must read the same every time it is
 * opened, so the phrasing is picked from the week and the squad:
 *   · `(week number + hash(squad, slot)) % n` — the same summary always says the same thing, and the next
 *     week's summary lands on the NEXT phrasing for every slot, so two weeks in a row never repeat a line.
 *   · Two people with the same kind of moment in one week get consecutive phrasings, so the roll call does
 *     not read like a form letter.
 */

type Pick = <T>(slot: string, options: readonly T[], offset?: number) => T;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The week's number since 1970, from its start date. Consecutive weeks are consecutive numbers. */
export function weekNumber(weekStartISO: string): number {
  const t = Date.parse(weekStartISO);
  return Number.isFinite(t) ? Math.floor((t + 3 * 86400000) / (7 * 86400000)) : 0;
}

export function makePick(squadKey: string, week: number): Pick {
  return (slot, options, offset = 0) => options[(week + hash(`${squadKey}|${slot}`) + offset) % options.length];
}

/** "that" of a count: "one workout", "three workouts". */
const workouts = (n: number) => `${word(n)} ${n === 1 ? 'workout' : 'workouts'}`;
const B = (t: string): Seg => ({ t, b: true });
const T = (t: string): Seg => ({ t });

/**
 * Something the size of the week's total, so a number becomes a picture. Each reference is the size it is
 * commonly quoted at, and the line says "more than" — never "exactly" — so it is always true.
 */
const LB_REFERENCES: [number, string][] = [
  [400000, 'More than an empty jumbo jet.'],
  [80000, 'More than a fully loaded semi truck.'],
  [35000, 'More than an empty semi truck.'],
  [12000, 'More than an elephant.'],
  [4000, 'More than a car.'],
  [1000, 'More than a grand piano.'],
];
const LB_TAILS = ['Nobody lifts that alone.', "That's a team number.", 'Try doing that by yourself.', 'Every one of you is in that number.'];

export function lbCompare(lb: number, pick: Pick = makePick('', 0)): string | null {
  const hit = LB_REFERENCES.find(([at]) => lb >= at);
  return hit ? `${hit[1]} ${pick('lb-tail', LB_TAILS)}` : null;
}

export function miCompare(mi: number, pick: Pick = makePick('', 0)): string | null {
  if (mi >= 52.4) {
    const k = Math.floor(mi / 26.2);
    return pick('mi-many', [`That's ${k} marathons. Nobody runs that alone.`, `${cap(word(k))} marathons, between all of you.`, `${cap(word(k))} marathons of ground covered, as a team.`]);
  }
  if (mi >= 26.2) return pick('mi-full', ['A full marathon, together.', 'Marathon distance, as a team.', "That's 26.2 and change, between you."]);
  if (mi >= 13.1) return pick('mi-half', ['A half marathon, together.', 'Half-marathon distance, as a team.', "That's a half marathon, split between friends."]);
  return null;
}

/**
 * ONE line per person — their best moment of the week, by a fixed order of what matters most to hear.
 * The order is about the moment, never about comparing people: a comeback is told before a PR because
 * coming back is the harder thing to do, for anyone.
 *
 * `nth` is how many people before this one (A→Z) got the same kind of moment this week, so they get the
 * next phrasing along.
 */
export function momentOf(m: StoryMember): Chip {
  if (m.gap_days != null && m.gap_days >= 14) return 'comeback';
  if (m.first_ever) return 'first';
  if (m.new_to_squad) return 'welcome';
  if (m.prs.length > 0) return 'best';
  if (m.best_week && m.workouts >= 2) return 'streak';
  if (m.honors.length > 0) return 'honor';
  return 'showed';
}

const CHIP_LABEL: Record<Chip, string> = {
  comeback: 'Welcome back',
  first: 'First week',
  welcome: 'Welcome',
  best: 'New best',
  streak: 'Best week',
  honor: 'Honor',
  showed: 'Showed up',
};

export function shoutOut(m: StoryMember, pick: Pick = makePick('', 0), nth = 0): ShoutOut {
  const week = [1, 2, 3, 4, 5, 6, 7].map((d) => m.days.includes(d));
  const n = m.workouts;
  const detailBits = [`${n} ${n === 1 ? 'workout' : 'workouts'}`];
  if (m.lb > 0) detailBits.push(`${fmt(m.lb)} lb moved`);
  if (m.mi > 0) detailBits.push(`${fmt(m.mi)} mi`);
  const chip = momentOf(m);
  const base = { id: m.id, name: m.name, week, detail: detailBits.join(' · '), goal: m.goal, chip, chipLabel: CHIP_LABEL[chip] };
  const who = first(m.name);
  const N = cap(workouts(n));
  const days = week.filter(Boolean).length;

  let line: Seg[];
  switch (chip) {
    case 'comeback':
      line = pick('comeback', [
        [T(`Good to have ${who} back. `), B(n > 1 ? `${N} this week` : 'One in the book'), T(', and we start from here.')],
        [B('Back in the gym'), T(n > 1 ? `, and ${workouts(n)} deep already.` : ', and that first one back is the hardest one.')],
        [B(`${who}'s back.`), T(' That first session back takes more than any PR.')],
        [B('Back at it'), T(` with ${workouts(n)}. The door's always open.`)],
      ], nth);
      break;
    case 'first':
      line = pick('first', [
        [B(N), T(` in ${who}'s first week of training. It starts here.`)],
        [B('Week one, done.'), T(` ${N} on the record, and now there's a number to beat.`)],
        [B('First week in the books'), T(` with ${workouts(n)}. Every legacy starts exactly like this.`)],
      ], nth);
      break;
    case 'welcome':
      line = pick('welcome', [
        [B(N), T(` in ${who}'s first week with the squad. Welcome, ${who}.`)],
        [B('New to the squad'), T(` and already ${workouts(n)} in. Glad you're here.`)],
        [B('Welcome aboard.'), T(` ${N} in week one — that's how you introduce yourself.`)],
      ], nth);
      break;
    case 'best': {
      const pr = m.prs[0];
      const more = m.prs.length > 1 ? pick('best-more', [` One of ${word(m.prs.length)} new bests this week.`, ` And ${word(m.prs.length - 1)} more where that came from.`]) : '';
      line = pick('best', [
        [T(`${pr.exercise}: `), B(pr.value), T(`, a new best!${more}`)],
        [T(`New best on ${pr.exercise}: `), B(pr.value), T(`. That's the work showing up.${more}`)],
        [B(pr.value), T(` on ${pr.exercise}. Never been there before.${more}`)],
        [T(`${pr.exercise} went to `), B(pr.value), T(`. Weeks of work in one lift.${more}`)],
      ], nth);
      break;
    }
    case 'streak':
      line = pick('streak', [
        [B(N), T(' — the most in any week yet.')],
        [B('Best week yet:'), T(` ${workouts(n)}. That's a new high-water mark.`)],
        [B(`${cap(word(n))} sessions.`), T(` A new high for ${who}, and it won't be the last.`)],
      ], nth);
      break;
    case 'honor': {
      const honor = m.honors[0];
      line = pick('honor', [
        [T('Earned '), B(honor), T('!')],
        [B(honor), T(' earned this week. Worn well.')],
        [T('Walked away with '), B(honor), T('. It goes on the record for good.')],
      ], nth);
      break;
    }
    default:
      line = days >= 3
        ? pick('showed-many', [
            [B(`${cap(word(days))} days`), T(' this week. That consistency is the whole game.')],
            [B(`${cap(word(days))} days`), T(' in the gym. Quietly stacking weeks.')],
            [T('Trained '), B(`${word(days)} days`), T(". That's how it's built — one week on top of the last.")],
          ], nth)
        : pick('showed-few', [
            [B(N), T(' toward the squad this week.')],
            [B('Showed up'), T(` — ${workouts(n)} in the book. That counts.`)],
            [B(`${N}.`), T(' Every one of them moved the squad.')],
          ], nth);
  }
  return { ...base, line };
}

/**
 * The story. `squadKey` + the week number choose Holt's phrasing (see "CHOSEN, NOT RANDOM" above) — pass the
 * squad id, so every member of the squad reads the same words.
 */
export function buildWeekStory(recap: StoryRecap & { weekStart?: string }, facts: StoryFacts, squadKey = ''): WeekStory {
  const pick = makePick(squadKey, weekNumber(recap.weekStart ?? ''));
  const { active, total } = recap.participation;
  const members = [...facts.members].sort((a, b) => a.name.localeCompare(b.name));
  const seen: Partial<Record<Chip, number>> = {};
  const shoutOuts = members.map((m) => {
    const chip = momentOf(m);
    const nth = seen[chip] ?? 0;
    seen[chip] = nth + 1;
    return shoutOut(m, pick, nth);
  });

  // ── the goal, built from everyone's piece ──
  let goal: WeekStory['goal'] = null;
  if (recap.goal && facts.goal_before != null && recap.goal.target > 0) {
    const pieces = members.filter((m) => (m.goal ?? 0) > 0).map((m) => ({ id: m.id, name: m.name, value: m.goal as number }));
    const before = facts.goal_before;
    const after = before + pieces.reduce((s, p) => s + p.value, 0);
    const pct = (v: number) => Math.min(100, Math.round((v / recap.goal!.target) * 100));
    goal = {
      title: recap.goal.title?.trim() || 'Squad goal',
      unit: GOAL_UNIT_WORDS[recap.goal.kind] ?? '',
      target: recap.goal.target,
      before,
      after,
      pct: pct(after),
      pctBefore: pct(before),
      pieces,
    };
  }
  const goalDone = !!goal && goal.after >= goal.target && goal.before < goal.target;
  const goalMoved = !!goal && goal.after > goal.before;

  // ── Holt's opening ──
  const A = cap(word(active));
  const solo = first(members[0]?.name ?? 'One of you');
  const lead =
    active >= total && total > 1
      ? pick('lead-all', [`All ${word(total)} of you showed up`, `Full squad this week — all ${word(total)} of you`, 'Every single one of you trained this week'])
      : active === 1
        ? pick('lead-solo', [`${solo} kept the squad moving`, `${solo} held the line this week`, `${solo} trained for all of us this week`])
        : active * 2 >= total
          ? pick('lead-most', [`${A} of you showed up`, `${A} of you put in the work`, `${A} of you got after it this week`, `${A} of you answered the bell`])
          : pick('lead-few', [`${A} of you carried the flag this week`, `${A} of you kept the fire lit`, `${A} of you showed up, and it counted`]);
  const bests = recap.prCount;
  const em = goalDone
    ? pick('em-done', ['and the squad goal is done!', 'and you finished the squad goal!'])
    : goalMoved
      ? pick('em-goal', ['and the squad goal moved.', 'and the squad goal took a real step.', 'and the goal bar felt every rep.', 'and you pushed the squad goal forward.'])
      : bests > 0
        ? bests === 1
          ? pick('em-best1', ['and a new best fell.', 'and somebody found a new best.'])
          : pick('em-bests', [`and ${word(bests)} new bests fell.`, `and ${word(bests)} personal records went down.`, `and the bests kept coming — ${word(bests)} of them.`])
        : pick('em-plain', ['and it added up.', 'and every session counted.', 'and the work stacked up.']);

  const sentences: string[] = [];
  const bestPeople = members.filter((m) => m.prs.length > 0);
  if (bestPeople.length > 1) sentences.push(pick('s-bests', [`${cap(word(bestPeople.length))} of you set new bests.`, `New bests from ${word(bestPeople.length)} different people.`, `${cap(word(bestPeople.length))} of you found a new best this week.`]));
  else if (bestPeople.length === 1) {
    const w = first(bestPeople[0].name);
    sentences.push(pick('s-best', [`${w} set a new best.`, `${w} found a new best.`, `New best for ${w}.`]));
  }
  const comeback = members.find((m) => momentOf(m) === 'comeback');
  if (comeback) {
    const w = first(comeback.name);
    sentences.push(pick('s-back', [`Good to have ${w} back.`, `${w}'s back in the room.`, `${w} came back, and that's the hardest session there is.`]));
  }
  const newcomer = members.find((m) => m.new_to_squad || m.first_ever);
  if (newcomer && newcomer !== comeback) {
    const w = first(newcomer.name);
    sentences.push(pick('s-new', [`${w} got week one in.`, `Welcome to the work, ${w}.`, `${w} showed up in week one, which is how it starts.`]));
  }
  if (goal && goal.pct > goal.pctBefore) {
    sentences.push(pick('s-goal', [`${goal.title} went from ${goal.pctBefore}% to ${goal.pct}% in one week.`, `${goal.title}: ${goal.pctBefore}% to ${goal.pct}% in seven days.`, `${goal.title} jumped from ${goal.pctBefore}% to ${goal.pct}%.`]));
  }
  sentences.push(
    active > 1
      ? pick('s-close', ["That's what a squad looks like.", "That's a team.", "That's how it gets done — together.", 'Nobody did that alone.'])
      : pick('s-close-solo', ['Every squad starts with one person showing up.', 'Somebody has to go first. Good work.']),
  );

  // ── the together number ──
  const together =
    facts.lb >= 1000
      ? { value: fmt(facts.lb), unit: 'lb lifted', compare: lbCompare(facts.lb, pick) }
      : facts.mi >= 1
        ? { value: fmt(facts.mi), unit: 'miles covered', compare: miCompare(facts.mi, pick) }
        : { value: fmt(recap.workouts), unit: recap.workouts === 1 ? 'workout' : 'workouts', compare: null };

  const factList: WeekStory['facts'] = [];
  factList.push({ text: `${recap.workouts} ${recap.workouts === 1 ? 'workout' : 'workouts'}` });
  if (facts.prev_workouts > 0 && recap.workouts > facts.prev_workouts) factList.push({ text: `↑ ${recap.workouts - facts.prev_workouts} on last week`, up: true });
  if (recap.prCount > 0) factList.push({ text: `${recap.prCount} new ${recap.prCount === 1 ? 'best' : 'bests'}` });
  if (recap.honorCount > 0) factList.push({ text: `${recap.honorCount} ${recap.honorCount === 1 ? 'honor' : 'honors'} earned` });
  if (facts.lb >= 1000 && facts.mi >= 1) factList.push({ text: `${fmt(facts.mi)} miles` });

  const moments = facts.together.slice(0, 2).map((t, i) => {
    const a = first(t.a);
    const b = first(t.b);
    const day = DAY_NAMES[t.day] ?? 'one day';
    return pick('together', [`${a} and ${b} trained together on ${day}.`, `${day}: ${a} and ${b}, side by side.`, `${a} and ${b} got ${day}'s session in together.`], i);
  });

  // ── the close: an open door, pointed at the goal when there is one ──
  let close: WeekStory['close'];
  if (goal && goal.after >= goal.target) {
    close = {
      title: pick('c-done', [`${goal.title}: done. Together!`, `You finished ${goal.title}!`]),
      body: pick('c-done-body', ['Time to set the next one.', 'Take the win. Then set the next one.']),
    };
  } else if (goal) {
    const left = goal.target - goal.after;
    const weekly = goal.after - goal.before;
    const finish = weekly > 0 && weekly >= left ? pick('c-finish', [' Next week finishes it.', " One more week like this and it's done."]) : '';
    close = {
      title: `${fmt(left)} ${goal.unit} to go.${finish}`,
      body: pick('c-body', ['Everything anyone logs counts toward it.', 'Every workout moves the bar.', 'Whoever logs first gets the bar moving.']),
    };
  } else {
    close = {
      title: pick('c-fresh', ['New week. Fresh start.', "Clean slate. Let's build on this.", "Monday's a fresh page."]),
      body: pick('c-fresh-body', ['Whoever trains first sets the tone.', 'First one in sets the pace.', "Let's see who opens the week."]),
    };
  }

  return { headline: { lead, em }, body: sentences.join(' '), together, facts: factList, goal, shoutOuts, moments, close };
}

/** The snapshot's `story`, checked. Anything malformed reads as "no story" and the plain summary shows. */
export function parseStoryFacts(raw: unknown): StoryFacts | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.members)) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
  return {
    prev_workouts: num(r.prev_workouts),
    lb: num(r.lb),
    mi: num(r.mi),
    goal_before: r.goal_before == null ? null : num(r.goal_before),
    members: (r.members as Record<string, unknown>[])
      .filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string' && num(m.workouts) > 0)
      .map((m) => ({
        id: m.id as string,
        name: m.name as string,
        workouts: num(m.workouts),
        days: Array.isArray(m.days) ? (m.days as unknown[]).map(num).filter((d) => d >= 1 && d <= 7) : [],
        lb: num(m.lb),
        mi: num(m.mi),
        new_to_squad: m.new_to_squad === true,
        first_ever: m.first_ever === true,
        gap_days: m.gap_days == null ? null : num(m.gap_days),
        best_week: m.best_week === true,
        prs: Array.isArray(m.prs) ? (m.prs as { exercise?: unknown; value?: unknown }[]).filter((p) => p && typeof p.exercise === 'string').map((p) => ({ exercise: String(p.exercise), value: String(p.value ?? '') })) : [],
        honors: Array.isArray(m.honors) ? (m.honors as unknown[]).filter((h): h is string => typeof h === 'string') : [],
        goal: m.goal == null ? null : num(m.goal),
      })),
    together: Array.isArray(r.together)
      ? (r.together as Record<string, unknown>[]).filter((t) => t && typeof t.a === 'string' && typeof t.b === 'string').map((t) => ({ a: t.a as string, b: t.b as string, day: num(t.day) }))
      : [],
  };
}
