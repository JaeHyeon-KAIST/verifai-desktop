# VerifAI 유저테스트 로깅 — 자료조사 결과

> 작성: 2026-06-02 · 개발 착수 전 사전조사. 맥북 1대 로컬·**무서버** 환경에서 무엇을/어떻게 기록할지.
> 5개 차원(신뢰 측정 방법론 · 로컬 저장 메커니즘 · React 계측 · 데이터 스키마/윤리 · 도구 서베이)을 병렬 조사 후 통합.
> 모든 코드 참조는 현재 `main` 워킹트리 기준으로 검증됨.

---


# Instrumenting VerifAI's User Test — Decision-Ready Recommendation (LOCAL, no-server)

> All code references verified against the working tree on `main` (App.jsx 497 lines, data.js 219, Shared.jsx 545, SourceWorkspace.jsx 765). The five findings agree on ~95% of the architecture; the one material contradiction (Electron fs vs single Blob path) is resolved in §4 and §6.

## 1. Executive summary

Build **one small custom event logger** (`src/logger.js`, module singleton) that emits **semantic study events** — not raw clicks — driven by a **hybrid of state-transition `useEffect`s in MainApp (authoritative DV) + explicit `log()` calls** at the handlers whose intent or state the DOM/MainApp can't see (Marginalia-local filter/select, the ref-driven calibration slider, SourceWorkspace tabs/ask). Persist **eagerly, per-event**: in **Electron**, add one `ipcMain.handle('verifai:log')` channel that appends JSONL to `app.getPath('userData')/verifai-logs/`; in the **browser/GitHub-Pages** build, write per-event to **IndexedDB** + always-present **"Export session log"** Blob-download button. The renderer code path is identical — it tries `window.verifai.logAppend` first and degrades to IndexedDB — so the two run modes log the *same event schema* (resolving the only cross-finding contradiction). The **primary dependent variable** is *appropriate reliance*, scored as a signal-detection scorecard over the 5 trap sources (`johnson` mandatory), snapshotted at participant-declared "done." Pair the log with **macOS screen+audio (QuickTime) + concurrent think-aloud**, synced by one wall-clock `session_start`. **rrweb is optional** (pixel replay), never primary. At N≈5–15 report per-participant profiles descriptively, no p-values.

## 2. What to log — event taxonomy mapped to real interaction points

Field conventions for every event: see §5. Below, "Layer A" = state `useEffect` in MainApp (authoritative); "Layer B" = explicit `log()` at a handler; "Layer C" = inside `CalibrationPanel`; "Layer D" = capture-phase DOM safety net.

### Session lifecycle
| Event | Fires at | Payload | Why it matters for appropriate trust |
|---|---|---|---|
| `session_start` | Facilitator "Start" / app mount (set `t0`) | `participant_id, condition, order_index, counterbalance_group, run_mode, origin, ua` | Anchors the monotonic clock and the A/B condition; the single wall-clock marker that syncs to the screen recording. |
| `composer_focus` | App.jsx:393 `onComposerFocus` (Layer B) | `{autofilled: bool}` — true only when `!sent && !composerValue` actually fills | Task-start; distinguishes the auto-fill moment (set true t0) from idle refocus. |
| `session_end` | "End session" button (Layer B) + `visibilitychange:hidden` backstop | `{final_excluded:[...], reached_v2: bool}` | Snapshots the *final state* for the trust scorecard; a missing `session_end` flags an aborted/lost session. |

### Question / answer
| Event | Fires at | Payload | Why it matters |
|---|---|---|---|
| `send` | App.jsx:395 `onSend`, after the empty/sent/loading guard (Layer B) | `{via:'button'\|'enter'}` | Resets `t0` for latency math; the start of the measured task arc. |
| `answer_v1_shown` | Layer A `useEffect` on `loading` true→false (timer App.jsx:400) while `sent` | `{version:'v1', latency_ms}` | Time-to-first-answer; the moment V1 (with its bad citations) becomes the "advice" to be evaluated. |
| `banner_shown` | render of the "2 claims flagged" banner (Layer B, once) | `{flagged_claims:['c1','c2']}` | Did the warning appear before any action — context for whether exclusions were warning-driven. |
| `regenerate` | **Piggyback the existing effect** App.jsx:383 `if (updated && !prevUpdated.current)` | `{trigger: excludedCount>0?'exclude':'calibrate', excluded_ids:[...], excluded_verdicts:[...], calibrated_once, traps_removed:[...], false_exclusions:[...]}` | **The core appropriate-trust outcome** — records whether the user's edits actually removed `johnson/patel2024/brunye2010/blogpost2023` *without* stripping trusted sources. Fires **at most once/session** (latch). |
| `regenerate_done` | `setRegenerating(false)`, App.jsx:386 (Layer A) | `{}` | V2 visible; pairs with the corrected-phrase view below. |
| `revised_phrase_view` | IntersectionObserver / hover on a `[data-updated]` span (Layer B; **add `data-updated` to both updated spans, data.js:57 c1 AND :62 c2**) | `{claim:'c1'\|'c2'}` | Mehrotra BIA *belief* layer: did they actually **read** the correction, or just see the "Answer updated" banner and move on? **NOTE: there are TWO updated phrases (c1 and c2), not one** — finding #1 said only c2; instrument both. |

