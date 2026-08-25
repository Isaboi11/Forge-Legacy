import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import type { ProgressCardPhoto, ProgressPostCard as ProgressCardData } from '@/data/squad-feed-live';
import { PREVIEW_W, clampIndex, formatSpec, gridColumns } from '@/domain/share/progress-card';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * The Progress Photo Post card — the ONE renderer, used by the composer's live preview, the squad feed
 * and the post detail. There is no separate in-app layout: what the athlete previews is what squadmates
 * see is what gets exported.
 *
 * AUTHORED AT 300, SCALED BY WIDTH. Every literal here is in the design's 300pt units and multiplied by
 * `width / 300`, which is the same rule the exporter follows at 3.6× (`domain/share/progress-card.ts`).
 * That is why the card can be dropped into a feed row at 280pt and a preview at 300pt and stay itself
 * rather than becoming a smaller card with the same 9px type.
 *
 * Two styles. GRID is one card holding up to four photos, its column count derived from how many were
 * chosen. HERO is one photo per slide, swiped like an Instagram carousel, and every slide carries the
 * full chrome so a single slide saved on its own still reads as a complete Forge card.
 */

export interface ProgressPostCardProps {
  card: ProgressCardData;
  /** Rendered width. Height follows the card's format — 1:1 or 4:5, never approximated. */
  width: number;
  /** Reported as the carousel is swiped, so a caller can mirror the active slide. Hero only. */
  onSlideChange?: (index: number) => void;
}

