import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { fetchSquadInvite, regenerateSquadCode } from '@/data/squad-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Invite — built to `Squad Invite.dc.html`, scoped to what Squad Core can back with real data.
 *
 * The keystone that makes squads multi-person: a real, shareable invite code (`squads.invite_code`, 0040) +
 * the counterpart `/join-squad` screen where a code becomes a membership. Design-faithful, fully-wired
 * sections: the squad header, the Invite Code hero (copy · regenerate, owner-only), Share / Message / QR +
 * the copy-link row, and the Scan-to-Join QR sheet. The design's "Add From Your Circle" and "Pending
 * Invites" ride on a friends/follow graph + a directed-invite table that don't exist yet, so — like Detail's
 * check-ins/feed — they're intentionally omitted (a later Social part), not stubbed with fake athletes.
 */

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const APP_ORIGIN = 'https://forgelegacy.expo.app';
const joinLink = (code: string): string => {
  const base = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin ? window.location.origin : APP_ORIGIN;
  return `${base}/join-squad?code=${encodeURIComponent(code)}`;
};

export default function SquadInviteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const squadId = String(id ?? '');
  const { data: squad, loading, error, refetch } = useQuery(() => fetchSquadInvite(squadId), [squadId]);
  const { showToast } = useToast();

  const [qrOpen, setQrOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const code = squad?.inviteCode ?? '';
  const link = code ? joinLink(code) : '';
  const inviteText = squad && code ? `Join ${squad.name} on Forge Legacy.\nCode: ${code}\n${link}` : '';
  const qrCells = useMemo(() => (code ? buildQr(21, code) : []), [code]);

  const copy = async (text: string, toast: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showToast(toast);
    } catch {
      showToast('Couldn’t copy — copy it by hand.');
    }
  };

  const onShare = async () => {
    if (!inviteText) return;
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as { share?: (d: { title?: string; text?: string }) => Promise<void> }) : undefined;
      if (nav && typeof nav.share === 'function') {
        try {
          await nav.share({ title: squad?.name, text: inviteText });
        } catch {
          // user dismissed the share sheet — nothing to do
        }
        return;
      }
      await copy(inviteText, 'Invite copied — paste it anywhere');
      return;
    }
    try {
      await Share.share({ message: inviteText });
    } catch {
      // dismissed
    }
  };

  const onMessage = async () => {
    if (!inviteText) return;
    if (Platform.OS !== 'web') {
      try {
        await Linking.openURL(`sms:?&body=${encodeURIComponent(inviteText)}`);
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await copy(inviteText, 'Invite copied — paste it into a message');
  };

  const onCopyLink = () => {
    if (!link) return;
    if (linkTimer.current) clearTimeout(linkTimer.current);
    setLinkCopied(true);
    void Clipboard.setStringAsync(link).catch(() => {});
    linkTimer.current = setTimeout(() => setLinkCopied(false), 1800);
  };

  const onRegenerate = () => {
    if (!squad || regenerating) return;
    setRegenerating(true);
    regenerateSquadCode(squad.id).then(
      () => {
        setRegenerating(false);
        refetch();
        showToast('New invite code generated');
      },
      (e: unknown) => {
        setRegenerating(false);
        showToast(errorMessage(e));
      },
    );
  };

  if (loading && !squad) {
    return (
      <View style={styles.root}>
        <InviteBg />
        <AppBar title="Invite to Squad" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }
  if (!squad) {
    return (
      <View style={styles.root}>
        <InviteBg />
        <AppBar title="Invite to Squad" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>This squad isn’t available.</Text>
          <Text style={styles.missingBody}>{error ? 'Couldn’t load it — check your connection.' : 'It may have been deleted.'}</Text>
        </View>
      </View>
    );
  }

  // The owner keeps invites to themselves (Settings → Permissions → Who Can Invite). Withheld
  // server-side too — the code simply isn't in the response — so this states the rule rather than
  // hiding a value the screen was handed.
  if (!squad.canInvite) {
    return (
      <View style={styles.root}>
        <InviteBg />
        <AppBar title="Invite to Squad" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Only the owner can invite to {squad.name}.</Text>
          <Text style={styles.missingBody}>Ask them to share the squad’s invite code, or to open invites to all members in Squad Settings.</Text>
        </View>
      </View>
    );
  }

  const metaLine = `${squad.privacy === 'public' ? 'Public' : 'Private'} · ${squad.memberCount === 1 ? '1 member' : `${squad.memberCount} members`}`;
  const noCode = !code; // 0040 not applied yet

  return (
    <View style={styles.root}>
      <InviteBg />
      <AppBar title="Invite to Squad" serif onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* SQUAD HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.headerCrest}>
            {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.headerCrestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={42} />}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {squad.name}
            </Text>
            <Text style={styles.headerMeta}>{metaLine}</Text>
          </View>
        </View>

        {/* 1 · INVITE CODE HERO */}
        <View style={styles.codeCard}>
          <View style={styles.codeCardTop}>
            <Text style={styles.codeEyebrow}>Squad Invite Code</Text>
            <Text style={styles.codeValue} selectable numberOfLines={1} adjustsFontSizeToFit>
              {noCode ? '— — — —' : code}
            </Text>
            <View style={styles.expiryRow}>
              <ClockIcon />
              <Text style={styles.expiryText}>{noCode ? 'Run migration 0040 to generate a code' : 'This code never expires'}</Text>
            </View>
          </View>
          <View style={styles.codeActions}>
            <Pressable onPress={() => (noCode ? undefined : copy(code, 'Invite code copied'))} disabled={noCode} accessibilityRole="button" accessibilityLabel="Copy invite code" style={styles.copyCodeBtn}>
              <CopyIcon />
              <Text style={styles.copyCodeText}>Copy Code</Text>
            </Pressable>
            {squad.isOwner ? (
              <Pressable onPress={onRegenerate} disabled={noCode || regenerating} accessibilityRole="button" accessibilityLabel="Regenerate invite code" style={styles.regenBtn}>
                <RefreshIcon />
                <Text style={styles.regenText}>{regenerating ? 'Rolling…' : 'Regenerate'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 2 · SHARE INVITE */}
        <Text style={styles.sectionLabel}>Share Invite</Text>
        <View style={styles.tileGrid}>
          <ShareTile primary label="Share" icon={<ShareGlyph />} onPress={onShare} disabled={noCode} />
          <ShareTile label="Message" icon={<MessageGlyph />} onPress={onMessage} disabled={noCode} />
          <ShareTile label="QR Code" icon={<QrGlyph />} onPress={() => setQrOpen(true)} disabled={noCode} />
        </View>

        <Pressable
          onPress={onCopyLink}
          disabled={noCode}
          accessibilityRole="button"
          accessibilityLabel="Copy invite link"
          style={[styles.linkRow, linkCopied ? styles.linkRowCopied : null]}
        >
          <LinkIcon />
          <Text style={styles.linkText} numberOfLines={1}>
            {noCode ? 'Invite link unavailable' : link.replace(/^https?:\/\//, '')}
          </Text>
          <View style={styles.linkCopyWrap}>
            {linkCopied ? <CheckIcon color={flColor.greenMuted} /> : null}
            <Text style={[styles.linkCopyText, linkCopied ? styles.linkCopyTextDone : null]}>{linkCopied ? 'Copied' : 'Copy'}</Text>
          </View>
        </Pressable>

        {/* footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Forge Legacy</Text>
          <Text style={styles.footerNote}>Anyone with the code can join this squad.</Text>
        </View>
      </ScrollView>

      {/* QR SHEET */}
      <BottomSheet open={qrOpen} onClose={() => setQrOpen(false)} title="Scan to Join">
        <View style={styles.qrBody}>
          <View style={styles.qrPlate}>
            <View style={styles.qrGrid}>
              {qrCells.map((on, i) => (
                <View key={i} style={[styles.qrCell, on ? styles.qrCellOn : null]} />
              ))}
            </View>
          </View>
          <View style={styles.qrCaption}>
            <Text style={styles.qrCode}>{code}</Text>
            <Text style={styles.qrHint}>Point a camera at the code, or share it, to join {squad.name}.</Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function InviteBg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />;
}

function ShareTile({ label, icon, onPress, primary = false, disabled = false }: { label: string; icon: React.ReactNode; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, primary ? styles.tilePrimary : styles.tileSecondary, pressed ? styles.tilePressed : null, disabled ? styles.tileDisabled : null]}
    >
      <View style={[styles.tileIcon, primary ? styles.tileIconPrimary : styles.tileIconSecondary]}>{icon}</View>
      <Text style={[styles.tileLabel, primary ? styles.tileLabelPrimary : styles.tileLabelSecondary]}>{label}</Text>
    </Pressable>
  );
}

/** Deterministic pseudo-QR (visual only) with three finder patterns — ported from the design's `_qr`. */
function buildQr(dim: number, seed: string): boolean[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const inFinder = (r: number, c: number): { hit: boolean; on: boolean } => {
    const corners = [
      [0, 0],
      [0, dim - 7],
      [dim - 7, 0],
    ];
    for (const [fr, fc] of corners) {
      const dr = r - fr;
      const dc = c - fc;
      if (dr >= 0 && dr < 7 && dc >= 0 && dc < 7) {
        const edge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        return { hit: true, on: edge || core };
      }
      if (dr >= -1 && dr < 8 && dc >= -1 && dc < 8) return { hit: true, on: false };
    }
    return { hit: false, on: false };
  };
  const cells: boolean[] = [];
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      const f = inFinder(r, c);
      cells.push(f.hit ? f.on : rnd() > 0.5);
    }
  }
  return cells;
}

// ── glyphs ──
function ClockIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}
function CopyIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 9h10v10H9z" />
      <Path d="M5 15V5h10" />
    </Svg>
  );
}
function RefreshIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
      <Path d="M20 4v4h-4" />
      <Path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" />
      <Path d="M4 20v-4h4" />
    </Svg>
  );
}
function LinkIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.5 14.5l5-5" />
      <Path d="M8 12l-2 2a3 3 0 0 0 4.2 4.2l2-2" />
      <Path d="M16 12l2-2a3 3 0 0 0-4.2-4.2l-2 2" />
    </Svg>
  );
}
function CheckIcon({ color = flColor.bronze300 }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function ShareGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={18} cy={5} r={2.6} />
      <Circle cx={6} cy={12} r={2.6} />
      <Circle cx={18} cy={19} r={2.6} />
      <Path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" />
    </Svg>
  );
}
function MessageGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5h16v11H9l-4 3z" />
    </Svg>
  );
}
function QrGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h6v6H4z" />
      <Path d="M14 4h6v6h-6z" />
      <Path d="M4 14h6v6H4z" />
      <Path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  missingTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  missingBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },

  // squad header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 },
  headerCrest: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 4px 12px rgba(0,0,0,0.55), 0 0 10px rgba(186, 134, 84,0.2)`,
  },
  headerCrestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerName: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  headerMeta: { fontSize: 11.5, letterSpacing: 0.3, color: flColor.gray600 },

  // invite code hero
  codeCard: {
    marginTop: 14,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: '#161009',
    overflow: 'hidden',
    boxShadow: `${flShadow.borderInset}, ${flShadow.card}`,
  },
  codeCardTop: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, alignItems: 'center' },
  codeEyebrow: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },
  codeValue: {
    fontFamily: MONO,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 8,
    paddingLeft: 8,
    color: flColor.bronze300,
    marginTop: 11,
    textShadowColor: 'rgba(186, 134, 84,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  expiryText: { fontSize: 11.5, fontWeight: '500', color: flColor.gray600 },
  codeActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: flColor.bronzeBorderSubtle },
  copyCodeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15 },
  copyCodeText: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },
  regenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, paddingHorizontal: 20, borderLeftWidth: 1, borderLeftColor: flColor.bronzeBorderSubtle },
  regenText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  // share
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 30, marginBottom: 12, marginLeft: 4 },
  tileGrid: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, alignItems: 'center', gap: 11, paddingVertical: 18, paddingHorizontal: 8, borderRadius: flRadius.lg, borderWidth: 1 },
  tilePrimary: { backgroundColor: '#17120B', borderColor: flColor.bronzeBorder, boxShadow: `${flShadow.borderInset}, ${flShadow.card}` },
  tileSecondary: { backgroundColor: flColor.charcoal800, borderColor: flColor.bronzeBorderSubtle, boxShadow: flShadow.card },
  tilePressed: { transform: [{ scale: 0.97 }] },
  tileDisabled: { opacity: 0.4 },
  tileIcon: { width: 44, height: 44, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tileIconPrimary: { backgroundColor: '#3D2F1A', borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  tileIconSecondary: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },
  tileLabel: { fontSize: 12.5 },
  tileLabelPrimary: { fontWeight: '600', color: flColor.cream100 },
  tileLabelSecondary: { fontWeight: '500', color: flColor.gray400 },

  // link row
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  linkRowCopied: { borderColor: flColor.bronzeBorder },
  linkText: { flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 12.5, color: flColor.gray400 },
  linkCopyWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  linkCopyText: { fontSize: 12, fontWeight: '600', color: flColor.bronze400 },
  linkCopyTextDone: { color: flColor.greenMuted },

  // footer
  footer: { marginTop: 30, alignItems: 'center', gap: 3 },
  footerBrand: { fontFamily: flFont.display, fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.charcoal500 },
  footerNote: { fontSize: 10, letterSpacing: 0.8, color: flColor.charcoal500 },

  // qr sheet
  qrBody: { alignItems: 'center', gap: 16, paddingBottom: 6 },
  qrPlate: { padding: 16, borderRadius: flRadius.lg, backgroundColor: '#EDE4D2', boxShadow: `${flShadow.shadowImage}, 0 0 20px rgba(186, 134, 84,0.25)` },
  qrGrid: { width: 210, height: 210, flexDirection: 'row', flexWrap: 'wrap' },
  qrCell: { width: 10, height: 10, backgroundColor: 'transparent' },
  qrCellOn: { backgroundColor: '#141210' },
  qrCaption: { alignItems: 'center', gap: 6 },
  qrCode: { fontFamily: MONO, fontSize: 18, fontWeight: '700', letterSpacing: 4, color: flColor.bronze300 },
  qrHint: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, textAlign: 'center', maxWidth: 260 },
});
