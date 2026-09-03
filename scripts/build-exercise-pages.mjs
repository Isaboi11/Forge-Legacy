// Build the public exercise catalogue at `site/exercises/` from the repo's own coaching content.
//
//   node scripts/build-exercise-pages.mjs --only barbell-bench-press   # one page, for review
//   node scripts/build-exercise-pages.mjs                              # the whole catalogue + index
//   node scripts/build-exercise-pages.mjs --dry                        # report, write nothing
//
// ══ WHY THIS EXISTS ══
//
// The catalogue is already written. 735 exercises carry published coaching content — execution steps,
// cues, mistakes WITH their corrections, safety and spotting notes — and none of it is reachable by a
// search engine because it only ever renders inside the app. Hevy ranks the category on 125 exercise
// pages; Boostcamp on 30. This is a publishing job, not an authoring one.
//
// ══ WHAT GOVERNS THE PAGE ══
//
// `Docs/Exercise-Detail-Wireframe-Spec-W22.md` is LOCKED and owns the vocabulary: the section labels
// (WHY IT MATTERS / HOW TO DO IT / COACHING CUES / WATCH OUT FOR / ALTERNATIVES — W22-D7), the em dash
// as list marker in warm accent (W22-D8), the bronze left border used ONLY on WHY IT MATTERS (W22-D6),
// the absolute section order (§ 4.3), and hide-when-empty (§ 4.2). The web page follows all of it, so
// the site and the app describe an exercise the same way.
//
// Two deliberate divergences, because W-22 specifies an APP SCREEN and this is a different surface:
//
//   1. A BUNDLED STILL, NOT THE AUTOPLAYING LOOP. W22-D1 makes it a full-bleed autoplaying hero; ED-5
//      calls W-22 "the only surface in Forge Legacy where GIF media autoplays" — both statements about
//      the app. Measured against the bucket: the loops average 928 KB and run to 2.29 MB, and only
//      283 of the 735 published exercises (39%) have one at all. `site/README.md` had already settled
//      the same question for the landing page's bench demo: a still, bundled, because "hotlinking
//      Supabase storage from marketing traffic is a live backend dependency with no upside."
//      A frame-0 still is 9.3 KB. So the media sits BELOW the identity block, `loading="lazy"`, served
//      from this origin — and when the library has no clip the <figure> is simply not emitted.
//
//   2. WATCH OUT FOR CARRIES THE CORRECTION. The app lists the mistake; `mistakeCorrections` also holds
//      why it matters and how to fix it. On a page someone reads before training, the fix is the point.
//
// ══ WHAT IT REFUSES TO DO ══
//
// ⚠ READ-ONLY ON THE CATALOGUE. `coaching_content.json` and the relationship source are append- and
//   annotate-only. This script opens them, never writes them.
//
// ⚠ ONLY `Published` SHIPS. 62 rows sit at "Needs Review". A half-finished page does more damage than
//   a missing one — that is the lesson of Hevy's empty /reviews page and its self-contradicting /status.
//   The split is asserted below, not assumed.
//
// ⚠ NEVER `#666060`. The 2026-08-27 interface review moved `--fl-gray-600` to `#888282` because the
//   old value failed WCAG AA on all four grounds this site renders it against (worst case 2.81:1).
//   Stamping the old value across 735 new pages would undo that fix at scale.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const R = (p) => fileURLToPath(new URL(p, import.meta.url));

const SRC_CONTENT = R('../src/domain/exercise-coaching/content/coaching_content.json');
const SRC_TAXONOMY = R('../src/domain/exercise-relationships/source/exercises.json');
const SRC_MUSCLES = R('../src/domain/exercise-relationships/source/muscles.json');
const SRC_EX_MUSCLES = R('../src/domain/exercise-relationships/source/exercise_muscles.json');
const SRC_EQUIPMENT = R('../src/domain/exercise-relationships/source/equipment.json');
const SRC_RELATIONSHIPS = R('../src/domain/exercise-relationships/exercise_relationships.json');

const OUT_DIR = R('../site/exercises/');
const OUT_CSS = R('../site/assets/catalogue.css');

const ORIGIN = 'https://forgelegacy.app';

/**
 * Stills, bundled — `{ "<id>": [w, h] }`, written by
 * `scripts/animation-processing/build_site_stills.py`. Absent for an exercise the animation library does
 * not cover, which is 61% of them.
 *
 * ⚠ THE PAGE MUST NOT HOTLINK THE SUPABASE BUCKET. `site/README.md` settled that for the landing page's
 *   bench demo — "hotlinking Supabase storage from marketing traffic is a live backend dependency with
 *   no upside" — and the first version of this generator did it from all 735 pages anyway. The manifest
 *   is also what lets each <img> state its REAL intrinsic size: the sources are ~300 px tall with widths
 *   from 92 to 302, in 144 distinct combinations, so there is no one right pair to hardcode.
 */
const SRC_STILLS = R('../site/assets/exercise/manifest.json');
const stills = existsSync(SRC_STILLS) ? JSON.parse(readFileSync(SRC_STILLS, 'utf8')) : {};

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const dry = args.includes('--dry');

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const content = read(SRC_CONTENT);
const taxonomy = read(SRC_TAXONOMY);
const muscles = read(SRC_MUSCLES);
const exMuscles = read(SRC_EX_MUSCLES);
const equipment = read(SRC_EQUIPMENT);
const relationships = read(SRC_RELATIONSHIPS);

// ── Assertions. A generator that silently ships the wrong set is worse than one that refuses. ────────

