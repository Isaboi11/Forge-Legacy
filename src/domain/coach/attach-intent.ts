/**
 * ══ A PICTURE IN HOLT'S CHAT — WHAT IS IT FOR? ══
 *
 * PO 2026-09-27: *"When talking to holt I should be able to paste a picture at any time and tell him to add it
 * as a program, template, recipe, or whatever it is."*
 *
 * The athlete says what it is in the words they send with it ("add this as a recipe", "save this workout").
 * This reads those words — no model, so it costs nothing and cannot be talked into anything — and returns
 * null when they did not say, in which case Holt ASKS (three chips) rather than guessing: reading the wrong
 * kind spends Premium AI credits on a read that can only fail.
 *
 * Explicit nouns win over hints: "recipe" beats "dinner", "template" beats "workout", "program" beats
 * "plan". Among the hints, food comes first ("meal plan" is food), then program words ("workout plan" is a
 * program), then a single session ("today's workout").
 */
export type AttachKind = 'program' | 'template' | 'recipe';

const EXPLICIT: [AttachKind, RegExp][] = [
  ['recipe', /\brecipes?\b/i],
  ['template', /\btemplates?\b/i],
  ['program', /\bprogram(me)?s?\b/i],
];

const HINTS: [AttachKind, RegExp][] = [
  ['recipe', /\b(meals?|dish(es)?|food|cook(ing)?|ingredients?|breakfast|lunch|dinner|snacks?|bake|smoothie)\b/i],
  ['program', /\b(plan|block|split|weeks?|weekly|routine|phase|cycle)\b/i],
  ['template', /\b(workouts?|sessions?|circuit|wod|day)\b/i],
];

export function attachKind(text: string): AttachKind | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  for (const [kind, re] of EXPLICIT) if (re.test(t)) return kind;
  for (const [kind, re] of HINTS) if (re.test(t)) return kind;
  return null;
}

/** The chips Holt offers when the words did not say. Recipe only with Nutrition (the reader is gated on it). */
export function attachChoices(nutrition: boolean): { kind: AttachKind; label: string }[] {
  return [
    { kind: 'program', label: 'A program' },
    { kind: 'template', label: 'A workout template' },
    ...(nutrition ? [{ kind: 'recipe' as const, label: 'A recipe' }] : []),
  ];
}

export const ATTACH_ASK = 'Got the picture. What should I make of it?';

/** Holt's words once the read worked, before he opens the screen to check it on. */
export function attachDoneLine(kind: AttachKind): string {
  if (kind === 'recipe') return 'Read it. It’s open in My Recipes — check the ingredients, then save it.';
  if (kind === 'template') return 'Read it. Check the workout, then tap Create template.';
  return 'Read it. Check the program, then tap Create program.';
}

/**
 * A failed read, in Holt's voice. The kinds are the readers' own (`PhotoReadResult`, `recipe-photo-read`):
 * `not_a_program` / `not_a_recipe` both arrive as "that isn't one", so the kind the athlete asked for names it.
 */
export function attachErrorLine(kind: AttachKind, error: string): string {
  const what = kind === 'recipe' ? 'recipe' : kind === 'template' ? 'workout' : 'training program';
  switch (error) {
    case 'not_a_program':
    case 'not_a_recipe':
      return `That doesn’t look like a ${what} to me. Send a picture of the ${what} itself.`;
    case 'unreadable':
      return 'I couldn’t make it out. A straighter, closer shot usually does it.';
    case 'too_large':
      return 'That picture is too big for me to read. Try a screenshot of it instead.';
    case 'unsupported_format':
      return 'I can’t read that kind of image. Take a screenshot of it and send that.';
    case 'out_of_credits':
      return 'You’re out of Premium AI credits for this month, so I can’t read pictures until they reset.';
    case 'daily_limit':
      return 'That’s a lot of pictures for one day. Try again tomorrow.';
    case 'not_entitled':
      return 'Reading pictures is part of Premium AI.';
    case 'no_nutrition':
      return 'Recipes live in Nutrition, and that isn’t open on your account yet.';
    case 'unavailable':
      return 'Picture reading isn’t working right now. Try again in a bit.';
    case 'not_available':
      return 'Reading that kind of picture isn’t available right now.';
    default:
      return 'I couldn’t reach the reader. Check your connection and send it again.';
  }
}
