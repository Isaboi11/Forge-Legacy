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
 * ══ HOW HE TALKS — `Docs/Amendments/Holt-Voice-Amendment-001-The-Coach-You-Hired.md` ══
 *
 * He is the coach you hired: warm, invested, on your side, and visibly glad when you win. Encouraging,
 * never cheesy — praise is SPECIFIC (names the lift, the number, the streak), EARNED (tied to something
 * that happened), PROPORTIONATE (a PR gets more than a finished set) and BRIEF. He is still honest and
 * still direct: he tells you the truth, says no when he has to, and says why.
 *
 *   ✅ "New best on Bench Press! That's the work showing up."   ✅ "Good to have you back. We start from today."
 *   ❌ "You're crushing it!"  (generic)                         ❌ "Great choice!"  (praise for a tap)
 *
 * **An exclamation mark is for a real win and nothing else, one per message at most (HV-D3).** None of
 * the lines in THIS table is a win — they are greetings, questions and handovers — so none exclaims. The
 * wins live in `review.ts` and `in-workout-voice.ts`.
 *
 * ⚠ `ack` FOLLOWS EVERY ANSWER, INCLUDING "I HAVE A BAD KNEE". So it is warm and neutral, never praise:
 * "Love it." after an injury is the specific failure a scripted coach cannot see coming.
 *
 * ══ WHY VARIATION IS A FEATURE AND NOT DECORATION ══
 *
 * A coach who greets you with the same sentence every single morning is a vending machine with a face.
 * The PO's words: *"We need a very robust script for him so that he doesn't get old to users. Should feel
 * new for a very long time."* Three mechanisms, all below:
 *
 *   1. **Volume.** The lines an athlete meets every visit carry 15–25 variants; the rarer ones 6–10.
 *   2. **A deck, not a dice roll.** Each key deals every variant once, in a random order, before any of
 *      them comes round again — and never the same line twice running across the reshuffle. A dice roll
 *      with twelve lines repeats one inside four picks about half the time; a deck cannot.
 *   3. **The deck outlives the app.** `voiceMemory()` / `restoreVoiceMemory()` let `lib/voice-memory.ts`
 *      keep each deck's position on the device, so closing the app does not reset him to the top of
 *      every list.
 *
 * ⚠ AND HE IS PICKED ONCE, AT THE MOMENT HE SPEAKS. `pick()` is called when a turn is appended to the
 * thread, never during render — a variant chosen in render would reshuffle on every re-render and the
 * conversation would rewrite itself as you scrolled. Where a line IS computed in render (the workout
 * coin), `pickOnce()` pins the choice to the moment it describes.
 */

/** Every line Holt has more than one way of saying. */
export type VoiceKey =
  | 'greet_return'
  | 'greet_return_anon'
  | 'greet_morning'
  | 'greet_afternoon'
  | 'greet_evening'
  | 'greet_late'
  | 'greet_return_second'
  | 'greet_second_monday'
  | 'greet_second_friday'
  | 'greet_second_weekend'
  | 'ack'
  | 'ask_size'
  | 'ask_goal'
  | 'ask_day_focus'
  | 'ask_day_goal'
  | 'ask_race_distance'
  | 'ask_race_when'
  | 'ask_race_base'
  | 'ask_days'
  | 'ask_days_run'
  | 'ask_days_week'
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
  | 'allowance_program'
  | 'allowance_day'
  | 'rebuild_open'
  | 'ask_level_again'
  | 'level_saved'
  | 'import_later'
  | 'nothing_to_build'
  | 'no_active_program'
  | 'ask_edit_session'
  | 'ask_edit_change'
  | 'ask_edit_row'
  | 'ask_edit_value'
  | 'ask_edit_scope'
  | 'edit_done'
  | 'pick_one_for_you';

/** The keys that may carry `{name}`. Every other key is written to be said to anybody. */
export const NAMED_KEYS: readonly VoiceKey[] = ['greet_return', 'greet_morning', 'greet_afternoon', 'greet_evening', 'greet_late'];

/**
 * ⚠ `{name}` is the ONLY token, and it is optional in every line that uses it — a profile without a first
 * name is normal, not an error, so no variant may read as broken when it resolves to nothing.
 */
