/**
 * Record once, replay free — the recording store (Docs/AI-Sprint-2-Build-Notes.md §1.4).
 *
 *   scripts/evals/recordings/<suite>/<promptHash12>/<caseId>.json
 *     = { caseId, promptHash, model, recordedAt, reply, usage }
 *
 * A recording belongs to the prompt it was made with. `state()` says, for the CURRENT hash:
 *   current     recordings exist under it → they are graded
 *   stale       recordings exist only under older hashes → the gate FAILS ("re-record: ~$X live")
 *   unrecorded  none ever → deterministic checks only, with a loud warning
 */

import fs from 'node:fs';
import path from 'node:path';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

export function recordingsRoot(root) {
  return path.join(root, 'scripts', 'evals', 'recordings');
}

/** @returns {{ state: 'current' | 'stale' | 'unrecorded', current: Map<string, object>, older: string[] }} */
export function state(dir, suiteName, hash) {
  const suiteDir = path.join(dir, suiteName);
  const hashes = fs.existsSync(suiteDir) ? fs.readdirSync(suiteDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  const h12 = hash.slice(0, 12);
  const current = new Map();
  if (hashes.includes(h12)) {
    for (const f of fs.readdirSync(path.join(suiteDir, h12)).filter((x) => x.endsWith('.json'))) {
      const rec = JSON.parse(fs.readFileSync(path.join(suiteDir, h12, f), 'utf8'));
      // A file under the right folder whose own hash disagrees is not trusted.
      if (rec.promptHash !== hash) continue;
      current.set(rec.caseId, rec);
    }
  }
  const older = hashes.filter((h) => h !== h12 && fs.readdirSync(path.join(suiteDir, h)).some((x) => x.endsWith('.json')));
  return { state: current.size ? 'current' : older.length ? 'stale' : 'unrecorded', current, older };
}

/** Write one recording (only run.mjs --live --record calls this). */
export function writeRecording(dir, { suite, hash, model, caseId, reply, usage, now = new Date() }) {
  if (!SAFE_ID.test(String(caseId))) throw new Error(`store: case id ${JSON.stringify(caseId)} is not a safe file name`);
  const folder = path.join(dir, suite, hash.slice(0, 12));
  fs.mkdirSync(folder, { recursive: true });
  const rec = { caseId: String(caseId), promptHash: hash, model, recordedAt: now.toISOString(), reply, usage };
  fs.writeFileSync(path.join(folder, `${caseId}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  return rec;
}
