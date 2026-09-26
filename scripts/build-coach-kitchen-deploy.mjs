/**
 * Build the Supabase-dashboard paste copy of `supabase/functions/coach-kitchen/index.ts`.
 *
 *   node scripts/build-coach-kitchen-deploy.mjs
 *
 * The function imports `src/domain/nutrition/kitchen-dishes.ts` and `src/domain/coach/medical-routing.ts`, which
 * the dashboard editor cannot reach; this inlines both in place of their import lines. Same generator as
 * `build-recipe-photo-read-deploy.mjs`. ⚠ The header is plain ASCII: the dashboard once failed to parse line 1
 * of a paste copy with a box-drawing character in it (386507dd).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/coach-kitchen/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-coach-kitchen.ts';

const HEADER = `// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/coach-kitchen/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/nutrition/kitchen-dishes.ts and src/domain/coach/medical-routing.ts,
// which the Supabase dashboard editor cannot reach. This copy inlines them in place of their import lines;
// nothing else differs. Regenerate with \`node scripts/build-coach-kitchen-deploy.mjs\`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// coach-kitchen -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and program-photo-read use the same secret).
// ! Apply supabase/apply/pending-0222.sql FIRST - it prices \`kitchen\`; until then every ask answers
// "the kitchen's not working".
// ===============================================================================================

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildCoachKitchenDeploy() {
  const src = read(FUNCTION);
  const inlined = src.replace(/^import [^;]*? from '\.\.\/\.\.\/\.\.\/(src\/[^']+)';\n/gms, (_m, rel) => {
    const body = read(rel).trimEnd();
    if (/^import /m.test(body)) throw new Error(`${rel} has imports of its own; inline them too`);
    return `// -- inlined: ${rel} --\n${body}\n\n// -- end inlined --\n`;
  });
  if (inlined.includes("'../../../src/")) throw new Error('an import from src/ was not inlined');
  return compactForPaste(HEADER, inlined);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildCoachKitchenDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
