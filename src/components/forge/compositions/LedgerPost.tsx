/**
 * LedgerPost — one post, rendered identically on the Friends feed and the Squad feed.
 *
 * ══ THE FEED IS A LEDGER, NOT A STACK OF CARDS ══
 *
 * Both feeds used to draw every post as a rounded, bordered, shadowed card with a SECOND bronze-tinted
 * container nested inside it for the workout numbers. Two containers deep, on a screen whose entire
 * visual language is already "forged surface" — so it read as boxes inside boxes, bronze stopped meaning
 * anything because it was on everything, and roughly 40% of each post's height was chrome. Posts are
 * separated by hairlines now, not walls.
 *
 * Bronze appears in exactly three places in a post: the type icon, the type label, and the stat labels.
 * Nowhere else — not on borders, not on backgrounds, not on the author's name, not on a timestamp, and
 * not on the action row until somebody actually acknowledges something.
 *
 * ══ ONE COMPONENT, BECAUSE THE RULES ARE THE SAME AND THE SCREENS ARE NOT ══
 *
 * The two feeds keep their own screens, their own queries and their own tables — `friends_feed` and
 * `squad_feed` have different shapes and stay that way. What they must not have is two copies of the
 * layout: that is exactly how the recap strip drifted before `RecapStrip` was extracted, and there are
 * far more rules here than four numbers. Each screen maps its own row into these props; everything
 * below this line is decided once.
 *
 * ⚠ THE MEDIA RULES ARE ENFORCED HERE, NOT ASKED FOR. A post with media renders no type marker, no
 * title and no stat row, whatever the caller passes — the image announces what the post is, and a
 * `PHOTO` label above a photo is the same mistake as the nested container. A caller cannot get that
 * wrong because it is not a prop.
 *
 * ⚠ WITH ONE EXCEPTION, AND IT IS THE SAME RULE READ PROPERLY: **a post carrying STATS keeps its body.**
 * "The image announces what the post is" holds when the image is the subject. A photo taken after a
 * session is evidence attached to one — it announces nothing about volume, time or lifts — so applying
 * the suppression there deletes the post's content and leaves a picture where a workout was. See
 * `showBody`. Nothing shipped before this passed both, so it enables a combination rather than
 * loosening the rule.
 */

import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import { Avatar } from '@/components/forge/composites/Avatar';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { displayWeight, type UnitSystem } from '@/domain/settings/units';
import { SERVICE_LABEL, type WorkoutPlaylistLink } from '@/domain/workout/playlist';
import { artLabel } from '@/domain/workout/playlist-art';
import { usePlaylistArt } from '@/lib/usePlaylistArt';
import { fmtDuration, type WorkoutSummary } from '@/data/squad-feed-live';

/** The 18px gutter every non-media block sits on. Media ignores it — see `bleed`. */
export const LEDGER_GUTTER = 18;

export type LedgerMarker = 'workout' | 'pr' | 'goal' | 'formcheck' | 'milestone' | 'announcement' | 'transformation';

export interface LedgerStat {
  value: string;
  label: string;
}

export interface LedgerMediaItem {
  url: string;
  kind: 'image' | 'video';
}

