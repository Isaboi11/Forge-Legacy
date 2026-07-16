// Phase 2 render-proof — DATA EQUIVALENCE.
//
// The Legacy + Profile components are byte-for-byte unchanged; only the data source swapped
// (fixture → Supabase). So if the LIVE spine query, run through the same mapping the app uses,
// produces the same DISPLAYED values the fixture hardcoded, the rendered screens are identical.
//
// This script queries the live DB (authed, RLS-scoped to self), applies a 1:1 port of
// src/lib/format.ts + src/data/legacy-live.ts + fetchPublicProfile, and diffs each rendered value
// against the fixture (src/data/legacy-placeholder.ts LEGACY_DATA). Any diff is printed and
// classified; only `dayCount` is an expected (live-derived) diff.
//
//   SB_EMAIL=… SB_PASS=… node supabase/seed/render-proof.mjs
import { signedInClient } from './_client.mjs';

// ── 1:1 port of src/lib/format.ts ────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROMAN = ['I', 'II', 'III', 'IV'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const roman = (n) => ROMAN[Math.max(1, Math.min(4, n)) - 1];
const fmtDate = (iso) => { const d = new Date(iso); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const fmtShort = (iso) => { const d = new Date(iso); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const daysSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const daysBetween = (s, e) => Math.max(0, Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000));
function dateRangeFull(s, e) {
  if (!e) return fmtDate(s);
  const a = new Date(s), b = new Date(e);
  const start = a.getUTCFullYear() === b.getUTCFullYear() ? `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}` : `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}, ${a.getUTCFullYear()}`;
  return `${start} – ${MONTHS[b.getUTCMonth()]} ${b.getUTCDate()}, ${b.getUTCFullYear()} · ${daysBetween(s, e)} days`;
}
function dateRangeCompact(s, e) {
  const a = new Date(s);
  if (!e) return `${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()}`;
  const b = new Date(e);
  const start = a.getUTCFullYear() === b.getUTCFullYear() ? MONTHS[a.getUTCMonth()] : `${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()}`;
  return `${start} – ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()} · ${daysBetween(s, e)}d`;
}

// ── 1:1 port of legacy-live mapping ──────────────────────────────────────────
const EVENT_LABEL = {
  CHAPTER_SEALED: 'Chapter Sealed', GOAL_ACHIEVED: 'Goal Achieved', RANK_UP: 'Rank Up',
  PROGRAM_GRADUATED: 'Program Graduated', ACCOMPLISHMENT: 'Accomplishment', HONOR_EARNED: 'Honor Earned',
  REFLECTION_ADDED: 'Reflection Added', MEMORY_ADDED: 'Memory Added', PHOTO_ADDED: 'Photo Added',
};
const GOALS = {
  'Into the Iron': 'Squat 315 lbs', 'Road to 405': 'Squat 405 lbs',
  'Power Block': 'Deadlift 4 plates', Foundations: 'Build the habit',
};
function deriveFeatured(timeline, chapters) {
  const sealed = timeline.find((e) => e.event_type === 'CHAPTER_SEALED');
  if (!sealed) return null;
  const chapter = chapters.find((c) => c.id === sealed.chapter_id || c.name === sealed.object_name);
  return {
    primaryText: sealed.object_name,
    secondaryText: chapter?.reflection ? `"${chapter.reflection}"` : undefined,
    dateLabel: fmtShort(sealed.occurred_at),
  };
}

// ── expected (fixture) rendered values, from src/data/legacy-placeholder.ts ──
const FIX = {
  rankName: 'Established', rankSubTier: 'III',
  standard: 'Show up when it’s hard. The work is the promise I keep to myself.',
  activeBegan: 'Began Apr 6, 2026 · Day 85', // dayCount 85 = stale fixture hardcode (expected diff)
  activeName: 'Into the Iron', activeGoal: 'Squat 315 lbs',
  featPrimary: 'Road to 405',
  featSecondary: '"I proved to myself that consistency over six weeks beats intensity over one."',
  featDate: 'Jun 27',
  sealRange: 'Jan 15 – Apr 4, 2026 · 79 days',
  sealFooter: '47 workouts · 3 honors · Sealed Jun 27, 2026',
  compactPower: 'Nov 2025 – Feb 2026 · 110d · Deadlift 4 plates',
  compactFound: 'Jul – Sep 2025 · 71d · Build the habit',
  timeline: [
    'Chapter Sealed · Road to 405 · Jun 27',
    'Honor Earned · 10 Workouts in Chapter · Jun 20',
    'Program Graduated · Strength Foundation II · Jun 14',
  ],
  // identity: the real persona (swapped from the Ada fixture in the Phase 3 follow-up).
  handle: '@Isaboi11', name: 'Isa Altamirano', rankLabel: 'Established · III', avatar: 'set',
};

const rows = [];
const push = (label, live, fixture, opts = {}) => rows.push({ label, live, fixture, sanctioned: !!opts.sanctioned });

const { sb, uid } = await signedInClient();
const [{ data: prof, error: pe }, { data: chRows, error: ce }, { data: tlRows, error: te }] = await Promise.all([
  sb.from('profiles').select('name, handle, rank_family, rank_level, standard, athlete_type, avatar_url').eq('id', uid).single(),
  sb.from('chapters').select('*').eq('athlete_id', uid),
  sb.from('timeline_events').select('*').eq('athlete_id', uid).order('occurred_at', { ascending: false }),
]);
if (pe || ce || te) throw pe || ce || te;

const chapters = chRows;
const timeline = tlRows;
const active = chapters.find((c) => c.is_active);
const byName = (n) => chapters.find((c) => c.name === n);

// LEGACY — spine
push('rankName', cap(prof.rank_family), FIX.rankName);
push('rankSubTier', roman(prof.rank_level), FIX.rankSubTier);
push('standard', prof.standard, FIX.standard);
push('active.name', active.name, FIX.activeName);
push('active.goal (fixture-pending)', GOALS[active.name], FIX.activeGoal);
push('active "Began … Day N"', `Began ${fmtDate(active.start_date)} · Day ${daysSince(active.start_date)}`, FIX.activeBegan, { sanctioned: true });

const feat = deriveFeatured(timeline, chapters);
push('featured.primary', feat.primaryText, FIX.featPrimary);
push('featured.secondary', feat.secondaryText, FIX.featSecondary);
push('featured.date', feat.dateLabel, FIX.featDate);

const rd = byName('Road to 405');
push('sealed(Road).range', dateRangeFull(rd.start_date, rd.end_date), FIX.sealRange);
push('sealed(Road).footer', `${rd.workout_count} workouts · ${rd.honor_count} honors · Sealed ${fmtDate(rd.sealed_at)}`, FIX.sealFooter);

const pb = byName('Power Block');
push('compact(Power)', `${dateRangeCompact(pb.start_date, pb.end_date)} · ${GOALS[pb.name]}`, FIX.compactPower);
const fd = byName('Foundations');
push('compact(Foundations)', `${dateRangeCompact(fd.start_date, fd.end_date)} · ${GOALS[fd.name]}`, FIX.compactFound);

const top3 = timeline.slice(0, 3).map((e) => `${EVENT_LABEL[e.event_type] ?? e.event_type} · ${e.object_name} · ${fmtShort(e.occurred_at)}`);
top3.forEach((t, i) => push(`timeline[${i}]`, t, FIX.timeline[i]));

// PROFILE (self) — fetchPublicProfile self branch
push('profile.name', prof.name, FIX.name);
push('profile.handle', '@' + prof.handle, FIX.handle);
push('profile.rankLabel', [cap(prof.rank_family), roman(prof.rank_level)].filter(Boolean).join(' · '), FIX.rankLabel);
push('profile.avatar', prof.avatar_url && prof.avatar_url.includes('/avatars/') ? 'set' : 'missing', FIX.avatar);

// ── report ──
let match = 0, sanctioned = 0, bad = 0;
const pad = (s, n) => String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s).padEnd(n);
console.log('\n  FIELD                              LIVE                                          VERDICT');
console.log('  ' + '─'.repeat(96));
for (const r of rows) {
  const ok = r.live === r.fixture;
  let verdict;
  if (ok) { verdict = '✓ match'; match++; }
  else if (r.sanctioned) { verdict = `⚠ sanctioned (live=${JSON.stringify(r.live)} vs fixture=${JSON.stringify(r.fixture)})`; sanctioned++; }
  else { verdict = `✗ DIFF  live=${JSON.stringify(r.live)}  fixture=${JSON.stringify(r.fixture)}`; bad++; }
  console.log(`  ${pad(r.label, 34)} ${pad(ok || r.sanctioned ? r.live : '‼ ' + r.live, 45)} ${verdict}`);
}
console.log('  ' + '─'.repeat(96));
console.log(`\n  SUMMARY: ${match} match · ${sanctioned} sanctioned (live-derived) · ${bad} unexpected diff${bad === 1 ? '' : 's'}\n`);
process.exit(bad === 0 ? 0 : 1);
