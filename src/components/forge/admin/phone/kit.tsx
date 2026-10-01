import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { zoomBase } from '@/components/forge/admin/crm-ui';
import { usePhone } from '@/components/forge/admin/phone/context';
import { flFont } from '@/constants/foundation';

/**
 * The phone CRM's kit, built to `Forge CRM Phone.dc.html` (Claude Design b029488a).
 *
 * One thumb: 44 pt minimum targets, the main action pinned in a bottom bar, 16 px text in every field (iOS
 * Safari zooms a smaller one). Colours only from `useCrm().c` (the phone palettes). Tabs and overlays compose
 * these pieces and nothing else, so a screen can be checked against the design by which pieces it uses.
 */

export const SERIF = flFont.displayMedium;
const TAB: TextStyle = { fontVariant: ['tabular-nums', 'lining-nums'] };
export const TAB_BAR_H = 83;
export const BOTTOM_BAR_H = 74;

// ── Scrolling page with the design's pull-to-refresh ───────────────────────

/**
 * A tab's scrolling body. Pull down from the top to refresh: native uses RefreshControl; the web (Safari,
 * where the owner actually uses this) gets the design's own pull — "Pull to refresh" → "Release to refresh"
 * → "Refreshing…" — driven by touch, because RefreshControl does nothing in a browser.
 */
export function PhoneScroll({
  children,
  bottomBar,
  padX = 20,
}: {
  children: React.ReactNode;
  /** Height reserved at the bottom for a pinned action bar. */
  bottomBar?: boolean;
  padX?: number;
}) {
  const { c } = useCrm();
  const { refresh, offline, toast } = usePhone();
  const insets = useSafeAreaInsets();
  const [top, setTop] = useState(true);
  const [pull, setPull] = useState<{ y0: number; dy: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const done = () => {
    if (offline) {
      toast('You’re offline. Showing the last loaded numbers.');
      return;
    }
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 700);
  };

  const web = Platform.OS === 'web';
  const touch = web
    ? {
        onTouchStart: (e: GestureResponderEvent) => {
          if (top && !refreshing) setPull({ y0: e.nativeEvent.pageY, dy: 0 });
        },
        onTouchMove: (e: GestureResponderEvent) => {
          if (!pull) return;
          const dy = Math.min(80, Math.max(0, (e.nativeEvent.pageY - pull.y0) * 0.5));
          if (dy !== pull.dy) setPull({ ...pull, dy });
        },
        onTouchEnd: () => {
          if (!pull) return;
          const go = pull.dy >= 50;
          setPull(null);
          if (go) done();
        },
      }
    : {};
  const dy = pull?.dy ?? 0;
  const label = refreshing ? 'Refreshing…' : dy >= 50 ? 'Release to refresh' : 'Pull to refresh';

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: padX, paddingBottom: bottomBar ? BOTTOM_BAR_H + 24 : 32 }}
      keyboardDismissMode={KEYBOARD_DISMISS_MODE}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setTop(e.nativeEvent.contentOffset.y <= 0)}
      refreshControl={web ? undefined : <RefreshControl refreshing={refreshing} onRefresh={done} tintColor={c.ink3} />}
      {...(touch as object)}
    >
      {web && (dy > 0 || refreshing) ? (
        <View style={{ height: refreshing ? 44 : dy, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8, overflow: 'hidden' }}>
          <Text style={{ fontSize: 13, color: c.ink3 }}>{label}</Text>
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

// ── Type ───────────────────────────────────────────────────────────────────

export function ScreenTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
      <Text accessibilityRole="header" style={{ fontFamily: SERIF, fontSize: 30, color: c.ink }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export function SectionHead({ label, right, style }: { label: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useCrm();
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 26 }, style]}>
      <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.96, textTransform: 'uppercase', color: c.ink3 }}>{label}</Text>
      {right}
    </View>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useCrm();
  return <Text style={[{ fontSize: 13, lineHeight: 19, color: c.ink3 }, style]}>{children}</Text>;
}

