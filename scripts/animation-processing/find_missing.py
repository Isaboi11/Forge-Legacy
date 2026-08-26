"""
Which catalogue exercises have NO animation, and what the raw library might have for them.

    python find_missing.py <exercises.json> <delivered_male.txt> <delivered_female.txt> <library.txt> <out_dir>

Writes `<out_dir>/missing.json` — one row per (exercise, sex) with the top candidate clips,
ranked — and nothing else. It PROPOSES; a human decides. See `build_missing_review.mjs`.

══ WHY THIS IS SEPARATE FROM `match_catalog.py` ══

That script answers "what should we process?" and picks ONE best file per exercise, which is right
for feeding a batch. This answers a different question — *"what is still missing, and what are my
options?"* — so it keeps the top N and never collapses to a single pick. PO: *"Build a place for me
to go and check and choose which animation if there are multiple, or just verifying that you got it
right."* A single pick cannot be chosen between.

⚠ IT MATCHES THE RAW LIBRARY (`MP4/`), NOT `Processed/`. PO: *"I'm talking about the raw files and
animations, not the ones already edited to be forge."* The processed folder is the OUTPUT of this
pipeline; matching against it would only ever rediscover what we already have.

⚠ SEX IS A HARD FILTER, NOT A RANKING SIGNAL. A male clip can never be a candidate for a female slot.
The library is split `MP4/MALE/**` and `MP4/FEMALE/**`, and the two are different renders of different
bodies — offering one for the other is not a near-miss, it is the wrong asset.

⚠ AND THE FEMALE LIBRARY HAS NO `Library_database` BRANCH. Male carries Gym + Home + Library (6,310
clips); female only Gym + Home (3,023). So a female slot genuinely has fewer places to be found, and a
female row with no candidates may mean the clip does not exist rather than that the matcher failed.
That distinction is reported rather than left to be inferred from an empty list.
"""
import json
import os
import re
import sys

STOP = {'the', 'a', 'with', 'to', 'and', 'of', 'on', 'in', 'male', 'female', 'fix',
        'for', 'at', 'an', '', 'version', 'variation'}

# How many options a human is willing to look at before the list stops helping.
TOP_N = 6


def toks(s):
    """Verbatim from `match_catalog.py` — the two must not drift, or the same name would tokenise
    differently in the two halves of one pipeline."""
    s = s.lower().replace('bycicle', 'bicycle').replace('&', 'and')
    out = []
    for w in re.split(r'[^a-z0-9]+', s):
        if not w or w in STOP:
            continue
        w = re.sub(r'(?<=.{3})s$', '', w)
        out.append(w)
    return set(out)


def sex_of(path):
    p = path.replace('\\', '/').lower()
    return 'female' if '/female/' in p else 'male'


def branch_of(path):
    p = path.replace('\\', '/')
    m = re.search(r'/MP4/(MALE|FEMALE)/([^/]+)/', p, re.I)
    return m.group(2) if m else ''


def core_tokens(path):
    base = os.path.splitext(os.path.basename(path))[0]
    core = base.split('_')[0]
    core = re.sub(r'\((?:male|female|version-?\d+)\)', '', core, flags=re.I)
    return toks(core)


def score(ex_toks, clip_toks):
    """
    How well a clip's name covers the exercise's name.

    ⚠ COVERAGE OF THE EXERCISE FIRST, THEN TIGHTNESS. `jaccard` alone rewards a short clip name that
    happens to share two words; what matters is that every word of the EXERCISE is present — "Barbell
    Bench Press" must not match "Bench" — and only then that the clip carries little else. The extra
    tokens are what separate "Bulgarian Split Squat" from "Zercher Bulgarian Split Squat", the exact
    mis-pick `match_catalog.py`'s header warns about.
    """
    if not ex_toks:
        return 0.0
    hit = len(ex_toks & clip_toks)
    covered = hit / len(ex_toks)
    extra = len(clip_toks - ex_toks)
    exact = 1.0 if clip_toks == ex_toks else 0.0
    # ⚠ THE EXTRA-TOKEN PENALTY IS DELIBERATELY HEAVY. An extra word is rarely decoration — it usually
    # names a DIFFERENT movement ("EZ-bar **Deadlift with** Biceps Curl", "**Pike** Push-up from
    # deficit", "**reverse** grip machine lat pulldown"). At 0.35 those out-ranked cleaner clips; at 1.2
    # a full-coverage match with two spare words falls below one with none, which is the ordering a
    # human actually wants to read.
    return round(exact * 100 + covered * 10 - extra * 1.2, 4)