export interface LedgerPostProps {
  authorName: string;
  authorAvatarUrl: string | null;
  /** `Friends`, `Friends & Squad`, or the squad's name. Null when the screen already says it. */
  audience: string | null;
  time: string;
  marker: { kind: LedgerMarker; label: string } | null;
  title: string | null;
  /** `<Program> · Week N · Day N`, or `Target established <date>`. */
  context: string | null;
  /** At most three — Volume · Time · Lifts. Anything past that is trimmed here rather than by the caller. */
  stats?: LedgerStat[];
  playlist?: WorkoutPlaylistLink | null;
  caption: string | null;
  media?: LedgerMediaItem[];
  /**
   * A media band the caller draws itself, in place of the standard one — the before/after comparison
   * with its draggable divider, and the composed Progress Photo card.
   *
   * It counts as media for every rule above: a post carrying one renders no type marker, no title and
   * no stat row, and its caption lands underneath. That is the point of the slot rather than a second
   * code path — the exception is the ART, never the rules around it.
   */
  customMedia?: ReactNode;
  /**
   * Squad feed only: the one-line who-did-what sentence. Rendered ONLY above media, because on a post
   * with no photo it repeats the header and the type marker directly under both of them.
   */
  attribution?: string | null;
  /**
   * How far each side of the media must be pulled to reach the edge it is bleeding to — the screen on
   * the Friends feed (0, the scroller has no horizontal padding) and the card on the Squad feed.
   *
   * Passed rather than measured: a hardcoded `screenWidth - 40` goes silently wrong the first time a
   * padding above it changes, and there is no way for this component to know what encloses it.
   */
  bleed?: number;
  acknowledged: boolean;
  acknowledgeCount: number;
  commentCount: number;
  /** The almost-invisible surface shift on every other row. Remove it the moment it reads as banding. */
  alt?: boolean;
  busy?: boolean;
  onAuthor?: () => void;
  onOpen?: () => void;
  onAcknowledge: () => void;
  /**
   * Press-and-hold on Acknowledge. The Friends feed uses it to reach the four kinds (SOC-D11) that the
   * single-tap row can no longer ask about; the Squad feed has one kind and passes nothing.
   */
  onLongAcknowledge?: () => void;
  onComments: () => void;
  onPlaylist?: () => void;
  /**
   * Rendered under the caption. This is where a photo post's session goes (§3.5) — the image keeps the
   * emphasis and the record is still reachable, which promoting the workout above the photo would undo.
   */
  footer?: ReactNode;
}

/**
 * Volume · Time · Lifts, from a shared workout's snapshot.
 *
 * ⚠ VOLUME IS CONVERTED HERE, and it was not before. `RecapStrip` printed `fmtVolume(summary.volume)`
 * — canonical pounds, unlabelled — so a metric athlete read a friend's session in numbers that were not
 * their unit and were not marked as anybody else's either. The snapshot stays in pounds, as every stored
 * weight in this app does; the feed converts at the moment of drawing, like every other surface.
 *
 * PRs are deliberately not a fourth stat: §2.6 caps the row at three, and "0 PRs" reads as a session
 * judged and found wanting when the honest statement is that this one was not about records.
 */
export function workoutStats(summary: WorkoutSummary, units: UnitSystem): LedgerStat[] {
  const v = displayWeight(summary.volume, units);
  return [
    { value: v.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), label: `Volume (${v.unit})` },
    { value: fmtDuration(summary.durationSec), label: 'Time' },
    { value: String(summary.exercises.length), label: 'Lifts' },
  ];
}

