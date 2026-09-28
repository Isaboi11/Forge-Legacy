import type { RangeKey } from '@/domain/admin/series';

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
  range: RangeKey;
  days: number;
  /** The ONE dashboard clock (`dashboardTz()`), for every day bucket. */
  tz: string;
  /** Cross-page links: an Overview tile opens Revenue; a user card opens that user's contact. */
  go: (page: PageKey, arg?: string) => void;
  /** An argument passed by `go` (e.g. a user id for the Users page, a contact id for Contacts). */
  arg?: string;
}

export const NAV: { group: string; items: { key: PageKey; label: string; ranged: boolean }[] }[] = [
  {
    group: 'Business',
    items: [
      { key: 'overview', label: 'Overview', ranged: true },
      { key: 'revenue', label: 'Revenue', ranged: true },
      { key: 'users', label: 'Users & plans', ranged: false },
      { key: 'ai', label: 'AI usage', ranged: true },
      { key: 'appstore', label: 'App Store', ranged: true },
    ],
  },
  { group: 'Product', items: [{ key: 'usage', label: 'Usage', ranged: true }] },
  {
    group: 'Operations',
    items: [
      { key: 'bugs', label: 'Bugs', ranged: true },
      { key: 'moderation', label: 'Moderation', ranged: false },
    ],
  },
  {
    group: 'Relationships',
    items: [
      { key: 'contacts', label: 'Contacts', ranged: false },
      { key: 'documents', label: 'Documents', ranged: false },
    ],
  },
];

export const PAGE_KEYS: PageKey[] = NAV.flatMap((g) => g.items.map((i) => i.key));

export function isPageKey(v: unknown): v is PageKey {
  return typeof v === 'string' && (PAGE_KEYS as string[]).includes(v);
}
