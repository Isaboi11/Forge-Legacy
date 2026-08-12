/**
 * How Holt says it. Not what he decides — **what he decides never lives here.**
 *
 * ══ THE LINE THIS MODULE MUST NOT CROSS ══
 *
 * ⚠ **VOICE IS PRESENTATION. TRAINING IS A RULEBOOK.** Every string below is something Holt says on the
 * way to a decision that was already made by `assemble()` from tables. Nothing in this file may change a
 * set, a rep, a mile or a refusal — if a variant ever reads as a different *answer* rather than a
 * different *wording of the same answer*, it is a bug, and `voice.test.mjs` exists to keep that true.
 *
 * That separation is what lets this file be random while the engine stays deterministic. Same answers
 * still build the same program; only the sentences around it move.
 *
 * ══ WHY VARIATION IS A FEATURE AND NOT DECORATION ══
 *
 * A coach who greets you with the same sentence every single morning is a vending machine with a face.
 * The PO's words: *"write a bunch of different things he can say even with the same answer, that way it's
 * not stale."* Repetition is the specific thing that makes a scripted character feel like a script, and
 * the fix is not cleverness — it is **volume**. So every line an athlete will hear more than twice has
 * several ways of arriving.
 *
 * ══ HOW HE TALKS ══
 *
 * Terse. Declarative. He has opinions and states them without hedging. He never says "Great!", never
 * uses an exclamation mark, never compliments a tap. He is warm the way a good coach is warm — by taking
 * you seriously and telling you the truth — not by being nice about it. When he cannot do something he
 * says so plainly and offers what he can do instead.
 *
 * ⚠ AND HE IS PICKED ONCE, AT THE MOMENT HE SPEAKS. `pick()` is called when a turn is appended to the
 * thread, never during render — a variant chosen in render would reshuffle on every re-render and the
 * conversation would rewrite itself as you scrolled.
 */

/** Every line Holt has more than one way of saying. */
export type VoiceKey =
  | 'greet_return'
  | 'greet_return_anon'
  | 'greet_return_second'
  | 'ack'
  | 'ask_goal'
  | 'ask_day_focus'
  | 'ask_day_goal'
  | 'ask_race_distance'
  | 'ask_race_when'
  | 'ask_race_base'
  | 'ask_days'
  | 'ask_days_run'
  | 'ask_where'
  | 'ask_time'
  | 'ask_experience'
  | 'ask_limits'
  | 'lead_block'
  | 'preamble_program'
  | 'preamble_day'
  | 'not_understood'
  | 'help_open'
  | 'import_open'
  | 'nothing_to_build'
  | 'no_active_program'
  | 'ask_edit_session'
  | 'ask_edit_change'
  | 'ask_edit_row'
  | 'ask_edit_value'
  | 'ask_edit_scope'
  | 'edit_done';

/**
 * ⚠ `{name}` is the ONLY token, and it is optional in every line that uses it — a profile without a first
 * name is normal, not an error, so no variant may read as broken when it resolves to nothing.
 */
