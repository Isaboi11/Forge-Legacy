import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, type TextInputProps } from 'react-native';

import { flColor, flFont, flRadius, flText } from '@/constants/foundation';

/**
 * The Business CRM's UI kit (Admin-Analytics-Amendment-002).
 *
 * ══ TWO RULES SHAPE EVERY PIECE HERE ══
 *
 *   1. CARDS ARE FOR ACTING INSIDE (PO, 2026-08-24). Information gets a label and a hairline — `Block`
 *      has no box. Only an editor (`Panel`) gets a surface, because that is where the operator types.
 *   2. BRONZE IS EARNED. The selected nav item, the selected chip and the one primary button per view.
 *      Structure is `charcoal700` hairlines; nothing else is bronze-edged.
 *
 * Colours come only from `flColor` / `flText`, so both themes (Forge dark, Alabaster light) resolve
 * through the same tokens with no per-theme code here.
 */

/** A desktop-width window. The CRM is mostly used on the web, so this is the primary layout. */
export function useWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= 900;
}

// ── Page scaffolding ────────────────────────────────────────────────────────

export function PageHead({ title, lede, right }: { title: string; lede?: string; right?: React.ReactNode }) {
  const wide = useWide();
  return (
    <View style={[s.pageHead, wide && s.pageHeadWide]}>
      <View style={s.pageHeadText}>
        <Text style={[s.pageTitle, wide && s.pageTitleWide]}>{title}</Text>
        {lede ? <Text style={s.pageLede}>{lede}</Text> : null}
      </View>
      {right ? <View style={s.pageHeadRight}>{right}</View> : null}
    </View>
  );
}

/** A labelled section on the ground — no card. */
export function Block({
  label,
  hint,
  right,
  children,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={s.block}>
      <View style={s.blockHead}>
        <Text style={s.blockLabel}>{label}</Text>
        {right ? <View style={s.blockRight}>{right}</View> : null}
      </View>
      {hint ? <Text style={s.blockHint}>{hint}</Text> : null}
      <View style={s.blockBody}>{children}</View>
    </View>
  );
}

/** Side-by-side on a wide window, stacked on a phone. */
export function Columns({ children, ratio }: { children: React.ReactNode; ratio?: [number, number] }) {
  const wide = useWide();
  const kids = Array.isArray(children) ? children.filter(Boolean) : [children];
  if (!wide) return <View style={s.stack}>{kids}</View>;
  const [a, b] = ratio ?? [1, 1];
  return (
    <View style={s.columns}>
      {kids.map((k, i) => (
        <View key={i} style={{ flex: i === 0 ? a : b, minWidth: 0 }}>
          {k}
        </View>
      ))}
    </View>
  );
}

/** An editor surface — the one place a box is earned. */
export function Panel({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return <View style={[s.panel, tone === 'danger' && s.panelDanger]}>{children}</View>;
}

// ── KPIs ────────────────────────────────────────────────────────────────────

export interface KpiProps {
  label: string;
  value: string;
  /** A second line: a delta ("▲ 12% vs prior 30d") or context ("of 140 athletes"). */
  sub?: string;
  /** Direction for the sub line. The glyph in `sub` carries meaning; colour only reinforces it. */
  dir?: 'up' | 'down' | 'flat';
  /** When "up" is bad (costs, churn, open bugs), flip the reinforcing colour. */
  invert?: boolean;
  onPress?: () => void;
}

export function Kpis({ items }: { items: KpiProps[] }) {
  const wide = useWide();
  return (
    <View style={s.kpis}>
      {items.map((k) => (
        <Kpi key={k.label} {...k} basis={wide ? (items.length >= 4 ? '23%' : '31%') : '46%'} />
      ))}
    </View>
  );
}

function Kpi({ label, value, sub, dir, invert, onPress, basis }: KpiProps & { basis: `${number}%` }) {
  const good = dir === 'flat' || dir == null ? null : (dir === 'up') !== !!invert;
  const body = (
    <>
      <Text style={s.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={s.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text
          style={[s.kpiSub, good === true && { color: flColor.greenMuted }, good === false && { color: flColor.redMuted }]}
          numberOfLines={2}
        >
          {sub}
        </Text>
      ) : null}
    </>
  );
  if (!onPress) return <View style={[s.kpi, { flexBasis: basis }]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        s.kpi,
        { flexBasis: basis },
        (pressed || hovered) && s.kpiHover,
      ]}
    >
      {body}
    </Pressable>
  );
}

