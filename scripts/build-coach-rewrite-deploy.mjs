/**
 * Builds supabase/apply/deploy-coach-rewrite.ts — the Supabase dashboard paste copy of
 * supabase/functions/coach-rewrite/index.ts.
 *
 * The dashboard editor cannot reach `src/`, so each `import … from '../../../src/…'` in the function is
 * replaced by that module's source, between `── inlined ──` markers. Nothing else differs. Same shape as
 * supabase/apply/deploy-meal-describe.ts (Holt Listens, PO D12).
 *
 *   node scripts/build-coach-rewrite-deploy.mjs          # write the paste copy
 *
 * `src/domain/coach/__tests__/coach-rewrite-source.test.mjs` fails when the committed copy is stale.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';
import { normalizeBundle } from './lib/bundle-normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/coach-rewrite/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-coach-rewrite.ts';

const HEADER = `// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/coach-rewrite/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/ modules (the rewriter's wire: schema, prompt, request, reading the
// answer; the exercise library; the medical guard; the meter; the model request), which the Supabase
// dashboard editor cannot reach. This copy inlines each in place of its import line; nothing else differs.
// Regenerate with \`node scripts/build-coach-rewrite-deploy.mjs\`.
//
// A NEW function: Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name
// it coach-rewrite -> replace the editor contents with this whole file -> Deploy (verify_jwt ON).
// ANTHROPIC_API_KEY is already set (coach-author uses the same secret).
// ! Apply supabase/apply/pending-0281.sql too - it puts coach-rewrite in coach_ai_reserve's function list
// and lets a change ride the chat turn that asked for it (1 credit, not 2). Without it a rewrite still
// works, charged its own 1 credit and ledgered as 'other'.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildCoachRewriteDeploy() {
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
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildCoachRewriteDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