### Source inspection
| Event | Fires at | Payload | Why it matters |
|---|---|---|---|
| `claim_hover` / `claim_hover_end` | Shared.jsx:174-175 `onMouseEnter/Leave` (Layer B, **150 ms dwell debounce**) | `{claim, dwell_ms}` | Tracing a claim to its evidence; debounced to kill fly-over noise. Drop entirely if the study only cares about clicks. |
| `claim_click` | App.jsx:118-123 `onHlClick` (Layer B) | `{claim}` | High-signal: user is actively tracing a claim to its margin sources. |
| `workspace_open` / `workspace_close` | Layer A `useEffect` on `openDetail` (App.jsx:348). **Use STATE not the click** — SourceCard onClick is multiplexed by `selecting` (Shared.jsx:114) | `{src_id, verdict}` | Distinguishes *informed* rejection (opened→read→excluded) from reflexive label-following (Guo et al. caution). |
| `workspace_tab` | SourceWorkspace.jsx:577/583/586 `setTab` (Layer B; tab state is local) | `{src_id, tab:'ask'\|'community'\|'quality'}` | Opening **Quality** on a low-trust source = appropriate scrutiny. |
| `text_select` | SourceWorkspace.jsx:371-381 `maybeShow` mouseup (Layer B, throttled) | `{src_id, len}` — **length only, never raw text** | Close reading of the source (attention proxy). |
| `scoped_ask` | SourceWorkspace.jsx:406-415 `ask()` (Layer B) | `{src_id, via:'typed'\|'suggestion', q_len, scripted_branch}` — **hash/redact free text** | If the johnson "fabricated" scripted branch fires, the user surfaced the trap. Free text is the only PII vector here — log length + which scripted branch, not verbatim. |
| `ask_selection` | SourceWorkspace.jsx:417-422 (Layer B) | `{src_id, sel_len}` | Deep engagement with a specific passage. |

### Trust actions (exclude / calibrate) — the highest-value group
| Event | Fires at | Payload | Why it matters |
|---|---|---|---|
| `exclude` / `restore` | **Layer A authoritative**: `useEffect` diffing `excluded` map (App.jsx:345/372) against a `useRef` prev | `{src_id, verdict, claim, method:'single'\|'exclude_all_low'\|'multiselect'}` | **The DV.** This one effect catches margin-card, workspace, bulk, and exclude-all paths uniformly. `verdict` lookup classifies each as Hit (low excluded) / False-Alarm (trusted excluded). |
| `exclude_all_low` / `restore_all_low` | App.jsx:64-65 button onClick (Layer B, *intent* layer) | `{ids:[...], n}` | **THE headline DW6-efficiency interaction** — the one-click shortcut. Log as a **distinct, weaker-evidence** event (it makes the right outcome trivial without proving comprehension). |
| `filter_change` | App.jsx:158-161 `setFilter` (Layer B; **Marginalia-local, invisible to MainApp**) | `{from, to}` | Filtering to `low` = actively hunting bad sources (strong appropriate-trust + DW6 signal). |
| `select_mode` | App.jsx:199/66 (Layer B; local state) | `{on: bool}` | Entry into the multi-select removal path. |
| `source_select` | App.jsx:54-58 `toggleSelect` (Layer B; local `selected` Set) | `{src_id, verdict, selected: bool}` | Per-source multi-select intent. |
| `bulk_exclude` | App.jsx:67-70 `applyExclude` (Layer B, *intent*) | `{ids:[...], verdicts:[...]}` | Multi-select removal path; dedupe against the per-id Layer-A deltas in the same tick. |
| `calibrate_open` | Layer A `useEffect` on `calibrating` (App.jsx:346) | `{src_id, verdict, from:'margin'\|'workspace'}` | Entering the trust-judgment modal. |
| `calibrate_cross` | Shared.jsx:343 band-cross branch (Layer C) — **NOT per `onInput`** | `{src_id, from, to, value}` | The only meaningful slider event; band crossings reveal the user's trust trajectory. |
| `calibrate_reason` | Shared.jsx:349 `toggleReason` (Layer C) | `{src_id, reason: VERIFAI_DATA.reasons[i], on}` (reasons at data.js:212) | *Why* they re-rated — the metacognitive justification. |
| `calibrate_notes` | Shared.jsx:474 textarea **onBlur** (Layer C) | `{src_id, len}` — length only | Engagement depth; redact text. |
| `calibrate_submit` | Shared.jsx:515 → App.jsx:421 (Layer C+B) | `{src_id, ai_score, final_value, direction:'down'\|'up'\|'none', verdict_changed, reasons:[...], notes_len}` | **Calibration DIRECTION**: moving `smith`/divergence sources DOWN = appropriate skepticism; UP = mis-calibration. Richer than the binary exclude. **`final_value` needs a `lastValueRef` added** (see gotcha). |
| `calibrate_cancel` | App.jsx:411 `dismissCalibration` without `calibratedOnce` flipping (Layer A/B) | `{src_id}` | Abandoned re-rating; distinguish from submit. |

