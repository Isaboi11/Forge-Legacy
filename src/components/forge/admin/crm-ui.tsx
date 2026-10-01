import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { useCrm, type CrmPalette } from '@/components/forge/admin/crm-theme';
import { flFont } from '@/constants/foundation';

/**
 * The Business CRM's UI kit, built to `Forge CRM.dc.html` (Claude Design, project b029488a).
 *
 * Every colour comes from `useCrm().c` — the design's own Forge / Alabaster palettes — never a literal.
 * Every size, radius and type setting is the design's. Pages compose these and nothing else, so a page can be
 * checked against the design by reading which pieces it uses.
 *
 * The design's rules, carried here so a page cannot break them by accident:
 *   · Information sits on the ground under a small uppercase label and a hairline. Only editors and the
 *     detail panels get a surface (`Panel`).
 *   · Bronze marks what is selected and the ONE primary action per view.
 *   · A figure with nothing to divide by shows "—", never 0%.
 */

// ── Layout ─────────────────────────────────────────────────────────────────

/** The design's breakpoints: sidebar at 900, two-pane + sticky panels at 1180, stacked forms under 600. */
export function useLayout() {
  const { width } = useWindowDimensions();
  return { w: width, wide: width >= 900, lg: width >= 1180, sm: width < 600 };
}

export const DISPLAY = flFont.display;
const DISPLAY_MEDIUM = flFont.displayMedium;
const TABULAR: TextStyle = { fontVariant: ['tabular-nums', 'lining-nums'] };

// ── Type ───────────────────────────────────────────────────────────────────

export function SectionLabel({ label, right, style }: { label: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useCrm();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: c.ink3 }}>{label}</Text>
      {right}
    </View>
  );
}

export function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useCrm();
  return (
    <Text onPress={onPress} accessibilityRole="link" style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>
      {label} ›
    </Text>
  );
}

// ── Page header ────────────────────────────────────────────────────────────

export interface Action {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet';
  /** A quiet toggle that is ON renders bronze-tinted. */
  on?: boolean;
  busy?: boolean;
}

