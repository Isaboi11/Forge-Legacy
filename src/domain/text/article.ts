// "a run", "an elliptical" — the indefinite article for a noun the app prints (QA 09-26 programs-18: "Add a
// elliptical"). Pure and dependency-free, like `plural.ts`, so domain code can import it by relative path.

/** Words that START with a vowel letter but a consonant SOUND ("a unilateral", "a one-arm"). */
const CONSONANT_SOUND = /^(uni|use|usu|ur[aeiou]|eu|one\b|once\b)/i;
/** Words that start with a consonant letter but a vowel SOUND ("an hour"). */
const VOWEL_SOUND = /^(hour|honest|honou?r|heir)/i;

/** `a` or `an` for the phrase's first word. */
export function articleFor(phrase: string): 'a' | 'an' {
  const w = phrase.trim();
  if (VOWEL_SOUND.test(w)) return 'an';
  if (CONSONANT_SOUND.test(w)) return 'a';
  return /^[aeiou]/i.test(w) ? 'an' : 'a';
}

/** The phrase with its article: `withArticle('elliptical')` → "an elliptical", `withArticle('run')` → "a run". */
export function withArticle(phrase: string): string {
  return `${articleFor(phrase)} ${phrase.trim()}`;
}