export const VOICE: Record<VoiceKey, readonly string[]> = {
  // ── coming back ──────────────────────────────────────────────────────────────────────────────────
  greet_return: [
    'Hey {name}.',
    '{name}.',
    'Back again, {name}.',
    'Right, {name}.',
    'Morning, {name}.',
    'There you are, {name}.',
    'Good to see you, {name}.',
    'Alright, {name}.',
  ],
  /*
   * ⚠ **NOT THE SAME LINES WITH THE NAME CUT OUT.** "{name}." on its own is a perfectly good greeting and
   * becomes an empty string without one — a test caught exactly that. Stripping a token out of a sentence
   * written around it gives you the shape of a greeting, not a greeting, so the nameless case is written
   * rather than derived.
   */
  greet_return_anon: ['Hey.', 'Back again.', 'Right.', 'Good to see you.', 'Alright.', 'There you are.'],
  greet_return_second: [
    'What are we doing today?',
    'What do you need?',
    'What can I help you with?',
    'Where do you want to start?',
    "What's on your mind?",
    'What are we working on?',
    'Tell me what you need.',
    'What do you want to sort out?',
    'Where are we picking up?',
    'What can I do for you?',
  ],

  // ── the short beat between an answer and the next question ───────────────────────────────────────
  ack: ['Good.', 'Right.', 'Noted.', 'Understood.', 'Got it.', 'Fine.', 'Alright.', 'Makes sense.', 'That helps.', 'OK.'],

  // ── the questions ────────────────────────────────────────────────────────────────────────────────
  ask_goal: [
    'What are you training for?',
    "What's the goal?",
    'What are we building toward?',
    'Tell me what you want out of this.',
    "What's the target?",
    'What are you chasing?',
  ],
  ask_day_focus: [
    'What are you training today?',
    "What's it going to be?",
    'What do you want to hit?',
    "What are we working today?",
    'Pick what today is for.',
  ],
  ask_day_goal: [
    "And what's this one for?",
    'What are you after out of it?',
    "What's the point of the session — heavy, or volume?",
    'What are we chasing today?',
    'What do you want out of it?',
  ],
  ask_race_distance: [
    'Which one?',
    'What distance?',
    'What are you racing?',
    'Which distance are we building for?',
    'What have you entered?',
  ],
  ask_race_when: [
    "When's the race? Roughly is fine — I build the block backwards from it.",
    'When is it? Near enough will do — the whole block counts back from race day.',
    "How long have we got? I don't need the exact date, just the rough distance out.",
    "When do you toe the line? Everything before it gets planned around that.",
    'Give me the date, or near enough. The taper has to land on it.',
  ],
  ask_race_base: [
    "What are you running in a normal week right now? Be honest — I'd rather start you lower and get you there.",
    'How much are you actually running each week? Tell me the real number, not the good week.',
    "What's your normal week look like, mileage-wise? Under-selling it costs you nothing; over-selling it costs you the block.",
    'How many miles a week are you doing now? I build up from where you are, not where you’d like to be.',
    "What's your current weekly mileage? Honest answer — this is the number the whole ramp is built on.",
  ],
  ask_days: [
    "How many days a week can you train? Be honest — I'd rather build three you'll hit than five you won't.",
    'How many days a week are actually yours? Three you keep beats five you abandon.',
    "How many sessions a week can you commit to? Give me the number you'll still hit in week six.",
    'How many days? Tell me what the week really allows, not what you wish it did.',
    "How many days a week can you get in? I'd rather under-book you and have you finish.",
  ],
  ask_days_run: [
    "How many days a week can you run? Be honest — I'd rather build three you'll hit than five you won't.",
    'How many days a week can you get out? Three you keep beats five you abandon.',
    'How many runs a week does your life allow? Give me the honest number.',
    "How many days can you run? The ramp is safer on fewer days done properly.",
  ],
  ask_where: [
    'Where are you training?',
    "Where's this happening?",
    'What have you got to work with?',
    'Where do you train?',
    "What's the setup?",
  ],
  ask_time: [
    'How long have you got for a session?',
    'How much time per session?',
    "What's a realistic session length?",
    'How long can you actually be in there?',
    'How much time have you got?',
  ],
  ask_experience: [
    'How long have you been training?',
    "Where are you at? I'll pitch it accordingly.",
    'How much training have you got behind you?',
    "What's your experience? It changes what I put in front of you.",
    'How long have you been at this?',
  ],
  ask_limits: [
    'Anything I should train around?',
    "Anything giving you trouble? I'll work around it rather than through it.",
    'Any injuries or areas to avoid?',
    "Anything I need to know about? Better I hear it now than program into it.",
    'Anything hurting, or anything you want left out?',
  ],

  // ── the handover ─────────────────────────────────────────────────────────────────────────────────
  /* ⚠ THE LEAD ONLY. What follows it is REASONING — "built around the 18 miles you already run" — and
     that sentence is the proof he listened, so it is composed from the constraints and never picked
     from a list. Varying the four words in front of it is all the variation this line can take. */
  lead_block: ["Here's the block.", "That's the block.", 'Done.', 'Built.', 'There it is.', 'Right, here it is.'],
  preamble_program: [
    "Here it is. Nothing's saved until you've seen every week.",
    "That's the block. Read it before you commit to anything.",
    'Done. Have a look at the whole thing before you start it.',
    "Here's what I'd have you do. Go through it — nothing is saved yet.",
    "Built. Look it over; you're not committed to anything yet.",
    "There you go. Every week of it is there to read first.",
  ],
  preamble_day: [
    'Here it is. Everything in it is something you can do with what you told me.',
    "That's your session. Nothing in it needs kit you haven't got.",
    "Here's the day. It fits the time and the room you gave me.",
    "Done. It's built around what you actually have.",
  ],

  // ── the edges ────────────────────────────────────────────────────────────────────────────────────
  not_understood: [
    "I didn't catch that one. Tap it, or say it another way.",
    "That one's past me. Pick one below.",
    "I'm not following. Use one of these.",
    "Didn't get that. Tap an answer instead.",
  ],
  help_open: [
    'What do you want to know?',
    'Ask away.',
    "What are you trying to do?",
    'What do you need a hand with?',
  ],
  import_open: [
    "Paste it in and I'll read it. A table, a sheet, a plan someone wrote out — whatever you've got.",
    "Bring it over. Paste the plan in and I'll turn it into something you can train.",
    "Hand it here. Paste the whole thing and I'll read the weeks out of it.",
  ],
  // ── changing a plan already running ───────────────────────────────────────────────────────────────
  no_active_program: [
    "You haven't got a program running, so there's nothing for me to change. Want me to build you one?",
    "Nothing's running at the moment — there's no block to adjust. I can write you one.",
    "You're not on a program right now. Start one and I'll happily change it whenever you need.",
  ],
  ask_edit_session: [
    'Which session?',
    'Which one do you want different?',
    "Which session are we changing? Anything you've already done stays as it happened.",
    'Pick the session.',
  ],
  ask_edit_change: [
    'What do you want different about it?',
    "What's the problem with it?",
    'What are we changing?',
    'What needs to move?',
  ],
  ask_edit_row: ['Which one?', 'Which movement?', 'Which of these?', 'Point at it.'],
  ask_edit_value: ['What should it be?', 'Make it what?', 'What are we changing it to?', 'Give me the number.'],
  ask_edit_scope: [
    'Just this week, or every week from here?',
    'Is this a one-off, or should the rest of the block follow?',
    'This week only, or the whole way through?',
  ],
  edit_done: [
    "Done. That's changed.",
    'Changed. The rest of the block is where you left it.',
    "That's in. Nothing else moved.",
    'Sorted.',
  ],
  nothing_to_build: [
    "There isn't enough here for me to build you a session. Tell me what you've got and I'll work with it.",
    "I can't make a session out of that. Give me more to work with.",
    "That leaves me nothing to prescribe. Tell me what you do have.",
  ],
};

