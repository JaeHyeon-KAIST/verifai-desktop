# Work Log — user-test redesign

What changed in the VerifAI prototype for the HCI user test, and why. Written so
a teammate (or future me) can understand the intent behind each decision.

## Goal & constraints

- **Goal:** evaluate whether the design **increases trust** in AI answers — the
  same purpose other teams pursue with Figma-mockup interviews, but with a
  *working* prototype.
- **Not in scope:** real LLM, real trust scoring, backend, persistence. All
  "intelligence" is fixed dummy data so the *interaction and visual design* can
  be tested honestly.
- **Rollback:** baseline before this redesign is commit `79a6510`.

## Problems in the original (vs the W10 lecture)

1. **Too many colors.** The trust trio (green/amber/red) sat under a separate
   teal accent that clashed with the "trusted" green, plus stray blues/purples
   and avatar gradients — violating "use few colors" and 60-30-10.
2. **Hardcoded values everywhere.** ~50+ hex colors and inline `fontSize`/color
   in JSX bypassed the token layer, so "change once, change everywhere" didn't
   actually hold.
3. **A latent bug.** `--verdict-low` was referenced but never defined (only
   `--low` existed) → that color silently failed.
4. **Delete only inside detail.** Removing a low-trust source meant entering each
   source's detail view — the inefficiency flagged in DW6.
5. **No test flow.** The answer was always already on screen and a tour
   auto-started; there was no "ask → generate → review → correct" arc to test.

## What changed