const statuses = new Set(content.map((r) => r.contentStatus));
for (const s of statuses) {
  if (s !== 'Published' && s !== 'Needs Review') {
    throw new Error(`Refusing to build: unknown contentStatus ${JSON.stringify(s)}. Publishing rules only cover Published / Needs Review.`);
  }
}

const taxById = new Map(taxonomy.map((r) => [r.id, r]));
const publishable = content.filter((r) => r.contentStatus === 'Published' && taxById.has(r.exerciseId));

if (publishable.length === 0) throw new Error('Refusing to build: nothing publishable.');

const needsReview = content.filter((r) => r.contentStatus === 'Needs Review').length;
const orphaned = content.filter((r) => !taxById.has(r.exerciseId)).map((r) => r.exerciseId);
if (orphaned.length) {
  throw new Error(`Refusing to build: ${orphaned.length} coaching rows have no taxonomy entry (${orphaned.slice(0, 4).join(', ')}). A page cannot state equipment or difficulty it does not have.`);
}

// ── Lookups ──────────────────────────────────────────────────────────────────────────────────────────

const muscleById = new Map(muscles.map((m) => [m.id, m]));
const equipById = new Map(equipment.map((e) => [e.id, e]));
const publishedIds = new Set(publishable.map((r) => r.exerciseId));

const musclesFor = new Map();
for (const row of exMuscles) {
  if (!musclesFor.has(row.exerciseId)) musclesFor.set(row.exerciseId, { Primary: [], Secondary: [] });
  const bucket = musclesFor.get(row.exerciseId)[row.role];
  if (bucket) bucket.push({ ...row, name: muscleById.get(row.muscleId)?.name ?? row.muscleId });
}
for (const v of musclesFor.values()) {
  for (const k of ['Primary', 'Secondary']) v[k].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
}

// ALTERNATIVES, per W-22 § 2.6. Substitutes and equipment alternatives are what an athlete means by
// "what else can I do instead" — a progression is a different question and gets its own line elsewhere.
const ALT_TYPES = new Set(['Substitute', 'Equipment Alternative', 'Variation']);
const altsFor = new Map();
for (const rel of relationships) {
  if (!ALT_TYPES.has(rel.type)) continue;
  if (!publishedIds.has(rel.sourceExerciseId) || !publishedIds.has(rel.targetExerciseId)) continue;
  if (!altsFor.has(rel.sourceExerciseId)) altsFor.set(rel.sourceExerciseId, []);
  altsFor.get(rel.sourceExerciseId).push(rel);
}
for (const list of altsFor.values()) {
  list.sort((a, b) => (b.compatibilityScore ?? 0) - (a.compatibilityScore ?? 0) || (a.rank ?? 99) - (b.rank ?? 99));
}

// ── HTML helpers ─────────────────────────────────────────────────────────────────────────────────────

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nonEmpty = (v) => (Array.isArray(v) ? v.filter((x) => x != null && String(x).trim() !== '') : (v != null && String(v).trim() !== '' ? [v] : []));

/** A section renders or it does not exist. W-22 § 4.2: no empty placeholders, ever. */
function section(label, inner, { accent = false } = {}) {
  if (!inner || !inner.trim()) return '';
  return `      <section class="sec${accent ? ' sec--accent' : ''}">
        <h2 class="sec__label">${esc(label)}</h2>
${inner}
      </section>\n`;
}

const dashList = (items) =>
  `        <ul class="dashes">\n${items.map((t) => `          <li>${esc(t)}</li>`).join('\n')}\n        </ul>`;

const steps = (items) =>
  `        <ol class="steps">\n${items.map((t) => `          <li>${esc(t)}</li>`).join('\n')}\n        </ol>`;

// ── The page ─────────────────────────────────────────────────────────────────────────────────────────

