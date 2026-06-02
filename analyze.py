#!/usr/bin/env python3
"""
analyze.py — turn VerifAI user-test JSONL logs into per-session metrics, and emit
a de-identified copy for sharing.

LOCAL, no dependencies (Python 3 stdlib only — runs anywhere; pandas not required).

Usage:
  python3 analyze.py <path>                         # <path> = a .jsonl file or a folder of them
  python3 analyze.py <path> --deid-out <dir>        # also write 학번→P0x de-identified copies
  python3 analyze.py <path> --csv summary.csv       # also write the per-session table as CSV

Notes on the study design (see docs/LOGGING_RESEARCH.md & the plan):
  • Primary DV (trust in the deliberately-wrong V2) is measured OUTSIDE the app
    (team survey/interview). This script computes the BEHAVIORAL substrate + the
    appropriate-trust MODERATOR (did they catch the traps?).
  • Trust signals are decoupled from truth, so "excluded a low-trust source" is a
    moderator, not a success criterion. Report per-participant, descriptively (N≈8).
"""
import argparse, csv, glob, json, os, sys
from collections import Counter, defaultdict

# Ground-truth verdicts — mirror of src/data.js (keep in sync if data.js changes).
SOURCE_VERDICT = {
    "choi": "low", "johnson": "low", "harrison": "mostly", "smith": "trusted",      # c1 (LGX effect)
    "biohacker": "low", "openwiki": "low", "keller": "mostly", "thorne": "trusted",  # c2 (genetics)
    "who": "trusted", "geller": "trusted", "kim": "trusted", "mayo": "mostly",       # c3 (substitution)
}
LOW_TRUST = {s for s, v in SOURCE_VERDICT.items() if v == "low"}     # "should down-rank" traps
FABRICATION = "johnson"                                              # headline single item


def load_session(path):
    events = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                pass  # tolerate a torn final line from an unclean exit
    events.sort(key=lambda e: e.get("seq", 0))
    return events


def first_t(events, etype):
    for e in events:
        if e.get("event_type") == etype:
            return e.get("t_ms")
    return None


def metrics_for(events, fname):
    by_type = Counter(e.get("event_type") for e in events)
    pid = next((e.get("participant_id") for e in events if e.get("participant_id")), None)
    sid = next((e.get("session_id") for e in events if e.get("session_id")), None)
    cond = next((e.get("condition") for e in events if e.get("condition")), None)
    run_mode = next((e.get("run_mode") for e in events if e.get("run_mode")), None)

    # Final excluded set: prefer the session_end snapshot, else reconstruct net.
    final_excluded = None
    for e in events:
        if e.get("event_type") == "session_end":
            fe = (e.get("payload") or {}).get("final_excluded")
            if isinstance(fe, list):
                final_excluded = set(fe)
    if final_excluded is None:
        s = set()
        for e in events:
            if e.get("event_type") == "exclude" and e.get("target_id"):
                s.add(e["target_id"])
            elif e.get("event_type") == "restore" and e.get("target_id"):
                s.discard(e["target_id"])
        final_excluded = s

    excluded_known = {x for x in final_excluded if x in SOURCE_VERDICT}
    hits = excluded_known & LOW_TRUST                       # low-trust correctly excluded
    false_alarms = excluded_known - LOW_TRUST               # trusted/mostly wrongly excluded
    misses = LOW_TRUST - excluded_known                     # low-trust kept
    correct_rej = (set(SOURCE_VERDICT) - LOW_TRUST) - excluded_known

    reached_v2 = any(e.get("event_type") == "regenerate" for e in events)
    for e in events:
        if e.get("event_type") == "session_end":
            rv = (e.get("payload") or {}).get("reached_v2")
            if rv is not None:
                reached_v2 = bool(rv)

    # time-on-V1 before first trust action
    t_answer = first_t(events, "answer_v1_shown")
    t_first_action = None
    for e in events:
        if e.get("event_type") in ("exclude", "calibrate_submit"):
            t_first_action = e.get("t_ms")
            break
    time_on_v1 = (t_first_action - t_answer) if (t_answer is not None and t_first_action is not None) else None

    calibrations = [
        {"src": e.get("target_id"), "direction": (e.get("payload") or {}).get("direction"),
         "verdict_changed": (e.get("payload") or {}).get("verdict_changed")}
        for e in events if e.get("event_type") == "calibrate_submit"
    ]
    sources_opened = sorted({e.get("target_id") for e in events
                             if e.get("event_type") == "workspace_open" and e.get("target_id")})
    duration_ms = max((e.get("t_ms", 0) for e in events), default=0)

    return {
        "file": os.path.basename(fname),
        "participant_id": pid,
        "session_id": sid,
        "condition": cond,
        "run_mode": run_mode,
        "n_events": len(events),
        "duration_ms": duration_ms,
        "has_session_end": "session_end" in by_type,
        # --- appropriate-trust moderator (per-participant cells; do NOT aggregate at N<10) ---
        "johnson_excluded": FABRICATION in final_excluded,
        "hits_low_excluded": len(hits),
        "misses_low_kept": len(misses),
        "false_alarms_trusted_excluded": len(false_alarms),
        "correct_rejections": len(correct_rej),
        "trap_removal_rate": round(len(hits) / max(1, len(LOW_TRUST)), 2),
        "final_excluded": sorted(final_excluded),
        # --- over/under reliance ---
        "reached_v2": reached_v2,
        "over_trust_flag": not reached_v2,            # accepted V1, never acted
        "under_reliance_false_alarms": len(false_alarms) > 0,
        "time_on_v1_before_action_ms": time_on_v1,
        # --- calibration ---
        "n_calibrations": len(calibrations),
        "calibrations": calibrations,
        # --- engagement / DW6 efficiency ---
        "sources_opened": sources_opened,
        "n_sources_opened": len(sources_opened),
        "used_exclude_all_low": "exclude_all_low" in by_type,
        "n_filter_changes": by_type.get("filter_change", 0),
        "n_claim_clicks": by_type.get("claim_click", 0),
        "n_mouse_move": by_type.get("mouse_move", 0),
        "ftux_opened": by_type.get("ftux", 0) > 0,
        "event_type_counts": dict(by_type),
    }


