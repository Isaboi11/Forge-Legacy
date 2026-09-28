import { supabase } from '@/lib/supabase';
import { callRpc } from '@/data/admin-live';
import {
  guessCategory,
  storagePathFor,
  titleFromFile,
  type BugSeverity,
  type BugStatus,
  type ContactKind,
  type ContactStage,
  type DocCategory,
} from '@/domain/admin/crm-core';

/**
 * The Business CRM's read and write path (migration 0236, Admin-Analytics-Amendment-002).
 *
 * Same boundary rules as `admin-live.ts`, and the same `callRpc`: authorization is NOT here — every
 * `admin_*` function opens with `admin_guard()` and raises 42501 for anyone else. The shapes below are
 * the jsonb the functions return, kept in their snake_case: they are read in one place (the CRM screen)
 * and a mapping layer would be a second copy of every field to keep in step with the SQL.
 */

// ── Revenue / tiers / AI / waitlist / App Store ─────────────────────────────

export interface Revenue {
  days: number;
  include_sandbox: boolean;
  gross: number;
  gross_prev: number;
  gross_all: number;
  refunds: number;
  series: { d: string; gross: number }[];
  by_product: { product: string; gross: number; events: number }[];
  mrr: number;
  paying: { total: number; premium_ai: number; premium: number; annual: number; monthly: number };
  trials_active: number;
  trial_starts: number;
  trial_conversions: number;
  new_paid: number;
  churned: number;
  paywall_viewers: number;
  paywall_buyers: number;
  athletes_total: number;
  ever_paid: number;
  sandbox_events: number;
  last_event_at: string | null;
}

export interface Tiers {
  athletes_total: number;
  default_tier: 'FREE' | 'PREMIUM' | null;
  free: number;
  premium: number;
  premium_ai: number;
  ai_without_premium: number;
  by_kind: { kind: string; n: number }[];
  founder_seats: number;
  comped_testers: number;
  on_default: number;
}

export interface AiUsage {
  days: number;
  calls: number;
  credits: number;
  cost_usd: number;
  cost_prev: number;
  cost_all: number;
  athletes: number;
  uncharged: number;
  tokens: { input: number; output: number; cache_read: number; cache_write: number };
  series: { d: string; cost: number; calls: number }[];
  by_action: { action: string; calls: number; credits: number; cost_usd: number; athletes: number }[];
  by_model: { model: string; calls: number; cost_usd: number }[];
  per_athlete: { median: number; p90: number; max: number };
  credits_per_period: number | null;
  at_allowance: number;
}

export interface Waitlist {
  total: number;
  invited: number;
  in_window: number;
  by_source: { source: string; n: number }[];
  series: { d: string; n: number }[];
}

export interface AppStore {
  days: number;
  last_sync: { ran_at: string; ok: boolean; message: string | null } | null;
  last_ok_at: string | null;
  rating: { avg: number | null; count: number | null; at: string } | null;
  downloads: number;
  downloads_prev: number;
  downloads_all: number;
  redownloads: number;
  updates: number;
  proceeds_usd: number;
  series: { d: string; downloads: number }[];
  by_country: { country: string; n: number }[];
  reviews: { id: string; rating: number; title: string | null; body: string | null; nickname: string | null; territory: string | null; created_at: string }[];
}

export const fetchRevenue = (days: number, tz: string, includeSandbox: boolean) =>
  callRpc<Revenue>('admin_revenue', { p_days: days, p_tz: tz, p_include_sandbox: includeSandbox });
export const fetchTiers = () => callRpc<Tiers>('admin_tiers', {});
export const fetchAiUsage = (days: number, tz: string) => callRpc<AiUsage>('admin_ai_usage', { p_days: days, p_tz: tz });
export const fetchWaitlist = (days: number, tz: string) => callRpc<Waitlist>('admin_waitlist', { p_days: days, p_tz: tz });
export const fetchAppStore = (days: number) => callRpc<AppStore>('admin_appstore', { p_days: days });

export interface AscSyncResult {
  ok: boolean;
  configured: boolean;
  missing?: string[];
  days_fetched?: number;
  downloads?: number;
  reviews?: number;
  rating?: { avg: number | null; count: number | null } | null;
  errors?: string[];
}

/**
 * Runs the `asc-sync` Edge Function (AA-D17). A function that is not deployed yet is a real, lasting
 * state here (Edge Functions are pasted into the dashboard by hand), so it gets its own sentence.
 */
export async function runAscSync(days = 14): Promise<AscSyncResult> {
  const { data, error } = await supabase.functions.invoke('asc-sync', { body: { days } });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 404) throw new Error('The asc-sync function is not deployed yet — see Docs/App-Store-Connect-Key-Setup.md.');
    if (status === 403) throw new Error('Not authorized.');
    throw new Error(error.message || 'App Store sync failed.');
  }
  return data as AscSyncResult;
}