### Design system (single source of truth)
- Rebuilt `tokens.css` as a **Linear-dark** palette: one indigo accent + the
  denotative trust trio as the only semantic colors. See
  [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
- Moved **all** colors/type/spacing to tokens; removed hardcoded hex/inline
  styles. Tints now use `color-mix` off the base tokens so they auto-track.
- Added the missing `--verdict-*` aliases (fixes problem #3) and `--score-*`
  bands.
- **WCAG AA** re-verified on the dark canvas; body bumped 14→15px; serif
  restricted to the paper reader.

### Verification panel (DW6 efficiency)
- Trust **filter chips** (All / Trusted / Mostly / Low) with live counts.
- One-click **"Exclude all low-trust"** with one-click **Restore** (in place).
- **Multi-select + bulk exclude** directly from the main screen; bulk actions sit
  next to **Done** (no far-off action bar).

### User-test flow
- Empty first screen → clicking the composer **auto-fills the fixed question** →
  Send → **"Generating…"** (1.5s) → answer + "2 claims flagged" banner.
- Excluding or recalibrating a source **auto-regenerates**: "Regenerating with
  your changes…" → revised answer + "Answer updated" banner.
- Auto-tour removed (now manual via the "?" button); the 3-step tour code is kept.

### Source detail workspace
- Excluded state now reads clearly: **dimmed/desaturated** paper, an "Excluded"
  tag, and **in-place Exclude↔Restore** so undo needs zero cursor travel
  (Fitts/GOMS). Calibrate is hidden (placeholder slot) while excluded so Restore
  stays put.
- Community widget: thicker **donut + a 3-segment proportion bar** in one card;
  consistent card radius across claim/divergence/community.

### The "revised" marker (most recent fix)
- Revised phrases used a **verdict-colored `✓`** — which read as "verified" on a
  claim that was actually *corrected*, and produced a contradictory red-circle-✓.
- Replaced with a neutral **indigo `↻`** badge (+ "Revised after your source
  changes" tooltip). Trust color and "this changed" are now visually separate.

## How the mocked answer works

`src/data.js` holds two answers:
- `answerV1` — the initial answer (with the over-stated claims).
- `answerV2` — shown after the user excludes/recalibrates; revised phrases carry
  `updated: true`, which renders the `↻` marker.

To change the regenerated content later, **edit `answerV2` only**. The flow logic
(`sent` → `loading` → `excludedCount`/`calibratedOnce` → `regenerating`) lives in
`MainApp` in `src/App.jsx` and does not need to change.

## Verification done

- `npm run build` — clean.
- Headless smoke test of the **production build in a pure browser** (no Electron
  preload): app mounts, no console errors, full flow works
  (V1 → exclude → "Regenerating" → V2), `↻` badge renders indigo. This is what
  confirms the GitHub Pages (web) build behaves identically to the desktop app.

## Delivery

- One codebase → **desktop** (Electron, `electron:build:*`) and **web** (GitHub
  Pages via `.github/workflows/deploy.yml`). `vite.config.js` uses `base: './'`
  so the same `dist/` works from `file://` (Electron) and a Pages subpath.
- Live site: https://jaehyeon-kaist.github.io/verifai-desktop/

## User-test instrumentation (2026-06-02)

Added local, **no-server** behavioral logging + swapped in the real study scenario.
Full research/rationale: [`LOGGING_RESEARCH.md`](LOGGING_RESEARCH.md).

### Scenario data (`src/data.js`)
- Replaced the caffeine demo with the team's **"Does drinking milk increase height?" / Lactoglobin-X (LGX)** scenario: 3 claims × 4 sources = 12, verdict mix Low4/Mostly3/Trusted5.
- `answerV1` is conservative; **`answerV2` is deliberately *less accurate* (LGX overhyped)** — the study tests whether the verification UX makes users trust the (wrong) revised answer more. Trust signals (badges, community votes) are intentionally decoupled from truth (e.g. `thorne` is Trusted/92% but its body says genetics 20–30%, contradicting the claim it backs; `johnson` is a fabricated citation).
- Per-source content (paper full text, scoped-chat answer, suggestions, comments) now lives in `data.js` as the single source of truth; `SourceWorkspace` reads it. **To edit study content, edit `data.js` only.** (The old caffeine maps in `SourceWorkspace.jsx` are now dead/unreachable — slated for deletion in a post-test cleanup.)
- Claim highlight colour = explicit per-claim band via `worstVerdict` (c1=red, c2=yellow, c3=green), not the literal worst verdict.

### Logging (`src/logger.js`, `electron/*.cjs`)
- One module singleton emits **semantic study events** + low-level **mouse/scroll** (sampled, batched) + a capture-phase `dom_click` safety net. Schema = flat JSONL (schema_version, session_id, participant_id, condition, run_mode, origin, seq, t_ms (monotonic), wall_clock_iso, event_type, target_id, target_kind, payload).
- **Dual sink, identical schema:** Electron → IPC `verifai:log` appends to `userData/verifai-logs/{학번}_{ts}.jsonl` + fsync (crash-safe); browser → IndexedDB + a "세션 종료" button that exports a `.jsonl`. The renderer path is the same; only the sink differs.
- Instrumentation is a hybrid: Layer A = state-transition `useEffect`s in `MainApp` (the DV spine — one `excluded` diff catches every exclude path); Layer B = explicit `log()` for Marginalia-local + SourceWorkspace state; Layer C = the calibration slider; Layer D = the capture-phase click net.

### Session flow
- A **StartGate** (logo + 학번 input + 시작하기) gates the app: on click it runs `initSession({participant_id: 학번})`, fires `session_start`, sets the monotonic `t0`, and is the cue to start QuickTime screen recording. A "세션 종료" button snapshots final state (`session_end`) and exports/opens the log. **No in-app questions / no think-aloud** (trust is measured externally by the team) so click/timing data stays clean.

### Analysis (`analyze.py`, stdlib-only)
- `python3 analyze.py <logs-dir|file> [--deid-out DIR] [--csv FILE]` → per-session metrics (johnson-caught, hit/miss/false-alarm trap scorecard as a *moderator*, over-trust flag, time-on-V1, calibration direction, engagement) + a **de-identified copy** (학번→P01…) with the 학번↔code map kept local.

### Verified
- `npm run build` clean. Playwright drove the **production build** through the full flow and read the logger's IndexedDB back: 18/18 checks pass (session_start→send→answer→exclude johnson→regenerate{traps_removed:[johnson]}→calibrate smith{down}→session_end), seq unique+contiguous (no drops), all events carry both clocks, no JS errors. (Electron disk-write path is syntax-checked; renderer path is identical — smoke-test the packaged app on the Mac before the real sessions, running the **production** build so React StrictMode doesn't double-fire effects.)
- Keep `verifai-logs/` out of git; obtain separable screen/audio-recording consent.
