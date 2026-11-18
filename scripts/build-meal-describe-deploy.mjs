/**
 * Builds supabase/apply/deploy-meal-describe.ts — the Supabase dashboard paste copy of
 * supabase/functions/meal-describe/index.ts.
 *
 * The dashboard editor cannot reach `src/`, so each `import … from '../../../src/…'` in the function is
 * replaced by that module's source, between `── inlined ──` markers. Nothing else differs. Same shape as
 * supabase/apply/deploy-meal-photo-read.ts (AI Road to 10 Sprint 4a §1.6).
 *
 *   node scripts/build-meal-describe-deploy.mjs          # write the paste copy
 *
 * `src/domain/nutrition/__tests__/meal-describe-source.test.mjs` fails when the committed copy is stale.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';
import { normalizeBundle } from './lib/bundle-normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/meal-describe/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-meal-describe.ts';

const HEADER = `// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/meal-describe/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/ modules (the meal read's schema and guard, its own caps, the medical
// guard, the output scan, the meter, the model request), which the Supabase dashboard editor cannot
// reach. This copy inlines each in place of its import line; nothing else differs.
// Regenerate with \`node scripts/build-meal-describe-deploy.mjs\`.
//
// A NEW function: Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name
// it meal-describe -> replace the editor contents with this whole file -> Deploy (verify_jwt ON).
// ANTHROPIC_API_KEY is already set (meal-photo-read uses the same secret).
// ! Apply supabase/apply/pending-0277.sql FIRST - it puts meal-describe in coach_ai_reserve's function
// list and its soft floor; until then a read is still charged (1 credit, meal_photo) but ledgered as
// 'other' and refused at 0 credits instead of riding the floor.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildMealDescribeDeploy() {
  const src = read(FUNCTION);
  // `import { … } from '../../../src/…';` — single- or multi-line.
  const inlined = src.replace(/^import [^;]*? from '\.\.\/\.\.\/\.\.\/(src\/[^']+)';\n/gms, (_m, rel) => {
    const body = read(rel).trimEnd();
    if (/^import /m.test(body)) throw new Error(`${rel} has imports of its own; inline them too`);
    return `// ── inlined: ${rel} ──\n${body}\n\n// ── end inlined ──\n`;
  });
  if (inlined.includes("'../../../src/")) throw new Error('an import from src/ was not inlined');
  // Comments stripped and types erased — the paste only needs the code (see compact-deploy.mjs).
  return normalizeBundle(compactForPaste(HEADER, inlined));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildMealDescribeDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
