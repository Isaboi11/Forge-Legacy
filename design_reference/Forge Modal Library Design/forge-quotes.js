/*
 * Forge Legacy — Completion Quotes
 * A curated collection shown when a workout is sealed. Original copy, Forge voice:
 * discipline, permanence, legacy, iron, the long game. No attributions, no clichés.
 *
 * Usage
 *   ForgeQuotes.random()        -> a random line (fresh each session)
 *   ForgeQuotes.pick(seed)      -> deterministic line for a number/string seed
 *   ForgeQuotes.ofDay(date?)    -> stable "quote of the day"
 *   ForgeQuotes.ALL             -> the full array
 */
(function (root) {
  var ALL = [
    'History is permanent. Outcomes cannot change.',
    'The iron remembers what the mind forgets.',
    'Today is now part of the record. Permanent.',
    'You did not find time. You forged it.',
    'Legacy is built one sealed session at a time.',
    'Show up long enough and the work becomes who you are.',
    'The weight was heavy. You were heavier.',
    'What you repeat, you become.',
    'Strength is a debt paid to your future self.',
    'The forge does not ask if you are ready.',
    'Consistency is the rarest kind of talent.',
    'Each session is a stone laid in a foundation only you can see.',
    'The record grows. So do you.',
    'Feelings are weather. Habits are stone.',
    'You are not lifting weight. You are moving your limits.',
    'The hard day you did not skip counts twice.',
    'Comfort builds nothing worth keeping.',
    'Iron is honest. It gives exactly what you earn.',
    'A legacy is discipline, repeated past the point of witnesses.',
    'The work you finish quietly speaks the loudest.',
    'Greatness is a series of unremarkable days, kept.',
    'You cannot negotiate with the barbell. You can only meet it.',
    'Ordinary effort, made permanent, becomes extraordinary.',
    'The person you will be in a year is watching you now.',
    'Every session sealed is a brick that cannot be un-laid.',
    'The mind quits first. You did not listen to it.',
    'Progress hides in the sets no one applauds.',
    'Build in silence. Let the record speak.',
    'Foundations are poured on the days you would rather rest.',
    'Heavy things get lighter only because you got stronger.',
    'You met the iron and did not blink.',
    'Momentum is earned, never given.',
    'One more session. That is the whole secret.',
    'The strong were once the stubborn who refused to stop.',
    'Your future is forged in reps you will forget.',
    'Nothing lasting was ever built comfortably.',
    'The bar was set. You cleared it. It is history now.',
    'Legacy outlives motivation. Build for legacy.',
    'Discipline carried you where desire could not.',
    'A body is built like a legacy: slowly, then permanently.',
    'You showed up. The rest is arithmetic.',
    'What you forged today, no one can melt down.',
    'The steel yielded. You did not.',
    'You are the sum of the sessions you refused to skip.',
    'This is the work. There is no other kind.',
    'Quiet reps, stacked for years, move mountains.',
    'The forge is patient. So are the disciplined.',
    'You buried the excuse and kept the appointment.'
  ];

  function hash(s) {
    s = String(s);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }

  function pick(seed) {
    if (seed == null) return random();
    var n = typeof seed === 'number' ? Math.abs(Math.floor(seed)) : hash(seed);
    return ALL[n % ALL.length];
  }

  function random() { return ALL[Math.floor(Math.random() * ALL.length)]; }

  function ofDay(date) {
    var d = date || new Date();
    var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    return pick(key);
  }

  var API = { ALL: ALL, count: ALL.length, pick: pick, random: random, ofDay: ofDay };
  root.ForgeQuotes = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
