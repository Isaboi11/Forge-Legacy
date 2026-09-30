/**
 * A bug in plain English, with the full report one tap away (0245, PO 2026-09-29: *"really dumbed down …
 * why it's happening and what we're going to do to fix it … see more … who it affected, or if it's
 * affecting everyone"*). Used by the desktop Bugs page and the phone bug overlay.
 *
 * The summary is written by the `bug-plain` Edge Function the first time a bug is opened (and again when
 * its title or detail changes — `plain_stale`), then kept on the row. While it is being written, or if it
 * can't be, the full report is shown open so nothing is ever hidden behind a failure.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";

import { useCrm } from "@/components/forge/admin/crm-theme";
import {
  writeBugPlain,
  type Bug,
  type BugPlain,
  type BugScope,
} from "@/data/crm-live";
import { rawErrorMessage as errorMessage } from "@/lib/useQuery";

/* Written this session, and calls in flight — shared by both views, so opening a bug on the phone and the
   desktop at once (or re-opening it before the board refetches) never pays for a second summary. */
const written = new Map<string, BugPlain>();
const inflight = new Map<string, Promise<BugPlain>>();

function write(id: string): Promise<BugPlain> {
  let p = inflight.get(id);
  if (!p) {
    p = writeBugPlain(id)
      .then((pl) => {
        written.set(id, pl);
        return pl;
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

function useBugPlain(bug: Bug, offline: boolean) {
  const [tick, setTick] = useState(0);
  const [got, setGot] = useState<{
    id: string;
    plain?: BugPlain;
    error?: string;
  } | null>(null);
  const id = bug.id;
  const current =
    written.get(id) ?? (bug.plain && !bug.plain_stale ? bug.plain : undefined);
  const need = !current && !offline;

  useEffect(() => {
    if (!need) return;
    let live = true;
    write(id).then(
      (pl) => live && setGot({ id, plain: pl }),
      (e) => live && setGot({ id, error: errorMessage(e) }),
    );
    return () => {
      live = false;
    };
  }, [id, need, tick]);

  const mine = got?.id === id ? got : null;
  return {
    /* A stale summary stays on screen while its replacement is written. */
    plain: current ?? mine?.plain ?? bug.plain ?? null,
    updating: need && !mine && !!bug.plain,
    loading: need && !mine && !bug.plain,
    error: !current && !mine?.plain ? (mine?.error ?? null) : null,
    retry: () => {
      setGot(null);
      setTick((t) => t + 1);
    },
  };
}

const SCOPE: Record<BugScope, string> = {
  everyone: "Everyone",
  some: "Some people",
  one: "One person",
  unknown: "Not sure yet",
};

export function BugPlainView({
  bug,
  offline = false,
  phone = false,
  children,
}: {
  bug: Bug;
  offline?: boolean;
  phone?: boolean;
  children: ReactNode;
}) {
  const { c } = useCrm();
  const { plain, updating, loading, error, retry } = useBugPlain(bug, offline);
  const [open, setOpen] = useState<{ id: string; on: boolean } | null>(null);
  /* No summary to read → the report is open. Otherwise it's folded until asked for. */
  const reportOpen = open?.id === bug.id ? open.on : !plain;

  const body = phone
    ? { fontSize: 16, lineHeight: 24.8 }
    : { fontSize: 14, lineHeight: 22.4 };
  const label = {
    fontSize: phone ? 12 : 11.5,
    fontWeight: "600" as const,
    letterSpacing: 0.9,
    textTransform: "uppercase" as const,
    color: c.ink3,
  };
  const scopeColor =
    plain?.scope === "everyone"
      ? c.critInk
      : plain?.scope === "some"
        ? c.warn
        : c.ink2;

  const row = (title: string, text: string | undefined, extra?: ReactNode) =>
    text?.trim() ? (
      <View style={{ gap: 4 }}>
        <Text style={label}>{title}</Text>
        {extra}
        <Text selectable style={{ ...body, color: c.ink }}>
          {text.trim()}
        </Text>
      </View>
    ) : null;

  return (
    <View style={{ gap: phone ? 16 : 14 }}>
      {plain ? (
        <>
          {row("What’s wrong", plain.what)}
          {row("Why it happens", plain.why)}
          {row("The fix", plain.fix)}
          {row(
            "Who it affects",
            plain.who,
            <Text
              style={{
                fontSize: body.fontSize - 1,
                fontWeight: "600",
                color: scopeColor,
              }}
            >
              {SCOPE[plain.scope] ?? SCOPE.unknown}
            </Text>,
          )}
          {updating ? (
            <Text style={{ fontSize: 12.5, color: c.ink3 }}>
              The report changed — updating this summary…
            </Text>
          ) : null}
        </>
      ) : loading ? (
        <Text style={{ ...body, color: c.ink3 }}>
          Writing a plain-English summary…
        </Text>
      ) : error ? (
        <Text style={{ ...body, color: c.ink3 }}>
          Summary unavailable. {error}{" "}
          <Text
            onPress={retry}
            accessibilityRole="button"
            style={{ fontWeight: "600", color: c.brz }}
          >
            Try again
          </Text>
        </Text>
      ) : null}

      {plain ? (
        <Text
          onPress={() => setOpen({ id: bug.id, on: !reportOpen })}
          accessibilityRole="button"
          accessibilityState={{ expanded: reportOpen }}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 4,
            fontSize: phone ? 15 : 13.5,
            fontWeight: "600",
            color: c.brz,
          }}
        >
          {reportOpen ? "Hide full report" : "See full report"}
        </Text>
      ) : null}
      {reportOpen ? children : null}
    </View>
  );
}
