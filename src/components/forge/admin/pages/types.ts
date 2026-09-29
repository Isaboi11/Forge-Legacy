import type { RangeKey } from '@/domain/admin/briefing';

/** Every page of the CRM. The order here is the order of the sidebar. */
export type PageKey =
  | 'overview'
  | 'revenue'
  | 'users'
  | 'ai'
  | 'appstore'
  | 'usage'
  | 'bugs'
  | 'moderation'
  | 'contacts'
  | 'documents';

export interface PageProps {
  /** The design's range keys: 7D / 30D / 90D / 1Y. Only the RANGE_PAGES show the control. */
  range: RangeKey;
  days: number;
  /** The ONE dashboard clock (`dashboardTz()`), for every day bucket. */
  tz: string;
  /** Cross-page links. `arg` is a user id (users), a contact id or kind (contacts), or 'reports'/'crashes' (bugs). */
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
      { key: 'documents', label: 'Documents' },
    ],
  },
];

/** Pages that show the 7D / 30D / 90D / 1Y control (the design's RANGE_PAGES). */
export const RANGE_PAGES: PageKey[] = ['overview', 'revenue', 'ai', 'appstore', 'usage'];

export const PAGE_KEYS: PageKey[] = NAV.flatMap((g) => g.items.map((i) => i.key));

export function isPageKey(v: unknown): v is PageKey {
  return typeof v === 'string' && (PAGE_KEYS as string[]).includes(v);
}
