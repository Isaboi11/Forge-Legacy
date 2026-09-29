import { useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, DeleteBtn, ErrorLine, PageHeader, SectionLabel, Skeleton, useTwoTap, useToast } from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PageProps } from '@/components/forge/admin/pages/types';
import {
  deleteCommunityFood,
  fetchAdminCommunityFoods,
  fetchAdminReports,
  resolveReport,
  restoreCommunityFood,
  type AdminReport,
} from '@/data/moderation-live';
import { daysSince, moderationNote, moderationSummary, waitingTag } from '@/domain/admin/notes/moderation';
import { REPORT_REASON_LABEL, isReportReason } from '@/domain/moderation/moderation-core';
import { useQuery } from '@/lib/useQuery';

/**
 * Moderation (Forge CRM.dc.html, the MODERATION section) — the two to-do queues that answer for what
 * athletes put in front of each other: reported content and people (0171) and shared foods (0219,
 * Nutrition Amendment 004).
 *
 * Neither is range-scoped: an open report is not less open because the range says 7D.
 *
 * ⚠ This queue is an App Store obligation (Guideline 1.2 requires reporting AND timely responses), which
 * is why each row carries how long it has waited and the summary carries the oldest.
 */

const TARGET: Record<string, string> = { post: 'Squad post', comment: 'Comment', checkin: 'Check-in', squad: 'Squad' };

function reportTitle(r: AdminReport): string {
  const who = r.targetHandle ? `@${r.targetHandle}` : null;
  if (r.targetKind === 'athlete') return `Profile: ${who ?? `id ${r.targetId.slice(0, 8)}`}`;
  const kind = TARGET[r.targetKind] ?? r.targetKind;
  return who ? `${kind} by ${who}` : `${kind} · id ${r.targetId.slice(0, 8)}`;
}

const reasonText = (reason: string) => (isReportReason(reason) ? REPORT_REASON_LABEL[reason] : reason.replace(/_/g, ' '));

