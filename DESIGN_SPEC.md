# VerifAI Desktop — Design Specification

**Version:** 1.0 · **Last updated:** 2026-04-19
**Scope:** Token definitions, scales, and usage rules for the VerifAI Desktop prototype (React + Vite, Tauri target).

This document is the **single source of truth**. Any new component or page must pick values from these scales, never invent new ones.

---

## 1. Foundations

### 1.1 Base

| Property | Value | Rationale |
|---|---|---|
| Root `font-size` | `100%` (= 16px) | Web standard. Honors user browser accessibility setting. |
| `1rem` | `16px` (unless user overrides) | Baseline for every rem computation below. |
| Box model | `box-sizing: border-box` (global) | Predictable width math. |
| Color scheme | `dark` by default, `light` via `[data-theme="light"]` | Dark is the primary surface. |

**Rule:** Never hardcode `font-size` on the `html` element again. If a "larger UI" mode is needed, introduce a class that scales `--fs-*` tokens — not the root.

### 1.2 Unit policy

| Context | Unit | Why |
|---|---|---|
| Typography (`font-size`) | `rem` via token | Scales with user setting. |
| Spacing (`padding`, `margin`, `gap`) | `rem` via token | Consistent visual rhythm, scales with typography. |
| Border radius | `rem` via token | Corner proportions scale with content. |
| Line height | unitless (1.2, 1.5, 1.65) | Multiplier on current font-size, doesn't cascade oddly. |
| Icon sizing | `em` (inline w/ text) or `rem` token (standalone) | Inline icons track parent text; standalone icons snap to scale. |
| Border width | `px` (1, 2) | Hairline borders carry physical-pixel meaning. Keep sharp. |
| Shadow offsets/blur | `px` | Visual effect, not scale-driven. |
| SVG `viewBox` / path coords | unitless numbers | Internal coordinate system, not a CSS length. |

---

## 2. Typography

### 2.1 Font families

```css
--font-sans:  'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-serif: 'DM Serif Display', Georgia, serif;
--font-mono:  'Fira Code', 'SF Mono', ui-monospace, monospace;
--font-ui:    'Inter', var(--font-sans);
```

**When to use which:**
- `--font-ui` (Inter) — default for all body text, labels, buttons.
- `--font-serif` — page titles, section headers that carry editorial weight (chat head title, modal title, paper title).
- `--font-mono` — numeric scores, DOIs, slider deltas, eyebrow data labels where tabular alignment matters.
- `--font-sans` — fallback; rarely used directly.

### 2.2 Type scale (10 sizes)

| Token | rem | px (16 base) | Primary use |
|---|---|---|---|
| `--fs-eyebrow` | `0.6875rem` | 11 | UPPERCASE labels with letter-spacing (section eyebrows, stat labels) |
| `--fs-xs` | `0.75rem` | 12 | Caption, meta text, timestamp, small hint |
| `--fs-sm` | `0.8125rem` | 13 | Secondary body, chip text, tab count, reason pill |
| `--fs-md` | `0.875rem` | 14 | **Body default**, list items, button text, input text |
| `--fs-lg` | `1rem` | 16 | Emphasized body, card title, message body |
| `--fs-xl` | `1.125rem` | 18 | Section heading (sources head, group eyebrow) |
| `--fs-2xl` | `1.25rem` | 20 | Panel title (calibration panel title, large UI headings) |
| `--fs-3xl` | `1.375rem` | 22 | Modal title, stat number display |
| `--fs-4xl` | `1.75rem` | 28 | Paper display title (reader) |
| `--fs-5xl` | `2rem` | 32 | Score display (calibration big number) |

**Rule:** Pick the closest token. Never use an in-between value.

### 2.3 Font weights (3 only)

| Token | Value | Use |
|---|---|---|
| `--fw-regular` | 400 | Body copy. |
| `--fw-medium` | 500 | UI labels, button text, emphasis within body. |
| `--fw-bold` | 700 | Titles, strong emphasis, numbers. |

300 (light) and 600 (semibold) are banned — they fragment hierarchy and don't ship well in all weights across our font stack.

### 2.4 Line heights

| Token | Value | Use |
|---|---|---|
| `--lh-tight` | 1.2 | Headings, display numbers, short buttons. |
| `--lh-normal` | 1.5 | Body, most UI text. |
| `--lh-relaxed` | 1.65 | Long-form reading (paper body, chat AI responses). |

### 2.5 Letter spacing

Use sparingly. Only allowed values:

| Context | Value |
|---|---|
| UPPERCASE eyebrow labels | `letter-spacing: 0.08em` (≈1.3 tracking) |
| Large display titles | `letter-spacing: -0.01em` |
| Everything else | `normal` (default) |

---

## 3. Spacing

### 3.1 Space scale (4px grid, 9 steps + zero)