export function OfflineLine() {
  const { c } = useCrm();
  const { offline, updatedAt } = usePhone();
  if (!offline) return null;
  const t = new Date(updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return <Text style={{ marginTop: 8, fontSize: 13, color: c.warn }}>Offline · last updated {t}</Text>;
}

// ── Controls ───────────────────────────────────────────────────────────────

/** The design's segmented control: equal cells on a panel (Money: Revenue / Users & plans / AI). */
export function Seg<K extends string>({
  options,
  value,
  onChange,
  size = 'md',
  surface = 'panel',
}: {
  options: { key: K; label: string; count?: number | string | null }[];
  value: K;
  onChange: (k: K) => void;
  size?: 'md' | 'sm';
  surface?: 'panel' | 'field';
}) {
  const { c } = useCrm();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: 11,
        backgroundColor: surface === 'panel' ? c.panel : c.field,
        borderWidth: 1,
        borderColor: surface === 'panel' ? c.panelBd : c.line,
      }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, height: size === 'sm' ? 40 : 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.brzTint : 'transparent' }}
          >
            <Text numberOfLines={1} style={{ fontSize: size === 'sm' ? 13 : 14, fontWeight: '600', color: on ? c.brz : c.ink3 }}>
              {o.label}
              {o.count != null && o.count !== '' ? <Text style={{ opacity: 0.7, fontWeight: '500' }}> {o.count}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 7D / 30D / 90D / 1Y — small, in a page's title row. */
export function RangeSeg() {
  const { c } = useCrm();
  const { range, setRange } = usePhone();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {(['7D', '30D', '90D', '1Y'] as const).map((k) => {
        const on = k === range;
        return (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => setRange(k)}
            style={{ minWidth: 44, height: 36, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.brzTint : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: on ? c.brz : c.ink3 }}>{k}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A round chip (People filters, sheet options). */
export function PChip({ label, count, on, onPress, size = 'md' }: { label: string; count?: number | string | null; on?: boolean; onPress: () => void; size?: 'md' | 'lg' }) {
  const { c } = useCrm();
  const h = size === 'lg' ? 40 : 36;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={{ height: h, paddingHorizontal: 14, borderRadius: h / 2, borderWidth: 1, borderColor: on ? c.brzBd : c.line, backgroundColor: on ? c.brzTint : 'transparent', justifyContent: 'center' }}
    >
      <Text numberOfLines={1} style={{ fontSize: size === 'lg' ? 15 : 14, color: on ? c.brz : c.ink2 }}>
        {label}
        {count != null && count !== '' ? <Text style={{ opacity: 0.7 }}> {count}</Text> : null}
      </Text>
    </Pressable>
  );
}

/** Big 50 pt button — the bottom bars' and sheets' actions. */
export function BigBtn({
  label,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  danger,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet';
  busy?: boolean;
  disabled?: boolean;
  /** The armed two-tap state of a delete. */
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useCrm();
  const off = !!(disabled || busy);
  const base: ViewStyle = { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1 };
  const text = (color: string) => <Text style={{ fontSize: 16, fontWeight: '600', color }}>{label}</Text>;
  return (
    <Pressable onPress={off ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled: off, busy: !!busy }} style={[{ flex: 1, opacity: disabled ? 0.45 : 1 }, style]}>
      {kind === 'primary' && !danger ? (
        <LinearGradient colors={c.btn} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[base, { borderColor: c.btnBd }]}>
          {busy ? <ActivityIndicator size="small" color={c.btnInk} /> : null}
          {text(c.btnInk)}
        </LinearGradient>
      ) : (
        <View style={[base, { borderColor: danger ? c.crit : c.fieldBd, backgroundColor: danger ? c.crit : 'transparent' }]}>
          {busy ? <ActivityIndicator size="small" color={c.ink} /> : null}
          {text(danger ? '#FFFFFF' : c.ink)}
        </View>
      )}
    </Pressable>
  );
}

/** A row of buttons pinned above the tab bar (or the home indicator on an overlay). */
export function BottomBar({ children, overlay }: { children: React.ReactNode; overlay?: boolean }) {
  const { c } = useCrm();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: overlay ? 'relative' : 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 12,
        paddingHorizontal: overlay ? 16 : 20,
        paddingBottom: overlay ? Math.max(insets.bottom, 12) + 10 : 12,
        backgroundColor: c.bg,
        borderTopWidth: 1,
        borderTopColor: c.line,
        flexDirection: 'row',
        gap: 8,
      }}
    >
      {children}
    </View>
  );
}