export function PageHeader({ title, note, purpose, actions }: { title: string; note?: string | null; purpose?: string; actions?: Action[] }) {
  const { c } = useCrm();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', columnGap: 32, rowGap: 16, paddingTop: 24, paddingBottom: 28 }}>
      <View style={{ gap: 8, maxWidth: 760, flexShrink: 1 }}>
        <Text accessibilityRole="header" accessibilityHint={purpose} style={{ fontFamily: DISPLAY, fontSize: 36, lineHeight: 41, letterSpacing: -0.3, color: c.ink }}>
          {title}
        </Text>
        {note ? <Text style={{ fontSize: 16, lineHeight: 25.6, color: c.ink2 }}>{note}</Text> : null}
      </View>
      {actions?.length ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {actions.map((a) => (
            <Btn key={a.label} label={a.label} onPress={a.onPress} kind={a.kind ?? 'primary'} on={a.on} busy={a.busy} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Buttons, chips, options ────────────────────────────────────────────────

export function Btn({
  label,
  onPress,
  kind = 'quiet',
  on,
  busy,
  disabled,
  size = 'md',
  full,
}: {
  label: string;
  onPress?: (() => void) | null;
  kind?: 'primary' | 'quiet';
  on?: boolean;
  busy?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  full?: boolean;
}) {
  const { c } = useCrm();
  const h = size === 'sm' ? 34 : 40;
  const off = disabled || busy || !onPress;
  const inner = (
    <Text style={{ fontSize: size === 'sm' ? 13 : 14, fontWeight: '600', color: kind === 'primary' ? c.btnInk : on ? c.brz : c.ink }}>{label}</Text>
  );
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy, selected: !!on }}
      style={({ pressed }) => [{ opacity: pressed && !off ? 0.85 : disabled ? 0.5 : 1 }, full && { alignSelf: 'stretch' }]}
    >
      {kind === 'primary' ? (
        <LinearGradient
          colors={c.btn}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ height: h, paddingHorizontal: 18, borderRadius: size === 'sm' ? 9 : 10, borderWidth: 1, borderColor: c.btnBd, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
        >
          {busy ? <ActivityIndicator size="small" color={c.btnInk} /> : null}
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={{
            height: h,
            paddingHorizontal: size === 'sm' ? 14 : 16,
            borderRadius: size === 'sm' ? 9 : 10,
            borderWidth: 1,
            borderColor: on ? c.brzBd : c.fieldBd,
            backgroundColor: on ? c.brzTint : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {busy ? <ActivityIndicator size="small" color={c.brz} /> : null}
          {inner}
        </View>
      )}
    </Pressable>
  );
}

/** Two taps to delete: the first arms it for three seconds and turns it red, the second acts. */
export function useTwoTap(ms = 3000) {
  const [armed, setArmed] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  const tap = useCallback(
    (id: string, act: () => void) => {
      if (armed === id) {
        setArmed(null);
        act();
        return;
      }
      if (t.current) clearTimeout(t.current);
      setArmed(id);
      t.current = setTimeout(() => setArmed(null), ms);
    },
    [armed, ms],
  );
  return { armed, tap };
}

export function DeleteBtn({
  armed,
  onPress,
  label = 'Delete',
  confirmLabel,
  size = 'sm',
  busy,
}: {
  armed: boolean;
  onPress: () => void;
  label?: string;
  /** What the armed button says. Defaults to "Confirm delete"; "Mark inactive" arms as "Confirm mark inactive". */
  confirmLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  busy?: boolean;
}) {
  const { c } = useCrm();
  const h = size === 'xs' ? 28 : size === 'sm' ? 34 : 38;
  const confirm = confirmLabel ?? (label === 'Delete' ? 'Confirm delete' : `Confirm ${label.charAt(0).toLowerCase()}${label.slice(1)}`);
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={armed ? confirm : label}
      style={{
        height: h,
        paddingHorizontal: size === 'xs' ? 10 : 14,
        borderRadius: size === 'xs' ? 7 : 9,
        borderWidth: 1,
        borderColor: armed ? c.crit : c.line,
        backgroundColor: armed ? c.crit : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={c.crit} />
      ) : (
        <Text style={{ fontSize: size === 'xs' ? 12.5 : 13, fontWeight: '600', color: armed ? '#FBF1E2' : c.crit }}>{armed ? confirm : label}</Text>
      )}
    </Pressable>
  );
}

/** A rounded filter pill with a count (list filters). */
export function Chip({ label, count, on, onPress, size = 'md' }: { label: string; count?: number | string | null; on?: boolean; onPress: () => void; size?: 'sm' | 'md' }) {
  const { c } = useCrm();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        height: size === 'sm' ? 28 : 30,
        paddingHorizontal: size === 'sm' ? 11 : 12,
        borderRadius: size === 'sm' ? 14 : 15,
        borderWidth: 1,
        borderColor: on ? c.brzBd : c.line,
        backgroundColor: on ? c.brzTint : hovered ? c.hover : 'transparent',
      })}
    >
      <Text style={{ fontSize: size === 'sm' ? 12.5 : 13, fontWeight: '500', color: on ? c.brz : c.ink2 }}>
        {label}
        {count != null && count !== '' ? <Text style={[{ color: c.ink3 }, TABULAR]}> {count}</Text> : null}
      </Text>
    </Pressable>
  );
}

/** A squarer option button (severity, status, type, stage, shelf). `color` overrides the ON colour (critical). */
export function Opt({ label, on, onPress, color }: { label: string; on?: boolean; onPress: () => void; color?: string }) {
  const { c } = useCrm();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: on ? c.brzBd : c.line,
        backgroundColor: on ? c.brzTint : 'transparent',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: on ? (color ?? c.brz) : c.ink2 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, gap = 8, wrap = true, style }: { children: React.ReactNode; gap?: number; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap, alignItems: 'center' }, style]}>{children}</View>;
}

