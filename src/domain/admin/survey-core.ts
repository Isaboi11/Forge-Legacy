/**
 * The CRM Surveys page's arithmetic (migration 0243, AA-D22): raw form answers → one result per question,
 * the "people who answered X" filter, the plain-text brief for "Copy results", and the Apps Script the
 * owner pastes into the Google Form so answers arrive on their own.
 *
 * Pure (no `@/` runtime imports), so `node --test` can load it.
 */

export interface SurveyQuestion {
  title: string;
  /** Google Forms' ItemType name: CHECKBOX, MULTIPLE_CHOICE, LIST, SCALE, TEXT, PARAGRAPH_TEXT, … */
  type: string;
  choices: string[];
}

export interface SurveyAnswer {
  q: string;
  a: string | string[] | null;
}

export interface SurveyRow {
  id: string;
  submitted_at: string;
  answers: SurveyAnswer[];
  email: string | null;
}

/** "People who answered `a` to `q`." `a` is a choice label, or OTHER for any write-in. */
export interface SurveyFilter {
  q: string;
  a: string;
}

export const OTHER = 'Other';

export interface ChoiceOption {
  label: string;
  n: number;
  /** Share of the people who answered this question, 0–1. Checkbox shares add up to more than 1. */
  share: number;
}

export interface ChoiceResult {
  kind: 'choice';
  title: string;
  multi: boolean;
  answered: number;
  options: ChoiceOption[];
  /** The write-ins behind the "Other" bar, newest first. */
  other: string[];
}

export interface TextResult {
  kind: 'text';
  title: string;
  answered: number;
  answers: { id: string; text: string; at: string }[];
}

export type QuestionResult = ChoiceResult | TextResult;

const CHOICE_TYPES = new Set(['CHECKBOX', 'MULTIPLE_CHOICE', 'LIST', 'SCALE', 'RATING']);

/** The early-access question — counted in the header figures, never listed as results (they are addresses). */
export const isEmailQuestion = (title: string) => /e-?mail/i.test(title);

const values = (a: SurveyAnswer['a']): string[] =>
  a == null ? [] : (Array.isArray(a) ? a : [a]).map((v) => String(v).trim()).filter((v) => v !== '');

function answerOf(row: SurveyRow, q: string): string[] {
  return values(row.answers.find((x) => x.q === q)?.a ?? null);
}

/**
 * The questions to draw, in form order. The form's own list (sent by its script) when there is one; before
 * the first answer arrives there is none, so fall back to the titles seen in the answers — a checkbox answer
 * (an array) still reads as a choice question, everything else as text.
 */
export function questionList(questions: SurveyQuestion[], rows: SurveyRow[]): SurveyQuestion[] {
  if (questions.length) return questions;
  const seen = new Map<string, SurveyQuestion>();
  for (const r of [...rows].reverse()) {
    for (const x of r.answers) {
      if (!seen.has(x.q)) seen.set(x.q, { title: x.q, type: Array.isArray(x.a) ? 'CHECKBOX' : 'TEXT', choices: [] });
    }
  }
  return [...seen.values()];
}

/** Does this response match the filter? A write-in matches OTHER when the question has fixed choices. */
export function matches(row: SurveyRow, f: SurveyFilter | null, questions: SurveyQuestion[]): boolean {
  if (!f) return true;
  const got = answerOf(row, f.q);
  if (f.a !== OTHER) return got.includes(f.a);
  const choices = questions.find((q) => q.title === f.q)?.choices ?? [];
  return got.some((v) => !choices.includes(v));
}

export function summarize(questions: SurveyQuestion[], rows: SurveyRow[]): QuestionResult[] {
  return questionList(questions, rows)
    .filter((q) => !isEmailQuestion(q.title))
    .map((q): QuestionResult => {
      const answered = rows.filter((r) => answerOf(r, q.title).length > 0);
      if (!CHOICE_TYPES.has(q.type) && !q.choices.length) {
        return {
          kind: 'text',
          title: q.title,
          answered: answered.length,
          answers: answered.map((r) => ({ id: r.id, text: answerOf(r, q.title).join(', '), at: r.submitted_at })),
        };
      }
      const counts = new Map<string, number>(q.choices.map((c) => [c, 0]));
      const other: string[] = [];
      for (const r of answered) {
        let wroteIn = false;
        for (const v of answerOf(r, q.title)) {
          if (counts.has(v)) counts.set(v, (counts.get(v) ?? 0) + 1);
          else if (q.choices.length) {
            other.push(v);
            wroteIn = true;
          } else counts.set(v, 1 + (counts.get(v) ?? 0)); // a scale, or a form whose choices we never got
        }
        if (wroteIn) counts.set(OTHER, (counts.get(OTHER) ?? 0) + 1);
      }
      const n = answered.length;
      const options = [...counts.entries()].map(([label, k]) => ({ label, n: k, share: n ? k / n : 0 }));
      // Form order for a fixed list (reads like the form); most-picked first when the labels came from answers.
      if (!q.choices.length) options.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
      return { kind: 'choice', title: q.title, multi: q.type === 'CHECKBOX', answered: n, options, other };
    });
}

