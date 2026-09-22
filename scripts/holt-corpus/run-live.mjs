// Live test v2 — routes each message the way the app does (question → coach-ask stream, else coach-interpret).
// Usage: HOLT_EMAIL=… HOLT_PASSWORD=… node --experimental-strip-types live2.mjs <set> [every]
//   set = misc | safety | build | followups
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const fs_read = (p) => readFileSync(p, 'utf8');
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const cc = await import(pathToFileURL(path.join(REPO, 'src/domain/coach/chat-core.ts')).href);
const env = Object.fromEntries(readFileSync(`${REPO}/.env`, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL, ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const [set = 'misc', everyArg] = process.argv.slice(2);
const EVERY = Number(everyArg ?? 1);

const auth = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.HOLT_EMAIL, password: process.env.HOLT_PASSWORD }) }).then((r) => r.json());
if (!auth.access_token) { console.error('sign-in failed'); process.exit(1); }
const H = { apikey: ANON, Authorization: `Bearer ${auth.access_token}`, 'content-type': 'application/json' };

async function interpret(text, history = []) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`${URL_}/functions/v1/coach-interpret`, { method: 'POST', headers: H, body: JSON.stringify({ text, mode: 'program', history }) });
      const j = await r.json().catch(() => ({ route: 'bad_json' }));
      if (r.status === 429 || (r.status >= 500 && j.reason === 'upstream_error' && j.status !== 400)) { await new Promise((s) => setTimeout(s, 2000 * (a + 1))); continue; }
      return { via: 'interpret', ...j };
    } catch { await new Promise((s) => setTimeout(s, 2000)); }
  }
  return { via: 'interpret', route: 'failed' };
}

async function ask(question, history = []) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${URL_}/functions/v1/coach-ask`, { method: 'POST', headers: H, body: JSON.stringify({ question, history }) });
    const type = r.headers.get('content-type') ?? '';
    if (!type.includes('text/event-stream')) return { via: 'ask', ...(await r.json().catch(() => ({ route: 'bad_json', status: r.status }))) };
    let text = '', ttfb = null, done = null, error = null, carry = '';
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      carry += dec.decode(value, { stream: true });
      const parts = carry.split('\n\n'); carry = parts.pop();
      for (const p of parts) {
        const line = p.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const ev = JSON.parse(line.slice(6));
        if (ev.t) { if (ttfb == null) ttfb = Date.now() - t0; text += ev.t; }
        if (ev.done) done = ev;
        if (ev.error) error = ev;
      }
    }
    return { via: 'ask', route: error ? 'error' : 'answer', say: text, ttfbMs: ttfb, totalMs: Date.now() - t0, usage: done?.usage, error };
  } catch (e) { return { via: 'ask', route: 'failed', detail: String(e) }; }
}

const route = (text, history) => (cc.looksLikeQuestion(text) ? ask(text, history) : interpret(text, history));
const load = (f) => readFileSync(`${DIR}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));

// Two-turn conversations: the second message only makes sense with the first.
const FOLLOWUPS = [
  ['what is RPE?', 'explain that simpler'],
  ['how long should I rest between sets?', 'what about for heavy squats'],
  ['why do people deload?', 'how often should I do it'],
  ['is creatine worth it?', 'what kind should I get'],
  ['how do I get better at pull-ups?', 'I can only do 2 right now'],
  ['what should I eat before a workout?', 'I train at 6am though'],
  ['how fast should my easy runs be?', 'I run a 30 minute 5k'],
  ['swap bench for dumbbell press on Monday', 'actually Friday'],
  ['make my squats 5 sets', 'just this week'],
  ['build me a 4 day program', 'make it 3 instead'],
  ['I want to get stronger', 'I have 45 minutes and train at home'],
  ['glute focus please', 'and 4 days'],
  ['what does 3x8 @ RPE 7 mean', 'so how heavy is that for me if my max is 225'],
  ['I feel lazy today', 'yeah but I really don\'t want to'],
  ['I hit a PR on deadlift today!', '405 for a single'],
];

const jobs = [];
if (set === 'followups') for (const [i, [a, b]] of FOLLOWUPS.entries()) jobs.push({ id: `F${i}`, pair: [a, b] });
else {
  const file = { misc: 'corpus-misc.jsonl', safety: 'corpus-safety.jsonl', build: 'corpus-build.jsonl' }[set];
  const only = process.env.HOLT_IDS ? new Set(JSON.parse(fs_read(process.env.HOLT_IDS))[set]) : null;
  load(file).forEach((r, k) => { if (only ? only.has(r.id) : k % EVERY === 0) jobs.push({ id: r.id, text: r.text }); });
}

const OUT = `${DIR}/live${process.env.HOLT_IDS ? '4' : '3'}-${set}.jsonl`;
const done = new Set(existsSync(OUT) ? readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []);
const todo = jobs.filter((j) => !done.has(j.id));
console.log(`${todo.length} to send`);
let i = 0, n = 0;
async function worker() {
  while (i < todo.length) {
    const j = todo[i++];
    let line;
    if (j.pair) {
      const first = await route(j.pair[0], []);
      const history = [{ role: 'athlete', text: j.pair[0] }, ...(first.say ? [{ role: 'holt', text: first.say }] : [])];
      const second = await route(j.pair[1], history);
      line = { id: j.id, pair: j.pair, first, second };
    } else {
      line = { id: j.id, text: j.text, res: await route(j.text, []) };
    }
    writeFileSync(OUT, JSON.stringify(line) + '\n', { flag: 'a' });
    if (++n % 50 === 0) console.log(n, '/', todo.length);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log('done', n);
