"""
batch.py — parallel, resumable batch runner for process_clip.

  python batch.py <list_file> <out_root> [workers] [--by-gender]

  list_file : one input path per line. Accepts Windows (D:/..), POSIX (/mnt/d/..)
              or Git-Bash/MSYS (/d/..) paths; blank lines and '#' comments ignored.
  out_root  : output directory. With --by-gender, files go to <out_root>/male|female/
              based on whether the source path contains a 'female' segment.
  workers   : concurrent clips (default = min(8, cpu-2)). Each worker peaks ~1-1.5 GB;
              on a 16 GB machine keep this <= 8.

Robustness:
  * Resumable  — skips any output that already exists and is non-empty.
  * Atomic     — process_clip writes out.tmp then renames, so an interrupted clip never
                 leaves a half-file that resume would treat as done.
  * Retryable  — every failure is appended to <out_root>/_failures.txt; re-run with that
                 file as the list to retry only the failures.
  * Isolated   — one bad clip can't kill the batch (per-clip try/except).
"""
import sys, os, re, time, shutil, tempfile
import multiprocessing as mp

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKROOT = os.path.join(tempfile.gettempdir(), "forge_anim_work")


def to_win(p):
    p = p.strip().strip('"')
    m = re.match(r'^/(?:mnt/)?([a-zA-Z])/(.*)', p)     # /d/.. or /mnt/d/.. -> D:/..
    return f"{m.group(1).upper()}:/{m.group(2)}" if m else p


def out_name(src):
    base = os.path.splitext(os.path.basename(src))[0]
    return re.sub(r'[^A-Za-z0-9._-]+', '_', base).strip('_') + ".webp"


def gender_of(src):
    return "female" if "/female/" in src.replace("\\", "/").lower() else "male"


def work_one(args):
    src, out_root, by_gender = args
    if SCRIPT_DIR not in sys.path:
        sys.path.insert(0, SCRIPT_DIR)
    import process_clip as pc
    out_dir = os.path.join(out_root, gender_of(src)) if by_gender else out_root
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, out_name(src))
    if os.path.exists(out) and os.path.getsize(out) > 0:
        return (src, "skip", 0.0)
    work = os.path.join(WORKROOT, f"w{os.getpid()}")
    try:
        t = time.time()
        pc.main(src, out, work)
        return (src, "ok", time.time() - t)
    except Exception as e:
        return (src, f"ERR:{type(e).__name__}:{str(e)[:160]}", 0.0)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    by_gender = "--by-gender" in sys.argv
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    list_file, out_root = args[0], args[1]
    workers = int(args[2]) if len(args) > 2 else max(1, min(8, (os.cpu_count() or 4) - 2))

    srcs = []
    for line in open(list_file, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#"):
            srcs.append(to_win(line))
    os.makedirs(out_root, exist_ok=True)
    os.makedirs(WORKROOT, exist_ok=True)
    fail_log = os.path.join(out_root, "_failures.txt")

    tasks = [(s, out_root, by_gender) for s in srcs]
    print(f"{len(tasks)} clips -> {out_root} | {workers} workers | by_gender={by_gender}", flush=True)
    t0 = time.time(); done = ok = skip = err = 0; times = []
    with open(fail_log, "w", encoding="utf-8") as flog:
        with mp.Pool(workers) as pool:
            for src, status, dt in pool.imap_unordered(work_one, tasks):
                done += 1
                if status == "ok":
                    ok += 1; times.append(dt)
                elif status == "skip":
                    skip += 1
                else:
                    err += 1; flog.write(src + "\n"); flog.flush()
                avg = (sum(times) / len(times)) if times else 0
                eta = (len(tasks) - done) * (avg / max(1, workers)) if avg else 0
                print(f"[{done}/{len(tasks)}] {status[:24]:24} {os.path.basename(src)[:46]:46} "
                      f"| ok={ok} skip={skip} err={err} avg={avg:.0f}s eta~{eta/60:.0f}m", flush=True)
    shutil.rmtree(WORKROOT, ignore_errors=True)
    print(f"DONE {ok} ok, {skip} skipped, {err} errors in {(time.time()-t0)/60:.1f} min", flush=True)
    if err:
        print(f"Retry failures: python batch.py \"{fail_log}\" \"{out_root}\" {workers}"
              + (" --by-gender" if by_gender else ""), flush=True)


if __name__ == "__main__":
    main()
