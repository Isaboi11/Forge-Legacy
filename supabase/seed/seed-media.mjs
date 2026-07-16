// Seed the media layer (Phase 3 follow-up): upload the 485 deadlift clip + poster to the public
// `media` bucket, then upsert the real Deadlift video PIN into the pins table. Runs as the signed-in
// demo user (owner-write). Requires 0005_pins.sql + 0006_storage_media.sql applied. Idempotent.
//
//   SB_EMAIL=… SB_PASS=… node supabase/seed/seed-media.mjs
import { readFileSync } from 'node:fs';
import { signedInClient } from './_client.mjs';

const VIDEO = process.env.SB_PIN_VIDEO ?? 'assets/images/media/pr-deadlift-485.mp4';
const POSTER = process.env.SB_PIN_POSTER ?? 'assets/images/media/pr-deadlift-485.png';

const { sb, uid } = await signedInClient();

async function upload(localPath, objectName, contentType) {
  const bytes = readFileSync(localPath);
  const path = `${uid}/${objectName}`;
  const { error } = await sb.storage.from('media').upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`upload ${objectName} failed: ${error.message}`);
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
}

const videoUrl = await upload(VIDEO, 'pr-deadlift-485.mp4', 'video/mp4');
const posterUrl = await upload(POSTER, 'pr-deadlift-485.png', 'image/png');
console.log('✓ uploaded clip + poster to media bucket');

// soft-ref the Deadlift PR, if present
const { data: pr } = await sb
  .from('personal_records')
  .select('id')
  .eq('athlete_id', uid)
  .eq('exercise', 'Deadlift')
  .eq('measure_kind', 'load')
  .order('load_value', { ascending: false })
  .limit(1);

// idempotent: one real video pin (the record lift)
await sb.from('pins').delete().eq('athlete_id', uid);
const { error: pe } = await sb.from('pins').insert({
  athlete_id: uid,
  kind: 'record',
  title: '485 lb Deadlift',
  subtitle: 'Personal record',
  media_url: videoUrl,
  poster_url: posterUrl,
  is_video: true,
  ref_id: pr?.[0]?.id ?? null,
  position: 0,
});
if (pe) throw new Error('pin insert failed (are 0005/0006 applied?): ' + pe.message);

console.log('✓ pinned: 485 lb Deadlift (video) →', videoUrl);