export function ProgressPostCard({ card, width, onSlideChange }: ProgressPostCardProps) {
  const s = width / PREVIEW_W;
  const height = width * formatSpec(card.format).ratio;

  return (
    <View style={[styles.card, { width, height, borderRadius: flRadius.lg * s }]}>
      {/* The forge-light-from-above rule: the sheen enters top-left and is gone by 46%. */}
      <LinearGradient
        colors={[flColor.bronzeTint, 'transparent'] as const}
        locations={[0, 0.46] as const}
        start={{ x: 0.22, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {card.style === 'hero' ? <HeroCard card={card} s={s} w={width} h={height} onSlideChange={onSlideChange} /> : <GridCard card={card} s={s} />}
    </View>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function GridCard({ card, s }: { card: ProgressCardData; s: number }) {
  const cols = gridColumns(card.photos.length);
  const rows: ProgressCardPhoto[][] = [];
  for (let i = 0; i < card.photos.length; i += cols) rows.push(card.photos.slice(i, i + cols));
  const showFooter = card.incl.name || card.incl.meta || card.incl.chapter;

  return (
    <View style={{ flex: 1, padding: 16 * s }}>
      <View style={[styles.row, { gap: 7 * s, marginBottom: 12 * s }]}>
        <ForgeMark size={17 * s} />
        <Text style={[styles.wordmark, { flex: 1, fontSize: 8.5 * s, letterSpacing: 2.2 * s }]}>FORGE LEGACY</Text>
        {card.incl.date ? <Text style={[styles.gridDate, { fontSize: 9 * s, letterSpacing: 0.9 * s }]}>{card.date.toUpperCase()}</Text> : null}
      </View>

      <View style={{ flex: 1, gap: 6 * s }}>
        {rows.map((r, ri) => (
          <View key={`r${ri}`} style={{ flex: 1, flexDirection: 'row', gap: 6 * s }}>
            {r.map((p, ci) => (
              <Tile key={`${p.pose}-${ri}-${ci}`} photo={p} s={s} showPose={card.incl.pose} />
            ))}
          </View>
        ))}
      </View>

      {showFooter ? (
        <View style={[styles.footerRow, { gap: 10 * s, marginTop: 12 * s }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 * s }}>
            {card.incl.name ? <Text style={[styles.athlete, { fontSize: 14 * s }]}>{card.athlete}</Text> : null}
            {card.incl.meta && card.meta ? <Text style={[styles.meta, { fontSize: 9.5 * s }]}>{card.meta}</Text> : null}
          </View>
          {card.incl.chapter && card.chapter ? <Text style={[styles.chapter, { fontSize: 8.5 * s, letterSpacing: 1.2 * s }]}>{card.chapter.toUpperCase()}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/** One grid cell. `cover` and centred: a standing figure survives a centre crop even in a narrow 3-up. */
function Tile({ photo, s, showPose }: { photo: ProgressCardPhoto; s: number; showPose: boolean }) {
  return (
    <View style={[styles.tile, { flex: 1, borderRadius: 8 * s }]}>
      {photo.url ? <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <EmptyCell s={s} />}
      {showPose && photo.short ? (
        <View style={[styles.poseChip, { left: 6 * s, bottom: 5 * s, paddingVertical: 2 * s, paddingHorizontal: 6 * s }]}>
          <Text style={[styles.poseChipText, { fontSize: 7.5 * s, letterSpacing: 0.8 * s }]}>{photo.short.toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A pose with no photo behind it. The card still composes — it does not collapse to a smaller grid. */
function EmptyCell({ s }: { s: number }) {
  return (
    <View style={styles.center}>
      <CameraGlyph size={Math.max(10, 22 * s)} />
    </View>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroCard({ card, s, w, h, onSlideChange }: { card: ProgressCardData; s: number; w: number; h: number; onSlideChange?: (i: number) => void }) {
  const [idx, setIdx] = useState(0);
  const active = clampIndex(idx, card.photos.length);
  const multi = card.photos.length > 1;

  /**
   * The active slide is DERIVED FROM SCROLL POSITION, never from a tap. The dots below are an
   * indicator; making them a control would let the two disagree the moment a swipe lands between them.
   */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    if (!layoutMeasurement.width) return;
    const next = clampIndex(Math.round(contentOffset.x / layoutMeasurement.width), card.photos.length);
    if (next !== active) {
      setIdx(next);
      onSlideChange?.(next);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/*
        Slides are sized in POINTS, not `100%`. A horizontal ScrollView's content box is unbounded on the
        main axis, so a percentage width there has nothing to resolve against and the slides collapse.
      */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={StyleSheet.absoluteFill}>
        {card.photos.map((p, i) => (
          <HeroSlide key={`${p.pose}-${i}`} card={card} photo={p} s={s} w={w} h={h} counter={multi ? `${i + 1}/${card.photos.length}` : null} />
        ))}
      </ScrollView>

      {multi ? (
        <View style={[styles.dots, { bottom: 12 * s, gap: 5 * s }]} pointerEvents="none">
          {card.photos.map((p, i) => (
            <View key={`d${p.pose}-${i}`} style={[styles.dot, { width: 5 * s, height: 5 * s, borderRadius: 2.5 * s }, i === active ? styles.dotOn : styles.dotOff]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeroSlide({ card, photo, s, w, h, counter }: { card: ProgressCardData; photo: ProgressCardPhoto; s: number; w: number; h: number; counter: string | null }) {
  const shadow = { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };
  return (
    <View style={[styles.slide, { width: w, height: h }]}>
      {photo.url ? <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <EmptyCell s={s * 2} />}
      <LinearGradient
        colors={['rgba(6,6,7,0.62)', 'rgba(6,6,7,0)', 'rgba(6,6,7,0.18)', 'rgba(6,6,7,0.9)'] as const}
        locations={[0, 0.3, 0.52, 1] as const}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.heroTop, { top: 16 * s, left: 16 * s, right: 16 * s, gap: 7 * s }]} pointerEvents="none">
        <ForgeMark size={17 * s} />
        <Text style={[styles.heroWordmark, { flex: 1, fontSize: 8.5 * s, letterSpacing: 2.2 * s }, shadow]}>FORGE LEGACY</Text>
        {card.incl.pose && photo.short ? (
          <View style={[styles.heroChip, { paddingVertical: 2 * s, paddingHorizontal: 7 * s }]}>
            <Text style={[styles.heroChipText, { fontSize: 7.5 * s, letterSpacing: 0.9 * s }]}>{photo.short.toUpperCase()}</Text>
          </View>
        ) : null}
        {counter ? (
          <View style={[styles.heroCounter, { paddingVertical: 2 * s, paddingHorizontal: 7 * s }]}>
            <Text style={[styles.heroCounterText, { fontSize: 8 * s, letterSpacing: 0.4 * s }]}>{counter}</Text>
          </View>
        ) : null}
      </View>

      {/* bottom:30 clears the dot row at 12 — that is why it is not 16. */}
      <View style={[styles.heroBottom, { left: 18 * s, right: 18 * s, bottom: 30 * s, gap: 4 * s }]} pointerEvents="none">
        {card.incl.date ? (
          <Text style={[styles.heroDate, { fontSize: 27 * s, letterSpacing: -0.6 * s, lineHeight: 27 * s }, { textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14 }]}>{card.date}</Text>
        ) : null}
        {card.incl.meta && card.meta ? <Text style={[styles.heroMeta, { fontSize: 10 * s }, shadow]}>{card.meta}</Text> : null}
        {card.incl.name || (card.incl.chapter && card.chapter) ? (
          <View style={[styles.row, { gap: 7 * s, marginTop: 4 * s }]}>
            {card.incl.name ? <Text style={[styles.heroName, { fontSize: 11 * s }, shadow]}>{card.athlete}</Text> : null}
            {card.incl.chapter && card.chapter ? (
              <>
                {card.incl.name ? <View style={[styles.heroDot, { width: 3 * s, height: 3 * s, borderRadius: 1.5 * s }]} /> : null}
                <Text style={[styles.heroChapter, { fontSize: 8.5 * s, letterSpacing: 1.2 * s }, shadow]}>{card.chapter.toUpperCase()}</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── glyphs ────────────────────────────────────────────────────────────────────

function ForgeMark({ size }: { size: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.235 }]}>
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill={flColor.onBronze}>
        <Path d="M10.9 3.2H13.1V15H10.9Z" />
        <Path d="M7.6 7.1L9.6 5.8V15H7.6Z" />
        <Path d="M16.4 7.1L14.4 5.8V15H16.4Z" />
        <Path d="M6.8 15.4H17.2V16.2H6.8Z" />
        <Path d="M5.6 16.6H18.4V17.4H5.6Z" />
        <Path d="M4.4 17.8H19.6V18.6H4.4Z" />
      </Svg>
    </View>
  );
}

export function CameraGlyph({ size = 14, color = flColor.charcoal500 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#0A0A0B' },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  wordmark: { fontWeight: '700', textTransform: 'uppercase', color: flColor.gray400 },
  gridDate: { fontWeight: '700', textTransform: 'uppercase', color: flColor.bronze300 },

  tile: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  poseChip: { position: 'absolute', borderRadius: flRadius.pill, backgroundColor: 'rgba(6,6,7,0.72)' },
  poseChipText: { fontWeight: '700', textTransform: 'uppercase', color: flColor.gray400 },

  footerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  athlete: { fontFamily: flFont.display, fontWeight: '700', letterSpacing: -0.2, color: flColor.onMedia },
  meta: { color: flColor.onMedia },
  chapter: { fontWeight: '700', textTransform: 'uppercase', color: flColor.bronze400 },

  slide: { position: 'relative', overflow: 'hidden' },
  heroTop: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  heroWordmark: { fontWeight: '700', textTransform: 'uppercase', color: 'rgba(240,238,234,0.82)' },
  heroChip: { borderRadius: flRadius.pill, backgroundColor: 'rgba(6,6,7,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heroChipText: { fontWeight: '700', textTransform: 'uppercase', color: 'rgba(240,238,234,0.9)' },
  heroCounter: { borderRadius: flRadius.pill, backgroundColor: 'rgba(6,6,7,0.62)' },
  heroCounterText: { fontWeight: '600', color: 'rgba(240,238,234,0.92)' },

  heroBottom: { position: 'absolute' },
  heroDate: { fontFamily: flFont.display, fontWeight: '700', color: '#F7F5F1' },
  heroMeta: { color: 'rgba(240,238,234,0.72)' },
  heroName: { fontWeight: '600', color: '#F0EEEA' },
  heroDot: { backgroundColor: 'rgba(240,238,234,0.45)' },
  heroChapter: { fontWeight: '700', textTransform: 'uppercase', color: flColor.bronze300 },

  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { boxShadow: '0 1px 3px rgba(0,0,0,0.6)' },
  dotOn: { backgroundColor: flColor.bronze300 },
  dotOff: { backgroundColor: 'rgba(240,238,234,0.34)' },

  mark: { alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeSolid },
});
