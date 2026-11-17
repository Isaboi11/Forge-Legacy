/**
 * A suite's prompt hash — what its recordings are keyed by (Docs/AI-Sprint-2-Build-Notes.md §1.4).
 *
 * `promptSources: [{ file, exportName }]` names top-level constants (exported or not) whose initializer is the
 * prompt text, a tool definition, or a schema the model is shown. Each is read with the TypeScript parser (never a
 * regex), as its source text with line endings normalized, so a Windows checkout and CI hash the same. The hash
 * covers the model id too: changing the model makes every recording STALE, exactly like changing the prompt.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

/** The initializer source text of top-level `const <name> = …` in a file. Throws when it is not there. */
export function constantText(fileText, name, fileLabel = 'file') {
  const text = fileText.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) return d.initializer.getText(sf);
    }
  }
  throw new Error(`prompt-hash: no top-level const ${name} in ${fileLabel}`);
}

/** sha256 hex of a suite's model + every prompt source. */
export function promptHash(suite, root) {
  const sources = (suite.promptSources ?? []).map(({ file, exportName }) => {
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) throw new Error(`prompt-hash: ${suite.name}: ${file} does not exist`);
    return { file, exportName, text: constantText(fs.readFileSync(abs, 'utf8'), exportName, file) };
  });
  if (sources.length === 0) throw new Error(`prompt-hash: ${suite.name} names no promptSources`);
  return crypto.createHash('sha256').update(JSON.stringify({ model: suite.model ?? null, sources }), 'utf8').digest('hex');
}

/** The cooked string value of a constant that is a plain string or a template without substitutions (for callLive). */
export function constantString(fileText, name) {
  const init = constantText(fileText, name);
  const sf = ts.createSourceFile('x.ts', `const __x = ${init};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const e = sf.statements[0].declarationList.declarations[0].initializer;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  throw new Error(`prompt-hash: const ${name} is not a plain string (it has substitutions) — build it in the suite`);
}