| Token | rem | px | Typical use |
|---|---|---|---|
| `--sp-0` | `0` | 0 | Reset |
| `--sp-1` | `0.25rem` | 4 | Hairline gap, icon inline with text |
| `--sp-2` | `0.5rem` | 8 | Tight gap inside chips, button icon-label |
| `--sp-3` | `0.75rem` | 12 | Standard gap in rows, card body spacing |
| `--sp-4` | `1rem` | 16 | Card padding, section gap |
| `--sp-5` | `1.25rem` | 20 | Roomy card padding |
| `--sp-6` | `1.5rem` | 24 | Panel padding, major section gap |
| `--sp-8` | `2rem` | 32 | Page padding, scroll container padding |
| `--sp-10` | `2.5rem` | 40 | Large section separator |
| `--sp-12` | `3rem` | 48 | Top-level page gutters |

**Rule:** All `padding`, `margin`, `gap` must use these tokens. Composite padding is fine: `padding: var(--sp-3) var(--sp-4)` — but each axis must be a token value.

**Auto-centering:** `margin: 0 auto` stays as-is (not a scale value).

### 3.2 Layout dimensions (structural, not repeatable)

Kept as-is (not scale tokens, these are one-off layout rules):

| Token | Value | Use |
|---|---|---|
| `--sidebar-w` | `264px` | History sidebar expanded |
| `--sidebar-w-narrow` | `72px` | History sidebar collapsed |
| `--source-w` | `380px` | Source pane slide-in |
| `--source-w-wide` | `440px` | Source pane 3-pane |
| `--source-w-full` | `520px` | Source pane split |
| `--chrome-h` | `52px` | (reserved for future chrome) |

These stay `px` because they're physical layout anchors tuned to specific screen real estate, not typographic rhythm.

---

## 4. Radii

| Token | rem | px | Use |
|---|---|---|---|
| `--r-1` | `0.25rem` | 4 | Pills' small inner radius, micro chips |
| `--r-2` | `0.5rem` | 8 | Buttons, input fields, compact cards |
| `--r-3` | `0.75rem` | 12 | Source cards, info boxes |
| `--r-4` | `1rem` | 16 | Modals, chat bubbles, large panels |
| `--r-5` | `1.25rem` | 20 | (reserved) |
| `--r-pill` | `999px` | — | Full-round (verdict pills, avatars) |

---

## 5. Icons

### 5.1 Sizing

| Token / class | Value | Use |
|---|---|---|
| `--ic-xs` | `0.75rem` (12) | Inside chips, tiny inline glyphs |
| `--ic-sm` | `0.875rem` (14) | Inside buttons, list rows |
| `--ic-md` | `1rem` (16) | Toolbar icons, standalone nav |
| `--ic-lg` | `1.25rem` (20) | Hero/emphasis icons |
| `.icon-inline` | `width: 1em; height: 1em` | Icon that must track parent text size |

### 5.2 JSX convention

```jsx
{/* Inline w/ text — track text size */}
<svg className="icon-inline" viewBox="0 0 24 24" …/>

{/* Standalone — scale token */}
<svg style={{ width: 'var(--ic-md)', height: 'var(--ic-md)' }} viewBox="0 0 24 24" …/>
```

**Rule:** Never set `width="14"` on an SVG element as a literal pixel attribute. Use CSS.

### 5.3 `viewBox` and stroke-width

These stay unitless numbers. They describe the SVG coordinate system, not CSS lengths.

```jsx
<svg viewBox="0 0 24 24" stroke-width="2" …>
```

---

## 6. Colors

**Unchanged.** The color system in `tokens.css` (`--bg-*`, `--ink-*`, `--trusted/mostly/low`, `--accent`, washes, hairlines) is already well-structured and used consistently. Any future color additions must go in that block with a clear semantic name — never hardcode a hex inline.

---

## 7. Shadows

| Token | Value | Use |
|---|---|---|
| `--sh-1` | `0 1px 2px rgba(0,0,0,0.24)` | Low elevation (button press) |
| `--sh-2` | `0 8px 24px rgba(0,0,0,0.28)` | Cards, dropdowns |
| `--sh-3` | `0 24px 60px rgba(0,0,0,0.45)` | Modals, high-elevation overlays |

Offset and blur values stay in `px` — shadows are a pure visual effect and shouldn't scale with content.

---

## 8. Animation

### 8.1 Durations

| Token / convention | Value | Use |
|---|---|---|
| Fast | `140ms` | Hover state, cite tip reveal |
| Medium | `200ms`–`260ms` | Modal enter, source workspace fade-in |
| Slow | `300ms+` | Full screen transitions (reserved) |

### 8.2 Easings

| Name | Value | Use |
|---|---|---|
| Ease-out spring | `cubic-bezier(0.22, 1, 0.36, 1)` | Modal/overlay entry (feels natural) |
| Ease-out soft | `cubic-bezier(0.2, 0.8, 0.3, 1)` | Card hover, chip reveal |
| Linear | `linear` | Slider thumb tracking |

