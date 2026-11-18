import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { supabase } from '@/lib/supabase';
import { requireUserId } from '@/lib/require-user-id';
import { shapeImportMisses, type ImportMiss } from '@/domain/program/import-miss';

/**
 * IM-5 — "Send this to Forge so we learn this format?" and the /admin queue behind it (migration 0275).
 *
 * The athlete's send is ONE rpc (`import_miss_send`) — the table has no client grant, the account is the server's
 * auth.uid(). A photo goes only when they ticked "include the photo": it is uploaded first to their own folder of
 * the PRIVATE `import-misses` bucket, and the row names it.
 *
 * ⚠ THE SEND NEVER THROWS, and an old database (0275 not applied) reads as `not_ready`, so the screen can say
 *   "not yet" instead of breaking the import the athlete is in the middle of.
 */

const BUCKET = 'import-misses';
const MISSING_FN = 'PGRST202';
const SIGN_SECONDS = 60 * 60;

export type SendOutcome = 'sent' | 'not_ready' | 'offline' | 'limit' | 'failed';

/** "1.0.0 · 01a1ed2c" — the store version says little (it is 1.0.0 on every OTA), the update id names the bundle. */
function appVersion(): string | null {
  const v = Constants.expoConfig?.version ?? null;
  let update: string | null = null;
  try {
    update = Updates.updateId ? Updates.updateId.slice(0, 8) : null;
  } catch {
    update = null;
  }
  return [v, update].filter(Boolean).join(' · ').slice(0, 40) || null;
}

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

async function uploadPhoto(uri: string): Promise<string | null> {
  const uid = await requireUserId();
  const res = await fetch(uri);
  if (!res.ok) return null;
  const bytes = await res.arrayBuffer();
  const png = res.headers.get('content-type')?.includes('png') ?? /\.png($|\?)/i.test(uri);
  const path = `${uid}/${randomId()}.${png ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: png ? 'image/png' : 'image/jpeg', upsert: false });
  return error ? null : path;
}

/**
 * Send one miss. `read` and `corrected` are the small JSON `import-miss.ts` builds; `photoUri` only when the athlete
 * ticked "include the photo".
 */
export async function sendImportMiss(input: {
  kind: 'paste' | 'photo';
  text: string | null;
  photoUri: string | null;
  read: unknown;
  corrected: unknown;
}): Promise<SendOutcome> {
  try {
    let photoPath: string | null = null;
    if (input.photoUri) {
      photoPath = await uploadPhoto(input.photoUri);
      /* The photo was asked for and did not go: send nothing rather than less than they agreed to look at. */
      if (!photoPath) return 'failed';
    }
    const { error } = await supabase.rpc('import_miss_send', {
      p_kind: input.kind,
      p_text: input.text,
      p_photo_path: photoPath,
      p_read: input.read,
      p_corrected: input.corrected ?? null,
      p_app_version: appVersion(),
    });
    if (!error) return 'sent';
    const e = error as { code?: string; message?: string };
    if (e.code === MISSING_FN) return 'not_ready';
    if (e.code === '54000') return 'limit';
    if (/network|fetch/i.test(e.message ?? '')) return 'offline';
    return 'failed';
  } catch (e) {
    return /network|fetch/i.test(e instanceof Error ? e.message : '') ? 'offline' : 'failed';
  }
}

// ── /admin ─────────────────────────────────────────────────────────────────────────────────────────

function adminError(e: unknown, fn: string): Error {
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === MISSING_FN) return new Error(`Migration 0275 has not been applied yet — ${fn} does not exist in the database.`);
  if (err?.code === '42501' || /not authorized/i.test(err?.message ?? '')) return new Error('Not authorized.');
  return new Error(err?.message ?? 'Unknown error');
}

export async function fetchImportMisses(includeResolved = false): Promise<ImportMiss[]> {
  const { data, error } = await supabase.rpc('admin_import_misses', { p_limit: 100, p_include_resolved: includeResolved });
  if (error) throw adminError(error, 'admin_import_misses');
  return shapeImportMisses(data);
}

export async function resolveImportMiss(id: string, resolution: string): Promise<void> {
  const { error } = await supabase.rpc('admin_import_miss_resolve', { p_id: id, p_resolution: resolution });
  if (error) throw adminError(error, 'admin_import_miss_resolve');
}

/** A link to a miss's photo that lasts an hour (the bucket is private; the policy allows operators only). */
export async function importMissPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_SECONDS);
  return error ? null : (data?.signedUrl ?? null);
}

/**
 * The bytes SQL cannot delete (0275 §2): photos of purged or account-deleted misses, removed here through the Storage
 * API with the operator's own session, then cleared — only the ones really gone. Returns how many were settled.
 */
export async function settleImportMissPhotos(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_import_miss_photo_debts');
  if (error) throw adminError(error, 'admin_import_miss_photo_debts');
  const paths = Array.isArray(data) ? (data as string[]) : [];
  if (!paths.length) return 0;
  await supabase.storage.from(BUCKET).remove(paths);
  const { data: n, error: e2 } = await supabase.rpc('admin_import_miss_photos_cleared', { p_paths: paths });
  if (e2) throw adminError(e2, 'admin_import_miss_photos_cleared');
  return typeof n === 'number' ? n : 0;
}
