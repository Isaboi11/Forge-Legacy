/**
 * ══ EVERY EDGE FUNCTION: where its deployable file comes from, its tests, its eval suites, its gateway setting ══
 *
 * The deploy-ai skill (.claude/skills/deploy-ai/SKILL.md) and the nightly drift check (scripts/deploy-ai/drift.mjs)
 * both read this one map. AI Road to 10, Sprint 2, PL-5.
 *
 *   builder     scripts/build-<slug>-deploy.mjs exists: the function imports src/ modules, so what deploys is the
 *               GENERATED single-file bundle in supabase/apply/deploy-<slug>.ts (normalized: pure ASCII, no long
 *               comment rules — scripts/lib/bundle-normalize.mjs).
 *   no builder  the function imports nothing from src/, so what deploys is supabase/functions/<slug>/index.ts
 *               itself. Its "normalized" form is computed on the fly (the same normaliser) — that is the text an MCP
 *               deploy should send, and the drift check accepts either form (same / same_after_normalize).
 *               ⚠ food-search has a HAND copy, supabase/apply/deploy-food-search.ts, that is STALE (09-24; live v34
 *               came from the function source on 11-17). Nothing reads it here — deploy from the source.
 *   verifyJwt   the gateway setting, read live with the Supabase MCP `list_edge_functions` on 2026-11-17.
 *               ⚠ Never flip it in a redeploy: ai-canary and revenuecat-webhook are OFF on purpose (pg_cron and
 *               RevenueCat send no user token; each checks its own secret first).
 *   probe       what a stranger gets: OPTIONS (CORS preflight) and a POST with no Authorization. Neither reaches a
 *               model — free. The gateway answers 401 for a verify_jwt function; ai-canary answers its own 401 before
 *               anything else; revenuecat-webhook has no CORS (OPTIONS → its own 405).
 *   tests       the node --test files that read this function's source or bundle (kept honest by
 *               scripts/deploy-ai/__tests__/functions.test.mjs, which greps for every test that names it).
 *   suites      scripts/evals/suites/<name>.mjs that MUST gate a deploy of it. `node scripts/evals/gate.mjs <slug>`
 *               fails when one is missing or failing. [] with `noSuite` = deliberately ungated, and why.
 */

const META = ['src/domain/ai/__tests__/meter-functions-source.test.mjs', 'src/domain/ai/__tests__/meter-server.test.mjs'];
const MEDICAL = 'src/domain/coach/__tests__/medical-routing.test.mjs';

