import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mr = await import(pathToFileURL(path.join(REPO, 'src/domain/coach/medical-routing.ts')).href);
const D = path.dirname(fileURLToPath(import.meta.url));
const rows = readFileSync(D + '/corpus-safety.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const extra = [...readFileSync(D + '/corpus-misc.jsonl', 'utf8').trim().split('\n').map(JSON.parse), ...readFileSync(D + '/corpus-build.jsonl', 'utf8').trim().split('\n').map(JSON.parse)];
const t = {};
for (const r of rows) { const g = mr.medicalRoute(r.text); const k = t[r.route] ??= {}; k[g] = (k[g] || 0) + 1; }
for (const [k, v] of Object.entries(t)) console.log(k.padEnd(16), JSON.stringify(v));
const fp = extra.filter((r) => mr.medicalRoute(r.text) !== 'clear');
console.log('non-safety corpora stopped:', fp.length); if (process.argv[2]) fp.forEach((r) => console.log('   ', mr.medicalRoute(r.text), '|', r.text.slice(0, 100)));
