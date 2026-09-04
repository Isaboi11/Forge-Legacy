import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { SCREEN_GUTTER, useBarBottom } from '@/lib/screen-insets';
import { adoptStarterTemplate, schemeText } from '@/data/templates-live';
import { getStarterTemplate, starterMeta } from '@/domain/workout/starter-templates';
import { activityFromKey, deriveEquip } from '@/domain/workout/conditioning';
import { itemByKey } from '@/domain/exercise-picker/data';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage } from '@/lib/useQuery';
import { writeWorkoutLaunch } from '@/lib/workout-launch';

/**
 * Preview a Forge starter template, and take it.
 *
 * ITS OWN ROUTE RATHER THAN A MODE ON W-27, deliberately. W-27 is a surface over a row the athlete
 * OWNS — it edits, duplicates, renames, deletes, and shows the history of sessions trained from it.
 * A shipped definition has none of those: no id in the database, no history, nothing to rename. Adding
 * a "not yours yet" mode would put four disabled actions and an empty history on a screen whose whole
 * job is those actions, and would implicate W-27's "not a sharing or publishing surface" clause in a
 * question it was never asked.
 *
 * So: read-only, and the moment a template is taken the athlete lands on the real W-27 for their own
 * copy. `router.replace`, not `push` — going "back" from your new template should reach the hub, not a
 * preview of the thing you now own.
 *
 * ── TWO ACTIONS, AND THE ORDER MATTERS ───────────────────────────────────────────────────────────
 *
 * This screen shipped with ONE: Add to My Templates. So the only route from "here is a push day" to
 * doing it ran through filing a copy in your library first — the wrong order for the commonest case,
 * which is that you are standing in a gym and want to train the thing you are looking at. Reported by
 * the PO: *"with templates, you should be able to start a workout from looking at the template."*
 *
 * **Start Workout** is now the primary and trains it directly, owning nothing (`starterId` on the
 * launch context — see `workout-launch.ts` for why it is not `templateId` or `exercises`). **Add to My
 * Templates** stays beneath it as the secondary, for when you want to keep and edit it. Adopting is
 * still the only path that gives the session a template to be attributed to, and the note at the foot
 * of the page says what that buys.
 */
