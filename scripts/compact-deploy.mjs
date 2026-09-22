/**
 * Shrinks a dashboard paste copy by removing comments — the code and its types are printed back unchanged.
 *
 * Why: a 74 KB paste of coach-interpret arrived in the Supabase editor cut off at ~40 KB ("Expected '}',
 * got <eof>", 2026-09-22). The function's comments are for this repo, not for Deno — the paste only needs
 * the code. TypeScript's own printer (not a regex) so strings, regexes and URLs containing `//` are safe,
 * and types are kept so `deno check` still passes.
 */
import ts from 'typescript';

export function compactForPaste(header, source) {
  const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(file);
  return header + out;
}
