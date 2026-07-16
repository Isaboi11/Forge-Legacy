// Verify: schema applied · demo user signs in · RLS lets self read its profile · rank seed present.
import { signedInClient } from './_client.mjs';

const { sb, uid } = await signedInClient();
console.log('✓ signed in · uid =', uid);

const { data: prof, error: perr } = await sb.from('profiles').select('*').eq('id', uid).single();
console.log(perr ? '✗ profiles: ' + perr.message : '✓ profiles row (trigger-created): ' + JSON.stringify({ name: prof.name, handle: prof.handle }));

const { data: ranks, error: rerr } = await sb.from('rank_families').select('family').order('sort_order');
console.log(rerr ? '✗ rank_families: ' + rerr.message : '✓ rank_families: ' + ranks.map((r) => r.family).join(', '));

// prove the spine tables exist + are queryable (empty is fine)
for (const t of ['chapters', 'workouts', 'personal_records', 'timeline_events']) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
  console.log(error ? `✗ ${t}: ${error.message}` : `✓ ${t} exists · rows=${count}`);
}
