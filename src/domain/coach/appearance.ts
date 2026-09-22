/**
 * THE ONE PLACE THAT KNOWS WHAT A REMARK ABOUT SOMEONE'S BODY LOOKS LIKE.
 *
 * ══ WHY THIS IS ITS OWN MODULE ══
 *
 * This pattern was written for the form check, where Holt looks at frames of a lift and must never look at
 * the person performing it. `Coach-Holt-Training-Gaps-v1.0` §6 needs exactly the same guarantee for a
 * different surface — Holt saying what an athlete's TRAINING needs, never what their BODY needs — and
 * instructs that the filter be shared rather than copied.
 *
 * ⚠ COPYING IT WOULD BE THE `0187`/`0190` MISTAKE IN TYPESCRIPT. Those two migrations carried the same
 * function body twice; the copy drifted, a test went on asserting the superseded one, and it stayed green
 * for three weeks because the two bodies happened to be identical at the moment it was written. A second
 * hand-maintained regex is the same trap: it passes on the day it is pasted and rots silently after.
 *
 * ══ WHY IT IS NOT SIMPLY "BAN BODY WORDS" ══
 *
 * BODY PARTS ARE NOT IN HERE AND MUST NEVER BE. Coaching is almost entirely a sentence about knees, hips,
 * a back, a chest and elbows — *"your knees cave on the way up"* is the coaching, not the problem. What is
 * banned is a judgement about how the body LOOKS or what it WEIGHS.
 *
 * Three exceptions are load-bearing and each one is there because banning the obvious phrase would delete
 * real coaching:
 *
 *   · `lean` — *"don't lean back at the top"* is a cue. Only `leaner`/`leanness`/`lean mass` are caught.
 *   · `your weight` — *"shift your weight back into your heels"* is textbook coaching, and it is the
 *     sharpest of the three. `overweight`, `obese` and *"lose weight"* carry the body case instead.
 *   · `leaned out` IS caught, except before "over" — *"you're leaning out over the bar"* is a torso note,
 *     *"you've leaned out since last time"* is a remark about a body.
 *
 * Pure, import-free, no I/O. `form-check.ts` and `training-gaps.ts` are both callers.
 */

/**
 * The athlete's body as an object of judgement.
 *
 * ⚠ Moved here from `form-check.ts` unchanged, byte for byte. If this needs to grow, it grows HERE and
 * both callers get it in the same commit.
 */
export const BODY_SENTENCE =
  /\b(body\s?fat|physique|overweight|obese|obesity|skinny|chubby|fat\b|flabby|slim|bulky|belly|gut\b|love\s+handles|lean(er|ness)\b|lean\s+(body|mass|muscle)|lean(ed|ing)?\s+out\b(?!\s+over)|put(ting)?\s+on\s+(some\s+)?(muscle|size|mass)|your\s+(physique|frame|build)\b|(los(e|ing)|drop(ping)?|gain(ing)?|shed(ding)?)\s+(some\s+|a\s+few\s+|a\s+bit\s+of\s+)?(weight|fat|pounds|lbs?|kg)|you\s+look\s+(strong|big|small|heavy|light|thin|fit))\b/i;

/**
 * Does this sentence judge the athlete's appearance?
 *
 * ⚠ TEST A FRESH `RegExp` EVERY TIME — or rather, never give this pattern the `g` flag. A global regex
 * carries `lastIndex` between calls and `.test()` on a shared instance then returns alternating answers
 * for the same input. Without `g` this is safe to share, and it is deliberately declared without it.
 */
export const mentionsAppearance = (sentence: string): boolean => BODY_SENTENCE.test(sentence);
