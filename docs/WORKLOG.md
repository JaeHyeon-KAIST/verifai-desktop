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