export function PInput({ style, ...props }: TextInputProps) {
  const { c } = useCrm();
  return (
    <TextInput
      placeholderTextColor={c.ink3}
      {...props}
      style={[
        {
          minHeight: props.multiline ? 88 : 48,
          paddingHorizontal: 14,
          paddingVertical: props.multiline ? 12 : 0,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.fieldBd,
          backgroundColor: c.field,
          color: c.ink,
          fontSize: 16,
          lineHeight: props.multiline ? 23 : undefined,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
        style,
      ]}
    />
  );
}

export function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, color: c.ink3 }}>{label}</Text>
      {children}
    </View>
  );
}

// ── Lists and figures ──────────────────────────────────────────────────────

export function Tag({ label, tone = 'brz' }: { label: string; tone?: 'crit' | 'warn' | 'brz' | 'muted' | 'good' }) {
  const { c } = useCrm();
  const map = {
    crit: [c.critInk, c.critTint],
    warn: [c.warn, c.warnTint],
    brz: [c.brz, c.brzTint],
    good: [c.good, c.brzTint],
    muted: [c.ink3, c.track],
  } as const;
  const [color, bg] = map[tone];
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.44, color }}>{label}</Text>
    </View>
  );
}

/** A tappable row with a chevron — the phone's list unit (min 64 pt). */
export function RowButton({
  children,
  onPress,
  right,
  minHeight = 64,
  label,
  dim,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  right?: React.ReactNode;
  minHeight?: number;
  label?: string;
  dim?: boolean;
}) {
  const { c } = useCrm();
  const body = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {right}
      {onPress ? <Text style={{ fontSize: 22, color: c.ink3 }}>›</Text> : null}
    </>
  );
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line, opacity: dim ? 0.55 : 1 };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [style, pressed && { backgroundColor: c.hover }]}>
      {body}
    </Pressable>
  );
}

export interface PFig {
  label: string;
  value: string;
  note?: string | null;
  tone?: 'good' | 'bad' | 'warn' | null;
}

