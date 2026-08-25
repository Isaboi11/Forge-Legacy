import { useState } from 'react';
import type { GestureResponderHandlers } from 'react-native';
import { Animated, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { TransformationLayout } from '@/components/forge/TransformationLayout';
import { SquadSelectList, selectedSquads } from '@/components/forge/SquadSelectList';
import { shareSummary, shareTargets, shareVerb } from '@/domain/share/fanout';
import { addSquadPost, type ComparePair, type EntryTemplate, type PoseShot, type ShareTemplate, type TransformationLayoutData } from '@/data/squad-feed-live';
import { fetchFriendLists } from '@/data/friends-live';
import { createFriendPost } from '@/data/friends-feed-live';
import { ShareCardHost } from '@/lib/share-card-host';
import { saveShareCard } from '@/lib/share-image';
import { fetchMySquads, type SquadSummary } from '@/data/squad-live';
import { fetchTransformationEntries, filledPoses, type PoseKey } from '@/data/transformation-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useProfile } from '@/lib/profile';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useSheetDrag } from '@/hooks/useSheetDrag';

/**
 * Share Configuration (SH-1) — built to `Forge Share Configuration.dc.html`, scoped to the `transformation`
 * kind. Compare shares carry a JSON `payload` (labels · elapsed · chapter · reflection · pose pairs w/
 * alignment) and offer a template picker (slider / side-by-side / stacked / multi-pose grid) + a pose
 * selector.
 *
 * AN ENTRY SHARE PICKS A FORMAT TOO — Single photo · All poses · Full width. It used to post exactly one
 * photo, silently: a six-pose capture went out as whichever pose happened to be on screen, and the other
 * five were simply dropped with nothing said. The archive's own unit is the CAPTURE, not the frame, so
 * the default here is every pose it holds; Single photo is still a tap away for anyone who wants one.
 * The same pose chips serve both — a chooser under Single photo, include/exclude toggles under the others.
 *
 * EVERY DESTINATION ON THIS SCREEN WORKS. That is the whole rule, and it cost three of them.
 *
 * The design drew six in-Forge destinations and four outside ones, most of them fake toasts. Squad and
 * Friends became real (`addSquadPost` / `createFriendPost`); the rest were removed rather than left
 * saying "coming soon" — or worse. **"Message" was the worst of them: it toasted "Message ready" with
 * no message and nothing behind it — a surface reporting a success that never happened**, which is the
 * one thing this codebase treats as unshippable. Removed with it: Community (not in the app at all),
 * "A friend" (there is no direct-message surface to send to) and "Copy link" (there are no public URLs
 * — every post is audience-scoped, so a link would need a sharing model and a privacy decision, not a
 * clipboard call).
 *
 * Four destinations that all work beats ten where six lie. Same reasoning that omitted the Friends chip
 * from Challenges and the Community filter from Discover: absent renders nothing, a fake renders a
 * confident false claim.
 *
 * THE SQUAD PICKER TAKES MORE THAN ONE ANSWER (PO: *"I want to be able to easily select 1/3, 2/3, or 3/3
 * of those"*). Its rows are checkboxes with a pinned confirm; the fan-out and the "what actually landed"
 * message come from `domain/share/fanout`, shared with the two share sheets.
 */

type ToggleKey = 'chapter' | 'reflection' | 'date' | 'photo' | 'name';

interface Payload {
  thenLabel?: string;
  nowLabel?: string;
  elapsed?: string;
  chapter?: string;
  reflection?: string;
  pairs?: ComparePair[];
}

const TEMPLATES: { id: ShareTemplate; label: string }[] = [
  { id: 'slider', label: 'Slider' },
  { id: 'sidebyside', label: 'Side by side' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'grid', label: 'Grid' },
];

/** The formats a single capture can go out in. `gallery` is the default whenever there is more than one pose. */
const ENTRY_FORMATS: { id: EntryTemplate; label: string }[] = [
  { id: 'gallery', label: 'All poses' },
  { id: 'column', label: 'Full width' },
  { id: 'single', label: 'Single photo' },
];

export default function ShareConfigRoute() {
  const params = useLocalSearchParams<{ mode?: string; id?: string; pose?: string; payload?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { profile } = useProfile();
  const { data } = useQuery(fetchTransformationEntries, []);
  const entries = data ?? [];

  const isCompare = params.mode === 'compare';
  const pose = (params.pose as PoseKey) || undefined;
  const payload: Payload | null = (() => {
    if (!params.payload) return null;
    try {
      return JSON.parse(String(params.payload));
    } catch {
      return null;
    }
  })();

  const [incl, setIncl] = useState<Partial<Record<ToggleKey, boolean>>>({});
  const [dest, setDest] = useState<'squad' | 'friends'>('squad');
  const [template, setTemplate] = useState<ShareTemplate>('slider');
  /** Null until the athlete picks one — the default depends on entries that haven't loaded at first render. */
  const [entryPick, setEntryPick] = useState<EntryTemplate | null>(null);
  /** Which pose `single` shows. Seeded from the pose they were looking at when they tapped Share. */
  const [posePick, setPosePick] = useState<PoseKey | null>(pose ?? null);
  /** Indexes into whichever list this share is built from — compare pairs, or a capture's poses. */
  const [excluded, setExcluded] = useState<number[]>([]);
  const [mySquads, setMySquads] = useState<SquadSummary[] | null>(null);
  const [squadPickerOpen, setSquadPickerOpen] = useState(false);
  /** Which squads the picker has ticked. Multi-select since the PO asked for "1/3, 2/3, or 3/3". */
  const [squadPick, setSquadPick] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  /** Separate from `sharing`: saving an image is not posting, and one must not block the other. */
  const [savingImage, setSavingImage] = useState(false);

  const eff = (k: ToggleKey): boolean => incl[k] ?? true;
  const toggle = (k: ToggleKey) => setIncl((cur) => ({ ...cur, [k]: !(cur[k] ?? true) }));

  // ── Resolve payload (compare) or entry ──
  const entry = !isCompare ? entries.find((e) => e.id === String(params.id)) ?? null : null;
  const allPairs = isCompare ? payload?.pairs ?? [] : [];
  const thenLabel = payload?.thenLabel ?? 'Then';
  const nowLabel = payload?.nowLabel ?? 'Now';
  const elapsed = isCompare ? payload?.elapsed ?? '' : '';
  const chapterName = isCompare ? payload?.chapter || null : entry?.chapterName ?? null;
  const reflection = isCompare ? payload?.reflection || null : entry?.caption ?? null;
  const dateLabel = isCompare ? nowLabel : entry?.label ?? '';
  const athlete = profile?.name ?? 'You';

  const selectedPairs = allPairs.filter((_, i) => !excluded.includes(i));
  const usePairs = template === 'grid' ? selectedPairs : selectedPairs.slice(0, 1);
  const layoutData: TransformationLayoutData = { template, thenLabel, nowLabel, elapsed: elapsed || undefined, pairs: usePairs };

  // ── An entry share: this capture's poses, in the chosen format ──
  const allPoses = entry ? filledPoses(entry) : [];
  const entryTemplate: EntryTemplate = entryPick ?? (allPoses.length > 1 ? 'gallery' : 'single');
  const singlePose = allPoses.find((p) => p.key === posePick) ?? allPoses[0] ?? null;
  const usePoses = entryTemplate === 'single' ? (singlePose ? [singlePose] : []) : allPoses.filter((_, i) => !excluded.includes(i));
  const shots: PoseShot[] = usePoses.map((p) => ({ label: p.label, photo: { url: entry!.photos[p.key]! } }));
  const photo = isCompare ? allPairs[0]?.now.url ?? null : shots[0]?.photo.url ?? null;
  const drag = useSheetDrag({ onClose: () => router.back() });


  const missing = isCompare ? allPairs.length === 0 : !!data && !entry;
  if (missing) {
    return (
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={() => router.back()} />
        <Animated.View onLayout={drag.onLayout} style={[styles.sheet, drag.style]}>
          <Handle pan={drag.panHandlers} />
          <View style={styles.missingWrap}>
            <Text style={styles.missingText}>This isn’t available to share.</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  const lines: { key: ToggleKey; text: string; emph: 'bronze' | 'body' | 'muted' }[] = [];
  if (chapterName) lines.push({ key: 'chapter', text: `Chapter · ${chapterName}`, emph: 'bronze' });
  if (reflection) lines.push({ key: 'reflection', text: reflection, emph: 'body' });
  if (dateLabel && !isCompare) lines.push({ key: 'date', text: dateLabel, emph: 'muted' });

  const detailRows: { key: ToggleKey; label: string }[] = [
    ...lines.map((l) => ({ key: l.key, label: l.key === 'chapter' ? 'Chapter' : l.key === 'reflection' ? 'Reflection' : 'Date' })),
    ...(!isCompare && photo ? [{ key: 'photo' as ToggleKey, label: shots.length > 1 ? 'Photos' : 'Photo' }] : []),
    { key: 'name', label: 'Name' },
  ];
  const showPhoto = !isCompare && !!photo && eff('photo');
  /** Turning Photos off empties the card AND the post — the preview is the post, or it is decoration. */
  const useShots = showPhoto ? shots : [];
  const entryLayout: TransformationLayoutData = { template: entryTemplate, pairs: [], shots: useShots };

  const destVerb: Record<typeof dest, string> = { squad: 'Share to Squad', friends: 'Share with Friends' };

  /** The list the pose chips address — comparison pairs, or this capture's poses. */
  const poseCount = isCompare ? allPairs.length : allPoses.length;
  const togglePose = (i: number) =>
    setExcluded((cur) => {
      const has = cur.includes(i);
      const next = has ? cur.filter((x) => x !== i) : [...cur, i];
      // never exclude the last remaining pose
      return next.length >= poseCount ? cur : next;
    });

  /**
   * The post this screen composes, whichever audience it goes to. Built once so the two paths cannot drift.
   *
   * An entry carries EVERY chosen pose in `media`, not just the one on the card — the media array is what a
   * surface without a layout renderer falls back to, and dropping five of six photos there would make the
   * feed disagree with the post it opens.
   */
  const composePost = () => ({
    type: 'transformation' as const,
    body: reflection && eff('reflection') ? reflection : isCompare && elapsed ? `${elapsed} apart` : '',
    media: isCompare
      ? usePairs[0]
        ? [{ url: usePairs[0].now.url, kind: 'image' as const }]
        : []
      : useShots.map((s) => ({ url: s.photo.url, kind: 'image' as const })),
    layout: isCompare ? layoutData : useShots.length ? entryLayout : null,
  });

  const finishShare = (message: string) => {
    setSharing(false);
    setSquadPickerOpen(false);
    showToast(message);
    setTimeout(() => router.back(), 700);
  };

  const failShare = (e: unknown) => {
    setSharing(false);
    showToast(errorMessage(e));
  };

  /**
   * One post per squad, awaited in turn.
   *
   * ⚠ NOT `Promise.all`. These are separate inserts into separate feeds; running them concurrently makes
   * a partial failure unattributable, and the recovery message here has to be able to say which squads
   * already have the transformation so nobody posts it to them twice.
   */
  const postToSquads = async (squads: SquadSummary[]) => {
    if (sharing || !squads.length) return;
    setSharing(true);
    const landed: string[] = [];
    const body = composePost();
    try {
      for (const t of shareTargets(squads.map((s) => s.id), false)) {
        await addSquadPost({ ...body, squadId: t.squadId! });
        landed.push(squads.find((s) => s.id === t.squadId)!.name);
      }
    } catch (e) {
      setSharing(false);
      showToast(landed.length ? `${errorMessage(e)} ${shareSummary(landed, false)}.` : errorMessage(e));
      return;
    }
    finishShare(shareSummary(landed, false));
  };

  /**
   * Share to the Friends Feed.
   *
   * This was a toast reading "Sharing with friends is coming soon" while the entire backend sat finished:
   * migration 0074 gave posts an audience of FRIENDS · SQUAD · BOTH, 0076 fixed its insert policy, the
   * Friends Feed has been reading them for weeks — and `createFriendPost` was already written for exactly
   * this call. Nothing was missing but the caller.
   *
   * The "you have no friends yet" check mirrors the squad branch's courtesy: posting into an empty
   * audience succeeds and is seen by nobody, which looks identical to a failure.
   */
  const postToFriends = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const lists = await fetchFriendLists();
      if (!lists.friends.length) {
        setSharing(false);
        showToast('Add a friend first — nobody would see this yet.');
        return;
      }
      const post = composePost();
      /*
       * A COMPARE GOES AS THE FRIENDS FEED'S OWN before/after POST, not as the squad card's.
       *
       * The squad surface stores a `transformation` with one image and a `layout` describing the
       * composition. The friends card reads neither — it renders a `progress` post by finding media
       * slotted `before` and `after` and putting a draggable divider between them. Sending the squad
       * shape here would store something true and display it as a lone photo, so each surface gets the
       * post it knows how to draw.
       */
      const pair = isCompare ? usePairs[0] : null;
      await createFriendPost({
        audience: 'FRIENDS',
        squadId: null,
        type: pair ? 'progress' : undefined,
        body: post.body,
        media: pair
          ? [
              { url: pair.then.url, kind: 'image', slot: 'before' },
              { url: pair.now.url, kind: 'image', slot: 'after' },
            ]
          : post.media,
      });
      finishShare(shareSummary([], true));
    } catch (e) {
      failShare(e);
    }
  };

  const onShare = async () => {
    if (sharing) return;
    if (dest === 'squad') {
      let squads = mySquads;
      if (!squads) {
        squads = await fetchMySquads().catch(() => [] as SquadSummary[]);
        setMySquads(squads);
      }
      if (!squads.length) {
        showToast('Create or join a squad first');
        return;
      }
      // One squad is not a choice; more than one is, and it is a choice of ANY of them.
      if (squads.length === 1) {
        void postToSquads(squads);
        return;
      }
      setSquadPick(new Set());
      setSquadPickerOpen(true);
      return;
    }
    void postToFriends();
  };

  /**
   * Save the card as a real image.
   *
   * Built from exactly the state the preview above renders — the same photos, the same alignment, the
   * same toggled lines — so what lands in the athlete's downloads is what they were looking at. It is
   * COMPOSED at 1080px rather than captured, because a capture exports whatever the device happened to
   * render at whatever density it happened to use.
   */
  const onSaveImage = async () => {
    if (savingImage) return;
    setSavingImage(true);
    try {
      const pairs = isCompare ? usePairs : [];
      const result = await saveShareCard({
        photoUrls: pairs.length ? pairs.flatMap((pr) => [pr.then.url, pr.now.url]) : useShots.map((s) => s.photo.url),
        transforms: pairs.length ? pairs.flatMap((pr) => [pr.then.transform, pr.now.transform]) : [],
        template: pairs.length ? template : null,
        entryTemplate: pairs.length ? undefined : entryTemplate,
        pairCount: pairs.length,
        // One label per pair on a comparison, one per photo on a capture — the geometry says which it wants.
        poseLabels: pairs.length ? pairs.map((pr) => pr.label) : useShots.map((s) => s.label),
        thenLabel: layoutData.thenLabel,
        nowLabel: layoutData.nowLabel,
        elapsed: isCompare && elapsed ? elapsed : undefined,
        eyebrow: isCompare ? undefined : 'Transformation',
        title: isCompare ? undefined : dateLabel || undefined,
        lines: lines.filter((l) => eff(l.key)).map((l) => ({ text: l.text, emph: l.emph })),
        athlete: eff('name') ? athlete : undefined,
        fileName: `forge-legacy-${(chapterName ?? 'transformation').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      });
      setSavingImage(false);
      // The verb has to match what actually happened. Native copies the card (writing to the camera roll
      // needs a native module and therefore a new build); web downloads it. Saying "Saved" on a device
      // that copied would send the athlete to a Photos app with nothing in it.
      showToast(result.ok ? (result.via === 'clipboard' ? 'Card copied — paste it anywhere' : 'Saved to your downloads') : result.reason);
    } catch {
      setSavingImage(false);
      showToast('Couldn’t save the image.');
    }
  };

  const onSystemShare = async () => {
    const text = `${athlete}'s transformation${chapterName ? ` · ${chapterName}` : ''}`;
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as { share?: (d: { title?: string; text?: string }) => Promise<void> }) : undefined;
      if (nav?.share) {
        try {
          await nav.share({ title: 'Forge Legacy', text });
        } catch {
          /* dismissed */
        }
        return;
      }
      showToast('Sharing isn’t available here');
      return;
    }
    try {
      await Share.share({ message: text });
    } catch {
      /* dismissed */
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.scrim} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Dismiss" />
      {/* Off-screen rasteriser for Save image. react-native-svg can only snapshot a MOUNTED Svg, so the
          card has to live in this tree before it can become a PNG — see share-card-host. */}
      <ShareCardHost />
      <Animated.View onLayout={drag.onLayout} style={[styles.sheet, drag.style]}>
        <Handle pan={drag.panHandlers} />
        <View style={styles.header}>
          <Text style={styles.title}>Share Transformation</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeBtn}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          {/* ── LAYOUT (compare) ── */}
          {isCompare ? (
            <>
              <Text style={styles.sectionLabelFirst}>Layout</Text>
              <View style={styles.templateRow}>
                {TEMPLATES.map((t) => (
                  <Pressable key={t.id} onPress={() => setTemplate(t.id)} accessibilityRole="button" accessibilityState={{ selected: template === t.id }} style={[styles.tplChip, template === t.id ? styles.tplChipOn : styles.tplChipOff]}>
                    <Text style={[styles.tplChipText, template === t.id ? styles.tplChipTextOn : null]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              {allPairs.length > 1 ? (
                <>
                  <Text style={styles.poseSelectLabel}>{template === 'grid' ? 'Poses in this post' : 'Pose (grid shows all)'}</Text>
                  <View style={styles.poseSelectRow}>
                    {allPairs.map((p, i) => {
                      const on = !excluded.includes(i);
                      return (
                        <Pressable key={`${p.label}-${i}`} onPress={() => togglePose(i)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.poseSelChip, on ? styles.poseSelOn : styles.poseSelOff]}>
                          <Text style={[styles.poseSelText, on ? styles.poseSelTextOn : null]}>{p.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : allPoses.length > 1 ? (
            /* ── FORMAT (a capture with more than one pose — one pose has nothing to choose between) ── */
            <>
              <Text style={styles.sectionLabelFirst}>Format</Text>
              <View style={styles.templateRow}>
                {ENTRY_FORMATS.map((t) => (
                  <Pressable key={t.id} onPress={() => setEntryPick(t.id)} accessibilityRole="button" accessibilityState={{ selected: entryTemplate === t.id }} style={[styles.tplChip, entryTemplate === t.id ? styles.tplChipOn : styles.tplChipOff]}>
                    <Text style={[styles.tplChipText, entryTemplate === t.id ? styles.tplChipTextOn : null]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.poseSelectLabel}>{entryTemplate === 'single' ? 'Which pose' : 'Poses in this post'}</Text>
              <View style={styles.poseSelectRow}>
                {allPoses.map((p, i) => {
                  // One row, two jobs: under Single photo the chips CHOOSE, otherwise they include/exclude.
                  const on = entryTemplate === 'single' ? p.key === singlePose?.key : !excluded.includes(i);
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => (entryTemplate === 'single' ? setPosePick(p.key) : togglePose(i))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={entryTemplate === 'single' ? `Show ${p.label}` : `${on ? 'Remove' : 'Include'} ${p.label}`}
                      style={[styles.poseSelChip, on ? styles.poseSelOn : styles.poseSelOff]}
                    >
                      <Text style={[styles.poseSelText, on ? styles.poseSelTextOn : null]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* ── PREVIEW CARD ── */}
          <View style={styles.card}>
            <View style={styles.brand}>
              <View style={styles.anvilTile}>
                <AnvilGlyph />
              </View>
              <Text style={styles.brandText}>Forge Legacy</Text>
            </View>

            {isCompare ? (
              <View style={styles.compareWrap}>
                <TransformationLayout data={layoutData} />
              </View>
            ) : showPhoto ? (
              /* The same renderer the post uses, so the card here IS the card they'll see in the feed. */
              <View style={styles.compareWrap}>
                <TransformationLayout data={entryLayout} />
              </View>
            ) : (
              <View style={styles.kindGlyph}>
                <CameraGlyph />
              </View>
            )}

            {!isCompare ? (
              <View style={styles.cardTitleBlock}>
                <Text style={styles.cardEyebrow}>Transformation</Text>
                <Text style={styles.cardTitle}>{dateLabel}</Text>
              </View>
            ) : null}

            {lines.map((l) =>
              eff(l.key) ? (
                <Text key={l.key} style={[styles.line, l.emph === 'bronze' ? styles.lineBronze : l.emph === 'body' ? styles.lineBody : styles.lineMuted]}>
                  {l.emph === 'body' ? `“${l.text}”` : l.text}
                </Text>
              ) : null,
            )}

            {eff('name') ? (
              <View style={styles.cardFooter}>
                <Text style={styles.athlete}>{athlete}</Text>
              </View>
            ) : null}
          </View>

          {/* ── CARD DETAILS ── */}
          <Text style={styles.sectionLabel}>Card Details</Text>
          <View style={styles.detailCard}>
            {detailRows.map((row, i) => (
              <View key={row.key} style={[styles.detailRow, i > 0 ? styles.detailRowDiv : null]}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Switch on={eff(row.key)} onToggle={() => toggle(row.key)} label={row.label} />
              </View>
            ))}
          </View>

          {/* ── SHARE IN FORGE ── */}
          <Text style={styles.sectionLabel}>Share in Forge</Text>
          <View style={styles.destGrid}>
            <DestTile label="Squad" icon={<SquadIcon />} on={dest === 'squad'} onPress={() => setDest('squad')} />
            <DestTile label="Friends" icon={<FriendsIcon />} on={dest === 'friends'} onPress={() => setDest('friends')} />
          </View>

          {/* ── SHARE OUTSIDE FORGE ── */}
          <Text style={styles.sectionLabel}>Share outside Forge</Text>
          <View style={styles.outsideGrid}>
            <OutsideRow label="Share…" icon={<ShareDots />} onPress={onSystemShare} />
            <OutsideRow label="Save image" icon={<SaveIcon />} onPress={() => void onSaveImage()} />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable onPress={onShare} disabled={sharing} accessibilityRole="button" accessibilityLabel={destVerb[dest]} style={styles.cta}>
            <ShareDots color="#F7F5F1" />
            <Text style={styles.ctaText}>{sharing ? 'Sharing…' : destVerb[dest]}</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ⚠ THE ROW TAPS NO LONGER POST. This was a list of buttons: tapping a name shared to it and shut
          the modal, so two squads meant walking the whole screen twice. It is a checkbox list with a
          confirm now, which is the only shape that can express "these two but not that one". */}
      <Modal visible={squadPickerOpen} transparent animationType="fade" onRequestClose={() => setSquadPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setSquadPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Share to which squads?</Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              <SquadSelectList squads={mySquads ?? []} selected={squadPick} onChange={setSquadPick} disabled={sharing} />
            </ScrollView>
            <Pressable
              onPress={() => void postToSquads(selectedSquads(mySquads ?? [], squadPick))}
              disabled={sharing || squadPick.size === 0}
              accessibilityRole="button"
              accessibilityLabel={shareVerb(squadPick.size, false)}
              style={[styles.pickerCta, sharing || squadPick.size === 0 ? styles.pickerCtaOff : null]}
            >
              <Text style={styles.pickerCtaText}>{sharing ? 'Sharing…' : shareVerb(squadPick.size, false)}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Handle({ pan }: { pan?: GestureResponderHandlers }) {
  return (
    // The pan is spread onto the ROW, not the 5px bar — a bar that thin is a picture, not a target.
    <View style={styles.handleWrap} {...(pan ?? {})}>
      <View style={styles.handle} />
    </View>
  );
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} style={[styles.switch, on ? styles.switchOn : styles.switchOff]}>
      <View style={[styles.switchKnob, on ? styles.switchKnobOn : styles.switchKnobOff]} />
    </Pressable>
  );
}

function DestTile({ label, icon, on, onPress }: { label: string; icon: React.ReactNode; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} style={[styles.destTile, on ? styles.destTileOn : styles.destTileOff]}>
      <View style={[styles.destIcon, on ? styles.destIconOn : styles.destIconOff]}>{icon}</View>
      <Text style={[styles.destLabel, on ? styles.destLabelOn : null]}>{label}</Text>
    </Pressable>
  );
}

function OutsideRow({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.outsideRow}>
      <View style={styles.outsideIcon}>{icon}</View>
      <Text style={styles.outsideLabel}>{label}</Text>
    </Pressable>
  );
}

// ── glyphs ──
function AnvilGlyph() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill={flColor.onBronze}>
      <Path d="M10.9 3.2H13.1V15H10.9Z" />
      <Path d="M7.6 7.1L9.6 5.8V15H7.6Z" />
      <Path d="M16.4 7.1L14.4 5.8V15H16.4Z" />
      <Path d="M6.8 15.4H17.2V16.2H6.8Z" />
      <Path d="M5.6 16.6H18.4V17.4H5.6Z" />
      <Path d="M4.4 17.8H19.6V18.6H4.4Z" />
    </Svg>
  );
}
function CameraGlyph() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h3.4l1.2-2h6.8L16.6 7H20v12H4z" />
      <Circle cx={12} cy={13} r={3.2} />
    </Svg>
  );
}
function SquadIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
      <Path d="M3 19v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <Path d="M16 5.5a3 3 0 0 1 0 6M18 14h.5a4 4 0 0 1 4 4v1" />
    </Svg>
  );
}
function FriendsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={3.4} />
      <Path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}
function SaveIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 4v11M8 11l4 4 4-4M5 19h14" />
    </Svg>
  );
}
function ShareDots({ color = flColor.bronze300 }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,5,7,0.6)' },
  sheet: { maxHeight: '95%', backgroundColor: '#111214', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, borderColor: flColor.charcoal500, boxShadow: '0 -30px 70px rgba(0,0,0,0.6)' },

  /** ~22px of grabbable height around the drawn bar — see `useSheetDrag`. */
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 44, height: 5, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal500 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },

  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 20 },
  missingWrap: { padding: 40, alignItems: 'center' },
  missingText: { fontSize: 14, color: flColor.gray400, textAlign: 'center' },

  // layout picker
  sectionLabelFirst: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 4, marginBottom: 10, marginLeft: 2 },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tplChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: flRadius.pill, borderWidth: 1 },
  tplChipOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  tplChipOff: { backgroundColor: flColor.charcoal900, borderColor: flColor.charcoal600 },
  tplChipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  tplChipTextOn: { color: flColor.bronze300 },
  poseSelectLabel: { fontSize: 10, color: flColor.gray600, marginTop: 12, marginBottom: 8, marginLeft: 2 },
  poseSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  poseSelChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: flRadius.pill, borderWidth: 1 },
  poseSelOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  poseSelOff: { backgroundColor: 'transparent', borderColor: flColor.charcoal600 },
  poseSelText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  poseSelTextOn: { color: flColor.bronze300 },

  // preview card
  card: { alignSelf: 'center', width: '100%', maxWidth: 300, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#0d0b09', padding: 18, alignItems: 'center', boxShadow: flShadow.borderInset, marginTop: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  anvilTile: { width: 20, height: 20, borderRadius: 6, backgroundColor: flColor.bronzeSolid, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 10, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.gray400 },

  compareWrap: { alignSelf: 'stretch' },
  kindGlyph: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.glowSubtle },

  cardTitleBlock: { alignItems: 'center', marginTop: 16 },
  cardEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  cardTitle: { marginTop: 4, fontFamily: flFont.display, fontSize: 25, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100, textAlign: 'center' },
  line: { textAlign: 'center', maxWidth: '100%' },
  lineBronze: { marginTop: 12, fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },
  lineBody: { marginTop: 9, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  lineMuted: { marginTop: 5, fontSize: 11, color: flColor.gray600 },
  cardFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, alignSelf: 'stretch', alignItems: 'center' },
  athlete: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },

  sectionLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 24, marginBottom: 10, marginLeft: 2 },
  detailCard: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 15 },
  detailRowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  detailLabel: { fontSize: 14, color: flColor.cream100 },
  switch: { width: 44, height: 26, borderRadius: flRadius.pill, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 2 },
  switchOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder, alignItems: 'flex-end' },
  switchOff: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal600, alignItems: 'flex-start' },
  switchKnob: { width: 18, height: 18, borderRadius: 9 },
  switchKnobOn: { backgroundColor: flColor.bronze300 },
  switchKnobOff: { backgroundColor: flColor.charcoal500 },

  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  destTile: { width: '47%', flexGrow: 1, alignItems: 'center', gap: 9, paddingVertical: 16, borderRadius: flRadius.lg, borderWidth: 1 },
  destTileOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  destTileOff: { borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  destIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  destIconOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  destIconOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  destLabel: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  destLabelOn: { color: flColor.bronze300 },

  outsideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outsideRow: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  outsideIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  outsideLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },

  footer: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.card },
  ctaText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4, color: '#F7F5F1' },

  pickerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  pickerCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, paddingVertical: 20, paddingHorizontal: 20, boxShadow: flShadow.ambient },
  pickerTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, marginBottom: 12 },
  pickerScroll: { maxHeight: 300 },
  pickerCta: { marginTop: 16, alignItems: 'center', paddingVertical: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A' },
  pickerCtaOff: { opacity: 0.45 },
  pickerCtaText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: '#F7F5F1' },
});