export function ModerationPage(_props: PageProps) {
  const { c } = useCrm();
  const toast = useToast();
  const { armed, tap } = useTwoTap();

  // Both reads return null on failure rather than throwing; turn that into an error the page can show.
  // `at` = when it was read, so "days waiting" is judged against that, not a render-time clock.
  const reports = useQuery(async () => {
    const r = await fetchAdminReports(50, null);
    if (!r) throw new Error('Couldn’t load reports. Check that migration 0171 is applied.');
    return { r, at: Date.now() };
  }, []);
  const foods = useQuery(async () => {
    const f = await fetchAdminCommunityFoods(true);
    if (!f) throw new Error('Couldn’t load shared foods. Check that migration 0219 is applied.');
    return f.filter((x) => x.hidden);
  }, []);

  // Rows closed on this visit stay in the list showing their result, as the design does.
  const [closedHere, setClosedHere] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});

  const resolve = async (id: string, status: 'actioned' | 'dismissed') => {
    setBusy(`${id}:${status}`);
    setRowErr(({ [id]: _drop, ...rest }) => rest);
    try {
      await resolveReport(id, status);
      setClosedHere((m) => ({ ...m, [id]: true }));
      reports.refetch();
    } catch {
      // The row stays open and says so: a report that silently leaves the queue is the worse failure.
      setRowErr((m) => ({ ...m, [id]: 'Couldn’t save. It’s still open. Check your connection and tap again.' }));
    } finally {
      setBusy(null);
    }
  };

  const moderateFood = async (key: string, action: 'restore' | 'delete') => {
    setBusy(`${key}:${action}`);
    setRowErr(({ [key]: _drop, ...rest }) => rest);
    try {
      await (action === 'restore' ? restoreCommunityFood(key) : deleteCommunityFood(key));
      toast(action === 'restore' ? 'Restored' : 'Deleted');
      foods.refetch();
    } catch {
      setRowErr((m) => ({ ...m, [key]: `Couldn’t save. It’s still hidden. Check your connection and tap again.` }));
    } finally {
      setBusy(null);
    }
  };

  const data = reports.data;
  const counts = data?.r.counts;
  const oldestOpenDays = counts ? daysSince(counts.oldestOpenAt, data.at) : null;
  const rows = (data?.r.rows ?? []).filter((r) => r.status === 'open' || closedHere[r.id]);
  const hidden = foods.data ?? [];

  const note =
    counts && foods.data
      ? moderationNote({ open: counts.open, actioned: counts.actioned, dismissed: counts.dismissed, oldestOpenDays, hiddenFoods: hidden.length })
      : null;

  const rowBase = { flexDirection: 'row', alignItems: 'center', gap: 20, borderBottomWidth: 1, borderBottomColor: c.line } as const;

  return (
    <View>
      <PageHeader title="Moderation" purpose="Reported posts, profiles and foods waiting on you. Apple expects a timely answer." note={note} />

      <View style={{ gap: 48 }}>
        {/* ── Reports waiting (0171) ── */}
        <View>
          <SectionLabel
            label="Reports waiting"
            right={counts ? <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>{moderationSummary({ ...counts, oldestOpenDays })}</Text> : null}
          />
          {reports.error ? (
            <ErrorLine onRetry={reports.refetch}>{reports.error}</ErrorLine>
          ) : !data ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Text style={{ paddingVertical: 18, fontSize: 15, color: c.ink2, borderBottomWidth: 1, borderBottomColor: c.line }}>
              No reports waiting. When someone reports a post, profile or food it shows up here.
            </Text>
          ) : (
            rows.map((r) => {
              const open = r.status === 'open';
              const tag = waitingTag(daysSince(r.createdAt, data.at));
              return (
                <View key={r.id} style={[rowBase, { paddingVertical: 16 }]}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>{reportTitle(r)}</Text>
                      {open ? (
                        <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: tag.late ? c.warn : c.ink3 }}>{tag.text}</Text>
                      ) : null}
                    </View>
                    {/* Full text, never truncated: a report read halfway is a report misread. */}
                    <Text selectable style={{ fontSize: 13.5, lineHeight: 20, color: c.ink2 }}>
                      {r.note ? `“${r.note}”` : reasonText(r.reason)}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: c.ink3 }}>
                      Reported by {r.reporterHandle ? `@${r.reporterHandle}` : 'an athlete'} · {reasonText(r.reason).toLowerCase()}
                    </Text>
                    {rowErr[r.id] ? <Text style={{ fontSize: 13, color: c.crit }}>{rowErr[r.id]}</Text> : null}
                  </View>
                  {open ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Btn size="sm" kind="primary" label="Actioned" busy={busy === `${r.id}:actioned`} disabled={!!busy} onPress={() => void resolve(r.id, 'actioned')} />
                      <Btn size="sm" label="Dismiss" busy={busy === `${r.id}:dismissed`} disabled={!!busy} onPress={() => void resolve(r.id, 'dismissed')} />
                    </View>
                  ) : (
                    <Text style={{ fontSize: 13, color: c.ink3 }}>
                      {r.status === 'actioned' ? `Actioned${r.resolution ? ` · ${r.resolution}` : ''}` : 'Dismissed'}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Shared foods hidden by reports (0219, Amendment 004) ── */}
        <View>
          <SectionLabel label="Shared foods hidden by reports" />
          <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, color: c.ink3 }}>
            Foods athletes added after a barcode missed. Hidden from everyone until you restore them.
          </Text>
          {foods.error ? (
            <ErrorLine onRetry={foods.refetch}>{foods.error}</ErrorLine>
          ) : !foods.data ? (
            <Skeleton />
          ) : hidden.length === 0 ? (
            <Text style={{ paddingVertical: 18, fontSize: 15, color: c.ink2, borderBottomWidth: 1, borderBottomColor: c.line }}>No shared foods are hidden.</Text>
          ) : (
            hidden.map((f) => (
              <View key={f.key} style={[rowBase, { paddingVertical: 14 }]}>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>{f.brand ? `${f.name}, ${f.brand}` : f.name}</Text>
                  <Text style={{ fontSize: 12.5, color: c.ink3 }}>
                    {`${f.reports} ${f.reports === 1 ? 'report' : 'reports'} · ${f.submissions} ${f.submissions === 1 ? 'submission' : 'submissions'} · per 100 g: ${f.kcal100} kcal · P ${f.protein100} · C ${f.carb100} · F ${f.fat100} · barcode ${f.gtin}`}
                  </Text>
                  {rowErr[f.key] ? <Text style={{ fontSize: 13, color: c.crit }}>{rowErr[f.key]}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn size="sm" label="Restore" busy={busy === `${f.key}:restore`} disabled={!!busy} onPress={() => void moderateFood(f.key, 'restore')} />
                  <DeleteBtn armed={armed === f.key} busy={busy === `${f.key}:delete`} onPress={() => tap(f.key, () => void moderateFood(f.key, 'delete'))} />
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}
