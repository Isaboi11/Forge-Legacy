"""
match_catalog.py — map app catalog exercises to library animation files, per gender.

  python match_catalog.py <exercises.json> <library_list.txt> [out_dir]

  library_list.txt : one animation file path per line (e.g. `find <lib> -iname '*.mp4'`).
                     'female' anywhere in the path marks a file as the female variant.

Writes to out_dir (default '.'):
  catalog_match_review.csv  — every catalog exercise with its best male & female candidate
                              and a confidence tier, least-confident first. REVIEW THIS:
                              token matching is fuzzy and CANNOT be trusted blindly
                              (e.g. "Bulgarian Split Squat" can grab "Zercher Bulgarian
                              Split Squat"). Fix wrong picks by hand.
  process_list.txt          — the confident (exact/strong) source files to feed to batch.py.

Tiers:  exact  = filename core tokens == exercise tokens
        strong = every exercise word present in the filename (may still be wrong; review)
        fuzzy  = >=75% of words present (needs review)
        MISSING= no candidate (absent from library, or named too differently)
"""
import sys, os, re, json, csv
from collections import defaultdict, Counter

STOP = {'the', 'a', 'with', 'to', 'and', 'of', 'on', 'in', 'male', 'female', 'fix',
        'for', 'at', 'an', '', 'version', 'variation'}


def toks(s):
    s = s.lower().replace('bycicle', 'bicycle').replace('&', 'and')
    out = []
    for w in re.split(r'[^a-z0-9]+', s):
        if not w or w in STOP:
            continue
        w = re.sub(r'(?<=.{3})s$', '', w)      # crude depluralize (applied to both sides)
        out.append(w)
    return set(out)


def gender_of(path):
    return 'female' if '/female/' in path.replace('\\', '/').lower() else 'male'


def core_tokens(path):
    base = os.path.splitext(os.path.basename(path))[0]
    core = base.split('_')[0]                   # filenames are <name>_<Muscle/Category>...
    core = re.sub(r'\((?:male|female|version-?\d+)\)', '', core, flags=re.I)
    return toks(core)


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    ex_path, lib_path = sys.argv[1], sys.argv[2]
    out_dir = sys.argv[3] if len(sys.argv) > 3 else "."
    os.makedirs(out_dir, exist_ok=True)

    files = {'male': [], 'female': []}
    inv = {'male': defaultdict(set), 'female': defaultdict(set)}
    for line in open(lib_path, encoding='utf-8'):
        p = line.strip()
        if not p:
            continue
        g = gender_of(p); ct = core_tokens(p)
        if not ct:
            continue
        i = len(files[g]); files[g].append((p, ct))
        for w in ct:
            inv[g][w].add(i)

    def best(et, g):
        cand = set()
        for w in et:
            cand |= inv[g].get(w, set())
        b = None
        for i in cand:
            path, ct = files[g][i]
            cont = len(et & ct) / len(et)
            score = (1 if ct == et else 0, cont, -len(ct - et))
            if b is None or score > b[0]:
                b = (score, path, cont, ct == et)
        return b

    exercises = json.load(open(ex_path, encoding='utf-8'))
    rows, proc = [], []
    for ex in exercises:
        et = toks(ex.get('name', ''))
        rec = {'id': ex.get('id', ''), 'name': ex.get('name', '')}
        for g in ('male', 'female'):
            b = best(et, g) if et else None
            if b and (b[3] or b[2] >= 0.999):
                rec[g] = os.path.basename(b[1]); rec[g + '_path'] = b[1]
                rec[g + '_tier'] = 'exact' if b[3] else 'strong'
                proc.append(b[1])
            elif b and b[2] >= 0.75:
                rec[g] = os.path.basename(b[1]); rec[g + '_path'] = b[1]
                rec[g + '_tier'] = f'fuzzy{b[2]:.2f}'
            else:
                rec[g] = ''; rec[g + '_tier'] = 'MISSING'
        rows.append(rec)

    order = {'exact': 0, 'strong': 1, 'MISSING': 3}
    rows.sort(key=lambda r: -(order.get(str(r['male_tier']).split('0')[0], 2)
                              + order.get(str(r['female_tier']).split('0')[0], 2)))
    with open(os.path.join(out_dir, "catalog_match_review.csv"), "w", newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(["exercise_id", "name", "male_tier", "male_file", "female_tier", "female_file", "OK?(y/n/fix)"])
        for r in rows:
            w.writerow([r['id'], r['name'], r['male_tier'], r['male'], r['female_tier'], r['female'], ''])

    seen, acc = set(), []
    for p in proc:
        if p not in seen:
            seen.add(p); acc.append(p)
    open(os.path.join(out_dir, "process_list.txt"), "w", encoding='utf-8').write("\n".join(acc) + "\n")

    mt = Counter(str(r['male_tier']).split('0')[0] for r in rows)
    ft = Counter(str(r['female_tier']).split('0')[0] for r in rows)
    both = sum(1 for r in rows if r['male_tier'] in ('exact', 'strong') and r['female_tier'] in ('exact', 'strong'))
    print(f"exercises {len(rows)} | male {dict(mt)} | female {dict(ft)}")
    print(f"both-gender confident: {both} | confident clips to process: {len(acc)}")
    print(f"-> {out_dir}/catalog_match_review.csv  (REVIEW), {out_dir}/process_list.txt")


if __name__ == "__main__":
    main()