/** Two-column figures, each under a hairline (the design's Money / Today grids). */
export function FigGrid({ figs, size = 26 }: { figs: PFig[]; size?: number }) {
  const { c } = useCrm();
  const rows: PFig[][] = [];
  figs.forEach((f, i) => (i % 2 ? rows[rows.length - 1].push(f) : rows.push([f])));
  const tone = (t?: PFig['tone']) => (t === 'good' ? c.good : t === 'bad' ? c.critInk : t === 'warn' ? c.warn : c.ink3);
  return (
    <View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', columnGap: 20 }}>
          {[0, 1].map((j) => {
            const f = r[j];
            if (!f) return <View key={j} style={{ flex: 1 }} />;
            return (
              <View key={f.label} style={{ flex: 1, minWidth: 0, paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.line }}>
                <Text style={{ fontSize: 13, color: c.ink3 }}>{f.label}</Text>
                <Text style={[{ fontFamily: SERIF, fontSize: size, marginTop: 2, color: f.value === '—' ? c.ink3 : c.ink }, TAB]} numberOfLines={1} adjustsFontSizeToFit>
                  {f.value}
                </Text>
                {f.note ? <Text style={{ fontSize: 13, marginTop: 2, color: tone(f.tone) }}>{f.note}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Label / value rows (By product, Conversion, the user card). */
export function KVRow({ label, value, note }: { label: string; value: string; note?: string | null }) {
  const { c } = useCrm();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, minHeight: 52, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Text style={{ fontSize: 16, color: c.ink, flexShrink: 1 }}>
        {label}
        {note ? <Text style={{ fontSize: 14, color: c.ink3 }}> {note}</Text> : null}
      </Text>
      <Text style={[{ fontSize: 16, fontWeight: '600', color: c.ink }, TAB]}>{value}</Text>
    </View>
  );
}

export function Skel({ lines = 3 }: { lines?: number }) {
  const { c } = useCrm();
  return (
    <View accessibilityLabel="Loading" style={{ gap: 12, paddingVertical: 18 }}>
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={{ height: 14, width: `${80 - i * 8}%`, borderRadius: 7, backgroundColor: c.track }} />
      ))}
    </View>
  );
}

export function ErrorRow({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  const { c } = useCrm();
  return (
    <View style={{ paddingVertical: 16, gap: 6 }}>
      <Text style={{ fontSize: 15, lineHeight: 22, color: c.critInk }}>{msg}</Text>
      {onRetry ? (
        <Text onPress={onRetry} accessibilityRole="button" style={{ fontSize: 15, fontWeight: '600', color: c.brz }}>
          Try again
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  const { c } = useCrm();
  return <Text style={{ paddingVertical: 28, fontSize: 15, lineHeight: 22, color: c.ink3 }}>{children}</Text>;
}

// ── Overlays and sheets ────────────────────────────────────────────────────

/** A full-screen page over a tab: "‹ Bugs" top-left, optional right control, body, optional bottom bar. */
export function OverlayScreen({
  backLabel,
  onBack,
  right,
  children,
  bottom,
  title,
  plainBack,
}: {
  backLabel: string;
  onBack: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  bottom?: React.ReactNode;
  /** A centred title (Edit contact). */
  title?: string;
  /** A plain label with no chevron ("Cancel" on an editor). */
  plainBack?: boolean;
}) {
  const { c } = useCrm();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingLeft: 16, paddingRight: 12, minHeight: insets.top + 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={plainBack ? backLabel : `Back to ${backLabel}`} style={{ height: 44, paddingRight: 12, justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, color: c.brz }}>{plainBack ? backLabel : `‹ ${backLabel}`}</Text>
        </Pressable>
        {title ? <Text style={{ fontSize: 17, fontWeight: '600', color: c.ink }}>{title}</Text> : null}
        <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 6, paddingHorizontal: 20, paddingBottom: 28 }}
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {bottom ? <BottomBar overlay>{bottom}</BottomBar> : null}
    </View>
  );
}

/** The bottom sheet's frame: grab handle, serif title, Cancel. The shell draws the dimmed backdrop. */
export function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { c } = useCrm();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 14) + 20 }}>
      <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.track, alignSelf: 'center', marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 22, color: c.ink }}>{title}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" style={{ height: 44, paddingLeft: 12, justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: c.ink3 }}>Cancel</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

// ── The touch-and-drag chart ───────────────────────────────────────────────

