/**
 * score-kitchen.mjs — where every Kitchen Mode line would go TODAY, through the app's own routing code.
 * Free and offline: no model is called. Mirrors `CoachChatSheet.process()` / `understand()` for a Premium AI
 * athlete (typing is Premium AI), with the server guard (`coach-ask` / `coach-interpret` step 0) applied.
 *
 *   node --experimental-strip-types scripts/holt-corpus/score-kitchen.mjs [--show CAT] [--bad]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { medicalRoute } from '../../src/domain/coach/medical-routing.ts';
import { fromOpener, looksLikeQuestion } from '../../src/domain/coach/chat-core.ts';
import { isGapQuestion } from '../../src/domain/coach/training-gaps.ts';
import { kitchenWantsTraining, medicalStopIsDietitian } from '../../src/domain/coach/kitchen.ts';

/* `--before` scores the routing as it was before the 2026-09-25 fixes (the training chat's path). */
const BEFORE = process.argv.includes('--before');

const file = fileURLToPath(new URL('./corpus-kitchen.jsonl', import.meta.url));
const lines = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

/** The route the app takes, named by what the athlete sees. */
function route(text) {
  return BEFORE ? routeBefore(text) : routeKitchen(text);
}

/** Kitchen Mode, as `CoachChatSheet.process()` now routes it. */
function routeKitchen(text) {
  const g = medicalRoute(text);
  if (g === 'crisis' || g === 'urgent' || g === 'care') return `STOP_${g.toUpperCase()}`;
  if (g !== 'clear') return medicalStopIsDietitian(text, true) ? 'STOP_DIETITIAN' : 'STOP_PHYSIO';
  if (!kitchenWantsTraining(text)) return 'ASK';
  return routeBefore(text);
}

function routeBefore(text) {
  const g = medicalRoute(text);
  if (g === 'crisis' || g === 'urgent' || g === 'care') return `STOP_${g.toUpperCase()}`;
  const opener = fromOpener(text);
  if (opener?.kind === 'build') return 'TRAINING_BUILD';
  if (looksLikeQuestion(text)) {
    if (isGapQuestion(text)) return 'TRAINING_GAPS';
    if (g !== 'clear') return 'STOP_PHYSIO'; // coach-ask guard → MEDICAL_STOP ("That's a physio's job")
    return 'ASK';
  }
  if (g !== 'clear') return 'STOP_PHYSIO'; // interpretTyped guard → MEDICAL_STOP
  return 'TRAINING_PARSER'; // coach-interpret: a training-only parser
}

/** Is that route right for what the line needed? */
function verdict(expect, r) {
  switch (expect) {
    case 'ask':
      return r === 'ASK' ? 'ok' : r.startsWith('STOP') ? 'false_stop' : 'misroute';
    case 'act':
      return r === 'ASK' ? 'words_only' : r.startsWith('STOP') ? 'false_stop' : 'misroute';
    case 'training':
      return r === 'ASK' || r.startsWith('TRAINING') ? 'ok' : 'misroute';
    case 'advice':
      return r === 'STOP_PHYSIO' ? 'wrong_copy' : r.startsWith('STOP') ? 'ok' : 'missed_stop';
    // "ask" lines that stop with the RIGHT copy are fine only if the line was really a stop; otherwise false_stop.
    case 'care':
      return r === 'STOP_CARE' ? 'ok' : r.startsWith('STOP') ? 'wrong_copy' : 'missed_stop';
    case 'crisis':
      return r === 'STOP_CRISIS' ? 'ok' : 'missed_stop';
    case 'urgent':
      return r === 'STOP_URGENT' ? 'ok' : 'missed_stop';
  }
  return 'ok';
}

const args = process.argv.slice(2);
const show = args.includes('--show') ? args[args.indexOf('--show') + 1] : null;
const onlyBad = args.includes('--bad');

const byCat = new Map();
const byVerdict = new Map();
const examples = new Map();
for (const l of lines) {
  const r = route(l.text);
  const v = verdict(l.expect, r);
  l.route = r;
  l.verdict = v;
  const c = byCat.get(l.cat) ?? { n: 0, v: {} };
  c.n += 1;
  c.v[v] = (c.v[v] ?? 0) + 1;
  byCat.set(l.cat, c);
  byVerdict.set(v, (byVerdict.get(v) ?? 0) + 1);
  const key = `${l.cat}|${v}|${r}`;
  if (!examples.has(key)) examples.set(key, []);
  if (examples.get(key).length < 4 && !examples.get(key).includes(l.text)) examples.get(key).push(l.text);
}

const users = new Set(lines.filter((l) => l.user > 0).map((l) => l.user));
const hitBad = new Set(lines.filter((l) => l.user > 0 && !['ok', 'words_only'].includes(l.verdict)).map((l) => l.user));
console.log(`${lines.length} messages · ${users.size} users · ${hitBad.size} users (${Math.round((100 * hitBad.size) / users.size)}%) hit at least one wrong turn\n`);
console.log('verdicts:', Object.fromEntries([...byVerdict].sort((a, b) => b[1] - a[1])));
console.log('\nby category:');
for (const [cat, c] of [...byCat].sort()) {
  const parts = Object.entries(c.v).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${Math.round((100 * n) / c.n)}%`);
  console.log(`  ${cat.padEnd(16)} n=${String(c.n).padStart(4)}  ${parts.join(' · ')}`);
}
console.log('\nexamples:');
for (const [key, ex] of [...examples].sort()) {
  const [cat, v, r] = key.split('|');
  if (show && cat !== show) continue;
  if (onlyBad && ['ok', 'words_only'].includes(v)) continue;
  console.log(`  [${cat} → ${r} = ${v}]`);
  for (const t of ex) console.log(`      ${t.slice(0, 110)}`);
}
