// Phase 3 RLS proof — the WRITE path is owner-scoped. Signed in as the demo athlete, every attempt to
// write a row owned by SOMEONE ELSE must be rejected by the `with check (athlete_id = auth.uid())`
// policy. Proves a logged-in user cannot forge workouts/PRs/timeline into another athlete's history.
//
//   SB_EMAIL=… SB_PASS=… node supabase/seed/rls-write-check.mjs
import { signedInClient } from './_client.mjs';

const FOREIGN = '00000000-0000-0000-0000-0000000000ff'; // a uid that is not us
const fails = [];
const created = [];

const { sb, uid } = await signedInClient();

/** A write is correctly blocked if it errors OR returns no row (RLS filtered it out). */
async function mustBlock(label, table, row) {
  const { data, error } = await sb.from(table).insert(row).select('id');
  const inserted = data?.[0]?.id;
  if (inserted) created.push({ table, id: inserted }); // shouldn't happen; track for cleanup
  const blocked = !!error || !inserted;
  if (!blocked) fails.push(label);
  console.log(`  ${blocked ? '✓ blocked' : '✗ LEAKED'}  ${label}${error ? `  (${error.code ?? 'err'})` : ''}`);
}

console.log(`\n  signed in as ${uid} — attempting foreign-owned writes:\n`);
await mustBlock('insert workout with foreign athlete_id', 'workouts', {
  athlete_id: FOREIGN, workout_name: 'forged', activity_type: 'strength', state: 'saved',
});
await mustBlock('insert personal_record with foreign athlete_id', 'personal_records', {
  athlete_id: FOREIGN, exercise: 'Forged Lift', measure_kind: 'load', load_value: 999, load_unit: 'lb',
});
await mustBlock('insert timeline_event with foreign athlete_id', 'timeline_events', {
  athlete_id: FOREIGN, event_type: 'ACCOMPLISHMENT', object_name: 'forged PR',
});

// Safety: undo anything that leaked (a real leak would fail the run regardless).
for (const c of created) await sb.from(c.table).delete().eq('id', c.id);

console.log(`\n  ${fails.length === 0 ? 'PASS — RLS blocks all cross-user writes' : `FAIL — ${fails.length} write(s) leaked`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