function smooth(p: { x: number; y: number }[], lo: number, hi: number): string {
  if (!p.length) return '';
  const cy = (y: number) => Math.min(hi, Math.max(lo, y));
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${cy(p1.y + (p2.y - p0.y) / 6)} ${p2.x - (p3.x - p1.x) / 6},${cy(p2.y - (p3.y - p1.y) / 6)} ${p2.x},${p2.y}`;
  }
  return d;
}

const niceMax = (v: number) => {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return (Math.ceil((v / p) * 2) / 2) * p;
};

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

let gid = 0;

/**
 * The design's scrub chart: no hover on a phone, so you touch and drag across it and the reading sits ABOVE
 * your finger. 150 pt tall, dashed gridlines labelled at the right, three dates under it.
 */
export function ScrubChart({ values, days, fmt, weekly, zoom }: { values: number[]; days: string[]; fmt: (v: number) => string; weekly?: boolean; /** Start the axis near the lowest value (`zoomBase`). */ zoom?: boolean }) {
  const { c } = useCrm();
  const [w, setW] = useState(0);
  const [i, setI] = useState<number | null>(null);
  const [id] = useState(() => `pc-${gid++}`);
  const H = 150;
  const TOPP = 10;
  const n = values.length;
  const base = zoom ? zoomBase(values) : 0;
  const span = niceMax((Math.max(0, ...values) - base) * 1.08);
  const max = base + span;
  const pts = values.map((v, k) => ({ x: n > 1 ? (k / (n - 1)) * w : w / 2, y: TOPP + (1 - Math.max(0, v - base) / span) * (H - TOPP) }));
  const line = smooth(pts, TOPP, H);
  const grid = [base + span / 2, max].map((v) => ({ v, y: TOPP + (1 - (v - base) / span) * (H - TOPP) }));

  const at = (x: number) => {
    if (!w || n < 1) return;
    const k = Math.max(0, Math.min(n - 1, Math.round((x / w) * (n - 1))));
    if (k !== i) setI(k);
  };
  const locX = (e: GestureResponderEvent) => {
    const t = e.currentTarget as unknown as { getBoundingClientRect?: () => { left: number } };
    const ne = e.nativeEvent as unknown as { clientX?: number; locationX?: number; touches?: { clientX: number }[] };
    const cx = ne.touches?.[0]?.clientX ?? ne.clientX;
    if (t?.getBoundingClientRect && cx != null) return cx - t.getBoundingClientRect().left;
    return ne.locationX ?? 0;
  };

  const tipX = i != null && pts[i] ? pts[i].x : 0;
  return (
    <View style={{ marginTop: 8 }}>
      <View
        onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => at(locX(e))}
        onResponderMove={(e) => at(locX(e))}
        onResponderRelease={() => setI(null)}
        onResponderTerminate={() => setI(null)}
        style={[{ height: H, position: 'relative' }, Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as unknown as ViewStyle) : null]}
        accessibilityLabel="Chart. Touch and drag to read a day."
      >
        {grid.map((g) => (
          <View key={g.v} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: g.y, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: c.line }}>
            <Text style={[{ position: 'absolute', right: 0, top: -17, fontSize: 11, color: c.ink3 }, TAB]}>{fmt(g.v)}</Text>
          </View>
        ))}
        {w > 0 && n > 0 ? (
          <Svg width={w} height={H} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Defs>
              <SvgGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.brz} stopOpacity={0.22} />
                <Stop offset="1" stopColor={c.brz} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Path d={`${line} L${w},${H} L0,${H} Z`} fill={`url(#${id})`} />
            <Path d={line} fill="none" stroke={c.brz} strokeWidth={2} />
          </Svg>
        ) : null}
        {i != null && pts[i] ? (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: tipX, borderLeftWidth: 1, borderLeftColor: c.brzBd }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: tipX - 5, top: pts[i].y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: c.brz, borderWidth: 3, borderColor: c.bg }} />
            <View pointerEvents="none" style={{ position: 'absolute', bottom: H + 12, left: Math.min(Math.max(tipX, 60), Math.max(60, w - 60)), width: 0, alignItems: 'center' }}>
              <View style={{ width: 120, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.tip, borderWidth: 1, borderColor: c.panelBd, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: c.ink3 }}>
                  {weekly ? 'Week of ' : ''}
                  {dayLabel(days[i])}
                </Text>
                <Text style={[{ fontSize: 17, fontWeight: '600', color: c.ink }, TAB]}>{fmt(values[i])}</Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {(n > 1 ? [0, Math.round((n - 1) / 2), n - 1] : [0]).map((k) => (
          <Text key={k} style={{ fontSize: 12, color: c.ink3 }}>
            {days[k] ? dayLabel(days[k]) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** "Touch and drag the chart to read a day" — the design's hint above every chart. */
export function ChartHint() {
  const { c } = useCrm();
  return <Text style={{ marginTop: 14, fontSize: 12, color: c.ink3 }}>Touch and drag the chart to read a day</Text>;
}
