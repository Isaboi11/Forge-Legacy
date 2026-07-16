// Upload a real avatar to the public `avatars` bucket and set profiles.avatar_url (Phase 3 follow-up).
// Runs as the signed-in demo user → owner-write on the bucket (storage RLS), self-write on profiles.
// Requires 0003_avatar.sql applied first (the avatar_url column).
//
//   SB_EMAIL=… SB_PASS=… SB_AVATAR_FILE=./me.jpg node supabase/seed/upload-avatar.mjs
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { signedInClient } from './_client.mjs';

const file = process.env.SB_AVATAR_FILE ?? process.argv[2];
if (!file) throw new Error('pass the image path via SB_AVATAR_FILE or argv[1]');

const ext = extname(file).toLowerCase() || '.jpg';
const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
const bytes = readFileSync(file);

const { sb, uid } = await signedInClient();
const objectPath = `${uid}/avatar${ext}`; // per-user folder → the owner-write storage policy scopes on it

const { error: ue } = await sb.storage.from('avatars').upload(objectPath, bytes, { contentType, upsert: true });
if (ue) throw new Error('upload failed: ' + ue.message);

const { data: pub } = sb.storage.from('avatars').getPublicUrl(objectPath);
const publicUrl = pub.publicUrl;

const { error: pe } = await sb.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', uid);
if (pe) throw new Error('profile update failed (is 0003_avatar.sql applied?): ' + pe.message);

console.log(`✓ uploaded ${file} → avatars/${objectPath}`);
console.log(`✓ profiles.avatar_url = ${publicUrl}`);
