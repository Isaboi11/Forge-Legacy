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

export function lbCompare(lb: number): string | null {
  const hit = LB_REFERENCES.find(([at]) => lb >= at);
  return hit ? `${hit[1]} Nobody lifts that alone.` : null;
}

export function miCompare(mi: number): string | null {
  if (mi >= 52.4) return `That's ${Math.floor(mi / 26.2)} marathons. Nobody runs that alone.`;
  if (mi >= 26.2) return 'A full marathon, together.';
  if (mi >= 13.1) return 'A half marathon, together.';
  return null;
}

/**
 * ONE line per person — their best moment of the week, by a fixed order of what matters most to hear.
 * The order is about the moment, never about comparing people: a comeback is told before a PR because
 * coming back is the harder thing to do, for anyone.
 */
export function shoutOut(m: StoryMember): ShoutOut {
  const week = [1, 2, 3, 4, 5, 6, 7].map((d) => m.days.includes(d));
  const n = m.workouts;
  const detailBits = [`${n} ${n === 1 ? 'workout' : 'workouts'}`];
  if (m.lb > 0) detailBits.push(`${fmt(m.lb)} lb moved`);
  if (m.mi > 0) detailBits.push(`${fmt(m.mi)} mi`);
  const base = { id: m.id, name: m.name, week, detail: detailBits.join(' · '), goal: m.goal };
  const who = first(m.name);
  const pr = m.prs[0];
  const honor = m.honors[0];

  if (m.gap_days != null && m.gap_days >= 14) {
    const weeks = Math.floor(m.gap_days / 7);
    return { ...base, chip: 'comeback', chipLabel: 'Comeback', line: [{ t: `Back after ${weeks >= 8 ? 'a long break' : `${word(weeks)} weeks off`}`, b: true }, { t: n > 1 ? `, and ${word(n)} workouts in.` : ', and straight back to work.' }] };
  }
  if (m.first_ever) {
    return { ...base, chip: 'first', chipLabel: 'First week', line: [{ t: `${cap(word(n))} ${n === 1 ? 'workout' : 'workouts'}`, b: true }, { t: ` in ${who}'s first week of training. It starts here.` }] };
  }
  if (m.new_to_squad) {
    return { ...base, chip: 'welcome', chipLabel: 'Welcome', line: [{ t: `${cap(word(n))} ${n === 1 ? 'workout' : 'workouts'}`, b: true }, { t: ` in ${who}'s first week with the squad. Welcome, ${who}.` }] };
  }
  if (pr) {
    const more = m.prs.length > 1 ? ` One of ${word(m.prs.length)} new bests this week.` : '';
    return { ...base, chip: 'best', chipLabel: 'New best', line: [{ t: `${pr.exercise}: ` }, { t: pr.value, b: true }, { t: `, a new best.${more}` }] };
  }
  if (m.best_week && n >= 2) {
    return { ...base, chip: 'streak', chipLabel: 'Best week', line: [{ t: `${cap(word(n))} workouts`, b: true }, { t: ' — the most in any week yet.' }] };
  }
  if (honor) {
    return { ...base, chip: 'honor', chipLabel: 'Honor', line: [{ t: 'Earned ' }, { t: honor, b: true }, { t: '.' }] };
  }
  const days = week.filter(Boolean).length;
  return {
    ...base,
    chip: 'showed',
    chipLabel: 'Showed up',
    line: days >= 3
      ? [{ t: `${cap(word(days))} days`, b: true }, { t: ' this week. That consistency is the whole game.' }]
      : [{ t: `${cap(word(n))} ${n === 1 ? 'workout' : 'workouts'}`, b: true }, { t: ' toward the squad this week.' }],
  };
}