export const VOICE: Record<VoiceKey, readonly string[]> = {
  // ── coming back ──────────────────────────────────────────────────────────────────────────────────
  greet_return: [
    'Hey {name}.',
    'Good to see you, {name}.',
    'There you are, {name}.',
    '{name}. Good to have you.',
    'Hey {name}, welcome back.',
    'Look who it is. Hey {name}.',
    'Back at it, {name}.',
    'Hey {name}. Ready when you are.',
    "Alright {name}, let's get to work.",
    'Good timing, {name}.',
    "Hey {name}. Glad you're here.",
    'Welcome back, {name}.',
    'Hi {name}.',
    'Hey {name}. Good to see you again.',
    "{name}. Let's get something done.",
    "There's my athlete. Hey {name}.",
    'Hey {name}. I was hoping you would show up.',
    "Good to have you back, {name}.",
  ],
  /*
   * ⚠ **NOT THE SAME LINES WITH THE NAME CUT OUT.** "{name}." on its own is a perfectly good greeting and
   * becomes an empty string without one — a test caught exactly that. Stripping a token out of a sentence
   * written around it gives you the shape of a greeting, not a greeting, so the nameless case is written
   * rather than derived.
   */
  greet_return_anon: [
    'Hey.',
    'Good to see you.',
    'There you are.',
    'Welcome back.',
    'Back at it.',
    "Glad you're here.",
    'Ready when you are.',
    "Alright, let's get to work.",
    'Good timing.',
    'Good to have you back.',
    "Let's get something done.",
    'Hey. Good to see you again.',
  ],
  /*
   * ── the time of day ─────────────────────────────────────────────────────────────────────────────
   * A greeting that knows it is six in the morning is the cheapest way there is to sound like somebody
   * is actually there. `greetReturning` draws from these about half the time and from `greet_return`
   * the rest, so neither pool is worn through quickly.
   */
  greet_morning: [
    'Morning, {name}.',
    'Good morning, {name}.',
    'Early start, {name}. I like it.',
    'Up and at it, {name}.',
    'Morning, {name}. Good way to start a day.',
    'Morning {name}. Getting it done before the day gets a say.',
    'Good morning, {name}. Glad you came.',
    'Morning, {name}. First thing, best thing.',
    'Morning, {name}. The day starts with a win.',
  ],
  greet_afternoon: [
    'Afternoon, {name}.',
    'Good afternoon, {name}.',
    "Hey {name}. Hope the day's treating you well.",
    "Afternoon {name}. Let's make something of it.",
    'Midday check-in. Good to see you, {name}.',
    "Afternoon, {name}. Let's get the day's work in.",
    'Hey {name}. Good afternoon for it.',
  ],
  greet_evening: [
    'Evening, {name}.',
    'Good evening, {name}.',
    "Evening {name}. Let's put the rest of the day to use.",
    "Hey {name}. Long day? We'll make this part count.",
    'Evening, {name}. Still here, still working. I respect that.',
    'Evening, {name}. Good way to finish a day.',
    'Hey {name}. Glad you found the time tonight.',
  ],
  greet_late: [
    "Late one, {name}. I'm here.",
    'Burning the midnight oil, {name}?',
    'Hey {name}. Night owl tonight.',
    "Still up, {name}? Let's make it count.",
    "Late night, {name}. I'll keep it tight.",
    "Hey {name}. The gym never closes in here.",
  ],
  greet_return_second: [
    'What are we working on today?',
    'What can I do for you?',
    'Where do you want to start?',
    "What's the plan today?",
    'What are we getting after?',
    'Tell me what you need.',
    'What do you want to tackle?',
    "What's on your mind?",
    'How can I help today?',
    'What are we building?',
    'What do you need from me today?',
    'Where are we headed today?',
    'What are we sorting out?',
    'What do you need?',
    "What's the mission today?",
    "Let's get into it. What do you need?",
    'What can we get done today?',
    'Point me at it. What do you need?',
    'What are we doing today?',
    "I'm all yours. What do you need?",
  ],
  /* One in three visits on these days, and only on these days — a line about Monday that turns up on a
     Thursday is worse than no line about the day at all. */
  greet_second_monday: [
    'New week, clean slate. What are we doing?',
    'Monday. Good day to set the tone. What do you need?',
    'Fresh week. Where do you want to start it?',
    "It's Monday and you showed up. That's half of it. What do you need?",
  ],
  greet_second_friday: [
    "Friday. Let's finish the week strong. What do you need?",
    'End of the week and still coming in. What are we doing?',
    "Friday session? That's how weeks get won. What do you need?",
    'Last push before the weekend. What can I do for you?',
  ],
  greet_second_weekend: [
    "Weekend training. That's commitment. What are we doing?",
    'Training on the weekend. I like where your head is. What do you need?',
    'Weekend session. Plenty of time to do it right. What are we working on?',
    'While everyone else sleeps in. What do you need?',
  ],

  // ── the short beat between an answer and the next question ───────────────────────────────────────
  /* ⚠ See the header: this follows EVERY answer, an injury included. Warm, never praise. */
  ack: [
    'Got it.',
    'Good, that helps.',
    'Okay.',
    'Makes sense.',
    'That helps.',
    'Understood.',
    'Noted.',
    'Right.',
    'Good to know.',
    'Thanks, that helps.',
    'Okay, good.',
    'Got it, thanks.',
    'Alright.',
    'Good.',
    'Clear.',
    'Thanks.',
    'Good, that tells me a lot.',
    'Okay, I can work with that.',
    'On it.',
    'Helpful. Thanks.',
    "Right, that's useful.",
    'Okay, taking that into account.',
    'Good. That shapes things.',
    'Thanks for telling me.',
  ],

  // ── the questions ────────────────────────────────────────────────────────────────────────────────
  /* The first thing the BUILD door asks, before anything about the athlete. */
  ask_size: [
    'How much are we building?',
    'Are we building a block, or one week?',
    'How far ahead are we planning?',
    'How big is this — a program, or a single week?',
    'A whole block, or just the week?',
    'Are we planning the long game, or just this week?',
    'Full program, or one week to get going?',
    'How much do you want me to map out?',
  ],
  ask_goal: [
    'What are you training for?',
    "What's the goal?",
    'What are we building toward?',
    'Tell me what you want out of this.',
    "What's the target?",
    'What are you chasing?',
    "What's the thing you want to be able to say in three months?",
    'Where do you want this to take you?',
    'What does a win look like for you?',
    'What are we going after?',
    "What's this all for? Tell me and I'll build around it.",
    'Give me the goal and I will take it from there.',
  ],
  ask_day_focus: [
    'What are you training today?',
    "What's it going to be?",
    'What do you want to hit?',
    'What are we working today?',
    'Pick what today is for.',
    "What's on the menu today?",
    'What are we hitting today?',
    'Where do you want to put the work in today?',
    'What does today need to be?',
    'What are you in the mood to train?',
  ],
  ask_day_goal: [
    "And what's this one for?",
    'What are you after out of it?',
    "What's the point of the session — heavy, or volume?",
    'What are we chasing today?',
    'What do you want out of it?',
    'How do you want to feel walking out?',
    'What kind of session — heavy, or a lot of work?',
    'What should this one do for you?',
  ],
  ask_race_distance: [
    'Which one?',
    'What distance?',
    'What are you racing?',
    'Which distance are we building for?',
    'What have you entered?',
    'Which race are we getting you ready for?',
    'How far are we going?',
    'What distance is on the calendar?',
  ],
  ask_race_when: [
    "When's the race? Roughly is fine — I build the block backwards from it.",
    'When is it? Near enough will do — the whole block counts back from race day.',
    "How long have we got? I don't need the exact date, just roughly how far out.",
    'When do you toe the line? Everything before it gets planned around that.',
    'Give me the date, or near enough. The taper has to land on it.',
    'When is race day? I want you peaking on that morning, not the week before.',
    "What's the date? Close is good enough to build from.",
    "When's the big day? I'll count back from it.",
  ],
  ask_race_base: [
    "What are you running in a normal week right now? Be honest — I'd rather start you lower and get you there.",
    'How much are you actually running each week? The real number, not the good week.',
    "What's a normal week look like, mileage-wise? Under-selling it costs you nothing; over-selling it costs you the block.",
    "How many miles a week are you doing now? I build up from where you are, not where you'd like to be.",
    "What's your current weekly mileage? Honest answer — the whole ramp is built on it.",
    "How many miles in a normal week lately? Zero is a fine answer. We'll build from it.",
    'What does your running look like right now? Miles a week is all I need.',
    "Where's your mileage at these days? Start me from the truth and I'll get you to the start line.",
  ],
  ask_days: [
    "How many days a week can you train? Be honest — I'd rather build three you'll hit than five you won't.",
    'How many days a week are actually yours? Three you keep beats five you abandon.',
    "How many sessions a week can you commit to? Give me the number you'll still hit in week six.",
    'How many days? Tell me what the week really allows, not what you wish it did.',
    "How many days a week can you get in? I'd rather under-book you and watch you finish.",
    "How many days can you give me? Pick the number you'll hit on a busy week too.",
    'How many days a week, realistically? Consistency does more than ambition here.',
    "How many training days fit your life right now? We can always add one later.",
    "How many days a week? The best program is the one you actually show up for.",
    "How many days are we working with? Honest beats heroic.",
  ],
  ask_days_run: [
    "How many days a week can you run? Be honest — I'd rather build three you'll hit than five you won't.",
    'How many days a week can you get out? Three you keep beats five you abandon.',
    'How many runs a week does your life allow? Give me the honest number.',
    'How many days can you run? The ramp is safer on fewer days done properly.',
    "How many runs can you fit in a normal week? I'll make every one of them count.",
    'How many days a week can you lace up? Pick one you can hold for the whole block.',
    "How many runs a week, realistically? We'll build the rest around them.",
    'How many days are for running? Fewer done well beats more done tired.',
  ],
  /*
   * ⚠ A WEEK IS NOT A BLOCK, SO IT IS NOT ASKED LIKE ONE. "How many days A WEEK can you train" is a
   * question about a habit — it asks what you can sustain, and the answer shapes twelve weeks. When the
   * athlete has asked for one week, there is no habit to protect and nothing to sustain: the honest
   * question is how many days THIS week has in it.
   */
  ask_days_week: [
    'How many days are we training this week?',
    'How many sessions do you want in the week?',
    'How many days has this week got in it?',
    "How many days this week? Give me the number you'll actually hit.",
    'How many sessions? Tell me what this week really allows.',
    'How many days can you give me this week?',
    'How many workouts are we fitting in this week?',
    'What does this week have room for — how many days?',
  ],
  ask_where: [
    'Where are you training?',
    "Where's this happening?",
    'What have you got to work with?',
    'Where do you train?',
    "What's the setup?",
    'Gym, home, or somewhere in between?',
    'Where are you getting the work done?',
    'What kind of space are we working with?',
    "Tell me about the setup. I'll build to it.",
    'Where will you be training most of the time?',
  ],
  ask_time: [
    'How long have you got for a session?',
    'How much time per session?',
    "What's a realistic session length?",
    'How long can you actually be in there?',
    'How much time have you got?',
    'How long do you want each session to run?',
    'What does a normal day give you — how much time?',
    "How long per session? I'll fit the work to it, not the other way round.",
    'How much time can you carve out each time?',
    'How long are we working with?',
  ],
  ask_experience: [
    'How long have you been training?',
    "Where are you at? I'll pitch it accordingly.",
    'How much training have you got behind you?',
    "What's your experience? It changes what I put in front of you.",
    'How long have you been at this?',
    "Where would you put yourself right now? There's no wrong answer.",
    "How experienced are you? New is great — it means everything's ahead of you.",
    'How much lifting have you done before?',
    'Tell me where you are with training. I meet you there.',
    "What's your background? It helps me pitch the first weeks right.",
  ],
  ask_limits: [
    'Anything I should train around?',
    "Anything giving you trouble? I'll work around it rather than through it.",
    'Any injuries or areas to avoid?',
    'Anything I need to know about? Better I hear it now than program into it.',
    'Anything hurting, or anything you want left out?',
    "Any injuries, old or new? I'd rather know.",
    'Anything you want me to steer clear of?',
    'Any body parts that need looking after?',
    'Anything that flares up I should build around?',
    "Last one: anything to work around? I'll keep you healthy first.",
  ],

  // ── the handover ─────────────────────────────────────────────────────────────────────────────────
  /* ⚠ THE LEAD ONLY. What follows it is REASONING — "built around the 18 miles you already run" — and
     that sentence is the proof he listened, so it is composed from the constraints and never picked
     from a list. Varying the words in front of it is all the variation this line can take. */
  lead_block: [
    "Here's your block.",
    'Here it is.',
    "Done. Here's your block.",
    'Built it.',
    "Here's what I've got for you.",
    "Okay, here's the plan.",
    "Here's your plan.",
    'There it is.',
    'Got it built.',
    'Here we go.',
    'This is the one.',
    "Right, here's what we're doing.",
    "Here's the work.",
    "I like this one for you. Here's the block.",
  ],
  preamble_program: [
    "Here it is. Nothing's saved until you've seen every week.",
    "That's your block. Read it through before you commit to anything.",
    'Done. Have a look at the whole thing before you start it.',
    "Here's what I'd have you do. Go through it — nothing is saved yet.",
    "Built. Look it over; you're not committed to anything yet.",
    'There you go. Every week of it is there to read first.',
    "I'm excited about this one for you. Have a look before we lock it in.",
    "Here's your plan. Take a look — change anything that doesn't sit right.",
    "That's the block. Read it, question it, then we go.",
    "Here it is. If something looks off, tell me and I'll fix it before you start.",
  ],
  preamble_day: [
    'Here it is. Everything in it is something you can do with what you told me.',
    "That's your session. Nothing in it needs kit you haven't got.",
    "Here's the day. It fits the time and the room you gave me.",
    "Done. It's built around what you actually have.",
    "Here's today. Every piece of it fits your setup.",
    "Session's ready. It fits your time and your gear.",
    "Here's your workout. Nothing in there you can't do today.",
    "That's the day. Built for your setup, sized for your time.",
  ],

  // ── the edges ────────────────────────────────────────────────────────────────────────────────────
  not_understood: [
    "I didn't catch that one. Tap an answer, or say it another way.",
    'You lost me on that one — tap one of these and we will keep moving.',
    "I'm not following. Try one of these.",
    "Didn't get that. Tap an answer instead.",
    "That one's past me. Pick from these and we'll keep going.",
    "I missed that. One of these should cover it.",
    "Say that another way? Or tap one of these.",
    "Not sure I got that. Pick one below.",
  ],
  help_open: [
    'What do you want to know?',
    'Ask away.',
    'What are you trying to do?',
    'What do you need a hand with?',
    "What's got you stuck?",
    "What can I walk you through?",
    'What do you want to find?',
    'Where do you need help?',
  ],
  import_open: [
    "Paste it in and I'll read it. A table, a sheet, a plan someone wrote out — whatever you've got.",
    "Bring it over. Paste the plan in and I'll turn it into something you can train.",
    "Hand it here. Paste the whole thing and I'll read the weeks out of it.",
    "Let's bring it in. Paste it however it's written and I'll sort it out.",
    "Paste it here. Messy is fine — I'll show you what I found before anything is saved.",
    "Drop the plan in. I'll read it and turn it into something you can log.",
  ],
  /* ── they'd rather not paste it now ───────────────────────────────────────────────────────────────
   *
   * ⚠ "NOT NOW" HAD NO CHIP. The import offer carried exactly one — "Paste it in" — so the only way to
   * decline was to close the sheet, which reads as backing out of something rather than choosing.
   *
   * It also matters that he says the offer keeps: a free account gets ONE import, and somebody hurried
   * into pasting a half-remembered plan in their first minutes spends it on a bad copy. And it catches
   * the athlete whose program is in their head rather than written down anywhere — there is nothing for
   * them to paste, and until now nothing for them to tap either. */
  import_later: [
    "Fair enough — log as you go. Bring it across whenever you like; it'll be here.",
    'No rush. Train off it and paste it in another time — the offer keeps.',
    "Right you are. It'll still be here when you want it brought over.",
    "No problem. Whenever you're ready, I'll be here to read it.",
    'All good. Train your way for now and bring it over when it suits you.',
    "Anytime. The door stays open for it.",
  ],
  /* ── out of allowance ─────────────────────────────────────────────────────────────────────────────
   *
   * ⚠ HE ANSWERS; HE DOES NOT SELL. The M-7 modal is already rising over this with the offer, and it is
   * one shared surface across nine caps — putting the commercial ask in his mouth as well would say it
   * twice and in two different voices.
   *
   * These exist because the athlete's own message is echoed into the thread BEFORE the gate is checked,
   * so a blocked build left their question sitting there with no reply at all. Dismiss the modal and you
   * were looking at a coach who had been asked something and said nothing. Whatever the commercial
   * answer is, the conversational one cannot be silence.
   */
  allowance_program: [
    "That's the one block I write for free — you've had it.",
    "I've already written you a block. That's the free one used.",
    "You've had the block I write for nothing. There's more where it came from, mind.",
    "That free block's been used. The one you've got is still a good one.",
    "You've used the free build. Everything I wrote you is still yours.",
  ],
  allowance_day: [
    "That's this month's sessions used. They come back when the month turns.",
    "You've had this month's sessions off me. Fresh ones next month.",
    "I'm out of sessions for this month — they reset when it rolls over.",
    "That's the month's sessions spent. New ones land when the month turns over.",
    "You've used this month's builds. They refill at the start of next month.",
  ],
  /* ── asked to build it again ──────────────────────────────────────────────────────────────────────
   *
   * ⚠ NO APOLOGY AND NO INTERROGATION. He does not ask what was wrong with the last one: an athlete who
   * knew that would have used the Builder. The whole value of this door is that it costs nothing to say
   * "not that" — so he takes it as a normal part of the work and starts asking again.
   */
  rebuild_open: [
    "Fair enough. Let's go again.",
    'Right — from the top.',
    "No bother. Let's build you a different one.",
    "Happy to. Let's find the one that fits.",
    'Sure. New build, fresh eyes.',
    "No problem. We'll get it right.",
    "Let's go again. It should feel like yours.",
    'Of course. From the start.',
  ],
  /* ── correcting the one thing he only asks once ───────────────────────────────────────────────────
   * Deliberately not an apology. Moving up a level is the point of the work, and moving down after time
   * off is ordinary — neither is a mistake to be sorry about. */
  ask_level_again: [
    'Where are you at now?',
    "Tell me where you're at these days.",
    'How would you put it now?',
    "Where would you put yourself today?",
    "Things change. Where are you at now?",
    'What level feels right these days?',
  ],
  level_saved: [
    "Got it — I'll build to that from here.",
    "Noted. That's what I'll work from now.",
    "Right, that's what I'll go on.",
    "Updated. Everything I build from here fits that.",
    "Good. I'll pitch things to that from now on.",
    "Done. That's where we work from.",
  ],
  // ── changing a plan already running ───────────────────────────────────────────────────────────────
  no_active_program: [
    "You haven't got a program running, so there's nothing for me to change. Want me to build you one?",
    "Nothing's running at the moment — there's no block to adjust. I can write you one.",
    "You're not on a program right now. Start one and I'll happily change it whenever you need.",
    "There's no program running yet. Want to fix that? I'll build you one.",
    "No active program to change. Say the word and I'll put one together.",
  ],
  ask_edit_session: [
    'Which session?',
    'Which one do you want different?',
    "Which session are we changing? Anything you've already done stays as it happened.",
    'Pick the session.',
    'Which day are we working on?',
    'Show me which one.',
  ],
  ask_edit_change: [
    'What do you want different about it?',
    "What's not working about it?",
    'What are we changing?',
    'What needs to move?',
    "What would make it better for you?",
    'Tell me what to change.',
  ],
  ask_edit_row: ['Which one?', 'Which movement?', 'Which of these?', 'Point at it.', 'Which exercise?', 'Which one are we changing?'],
  ask_edit_value: [
    'What should it be?',
    'Make it what?',
    'What are we changing it to?',
    'Give me the number.',
    'What do you want there instead?',
    'What number feels right?',
  ],
  ask_edit_scope: [
    'Just this week, or every week from here?',
    'Is this a one-off, or should the rest of the block follow?',
    'This week only, or the whole way through?',
    'Once, or from now on?',
    'Only this week, or keep it going?',
    'For this week, or for the rest of the block?',
  ],
  edit_done: [
    "Done. That's changed.",
    'Changed. The rest of the block is where you left it.',
    "That's in. Nothing else moved.",
    'Sorted.',
    'Done. Everything else stays where it was.',
    'Updated. The rest is untouched.',
    "Changed. That's your plan now.",
    'Done — it should fit better now.',
    'All set. Nothing else moved.',
    "There. That's how you wanted it.",
  ],
  nothing_to_build: [
    "There isn't enough here for me to build you a session. Tell me what you've got and I'll work with it.",
    "I can't make a session out of that. Give me more to work with.",
    'That leaves me nothing to prescribe. Tell me what you do have.',
    "I need a bit more to build from. What have you got to work with?",
    "Not enough to build on yet. Tell me more about your setup and I'll make it work.",
  ],
  /* The line before he hands over one off the shelf ("Pick one for me"). Follows an `ack`. */
  pick_one_for_you: [
    "Here's the one I'd put you on.",
    "This is the one I'd pick for you.",
    "Here's my pick for you.",
    "If it were up to me, this one.",
    "I'd start you on this one.",
    'This one fits you best.',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE DECK — how he keeps from repeating himself
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ⚠ **DELIBERATE MODULE-LEVEL STATE, AND HERE IS WHY IT IS SAFE.**
 *
 * It lives here rather than being threaded through every caller because it is presentation-only: nothing
 * in these maps can reach `assemble()`, so the engine stays a pure function of the athlete's answers no
 * matter what this remembers. `resetVoice()` exists so tests start from a known place.
 *
 * ⚠ THE DECK HOLDS HASHES, NOT LINES. It is persisted to the device, and a few hundred sentences written
 * out in full on every pick is a write nobody needs. A hash also degrades well across an OTA that edits
 * the copy: a line that no longer exists simply is not found, and the deck deals from what remains.
 */
interface Deck {
  /** Hashes of the variants not yet dealt in this cycle. */
  left: string[];
  /** Hash of the line said last, so a reshuffle can never open with it. */
  last: string | null;
}

const decks = new Map<string, Deck>();

/** Lines pinned to a moment by `pickOnce`. Bounded: the oldest are forgotten first. */
const slots = new Map<string, string>();
const SLOT_CAP = 400;

let onChange: (() => void) | null = null;

export function resetVoice(): void {
  decks.clear();
  slots.clear();
}

/** Injectable so a test can make the choice deterministic without the module knowing it is being tested. */
export type Chooser = (n: number) => number;

const defaultChooser: Chooser = (n) => Math.floor(Math.random() * n);

/** djb2 → base36. Not cryptographic; only has to tell a few dozen sentences apart. */
function hashLine(s: string): string {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0;
  return (x >>> 0).toString(36);
}

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
 * Deal the next line from this key's deck.
 *
 * ⚠ EXPORTED FOR `in-workout-voice.ts` AND `review.ts`. Their lines are separate tables — said in a gym,
 * or on a weekly card, not in a conversation — but they must share this deck memory. A second memory in a
 * second file would let Holt say the same sentence twice running across the boundary.
 *
 * `key` is typed loosely for those callers: their keys are not `VoiceKey`s, and widening `VoiceKey` to
 * include them would put their lines in `VOICE`, where the questionnaire tests would walk them under
 * rules written for a different surface.
 *
 * `choose(n)` indexes the undealt lines in their written order, so a test passing `() => 0` gets the
 * first line of a fresh deck, then the second, and so on — deterministic without knowing about decks.
 */
export function pickFrom(key: string, options: readonly string[], choose: Chooser = defaultChooser): string {
  if (options.length === 0) return '';
  const hashes = options.map(hashLine);
  const deck = decks.get(key);
  const last = deck?.last ?? null;

  let left = deck ? deck.left.filter((h) => hashes.includes(h)) : [];
  if (left.length === 0) left = [...hashes];

  // Never open a fresh cycle with the line that closed the last one.
  const candidates = options.length > 1 && last != null ? left.filter((h) => h !== last) : left;
  const pool = candidates.length > 0 ? candidates : left;
  const chosen = pool[Math.max(0, Math.min(pool.length - 1, choose(pool.length)))] ?? pool[0];

  decks.set(key, { left: left.filter((h) => h !== chosen), last: chosen });
  onChange?.();
  return options[hashes.indexOf(chosen)] ?? options[0];
}

/**
 * A line pinned to a moment: the same `slot` always gets the same line back.
 *
 * For the lines a screen computes during render. The workout coin re-derives its sentence every time a
 * set is logged, and a fresh deal each time would rewrite the coach mid-exercise. Keyed by what the line
 * is ABOUT (this exercise, this history, this verdict), the line holds for the session and the next
 * session — a different history — gets a new one.
 */
export function pickOnce(slot: string, key: string, options: readonly string[], choose: Chooser = defaultChooser): string {
  const held = slots.get(slot);
  if (held != null && options.includes(held)) return held;
  const line = pickFrom(key, options, choose);
  slots.set(slot, line);
  if (slots.size > SLOT_CAP) {
    const oldest = slots.keys().next().value;
    if (oldest != null) slots.delete(oldest);
  }
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

/**
 * Remove the token, and the space and stray punctuation it leaves behind.
 *
 * ⚠ "Good to see you, {name}." used to come out as "Good to see you,." — the comma that belonged to the
 * name was left standing in front of the full stop, and the test only looked for a space before
 * punctuation. The comma is now dropped whenever the name it introduced is.
 */
const strip = (line: string): string =>
  line
    .replace(/[ ]?\{name\}/g, '')
    .replace(/^([,.]\s*)+/, '')
    .replace(/\s+([,.?])/g, '$1')
    .replace(/,([.?!])/g, '$1')
    .trim();

/**
 * At most one exclamation mark in a message (HV-D3). The first stays; any after it become full stops.
 *
 * For composed messages — the weekly note is three table lines joined, and two of them can each be a win.
 * One exclamation lands; three reads as shouting.
 */
export function oneExclamation(text: string): string {
  let seen = false;
  return text.replace(/!/g, () => {
    if (seen) return '.';
    seen = true;
    return '!';
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// KEEPING THE DECK ACROSS LAUNCHES — `lib/voice-memory.ts` is the only caller
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface VoiceMemory {
  v: 1;
  decks: Record<string, { l: string[]; p: string | null }>;
}

/** Where every deck stands, in a shape small enough to write to the device after each line. */
export function voiceMemory(): VoiceMemory {
  const out: VoiceMemory = { v: 1, decks: {} };
  for (const [key, d] of decks) out.decks[key] = { l: d.left, p: d.last };
  return out;
}

/**
 * Put the decks back where they were.
 *
 * ⚠ A DECK ALREADY DEALT FROM THIS LAUNCH WINS. The stored copy is read asynchronously, and Holt may
 * have spoken before it lands; overwriting that deck would let him repeat the line he just said.
 *
 * ⚠ VALIDATED, NOT TRUSTED — a malformed or foreign value is ignored rather than half-applied.
 */
export function restoreVoiceMemory(m: unknown): void {
  if (!m || typeof m !== 'object' || (m as VoiceMemory).v !== 1) return;
  const stored = (m as VoiceMemory).decks;
  if (!stored || typeof stored !== 'object') return;
  for (const [key, d] of Object.entries(stored)) {
    if (decks.has(key) || !d || !Array.isArray(d.l)) continue;
    const left = d.l.filter((h): h is string => typeof h === 'string');
    decks.set(key, { left, last: typeof d.p === 'string' ? d.p : null });
  }
}

/** One listener, set by `lib/voice-memory.ts`, told whenever a deck moves. */
export function onVoiceChange(listener: (() => void) | null): void {
  onChange = listener;
}
