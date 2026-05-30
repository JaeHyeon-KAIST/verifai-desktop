# VerifAI Design System — the "promises"

This is the design contract for the VerifAI prototype: the palette, the type
scale, and the rules every screen follows. It is grounded in the CS374 **W10
lecture** on visual design (readability, contrast, color, typography, layout).

**The one rule that makes the rest work:** every color, font size, space, and
radius is a **CSS custom property defined once** in
[`src/styles/tokens.css`](../src/styles/tokens.css). Components never hardcode a
hex value or a pixel size — they reference a token. Change a token in one place
and it cascades everywhere. This is what lets us re-skin or re-tune the whole app
from a single file.

> Dark is the default theme (`:root`). A light theme exists only for the `?lab`
> dev tool and is not used in the product.

---

## 1. Color

### Principles (W10)
- **Use few colors.** One neutral surface ramp + one accent + a 3-color trust set.
- **Denotative color.** Color *means* something: the trust trio is the **only**
  semantic color. Green = trust, amber = caution, red = risk.
- **60-30-10.** ~60% neutral surfaces, ~30% text/structure, ~10% accent.
- **WCAG AA.** Body text ≥ 4.5:1, large/secondary ≥ 3:1 against its surface.

### Surfaces — Linear-dark, subtle cool/indigo undertone
| Token | Value | Use |
|---|---|---|
| `--bg-0` | `#08090f` | app canvas (deepest) |
| `--bg-1` | `#0b0d14` | sidebar / rails |
| `--bg-2` | `#0e1016` | chat surface |
| `--bg-3` | `#171a24` | raised cards |
| `--bg-4` | `#20242f` | hover / pressed |
| `--bg-user` | `#1e2240` | user chat bubble (indigo-tinted) |
| `--surface-raise` | `rgba(255,255,255,0.035)` | translucent lift on dark |

### Text — contrast measured on `--bg-2` (#0e1016)
| Token | Value | Contrast | Use |
|---|---|---|---|
| `--ink-1` | `#e6e6e8` | ~15.3:1 | primary text |
| `--ink-2` | `#c8cad0` | high | secondary |
| `--ink-3` | `#8a8f98` | ~5.85:1 | tertiary / meta |
| `--ink-4` | `#82858e` | ~5.16:1 | faint labels |
| `--ink-5` | `#44464d` | — | disabled / hairline |

### Accent — single indigo (Linear signature)
| Token | Value | Use |
|---|---|---|
| `--accent` | `#7c8af0` | links, icons, focus, the **revised `↻`** marker (~6.1:1) |
| `--accent-strong` | `#5e6ad2` | primary button fill (white text = 4.7:1) |
| `--accent-hover` | `#6e79e0` | button hover |
| `--accent-ink` | `#ffffff` | text/glyph on accent |
| `--accent-dim` | `color-mix(accent-strong 18%)` | active/selected surface |
| `--accent-line` | `color-mix(accent 40%)` | accent border |

### Trust verdicts — the ONLY semantic colors
| Token | Value | Meaning | Contrast |
|---|---|---|---|
| `--trusted` | `#4ece92` | 🟢 Trusted | ~9.6:1 |
| `--mostly` | `#e8b056` | 🟡 Mostly Trusted | ~9.8:1 |
| `--low` | `#ec6167` | 🔴 Low Trust | ~5.9:1 |

Tints are **derived** from the base tokens with `color-mix`, so they auto-track
any change to the base color:
- `--{trusted,mostly,low}-wash` = base @ 14% (card/row backgrounds)
- `--{trusted,mostly,low}-hl` = base @ 18% (highlight fills)

Aliases for components that reference them: `--verdict-{trusted,mostly,low}`.
Community **score bands** reuse the trio as `--score-{high,mid,low}` — same hues,
but here the color encodes a *score band*, not an AI verdict (both are
redundantly coded with a number, per W10 "don't rely on color alone").

### Trust color vs "revised" — kept separate on purpose
A claim's highlight underline carries its **verdict color**. When the answer
regenerates, revised phrases get a small **indigo `↻` badge** — *not* the verdict
color and *not* a `✓`. Rationale: "this wording changed" is orthogonal to trust;
a verdict-colored check read as a contradictory "verified" stamp (e.g. a red
circle + ✓ on a low-trust claim). Indigo `↻` = a neutral system action.

---

## 2. Typography

### Principles (W10)
- **Serif for reading, sans for UI.** Don't mix two fonts of the same category.
- **Hierarchy by size + weight**, not by switching font families.
- 2-3 families max, each with a distinct job.

### Families
| Token | Stack | Job |
|---|---|---|
| `--font-sans` / `--font-ui` | Inter, system-ui, … | **all UI** |
| `--font-serif` | Georgia, Iowan Old Style, … | **paper reader ONLY** (long-form reading) |
| `--font-mono` | Fira Code, … | numbers, DOIs, deltas |

### Type scale
| Token | Size | Use |
|---|---|---|
| `--fs-eyebrow` | 11px | UPPERCASE tracked labels |
| `--fs-xs` | 12px | fine print |
| `--fs-sm` | 13px | dense UI |
| `--fs-md` | **15px** | body (bumped from 14 for readability) |
| `--fs-lg` | 17px | emphasis |
| `--fs-xl` | 22px | section titles |
| `--fs-2xl` | 28px | page title |

Weights: `--fw-regular` 400, `--fw-medium` 500, `--fw-bold` 700.

---

## 3. Spacing, radius, effects

- **Spacing** (`--sp-1`…`--sp-7`): 4 / 8 / 12 / 16 / 24 / 32 / 48 px.
- **Radius** (`--r-1`…`--r-3`, `--r-pill`): 4 / 8 / 12 px, 999px pill.
  Cards share `--r-3` (12px) for one consistent card language.
- **Shadows** (`--shadow-1..3`) and `--ring` (focus ring, accent @ 35%).

---

## 4. Component conventions

- **Verdict pill** — icon + label + verdict color; never color-only.
- **Donut score** — ring colored by score band + the number in mono/tabular;
  redundant coding (color + number).
- **Claim highlight** — faint verdict wash + a 2px solid verdict underline (color
  set via the `--hl-c` per-verdict variable). Revised phrases add the indigo `↻`.
- **Cards** — `--bg-3` surface, `--r-3` radius, hairline border; excluded state
  dims + desaturates the paper and swaps the action to an in-place **Restore**
  (zero mouse travel — Fitts/GOMS).

---

## 5. Layout principles applied (W10)

- **Fitts's Law / GOMS** — destructive/undo actions appear *in place* so the
  cursor doesn't travel; bulk actions sit next to their trigger ("Done"),
  not in a far-away bar.
- **CRAP** — Contrast (size/weight hierarchy), Repetition (one card language,
  shared tokens), Alignment (consistent grid/padding), Proximity (sources grouped
  under their claim).
- **Readability > legibility** — 15px body, serif reader, generous line spacing.

---

*Single source of truth: [`src/styles/tokens.css`](../src/styles/tokens.css).
When in doubt, add/adjust a token there — never hardcode in a component.*
