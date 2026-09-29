/**
 * "Copy for Claude" — a bug from the CRM board as a brief the owner pastes into a Claude Code session
 * (PO 2026-09-29: *"we have the information, but how do we fix them"*). The board lives in the database,
 * which a coding session cannot read, so the button carries everything the fix needs: the ref (to say
 * which item to mark Fixed), severity, area, where it came from, the report's own words, the owner's note
 * and any merged reports.
 *
 * The detail is passed through VERBATIM — the QA write-ups are markdown and name files and lines; a
 * reader-friendly rewrite would lose exactly what the fix needs. Pure (no `@/` runtime imports), so
 * `node --test` can load it.
 */

export interface BriefBug {
  ref: string | null;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix';
  area: string | null;
  source: 'qa' | 'manual';
  report: string | null;
  round: number | null;
  origin: string | null;
  detail: string | null;
  note: string | null;
  created_at: string;
}

export interface BriefLink {
  origin: string;
  source: string;
}

const SEV: Record<BriefBug['severity'], string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const STATUS: Record<BriefBug['status'], string> = { open: 'Open', in_progress: 'In progress', fixed: 'Fixed', wont_fix: 'Won’t fix' };
const SEV_ORDER: BriefBug['severity'][] = ['critical', 'high', 'medium', 'low'];

/** Where the item came from, in words a session can act on. */
function fromLine(b: BriefBug): string {
  if (b.source === 'qa') return [b.report ? `QA report ${b.report}` : 'QA report', b.round ? `round ${b.round}` : null].filter(Boolean).join(', ');
  if (!b.origin) return 'filed by hand in the CRM';
  return `tracked from ${b.origin}`;
}

function oneBug(b: BriefBug, links: BriefLink[], heading: string): string {
  const meta = [SEV[b.severity], STATUS[b.status], b.area ? `area: ${b.area}` : null, fromLine(b), `added ${b.created_at.slice(0, 10)}`]
    .filter(Boolean)
    .join(' · ');
  const out = [`${heading} ${b.ref ?? '(no ref)'} — ${b.title}`, meta];
  if (links.length) out.push(`Also reported ${links.length === 1 ? 'once more' : `${links.length} more times`}: ${links.map((l) => `${l.source} (${l.origin})`).join(', ')}`);
  out.push('', b.detail?.trim() ? b.detail.trim() : '(No description on the board.)');
  if (b.note?.trim()) out.push('', `Owner’s note: ${b.note.trim()}`);
  return out.join('\n');
}

const ASK =
  'Find the cause in the code, fix it, run the checks, and put it on the web preview for me to try. ' +
  'Tell me which refs to mark Fixed in the CRM. If a fix needs a new app build or SQL, say so.';

/** One bug. */
export function bugBrief(b: BriefBug, links: BriefLink[] = []): string {
  return ['Fix this Forge Legacy bug from the CRM board.', ASK, '', oneBug(b, links, '##')].join('\n');
}

/**
 * Several bugs — whatever the board is showing (e.g. every active Critical). Ordered most severe first,
 * oldest first within a severity, so a session that runs out of room has done the worst ones.
 * `label` names the filter so the session knows what the set is ("Active · Critical").
 */
export function bugsBrief<T extends BriefBug>(bugs: T[], linksFor: (b: T) => BriefLink[], label: string): string {
  const sorted = [...bugs].sort(
    (a, z) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(z.severity) || a.created_at.localeCompare(z.created_at) || (a.ref ?? '').localeCompare(z.ref ?? ''),
  );
  const counts = SEV_ORDER.map((s) => [s, sorted.filter((b) => b.severity === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${SEV[s].toLowerCase()}`)
    .join(', ');
  const head = [
    `Fix these ${sorted.length} Forge Legacy bug${sorted.length === 1 ? '' : 's'} from the CRM board (${label}${counts ? ` — ${counts}` : ''}).`,
    ASK,
    'Work most severe first. Several may share one cause — say when one fix closes more than one ref.',
  ];
  return [...head, ...sorted.map((b, i) => `\n---\n\n${oneBug(b, linksFor(b), `## ${i + 1}.`)}`)].join('\n');
}
