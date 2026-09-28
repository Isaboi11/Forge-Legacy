import { StyleSheet, Text, View } from 'react-native';

import { StatLine } from '@/components/forge/admin/charts';
import { Block, Btn, Columns, Empty, ListRow, PageHead, QueryGate, RowMeta, RowTitle, Tag, when } from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { flColor } from '@/constants/foundation';
import {
  deleteCommunityFood,
  fetchAdminCommunityFoods,
  fetchAdminReports,
  resolveReport,
  restoreCommunityFood,
} from '@/data/moderation-live';
import { useQuery } from '@/lib/useQuery';

/**
 * Moderation — the two to-do queues that answer for what athletes put in front of each other: reported
 * content and people (0171) and shared foods (0219, Nutrition Amendment 004). Moved whole from the old
 * operator dashboard by Admin-Analytics-Amendment-002.
 *
 * Neither is range-scoped, and that is the page's one rule: an open report is not less open because
 * the range chips say 7D, and a hidden food is a to-do like a report.
 */
export function ModerationPage(_props: PageProps) {
  /* Reports (0171). Deliberately NOT range-scoped, because an open report is not less open because the
     chips say 7D. */
  const reports = useQuery(() => fetchAdminReports(50, null), []);
  /* Shared foods (0219, Amendment 004). Not range-scoped: a hidden food is a to-do, like a report. */
  const sharedFoods = useQuery(() => fetchAdminCommunityFoods(false), []);

  const resolve = async (id: string, status: 'actioned' | 'dismissed') => {
    try {
      await resolveReport(id, status);
      reports.refetch();
    } catch {
      /* The row stays open and visibly unresolved, which is the safe failure: a report that silently
         disappears from the queue is worse than one that refuses to close. */
    }
  };

  const moderateFood = async (key: string, action: 'restore' | 'delete') => {
    try {
      await (action === 'restore' ? restoreCommunityFood(key) : deleteCommunityFood(key));
      sharedFoods.refetch();
    } catch {
      /* The row keeps its state, visibly. A food that silently vanishes from the queue is the worse failure. */
    }
  };

  const rc = reports.data?.counts;
  const foods = sharedFoods.data ?? [];
  const flagged = foods.filter((f) => f.hidden || f.reports > 0);

  return (
    <View style={{ gap: 28 }}>
      <PageHead
        title="Moderation"
        lede="Reported content and people, and shared foods the community flagged. Both are to-do lists — not range-scoped."
      />

      <Columns>
        {/* ── Reports (0171) ───────────────────────────────────────────── */}
        <Block
          label="Reports"
          hint="Reported content and people. ⚠ This queue is an App Store obligation, not a nice-to-have — Guideline 1.2 requires reporting AND timely responses, and an unread queue fails the second half while passing the first."
        >
          <QueryGate state={reports}>
            {reports.data && rc ? (
              <>
                <StatLine label="Open" value={rc.open} />
                <StatLine label="Actioned" value={rc.actioned} />
                <StatLine label="Dismissed" value={rc.dismissed} />
                {/*
                  * ⚠ THE LINE THAT ACTUALLY MEASURES "TIMELY". `Open: 0` and `Open: 3, oldest three weeks
                  * ago` are the difference between a queue being worked and a queue being ignored, and the
                  * count alone cannot tell them apart. Null is "nothing has ever been reported" — a
                  * different fact from "nothing is open", which a bare 0 collapses.
                  */}
                <StatLine
                  label="Oldest still open"
                  value={
                    rc.oldestOpenAt
                      ? when(rc.oldestOpenAt, true)
                      : rc.open === 0 && rc.actioned === 0 && rc.dismissed === 0
                        ? 'nothing has ever been reported'
                        : 'nothing open'
                  }
                />
                {reports.data.rows.length === 0 ? null : (
                  <View style={styles.list}>
                    {reports.data.rows.map((r) => (
                      <ListRow key={r.id}>
                        <View style={styles.head}>
                          <Tag label={`${r.reason} · ${r.targetKind}`} tone={r.status === 'open' ? 'high' : 'muted'} />
                          <Text style={styles.who} numberOfLines={1}>
                            {r.targetHandle ? `@${r.targetHandle}` : r.targetId.slice(0, 8)}
                          </Text>
                          <Text style={styles.when}>{when(r.createdAt, true)}</Text>
                        </View>
                        {/* Full text, never truncated — a report read halfway is a report misread. */}
                        {r.note ? (
                          <Text style={styles.body} selectable>
                            {r.note}
                          </Text>
                        ) : null}
                        <RowMeta>
                          {[r.status, r.reporterHandle ? `from @${r.reporterHandle}` : null, r.resolution]
                            .filter(Boolean)
                            .join(' · ')}
                        </RowMeta>
                        {r.status === 'open' ? (
                          <View style={styles.actions}>
                            <Btn small label="Actioned" onPress={() => void resolve(r.id, 'actioned')} />
                            <Btn small label="Dismiss" onPress={() => void resolve(r.id, 'dismissed')} />
                          </View>
                        ) : null}
                      </ListRow>
                    ))}
                  </View>
                )}
              </>
            ) : reports.data === null && !reports.loading ? (
              <Empty>Reports could not be read — check 0171 is applied.</Empty>
            ) : null}
          </QueryGate>
        </Block>

        {/* ── Shared foods (0219, Amendment 004) ───────────────────────── */}
        <Block
          label="Shared foods"
          hint="Foods athletes shared after a barcode missed. Three reports hide one; restore it if the numbers are right, delete it if they are not."
        >
          <QueryGate state={sharedFoods}>
            {sharedFoods.data ? (
              <>
                <StatLine label="Shared" value={foods.length} />
                <StatLine label="Hidden by reports" value={foods.filter((f) => f.hidden).length} />
                <StatLine label="Confirmed by 2+" value={foods.filter((f) => f.confirmations >= 2).length} />
                {flagged.length === 0 ? (
                  <Empty>Nothing flagged.</Empty>
                ) : (
                  <View style={styles.list}>
                    {flagged.map((f) => (
                      <ListRow key={f.key}>
                        <View style={styles.head}>
                          <Tag
                            label={f.hidden ? 'hidden' : `${f.reports} report${f.reports === 1 ? '' : 's'}`}
                            tone={f.hidden ? 'critical' : 'muted'}
                          />
                          <Text style={styles.when}>{when(f.updatedAt, true)}</Text>
                        </View>
                        <RowTitle>{[f.name, f.brand].filter(Boolean).join(' · ')}</RowTitle>
                        <RowMeta>
                          {`${f.gtin} · per 100 g: ${f.kcal100} kcal · P ${f.protein100} · C ${f.carb100} · F ${f.fat100} · ${f.submissions} submitted`}
                        </RowMeta>
                        <View style={styles.actions}>
                          <Btn small label="Restore" onPress={() => void moderateFood(f.key, 'restore')} />
                          <Btn small kind="danger" label="Delete" onPress={() => void moderateFood(f.key, 'delete')} />
                        </View>
                      </ListRow>
                    ))}
                  </View>
                )}
              </>
            ) : !sharedFoods.loading ? (
              <Empty>Shared foods could not be read — check 0219 is applied.</Empty>
            ) : null}
          </QueryGate>
        </Block>
      </Columns>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  who: { flex: 1, minWidth: 0, fontSize: 11.5, color: flColor.gray600 },
  when: { flexShrink: 0, marginLeft: 'auto', fontSize: 11.5, color: flColor.gray400 },
  body: { fontSize: 13, lineHeight: 19, color: flColor.cream100 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
