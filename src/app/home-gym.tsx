import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EngravedIcon, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { Toast } from '@/components/forge/composites/Toast';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchHomeGym, saveHomeGym } from '@/data/home-gym-live';
import { byGroup, ownedSummary, type HomeGymGroup } from '@/domain/home-gym/equipment';
import { useQuery } from '@/lib/useQuery';

/**
 * Home Gym Editor (`Forge Home Gym.dc.html`) — the athlete marks what they own, and every
 * "Home Gym" filter across the app then shows only what they can actually train.
 *
 * THIS SCREEN IS THE ONLY WRITER of the profile. Other screens read it and edit by routing here with
 * `?return=`, exactly as the design specifies.
 *
 * Edits are session-local until Save: toggling and Clear only touch component state, so backing out
 * discards. Save writes once, toasts, and returns after 900ms.
 *
 * VISUAL DELTAS vs the `.dc`:
 *  · Per-item equipment icons → the design's own sanctioned group-level fallback (`GROUP_ICON`). Six
 *    glyphs instead of thirty-two; the card still carries label + hint + selection state.
 *  · No `?home=1` re-apply handshake on return — the Library re-reads the profile on focus instead,
 *    which covers the same round trip without a second query param to keep in sync.
 * Everything else — the 32-item inventory, the six ordered groups, the hints, the always-on
 * bodyweight note, the live commit-bar summary — is the design's.
 */

/** One engraved mark per group, with a per-item override (by id, not label) where the set has a closer one. */
const GROUP_GLYPH: Record<HomeGymGroup, EngravedName> = {
  'Barbell & rack': 'barbell',
  'Free weights': 'dumbbell',
  'Machines & cable': 'machine',
  Cardio: 'cardio',
  'Bodyweight & rigs': 'bodyweight',
  'Bands & accessories': 'band',
};

const ITEM_GLYPH: Record<string, EngravedName> = {
  bands: 'band',
  minibands: 'band',
  cable: 'cable',
  treadmill: 'runner',
  bike: 'bicycle',
  airbike: 'bicycle',
};

export default function HomeGymScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { return: returnTo } = useLocalSearchParams<{ return?: string }>();

  const { data: saved, loading } = useQuery(fetchHomeGym, []);

  // The edit buffer. `null` means "untouched this session", so the fetched profile still shows through
  // — a derivation rather than an effect that copies fetched data into state after it lands.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const owned = draft ?? saved ?? [];
  const groups = useMemo(() => byGroup(), []);

  const exit = () => {
    if (typeof returnTo === 'string' && returnTo) router.replace(returnTo as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const toggle = (id: string) =>
    setDraft(owned.includes(id) ? owned.filter((x) => x !== id) : [...owned, id]);

  const onSave = () => {
    setSaving(true);
    saveHomeGym(owned).then(
      () => {
        setToast(true);
        setTimeout(exit, 900);
      },
      () => setSaving(false), // stay put on failure — a silent exit would look like it saved
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.30)' }} />
        <AppBar title="My Home Gym" onBack={exit} />
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.30)' }} />
      <AppBar
        title="My Home Gym"
        onBack={exit}
        actions={
          <Pressable
            onPress={() => owned.length > 0 && setDraft([])}
            disabled={owned.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Clear all equipment"
            style={styles.clearBtn}
          >
            <Text style={[styles.clearText, owned.length === 0 && styles.clearTextOff]}>Clear</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 132 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* intro */}
        <View style={styles.intro}>
          <View style={styles.microRow}>
            <EngravedIcon name="home" size={15} />
            <Text style={styles.micro}>Your equipment</Text>
          </View>
          <Text style={styles.h1}>What&rsquo;s in your gym?</Text>
          <Text style={styles.lede}>
            Mark the equipment you own. The <Text style={styles.ledeStrong}>Home Gym</Text> filter across the app will
            then show only the exercises and programs you can actually train. Bodyweight is always included.
          </Text>
        </View>

        {/* equipment groups */}
        {groups.map((g) => (
          <View key={g.group} style={styles.group}>
            <Text style={styles.groupLabel}>{g.group}</Text>
            <View style={styles.grid}>
              {g.items.map((item) => {
                const sel = owned.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                    accessibilityLabel={`${item.label}, ${item.hint}`}
                    style={[styles.card, sel && styles.cardOn]}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.disc, sel && styles.discOn]}>
                        <EngravedIcon name={ITEM_GLYPH[item.id] ?? GROUP_GLYPH[g.group]} size={17} color={sel ? undefined : flColor.gray600} />
                      </View>
                      {sel ? (
                        <View style={styles.check}>
                          <EngravedIcon name="check" size={13} color={flColor.onBronze} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.cardLabel, sel && styles.cardLabelOn]}>{item.label}</Text>
                    <Text style={styles.cardHint}>{item.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* bodyweight is never a choice */}
        <View style={styles.note}>
          <EngravedIcon name="bodyweight" size={19} color={flColor.gray600} />
          <Text style={styles.noteText}>Bodyweight training is always available — no equipment needed.</Text>
        </View>
      </ScrollView>

      {/* commit bar */}
      <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
        <Text style={styles.summary}>{ownedSummary(owned.length)}</Text>
        <Button variant="primary" fullWidth onPress={onSave} disabled={saving} accessibilityLabel="Save my home gym">
          <View style={styles.saveInner}>
            <EngravedIcon name="star" size={15} color={flColor.onBronze} />
            <Text style={styles.saveText}>Save My Home Gym</Text>
          </View>
        </Button>
      </View>

      <Toast open={toast} message="Home gym saved" durationMs={2000} onDismiss={() => setToast(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  clearBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  clearText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: flColor.bronze400 },
  clearTextOff: { color: flColor.gray600 },

  body: { paddingHorizontal: 18 },

  intro: { paddingTop: 6, paddingBottom: 22 },
  microRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 },
  micro: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400 },
  h1: { fontFamily: flFont.display, fontSize: 27, fontWeight: '600', color: flColor.cream100, marginBottom: 9 },
  lede: { fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  ledeStrong: { color: flColor.cream100, fontWeight: '700' },

  group: { marginBottom: 22 },
  groupLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },

  card: {
    width: '48%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  cardOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  disc: {
    width: 34,
    height: 34,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  discOn: { backgroundColor: 'rgba(186, 134, 84,0.14)', borderColor: flColor.bronzeBorder },
  check: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeSolid,
  },
  cardLabel: { fontSize: 13, fontWeight: '600', color: flColor.cream100, marginBottom: 2 },
  cardLabelOn: { color: flColor.bronze300 },
  cardHint: { fontSize: 11, color: flColor.gray600 },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 18,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
    backgroundColor: flColor.base,
  },
  summary: { fontSize: 12, fontWeight: '600', color: flColor.gray400, textAlign: 'center' },
  saveInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { fontSize: 14, fontWeight: '700', color: flColor.onBronze },
});