### Navigation / help
| Event | Fires at | Payload | Why it matters |
|---|---|---|---|
| `ftux` | Layer A `useEffect` on `ftuxStep` (App.jsx:349) | `{step, opened, completed: prevStep===3}` | Did onboarding explain the verdict system before the task? (3 steps, data.js:206). |
| `history_toggle` | Layer A `useEffect` on `narrow` (App.jsx:350/433) | `{narrow}` | Low-priority, cheap context. |
| `dom_click` (Layer D safety net) | one capture-phase listener in MainApp mount | `{src_id, verdict, claim, margin_claim, ftux_target}` from `closest('[data-*]')`, tagged `source:'dom-capture'` | Pure insurance: captures the data-* context of any click you forgot to instrument. **Capture phase** (calibration modal calls `e.stopPropagation` App.jsx:477). Hover excluded. |

## 3. Metrics to compute (per session, `groupby(session_id)`)

**Primary — appropriate reliance / signal detection** (the ground-truth scorecard; snapshot at `session_end`):
- **Trap set** (should down-rank): `johnson` (FABRICATED — *mandatory* binary outcome), `patel2024`, `brunye2010`, `blogpost2023` (all `verdict:'low'`) + `smith` (mostly, the "12%" vs "8-11%" divergence — scored on the **calibration slider**, not the exclude binary).
- **Core-trusted set** (should keep): `who, efsa2015, fda2018, nawrot2003, meta2021` (trusted) + `harvard2019, mayo2022` (mostly).
- `johnson_excluded` (bool) — **the headline single-item outcome.**
- **Hits** = #low-trust excluded; **Misses** = #low-trust kept; **False Alarms** = #trusted/mostly excluded; **Correct Rejections** = #trusted kept → derive a **discrimination index (d′-style)** = the cleanest single operationalization of appropriate trust. Report **raw cells per participant**, not just an aggregate (noisy at N<10).
- `trap_removal_rate` = traps_excluded / 4.
- **Pre-registered success rubric:** *appropriate trust achieved* = down-ranked/excluded ≥4/5 traps (johnson mandatory) **AND** kept ≥4/5 core-trusted.

**Primary — over/under-reliance (free ground-truth flags already in the state machine):**
- `over_trust_flag` = reached `regenerate`/V2 == **false** (never excluded/calibrated) → textbook over-reliance (accepted V1 + its bad citations). `updated` only flips on `excludedCount>0 || calibratedOnce` (App.jsx:377), so "stayed on V1" is zero-cost ground truth.
- `under_reliance_flag` = stripped genuinely-trusted sources (False Alarms > 0) → calibration failure in the *other* direction. **Never equate "more exclusions" or "lower self-reported trust" with better.**
- `time_on_v1_before_first_action` = t(first exclude/calibrate) − t(`answer_v1_shown`).
- `calibration_direction` per source (down=appropriate for divergence sources, up=mis-calibrated).
- `correction_noticed` = did a `revised_phrase_view` fire (belief) vs only `regenerate_done` seen (Mehrotra BIA: separate noticing from acting).

**Inspection-before-action (informed vs reflexive):** for each excluded trap, did `workspace_open` + dwell precede the `exclude`? Fast exclude with zero inspection = correct outcome but shallow (heuristic label-following, Guo et al.) — pair with think-aloud.