export function buildWeekStory(recap: StoryRecap, facts: StoryFacts): WeekStory {
  const { active, total } = recap.participation;
  const members = [...facts.members].sort((a, b) => a.name.localeCompare(b.name));
  const shoutOuts = members.map(shoutOut);

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

  // ── Holt's opening ──
  const lead = active >= total && total > 1 ? `All ${word(total)} of you showed up` : active === 1 ? `${first(members[0]?.name ?? 'One of you')} kept the squad moving` : `${cap(word(active))} of you showed up`;
  const em = goal && goal.after > goal.before ? 'and the squad goal moved.' : recap.prCount > 0 ? `and ${word(recap.prCount)} new ${recap.prCount === 1 ? 'best' : 'bests'} fell.` : 'and it added up.';

  const sentences: string[] = [];
  const bestPeople = members.filter((m) => m.prs.length > 0).length;
  if (bestPeople > 1) sentences.push(`${cap(word(bestPeople))} of you set new bests.`);
  else if (bestPeople === 1) sentences.push(`${first(members.find((m) => m.prs.length > 0)!.name)} set a new best.`);
  const comeback = members.find((m) => m.gap_days != null && m.gap_days >= 14);
  if (comeback) sentences.push(`${first(comeback.name)} came back after ${Math.floor(comeback.gap_days! / 7) >= 8 ? 'a long break' : `${word(Math.floor(comeback.gap_days! / 7))} weeks away`}.`);
  const newcomer = members.find((m) => m.new_to_squad || m.first_ever);
  if (newcomer && newcomer !== comeback) sentences.push(`${first(newcomer.name)} showed up in week one.`);
  if (goal && goal.pct > goal.pctBefore) sentences.push(`${goal.title} went from ${goal.pctBefore}% to ${goal.pct}% in one week.`);
  sentences.push(active > 1 ? "That's what a squad looks like." : 'Every week starts with one person.');

  // ── the together number ──
  const together =
    facts.lb >= 1000
      ? { value: fmt(facts.lb), unit: 'lb lifted', compare: lbCompare(facts.lb) }
      : facts.mi >= 1
        ? { value: fmt(facts.mi), unit: 'miles covered', compare: miCompare(facts.mi) }
        : { value: fmt(recap.workouts), unit: recap.workouts === 1 ? 'workout' : 'workouts', compare: null };

  const facts2: WeekStory['facts'] = [];
  facts2.push({ text: `${recap.workouts} ${recap.workouts === 1 ? 'workout' : 'workouts'}` });
  if (facts.prev_workouts > 0 && recap.workouts > facts.prev_workouts) facts2.push({ text: `↑ ${recap.workouts - facts.prev_workouts} on last week`, up: true });
  if (recap.prCount > 0) facts2.push({ text: `${recap.prCount} new ${recap.prCount === 1 ? 'best' : 'bests'}` });
  if (recap.honorCount > 0) facts2.push({ text: `${recap.honorCount} ${recap.honorCount === 1 ? 'honor' : 'honors'} earned` });
  if (facts.lb >= 1000 && facts.mi >= 1) facts2.push({ text: `${fmt(facts.mi)} miles` });

  const moments = facts.together.slice(0, 2).map((t) => `${first(t.a)} and ${first(t.b)} trained together on ${DAY_NAMES[t.day] ?? 'one day'}.`);

  // ── the close: an open door, pointed at the goal when there is one ──
  let close: WeekStory['close'];
  if (goal && goal.after >= goal.target) {
    close = { title: `${goal.title}: done. Together.`, body: 'Time to set the next one.' };
  } else if (goal) {
    const left = goal.target - goal.after;
    const weekly = goal.after - goal.before;
    close = {
      title: `${fmt(left)} ${goal.unit} to go.${weekly > 0 && weekly >= left ? ' Next week finishes it.' : ''}`,
      body: 'Everything anyone logs counts toward it.',
    };
  } else {
    close = { title: 'New week. Fresh start.', body: 'Whoever trains first sets the tone.' };
  }

  return { headline: { lead, em }, body: sentences.join(' '), together, facts: facts2, goal, shoutOuts, moments, close };
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