---

## 9. Usage rules

### 9.1 When writing new CSS

1. **Start with tokens.** If a new component doesn't fit an existing token, don't invent a value — stop and either pick the nearest token, or propose a new token in this doc (and get it merged before committing).
2. **No raw px for text/spacing.** The linter / reviewer rejects them.
3. **Composite values are fine**: `padding: var(--sp-3) var(--sp-4)`.
4. **Document "physical" px exceptions inline**:
   ```css
   .hairline { border-top: 1px solid var(--line); } /* 1px intentional */
   ```

### 9.2 When writing new JSX

1. Never put raw `width="N" height="N"` on an SVG. Use `className="icon-inline"` or an explicit `style={{ width: 'var(--ic-*)' }}`.
2. Inline `style` overrides are allowed only for:
   - Dynamic values (computed left/top for floating tips, computed percentages)
   - One-off layout tweaks that don't justify a class
3. No inline `fontSize: 12` or `padding: 10`. Use className on the element and define styling in the corresponding CSS file.

---

## 10. Migration map — old px → new token

This is the reference used when refactoring existing CSS.

### 10.1 Font size

| Old (px) | New (rem / token) |
|---|---|
| 8, 8.5, 9 | `--fs-eyebrow` (0.6875rem) — only if uppercase w/ letter-spacing, else bump to xs |
| 10, 10.5, 11 | `--fs-xs` (0.75rem) |
| 11.5, 12 | `--fs-xs` (0.75rem) |
| 12.5, 13 | `--fs-sm` (0.8125rem) |
| 13.5, 14 | `--fs-md` (0.875rem) |
| 15, 16 | `--fs-lg` (1rem) |
| 17, 18 | `--fs-xl` (1.125rem) |
| 19, 20 | `--fs-2xl` (1.25rem) |
| 22 | `--fs-3xl` (1.375rem) |
| 28 | `--fs-4xl` (1.75rem) |
| 32 | `--fs-5xl` (2rem) |

### 10.2 Space (padding / gap / margin)

| Old (px) | New (rem / token) |
|---|---|
| 2, 3 | `--sp-1` (0.25rem) |
| 4, 5 | `--sp-1` (0.25rem) |
| 6, 7 | `--sp-2` (0.5rem) |
| 8, 9 | `--sp-2` (0.5rem) |
| 10, 11 | `--sp-3` (0.75rem) |
| 12, 13 | `--sp-3` (0.75rem) |
| 14, 15 | `--sp-4` (1rem) |
| 16, 17 | `--sp-4` (1rem) |
| 18, 19 | `--sp-5` (1.25rem) |
| 20, 21 | `--sp-5` (1.25rem) |
| 22, 23, 24 | `--sp-6` (1.5rem) |
| 28, 32 | `--sp-8` (2rem) |
| 40 | `--sp-10` (2.5rem) |
| 48 | `--sp-12` (3rem) |
| 60, 64 | `--sp-16` or custom layout value |

### 10.3 Radius

| Old (px) | New |
|---|---|
| 3, 4 | `--r-1` |
| 6, 8 | `--r-2` |
| 10, 12 | `--r-3` |
| 14, 16 | `--r-4` |
| 20 | `--r-5` |
| 999 | `--r-pill` |

### 10.4 Icons in JSX (`width="N"`)

| Old | New |
|---|---|
| `width="10" height="10"` | `className="icon-inline"` and size via parent text, **or** `style={{ width: 'var(--ic-xs)' }}` |
| `width="12" height="12"` | `var(--ic-xs)` |
| `width="14" height="14"` | `var(--ic-sm)` |
| `width="16" height="16"` | `var(--ic-md)` |
| `width="18"+ height="18"+` | `var(--ic-lg)` |

---

## 11. Rounding policy

When an existing value falls between two tokens, round **toward the larger** to boost the current "text looks too small" bias. Exceptions:

- Eyebrow labels: always snap down to `--fs-eyebrow` (11px) — these are supposed to be quiet.
- Meta text in dense lists: snap down to `--fs-xs` (12px) — avoid dominating the row.

---

## 12. Reviewer checklist

Before merging any change touching CSS or JSX:

- [ ] No `font-size: \d+px` literal (except inside `viewBox`, borders, or shadows).
- [ ] No `padding:` / `gap:` / `margin:` literal px except `1px`.
- [ ] No `<svg width="N" height="N">` literal. Uses `className` or `var(--ic-*)`.
- [ ] New component uses existing tokens or adds a new one documented here.
- [ ] If root scaling affects layout, verify at 100% and 150% browser zoom.

---

## 13. Appendix — theme overrides

Light theme (`[data-theme="light"]`) changes colors only. It must not redefine `--fs-*`, `--sp-*`, or other scale tokens. Hierarchy stays identical across themes.