// ── Fields ─────────────────────────────────────────────────────────────────

export function Input({ style, ...props }: TextInputProps) {
  const { c } = useCrm();
  return (
    <TextInput
      placeholderTextColor={c.ink3}
      {...props}
      style={[
        {
          height: props.multiline ? undefined : 40,
          minHeight: props.multiline ? 72 : undefined,
          paddingHorizontal: 12,
          paddingVertical: props.multiline ? 10 : 0,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.fieldBd,
          backgroundColor: c.field,
          color: c.ink,
          fontSize: 14,
          lineHeight: props.multiline ? 21 : undefined,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
        style,
      ]}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View style={{ gap: 6, flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
      <Text style={{ fontSize: 12.5, color: c.ink2 }}>{label}</Text>
      {children}
    </View>
  );
}

/** Two columns of fields at ≥ 600, one below. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  const { sm } = useLayout();
  const kids = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (sm) return <View style={{ gap: 16 }}>{kids}</View>;
  const rows: React.ReactNode[][] = [];
  kids.forEach((k, i) => (i % 2 ? rows[rows.length - 1].push(k) : rows.push([k])));
  return (
    <View style={{ gap: 16 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 24 }}>
          {r}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

// ── Surfaces ───────────────────────────────────────────────────────────────

/** The detail/editor surface. Sticky beside a list on wide screens (the design's `panelPos`). */
export function Panel({ children, pad = 24, gap = 18, sticky, style }: { children: React.ReactNode; pad?: number; gap?: number; sticky?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useCrm();
  const { lg } = useLayout();
  return (
    <View
      style={[
        { padding: pad, gap, borderRadius: 14, backgroundColor: c.panel, borderWidth: 1, borderColor: c.panelBd },
        sticky && lg && Platform.OS === 'web' ? ({ position: 'sticky', top: 24 } as unknown as ViewStyle) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** The design's form section: a panel with a display-type title, fields, then Save / Cancel / error. */
export function FormPanel({
  title,
  children,
  saveLabel,
  onSave,
  onCancel,
  busy,
  error,
}: {
  title: string;
  children: React.ReactNode;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const { c } = useCrm();
  return (
    <Panel style={{ marginBottom: 32 }}>
      <Text style={{ fontFamily: DISPLAY, fontSize: 22, color: c.ink }}>{title}</Text>
      {children}
      <Row gap={10} style={{ paddingTop: 4 }}>
        <Btn label={saveLabel} onPress={onSave} kind="primary" busy={busy} />
        <Btn label="Cancel" onPress={onCancel} />
        {error ? <Text style={{ fontSize: 13.5, color: c.crit }}>{error}</Text> : null}
      </Row>
    </Panel>
  );
}

export function Banner({ children }: { children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View style={{ marginBottom: 24, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.warnTint }}>
      <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink }}>{children}</Text>
    </View>
  );
}

// ── Figures ────────────────────────────────────────────────────────────────

export interface Figure {
  label: string;
  value: string;
  note?: string;
  /** 'good' | 'bad' colour the note (never carries meaning alone: the note has ▲/▼ or words). */
  tone?: 'good' | 'bad' | null;
  /** '—' values dim automatically. */
  onPress?: () => void;
}

function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

function toneColor(c: CrmPalette, tone?: 'good' | 'bad' | null) {
  return tone === 'good' ? c.good : tone === 'bad' ? c.crit : c.ink3;
}

/** The report pages' opening: one hero figure, then a grid of figures under hairlines. */
export function HeroFigures({ hero, figures }: { hero: Figure; figures: Figure[] }) {
  const { c } = useCrm();
  const { lg, sm } = useLayout();
  const cols = sm ? 2 : 3;
  const dim = (v: string) => (v === '—' ? c.ink3 : c.ink);
  return (
    <View style={{ flexDirection: lg ? 'row' : 'column', gap: lg ? 56 : 36, paddingBottom: 44, alignItems: 'flex-start' }}>
      <View style={{ flex: lg ? 1 : undefined, alignSelf: 'stretch', gap: 6, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line }}>
        <Text style={{ fontSize: 13, color: c.ink2 }}>{hero.label}</Text>
        <Text style={[{ fontFamily: DISPLAY_MEDIUM, fontSize: 56, lineHeight: 59, color: dim(hero.value) }, TABULAR]}>{hero.value}</Text>
        {hero.note ? <Text style={{ fontSize: 13.5, fontWeight: '500', color: toneColor(c, hero.tone) }}>{hero.note}</Text> : null}
      </View>
      <View style={{ flex: lg ? 2 : undefined, alignSelf: 'stretch' }}>
        {chunk(figures, cols).map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', columnGap: lg ? 36 : 24 }}>
            {Array.from({ length: cols }, (_, j) => {
              const f = row[j];
              if (!f) return <View key={j} style={{ flex: 1 }} />;
              return (
                <View key={f.label} style={{ flex: 1, minWidth: 0, gap: 3, paddingVertical: 16, borderTopWidth: 1, borderTopColor: c.line }}>
                  <Text style={{ fontSize: 13, color: c.ink2 }}>{f.label}</Text>
                  <Text style={[{ fontFamily: DISPLAY_MEDIUM, fontSize: 24, lineHeight: 29, color: dim(f.value) }, TABULAR]}>{f.value}</Text>
                  {f.note ? <Text style={{ fontSize: 12.5, color: toneColor(c, f.tone) }}>{f.note}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Overview's clickable figure lists (Money, Growth, Health): label + note left, big value right. */
export function FigureList({ label, rows }: { label: string; rows: Figure[] }) {
  const { c } = useCrm();
  return (
    <View>
      <SectionLabel label={label} />
      {rows.map((f) => (
        <HoverRow key={f.label} onPress={f.onPress} label={`${f.label}: ${f.value}`} style={{ paddingVertical: 15 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={{ fontSize: 14, color: c.ink2 }}>{f.label}</Text>
            {f.note ? <Text style={{ fontSize: 12.5, color: toneColor(c, f.tone) }}>{f.note}</Text> : null}
          </View>
          <Text style={[{ fontFamily: DISPLAY_MEDIUM, fontSize: 26, color: f.value === '—' ? c.ink3 : c.ink }, TABULAR]}>{f.value}</Text>
        </HoverRow>
      ))}
    </View>
  );
}

/** A full-bleed hover row: hairline under it, the design's -10px bleed so the hover wash reaches the edge. */
export function HoverRow({
  children,
  onPress,
  selected,
  label,
  style,
  bleed = 10,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
  bleed?: number;
}) {
  const { c } = useCrm();
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: bleed,
    marginHorizontal: -bleed,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  };
  if (!onPress) return <View style={[base, selected && { backgroundColor: c.brzTint }, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [base, { backgroundColor: selected ? c.brzTint : hovered ? c.hover : 'transparent' }, style]}
    >
      {children}
    </Pressable>
  );
}

// ── Blocks (report sections) ───────────────────────────────────────────────

export interface BlockState {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMsg?: string | null;
}

/** A labelled report section with the design's loading / error / empty states built in. */
export function Block({
  label,
  link,
  onLink,
  sub,
  foot,
  state,
  skeleton = 'rows',
  children,
}: {
  label: string;
  link?: string | null;
  onLink?: () => void;
  sub?: string | null;
  foot?: string | null;
  state?: BlockState;
  skeleton?: 'chart' | 'rows';
  children?: React.ReactNode;
}) {
  const { c } = useCrm();
  const loading = state?.loading;
  const error = state?.error;
  const empty = !loading && !error ? state?.emptyMsg : null;
  return (
    <View style={{ minWidth: 0 }}>
      <SectionLabel label={label} right={link && onLink ? <LinkText label={link} onPress={onLink} /> : null} />
      {sub && !empty ? <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: c.ink3 }}>{sub}</Text> : null}
      {error ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 6, marginTop: 14 }}>
          <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.crit, flexShrink: 1 }}>{error}</Text>
          {state?.onRetry ? (
            <Text onPress={state.onRetry} accessibilityRole="button" style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
              Try again
            </Text>
          ) : null}
        </View>
      ) : loading ? (
        <Skeleton kind={skeleton} />
      ) : empty ? (
        <Text style={{ marginTop: 16, paddingVertical: 18, fontSize: 14.5, lineHeight: 22.5, color: c.ink2 }}>{empty}</Text>
      ) : (
        children
      )}
      {foot && !loading && !error && !empty ? <Text style={{ marginTop: 14, fontSize: 12.5, lineHeight: 19.4, color: c.ink3 }}>{foot}</Text> : null}
    </View>
  );
}

export function Skeleton({ kind = 'rows', msg }: { kind?: 'chart' | 'rows'; msg?: string }) {
  const { c } = useCrm();
  return (
    <View accessibilityLabel="Loading" style={{ gap: 12, paddingTop: 18 }}>
      {kind === 'chart' ? (
        <View style={{ height: 200, borderRadius: 10, backgroundColor: c.track }} />
      ) : (
        ['80%', '64%', '72%'].map((w) => <View key={w} style={{ height: 14, width: w as `${number}%`, borderRadius: 8, backgroundColor: c.track }} />)
      )}
      <Text style={{ fontSize: 12.5, color: c.ink3 }}>{msg ?? (kind === 'chart' ? 'Still loading. The rest of the page is ready.' : 'Loading…')}</Text>
    </View>
  );
}

/** The report grid: two columns (one under 600), 48 px between rows. A `full` child spans both. */
export function BlockGrid({ children }: { children: React.ReactNode }) {
  const { lg, sm } = useLayout();
  const kids = (Array.isArray(children) ? children : [children]).flat().filter(Boolean) as React.ReactElement<{ full?: boolean }>[];
  if (sm) return <View style={{ gap: 48 }}>{kids}</View>;
  const rows: React.ReactElement[][] = [];
  let open: React.ReactElement[] | null = null;
  for (const k of kids) {
    if (k.props?.full) {
      rows.push([k]);
      open = null;
    } else if (open && open.length === 1) {
      open.push(k);
      open = null;
    } else {
      open = [k];
      rows.push(open);
    }
  }
  return (
    <View style={{ gap: 48 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: lg ? 56 : 36, alignItems: 'flex-start' }}>
          {r.map((k, j) => (
            <View key={j} style={{ flex: 1, minWidth: 0 }}>
              {k}
            </View>
          ))}
          {r.length === 1 && !(r[0].props as { full?: boolean } | undefined)?.full ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Wraps a Block so BlockGrid spans it across both columns. */
export function Full({ children }: { children: React.ReactNode; full?: boolean }) {
  return <>{children}</>;
}

// ── Bars, rows, reviews, cohort ────────────────────────────────────────────

export interface BarItem {
  label: string;
  value: number;
  /** What to print instead of the grouped number ("$1,080", "64%"). */
  display?: string;
  note?: string;
}

export function Bars({ items }: { items: BarItem[] }) {
  const { c } = useCrm();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={{ gap: 16, paddingTop: 18 }}>
      {items.map((it) => (
        <View key={it.label} style={{ gap: 7 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <Text style={{ fontSize: 14, color: c.ink, flexShrink: 1 }} numberOfLines={1}>
              {it.label}
            </Text>
            <Text style={[{ fontSize: 13, color: c.ink3 }, TABULAR]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{it.display ?? Math.round(it.value).toLocaleString('en-US')}</Text>
              {it.note ? ` ${it.note}` : ''}
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.brz, width: `${Math.max(0, (it.value / max) * 100)}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export interface RowItem {
  label: string;
  value: string;
  note?: string | null;
}

export function Rows({ items }: { items: RowItem[] }) {
  const { c } = useCrm();
  return (
    <View>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', gap: 16, alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text style={{ fontSize: 14, color: c.ink2 }}>{it.label}</Text>
            {it.note ? <Text style={{ fontSize: 12.5, color: c.ink3 }}>{it.note}</Text> : null}
          </View>
          <Text style={[{ fontSize: 15, fontWeight: '600', color: c.ink, textAlign: 'right' }, TABULAR]}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  text: string | null;
  meta: string;
}

export function Reviews({ items }: { items: Review[] }) {
  const { c } = useCrm();
  return (
    <View>
      {items.map((r) => (
        <View key={r.id} style={{ gap: 5, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Text accessibilityLabel={`${r.rating} stars`} style={{ fontSize: 13, letterSpacing: 2, color: c.brz }}>
            {'★'.repeat(r.rating)}
            {'☆'.repeat(Math.max(0, 5 - r.rating))}
          </Text>
          {r.title ? <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{r.title}</Text> : null}
          {r.text ? <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink2 }}>{r.text}</Text> : null}
          <Text style={{ fontSize: 12.5, color: c.ink3 }}>{r.meta}</Text>
        </View>
      ))}
    </View>
  );
}

export interface CohortRow {
  label: string;
  /** Percent per week since signup; null = that week has not happened yet (blank, never 0). */
  cells: (number | null)[];
}

export function Cohort({ head, rows }: { head: string[]; rows: CohortRow[] }) {
  const { c, mode } = useCrm();
  const tint = (v: number) => (mode === 'forge' ? `rgba(191,143,79,${(0.03 + (v / 100) * 0.15).toFixed(3)})` : `rgba(154,105,52,${(0.03 + (v / 100) * 0.18).toFixed(3)})`);
  const cell: ViewStyle = { flex: 1, minWidth: 36, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6 };
  return (
    <View style={{ gap: 4, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Text style={{ width: 120, fontSize: 12, color: c.ink3, paddingVertical: 6 }}>Signup week</Text>
        {head.map((h) => (
          <Text key={h} style={{ flex: 1, minWidth: 36, fontSize: 12, color: c.ink3, paddingVertical: 6, textAlign: 'center' }}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', gap: 4 }}>
          <Text style={[{ width: 120, fontSize: 13, color: c.ink2, paddingVertical: 10 }, TABULAR]}>{r.label}</Text>
          {head.map((_, i) => {
            const v = r.cells[i] ?? null;
            return (
              <View key={i} style={[cell, { backgroundColor: v == null ? 'transparent' : tint(v) }]}>
                <Text style={[{ fontSize: 13, color: c.ink }, TABULAR]}>{v == null ? '' : `${Math.round(v)}%`}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── The chart ──────────────────────────────────────────────────────────────

const CH = 200;
const TOP = 14;

function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return (Math.ceil((v / p) * 2) / 2) * p;
}

/**
 * The design's smoothing: a Catmull-Rom-ish cubic through every point, tension 1/6 — with the control
 * points clamped to the plot. Unclamped, a spike next to a zero day overshoots BELOW the $0 line, and a
 * revenue curve that dips under zero reads as refunds that never happened.
 */
function smooth(p: { x: number; y: number }[]): string {
  if (!p.length) return '';
  const cy = (y: number) => Math.min(CH, Math.max(TOP, y));
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const k = 6;
    d += ` C${p1.x + (p2.x - p0.x) / k},${cy(p1.y + (p2.y - p0.y) / k)} ${p2.x - (p3.x - p1.x) / k},${cy(p2.y - (p3.y - p1.y) / k)} ${p2.x},${p2.y}`;
  }
  return d;
}

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Where a zoomed chart's axis starts: a round number a little under the lowest value. A count that only
 * grows (followers) drawn from zero is a flat line near the top; drawn from here, the month is readable.
 * The gridline labels say where the axis starts, so the zoom is never hidden.
 */
export function zoomBase(values: number[]): number {
  if (!values.length) return 0;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = 10 ** Math.floor(Math.log10(Math.max(hi - lo, 1)));
  return Math.max(0, Math.floor((lo - (hi - lo) * 0.1) / step) * step);
}

let gradSeq = 0;

/**
 * One series over time: smooth bronze line, fading area, three gridlines labelled at the left, four dates
 * under it, a hover crosshair and tooltip (web). `days` are yyyy-mm-dd, parallel to `values`; `weekly`
 * says each point is a week (the 1Y range) and prefixes the tooltip "Week of". `zoom` starts the axis near
 * the lowest value instead of at zero (see `zoomBase`) — for a running total, never for money or a rate.
 */
export function Chart({ values, days, fmt, weekly, zoom }: { values: number[]; days: string[]; fmt: (v: number) => string; weekly?: boolean; zoom?: boolean }) {
  const { c, mode } = useCrm();
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [gid] = useState(() => `crm-g-${gradSeq++}`);
  const n = values.length;
  const base = zoom ? zoomBase(values) : 0;
  const span = niceMax((Math.max(0, ...values) - base) * 1.08);
  const max = base + span;
  const pts = values.map((v, i) => ({ x: n > 1 ? (i / (n - 1)) * w : w / 2, y: TOP + (1 - Math.max(0, v - base) / span) * (CH - TOP) }));
  const line = smooth(pts);
  const area = pts.length ? `${line} L${w},${CH} L0,${CH} Z` : '';
  const grid = [base, base + span / 2, max].map((v) => ({ v, y: TOP + (1 - (v - base) / span) * (CH - TOP) }));
  const L = n - 1;
  const ticks = n > 1 ? [0, Math.round(L / 3), Math.round((2 * L) / 3), L] : [0];
  const last = pts[pts.length - 1];
  const h = hover != null && pts[hover] ? hover : null;

  const onMove = (e: GestureResponderEvent) => {
    if (!w || n < 2) return;
    const target = e.currentTarget as unknown as { getBoundingClientRect?: () => { left: number; width: number } };
    const ne = e.nativeEvent as unknown as { clientX?: number; locationX?: number };
    let x: number;
    if (target?.getBoundingClientRect && ne.clientX != null) {
      const r = target.getBoundingClientRect();
      x = ((ne.clientX - r.left) / r.width) * w;
    } else {
      x = ne.locationX ?? 0;
    }
    const i = Math.max(0, Math.min(L, Math.round((x / w) * L)));
    if (i !== hover) setHover(i);
  };

  const pointerProps = { onPointerMove: onMove, onPointerLeave: () => setHover(null) } as unknown as object;

  return (
    <View style={{ marginTop: 20 }}>
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ position: 'relative' }} {...pointerProps}>
        {w > 0 ? (
          <Svg width={w} height={204} viewBox={`0 0 ${w} 204`} style={{ overflow: 'visible' }}>
            <Defs>
              <SvgGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.brz} stopOpacity={mode === 'forge' ? 0.22 : 0.16} />
                <Stop offset="1" stopColor={c.brz} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {grid.map((g) => (
              <Line key={g.v} x1={0} x2={w} y1={g.y} y2={g.y} stroke={c.line} strokeWidth={1} />
            ))}
            {area ? <Path d={area} fill={`url(#${gid})`} /> : null}
            {line ? <Path d={line} fill="none" stroke={c.brz} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" /> : null}
            {h != null ? (
              <>
                <Line x1={pts[h].x} x2={pts[h].x} y1={8} y2={200} stroke={c.ink3} strokeWidth={1} strokeDasharray="2 4" />
                <Circle cx={pts[h].x} cy={pts[h].y} r={5} fill={c.bg} stroke={c.brz} strokeWidth={2} />
              </>
            ) : null}
            {last ? <Circle cx={last.x} cy={last.y} r={4} fill={c.brz} /> : null}
          </Svg>
        ) : (
          <View style={{ height: 204 }} />
        )}
        {grid.map((g) => (
          <Text key={`l${g.v}`} pointerEvents="none" style={[{ position: 'absolute', left: 0, top: g.y - 17, fontSize: 11, color: c.ink3 }, TABULAR]}>
            {fmt(g.v)}
          </Text>
        ))}
        {h != null ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: -6, left: pts[h].x, width: 0, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: c.tip, borderWidth: 1, borderColor: c.line, width: 170, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12.5, color: c.ink3 }} numberOfLines={1}>
                {weekly ? 'Week of ' : ''}
                {dayLabel(days[h])}
              </Text>
              <Text style={[{ fontSize: 12.5, fontWeight: '600', color: c.ink }, TABULAR]}>{fmt(values[h])}</Text>
            </View>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {ticks.map((i) => (
          <Text key={i} style={{ fontSize: 11.5, color: c.ink3 }}>
            {days[i] ? dayLabel(days[i]) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c } = useCrm();
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((m: string) => {
    if (t.current) clearTimeout(t.current);
    setMsg(m);
    t.current = setTimeout(() => setMsg(null), 3000);
  }, []);
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  return (
    <ToastCtx.Provider value={flash}>
      {children}
      {msg ? (
        <View
          accessibilityRole="alert"
          style={[
            { position: Platform.OS === 'web' ? ('fixed' as ViewStyle['position']) : 'absolute', bottom: 28, alignSelf: 'center', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
          ]}
          pointerEvents="none"
        >
          <View style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: c.tip, borderWidth: 1, borderColor: c.panelBd, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 12 } }}>
            <Text style={{ fontSize: 14, color: c.ink }}>{msg}</Text>
          </View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

// ── Query glue ─────────────────────────────────────────────────────────────

/** A `useQuery` result as a Block state: loading only before the first answer, retry = refetch. */
export function qState(q: { loading: boolean; error: string | null; data: unknown; refetch: () => void }, emptyMsg?: string | null): BlockState {
  return { loading: q.loading && q.data == null, error: q.error, onRetry: q.refetch, emptyMsg: q.data != null ? emptyMsg ?? null : null };
}

/** "Sep 28" / "Sep 28, 2:14 PM" / "Mar 4, 2025" (other years). */
export function when(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

/** "6d" / "3h" / "now" — the bug table's Age column. */
export function age(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const ms = now - new Date(iso).getTime();
  if (!(ms >= 0)) return 'now';
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `${d}d`;
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h` : 'now';
}

// ── Report-page additions (Overview / Revenue / AI / App Store pass) ────────

/** The report pages' closing footnote (the design's `pg.footnote`). */
export function FootNote({ children }: { children: React.ReactNode }) {
  const { c } = useCrm();
  return <Text style={{ marginTop: 48, maxWidth: 760, fontSize: 12.5, lineHeight: 20, color: c.ink3 }}>{children}</Text>;
}

/** A section's error line that sits ABOVE content still worth showing (App Store's partial sync). */
export function ErrorLine({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  const { c } = useCrm();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 6, marginTop: 14 }}>
      <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.crit, flexShrink: 1 }}>{children}</Text>
      {onRetry ? (
        <Text onPress={onRetry} accessibilityRole="button" style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
          Try again
        </Text>
      ) : null}
    </View>
  );
}

/** The display face at medium weight — the Overview's 60 px revenue hero. */
export const DISPLAY_M = DISPLAY_MEDIUM;