export default function StarterTemplateScreen() {
  const barBottom = useBarBottom();
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [adopting, setAdopting] = useState(false);

  const def = id ? getStarterTemplate(String(id)) : null;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/templates'));

  if (!def) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
        <AppBar title="Template" onBack={goBack} />
        <View style={styles.status}>
          <Text style={styles.notFoundTitle}>Not found</Text>
          <Text style={styles.statusDetail}>This starter template no longer ships with Forge.</Text>
          <Pressable onPress={() => router.replace('/templates')} accessibilityRole="button" accessibilityLabel="Back to templates" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>All Templates</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const adopt = async () => {
    if (adopting) return;
    setAdopting(true);
    try {
      const newId = await adoptStarterTemplate(def);
      showToast(`${def.name} is yours — edit it however you like.`);
      router.replace({ pathname: '/template/[id]', params: { id: newId } });
    } catch (e) {
      setAdopting(false);
      showToast(errorMessage(e));
    }
  };

  /* Trains it as it ships, without writing anything. `push`, not `replace` — backing out of the logger
     should land where you were, on the session you were reading about. */
  const start = async () => {
    await writeWorkoutLaunch({ starterId: def.id, workoutName: def.name });
    router.push('/workout');
  };

  const sets = def.exercises.reduce((n, e) => n + e.sets, 0);
  /* What a home session assumes you own. Bodyweight is not kit, and a cardio finisher needs no
     equipment worth listing — "Road" is not something to fetch from a cupboard. */
  const kit = [
    ...new Set(
      def.exercises
        .filter((e) => e.kind !== 'cardio' && e.catalogKey)
        .map((e) => itemByKey(e.catalogKey!)?.equip)
        .filter((n): n is string => !!n && n !== 'Bodyweight'),
    ),
  ];
  const sections: { key: 'warmup' | 'main' | 'cooldown'; label: string }[] = [
    { key: 'warmup', label: 'Warm-up' },
    { key: 'main', label: 'Main' },
    { key: 'cooldown', label: 'Cool-down' },
  ];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title={def.name} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.forgePill}>
            <Text style={styles.forgePillText}>BUILT BY FORGE</Text>
          </View>
          <Text style={styles.heroName}>{def.name}</Text>
          <Text style={styles.heroStats}>
            {def.exercises.length} {def.exercises.length === 1 ? 'lift' : 'lifts'} · {sets} sets · {starterMeta(def)}
          </Text>
          <Text style={styles.heroBlurb}>{def.blurb}</Text>
          {/* The one question a home session raises that its name doesn't answer. Derived from the
              rows rather than authored, so it cannot fall out of step with what the session asks for.
              Gym templates don't get it — "you'll need a gym" is what `venue` already said. */}
          {def.venue === 'home' && kit.length > 0 ? (
            <Text style={styles.heroKit}>You’ll need: {kit.join(' · ')}</Text>
          ) : null}
        </View>

        {sections.map(({ key, label }) => {
          const rows = def.exercises.filter((e) => (e.section ?? 'main') === key);
          if (!rows.length) return null;
          return (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionLabel}>{label}</Text>
              {rows.map((ex, i) => {
                /* A cardio finisher has no catalogue entry — `itemByKey` returns nothing for
                   `cardio:run`, and the old fallbacks rendered a mile of running as "Bodyweight" and
                   "1 × 1". It states its own ground and its own distance instead, and opens nothing:
                   there is no exercise page for a run. */
                const activity = activityFromKey(ex.catalogKey);
                const isCardio = ex.kind === 'cardio' && !!activity;
                const rec = !isCardio && ex.catalogKey ? itemByKey(ex.catalogKey) : undefined;
                return (
                  <Pressable
                    key={`${key}-${i}`}
                    onPress={rec ? () => router.push({ pathname: '/exercise/[id]', params: { id: rec.key } }) : undefined}
                    disabled={!rec}
                    accessibilityRole={rec ? 'button' : undefined}
                    accessibilityLabel={rec ? `${ex.name} — open exercise` : ex.name}
                    style={({ pressed }) => [styles.exRow, rec && pressed ? styles.pressed : null]}
                  >
                    <View style={styles.exText}>
                      <Text style={styles.exName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.exEquip} numberOfLines={1}>
                        {isCardio ? deriveEquip(activity, ex.modality ?? 'outdoor') : (rec?.equip ?? 'Bodyweight')}
                      </Text>
                    </View>
                    <Text style={styles.exScheme}>
                      {isCardio ? (ex.targetMi != null ? `${ex.targetMi} mi` : 'Open') : schemeText(ex)}
                    </Text>
                    {rec ? <Chevron /> : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {/* Says what taking it MEANS, because "add" is ambiguous about ownership and this is the whole
            model: you get a copy, and the copy is yours to change. Now also states the one thing that
            separates the two buttons below — training it as-is leaves no trace of the template, and
            "times used" is a fact about a template you own. */}
        <Text style={styles.note}>
          Start it and you train it exactly as it is, and nothing is added to your library. Adding it makes your own
          copy — change the lifts, the sets, the name. Forge’s version stays where it is, and yours keeps the history
          of every session you train from it.
        </Text>
      </ScrollView>

      {/* The SHARED primary, not a hand-rolled one. This screen had its own Pressable filled with a flat
          `bronze400` and dark `base` text, which is not what a primary button looks like anywhere else in
          Forge — the real one is the bronze METAL treatment (gradient fill, top rim, cream label) that
          `Button` owns. Reported by the PO as the wrong colour, and it was: the only bronze-400 primary in
          the app. Using the composite means it cannot drift again. */}
      <View style={[styles.footer, { paddingBottom: barBottom }]}>
        <Button
          variant="primary"
          fullWidth
          onPress={() => void start()}
          accessibilityLabel={`Start ${def.name} now`}
        >
          Start Workout
        </Button>
        <View style={styles.footerSecondary}>
          <Button
            variant="secondary"
            fullWidth
            disabled={adopting}
            onPress={() => void adopt()}
            accessibilityLabel={`Add ${def.name} to my templates`}
          >
            {adopting ? 'Adding…' : 'Add to My Templates'}
          </Button>
        </View>
      </View>
    </View>
  );
}

function Chevron({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.charcoal500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  barTitle: { fontSize: 16, fontWeight: '600', color: flColor.cream100, letterSpacing: 0.2 },
  scroll: { padding: 18, paddingBottom: 32 },
  pressed: { opacity: 0.75 },

  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  statusDetail: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
  notFoundTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  outlineBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  outlineBtnLabel: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  hero: { marginBottom: 22 },
  forgePill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  forgePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1, color: flColor.bronze300 },
  heroName: { marginTop: 10, fontFamily: flFont.display, fontSize: 26, fontWeight: '600', color: flColor.cream100 },
  heroStats: { marginTop: 5, fontSize: 12.5, color: flColor.bronze400 },
  heroBlurb: { marginTop: 9, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },
  heroKit: { marginTop: 8, fontSize: 12, lineHeight: 17.5, color: flColor.gray600 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 9 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 13, marginBottom: 7, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  exText: { flex: 1, minWidth: 0 },
  exName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  exEquip: { marginTop: 2, fontSize: 11, color: flColor.gray600 },
  exScheme: { flexShrink: 0, fontFamily: flFont.display, fontSize: 14, fontWeight: '600', color: flColor.bronze300 },

  note: { marginTop: 4, fontSize: 12, lineHeight: 18, color: flColor.gray600 },

  /* `paddingBottom` comes from `useBarBottom` — see `lib/screen-insets`. */
  footer: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  footerSecondary: { marginTop: 9 },
});