def main():
    cat_path, male_path, female_path, lib_path, out_dir = sys.argv[1:6]
    os.makedirs(out_dir, exist_ok=True)

    catalog = json.load(open(cat_path, encoding='utf-8'))
    delivered = {
        'male': {l.strip() for l in open(male_path, encoding='utf-8-sig') if l.strip()},
        'female': {l.strip() for l in open(female_path, encoding='utf-8-sig') if l.strip()},
    }

    lib = []
    for line in open(lib_path, encoding='utf-8-sig'):
        p = line.strip()
        if not p:
            continue
        lib.append({'path': p, 'sex': sex_of(p), 'branch': branch_of(p),
                    'toks': core_tokens(p), 'name': os.path.basename(p)})
    by_sex = {'male': [c for c in lib if c['sex'] == 'male'],
              'female': [c for c in lib if c['sex'] == 'female']}

    rows = []
    for ex in catalog:
        ex_toks = toks(ex['name'])
        for sex in ('male', 'female'):
            if ex['id'] in delivered[sex]:
                continue
            scored = []
            for c in by_sex[sex]:
                s = score(ex_toks, c['toks'])
                if s > 0:
                    scored.append((s, c))
            scored.sort(key=lambda t: -t[0])
            top = scored[:TOP_N]

            # ⚠ CONFIDENCE IS ABOUT HOW MUCH LOOKING IT NEEDS, NOT HOW RIGHT IT IS. Nothing here has
            # seen a single frame of video; these tiers only say how far the NAMES are apart, which is
            # the only evidence this script has. `likely` still has to be eyeballed — it is simply the
            # pile you can move through quickly.
            def tier(c):
                if c is None:
                    return 'none'
                miss, extra, n = len(c['missing']), len(c['extra']), len(ex_toks)
                if miss == 0 and extra <= 1:
                    return 'likely'        # covers the name and carries almost nothing else
                if miss == 0:
                    return 'review'        # covers it, but the spare words may change the movement
                # ⚠ ONE MISSING WORD OUT OF THREE OR MORE IS NOT "WEAK", AND CALLING IT THAT BURIED THE
                # BEST ROWS IN THE PILE. "Ab Wheel Rollout" -> "Wheel-Rollout" drops `ab`; "Alternating
                # Lunge Jump" -> "Lunge-with-Jump" drops `alternating`. Both are almost certainly the
                # right clip. The first tiering marked 369 of 392 male rows weak, which is the same as
                # having no tiers at all.
                if miss == 1 and n >= 3:
                    return 'review'
                return 'weak'
            rows.append({
                'id': ex['id'],
                'name': ex['name'],
                'sex': sex,
                'equipmentId': ex.get('equipmentId'),
                'pattern': ex.get('movementPattern'),
                # `exact` is the only tier a human can skim past safely; everything else needs a look.
                'exact': bool(top and top[0][1]['toks'] == ex_toks),
                'confidence': tier({'missing': sorted(ex_toks - top[0][1]['toks']),
                                    'extra': sorted(top[0][1]['toks'] - ex_toks)} if top else None),
                'candidates': [{
                    'path': c['path'],
                    'name': c['name'],
                    'branch': c['branch'],
                    'score': s,
                    'extra': sorted(c['toks'] - ex_toks)[:6],
                    'missing': sorted(ex_toks - c['toks'])[:6],
                } for s, c in top],
            })

    out = os.path.join(out_dir, 'missing.json')
    json.dump(rows, open(out, 'w', encoding='utf-8'), indent=1)

    print(f'catalogue: {len(catalog)}   library: {len(lib)} '
          f'(male {len(by_sex["male"])} / female {len(by_sex["female"])})')
    for s in ('male', 'female'):
        sub = [r for r in rows if r['sex'] == s]
        by = {t: sum(1 for r in sub if r['confidence'] == t) for t in ('likely', 'review', 'weak', 'none')}
        print(f'  {s:<7} missing {len(sub):>4}   '
              f'likely {by["likely"]:>4}   needs a look {by["review"]:>4}   '
              f'weak {by["weak"]:>4}   nothing found {by["none"]:>4}')
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