export function LedgerPost({
  authorName,
  authorAvatarUrl,
  audience,
  time,
  marker,
  title,
  context,
  stats = [],
  playlist = null,
  caption,
  media = [],
  customMedia,
  attribution = null,
  bleed = 0,
  acknowledged,
  acknowledgeCount,
  commentCount,
  alt = false,
  busy = false,
  onAuthor,
  onOpen,
  onAcknowledge,
  onLongAcknowledge,
  onComments,
  onPlaylist,
  footer,
}: LedgerPostProps) {
  const hasMedia = media.length > 0 || customMedia != null;
  const shownStats = stats.slice(0, 3);
  /*
   * ⚠ NOT A PROP AND NOT THE CALLER'S CALL — see the header. But the rule is "the image announces what
   * the post is", and that is only true when the image is the SUBJECT.
   *
   * A photo taken after a session is EVIDENCE attached to one. It announces nothing about volume, time
   * or lifts, so suppressing the stat row there deletes the post's actual content and leaves a picture
   * where a workout was. The refinement is therefore keyed on the one thing that distinguishes the two
   * cases: a post with STATS has something the image cannot say, and keeps its body.
   *
   * ⚠ This is inert for every post type shipped before it. Nothing passed media and stats together — a
   * transformation, progress card, check-in or form check carries no summary and therefore no stats, and
   * until the completion screen started sending its photos no recap carried media. It enables the new
   * combination rather than loosening the old rule.
   */
  const showBody = !hasMedia || shownStats.length > 0;

  return (
    <View style={[styles.post, alt ? styles.postAlt : null]}>
      {/* ── header: [avatar] [name / audience] [time] ── */}
      <View style={styles.header}>
        <Pressable
          onPress={onAuthor}
          disabled={!onAuthor}
          accessibilityRole={onAuthor ? 'button' : undefined}
          accessibilityLabel={onAuthor ? `View ${authorName}'s profile` : undefined}
          style={styles.headerWho}
        >
          <Avatar src={authorAvatarUrl ?? undefined} name={authorName} size={34} />
          <View style={styles.headerText}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            {audience ? (
              <Text style={styles.audience} numberOfLines={1}>
                {audience}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Text style={styles.time}>{time}</Text>
      </View>

      <Pressable onPress={onOpen} disabled={!onOpen} accessibilityRole={onOpen ? 'button' : undefined} accessibilityLabel={onOpen ? title ?? caption ?? 'Open this post' : undefined}>
        {/* Who did what, above the image — attribution, not commentary. Never on a post with no image,
            where it would just repeat the name and the type marker directly beneath both of them. */}
        {hasMedia && attribution ? <Text style={styles.attribution}>{attribution}</Text> : null}

        {customMedia ? (
          <View style={[styles.customBand, { marginHorizontal: -bleed }]}>{customMedia}</View>
        ) : hasMedia ? (
          <MediaBand media={media} bleed={bleed} />
        ) : null}

        {showBody && marker ? (
          <View style={styles.marker}>
            <MarkerGlyph kind={marker.kind} />
            <Text style={styles.markerLabel}>{marker.label}</Text>
          </View>
        ) : null}

        {showBody && title ? (
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
        ) : null}
        {showBody && context ? <Text style={styles.context}>{context}</Text> : null}

        {showBody && shownStats.length ? (
          <View style={styles.stats}>
            {shownStats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      {playlist ? <PlaylistRow link={playlist} onPress={onPlaylist} /> : null}

      {caption ? <Text style={[styles.caption, hasMedia ? styles.captionUnderMedia : null]}>{caption}</Text> : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}

      {/* ── action row: no top border, no separator, pulled 8px left so the first label optically
             aligns with the copy above it ── */}
      <View style={styles.actions}>
        <Pressable
          onPress={onAcknowledge}
          onLongPress={onLongAcknowledge}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ selected: acknowledged }}
          accessibilityLabel={acknowledged ? `Acknowledged, ${acknowledgeCount}` : 'Acknowledge this'}
          accessibilityHint={onLongAcknowledge ? 'Press and hold to change how' : undefined}
          style={styles.action}
        >
          <FlameGlyph on={acknowledged} />
          <Text style={[styles.actionLabel, acknowledged ? styles.actionLabelOn : null]}>Acknowledge</Text>
          {acknowledgeCount > 0 ? (
            <Text style={[styles.actionCount, acknowledged ? styles.actionLabelOn : null]}>{acknowledgeCount}</Text>
          ) : null}
        </Pressable>

        <Pressable onPress={onComments} accessibilityRole="button" accessibilityLabel={`${commentCount} comments`} style={styles.action}>
          <CommentGlyph />
          {/* Hidden at zero — a "0" beside a speech bubble reads as a result rather than an invitation. */}
          {commentCount > 0 ? <Text style={styles.actionCount}>{commentCount}</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The media band — the one rectangle left on the screen, and the deliberate exception to everything above.
 *
 * Everything else strips containers so data can breathe. Media inverts that: in a feed with no cards, a
 * full-bleed photo is the only shape there is, which is exactly the emphasis it should carry and costs
 * nothing structurally.
 *
 * ⚠ 4:5 IS A HARD CAP, not a preference. A portrait shot at its own ratio eats an entire viewport and the
 * feed stops being scannable — you can no longer see that there is a next post, which is the whole reason
 * a feed reads as continuous. Taller sources are centre-cropped.
 */
function MediaBand({ media, bleed }: { media: LedgerMediaItem[]; bleed: number }) {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const isVideo = media[0].kind === 'video';
  const ratio = isVideo ? 16 / 9 : 4 / 5;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w <= 0) return;
    setIdx(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  return (
    <View
      style={[styles.band, { marginHorizontal: -bleed, aspectRatio: ratio }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {isVideo ? (
        /* No poster frame exists — the row stores the clip's URL and nothing else, and `expo-image`
           cannot draw a frame out of an mp4. A dark tile with a play disc is what is actually known;
           an <Image> pointed at a video renders as a broken box. */
        <View style={styles.videoTile}>
          <View style={styles.playDisc}>
            <PlayGlyph />
          </View>
        </View>
      ) : media.length === 1 ? (
        <Image source={{ uri: media[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        /* Swipe IN PLACE, inside the same band — not a grid and not a stack. Several photos are a set
           the author composed; a grid re-crops all of them to show none of them properly. */
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
        >
          {media.map((m, i) => (
            <Image key={`${m.url}-${i}`} source={{ uri: m.url }} style={w > 0 ? { width: w, height: '100%' } : null} contentFit="cover" />
          ))}
        </ScrollView>
      )}

      {/*
        THE GRADING, which is what makes the photo belong to the interface rather than sit on top of it.
        The hairline seats it in the surface; the bottom scrim is load-bearing rather than decorative —
        it is what lets the counter sit on the image and stops a bright photo colliding with the copy
        below it. `pointerEvents="none"` so the swipe underneath still works.
      */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            boxShadow: isVideo
              ? 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -56px 56px -44px rgba(6,7,9,0.85)'
              : 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -70px 70px -50px rgba(6,7,9,0.85)',
          },
        ]}
      />

      {/* Hidden at one photo: a "1 / 1" counter states the obvious and is one more thing on the image. */}
      {media.length > 1 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {Math.min(media.length, idx + 1)} / {media.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The playlist, as content rather than as a tag.
 *
 * ⚠ REAL COVER ART, VIA SPOTIFY'S oEMBED ENDPOINT — no OAuth, no registered app, no SDK. See
 * `domain/workout/playlist-art.ts` for why this stopped being forbidden, and
 * `Workout-Playlist-Amendment-002` for the ruling. An Apple Music link has no unauthenticated
 * equivalent and keeps the glyph.
 *
 * THE GLYPH IS THE GROUND STATE, NOT A SPINNER. It is what the row is built on and what it stays as
 * when the art cannot be had — offline, rate-limited, a private playlist. Nothing here ever renders an
 * empty square, a shimmer, or a retry: the row's job is to name a link and open it, and it does that on
 * the first frame whether or not a thumbnail ever arrives.
 *
 * Never a partner brand colour. The attachment belongs to Forge's surface, so it is bronze on recessed
 * charcoal whichever service it points at, and the art sits inside that frame rather than replacing it.
 */
function PlaylistRow({ link, onPress }: { link: WorkoutPlaylistLink; onPress?: () => void }) {
  const source = SERVICE_LABEL[link.service].replace(/ Playlist$/, '');
  const art = usePlaylistArt(link);
  const label = artLabel(link, art, SERVICE_LABEL[link.service]);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Open ${label} on ${source}` : undefined}
      style={({ pressed }) => [styles.playlist, pressed && onPress ? styles.playlistPressed : null]}
    >
      <LinearGradient
        colors={['rgba(191,143,79,0.14)', 'rgba(191,143,79,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.playlistArt}
      >
        {art ? (
          // `transition` so a thumbnail landing after the row is drawn fades in rather than snapping.
          <Image source={{ uri: art.imageUrl }} style={styles.playlistArtImg} contentFit="cover" transition={220} />
        ) : (
          <MusicGlyph />
        )}
      </LinearGradient>
      <View style={styles.playlistText}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.playlistMeta} numberOfLines={1}>
          {source}
        </Text>
      </View>
      <ChevronGlyph />
    </Pressable>
  );
}

/**
 * The end of the ledger. Shown once everything is loaded — a feed that simply stops is indistinguishable
 * from one that failed to load the next page.
 */
export function EndOfLedger() {
  return (
    <View style={styles.end}>
      <View style={styles.endDiamond} />
      <Text style={styles.endText}>End of the ledger</Text>
      <View style={styles.endDiamond} />
    </View>
  );
}

// ── glyphs ──
const MARKER_PATHS: Record<LedgerMarker, ReactNode> = {
  workout: (
    <>
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </>
  ),
  pr: (
    <>
      <Path d="M11 3c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5z" />
      <Path d="M18 13.5c.2 1.4.7 1.9 2.1 2.1-1.4.2-1.9.7-2.1 2.1-.2-1.4-.7-1.9-2.1-2.1 1.4-.2 1.9-.7 2.1-2.1z" />
    </>
  ),
  goal: (
    <>
      <Circle cx={12} cy={12} r={8} />
      <Circle cx={12} cy={12} r={4} />
      <Circle cx={12} cy={12} r={0.9} />
    </>
  ),
  formcheck: (
    <>
      <Path d="M4 6.5h11v11H4z" />
      <Path d="M15 10.5l5-3v9l-5-3z" />
    </>
  ),
  milestone: (
    <>
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
      <Circle cx={12} cy={15} r={4.8} />
    </>
  ),
  announcement: (
    <>
      <Path d="M4 10v4h3l6 4V6l-6 4z" />
      <Path d="M17 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  transformation: (
    <>
      <Path d="M4 5h6v14H4zM14 5h6v14h-6z" />
      <Path d="M12 9v6" />
    </>
  ),
};
function MarkerGlyph({ kind }: { kind: LedgerMarker }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {MARKER_PATHS[kind]}
    </Svg>
  );
}
function FlameGlyph({ on }: { on: boolean }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={on ? flColor.bronze300 : flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function CommentGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5h16v10H9l-5 4z" />
    </Svg>
  );
}
function PlayGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Path d="M8 5l12 7-12 7z" />
    </Svg>
  );
}
function MusicGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18V5l11-2v13" />
      <Path d="M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
    </Svg>
  );
}
function ChevronGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  /* ⚠ NO HORIZONTAL PADDING ON THE WRAPPER. The 18px gutter is applied to each inner block instead,
     which is the only way media can run to the screen edge without fighting a parent's inset. */
  post: { paddingTop: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  postAlt: { backgroundColor: 'rgba(255,255,255,0.012)' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: LEDGER_GUTTER },
  headerWho: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 14.5, fontWeight: '600', lineHeight: 17.4, color: flColor.cream100 },
  audience: { fontSize: 11.5, color: flColor.gray600 },
  time: { flexGrow: 0, flexShrink: 0, fontSize: 12, color: flColor.gray600 },

  attribution: { marginTop: 14, marginBottom: 12, paddingHorizontal: LEDGER_GUTTER, fontSize: 13.5, lineHeight: 19, color: flColor.gray400 },

  band: { position: 'relative', width: 'auto', marginTop: 14, overflow: 'hidden', backgroundColor: flColor.charcoal800 },
  customBand: { marginTop: 14, overflow: 'hidden' },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1216' },
  playDisc: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: flColor.bronzeBorder },
  counter: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: flRadius.pill, backgroundColor: 'rgba(6,7,9,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  counterText: { fontSize: 11, fontWeight: '600', color: flColor.cream100 },

  marker: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17, paddingHorizontal: LEDGER_GUTTER },
  markerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },

  title: { marginTop: 7, paddingHorizontal: LEDGER_GUTTER, fontFamily: flFont.display, fontSize: 22, fontWeight: '600', lineHeight: 25.3, letterSpacing: 0.2, color: flColor.cream100 },
  context: { marginTop: 4, paddingHorizontal: LEDGER_GUTTER, fontSize: 12.5, color: flColor.gray600 },

  /* A plain row. No container, no dividers, no background — the numbers sit on the feed canvas. */
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 26, marginTop: 15, paddingHorizontal: LEDGER_GUTTER },
  stat: { gap: 3 },
  statValue: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', lineHeight: 21, color: flColor.cream100 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.bronze400 },

  playlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginHorizontal: LEDGER_GUTTER,
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 9,
    paddingLeft: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: flShadow.borderInset,
  },
  playlistPressed: { opacity: 0.85 },
  playlistArt: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: flColor.charcoal600, boxShadow: flShadow.borderInset, overflow: 'hidden' },
  playlistArtImg: { width: '100%', height: '100%' },
  playlistText: { flex: 1, minWidth: 0, gap: 2 },
  playlistName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  playlistMeta: { fontSize: 11.5, color: flColor.gray600 },

  caption: { marginTop: 16, paddingHorizontal: LEDGER_GUTTER, fontSize: 14, lineHeight: 21.7, color: flColor.gray400 },
  /* Under the image, never above it — a photo post's body copy is a response to the picture. */
  captionUnderMedia: { marginTop: 12 },
  footer: { marginTop: 12, paddingHorizontal: LEDGER_GUTTER },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: LEDGER_GUTTER - 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 8 },
  actionLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  actionLabelOn: { color: flColor.bronze300 },
  actionCount: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },

  end: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingTop: 26, paddingBottom: 34 },
  endDiamond: { width: 4, height: 4, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  endText: { fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
});