function buildPage(row, facetPaths = new Set()) {
  const id = row.exerciseId;
  const tax = taxById.get(id);
  const name = tax.name;
  const mus = musclesFor.get(id) ?? { Primary: [], Secondary: [] };
  const equip = equipById.get(tax.equipmentId);
  const alts = (altsFor.get(id) ?? []).slice(0, 6);
  const still = stills[id]; // [w, h] or undefined — 39% of published exercises have a clip

  // HOW TO DO IT is setup then execution — the athlete's actual order. Both are already imperative
  // sentences in the content, so they concatenate without rewriting.
  const howTo = [...nonEmpty(row.setupInstructions), ...nonEmpty(row.executionSteps)];
  const cues = nonEmpty(row.coachingTips).length ? nonEmpty(row.coachingTips) : nonEmpty(row.cueHierarchy);

  const corrections = Array.isArray(row.mistakeCorrections) ? row.mistakeCorrections.filter((m) => m && m.mistake) : [];
  const plainMistakes = nonEmpty(row.commonMistakes);

  const watchOut = corrections.length
    ? `        <ul class="mistakes">\n${corrections
        .map(
          (m) => `          <li>
            <p class="mistakes__what">${esc(m.mistake)}</p>
            ${m.whyItMatters ? `<p class="mistakes__why">${esc(m.whyItMatters)}</p>` : ''}
            ${m.correction ? `<p class="mistakes__fix"><span>Instead</span> ${esc(m.correction)}</p>` : ''}
          </li>`
        )
        .join('\n')}\n        </ul>`
    : plainMistakes.length
      ? dashList(plainMistakes)
      : '';

  // The extra coaching depth the app screen does not surface. Kept in one clearly-labelled block below
  // the W-22 order rather than interleaved, so the locked order is not quietly rewritten.
  const detailRows = [
    ['Tempo', row.tempoGuidance],
    ['Breathing', row.breathingGuidance],
    ['Range of motion', row.rangeOfMotionNotes],
    ['Setting up', row.equipmentSetup],
    ['If you are new to it', nonEmpty(row.beginnerNotes)[0]],
    ['Once it is easy', nonEmpty(row.advancedCoachingNotes)[0]],
  ].filter(([, v]) => nonEmpty(v).length);

  const safety = [...nonEmpty(row.safetyNotes), ...nonEmpty(row.spottingNotes)];

  // A chip links to its facet when that facet was published, and stays inert text when it was not.
  // This is what turns 735 leaf pages into a graph a crawler can walk instead of 735 dead ends.
  const chip = (text, path, cls = '') =>
    path && facetPaths.has(path)
      ? `<a class="chip${cls}" href="/exercises/${esc(path)}/">${esc(text)}</a>`
      : `<span class="chip${cls}">${esc(text)}</span>`;

  const patternPath = tax.movementPattern && tax.movementPattern !== 'Other' ? `pattern/${slug(tax.movementPattern)}` : null;
  const meta = [
    equip?.name ? chip(equip.name, `equipment/${slug(tax.equipmentId)}`, ' chip--meta') : '',
    tax.difficulty ? `<span class="chip chip--meta">${esc(tax.difficulty)}</span>` : '',
    patternPath ? chip(tax.movementPattern, patternPath, ' chip--meta') : '',
  ].filter(Boolean);

  const body = [
    section('Why it matters', row.whyItMatters ? `        <p class="lede">${esc(row.whyItMatters)}</p>` : '', { accent: true }),
    section('How to do it', howTo.length ? steps(howTo) : ''),
    section('Coaching cues', cues.length ? dashList(cues) : ''),
    section('Watch out for', watchOut),
    section(
      'The detail',
      detailRows.length
        ? `        <dl class="detail">\n${detailRows
            .map(([k, v]) => `          <dt>${esc(k)}</dt>\n          <dd>${esc(nonEmpty(v)[0])}</dd>`)
            .join('\n')}\n        </dl>`
        : ''
    ),
    section('Safety', safety.length ? dashList(safety) : ''),
    section(
      'Alternatives',
      alts.length
        ? `        <ul class="alts">\n${alts
            .map((a) => {
              const t = taxById.get(a.targetExerciseId);
              const te = equipById.get(t.equipmentId);
              return `          <li><a href="/exercises/${esc(a.targetExerciseId)}/">
            <span class="alts__name">${esc(t.name)}</span>
            <span class="alts__meta">${esc([te?.name, a.type].filter(Boolean).join(' · '))}</span>
          </a></li>`;
            })
            .join('\n')}\n        </ul>`
        : ''
    ),
  ].join('');

  const desc = (row.whyItMatters || `How to do the ${name}, with coaching cues, common mistakes and alternatives.`)
    .replace(/\s+/g, ' ')
    .slice(0, 180);

  // HowTo is the honest schema here: the page IS a set of steps. BreadcrumbList mirrors the visible trail.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        name: `How to do the ${name}`,
        description: desc,
        ...(howTo.length ? { step: howTo.map((t, i) => ({ '@type': 'HowToStep', position: i + 1, text: t })) } : {}),
        ...(equip?.name ? { tool: [{ '@type': 'HowToTool', name: equip.name }] } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Exercise Library', item: `${ORIGIN}/exercises/` },
          { '@type': 'ListItem', position: 3, name },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — how to do it, cues and mistakes | Forge Legacy</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${ORIGIN}/exercises/${esc(id)}/">
<meta property="og:type" content="article">
<meta property="og:url" content="${ORIGIN}/exercises/${esc(id)}/">
<meta property="og:title" content="${esc(name)} — Forge Legacy">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ORIGIN}/assets/landing/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap">
<link rel="stylesheet" href="/assets/catalogue.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

<header class="nav">
  <a class="nav__mark" href="/">Forge Legacy</a>
  <nav class="nav__links" aria-label="Main">
    <a href="/exercises/">Exercise Library</a>
  </nav>
  <a class="btn" href="/#get">Get the app</a>
</header>

<main class="page">

  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><a href="/exercises/">Exercise Library</a><span aria-hidden="true">/</span><span aria-current="page">${esc(name)}</span>
  </nav>

  <div class="identity">
    <h1>${esc(name)}</h1>
    ${mus.Primary.length || mus.Secondary.length ? `<div class="chips">${mus.Primary.map((m) => chip(m.name, `muscle/${slug(m.muscleId)}`, ' chip--primary')).join('')}${mus.Secondary.map((m) => chip(m.name, `muscle/${slug(m.muscleId)}`)).join('')}</div>` : ''}
    ${meta.length ? `<div class="chips chips--meta">${meta.join('')}</div>` : ''}
  </div>

${
    still
      ? `  <figure class="demo">
    <img src="/assets/exercise/${esc(id)}.webp" alt="Starting position for the ${esc(name)}" loading="lazy" decoding="async" width="${still[0]}" height="${still[1]}">
    <figcaption>Starting position &mdash; ${esc(name)}</figcaption>
  </figure>

`
      : ''
  }${body}
  <aside class="cta">
    <p class="cta__line">Every exercise here is in the app, with your own history against it.</p>
    <a class="btn btn--lg" href="/#get">Get Forge Legacy</a>
  </aside>

</main>

<footer class="foot">
  <a href="/">Home</a><a href="/exercises/">Exercise Library</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a>
  <p>&copy; 2026 Forge Legacy LLC</p>
</footer>

</body>
</html>
`;
}

// ── Facets ───────────────────────────────────────────────────────────────────────────────────────────
//
// One page per muscle, per piece of equipment, per movement pattern. These are the queries people
// actually type — "chest exercises" outranks any single exercise name by an order of magnitude — and
// they are INDEXES over content that already exists, not the thin doorway pages Hevy's /use-cases/
// section is made of. Their value is the links; there is no invented prose, because there is no written
// per-muscle editorial to draw on and fabricating some would be exactly the wrong trade.
//
// ⚠ A FACET BELOW THE FLOOR IS NOT PUBLISHED. A page listing one exercise is thin by any honest reading,
//   and "Other" is a junk-drawer taxonomy label that means nothing to a reader. Both are skipped rather
//   than shipped to pad a sitemap.

const FACET_FLOOR = 5;

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Muscle pages carry BOTH roles. "What hits my glutes" means both, and splitting them by role is more
 *  useful than a flat list — it is also what makes a page like Hip Flexors (1 primary, 37 secondary)
 *  substantial instead of thin. */
function facetSets() {
  const out = [];

  const byMuscle = new Map();
  for (const row of exMuscles) {
    if (!publishedIds.has(row.exerciseId)) continue;
    if (!byMuscle.has(row.muscleId)) byMuscle.set(row.muscleId, { Primary: [], Secondary: [] });
    byMuscle.get(row.muscleId)[row.role]?.push(row.exerciseId);
  }
  for (const [id, roles] of byMuscle) {
    const m = muscleById.get(id);
    if (!m) continue;
    const total = roles.Primary.length + roles.Secondary.length;
    if (total < FACET_FLOOR) continue;
    out.push({
      kind: 'muscle',
      path: `muscle/${slug(id)}`,
      name: m.name,
      heading: `${m.name} exercises`,
      blurb: `${roles.Primary.length} exercises train the ${m.name.toLowerCase()} directly and ${roles.Secondary.length} work it as support. Every one carries execution steps, coaching cues and the mistakes people make.`,
      groups: [
        { label: 'Trains it directly', ids: roles.Primary },
        { label: 'Works it as support', ids: roles.Secondary },
      ],
    });
  }

  const byEquip = new Map();
  for (const id of publishedIds) {
    const e = taxById.get(id).equipmentId;
    if (!byEquip.has(e)) byEquip.set(e, []);
    byEquip.get(e).push(id);
  }
  for (const [id, ids] of byEquip) {
    const e = equipById.get(id);
    if (!e || ids.length < FACET_FLOOR) continue;
    // Grouped by pattern so the page has a shape a reader can scan, not one 159-item list.
    const groups = new Map();
    for (const x of ids) {
      const p = taxById.get(x).movementPattern || 'Other';
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(x);
    }
    out.push({
      kind: 'equipment',
      path: `equipment/${slug(id)}`,
      name: e.name,
      heading: `${e.name} exercises`,
      blurb: `${ids.length} exercises you can do with ${/s$/.test(e.name) ? e.name.toLowerCase() : 'a ' + e.name.toLowerCase()}, grouped by what the movement does.`,
      groups: [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([label, g]) => ({ label, ids: g })),
    });
  }

  const byPattern = new Map();
  for (const id of publishedIds) {
    const p = taxById.get(id).movementPattern;
    if (!p || p === 'Other') continue; // junk-drawer label; a page called "Other" helps nobody
    if (!byPattern.has(p)) byPattern.set(p, []);
    byPattern.get(p).push(id);
  }
  for (const [p, ids] of byPattern) {
    if (ids.length < FACET_FLOOR) continue;
    const groups = new Map();
    for (const x of ids) {
      const m = musclesFor.get(x)?.Primary[0]?.name ?? 'Other';
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m).push(x);
    }
    out.push({
      kind: 'pattern',
      path: `pattern/${slug(p)}`,
      name: p,
      heading: p,
      blurb: `${ids.length} exercises in the ${p.toLowerCase()} pattern, grouped by the muscle each one trains first.`,
      groups: [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([label, g]) => ({ label, ids: g })),
    });
  }

  return out;
}

const KIND_LABEL = { muscle: 'Muscle', equipment: 'Equipment', pattern: 'Movement pattern' };

function buildFacet(facet, siblings) {
  const card = (id) => {
    const t = taxById.get(id);
    const e = equipById.get(t.equipmentId);
    return `        <li><a href="/exercises/${esc(id)}/"><span class="idx__name">${esc(t.name)}</span><span class="idx__meta">${esc(e?.name ?? '')}</span></a></li>`;
  };

  const groups = facet.groups
    .filter((g) => g.ids.length)
    .map((g) => {
      const sorted = [...g.ids].sort((a, b) => taxById.get(a).name.localeCompare(taxById.get(b).name));
      return `      <section class="sec">
        <h2 class="sec__label">${esc(g.label)} <span class="sec__n">${sorted.length}</span></h2>
        <ul class="idx">
${sorted.map(card).join('\n')}
        </ul>
      </section>`;
    })
    .join('\n');

  const related = siblings
    .filter((s) => s.kind === facet.kind && s.path !== facet.path)
    .slice(0, 12)
    .map((s) => `<a class="chip" href="/exercises/${esc(s.path)}/">${esc(s.name)}</a>`)
    .join('');

  const total = facet.groups.reduce((n, g) => n + g.ids.length, 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: facet.heading, description: facet.blurb, url: `${ORIGIN}/exercises/${facet.path}/` },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Exercise Library', item: `${ORIGIN}/exercises/` },
          { '@type': 'ListItem', position: 3, name: facet.heading },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(facet.heading)} — ${total} exercises with cues and mistakes | Forge Legacy</title>
<meta name="description" content="${esc(facet.blurb)}">
<link rel="canonical" href="${ORIGIN}/exercises/${facet.path}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${ORIGIN}/exercises/${facet.path}/">
<meta property="og:title" content="${esc(facet.heading)} — Forge Legacy">
<meta property="og:description" content="${esc(facet.blurb)}">
<meta property="og:image" content="${ORIGIN}/assets/landing/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap">
<link rel="stylesheet" href="/assets/catalogue.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

<header class="nav">
  <a class="nav__mark" href="/">Forge Legacy</a>
  <nav class="nav__links" aria-label="Main"><a href="/exercises/">Exercise Library</a></nav>
  <a class="btn" href="/#get">Get the app</a>
</header>

<main class="page page--wide">

  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><a href="/exercises/">Exercise Library</a><span aria-hidden="true">/</span><span aria-current="page">${esc(facet.heading)}</span>
  </nav>

  <div class="identity">
    <p class="kicker">${esc(KIND_LABEL[facet.kind])}</p>
    <h1>${esc(facet.heading)}</h1>
    <p class="lede">${esc(facet.blurb)}</p>
  </div>

${groups}

${related ? `      <section class="sec">
        <h2 class="sec__label">More by ${esc(KIND_LABEL[facet.kind].toLowerCase())}</h2>
        <div class="chips">${related}</div>
      </section>` : ''}

  <aside class="cta">
    <p class="cta__line">Every exercise here is in the app, with your own history against it.</p>
    <a class="btn btn--lg" href="/#get">Get Forge Legacy</a>
  </aside>

</main>

<footer class="foot">
  <a href="/">Home</a><a href="/exercises/">Exercise Library</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a>
  <p>&copy; 2026 Forge Legacy LLC</p>
</footer>

</body>
</html>
`;
}