def deidentify(files, out_dir):
    """Write copies with participant_id (학번) → P01.. The 학번↔code MAP stays LOCAL
    (written next to the de-identified dir); only the de-identified copies are shareable."""
    os.makedirs(out_dir, exist_ok=True)
    pids = []
    for path in files:
        for e in load_session(path):
            p = e.get("participant_id")
            if p and p not in pids:
                pids.append(p)
    code = {p: f"P{str(i + 1).zfill(2)}" for i, p in enumerate(sorted(pids))}
    for path in files:
        events = load_session(path)
        for e in events:
            if e.get("participant_id") in code:
                e["participant_id"] = code[e["participant_id"]]
        base = os.path.basename(path)
        # also strip the 학번 from the filename if present
        for raw, c in code.items():
            base = base.replace(str(raw), c)
        with open(os.path.join(out_dir, base), "w", encoding="utf-8") as f:
            for e in events:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")
    map_path = os.path.join(os.path.dirname(out_dir.rstrip("/")) or ".", "participant_map.LOCAL.csv")
    with open(map_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["code", "hakbeon"])
        for p, c in sorted(code.items(), key=lambda kv: kv[1]):
            w.writerow([c, p])
    return code, map_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="a .jsonl file or a folder of .jsonl files")
    ap.add_argument("--deid-out", help="write 학번→P0x de-identified copies into this dir")
    ap.add_argument("--csv", help="write the per-session summary table as CSV")
    args = ap.parse_args()

    if os.path.isdir(args.path):
        files = sorted(glob.glob(os.path.join(args.path, "*.jsonl")))
    else:
        files = [args.path]
    if not files:
        print("No .jsonl files found at", args.path); sys.exit(1)

    rows = [metrics_for(load_session(p), p) for p in files]

    print(f"\n=== VerifAI session metrics ({len(rows)} session(s)) ===\n")
    for m in rows:
        print(f"• {m['participant_id']}  ({m['file']})  cond={m['condition']} run={m['run_mode']}  "
              f"{m['n_events']} events  {m['duration_ms']/1000:.1f}s")
        print(f"    johnson_excluded={m['johnson_excluded']}  "
              f"hits={m['hits_low_excluded']}/{len(LOW_TRUST)}  misses={m['misses_low_kept']}  "
              f"false_alarms={m['false_alarms_trusted_excluded']}  correct_rej={m['correct_rejections']}")
        print(f"    reached_v2={m['reached_v2']}  over_trust_flag={m['over_trust_flag']}  "
              f"time_on_v1_before_action={m['time_on_v1_before_action_ms']}ms")
        print(f"    calibrations={m['n_calibrations']} {m['calibrations']}")
        print(f"    sources_opened={m['sources_opened']}  used_exclude_all_low={m['used_exclude_all_low']}  "
              f"filters={m['n_filter_changes']}  mouse_move={m['n_mouse_move']}")
        if not m["has_session_end"]:
            print("    ⚠ no session_end — possibly aborted/lost session")
        print()

    if args.csv:
        flat_keys = [k for k in rows[0].keys() if not isinstance(rows[0][k], (list, dict))]
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=flat_keys, extrasaction="ignore")
            w.writeheader()
            for m in rows:
                w.writerow({k: m[k] for k in flat_keys})
        print(f"wrote summary CSV → {args.csv}")

    if args.deid_out:
        code, map_path = deidentify(files, args.deid_out)
        print(f"wrote {len(code)} de-identified file(s) → {args.deid_out}")
        print(f"학번↔code map (KEEP LOCAL, do not share) → {map_path}")


if __name__ == "__main__":
    main()