**Secondary — usability / DW6 efficiency:**
- Task success (binary via rubric + partial), **time-on-task** (report *only* alongside the reliance outcome — longer can = careful scrutiny OR confusion).
- `time_to_clear_all_low` **per removal PATH**: one-click `exclude_all_low` vs filter-then-multiselect vs one-by-one → the **direct DW6 measure**. `used_exclude_all_low` (bool — did they find the shortcut?).
- `exclusion_method_mix` (counts by method), interaction counts (clicks), error/recovery counts (e.g. restore-after-exclude churn).
- **Lostness** L = √[(N/S−1)² + (R/N−1)²] from `workspace_open` navigation (S=min views, N=unique views, R=total visits).
- Engagement: `sources_opened`, `calibrate_used`, `ftux_completed`, `filter_low_used`.

## 4. Storage

| Run mode | Primary (capture) | Fallback / Retrieval | Write cadence |
|---|---|---|---|
| **Electron** (packaged) | **Main-process Node `fs` append-to-JSONL** via one new IPC channel → `app.getPath('userData')/verifai-logs/{pid}_{cond}_{ts}.jsonl`. Keep one open fd (`fs.open(path,'a')`); `O_APPEND` = per-line atomic. | If `window.verifai.logAppend` is missing (e.g. dist served over dev server) → fall back to **IndexedDB** + "Export log" button. One-line HUD at start: `logging via: IPC|IndexedDB`. | **Per-event** IPC append + `fh.sync()` (fsync) per event or group-commit ~1 s. Survives reload AND renderer crash (file owned by main). |
| **Browser** (GitHub Pages HTTPS / `npm run dev`) | **IndexedDB**, one record/event, auto-increment key. Call `navigator.storage.persist()` once at startup (Chrome auto-grants silently, no prompt) to defeat LRU eviction. | **Always-present "Export session log" button** → reads all IndexedDB records → Blob `<a download>` `.jsonl` (+ optional `.csv`). Tiny `localStorage` mirror of `{session_id, event_count}` for a sanity glance. | **Per-event** `put`. Backstop flush on `visibilitychange:hidden` + `pagehide` — **never** rely on `beforeunload`/`unload` (Safari doesn't fire it; Chrome unload deprecation completes ~Apr 2026; terminal-event combos cap ~91%). |

**Why not the alternatives** (cross-checked, all five agree): `showSaveFilePicker` throws `SecurityError` on `file://` (opaque origin) and is unreliable inside Electron (empty files) — **not** primary. `localStorage` is synchronous (blocks the Generating…/regen animations), 5 MB cap, string-only — wrong as system of record. `sessionStorage` is wiped on tab close — loses the exact crash you're protecting against.

**Contradiction resolved (Finding #4 vs #2/#3/#5):** Finding #4 argues for a *single* Blob/localStorage path in both modes and warns that an Electron-only fs path makes the two conditions differ → an **instrumentation confound**. Findings #2/#3/#5 favor the Electron fs path for durability. **Resolution:** the confound concern is real but is fully neutralized by keeping **one renderer logger that emits one identical event schema**; only the *sink* differs (`logAppend` IPC vs IndexedDB), and the sink does not touch what/when events fire. So we get Electron's crash-safe disk durability **and** mode-symmetric data. The fallback chain (IPC → IndexedDB) means a misconfigured launch never silently drops logging. This is strictly better than #4's single-path proposal and addresses its objection.

**Facilitator retrieval (per participant, after each session):**
- **Electron:** click "Open logs folder" (`shell.openPath(userData/verifai-logs)`) → copy the `{pid}_{cond}_{ts}.jsonl` to a USB stick / collection folder. File is already on disk. Write a **fresh per-session file** and clear deliberately between participants (Electron doesn't auto-clear `userData`).
- **Browser:** click "Export session log" at `session_end` (auto-prompted by the End-session button) → the `.jsonl` lands in `~/Downloads`; rename to `{pid}_{cond}_{date}.jsonl` per the facilitator checklist.
- **Both:** stop the QuickTime recording, name it with the same `{pid}_{cond}` so log↔video align by `session_start` wall-clock.

## 5. Event schema + example JSONL lines

**Field set** — flat 8-field top level + nested `payload{}` (flexible capture, flatten for stats):
```
schema_version : 1
session_id     : "<ts>-<rand6>"
participant_id : "P03"
condition      : "B"            // A = baseline 79a6510, B = redesign
order_index    : 1             // 1st or 2nd condition this participant saw
counterbalance_group : "BA"
run_mode       : "electron" | "browser"
origin         : location.origin   // file:// | https://…pages.dev | http://localhost:5173
seq            : 7             // 0-based monotonic; gap = dropped event
t_ms           : 18423        // performance.now() - t0  (monotonic, durations)
wall_clock_iso : "2026-06-02T14:03:21.118Z"  // Date.now() on EVERY row (drift anchor)
event_type     : "exclude"
target_id      : "johnson"    // from data-src-id where applicable
target_kind    : "source"     // source | claim | margin | ftux | ui
payload        : { … }        // event-specific
```
Two clocks, both recorded: `t_ms` (monotonic, immune to NTP/DST jumps → never negative durations) for all latency metrics; `wall_clock_iso` per row for human timelines + video sync. Do **not** reconstruct wall-clock from `timeOrigin + now()` (drifts over a session).

**Example mini-session (send → inspect johnson → exclude → regenerate → calibrate smith):**
```jsonl
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":0,"t_ms":0,"wall_clock_iso":"2026-06-02T14:02:58.004Z","event_type":"session_start","target_id":null,"target_kind":"ui","payload":{"ua":"Electron/33.0.0"}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":3,"t_ms":4120,"wall_clock_iso":"2026-06-02T14:03:02.124Z","event_type":"send","target_id":null,"target_kind":"ui","payload":{"via":"button"}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":4,"t_ms":5630,"wall_clock_iso":"2026-06-02T14:03:03.634Z","event_type":"answer_v1_shown","target_id":null,"target_kind":"ui","payload":{"version":"v1","latency_ms":1510}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":9,"t_ms":17880,"wall_clock_iso":"2026-06-02T14:03:15.884Z","event_type":"workspace_open","target_id":"johnson","target_kind":"source","payload":{"verdict":"low"}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":12,"t_ms":24310,"wall_clock_iso":"2026-06-02T14:03:22.314Z","event_type":"workspace_tab","target_id":"johnson","target_kind":"source","payload":{"tab":"quality"}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":15,"t_ms":31002,"wall_clock_iso":"2026-06-02T14:03:29.006Z","event_type":"exclude","target_id":"johnson","target_kind":"source","payload":{"verdict":"low","claim":"c2","method":"single"}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":16,"t_ms":31050,"wall_clock_iso":"2026-06-02T14:03:29.054Z","event_type":"regenerate","target_id":null,"target_kind":"ui","payload":{"trigger":"exclude","excluded_ids":["johnson"],"excluded_verdicts":["low"],"calibrated_once":false,"traps_removed":["johnson"],"false_exclusions":[]}}
{"schema_version":1,"session_id":"1748873000-a3f9k2","participant_id":"P03","condition":"B","order_index":1,"counterbalance_group":"BA","run_mode":"electron","origin":"file://","seq":21,"t_ms":48770,"wall_clock_iso":"2026-06-02T14:03:46.774Z","event_type":"calibrate_submit","target_id":"smith","target_kind":"source","payload":{"ai_score":66,"final_value":38,"direction":"down","verdict_changed":true,"reasons":["Data doesn't match the claim"],"notes_len":0}}
```

## 6. Instrumentation architecture (hybrid + code sketch)

**Layer A** (state transitions, MainApp `useEffect`+`useRef`, ~7 effects) = the spine: `send`, `answer_v1_shown`, the `regenerate` (piggyback App.jsx:383), `exclude`/`restore` (diff `excluded` App.jsx:345), `calibrate_open`, `workspace_open/close`, `ftux`, `history_toggle`. **Layer B** = explicit `log()` for Marginalia-local state (filter/select/bulk/exclude-all — invisible to MainApp) + SourceWorkspace (tab/ask). **Layer C** = inside `CalibrationPanel` (ref-driven slider). **Layer D** = one capture-phase click listener (insurance).

```js
// ── src/logger.js  (NEW, module singleton — runs in browser AND Electron) ──────
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
let t0 = performance.now(), seq = 0;
let META = {};                                  // {participant_id, condition, order_index, ...}
export function initSession(meta){ META = meta; t0 = performance.now(); seq = 0; }
export function setT0(){ t0 = performance.now(); }    // call in onSend
export function log(event_type, payload = {}, { target_id=null, target_kind='ui' } = {}) {
  const rec = { schema_version:1, session_id:SESSION_ID, ...META,
    run_mode: window.verifai?.logAppend ? 'electron' : 'browser', origin: location.origin,
    seq: seq++, t_ms: Math.round(performance.now() - t0),
    wall_clock_iso: new Date().toISOString(), event_type, target_id, target_kind, payload };
  if (window.verifai?.logAppend) window.verifai.logAppend(JSON.stringify(rec)); // Electron disk
  else idbPut(rec);                                                            // browser IndexedDB
  if (import.meta.env.DEV) console.debug('[log]', rec);
  return rec;
}
// idbPut(): open 'verifai'/'events' store once, navigator.storage.persist(), put per event.
// downloadLog(): read all IDB records -> Blob -> <a download> verifai-{pid}-{cond}.jsonl

// ── src/useLogger.js  (NEW) ──  module singleton, no Provider re-render churn
import { log } from './logger.js';
export const useLogger = () => log;

// ── electron/preload.cjs  (ADD to existing exposeInMainWorld) ──────────────────
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('verifai', {
  platform: process.platform, titleBarMode, version: process.versions.electron,
  logAppend: (line) => ipcRenderer.invoke('verifai:log', line),   // NEW
  openLogs:  () => ipcRenderer.invoke('verifai:openLogs'),        // facilitator retrieval
});

// ── electron/main.cjs  (ADD; sandbox:true ⇒ fs MUST live here, not preload) ────
const { ipcMain } = require('electron'); const fs = require('node:fs');
const LOG_DIR = path.join(app.getPath('userData'), 'verifai-logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_PATH = path.join(LOG_DIR, `session-${Date.now()}.jsonl`);   // fresh per launch
const fh = fs.openSync(LOG_PATH, 'a');                                 // one open fd, O_APPEND
ipcMain.handle('verifai:log', (_e, line) => { fs.writeSync(fh, line + '\n'); fs.fsyncSync(fh); });
ipcMain.handle('verifai:openLogs', () => shell.openPath(LOG_DIR));
// SECURITY: never accept an arbitrary path from the renderer — scope to LOG_DIR only.

// ── src/App.jsx — Layer A authoritative effects (the DV spine) ─────────────────
import { log, setT0 } from './logger.js'; import { VERIFAI_DATA } from './data.js';
const verdictOf = (id) => VERIFAI_DATA.sources[id]?.verdict;
const claimOf   = (id) => Object.values(VERIFAI_DATA.claims).find(c=>c.sourceIds.includes(id))?.id;
const prevExcluded = useRef({});
useEffect(() => {                                   // excluded at App.jsx:345 — THE DV
  const prev = prevExcluded.current;
  for (const id of new Set([...Object.keys(prev), ...Object.keys(excluded)]))
    if (!!prev[id] !== !!excluded[id])
      log(excluded[id] ? 'exclude' : 'restore', { verdict:verdictOf(id), claim:claimOf(id) },
          { target_id:id, target_kind:'source' });
  prevExcluded.current = { ...excluded };
}, [excluded]);
// onSend (App.jsx:395), after the guard:  setT0(); log('send', { via });
// regenerate: inside the EXISTING effect at App.jsx:383, before setRegenerating(true):
//   log('regenerate', { trigger: excludedCount>0?'exclude':'calibrate',
//     excluded_ids: Object.keys(excluded).filter(k=>excluded[k]), calibrated_once: calibratedOnce });

// ── Fully-wired EXAMPLE (no card-handler edit needed) ──────────────────────────
// User clicks Exclude on johnson's margin card -> App.jsx:241 onExclude={()=>toggleExclude(s.id)}
//   -> toggleExclude (App.jsx:372) flips `excluded` -> the prevExcluded effect emits exactly:
//   {event_type:'exclude', target_id:'johnson', payload:{verdict:'low', claim:'c2', ...}}
// The SAME record is produced whether the exclude came from the margin card, the
// SourceWorkspace button (SourceWorkspace.jsx:526), bulk-exclude, or exclude-all-low —
// because the STATE is the single capture point. Layer-B intent events sit on top to recover grouping.

// ── src/components/Shared.jsx — Layer C slider (ref-driven, Shared.jsx:343) ────
// inside handleSliderInput: lastValueRef.current = v;   // ADD: stash final value for submit
// if (newVerdict !== lastVerdictRef.current) {
//   log('calibrate_cross', { from:lastVerdictRef.current, to:newVerdict, value:v }, {target_id:source.id,target_kind:'source'});
//   lastVerdictRef.current = newVerdict; }
// onSubmit (Shared.jsx:515): log('calibrate_submit', { ai_score, final_value:lastValueRef.current,
//   direction: lastValueRef.current<aiScore?'down':lastValueRef.current>aiScore?'up':'none',
//   verdict_changed, reasons:[...reasonSet].map(i=>VERIFAI_DATA.reasons[i]), notes_len:notes.length }, {target_id:source.id});
```

## 7. Consent / ethics checklist (class-study appropriate)

- One-page **information/consent sheet**: purpose, **voluntary participation + right to withdraw anytime**, that only **interaction events** (clicks/timings, no PII) are logged **locally on this MacBook**, that **screen + audio (think-aloud)** is recorded, retention + **deletion date**, facilitator contact. Signature optional for anonymous interaction data (voluntary participation implies consent).
- **Participant codes** `P01, P02…` assigned at the laptop; any code→identity map (only if needed for course credit) kept on a **separate sheet, never in logs/filenames**.
- **Data minimization by design:** the question auto-fills (fixed, non-sensitive — "effects of caffeine on cognitive performance"); the only free-text vector is the scoped-source chat → **log `len`/scripted-branch only, never verbatim**.
- **Recording consent** explicit and separable (they may decline audio/screen and still participate).
- **No IRB needed for classroom-only** use — but if you may **publish/present externally, obtain IRB approval BEFORE collecting** (retroactive approval is impossible). Decide intent up front.
- Store logs + recordings in a single local folder; delete per the stated date.

## 8. Tools verdict

**Build the custom semantic logger as PRIMARY.** It directly emits the dependent variable (`{event_type:'exclude', target_id:'johnson', verdict:'low'}` is analysis-ready in a spreadsheet); it's right-sized for small-N; it honors no-server perfectly; and the data-* attributes + MainApp state already exist, so wiring is an afternoon. rrweb/Clarity/etc. give *pixels* you'd still have to hand-code against the traps.

**Pair it with macOS screen + audio recording (QuickTime built-in; OBS only if you need a webcam PIP) + concurrent think-aloud (Ericsson & Simon).** At N≈5–15 the think-aloud is the *primary explanatory evidence* for WHY a user did/didn't distrust johnson — the log says WHAT/WHEN, the recording says WHY. Sync via the single `session_start` wall-clock marker (start the recording at that instant). Add a **critical-incident log** (facilitator notes trust-relevant moments with timestamps).

**Post-task battery (post-block only, never mid-task):** **S-TIAS** (3-item trust, validated, minimally disruptive) + **SUS** (usability) + **NASA-TLX** (workload). ~20 items total; treat as **descriptive triangulation**, never as the primary DV (self-report trust couples only weakly to behavior).

**rrweb = OPTIONAL complement only** — it's the one third-party tool that honors no-server (record→export→replay 100% client-side, replayable from a `file://` HTML page). Add it *only* if a stakeholder demands pixel-accurate replay; if so, route it through the SAME export channel, sink to **IndexedDB not localStorage** (~1.4 MB/min would blow the 5 MB cap), down-sample mouse moves. **Reject all cloud tools** (Clarity/Hotjar/FullStory/PostHog-cloud/LogRocket-cloud) — they transmit off-machine (Clarity even trains AI on your data); self-hosting PostHog/OpenReplay means a Docker/ClickHouse backend, wildly disproportionate.

## 9. Risks & pitfalls

- **StrictMode is ON (main.jsx:11):** in dev every effect double-fires → Layer-A loggers double-emit. **Mitigations:** (a) run the real test against the **production build** (`vite build` / packaged Electron) where StrictMode double-invoke doesn't happen; (b) all Layer-A loggers diff against a `useRef(prev)` so an unchanged re-mount emits nothing; (c) gate one-time logs behind a ref. Never use raw effect-count for analysis in dev.
- **Slider final value is lost** if the user releases without crossing a band (ref-driven, React `value` stale, Shared.jsx:317-347). **Must add `lastValueRef.current = v`** on every `handleSliderInput` and read it at submit (or add `onChange`/`onMouseUp` which fire on release, unlike `onInput`).
- **Marginalia-local state** (`filter`/`selecting`/`selected`, App.jsx:39-41) is invisible to MainApp effects — filter-by-verdict and multi-select **will silently vanish** unless logged at their handlers (Layer B).
- **SourceCard onClick is multiplexed** by `selecting` (Shared.jsx:114) — trust the `openDetail` STATE for `workspace_open`, never the raw click, or selects get mislabeled as opens.
- **`regenerate` fires at most once/session** (`prevUpdated` latch, App.jsx:381). A participant who excludes *more* sources after the first regen produces further `exclude` records but **no second regenerate** — don't read its absence as inaction.
- **Two updated phrases, not one:** corrections appear on **both c1 (data.js:57) and c2 (data.js:62)** — finding #1 only named c2. Instrument `revised_phrase_view` on both, or you'll under-count "noticed the correction."
- **Bulk paths double-count:** `exclude_all_low`/`applyExclude` flip many keys → Layer-A emits one `exclude` per source AND Layer-B emits one intent event. Tag bulk/all-low events with a group flag so analysis dedupes per tick (intent vs mechanism).
- **The one-click "Exclude all low-trust" makes the right outcome trivial** without proving comprehension — log it as distinct, **weaker-evidence**, and lean on think-aloud to confirm understanding.
- **Don't depend on terminal events to flush** (Safari no `beforeunload`; Chrome unload deprecation ~Apr 2026; ~91% cap). Persist per-event; flush-on-hidden is a backstop only.
- **Per-origin stores:** `file://`, GitHub Pages, and `localhost:5173` are three separate IndexedDB/localStorage origins. Stamp `origin` on every event and **standardize the facilitator on ONE launch method**.
- **Analysis hygiene:** at N≈5–15, report per-participant profiles **descriptively — no p-values**. Time-on-task is ambiguous (careful vs confused) — never report it without the reliance outcome + think-aloud beside it. Keep JSONL as source of truth; CSV is a derived export (`pd.read_json(lines=True)` + `pd.json_normalize(df.payload)`).
- **Pilot once:** validate the logger + `analyze.py` against one pilot session before running real participants (a logger that emits only on the happy path looks identical to a crashed one — wrap writes in try/catch, require an explicit `session_end`).



---

## 10. 개발 착수 전 사용자가 결정할 사항 (Open Decisions)

### Run mode for the actual test (Electron packaged vs plain browser)

- **옵션:** Electron packaged app (crash-safe disk JSONL via the new IPC channel, deterministic userData path, splash/brand moment) | Plain browser via GitHub Pages or npm run dev (IndexedDB + Export button, zero packaging, but file:// vs https origin differences and no silent disk write)
- **권고:** Electron packaged for the real sessions: the IPC+fs path gives per-event fsync durability that survives a renderer crash, and the facilitator just opens the userData/verifai-logs folder to collect each file. Keep the browser/IndexedDB path as the verified fallback (same event schema) so a misconfigured launch never drops logging. CRITICAL: run the PRODUCTION build either way to avoid StrictMode double-firing the Layer-A effects.

### Study design: within-subjects vs between-subjects, and whether to compare against the pre-redesign baseline (git 79a6510)

- **옵션:** Within-subjects A/B with the baseline 79a6510 as condition A and the redesign as B, complete counterbalancing (half AB, half BA) | Between-subjects (each participant one condition) | Single-condition redesign-only (no baseline comparison, pure formative usability)
- **권고:** If you want an A-vs-B claim at small N, use within-subjects with the 79a6510 baseline as A and complete counterbalancing — log condition + order_index + counterbalance_group so you can check carryover (a participant who learns the johnson trap in condition 1 spots it faster in 2). But for a typical formative class study, single-condition redesign-only is cleaner: it sidesteps order effects entirely and focuses N≈5-15 on discovering whether the redesign produces appropriate trust. Decide based on whether the deliverable needs a comparative claim.

### Primary metric / headline dependent variable

- **옵션:** johnson_excluded (single binary fabrication-catch) | trap discrimination index (d'-style Hits vs False Alarms over all 5 traps + trusted set) | over_trust_flag (reached V2 without any exclude/calibrate) | DW6 time-to-clear-all-low-trust (efficiency)
- **권고:** Primary = the trap discrimination scorecard with johnson_excluded as the named make-or-break single item (catching the fabricated citation is the core appropriate-trust behavior), reported as per-participant raw Hit/Miss/FalseAlarm cells, NOT an aggregate d' (too noisy at N<10). over_trust_flag and DW6 time are strong named secondaries. Pre-register the 4/5-traps-removed (johnson mandatory) AND 4/5-trusted-kept success rubric before running anyone.

### Screen + audio (think-aloud) recording: yes/no, and tooling

- **옵션:** Yes, QuickTime (built-in, screen+mic, zero install) | Yes, OBS (adds webcam PIP + system audio, heavier setup) | No recording, rely on facilitator critical-incident notes only
- **권고:** Yes, record — QuickTime by default. At N≈5-15 the think-aloud is the PRIMARY explanatory evidence for WHY a user trusted/distrusted johnson; the event log alone gives WHAT/WHEN but not WHY. Sync to the log via the single session_start wall-clock marker. Use OBS only if the team specifically needs the participant's face. Get explicit, separable recording consent (they may decline audio and still participate).