// ── The index ────────────────────────────────────────────────────────────────────────────────────────
//
// One page listing everything, filterable in the browser. Deliberately NOT paginated: 735 rows is ~110 KB
// of HTML, which is cheaper than the round trips paging would cost, and it means every exercise is one
// crawl away from the index instead of five. The filter is progressive — with JavaScript off the page is
// the complete list, which is also exactly what a crawler should see.

function buildIndex(rows, facets) {
  const entries = rows
    .map((r) => {
      const tax = taxById.get(r.exerciseId);
      const mus = musclesFor.get(r.exerciseId) ?? { Primary: [] };
      return {
        id: r.exerciseId,
        name: tax.name,
        equip: equipById.get(tax.equipmentId)?.name ?? '',
        equipId: tax.equipmentId ?? '',
        muscle: mus.Primary[0]?.name ?? '',
        muscleId: mus.Primary[0]?.muscleId ?? '',
        pattern: tax.movementPattern ?? '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const facet = (key) => [...new Set(entries.map((e) => e[key]).filter(Boolean))].sort();
  const sel = (id, label, values) =>
    `      <label class="filter"><span>${esc(label)}</span>
        <select id="${id}"><option value="">All</option>${values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>
      </label>`;

  const list = entries
    .map(
      (e) => `        <li data-m="${esc(e.muscle)}" data-e="${esc(e.equip)}" data-p="${esc(e.pattern)}" data-n="${esc(e.name.toLowerCase())}">
          <a href="/exercises/${esc(e.id)}/"><span class="idx__name">${esc(e.name)}</span><span class="idx__meta">${esc([e.equip, e.muscle].filter(Boolean).join(' · '))}</span></a>
        </li>`
    )
    .join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Exercise Library',
    description: `${entries.length} exercises with execution steps, coaching cues and common mistakes.`,
    url: `${ORIGIN}/exercises/`,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Exercise Library — ${entries.length} exercises with cues and mistakes | Forge Legacy</title>
<meta name="description" content="${entries.length} exercises, each with execution steps, coaching cues, the mistakes people make and how to correct them.">
<link rel="canonical" href="${ORIGIN}/exercises/">
<meta property="og:type" content="website">
<meta property="og:url" content="${ORIGIN}/exercises/">
<meta property="og:title" content="Exercise Library — Forge Legacy">
<meta property="og:description" content="${entries.length} exercises with execution steps, coaching cues and common mistakes.">
<meta property="og:image" content="${ORIGIN}/assets/landing/og-card.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap">
<link rel="stylesheet" href="/assets/catalogue.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

<header class="nav">
  <a class="nav__mark" href="/">Forge Legacy</a>
  <nav class="nav__links" aria-label="Main"><a href="/exercises/" aria-current="page">Exercise Library</a></nav>
  <a class="btn" href="/#get">Get the app</a>
</header>

<main class="page page--wide">

  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Exercise Library</span>
  </nav>

  <div class="identity">
    <h1>Exercise Library</h1>
    <p class="lede">${entries.length} movements. Each one carries how to do it, what to focus on, and the mistakes people actually make &mdash; with the correction, not just the warning.</p>
  </div>

${['muscle', 'equipment', 'pattern']
  .map((kind) => {
    const set = facets.filter((f) => f.kind === kind);
    if (!set.length) return '';
    return `      <section class="sec">
        <h2 class="sec__label">Browse by ${esc(KIND_LABEL[kind].toLowerCase())}</h2>
        <div class="chips">${set
          .map((f) => `<a class="chip" href="/exercises/${esc(f.path)}/">${esc(f.name)}</a>`)
          .join('')}</div>
      </section>`;
  })
  .filter(Boolean)
  .join('\n')}

  <form class="filters" id="filters" role="search">
${sel('f-m', 'Muscle', facet('muscle'))}
${sel('f-e', 'Equipment', facet('equip'))}
${sel('f-p', 'Pattern', facet('pattern'))}
      <label class="filter filter--grow"><span>Search</span><input id="f-q" type="search" placeholder="Bench press, hinge, kettlebell&hellip;" autocomplete="off"></label>
  </form>
  <p class="count" id="count" aria-live="polite">${entries.length} exercises</p>

  <ul class="idx" id="idx">
${list}
  </ul>
  <p class="empty" id="empty" hidden>Nothing matches those filters.</p>

</main>

<footer class="foot">
  <a href="/">Home</a><a href="/exercises/">Exercise Library</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a>
  <p>&copy; 2026 Forge Legacy LLC</p>
</footer>

<script>
// Progressive: without this the page is the complete list, which is what a crawler should see anyway.
(function () {
  var idx = document.getElementById('idx'), items = [].slice.call(idx.children);
  var m = document.getElementById('f-m'), e = document.getElementById('f-e'),
      p = document.getElementById('f-p'), q = document.getElementById('f-q'),
      count = document.getElementById('count'), empty = document.getElementById('empty');
  function apply() {
    var mv = m.value, ev = e.value, pv = p.value, qv = q.value.trim().toLowerCase(), n = 0;
    for (var i = 0; i < items.length; i++) {
      var el = items[i], d = el.dataset;
      var ok = (!mv || d.m === mv) && (!ev || d.e === ev) && (!pv || d.p === pv) && (!qv || d.n.indexOf(qv) !== -1);
      el.hidden = !ok; if (ok) n++;
    }
    count.textContent = n + (n === 1 ? ' exercise' : ' exercises');
    empty.hidden = n !== 0;
  }
  [m, e, p].forEach(function (s) { s.addEventListener('change', apply); });
  q.addEventListener('input', apply);
  document.getElementById('filters').addEventListener('submit', function (ev) { ev.preventDefault(); });
})();
</script>

</body>
</html>
`;
}

// ── Stylesheet. One file for the whole catalogue: 735 inline copies of this would be ~4 MB of duplicate
//    bytes, and the second page a visitor opens should cost nothing but its own text. ────────────────

const CSS = `/* Forge Legacy — exercise catalogue.
   Tokens copied from site/index.html. --fl-gray-600 is #888282, NOT #666060: the 2026-08-27 interface
   review moved it because the old value failed WCAG AA on all four grounds (worst case 2.81:1). */
:root{
  --fl-base:#05080A; --fl-charcoal-900:#0C1013; --fl-charcoal-800:#131517; --fl-charcoal-700:#1A1A1E;
  --fl-charcoal-600:#24242A; --fl-charcoal-500:#2E2E35;
  --fl-cream-100:#F0EDE8; --fl-gray-400:#9E9890; --fl-gray-600:#888282;
  --fl-bronze-300:#CDA063; --fl-bronze-400:#BF8F4F; --fl-bronze-600:#7A6040;
  --fl-surface-card:linear-gradient(180deg,#181A1C 0%,var(--fl-charcoal-800) 100%);
  --fl-surface-nav:rgba(13,13,15,0.92);
  --fl-radius-md:10px; --fl-radius-lg:12px; --fl-radius-pill:999px;
  --fl-font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --fl-font-display:"Playfair Display",Georgia,"Times New Roman",serif;
  --fl-text-primary:var(--fl-cream-100); --fl-text-secondary:var(--fl-gray-400); --fl-text-tertiary:var(--fl-gray-600);
  --fl-ease-out:cubic-bezier(0.16,1,0.3,1);
}
*{box-sizing:border-box}
body{margin:0;background:var(--fl-base);color:var(--fl-text-primary);font-family:var(--fl-font-sans);
  font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--fl-bronze-300);text-underline-offset:3px}
a:focus-visible{outline:2px solid var(--fl-bronze-400);outline-offset:3px;border-radius:4px}

/* nav */
.nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:20px;
  padding:12px 20px;background:var(--fl-surface-nav);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--fl-charcoal-700)}
.nav__mark{font-family:var(--fl-font-display);font-weight:600;font-size:17px;color:var(--fl-text-primary);text-decoration:none}
.nav__links{margin-left:auto;display:flex;gap:18px}
.nav__links a{font-size:14px;color:var(--fl-text-secondary);text-decoration:none}
.nav__links a:hover{color:var(--fl-text-primary)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 18px;
  font-size:13.5px;font-weight:600;color:var(--fl-text-primary);text-decoration:none;
  border-radius:var(--fl-radius-pill);border:1px solid rgba(174,136,86,0.55);
  background:linear-gradient(180deg,#8A6A3E 0%,#573F24 6%,#3D2F1A 26%,#2E2314 50%);
  box-shadow:inset 0 1px 0 rgba(222,190,148,0.42);white-space:nowrap}
.btn--lg{min-height:52px;padding:13px 30px;font-size:15px}

.page{max-width:720px;margin:0 auto;padding:26px 20px 72px;display:flex;flex-direction:column;gap:34px}

.crumbs{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;color:var(--fl-text-tertiary)}
.crumbs a{color:var(--fl-text-tertiary);text-decoration:none}
.crumbs a:hover{color:var(--fl-text-secondary)}
.crumbs [aria-current]{color:var(--fl-text-secondary)}

.identity{display:flex;flex-direction:column;gap:14px}
.identity h1{margin:0;font-family:var(--fl-font-display);font-weight:600;font-size:clamp(30px,7vw,44px);
  line-height:1.08;letter-spacing:-.01em;text-wrap:balance}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{display:inline-flex;align-items:center;font-size:12.5px;padding:5px 12px;
  border-radius:var(--fl-radius-pill);background:var(--fl-charcoal-700);color:var(--fl-text-secondary);
  text-decoration:none;border:1px solid transparent}
a.chip:hover{border-color:var(--fl-bronze-600);color:var(--fl-text-primary)}
.chip--primary{background:var(--fl-charcoal-600);color:var(--fl-text-primary)}
.chip--meta{background:transparent;border-color:var(--fl-charcoal-600);color:var(--fl-text-tertiary)}
a.chip--meta:hover{color:var(--fl-text-secondary)}
.chips--meta{gap:8px}
.kicker{margin:0;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--fl-text-tertiary)}
.sec__n{color:var(--fl-text-tertiary);font-weight:400;letter-spacing:.04em;font-variant-numeric:tabular-nums}

/* ⚠ NO FIXED ASPECT RATIO AND NO object-fit:cover. The stills are ~300 px tall with widths from 92 to
   302 in 144 distinct combinations — a 1/1 frame with cover would crop most of them. Each <img> carries
   its own real width/height from the manifest, so the browser reserves exactly the right box and nothing
   shifts on load. Rendered at natural size rather than stretched: upscaling a 92 px-wide source to a
   720 px column is blur, not presence. When there is no still the <figure> is not emitted at all. */
.demo{margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;gap:14px;
  border-radius:var(--fl-radius-lg);background:var(--fl-charcoal-900);border:1px solid var(--fl-charcoal-700)}
.demo img{display:block;max-width:100%;height:auto}
.demo figcaption{font-size:12.5px;color:var(--fl-text-tertiary);text-align:center}

.sec{display:flex;flex-direction:column;gap:12px}
.sec__label{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--fl-bronze-400)}
/* W22-D6: the single bronze rule on the page, on the one section that earns it. */
.sec--accent{border-left:2px solid var(--fl-bronze-600);padding-left:18px}
.lede{margin:0;font-size:18px;line-height:1.6;color:var(--fl-text-primary)}

.steps{margin:0;padding:0;list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:13px}
.steps li{counter-increment:s;display:grid;grid-template-columns:26px 1fr;gap:14px;
  font-size:16px;color:var(--fl-text-secondary)}
.steps li::before{content:counter(s);font-family:var(--fl-font-display);font-size:15px;
  color:var(--fl-bronze-600);line-height:1.7}

/* W22-D8: em dash as marker, warm accent. Not a bullet, not an icon. */
.dashes{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:11px}
.dashes li{display:grid;grid-template-columns:20px 1fr;gap:12px;font-size:16px;color:var(--fl-text-secondary)}
.dashes li::before{content:"—";color:var(--fl-bronze-600)}

.mistakes{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:18px}
.mistakes li{display:flex;flex-direction:column;gap:5px;padding-left:18px;border-left:1px solid var(--fl-charcoal-600)}
.mistakes__what{margin:0;font-size:16px;color:var(--fl-text-primary)}
.mistakes__why{margin:0;font-size:14.5px;color:var(--fl-text-tertiary)}
.mistakes__fix{margin:0;font-size:15px;color:var(--fl-text-secondary)}
.mistakes__fix span{color:var(--fl-bronze-400);font-weight:600}

.detail{margin:0;display:grid;grid-template-columns:auto 1fr;gap:9px 20px;align-items:baseline}
.detail dt{font-size:12.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--fl-text-tertiary);white-space:nowrap}
.detail dd{margin:0;font-size:15.5px;color:var(--fl-text-secondary)}
@media (max-width:560px){.detail{grid-template-columns:1fr;gap:3px 0}.detail dd{margin-bottom:11px}}

