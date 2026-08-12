import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  addTransformationEntry,
  fetchActiveChapter,
  fetchTransformationEntry,
  updateTransformationEntry,
  uploadTransformationMedia,
  XFORM_POSES,
  XFORM_TAGS,
  type PhotoMap,
  type PoseKey,
} from '@/data/transformation-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * New / Edit Progress Set — built to the Add overlay of `Forge Transformation.dc.html`, wired to real
 * storage. Photos/video upload to `transformation-media` at capture time (the design saves media the instant
 * it's dropped); the entry row is written on Save. New entries tie to the active chapter; edit updates in
 * place. Save gate needs substance (a photo, video, or reflection) — tags/date/context alone aren't enough.
 */

export default function TransformationAddRoute() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();
  /* ⚠ GALLERY ENTRIES SHARE THE ONE ACCOUNT-WIDE PHOTO COUNTER (MA3-D8) — six poses in an entry are
     six photos, because six photos is what gets stored. That is the question
     `Transformation-Gallery-Architecture` left open and Amendment 003 closes, and it is also what makes
     75 the right number: 6 poses × 12 monthly entries = 72, plus 3 spare. Video is its own counter. */
  const guard = usePremiumGate();
  const isEdit = !!editId;

  // Stable per-session draft id → the storage path prefix (the entry id in edit mode).
  const [draftId] = useState(() => String(editId ?? `xf-${Date.now()}`));
  const { data: existing, loading: loadingEntry } = useQuery(() => (isEdit ? fetchTransformationEntry(String(editId)) : Promise.resolve(null)), [editId]);
  const { data: activeChapter } = useQuery(() => (isEdit ? Promise.resolve(null) : fetchActiveChapter()), [editId]);

  const [ready, setReady] = useState(false);
  const [date, setDate] = useState('');
  const [caption, setCaption] = useState('');
  const [meta, setMeta] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<PoseKey | 'video' | null>(null);
  const [saving, setSaving] = useState(false);
  const [captionFocus, setCaptionFocus] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Prefill once the edit target loads (derive-then-seed via a ready flag — no effect setState churn).
  if (isEdit && existing && !ready) {
    setDate(existing.label);
    setCaption(existing.caption ?? '');
    setMeta(existing.meta ?? '');
    setTags(existing.tags);
    setPhotos(existing.photos);
    setVideoUrl(existing.videoUrl);
    setReady(true);
  }

  const chapterName = isEdit ? existing?.chapterName ?? 'this chapter' : activeChapter?.name ?? 'your active chapter';
  const poseFilled = Object.keys(photos).length;
  const canSave = poseFilled > 0 || !!videoUrl || caption.trim().length > 0 || isEdit;

  const pickPose = async (key: PoseKey) => {
    if (uploading) return;
    // Pre-action (M-7 §2): before the picker, never after a photo has been chosen and uploaded.
    if (!guard('photos')) return;
    const asset = await pick({ kind: 'images', title: 'Add a photo', quality: 0.8 });
    if (!asset?.uri) return;
    setUploading(key);
    try {
      const url = await uploadTransformationMedia(draftId, key, asset.uri, 'image');
      setPhotos((p) => ({ ...p, [key]: url }));
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setUploading(null);
    }
  };
  const removePose = (key: PoseKey) =>
    setPhotos((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  const pickVideo = async () => {
    if (uploading) return;
    if (!guard('videos')) return;
    const asset = await pick({ kind: 'videos', title: 'Add a video' });
    if (!asset?.uri) return;
    setUploading('video');
    try {
      const url = await uploadTransformationMedia(draftId, 'video', asset.uri, 'video');
      setVideoUrl(url);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setUploading(null);
    }
  };
  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const addCustom = () => {
    const v = customInput.trim();
    if (v && !tags.some((t) => t.toLowerCase() === v.toLowerCase())) setTags((cur) => [...cur, v]);
    setCustomInput('');
    setCustomOpen(false);
  };

  const save = () => {
    if (!canSave || saving || uploading) return;
    setSaving(true);
    if (isEdit) {
      updateTransformationEntry(String(editId), { label: date, caption, meta, tags, photos, videoUrl }).then(
        () => router.replace({ pathname: '/transformation/[id]', params: { id: String(editId) } }),
        (e: unknown) => {
          setSaving(false);
          showToast(errorMessage(e));
        },
      );
    } else {
      addTransformationEntry({ label: date, caption, meta, tags, photos, videoUrl, chapterId: activeChapter?.id ?? null }).then(
        () => {
          showToast('Saved to your gallery');
          router.back();
        },
        (e: unknown) => {
          setSaving(false);
          showToast(errorMessage(e));
        },
      );
    }
  };

  if (isEdit && loadingEntry && !existing) {
    return (
      <View style={styles.root}>
        <TopBar title="Edit Progress Set" onClose={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar title={isEdit ? 'Edit Progress Set' : 'New Progress Set'} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.tiedRow}>
          <Text style={styles.tiedText}>
            Tied to <Text style={styles.tiedName}>{chapterName}</Text>
          </Text>
          <Text style={styles.poseCount}>{poseFilled} of 6 poses</Text>
        </View>
        <Text style={styles.reassure}>Capture the poses you want. Every photo is optional — what matters is preserving the moment.</Text>

        <Text style={styles.fieldLabel}>Capture date</Text>
        <TextInput value={date} onChangeText={setDate} placeholder="e.g. Mar 6, 2026" placeholderTextColor={flColor.gray600} style={styles.input} accessibilityLabel="Capture date" />

        <View style={styles.poseGrid}>
          {XFORM_POSES.map((p) => (
            <View key={p.key} style={styles.poseCell}>
              <PoseSlot url={photos[p.key]} uploading={uploading === p.key} onPick={() => pickPose(p.key)} onRemove={() => removePose(p.key)} />
              <Text style={styles.poseLabel}>{p.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <PlayGlyph color={flColor.bronze400} size={14} />
          <Text style={styles.sectionLabel}>Posing video · optional</Text>
        </View>
        <VideoSlot url={videoUrl} uploading={uploading === 'video'} onPick={pickVideo} onRemove={() => setVideoUrl(null)} />

        <Text style={[styles.sectionLabel, styles.tagsLabel]}>Tags · optional</Text>
        <Text style={styles.tagsHelp}>What kind of moment this is — used to flag your archive later.</Text>
        <View style={styles.tagRow}>
          {[...XFORM_TAGS, ...tags.filter((t) => !XFORM_TAGS.includes(t))].map((t) => {
            const on = tags.includes(t);
            return (
              <Pressable key={t} onPress={() => toggleTag(t)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.tagChip, on ? styles.tagChipOn : null]}>
                <Text style={[styles.tagChipText, on ? styles.tagChipTextOn : null]}>{t}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setCustomOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Add a custom tag" style={[styles.tagChip, styles.tagChipCustom]}>
            <Text style={styles.tagChipCustomText}>+ Custom</Text>
          </Pressable>
        </View>
        {customOpen ? (
          <View style={styles.customRow}>
            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Name your tag"
              placeholderTextColor={flColor.gray600}
              maxLength={24}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addCustom}
              style={styles.customInput}
              accessibilityLabel="Custom tag"
            />
            <Pressable onPress={addCustom} disabled={!customInput.trim()} accessibilityRole="button" accessibilityLabel="Add tag" style={[styles.customAdd, customInput.trim() ? styles.customAddOn : styles.customAddOff]}>
              <Text style={[styles.customAddText, customInput.trim() ? styles.customAddTextOn : styles.customAddTextOff]}>Add</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.reflHead}>
          <Text style={styles.reflQuote}>“</Text>
          <Text style={styles.sectionLabel}>Reflection · optional</Text>
        </View>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          onFocus={() => setCaptionFocus(true)}
          onBlur={() => setCaptionFocus(false)}
          placeholder="A note to your future self…"
          placeholderTextColor={flColor.gray600}
          multiline
          textAlignVertical="top"
          style={[styles.reflInput, captionFocus ? styles.reflInputFocus : null]}
          accessibilityLabel="Reflection"
        />

        <Text style={[styles.sectionLabel, styles.tagsLabel]}>Context · optional</Text>
        <TextInput value={meta} onChangeText={setMeta} placeholder="e.g. 183 lb · Week 12 · Morning" placeholderTextColor={flColor.gray600} style={styles.input} accessibilityLabel="Context" />
        <Text style={styles.tagsHelp}>Bodyweight, prep phase, week, lighting — whatever you’ll want to remember years from now.</Text>

        <View style={styles.saveWrap}>
          <Pressable onPress={save} disabled={!canSave || saving || !!uploading} accessibilityRole="button" accessibilityLabel="Save" style={[styles.saveBtn, canSave ? styles.saveBtnOn : styles.saveBtnOff]}>
            <Text style={[styles.saveText, canSave ? styles.saveTextOn : styles.saveTextOff]}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Progress Set'}</Text>
          </Pressable>
          <Text style={styles.saveHint}>{canSave ? `Saved to ${chapterName}` : 'Add a photo, video, or reflection to save'}</Text>
        </View>
      </ScrollView>

      {mediaPickerSheet}
    </View>
  );
}

function TopBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.topBtn} hitSlop={6}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>
      <Text style={styles.topTitle}>{title}</Text>
      <View style={styles.topBtn} />
    </View>
  );
}

function PoseSlot({ url, uploading, onPick, onRemove }: { url?: string; uploading: boolean; onPick: () => void; onRemove: () => void }) {
  if (uploading) {
    return (
      <View style={[styles.slot, styles.slotBusy]}>
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  }
  if (url) {
    return (
      <View style={styles.slotFilled}>
        <Image source={{ uri: url }} style={styles.slotImage} contentFit="cover" />
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove photo" style={styles.slotRemove} hitSlop={6}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel="Add photo" style={[styles.slot, styles.slotEmpty]}>
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.55}>
        <Path d="M4 7h3.4l1.2-2h6.8L16.6 7H20v12H4z" />
        <Circle cx={12} cy={13} r={3.1} />
      </Svg>
    </Pressable>
  );
}

function VideoSlot({ url, uploading, onPick, onRemove }: { url: string | null; uploading: boolean; onPick: () => void; onRemove: () => void }) {
  if (uploading) {
    return (
      <View style={[styles.videoSlot, styles.slotBusy]}>
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  }
  if (url) {
    return (
      <View style={[styles.videoSlot, styles.videoFilled]}>
        <View style={styles.playDisc}>
          <PlayGlyph color={flColor.bronze300} size={18} />
        </View>
        <Text style={styles.videoText}>Clip attached</Text>
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove clip" style={styles.slotRemove} hitSlop={6}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel="Add a clip" style={[styles.videoSlot, styles.videoEmpty]}>
      <PlayGlyph color={flColor.bronze400} size={26} />
      <Text style={styles.videoEmptyText}>Tap to add a clip</Text>
    </Pressable>
  );
}

function PlayGlyph({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

const DASH = { borderStyle: 'dashed' as const };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070707' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 },

  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.cream100 },

  tiedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tiedText: { fontSize: 11, fontWeight: '600', color: flColor.gray400 },
  tiedName: { color: flColor.bronze300, fontWeight: '700' },
  poseCount: { fontSize: 10.5, fontWeight: '600', color: flColor.gray600 },
  reassure: { marginTop: 8, fontSize: 13, lineHeight: 20, color: flColor.gray600 },

  fieldLabel: { marginTop: 18, marginBottom: 8, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  input: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, color: flColor.cream100, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },

  poseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 22, marginTop: 22 },
  poseCell: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 10 },
  slot: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.xl, alignItems: 'center', justifyContent: 'center' },
  slotEmpty: { borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(186, 134, 84,0.06)', ...DASH },
  slotBusy: { borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  slotFilled: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, position: 'relative' },
  slotImage: { width: '100%', height: '100%' },
  slotRemove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  poseLabel: { fontSize: 10, fontWeight: '600', color: flColor.gray400, textAlign: 'center' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 28, paddingBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  tagsLabel: { paddingTop: 28, paddingBottom: 4 },
  videoSlot: { width: '100%', height: 132, borderRadius: flRadius.xl, alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' },
  videoEmpty: { borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(186, 134, 84,0.06)', ...DASH },
  videoFilled: { borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: '#171009' },
  videoEmptyText: { fontSize: 12, color: flColor.gray600 },
  videoText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  playDisc: { width: 44, height: 44, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder },

  tagsHelp: { marginTop: 0, marginBottom: 11, fontSize: 10.5, lineHeight: 15, color: flColor.gray600 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: 'transparent' },
  tagChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  tagChipText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  tagChipTextOn: { color: flColor.bronze300 },
  tagChipCustom: { borderColor: flColor.bronzeBorder, borderStyle: 'dashed', backgroundColor: 'transparent' },
  tagChipCustomText: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  customInput: { flex: 1, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, color: flColor.cream100, fontSize: 13.5, paddingHorizontal: 13, paddingVertical: 10 },
  customAdd: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: flRadius.md, borderWidth: 1 },
  customAddOn: { borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A' },
  customAddOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  customAddText: { fontSize: 13, fontWeight: '700' },
  customAddTextOn: { color: flColor.bronze300 },
  customAddTextOff: { color: flColor.gray600 },

  reflHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 28, paddingBottom: 11 },
  reflQuote: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', lineHeight: 22, color: flColor.bronze400 },
  reflInput: {
    minHeight: 100,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 14,
    fontFamily: flFont.display,
    fontStyle: 'italic',
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  reflInputFocus: { minHeight: 134, borderColor: flColor.bronzeBorder },

  saveWrap: { marginTop: 24 },
  saveBtn: { paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, alignItems: 'center' },
  saveBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.glowSubtle },
  saveBtnOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  saveTextOn: { color: flColor.bronze300 },
  saveTextOff: { color: flColor.gray600 },
  saveHint: { marginTop: 9, textAlign: 'center', fontSize: 9.5, letterSpacing: 0.2, color: flColor.gray600, opacity: 0.75 },
});