/** @type {Record<string, { builder: string | null, exportName?: string, verifyJwt: boolean, ai: boolean, probe: { options: number, post: number }, tests: string[], suites: string[], noSuite?: string }>} */
export const FUNCTIONS = {
  'coach-ask': {
    builder: 'scripts/build-coach-ask-deploy.mjs',
    exportName: 'buildCoachAskDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: [
      'src/domain/coach/__tests__/coach-ask-source.test.mjs',
      'src/domain/ai/__tests__/migration-0276.test.mjs',
      'src/domain/coach/__tests__/chat-history.test.mjs',
      'src/domain/coach/__tests__/coach-ask-loop.test.mjs',
      'src/domain/coach/__tests__/coach-ask-turn.test.mjs',
      'src/domain/coach/__tests__/ask-wire-old-client.test.mjs',
      'src/domain/coach/__tests__/ask-wire.test.mjs',
      MEDICAL,
    ],
    // Sprint 3b (PO 11-18): ask-safety sends coach-ask's own request; chat-safety sends coach-interpret's and gates
    // coach-interpret only. No bar lowered.
    suites: ['ask-safety', 'ask-actions', 'ask-answers', 'chat-summary'],
  },
  'coach-interpret': {
    builder: 'scripts/build-coach-interpret-deploy.mjs',
    exportName: 'buildCoachInterpretDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/coach/__tests__/interpret-narrow.test.mjs', 'src/domain/coach/__tests__/chat-history.test.mjs', 'src/domain/coach/__tests__/interpret-output-scan.test.mjs', MEDICAL, ...META],
    suites: ['chat-safety', 'chat-answers'],
  },
  'coach-author': {
    builder: 'scripts/build-coach-author-deploy.mjs',
    exportName: 'buildCoachAuthorDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/coach/__tests__/author.test.mjs', MEDICAL, ...META],
    suites: ['author'],
  },
  'coach-form-check': {
    builder: 'scripts/build-coach-form-check-deploy.mjs',
    exportName: 'buildCoachFormCheckDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/coach/__tests__/coach-form-check-source.test.mjs', 'src/domain/coach/__tests__/training-gaps.test.mjs', 'src/domain/coach/__tests__/form-check-sprint2.test.mjs', 'src/domain/coach/__tests__/form-check-frame-refs.test.mjs', MEDICAL, ...META],
    suites: ['form-check'],
  },
  'coach-kitchen': {
    builder: 'scripts/build-coach-kitchen-deploy.mjs',
    exportName: 'buildCoachKitchenDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/nutrition/__tests__/kitchen-dishes.test.mjs', 'src/domain/coach/__tests__/kitchen-output-scan.test.mjs', MEDICAL, ...META],
    suites: ['kitchen-allergens'],
  },
  'meal-photo-read': {
    builder: 'scripts/build-meal-photo-read-deploy.mjs',
    exportName: 'buildMealPhotoReadDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/nutrition/__tests__/meal-photo-source.test.mjs', ...META],
    suites: ['meal-photo'],
  },
  'meal-describe': {
    builder: 'scripts/build-meal-describe-deploy.mjs',
    exportName: 'buildMealDescribeDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/nutrition/__tests__/meal-describe-source.test.mjs', MEDICAL, ...META],
    suites: ['meal-describe'],
  },
  'recipe-photo-read': {
    builder: 'scripts/build-recipe-photo-read-deploy.mjs',
    exportName: 'buildRecipePhotoReadDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/nutrition/__tests__/recipe-photo-source.test.mjs', ...META],
    suites: [],
    noSuite: 'No recipe-photo corpus exists yet (0 live recipe_photo calls ever, audit 11-16). Its parser is covered by recipe-photo-source.test.mjs.',
  },
  'program-photo-read': {
    builder: 'scripts/build-program-photo-read-deploy.mjs',
    exportName: 'buildProgramPhotoReadDeploy',
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/app/__tests__/program-photo-wiring.test.mjs', ...META],
    suites: [],
    noSuite:
      'Only the fallback when the card reader fails. IM-2 (import-corpus) records the card reader + the tidy layout pass, not this read — recording it too would double the corpus cost. Add program-photo-read cases to import-corpus before a prompt change here.',
  },
  'recipe-link-read': {
    builder: 'scripts/build-recipe-link-read-deploy.mjs',
    exportName: 'buildRecipeLinkReadDeploy',
    verifyJwt: true,
    ai: false,
    probe: { options: 200, post: 401 },
    tests: [
      'src/domain/nutrition/__tests__/recipe-text-read.test.mjs',
      'src/domain/nutrition/__tests__/recipe-link-ssrf.test.mjs',
      'src/domain/nutrition/__tests__/planner-split.test.mjs',
    ],
    suites: [],
    noSuite: 'No model: it fetches a page and reads its JSON-LD in code.',
  },
  'workout-card-read': {
    builder: null,
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/workout/__tests__/card-rule.test.mjs', 'src/data/__tests__/workout-card-read-live.test.mjs', ...META],
    suites: ['import-corpus'],
  },
  'workout-tidy': {
    builder: null,
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/workout/__tests__/workout-tidy-prompt.test.mjs', ...META],
    // IM-2: the import corpus runs every photo through the card reader AND this layout pass (the real import path).
    suites: ['import-corpus'],
  },
  'ai-canary': {
    builder: null,
    verifyJwt: false,
    ai: true,
    probe: { options: 401, post: 401 },
    tests: ['src/domain/ai/__tests__/ai-canary.test.mjs'],
    suites: [],
    noSuite: 'A one-token "Reply with OK." probe per model — there is no answer to grade.',
  },
  'bug-plain': {
    builder: null,
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/ai/__tests__/admin-metering-source.test.mjs'],
    suites: [],
    noSuite: 'Operator-only admin tool (is_app_admin); no athlete sees its output.',
  },
  'social-plan': {
    builder: null,
    verifyJwt: true,
    ai: true,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/ai/__tests__/admin-metering-source.test.mjs'],
    suites: [],
    noSuite: 'Operator-only admin tool (is_app_admin); no athlete sees its output.',
  },
  'food-search': {
    builder: null,
    verifyJwt: true,
    ai: false,
    probe: { options: 200, post: 401 },
    tests: ['src/domain/nutrition/__tests__/preview-gate.test.mjs', 'src/domain/nutrition/__tests__/serving-weight.test.mjs'],
    suites: [],
    noSuite: 'No model: USDA / Open Food Facts / FatSecret lookups.',
  },
  'asc-sync': {
    builder: null,
    verifyJwt: true,
    ai: false,
    probe: { options: 200, post: 401 },
    tests: ['supabase/functions/asc-sync/__tests__/core.test.mjs'],
    suites: [],
    noSuite: 'No model.',
  },
  'sentry-sync': {
    builder: null,
    verifyJwt: true,
    ai: false,
    probe: { options: 200, post: 401 },
    tests: ['supabase/functions/sentry-sync/__tests__/core.test.mjs'],
    suites: [],
    noSuite: 'No model.',
  },
  'social-sync': {
    builder: null,
    verifyJwt: true,
    ai: false,
    probe: { options: 200, post: 401 },
    tests: ['supabase/functions/social-sync/__tests__/core.test.mjs', 'src/app/__tests__/crm-social-migration.test.mjs'],
    suites: [],
    noSuite: 'No model. ⚠ Not deployed (2026-11-17) — the CRM handles the 404; the drift check reports missing_live.',
  },
  'revenuecat-webhook': {
    builder: null,
    verifyJwt: false,
    ai: false,
    probe: { options: 405, post: 401 },
    tests: [],
    suites: [],
    noSuite: 'No model. ⚠ No unit test reads it yet — read the diff by hand before a deploy.',
  },
};

/** Live slugs that are NOT in this repo — the drift check reports them as missing_in_repo, never as a failure to fix here. */
export const KNOWN_ORPHANS = {
  'recipe-phot-read': 'A typo slug from 09-26 (P-D10). The PO deletes it in the dashboard — on the checklist.',
};

/** The project, from .mcp.json / site-config.js (public facts, not secrets). */
export const PROJECT_REF = 'ucqbzoeouvwoyfnnmqoo';
export const FUNCTIONS_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;

export const slugs = () => Object.keys(FUNCTIONS).sort();