// ── Bugs ────────────────────────────────────────────────────────────────────

export interface Bug {
  id: string;
  source: 'qa' | 'manual';
  report: string | null;
  ref: string | null;
  title: string;
  severity: BugSeverity;
  area: string | null;
  round: number | null;
  detail: string | null;
  status: BugStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface BugBoard {
  rows: Bug[];
  counts: {
    total: number;
    open: number;
    in_progress: number;
    fixed: number;
    wont_fix: number;
    active_critical: number;
    active_high: number;
    active_medium: number;
    active_low: number;
    fixed_7d: number;
  };
  areas: { area: string; n: number }[];
  feedback_new: number;
  errors_new: number;
}

export const fetchBugs = (status: string | null, severity: string | null, q: string | null) =>
  callRpc<BugBoard>('admin_bugs', { p_status: status, p_severity: severity, p_q: q, p_limit: 1000 });
/** Counts only (one row fetched) — for the sidebar badge, which must not pull the whole board. */
export const fetchBugCounts = async () =>
  (await callRpc<BugBoard>('admin_bugs', { p_status: 'active', p_severity: null, p_q: null, p_limit: 1 })).counts;
export const saveBug = (id: string | null, patch: Partial<Pick<Bug, 'title' | 'severity' | 'area' | 'detail' | 'status' | 'note'>>) =>
  callRpc<string>('admin_bug_save', { p_id: id, p_patch: patch });
export const deleteBug = (id: string) => callRpc<void>('admin_bug_delete', { p_id: id });
/** "Track this" — copies a feedback row or a crash group onto the board. Idempotent. */
export const trackBug = (kind: 'feedback' | 'error', ref: string) => callRpc<string>('admin_bug_track', { p_kind: kind, p_ref: ref });

// ── People (AA-D12) ─────────────────────────────────────────────────────────

export interface UserHit {
  id: string;
  name: string | null;
  handle: string | null;
  created_at: string;
  tier: 'FREE' | 'PREMIUM';
  premium_ai: boolean;
  paying: boolean;
}

/** The ceiling of what the operator may see about one athlete (AA-D12). Nothing about training. */
export interface UserCard {
  account: { id: string; name: string | null; handle: string | null; created_at: string; named: boolean };
  billing: {
    tier: 'FREE' | 'PREMIUM';
    premium_kind: string | null;
    premium_until: string | null;
    premium_ai: boolean;
    premium_ai_until: string | null;
    founder_seat: number | null;
    comped_tester: boolean;
    subscriptions: { product_id: string; period_type: string | null; expires_at: string | null; ever_paid: boolean; updated_at: string; environment: string }[];
    events: { type: string; product: string | null; received_at: string; price: number | null; environment: string | null; period_type: string | null }[];
    paid_total: number;
  };
  ai: {
    periods: { period: string; spent: number; allowance: number }[];
    by_action: { action: string; calls: number; credits: number; cost_usd: number }[];
    cost_all: number;
  };
  support: {
    feedback: { id: number; kind: string; body: string; screen: string | null; status: string; created_at: string }[];
    errors: number;
    error_bugs: number;
  };
  business: {
    trainer: { status: string; seat_cap: number; granted_at: string } | null;
    trainer_clients: number;
    contact_id: string | null;
  };
}

export interface BillingRow {
  id: string;
  name: string | null;
  handle: string | null;
  created_at: string;
  tier: 'FREE' | 'PREMIUM';
  premium_kind: string | null;
  premium_ai: boolean;
  founder_seat: number | null;
  comped: boolean;
  product: string | null;
  period_type: string | null;
  expires_at: string | null;
  since: string | null;
}

export type BillingFilter = 'paying' | 'trial' | 'premium_ai' | 'founder' | 'comped' | 'grant' | 'lapsed' | 'free';

export const searchUsers = (q: string) => callRpc<UserHit[]>('admin_user_search', { p_q: q, p_limit: 25 });
export const fetchUserCard = (id: string) => callRpc<UserCard>('admin_user_card', { p_id: id });
export const fetchBillingList = (filter: BillingFilter) => callRpc<BillingRow[]>('admin_billing_list', { p_filter: filter, p_limit: 500 });

// ── Contacts (AA-D15) ───────────────────────────────────────────────────────

export interface Contact {
  id: string;
  kind: ContactKind;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  stage: ContactStage;
  tags: string[];
  notes: string | null;
  athlete_id: string | null;
  athlete_handle: string | null;
  source: 'manual' | 'testflight_form' | 'trainer_seat';
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
  activity: number;
  open_tasks: number;
  last_touch: string | null;
}

export interface ContactList {
  rows: Contact[];
  counts: { total: number; tester: number; trainer: number; business: number; user: number; other: number; follow_up_due: number };
}

export interface Activity {
  id: string;
  kind: 'note' | 'call' | 'email' | 'meeting' | 'task';
  body: string;
  due_on: string | null;
  done_at: string | null;
  created_at: string;
}

export type ContactPatch = Partial<{
  kind: ContactKind;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  stage: ContactStage;
  tags: string[];
  notes: string;
  athlete_id: string | null;
  next_follow_up: string | null;
}>;

export const fetchContacts = (kind: string | null, q: string | null) => callRpc<ContactList>('admin_contacts', { p_kind: kind, p_q: q });
export const saveContact = (id: string | null, patch: ContactPatch) => callRpc<string>('admin_contact_save', { p_id: id, p_patch: patch });
export const deleteContact = (id: string) => callRpc<void>('admin_contact_delete', { p_id: id });
export const fetchActivity = (contactId: string) => callRpc<Activity[]>('admin_contact_activity', { p_contact: contactId });
export const logActivity = (contactId: string, kind: Activity['kind'], body: string, due: string | null) =>
  callRpc<string>('admin_activity_log', { p_contact: contactId, p_kind: kind, p_body: body, p_due: due });
export const setActivityDone = (id: string, done: boolean) => callRpc<void>('admin_activity_done', { p_id: id, p_done: done });

// ── Documents (AA-D16) ──────────────────────────────────────────────────────

const DOCS_BUCKET = 'ops-docs';
/** Five minutes (AA-D16): long enough to open a file, short enough that a copied link dies. */
const SIGN_SECONDS = 300;

export interface Doc {
  id: string;
  title: string;
  category: DocCategory;
  storage_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocList {
  rows: Doc[];
  counts: Partial<Record<DocCategory, number>>;
  bytes: number;
}

export const fetchDocuments = (category: string | null, q: string | null) =>
  callRpc<DocList>('admin_documents', { p_category: category, p_q: q });
export const saveDocument = (id: string | null, patch: Partial<Pick<Doc, 'title' | 'category' | 'url' | 'tags' | 'notes'>>) =>
  callRpc<string>('admin_document_save', { p_id: id, p_patch: patch });

/** Row first, then the file — see `admin_document_delete`'s comment for why that order. */
export async function deleteDocument(id: string): Promise<void> {
  const path = await callRpc<string | null>('admin_document_delete', { p_id: id });
  if (path) await supabase.storage.from(DOCS_BUCKET).remove([path]);
}

/** A short-lived link to a private file. Never stored, never shared (AA-D16). */
export async function documentLink(doc: Doc): Promise<string> {
  if (doc.url) return doc.url;
  if (!doc.storage_path) throw new Error('This document has no file.');
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(doc.storage_path, SIGN_SECONDS);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not open the file.');
  return data.signedUrl;
}

export interface UploadOutcome {
  uploaded: number;
  failed: { name: string; reason: string }[];
}

/**
 * Pick one or more files and upload each to the private bucket, then record it.
 *
 * `expo-document-picker` is loaded INSIDE the tap, never at the top of the file — it is a native
 * module, and a top-level import would crash any older build this JavaScript reaches by OTA at launch
 * (the `pick-text-file.ts` rule). On the web the picker hands back a real `File`, which uploads as-is.
 */
export async function pickAndUploadDocuments(category: DocCategory | 'auto'): Promise<UploadOutcome | null> {
  let picker: typeof import('expo-document-picker');
  try {
    picker = await import('expo-document-picker');
  } catch {
    throw new Error('File upload needs the next app build — use the web dashboard for now.');
  }
  const res = await picker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return null;

  const out: UploadOutcome = { uploaded: 0, failed: [] };
  for (const asset of res.assets) {
    try {
      const body: Blob = (asset as { file?: File }).file ?? (await (await fetch(asset.uri)).blob());
      const cat: DocCategory = category === 'auto' ? guessCategory(asset.name) : category;
      const rand = Math.random().toString(36).slice(2, 10);
      const path = storagePathFor(cat, asset.name, new Date(), rand);
      const mime = asset.mimeType || body.type || 'application/octet-stream';
      const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, body, { contentType: mime, upsert: false });
      if (error) throw new Error(error.message);
      await callRpc<string>('admin_document_save', {
        p_id: null,
        p_patch: { title: titleFromFile(asset.name), category: cat, storage_path: path, mime, size_bytes: asset.size ?? body.size },
      });
      out.uploaded++;
    } catch (e) {
      out.failed.push({ name: asset.name, reason: e instanceof Error ? e.message : 'upload failed' });
    }
  }
  return out;
}
