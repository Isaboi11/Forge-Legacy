/**
 * The Contacts page's note, built from the real contact list: who you owe a follow-up, and who arrived on
 * their own this week. Facts only — never what someone "wants" or "is interested in"; that lives in the
 * operator's own notes, not in a sentence the dashboard makes up.
 *
 * Pure and dependency-free so `node --test` runs it directly.
 */

export interface ContactsNoteInput {
  total: number;
  /** Follow-ups due today or earlier, most overdue first. `daysOver` 0 = due today. */
  due: { name: string; daysOver: number }[];
  openTasks: number;
  /** Testers who arrived from the website waitlist in the last 7 days. */
  newTesters7d: number;
}

const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;

export function contactsNote(i: ContactsNoteInput | null): string | null {
  if (!i) return null;
  if (i.total === 0) {
    return 'No contacts yet. Testers from the website waitlist and trainer seats show up here on their own; add anyone else with New contact.';
  }

  const out: string[] = [];
  if (i.due.length) {
    const top = i.due[0];
    const when = top.daysOver <= 0 ? 'due today' : top.daysOver === 1 ? '1 day overdue' : `${top.daysOver} days overdue`;
    out.push(
      i.due.length === 1
        ? `Your follow-up with ${top.name} is ${when}.`
        : `${i.due.length} follow-ups are due; ${top.name} is the oldest, ${when}.`,
    );
  } else if (i.openTasks > 0) {
    out.push(`No follow-ups are due. ${n(i.openTasks, 'task is', 'tasks are')} still open.`);
  } else {
    out.push('No follow-ups are due.');
  }

  if (i.newTesters7d > 0) {
    out.push(`${n(i.newTesters7d, 'new tester', 'new testers')} came in from the waitlist in the last 7 days.`);
  }
  return out.join(' ');
}