/*
 * ⚠ **DELIBERATE MODULE-LEVEL STATE, AND HERE IS WHY IT IS SAFE.**
 *
 * "Not stale" mostly means "not the same line twice in a row", which needs a memory of the last one. It
 * lives here rather than being threaded through every caller because it is presentation-only: nothing in
 * this map can reach `assemble()`, so the engine stays a pure function of the athlete's answers no matter
 * what this remembers. `resetVoice()` exists so tests start from a known place.
 */
const lastSaid = new Map<VoiceKey, string>();

export function resetVoice(): void {
  lastSaid.clear();
}

/** Injectable so a test can make the choice deterministic without the module knowing it is being tested. */
export type Chooser = (n: number) => number;

const defaultChooser: Chooser = (n) => Math.floor(Math.random() * n);

/**
 * One of the ways Holt says this, never the one he said last.
 *
 * With a single variant it returns that variant — repetition is better than silence, and a key with one
 * line is a key nobody has written alternatives for yet, not an error.
 */
export function pick(key: VoiceKey, choose: Chooser = defaultChooser): string {
  return pickFrom(key, VOICE[key], choose);
}

/**
 * ⚠ EXPORTED FOR `in-workout-voice.ts` AND NOTHING ELSE.
 *
 * The in-workout lines are a separate table keyed by register — they are said in a gym, between sets,
 * not in a conversation — but they must inherit the one thing this module owns that matters: the
 * no-repeat memory above. A second `lastSaid` map in a second file would let Holt say the same sentence
 * twice in a row across the boundary, which is exactly what `voice.test.mjs` exists to prevent.
 *
 * `key` is typed loosely for that caller: its keys are not `VoiceKey`s, and widening `VoiceKey` to
 * include them would put in-workout lines in `VOICE`, where the questionnaire tests would then walk
 * them under rules written for a different surface.
 */
export function pickFrom(key: string, options: readonly string[], choose: Chooser): string {
  if (options.length === 0) return '';
  const previous = lastSaid.get(key as VoiceKey);
  const fresh = options.length > 1 && previous != null ? options.filter((o) => o !== previous) : options;
  const line = fresh[Math.max(0, Math.min(fresh.length - 1, choose(fresh.length)))] ?? options[0];
  lastSaid.set(key as VoiceKey, line);
  return line;
}

/**
 * `pick`, with `{name}` resolved.
 *
 * ⚠ A MISSING NAME MUST READ AS DELIBERATE, NOT BROKEN. Plenty of profiles have no first name, so the
 * token is removed along with the space in front of it and any stranded punctuation — "Hey {name}."
 * becomes "Hey." rather than "Hey ." or, worse, "Hey {name}.".
 */
export function pickNamed(key: VoiceKey, name: string | null | undefined, choose: Chooser = defaultChooser): string {
  const clean = (name ?? '').trim();
  if (clean) return pickFrom(key, VOICE[key], choose).replace(/\{name\}/g, clean);

  /*
   * ⚠ **A VARIANT THAT IS ONLY THE NAME COLLAPSES TO NOTHING, AND A TEST CAUGHT IT.** "{name}." is a fine
   * greeting and an empty string without one. Rather than let a caller receive "", the variants that do
   * not survive the strip are removed from consideration first — so the nameless athlete gets a real
   * greeting from the same list instead of the wreckage of one.
   */
  const survivors = VOICE[key].map(strip).filter((l) => l.length > 0);
  return pickFrom(key, survivors.length > 0 ? survivors : VOICE[key].map(strip), choose);
}

/** Remove the token, and the space and stray punctuation it leaves behind. */
const strip = (line: string): string =>
  line
    .replace(/[ ]?\{name\}/g, '')
    .replace(/^([,.]\s*)+/, '')
    .replace(/\s+([,.])/g, '$1')
    .trim();
