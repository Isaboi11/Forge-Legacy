import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { adoptStarterTemplate, schemeText } from '@/data/templates-live';
import { getStarterTemplate } from '@/domain/workout/starter-templates';
import { itemByKey } from '@/domain/exercise-picker/data';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage } from '@/lib/useQuery';

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
 * So: read-only, one action, and the moment it is taken the athlete lands on the real W-27 for their
 * own copy. `router.replace`, not `push` — going "back" from your new template should reach the hub,
 * not a preview of the thing you now own.
 */
export default function StarterTemplateScreen() {
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
        <AppBar title={<Text style={styles.barTitle}>Template</Text>} onBack={goBack} />
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

  const sets = def.exercises.reduce((n, e) => n + e.sets, 0);
  const sections: { key: 'warmup' | 'main' | 'cooldown'; label: string }[] = [
    { key: 'warmup', label: 'Warm-up' },
    { key: 'main', label: 'Main' },
    { key: 'cooldown', label: 'Cool-down' },
  ];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title={<Text style={styles.barTitle}>{def.name}</Text>} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.forgePill}>
            <Text style={styles.forgePillText}>BUILT BY FORGE</Text>
          </View>
          <Text style={styles.heroName}>{def.name}</Text>
          <Text style={styles.heroStats}>
            {def.exercises.length} {def.exercises.length === 1 ? 'lift' : 'lifts'} · {sets} sets · {def.level}
          </Text>
          <Text style={styles.heroBlurb}>{def.blurb}</Text>
        </View>

        {sections.map(({ key, label }) => {
          const rows = def.exercises.filter((e) => (e.section ?? 'main') === key);
          if (!rows.length) return null;
          return (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionLabel}>{label}</Text>
              {rows.map((ex, i) => {
                const rec = ex.catalogKey ? itemByKey(ex.catalogKey) : undefined;
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
                        {rec?.equip ?? 'Bodyweight'}
                      </Text>
                    </View>
                    <Text style={styles.exScheme}>{schemeText(ex)}</Text>
                    {rec ? <Chevron /> : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {/* Says what taking it MEANS, because "add" is ambiguous about ownership and this is the whole
            model: you get a copy, and the copy is yours to change. */}
        <Text style={styles.note}>
          Adding this makes your own copy. Change the lifts, the sets, the name — Forge’s version stays where it is,
          and yours keeps the history of every session you train from it.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => void adopt()} disabled={adopting} accessibilityRole="button" accessibilityLabel={`Add ${def.name} to my templates`} style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}>
          {adopting ? <ActivityIndicator size="small" color={flColor.base} /> : <Text style={styles.primaryBtnLabel}>Add to My Templates</Text>}
        </Pressable>
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

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 9 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 13, marginBottom: 7, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  exText: { flex: 1, minWidth: 0 },
  exName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  exEquip: { marginTop: 2, fontSize: 11, color: flColor.gray600 },
  exScheme: { flexShrink: 0, fontFamily: flFont.display, fontSize: 14, fontWeight: '600', color: flColor.bronze300 },

  note: { marginTop: 4, fontSize: 12, lineHeight: 18, color: flColor.gray600 },

  footer: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 22, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: flRadius.md, backgroundColor: flColor.bronze400 },
  primaryBtnLabel: { fontSize: 14.5, fontWeight: '700', letterSpacing: 0.3, color: flColor.base },
});
