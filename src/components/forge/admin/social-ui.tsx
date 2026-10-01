import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { Chip, Row } from '@/components/forge/admin/crm-ui';
import { fetchSocial } from '@/data/social-live';
import { PLATFORMS, platformShort, type Platform, type PlatformFilter, type SocialData, type WeekCount } from '@/domain/admin/social-core';
import { useQuery } from '@/lib/useQuery';

/**
 * Pieces the three Social pages share (Admin-Analytics-Amendment-003). Same rules as `crm-ui`: colours
 * only from `useCrm().c`, information on the ground under a label and a hairline, bronze for what is
 * selected and the one primary action.
 */

/**
 * The platform chip is ONE choice across Numbers and Content (AA-D25: a filter, never a page per
 * platform), so it is remembered for the visit rather than reset each time the page changes.
 */
let rememberedPlatform: PlatformFilter = 'all';

export function usePlatformFilter(): [PlatformFilter, (p: PlatformFilter) => void] {
  const [p, setP] = useState<PlatformFilter>(rememberedPlatform);
  const set = useCallback((next: PlatformFilter) => {
    rememberedPlatform = next;
    setP(next);
  }, []);
  return [p, set];
}

export function PlatformChips({ value, onChange }: { value: PlatformFilter; onChange: (p: PlatformFilter) => void }) {
  return (
    <Row gap={8}>
      <Chip label="All" on={value === 'all'} onPress={() => onChange('all')} />
      {PLATFORMS.map((p) => (
        <Chip key={p.key} label={p.label} on={value === p.key} onPress={() => onChange(p.key)} />
      ))}
    </Row>
  );
}

/**
 * The section's one read. `at` is when it came back, so "synced 3 hours ago" and "the last 30 days" are
 * judged against that moment rather than a clock read during render.
 */
export function useSocial(stamp: number = 0) {
  const q = useQuery(async () => ({ d: await fetchSocial(), at: Date.now() }), [stamp]);
  return { data: (q.data?.d ?? null) as SocialData | null, at: q.data?.at ?? 0, loading: q.loading, error: q.error, refetch: q.refetch };
}

/**
 * A labelled field that sits in a COLUMN. `Field` (crm-ui) is built for rows: its flex-basis of 0 gives it
 * no height when its parent stacks, and the next thing draws on top of it.
 */
export function StackField({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View style={{ gap: 6, minWidth: 0 }}>
      <Text style={{ fontSize: 12.5, color: c.ink2 }}>{label}</Text>
      {children}
    </View>
  );
}

/** The two-letter platform mark the calendar uses ("TT", "IG"). Text, not a logo. */
export function PlatformCode({ platform }: { platform: Platform }) {
  const { c } = useCrm();
  return (
    <View style={{ minWidth: 24, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: c.fieldBd, alignItems: 'center' }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: c.ink2 }}>{platformShort(platform)}</Text>
    </View>
  );
}

/** A small label + value pair under a posting ("48,200 / views"). */
export function MiniFig({ value, label }: { value: string; label: string }) {
  const { c } = useCrm();
  return (
    <View style={{ flexBasis: '30%', flexGrow: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: value === '—' ? c.ink3 : c.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 11.5, color: c.ink3 }}>{label}</Text>
    </View>
  );
}

/** A quiet tag: Keep / Retest / Kill, "needs tags". Colour never carries the meaning alone — the word does. */
export function Pill({ label, tone = 'brz' }: { label: string; tone?: 'brz' | 'good' | 'warn' | 'crit' | 'muted' }) {
  const { c } = useCrm();
  const map = {
    brz: [c.brz, c.brzTint, 'transparent'],
    good: [c.good, 'transparent', c.line],
    warn: [c.warn, c.warnTint, 'transparent'],
    crit: [c.crit, c.critTint, 'transparent'],
    muted: [c.ink2, c.track, 'transparent'],
  } as const;
  const [color, bg, bd] = map[tone];
  return (
    <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: bg, borderWidth: 1, borderColor: bd, justifyContent: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

export const verdictTone = { keep: 'good', retest: 'warn', kill: 'crit' } as const;
export const verdictLabel = { keep: 'Keep', retest: 'Retest', kill: 'Kill' } as const;

/** One goal line: a label, "1 posted · 2 scheduled of 4", and a bar whose lighter part is what is only planned. */
export function GoalBar({ label, text, solid, soft }: { label: string; text: React.ReactNode; solid: number; soft?: number }) {
  const { c } = useCrm();
  const a = Math.max(0, Math.min(100, solid));
  const b = Math.max(0, Math.min(100 - a, soft ?? 0));
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <Text style={{ fontSize: 14, color: c.ink, flexShrink: 1 }}>{label}</Text>
        <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>{text}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${a}%`, backgroundColor: c.brz }} />
        {b > 0 ? <View style={{ height: 6, width: `${b}%`, backgroundColor: c.brz, opacity: 0.38 }} /> : null}
      </View>
    </View>
  );
}

export function weekText(w: WeekCount): string {
  return w.target ? `${w.posted + w.scheduled} of ${w.target}` : String(w.posted + w.scheduled);
}
