/**
 * Build the Supabase-dashboard paste copy of `supabase/functions/coach-author/index.ts`.
 *
 *   node scripts/build-coach-author-deploy.mjs
 *
 * The function imports `src/domain/coach/author.ts`, `author-catalogue.ts` and `medical-routing.ts`, which the
 * dashboard editor cannot reach; this inlines all three in place of their import lines. Same generator as
 * `build-coach-kitchen-deploy.mjs`. ⚠ The header is plain ASCII: the dashboard once failed to parse line 1
 * of a paste copy with a box-drawing character in it (386507dd).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactForPaste } from './compact-deploy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION = 'supabase/functions/coach-author/index.ts';
export const DEPLOY_COPY = 'supabase/apply/deploy-coach-author.ts';

const HEADER = `// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/coach-author/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/coach/author.ts, author-catalogue.ts and medical-routing.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines them in place of their import lines;
// nothing else differs. Regenerate with \`node scripts/build-coach-author-deploy.mjs\`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// coach-author -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and coach-kitchen use the same secret).
// No migration: it charges the \`day\` and \`program\` actions coach-interpret already uses (0203).
// ===============================================================================================

`;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The paste copy, as a string. */
export function buildCoachAuthorDeploy() {
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
  fs.writeFileSync(path.join(ROOT, DEPLOY_COPY), buildCoachAuthorDeploy());
  console.log(`wrote ${DEPLOY_COPY}`);
}
