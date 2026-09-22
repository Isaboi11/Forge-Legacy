/**
 * Builds supabase/apply/deploy-coach-interpret.ts — the Supabase dashboard paste copy of
 * supabase/functions/coach-interpret/index.ts.
 *
 * The dashboard editor cannot reach `src/`, so each `import … from '../../../src/…'` in the function is
 * replaced by that module's source, between `── inlined ──` markers. Nothing else differs.
 *
 *   node scripts/build-coach-interpret-deploy.mjs          # write the paste copy
 *
 * Kept in step by `src/domain/coach/__tests__/interpret-narrow.test.mjs`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/coach-interpret/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-coach-interpret.ts';

const HEADER = `// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DASHBOARD PASTE COPY of supabase/functions/coach-interpret/index.ts — GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/coach/medical-routing.ts and src/domain/coach/interpret-narrow.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines those modules in place of their import
// lines; nothing else differs. Regenerate with \`node scripts/build-coach-interpret-deploy.mjs\`.
//
// Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it
// coach-interpret → replace the editor contents with this whole file → Deploy.
// ANTHROPIC_API_KEY is already set (program-photo-read uses the same secret).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildCoachInterpretDeploy() {
  const src = read(FUNCTION);
  // `import { … } from '../../../src/…';` — single- or multi-line.
  const inlined = src.replace(/^import [^;]*? from '\.\.\/\.\.\/\.\.\/(src\/[^']+)';\n/gms, (_m, rel) => {
    const body = read(rel).trimEnd();
    if (/^import /m.test(body)) throw new Error(`${rel} has imports of its own; inline them too`);
    return `// ── inlined: ${rel} ──\n${body}\n\n// ── end inlined ──\n`;
  });
  if (inlined.includes("'../../../src/")) throw new Error('an import from src/ was not inlined');
  return HEADER + inlined;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildCoachInterpretDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
