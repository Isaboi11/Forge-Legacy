/**
 * Builds supabase/apply/deploy-coach-form-check.ts — the Supabase dashboard paste copy of
 * supabase/functions/coach-form-check/index.ts.
 *
 * The dashboard editor cannot reach `src/`, so each `import … from '../../../src/…'` in the function is
 * replaced by that module's source, between `── inlined ──` markers. Nothing else differs. Same shape as
 * supabase/apply/deploy-coach-ask.ts.
 *
 *   node scripts/build-coach-form-check-deploy.mjs          # write the paste copy
 *
 * `src/domain/coach/__tests__/coach-form-check-source.test.mjs` fails when the committed copy is stale.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/coach-form-check/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-coach-form-check.ts';

const HEADER = `// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DASHBOARD PASTE COPY of supabase/functions/coach-form-check/index.ts — GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/coach/medical-routing.ts and src/domain/coach/form-check.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines those modules in place of their import
// lines; nothing else differs. Regenerate with \`node scripts/build-coach-form-check-deploy.mjs\`.
//
// Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it
// coach-form-check → replace the editor contents with this whole file → Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and program-photo-read use the same secret).
// \`form_check\` is already priced in coach_ai_config.action_credits (migration 0144) — no migration needed.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildCoachFormCheckDeploy() {
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
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildCoachFormCheckDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