.alts{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.alts a{display:flex;flex-direction:column;gap:3px;min-height:44px;padding:14px 16px;text-decoration:none;
  background:var(--fl-surface-card);border-radius:var(--fl-radius-md);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);transition:transform .2s var(--fl-ease-out)}
.alts a:hover{transform:translateY(-1px)}
.alts__name{font-size:15px;color:var(--fl-text-primary)}
.alts__meta{font-size:12.5px;color:var(--fl-text-tertiary)}

.cta{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding-top:12px;
  border-top:1px solid var(--fl-charcoal-700)}
.cta__line{margin:0;font-family:var(--fl-font-display);font-size:19px;color:var(--fl-text-primary)}

.foot{display:flex;flex-wrap:wrap;align-items:center;gap:18px;max-width:720px;margin:0 auto;
  padding:24px 20px 44px;border-top:1px solid var(--fl-charcoal-700);font-size:13.5px}
.foot a{color:var(--fl-text-tertiary);text-decoration:none}
.foot a:hover{color:var(--fl-text-secondary)}
.foot p{margin:0 0 0 auto;color:var(--fl-text-tertiary)}

/* ── index ── */
.page--wide{max-width:960px}
.filters{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
.filter{display:flex;flex-direction:column;gap:5px;min-width:150px}
.filter--grow{flex:1;min-width:200px}
.filter span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--fl-text-tertiary)}
.filter select,.filter input{min-height:44px;padding:10px 12px;font:inherit;font-size:14.5px;
  color:var(--fl-text-primary);background:var(--fl-charcoal-800);border:1px solid var(--fl-charcoal-600);
  border-radius:var(--fl-radius-md);appearance:none}