export const pct = (share: number) => `${Math.round(share * 100)}%`;

/** The one-line "what stands out" under a choice question: its most-picked answer, when there is one. */
export function topLine(r: ChoiceResult): string | null {
  const [top, next] = [...r.options].sort((a, b) => b.n - a.n);
  // A tie has no "most picked"; under three answers there is nothing to call a pattern.
  if (!top || !top.n || r.answered < 3 || (next && next.n === top.n)) return null;
  return `Most picked: ${top.label} (${pct(top.share)})`;
}

/** The same write-in typed by several people reads once, with how many: “Pilates” ×5. Most common first. */
export function writeIns(other: string[]): string {
  const seen = new Map<string, { text: string; n: number }>();
  for (const t of other) {
    const k = t.toLowerCase();
    const e = seen.get(k);
    if (e) e.n++;
    else seen.set(k, { text: t, n: 1 });
  }
  return [...seen.values()]
    .sort((a, b) => b.n - a.n)
    .map((e) => (e.n > 1 ? `“${e.text}” ×${e.n}` : `“${e.text}”`))
    .join(' · ');
}

/**
 * "Copy results" — every question's numbers and every written answer, as plain text to paste into a Claude
 * session (which cannot read the database) or a doc. Written answers go in whole: they are the point.
 */
export function resultsBrief(title: string, results: QuestionResult[], total: number, filter: SurveyFilter | null): string {
  const out: string[] = [`Survey results — "${title}"`, `${total} ${total === 1 ? 'response' : 'responses'}`];
  if (filter) out.push(`Only people who answered "${filter.a}" to "${filter.q}"`);
  results.forEach((r, i) => {
    out.push('', `${i + 1}. ${r.title}${r.kind === 'choice' && r.multi ? ' (pick any)' : ''} — ${r.answered} answered`);
    if (r.kind === 'choice') {
      for (const o of r.options) out.push(`   - ${o.label}: ${o.n} (${pct(o.share)})`);
      if (r.other.length) out.push(`   Other, written in: ${writeIns(r.other)}`);
    } else {
      for (const a of r.answers) out.push(`   - "${a.text}"`);
    }
  });
  return out.join('\n');
}

/**
 * The Apps Script for the Google Form (Extensions → Apps Script). `setup` installs the on-submit trigger
 * and sends every answer already in the form; after that each new answer goes on its own. Re-sending is
 * safe: `survey_intake` updates a response it already has.
 */
export function formScript(o: { supabaseUrl: string; anonKey: string; token: string }): string {
  return `// Forge Legacy CRM — sends this form's answers to the CRM's Surveys page.
// 1. Paste this over everything in Code.gs and click Save.
// 2. Pick "setup" in the function menu and click Run. Allow access when Google asks.
// That's it: answers already in the form go now, and every new one goes on its own.

const CRM_URL = '${o.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/survey_intake';
const CRM_KEY = '${o.anonKey}';
const SURVEY_TOKEN = '${o.token}';

function setup() {
  const form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'onSubmit'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();
  sendAll();
}

function onSubmit(e) {
  send_(e.response);
}

function sendAll() {
  const responses = FormApp.getActiveForm().getResponses();
  responses.forEach(send_);
  Logger.log('Sent ' + responses.length + ' answers to the CRM.');
}

function questions_() {
  const T = FormApp.ItemType;
  return FormApp.getActiveForm().getItems()
    .filter(function (it) { return [T.SECTION_HEADER, T.PAGE_BREAK, T.IMAGE, T.VIDEO].indexOf(it.getType()) < 0; })
    .map(function (it) {
      const t = it.getType();
      let choices = [];
      if (t === T.MULTIPLE_CHOICE) choices = it.asMultipleChoiceItem().getChoices();
      else if (t === T.CHECKBOX) choices = it.asCheckboxItem().getChoices();
      else if (t === T.LIST) choices = it.asListItem().getChoices();
      return { title: it.getTitle(), type: String(t), choices: choices.map(function (c) { return c.getValue(); }) };
    });
}

function send_(r) {
  const answers = r.getItemResponses().map(function (ir) {
    return { q: ir.getItem().getTitle(), a: ir.getResponse() };
  });
  const res = UrlFetchApp.fetch(CRM_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: CRM_KEY, Authorization: 'Bearer ' + CRM_KEY },
    payload: JSON.stringify({
      p_token: SURVEY_TOKEN,
      p_payload: { questions: questions_(), response: { id: r.getId(), submitted_at: r.getTimestamp().toISOString(), answers: answers } },
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('The CRM refused this answer (' + res.getResponseCode() + '): ' + res.getContentText());
}
`;
}