/** "▲ 12% vs prior 30d" — the glyph and sign always, so direction never depends on colour. */
export function deltaSub(value: number, prev: number, note: string): { sub: string; dir: 'up' | 'down' | 'flat' } | null {
  if (!Number.isFinite(value) || !Number.isFinite(prev)) return null;
  if (prev === 0) return value === 0 ? { sub: `no change ${note}`, dir: 'flat' } : { sub: `new ${note}`, dir: 'up' };
  const pct = Math.round(((value - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return { sub: `· flat ${note}`, dir: 'flat' };
  return { sub: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% ${note}`, dir: pct > 0 ? 'up' : 'down' };
}

// ── Query states ────────────────────────────────────────────────────────────

export function QueryGate({
  state,
  children,
}: {
  state: { loading: boolean; error: string | null; data: unknown };
  children: React.ReactNode;
}) {
  if (state.loading && state.data == null) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={flColor.bronze400} size="small" />
      </View>
    );
  }
  if (state.error) return <Text style={s.error}>{state.error}</Text>;
  return <>{children}</>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <Text style={s.empty}>{children}</Text>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={s.note}>{children}</Text>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={s.error}>{children}</Text>;
}

// ── Controls ────────────────────────────────────────────────────────────────

export function Chip({
  label,
  on,
  onPress,
  count,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  count?: number | null;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [s.chip, on && s.chipOn, pressed && s.pressed]}
    >
      <Text style={[s.chipText, on && s.chipTextOn]}>
        {label}
        {count != null ? <Text style={s.chipCount}> {count}</Text> : null}
      </Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={s.chips}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  kind = 'quiet',
  disabled,
  busy,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        kind === 'primary' && s.btnPrimary,
        kind === 'danger' && s.btnDanger,
        off && s.btnOff,
        pressed && !off && s.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={kind === 'primary' ? flColor.onBronze : flColor.bronze400} />
      ) : (
        <Text
          style={[
            s.btnText,
            small && s.btnTextSmall,
            kind === 'primary' && s.btnTextPrimary,
            kind === 'danger' && s.btnTextDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={s.field}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={flColor.gray600}
        {...props}
        style={[s.input, props.multiline && s.inputMulti, style]}
      />
    </View>
  );
}

// ── Lists ───────────────────────────────────────────────────────────────────

export function ListRow({
  children,
  onPress,
  selected,
  label,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  label?: string;
}) {
  if (!onPress) return <View style={s.row}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        s.row,
        (pressed || hovered) && s.rowHover,
        selected && s.rowSelected,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function RowTitle({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <Text style={[s.rowTitle, dim && s.rowTitleDim]} numberOfLines={2}>
      {children}
    </Text>
  );
}

export function RowMeta({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return (
    <Text style={[s.rowMeta, tone === 'warn' && s.rowMetaWarn]} numberOfLines={2}>
      {children}
    </Text>
  );
}

/** A small uppercase tag. Severity tags carry the word; colour only reinforces. */
export function Tag({ label, tone }: { label: string; tone?: 'critical' | 'high' | 'ok' | 'muted' | 'accent' }) {
  return (
    <View
      style={[
        s.tag,
        tone === 'critical' && s.tagCritical,
        tone === 'high' && s.tagHigh,
        tone === 'ok' && s.tagOk,
        tone === 'accent' && s.tagAccent,
      ]}
    >
      <Text
        style={[
          s.tagText,
          tone === 'critical' && { color: flColor.redMuted },
          tone === 'high' && { color: flColor.bronzeInk },
          tone === 'ok' && { color: flColor.greenMuted },
          tone === 'accent' && { color: flColor.bronzeInk },
          tone === 'muted' && { color: flColor.gray600 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvK} numberOfLines={1}>
        {k}
      </Text>
      {typeof v === 'string' || typeof v === 'number' ? (
        <Text style={s.kvV} selectable>
          {v}
        </Text>
      ) : (
        v
      )}
    </View>
  );
}

/** "Sep 28" / "Sep 28, 2:14 PM". */
export function when(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  pageHead: { gap: 10, paddingTop: 6, paddingBottom: 4 },
  pageHeadWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, paddingTop: 18 },
  pageHeadText: { flexShrink: 1, gap: 4 },
  pageHeadRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pageTitle: { color: flText.primary, fontFamily: flFont.display, fontSize: 24, letterSpacing: 0.2 },
  pageTitleWide: { fontSize: 30 },
  pageLede: { color: flColor.gray400, fontSize: 13, lineHeight: 19, maxWidth: 680 },

  block: { gap: 8 },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: flColor.charcoal700,
  },
  blockLabel: { color: flText.bronzeLabel, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  blockRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  blockHint: { color: flColor.gray600, fontSize: 11.5, lineHeight: 17 },
  blockBody: { gap: 8 },

  stack: { gap: 26 },
  columns: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },

  panel: {
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    padding: 16,
    gap: 12,
  },
  panelDanger: { borderColor: flColor.dangerBorder },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    gap: 3,
  },
  kpiHover: { backgroundColor: flColor.charcoal700 },
  kpiLabel: { color: flText.tertiary, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  kpiValue: { color: flText.primary, fontFamily: flFont.display, fontSize: 26, letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  kpiSub: { color: flColor.gray600, fontSize: 11, lineHeight: 15 },

  loading: { paddingVertical: 24, alignItems: 'center' },
  error: { color: flColor.redMuted, fontSize: 12.5, lineHeight: 18, paddingVertical: 8 },
  empty: { color: flColor.gray600, fontSize: 12.5, lineHeight: 18, paddingVertical: 8 },
  note: { color: flColor.gray600, fontSize: 11, lineHeight: 16 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  chipOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.bronzeTint },
  chipText: { color: flColor.gray400, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: flColor.bronzeInk },
  chipCount: { color: flColor.gray600, fontWeight: '500' },
  pressed: { opacity: 0.7 },

  btn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { minHeight: 30, paddingHorizontal: 10 },
  btnPrimary: { backgroundColor: flColor.bronzeSolid, borderColor: flColor.bronzeSolid },
  btnDanger: { borderColor: flColor.dangerBorder },
  btnOff: { opacity: 0.45 },
  btnText: { color: flText.primary, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  btnTextSmall: { fontSize: 12 },
  btnTextPrimary: { color: flColor.onBronze },
  btnTextDanger: { color: flColor.dangerText },

  field: { gap: 5, flexGrow: 1 },
  fieldLabel: { color: flText.tertiary, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  input: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flText.primary,
    fontSize: 14,
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },

  row: {
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: flRadius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: flColor.charcoal700,
    gap: 4,
  },
  rowHover: { backgroundColor: flColor.hoverWash },
  rowSelected: { backgroundColor: flColor.bronzeTint },
  rowTitle: { color: flText.primary, fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  rowTitleDim: { color: flColor.gray600, fontStyle: 'italic', fontWeight: '500' },
  rowMeta: { color: flColor.gray600, fontSize: 11.5, lineHeight: 16 },
  rowMetaWarn: { color: flColor.bronzeInk, fontWeight: '600' },

  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: flRadius.xs,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  tagCritical: { borderColor: flColor.dangerBorder, backgroundColor: flColor.dangerBg },
  tagHigh: { borderColor: flColor.accentBorderSubtle },
  tagOk: { borderColor: flColor.charcoal600 },
  tagAccent: { borderColor: flColor.accentBorder, backgroundColor: flColor.bronzeTint },
  tagText: { color: flColor.gray400, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },

  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, paddingVertical: 4 },
  kvK: { color: flText.secondary, fontSize: 12.5, flexShrink: 1 },
  kvV: { color: flText.primary, fontSize: 12.5, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
});
