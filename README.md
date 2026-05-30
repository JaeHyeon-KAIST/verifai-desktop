# VerifAI — Desktop Prototype

A prototype that surfaces **per-claim source verification** for AI-generated
answers, built for an HCI user test (KAIST CS374, team *TaskMates*). The goal
is to evaluate whether the design **increases user trust** in AI answers — it is
intentionally *not* a functional product (the LLM and trust scoring are mocked
with fixed data).

> **One codebase, two ways to run it.** The exact same React/Vite source runs
> as a native **desktop app** (Electron, packaged to `.dmg`/`.exe`) and as a
> **web app** on GitHub Pages. Participants on the web get the same UI and the
> same flow as the desktop build; the only difference is the native window
> chrome (custom title bar), which is irrelevant to the test.

## Live site

After the first Pages deploy finishes:
**https://jaehyeon-kaist.github.io/verifai-desktop/**

## What it demonstrates

- **Answer with verifiable claims** — each highlighted phrase is a *claim*
  backed by multiple sources, each rated 🟢 Trusted / 🟡 Mostly / 🔴 Low.
- **Verification panel** — filter sources by trust, one-click "Exclude all
  low-trust", and multi-select bulk exclude, all from the main screen.
- **Self-correcting answer** — excluding or recalibrating sources triggers an
  automatic "Regenerating…" and a revised answer (the `↻` glyph marks revised
  phrases).
- **Source detail workspace** — paper reader, community score, divergence.

## Run locally

```bash
npm install

# Web (browser) — same thing GitHub Pages serves
npm run dev            # http://localhost:5173
npm run build && npm run preview   # production build

# Desktop (Electron)
npm run electron:dev
npm run electron:build:mac   # or :win / :all  -> release/
```

## Documentation

- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — the design "promises": token
  palette, typography, and the lecture-grounded rules every screen follows.
- [`docs/WORKLOG.md`](docs/WORKLOG.md) — what changed for the user-test redesign,
  and why.
- [`DESIGN_SPEC.md`](DESIGN_SPEC.md) — original component/spec reference.

## Swapping the mocked answer

The regenerated answer is fixed dummy data. To change it, edit
`VERIFAI_DATA.answerV2` in [`src/data.js`](src/data.js) — `answerV1` is the
initial answer, `answerV2` is shown after the user excludes/recalibrates sources.
