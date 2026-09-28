import { registerHooks } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as joinPath } from 'node:path';

/**
 * Lets `node --test` import a `src/data/*-live.ts` file as the app does: `@/…` resolves to `src/…` (with the
 * `.ts` the app's bundler adds), and the device / network modules resolve to `fake-supabase.mjs` and
 * `stubs.mjs`. Import this BEFORE importing the module under test.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SRC = joinPath(here, '..', '..', '..');
const STUBS = pathToFileURL(joinPath(here, 'stubs.mjs')).href;
const FAKES = {
  '@/lib/supabase': pathToFileURL(joinPath(here, 'fake-supabase.mjs')).href,
  '@/lib/app-session': STUBS,
  '@/lib/diagnostics': STUBS,
  '@react-native-async-storage/async-storage': STUBS,
  '@/lib/storage-upload': STUBS,
  'react-native': STUBS,
};

function fileFor(base) {
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, joinPath(base, 'index.ts')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

registerHooks({
  /* The app's bundler imports JSON as a module (the exercise catalogue); Node needs telling. */
  load(url, context, next) {
    if (url.endsWith('.json')) return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true };
    return next(url, context);
  },
  resolve(specifier, context, next) {
    if (FAKES[specifier]) return { url: FAKES[specifier], shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const file = fileFor(joinPath(SRC, specifier.slice(2)));
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    /* A relative import without an extension inside src (`./types`) — the bundler's resolution. */
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const file = fileFor(joinPath(dirname(fileURLToPath(context.parentURL)), specifier));
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
