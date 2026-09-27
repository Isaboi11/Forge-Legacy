/**
 * Builds supabase/apply/deploy-recipe-link-read.ts — the Supabase dashboard paste copy of
 * supabase/functions/recipe-link-read/index.ts.
 *
 * The dashboard editor cannot reach `src/`, so each `import … from '../../../src/…'` in the function is
 * replaced by that module's source, between `── inlined ──` markers. Nothing else differs. Same shape as
 * supabase/apply/deploy-coach-form-check.ts.
 *
 *   node scripts/build-recipe-link-read-deploy.mjs          # write the paste copy
 *
 * `src/domain/nutrition/__tests__/recipe-text-read.test.mjs` fails when the committed copy is stale.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/recipe-link-read/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-recipe-link-read.ts';

const HEADER = `// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/recipe-link-read/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/nutrition/recipe-text-read.ts, which the Supabase dashboard
// editor cannot reach. This copy inlines that module in place of its import line; nothing else differs.
// Regenerate with \`node scripts/build-recipe-link-read-deploy.mjs\`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// recipe-link-read -> replace the editor contents with this whole file -> Deploy.
// No secrets and no migration: no model, no credit. It reads a recipe page's schema.org Recipe block.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildRecipeLinkReadDeploy() {
  const src = read(FUNCTION);
  // `import { … } from '../../../src/…';` — single- or multi-line.
  const inlined = src.replace(/^import [^;]*? from '\.\.\/\.\.\/\.\.\/(src\/[^']+)';\n/gms, (_m, rel) => {
    const body = read(rel).trimEnd();
    if (/^import /m.test(body)) throw new Error(`${rel} has imports of its own; inline them too`);
    return `// ── inlined: ${rel} ──\n${body}\n\n// ── end inlined ──\n`;
  });
  if (inlined.includes("'../../../src/")) throw new Error('an import from src/ was not inlined');
  // Comments stripped and types erased — the paste only needs the code (see compact-deploy.mjs).
  return compactForPaste(HEADER, inlined);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildRecipeLinkReadDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
