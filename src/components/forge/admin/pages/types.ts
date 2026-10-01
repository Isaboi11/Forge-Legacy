import type { RangeKey } from '@/domain/admin/briefing';

/** Every page of the CRM. The order here is the order of the sidebar. */
export type PageKey =
  | 'overview'
  | 'revenue'
  | 'users'
  | 'ai'
  | 'appstore'
  | 'usage'
  | 'social'
  | 'content'
  | 'playbook'
  | 'bugs'
  | 'moderation'
  | 'contacts'
  | 'surveys'
  | 'documents';

export interface PageProps {
  /** The design's range keys: 7D / 30D / 90D / 1Y. Only the RANGE_PAGES show the control. */
  range: RangeKey;
  days: number;
  /** The ONE dashboard clock (`dashboardTz()`), for every day bucket. */
  tz: string;
  /** Cross-page links. `arg` is a user id (users), a contact id or kind (contacts), a survey id (surveys), 'reports'/'crashes' (bugs),
      a video id (content), or 'connected-<platform>' / 'failed-<platform>' when a platform's sign-in sends the owner back (social). */
  go: (page: PageKey, arg?: string) => void;
  arg?: string;
}

export const NAV: { group: string; items: { key: PageKey; label: string }[] }[] = [
  {
    group: 'Business',
    items: [
      { key: 'overview', label: 'Overview' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'users', label: 'Users & plans' },
      { key: 'ai', label: 'AI usage' },
      { key: 'appstore', label: 'App Store' },
    ],
  },
  { group: 'Product', items: [{ key: 'usage', label: 'Usage' }] },
  // The owner's TikTok and Instagram (0247, AA-D25). "Marketing" is kept for a future ads section.
  {
    group: 'Social',
    items: [
      { key: 'social', label: 'Numbers' },
      { key: 'content', label: 'Content' },
      { key: 'playbook', label: 'Playbook' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { key: 'bugs', label: 'Bugs' },
      { key: 'moderation', label: 'Moderation' },
    ],
  },
  {
    group: 'Relationships',
    items: [
      { key: 'contacts', label: 'Contacts' },
      { key: 'surveys', label: 'Surveys' },
      { key: 'documents', label: 'Documents' },
    ],
  },
];

/** Pages that show the 7D / 30D / 90D / 1Y control (the design's RANGE_PAGES). */
export const RANGE_PAGES: PageKey[] = ['overview', 'revenue', 'ai', 'appstore', 'usage', 'social'];

export const PAGE_KEYS: PageKey[] = NAV.flatMap((g) => g.items.map((i) => i.key));

export function isPageKey(v: unknown): v is PageKey {
  return typeof v === 'string' && (PAGE_KEYS as string[]).includes(v);
}
