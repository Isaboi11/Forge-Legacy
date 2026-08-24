// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CONSENT PROBE — what does an unrequested squad membership actually hand over?
//
//   node supabase/seed/_with-qa-env.mjs qa-consent-probe.mjs
//
// ══ THE FINDING THIS MEASURES ══
//
// `approve_squad_join_request(p_squad, p_user)` (0052) checks three things: that the caller owns the
// squad, that the target is not already a member, and that the roster has room. It never checks that a
// request exists. So an owner can insert any athlete into their squad, and the two-account roundtrip
// proved they can: zero rows in `squad_join_requests`, `{"ok":true,"already":false}` back, membership
// created.
//
// "They were added to a squad" is only a defect if being in a squad hands something over. It does:
// `profiles.visibility.training` defaults to `squads` (0086), so Live Now is shown to the people you
// train alongside — and this is a route to becoming one of those people without agreeing to it. This
// script measures that end to end rather than arguing it from the schema.
//
// It creates one squad, adds B without a request, has B start a session, reads what A can see, and then
// deletes the squad. B's membership dies with it (cascade), so nothing is left standing.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const client = () =>
  createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function signIn(label, email, password) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label}: ${error.message}`);
  return { label, sb, uid: data.user.id };
}

const A = await signIn('owner', process.env.SB_EMAIL, process.env.SB_PASS);
const B = await signIn('target', process.env.SB2_EMAIL, process.env.SB2_PASS);
console.log('signed in as both\n');

// The state B is in before any of this, so the probe can put it back.
const before = await B.sb.from('profiles').select('visibility, training_since, training_label').eq('id', B.uid).maybeSingle();
const priorVis = before.data?.visibility ?? null;
console.log(`B's visibility before  : ${JSON.stringify(priorVis)}`);
console.log(`B's training.* setting : ${priorVis?.training ?? '(unset — the default is "squads")'}\n`);

const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
let squadId = null;
let added = false;

try {
  const { data, error } = await A.sb.rpc('create_squad', {
    p_name: `QA Consent ${stamp}`,
    p_description: 'Consent probe. Deleted at the end of this script.',
    p_privacy: 'private',
    p_crest: 'swords',
    p_motto: null,
    p_goal: null,
    p_category: null,
  });
  if (error) throw error;
  const row = typeof data === 'string' ? JSON.parse(data) : data;
  squadId = row?.squad_id ?? null;
  console.log(`1. A created a private squad B has never heard of.`);

  const asked = await A.sb.from('squad_join_requests').select('user_id').eq('squad_id', squadId);
  console.log(`2. Requests to join it: ${(asked.data ?? []).length}.`);

  const app = await A.sb.rpc('approve_squad_join_request', { p_squad: squadId, p_user: B.uid });
  console.log(`3. A "approved" B anyway: ${JSON.stringify(app.data)}${app.error ? ` (error: ${app.error.message})` : ''}`);

  const mem = await B.sb.from('squad_members').select('user_id, role, joined_at').eq('squad_id', squadId).eq('user_id', B.uid).maybeSingle();
  added = !!mem.data;
  console.log(`4. Is B a member? ${added ? 'YES' : 'no'}${added ? ` (role ${mem.data.role})` : ''}\n`);

  if (!added) {
    console.log('✅ The RPC refused. Nothing further to measure.');
  } else {
    // ── What that membership is worth, measured from A's session ────────────────────────────────
    console.log('── What A can now see that they could not before ──────────────────────────');

    // Live Now rides `visibility.training`, whose default is `squads`.
    await B.sb.rpc('set_training_status', { p_active: true, p_label: 'Private Session' });
    const now = await A.sb.rpc('training_now');
    const seen = (now.data ?? []).find((r) => r.user_id === B.uid);
    console.log(`   Live Now              : ${seen ? `VISIBLE — "${seen.label}" via ${seen.squad_name ?? seen.source}` : 'not visible'}`);

    const one = await A.sb.rpc('athlete_training_status', { p_athlete: B.uid });
    console.log(`   B's training status   : ${one.data?.training ? `VISIBLE — started ${one.data.started_at}` : 'not visible'}`);

    // The squad-mate roster read every squad screen makes.
    const roster = await A.sb.from('squad_members').select('user_id, profiles(name, avatar_url)').eq('squad_id', squadId);
    console.log(`   Roster                : ${(roster.data ?? []).map((m) => m.profiles?.name ?? m.user_id).join(', ')}`);

    // Would B be told any of this happened?
    const nB = await B.sb.rpc('notification_feed', { p_limit: 30 });
    const told = (nB.data ?? []).filter((x) => x.squad_id === squadId);
    console.log(`   Is B told?            : ${told.length ? told.map((t) => t.kind).join(', ') : 'NO NOTIFICATION OF ANY KIND'}`);

    // Whether B can get out again — the thing that decides how bad this is.
    const out = await B.sb.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', B.uid);
    const gone = await B.sb.from('squad_members').select('user_id').eq('squad_id', squadId).eq('user_id', B.uid).maybeSingle();
    console.log(`   Can B leave?          : ${!gone.data ? 'yes — leaving works normally' : `NO — ${out.error?.message ?? 'still a member'}`}`);
  }
} finally {
  await B.sb.rpc('set_training_status', { p_active: false, p_label: null });
  if (squadId) {
    await A.sb.from('squads').delete().eq('id', squadId);
    const left = await A.sb.from('squads').select('id').eq('id', squadId).maybeSingle();
    console.log(`\nCleanup: probe squad ${left.data ? '⚠ STILL PRESENT' : 'deleted'}.`);
  }
}