.filter select:focus-visible,.filter input:focus-visible{outline:2px solid var(--fl-bronze-400);outline-offset:1px}
.count{margin:0;font-size:13px;color:var(--fl-text-tertiary);font-variant-numeric:tabular-nums}
.empty{margin:0;padding:28px 0;font-size:15px;color:var(--fl-text-tertiary)}

.idx{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.idx a{display:flex;flex-direction:column;gap:3px;min-height:44px;padding:13px 16px;text-decoration:none;
  border-radius:var(--fl-radius-md);background:var(--fl-charcoal-900);
  border:1px solid var(--fl-charcoal-700);transition:border-color .2s var(--fl-ease-out)}
.idx a:hover{border-color:var(--fl-bronze-600)}
.idx__name{font-size:15px;color:var(--fl-text-primary)}
.idx__meta{font-size:12.5px;color:var(--fl-text-tertiary)}

@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

// ── Write ────────────────────────────────────────────────────────────────────────────────────────────

const targets = only ? publishable.filter((r) => r.exerciseId === only) : publishable;
if (only && targets.length === 0) {
  const known = content.find((r) => r.exerciseId === only);
  throw new Error(known ? `"${only}" is ${known.contentStatus}, not Published — it is deliberately not shipped.` : `No exercise "${only}".`);
}

console.log(`catalogue: ${content.length} rows · ${publishable.length} publishable · ${needsReview} held at Needs Review`);
console.log(`building:  ${targets.length} page${targets.length === 1 ? '' : 's'}${dry ? ' (dry run — nothing written)' : ''}`);

if (!dry) {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(R('../site/assets/'), { recursive: true });
  writeFileSync(OUT_CSS, CSS, 'utf8');
}

const facets = facetSets().sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
const facetPaths = new Set(facets.map((f) => f.path));

let bytes = 0;
let withAlts = 0;
for (const row of targets) {
  const html = buildPage(row, facetPaths);
  bytes += Buffer.byteLength(html);
  if ((altsFor.get(row.exerciseId) ?? []).length) withAlts++;
  if (!dry) {
    const dir = `${OUT_DIR}${row.exerciseId}/`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}index.html`, html, 'utf8');
  }
}

console.log(`pages:     ${targets.length}, mean ${Math.round(bytes / targets.length / 1024)} KB, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
console.log(`links:     ${withAlts}/${targets.length} carry at least one alternative`);

// ── The index, the sitemap and robots.txt only make sense for a FULL build. A `--only` run is for
//    looking at one page, and half a sitemap is worse than none. ─────────────────────────────────────

if (!only) {
  let facetBytes = 0;
  for (const f of facets) {
    const html = buildFacet(f, facets);
    facetBytes += Buffer.byteLength(html);
    if (!dry) {
      const dir = `${OUT_DIR}${f.path}/`;
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}index.html`, html, 'utf8');
    }
  }
  const byKind = facets.reduce((m, f) => ((m[f.kind] = (m[f.kind] ?? 0) + 1), m), {});
  console.log(
    `facets:    ${facets.length} pages (${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', ')}), ` +
      `mean ${Math.round(facetBytes / facets.length / 1024)} KB`
  );

  const index = buildIndex(publishable, facets);
  const urls = [
    { loc: `${ORIGIN}/`, priority: '1.0' },
    { loc: `${ORIGIN}/exercises/`, priority: '0.9' },
    ...facets.map((f) => ({ loc: `${ORIGIN}/exercises/${f.path}/`, priority: '0.8' })),
    ...publishable.map((r) => ({ loc: `${ORIGIN}/exercises/${r.exerciseId}/`, priority: '0.7' })),
    { loc: `${ORIGIN}/privacy`, priority: '0.3' },
    { loc: `${ORIGIN}/terms`, priority: '0.3' },
    { loc: `${ORIGIN}/support`, priority: '0.3' },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;

  // ⚠ THIS FILE OVERRIDES A CLOUDFLARE-MANAGED ONE. The live robots.txt today is Cloudflare's injected
  //   content-signals block: 1,248 bytes of comment with no User-agent, no Disallow and — the reason
  //   this exists — no Sitemap line. Those signals are a rights reservation, so they are carried
  //   forward verbatim rather than dropped. Deleting site/robots.txt restores the injected version.
  const robots = `# Content signals, carried forward from Cloudflare's managed robots.txt so that replacing
# that file does not quietly drop a rights reservation.
#
# search:   building a search index and providing search results.
# ai-input: inputting content into one or more AI models.
# ai-train: training or fine-tuning AI models.
#
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF
# THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

User-agent: *
Allow: /
Content-Signal: search=yes, ai-train=no

Sitemap: ${ORIGIN}/sitemap.xml
`;

  if (!dry) {
    writeFileSync(`${OUT_DIR}index.html`, index, 'utf8');
    writeFileSync(R('../site/sitemap.xml'), sitemap, 'utf8');
    writeFileSync(R('../site/robots.txt'), robots, 'utf8');
  }
  console.log(`index:     ${Math.round(Buffer.byteLength(index) / 1024)} KB, ${publishable.length} rows, filterable without a framework`);
  console.log(`sitemap:   ${urls.length} URLs`);
}

if (!dry) {
  console.log(`written:   site/exercises/<id>/index.html · site/exercises/index.html`);
  console.log(`           site/assets/catalogue.css${only ? '' : ' · site/sitemap.xml · site/robots.txt'}`);
}
