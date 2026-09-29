import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { when } from '@/components/forge/admin/crm-ui';
import { usePhone } from '@/components/forge/admin/phone/context';
import { BigBtn, EmptyRow, ErrorRow, FigGrid, Muted, PChip, SectionHead, Skel } from '@/components/forge/admin/phone/kit';
import { fetchSurvey, surveyFormScript, type SurveySummary } from '@/data/crm-live';
import { matches, pct, resultsBrief, summarize, topLine, writeIns, type SurveyFilter } from '@/domain/admin/survey-core';
import { useQuery } from '@/lib/useQuery';

/**
 * More → Surveys on the phone (0243, AA-D22): the desktop Surveys page's numbers, for checking between
 * posts. Tap an answer to see only the people who gave it; "Copy results" and "Copy setup script" work
 * here too. Editing a survey and removing answers stay on the desktop page.
 */

const TEXT_SHOWN = 4;

export function SurveysView({ surveys, error, onRetry }: { surveys: SurveySummary[] | null; error: string | null; onRetry: () => void }) {
  const { c } = useCrm();
  const { stamp, toast, markLoaded } = usePhone();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SurveyFilter | null>(null);
  const [allText, setAllText] = useState<Record<string, true>>({});

  const current = surveys?.find((s) => s.id === pickedId) ?? surveys?.[0] ?? null;
  const detail = useQuery(async () => {
    if (!current) return null;
    const r = await fetchSurvey(current.id);
    markLoaded();
    return { ...r, at: Date.now() };
  }, [current?.id, stamp]);
  const d = detail.data && detail.data.id === current?.id ? detail.data : null;
  const rows = useMemo(() => (d ? d.rows.filter((r) => matches(r, filter, d.questions)) : []), [d, filter]);
  const results = useMemo(() => (d ? summarize(d.questions, rows) : []), [d, rows]);

  const copy = async (text: string, done: string) => {
    try {
      await Clipboard.setStringAsync(text);
      toast(done);
    } catch {
      toast('Couldn’t copy. The browser blocked the clipboard.');
    }
  };

  if (error && !surveys) return <ErrorRow msg={`Couldn’t load surveys. ${error}`} onRetry={onRetry} />;
  if (!surveys) return <Skel lines={4} />;
  if (!current) return <EmptyRow>No surveys yet. Add one on the desktop CRM, then connect its Google Form.</EmptyRow>;

  const total = d?.rows.length ?? current.responses;
  const week = d ? d.rows.filter((r) => d.at - new Date(r.submitted_at).getTime() < 7 * 86_400_000).length : null;
  const emails = d ? d.rows.filter((r) => r.email).length : current.emails;

  return (
    <View style={{ marginTop: 14 }}>
      {surveys.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {surveys.map((s) => (
            <PChip
              key={s.id}
              label={s.title}
              count={s.responses}
              on={s.id === current.id}
              onPress={() => {
                setFilter(null);
                setPickedId(s.id);
              }}
            />
          ))}
        </View>
      ) : null}
      <Text style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>{current.title}</Text>

      <View style={{ marginTop: 12 }}>
        <FigGrid
          figs={[
            { label: 'Responses', value: String(total), note: week != null ? `${week} in the last 7 days` : null },
            { label: 'Early-access emails', value: String(emails), note: emails ? 'In People, tagged Survey' : null },
          ]}
        />
      </View>

      {detail.error && !d ? <ErrorRow msg={detail.error} onRetry={detail.refetch} /> : !d ? <Skel lines={3} /> : null}

      {d && !d.last_intake_at ? (
        <View style={{ marginTop: 18, gap: 10 }}>
          <Muted>Not connected yet. On a computer: open the form → ⋮ → Apps Script, paste the setup script, then run “setup”.</Muted>
          <BigBtn label="Copy setup script" kind="quiet" onPress={() => void copy(surveyFormScript(d.intake_token), 'Script copied.')} />
        </View>
      ) : null}

      {d && d.rows.length ? (
        <>
          {filter ? (
            <View style={{ marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: c.brzTint, gap: 6 }}>
              <Text style={{ fontSize: 15, lineHeight: 21, color: c.ink }}>
                {rows.length} of {d.rows.length} answered <Text style={{ fontWeight: '600' }}>{filter.a}</Text>
              </Text>
              <Text onPress={() => setFilter(null)} accessibilityRole="button" style={{ fontSize: 15, fontWeight: '600', color: c.brz }}>
                Show everyone
              </Text>
            </View>
          ) : (
            <Muted style={{ marginTop: 16 }}>Tap an answer to see only the people who gave it.</Muted>
          )}

          {results.map((r) => (
            <View key={r.title}>
              <SectionHead label={r.title} style={{ marginTop: 26 }} />
              <Text style={{ marginTop: 4, fontSize: 13, color: c.ink3 }}>
                {r.answered} answered{r.kind === 'choice' && filter?.q !== r.title && topLine(r) ? ` · ${topLine(r)}` : ''}
              </Text>
              {r.kind === 'choice' ? (
                <View style={{ marginTop: 6 }}>
                  {r.options.map((o) => {
                    const max = Math.max(1, ...r.options.map((x) => x.n));
                    const on = filter?.q === r.title && filter.a === o.label;
                    return (
                      <Pressable
                        key={o.label}
                        onPress={o.n ? () => setFilter(on ? null : { q: r.title, a: o.label }) : undefined}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on, disabled: !o.n }}
                        style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 10, gap: 7, backgroundColor: on ? c.brzTint : pressed ? c.hover : 'transparent' })}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                          <Text style={{ flexShrink: 1, fontSize: 15, color: o.n ? c.ink : c.ink3, fontWeight: on ? '600' : '400' }}>{o.label}</Text>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: o.n ? c.ink : c.ink3, fontVariant: ['tabular-nums'] }}>{pct(o.share)}</Text>
                        </View>
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track }}>
                          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.brz, width: `${(o.n / max) * 100}%` }} />
                        </View>
                      </Pressable>
                    );
                  })}
                  {r.other.length ? <Muted style={{ marginTop: 6 }}>{`Written in: ${writeIns(r.other)}`}</Muted> : null}
                </View>
              ) : (
                <View>
                  {(allText[r.title] ? r.answers : r.answers.slice(0, TEXT_SHOWN)).map((a) => (
                    <View key={a.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
                      <Text selectable style={{ fontSize: 15, lineHeight: 22, color: c.ink }}>
                        “{a.text}”
                      </Text>
                      <Text style={{ marginTop: 3, fontSize: 12.5, color: c.ink3 }}>{when(a.at)}</Text>
                    </View>
                  ))}
                  {!allText[r.title] && r.answers.length > TEXT_SHOWN ? (
                    <Text onPress={() => setAllText((m) => ({ ...m, [r.title]: true }))} accessibilityRole="button" style={{ paddingTop: 12, fontSize: 15, fontWeight: '600', color: c.brz }}>
                      Show all {r.answers.length}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ))}

          <View style={{ marginTop: 28, flexDirection: 'row' }}>
            <BigBtn label="Copy results" onPress={() => void copy(resultsBrief(d.title, results, rows.length, filter), 'Results copied.')} />
          </View>
        </>
      ) : d && d.last_intake_at ? (
        <EmptyRow>Connected, but nobody has answered yet.</EmptyRow>
      ) : null}
    </View>
  );
}
