import { createContext, useContext } from 'react';

import type { RangeKey } from '@/domain/admin/briefing';

/**
 * The phone CRM's shared state (`Forge CRM Phone.dc.html`). One context, owned by `PhoneShell`, so the
 * tabs, the full-screen overlays and the bottom sheets can hand work to each other the way the design does:
 * a to-do on Today opens a bug on the Bugs tab; the Filter sheet edits the Bugs list; Save in the Log sheet
 * refreshes the contact behind it.
 */

export type PhoneTab = 'today' | 'money' | 'bugs' | 'people' | 'more';

export const TAB_NAME: Record<PhoneTab, string> = { today: 'Today', money: 'Money', bugs: 'Bugs', people: 'People', more: 'More' };

/** Full-screen pages that slide over a tab (and over the tab bar). Each tab keeps its own stack. */
export type OverlayKind = 'bug' | 'report' | 'crash' | 'contact' | 'contactEdit' | 'user' | 'video';

export interface Overlay {
  kind: OverlayKind;
  /** Bug uuid, report/crash origin, contact uuid, athlete uuid, or a Social video uuid. */
  id: string;
  /** The tab the overlay was opened FROM — the back button says "‹ Today" when a to-do opened it. */
  from?: PhoneTab;
}

export type SheetKind = 'bugFilter' | 'userFilter' | 'newBug' | 'log' | 'docPick' | 'docConfirm' | 'newIdea';

export interface Sheet {
  kind: SheetKind;
  /** e.g. { contactId } for Log, { file } for docConfirm. */
  params?: Record<string, unknown>;
}

export interface BugFilter {
  status: 'active' | 'open' | 'in_progress' | 'fixed' | 'wont_fix' | 'all';
  severity: 'critical' | 'high' | 'medium' | 'low' | null;
  source: 'Supabase' | 'Sentry' | 'TestFlight' | 'App Store' | null;
  area: string | null;
}

export const DEFAULT_BUG_FILTER: BugFilter = { status: 'active', severity: null, source: null, area: null };

export type MoreView = 'root' | 'social' | 'content' | 'playbook' | 'appstore' | 'usage' | 'moderation' | 'surveys' | 'documents';

export interface PhoneCtx {
  tab: PhoneTab;
  /** Switch tab. `clear` closes any page left open on that tab (a to-do must land on the list, not a stale page). */
  setTab: (t: PhoneTab, opts?: { clear?: boolean }) => void;

  /** Top overlay of each tab's stack (null = the tab's list is showing). */
  overlayOf: (t: PhoneTab) => Overlay | null;
  /** Push an overlay on a tab (defaults to the current tab) and switch to it. Opened FROM another tab, it
      replaces that tab's stack, and its back button returns to the tab it came from. */
  open: (o: Overlay, onTab?: PhoneTab) => void;
  /** Pop the current tab's top overlay (to the tab it came from, when it came from another). */
  back: () => void;

  sheet: Sheet | null;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;

  toast: (msg: string) => void;

  /** Browser says there is no connection. Numbers stay; saving is paused (the design's offline state). */
  offline: boolean;
  /** When the data on screen was last loaded — "Updated 2 min ago". */
  updatedAt: number;
  /** Pull-to-refresh and every save call this: bumps `stamp`, which every query lists in its deps. */
  refresh: () => void;
  stamp: number;
  /** Queries call this when they load, so "Updated …" is honest. */
  markLoaded: () => void;

  range: RangeKey;
  setRange: (r: RangeKey) => void;

  bugFilter: BugFilter;
  setBugFilter: (f: BugFilter) => void;
  /** Bugs tab segment: Board / Reports / Crashes. */
  bugSeg: 'board' | 'reports' | 'crashes';
  setBugSeg: (s: 'board' | 'reports' | 'crashes') => void;

  moneySeg: 'revenue' | 'users' | 'ai';
  setMoneySeg: (s: 'revenue' | 'users' | 'ai') => void;
  /** Users & plans list filter (admin_billing_list filter key). */
  userFilter: string;
  setUserFilter: (f: string) => void;

  contactFilter: string;
  setContactFilter: (f: string) => void;

  moreView: MoreView;
  setMoreView: (v: MoreView) => void;

  /** Leave the CRM (the design's "Back to the app"). */
  exit: () => void;
}

export const PhoneContext = createContext<PhoneCtx | null>(null);

export function usePhone(): PhoneCtx {
  const ctx = useContext(PhoneContext);
  if (!ctx) throw new Error('usePhone() outside PhoneShell');
  return ctx;
}
