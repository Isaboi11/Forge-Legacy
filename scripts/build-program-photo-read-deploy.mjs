/**
 * Builds supabase/apply/deploy-program-photo-read.ts — the Supabase dashboard paste copy of
 * supabase/functions/program-photo-read/index.ts.
 *
 * Until AI Road to 10 Sprint 1 this copy was kept BY HAND ("Regenerate from the two source files"), and it
 * drifted: the audit (P-D3) found the deployed function seven weeks stale. It is now generated like every other
 * bundled function: each `import … from '../../../src/…'` is replaced by that module's source, between
 * `── inlined ──` markers. Nothing else differs. Same shape as scripts/build-meal-photo-read-deploy.mjs.
 *
 *   node scripts/build-program-photo-read-deploy.mjs          # write the paste copy
 *
 * `src/app/__tests__/program-photo-wiring.test.mjs` fails when the committed copy is stale.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/program-photo-read/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-program-photo-read.ts';

const HEADER = `// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/program-photo-read/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/program/photo-transcript.ts and src/domain/ai/meter-server.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines them in place of their import lines; nothing
// else differs. Regenerate with \`node scripts/build-program-photo-read-deploy.mjs\`.
//
// Supabase dashboard -> Edge Functions -> program-photo-read -> replace the editor contents with this whole
// file -> Deploy. ANTHROPIC_API_KEY is already set (coach-interpret and coach-ask use the same secret).
// ! Apply supabase/apply/pending-0268.sql FIRST - it creates coach_ai_reserve / coach_ai_settle; until then
// every read answers "meter unavailable".
// ===============================================================================================

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildProgramPhotoReadDeploy() {
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
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildProgramPhotoReadDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
