# RichTextEditor — Accessibility Conformance Self-Assessment (WCAG 2.2 AA)

**Status:** Interim vendor self-assessment · **Date:** 2026-06-07 · **Version assessed:** 2.3
**Standard:** WCAG 2.2 Level AA (the basis for EN 301 549, Section 508, and most VPAT® templates)

> **This is a self-assessment, not a third-party audit or a published VPAT.** It records
> what the vendor has tested directly and, honestly, what has not yet been formally
> evaluated. A conformant VPAT requires an independent audit including assistive-technology
> testing (NVDA, JAWS, VoiceOver) — see *Path to a published VPAT* at the end. Do not
> represent this document as a completed VPAT or a conformance certification.

## How to read the ratings
- **Supports** — verified to meet the criterion in direct testing.
- **Partially supports** — meets it in the cases tested; full coverage not yet verified.
- **Needs audit** — not yet formally evaluated; no claim made either way.
- **N/A** — not applicable to an embeddable editor component.

## Summary of what changed in 2.3 (this assessment's deltas)
The `a11yenhance.js` plugin (on by default in 2.3) was added specifically to close the
first findings any auditor raises for an iframe-based editor. Verified in-browser:

| Issue (pre-2.3) | WCAG SC | Status now |
|---|---|---|
| Editing iframe had no `title` | 2.4.1, 4.1.2 | **Fixed** — iframe `title` set (configurable) |
| Editing region had no accessible name/role | 4.1.2 | **Fixed** — `role="textbox"` + `aria-multiline="true"` + `aria-label` |
| Editing document had no `lang` | 3.1.1, 3.1.2 | **Fixed** — `lang` set from `config.contentLang` / host `<html lang>` |
| Decorative transitions ignored motion prefs | 2.3.3 | **Fixed (2.3)** — `prefers-reduced-motion` honored for focus-dim & fold chevron |

## Criterion-level self-assessment (key AA criteria for an editor)

| WCAG 2.2 SC | Level | Rating | Evidence / notes |
|---|---|---|---|
| 1.1.1 Non-text Content | A | Partially supports | Image insert supports alt text; built-in **accessibility checker** flags missing alt. Full coverage of all media types needs audit. |
| 1.3.1 Info & Relationships | A | Partially supports | Semantic block output (h1–h6, lists, tables, blockquote); editing region exposes `role=textbox`. Table-header semantics flagged by the checker. |
| 1.4.3 Contrast (Minimum) | AA | Partially supports | Programmatic sweep run 2026-06-07: one failure found and **fixed** — status-bar text counter was `#999999` (2.85:1) → now `#6e6e6e` (5.2:1). Sampled inline-SVG icons pass 3:1. Sprite/background-image icons and dialog interiors still need pixel-level tooling (axe DevTools) for a complete sweep. |
| 1.4.11 Non-text Contrast | AA | Needs audit | Toolbar icon/affordance contrast not yet measured. |
| 2.1.1 Keyboard | A | **Supports** (toolbar) / Partially (dialogs) | Verified 2026-06-07: **72/72 toolbar buttons** expose `role="button"` + an accessible name (e.g. "Bold (Ctrl+B)"); **66/72 are keyboard-focusable** (`tabindex="0"`), the rest are split/dropdown *group* containers whose children take focus. Editor reachable + editable by keyboard; 23 documented shortcuts. Note: toolbar uses a flat tab order (each button in tab sequence) rather than the roving-tabindex/arrow-key toolbar pattern — operable but verbose; an enhancement, not a failure. |
| 2.1.2 No Keyboard Trap | A | **Supports** | Verified: opening the Insert-Link dialog moves focus into it; **Esc closes it and returns focus to the editing area**. No trap observed. (Full sweep of every dialog still recommended.) |
| 2.4.1 Bypass Blocks | A | **Supports** | Editing iframe now carries a `title` (frame landmark name). |
| 2.4.3 Focus Order | A | Needs audit | Not yet verified across all dialogs. |
| 2.4.7 Focus Visible | AA | **Needs real-keyboard audit** | Investigated 2026-06-07: AI-panel controls have `:focus-visible` rings, but the **core toolbar buttons don't enter native `:focus`** via scripting (the editor uses custom focus management — buttons expose `tabindex`/`role` for AT but `.focus()` doesn't put them in the `:focus` state). So focus-indicator visibility can't be confirmed *or* fixed with a CSS rule from scripting alone — it requires a **real keyboard Tab-through with visual observation**. If that pass shows no ring, the fix is a verified `:focus-visible` rule on `rte-toolbar-button` (a non-pseudo rule was confirmed to render on these elements). |
| 2.4.11 Focus Not Obscured (Min) | AA (2.2) | Needs audit | New 2.2 criterion; sticky-toolbar/panel overlap not yet evaluated. |
| 2.5.8 Target Size (Minimum) | AA (2.2) | Partially supports | Mobile toolbar mode targets 44×44; desktop densities need measurement. |
| 3.1.1 Language of Page | A | **Supports** | Editing document `lang` set. |
| 3.3.2 Labels or Instructions | A | Partially supports | Dialog fields labelled; full inventory needs audit. |
| 4.1.2 Name, Role, Value | A | **Supports (editing region)** / Partially (controls) | Editing region named + roled; sampled toolbar buttons have accessible names (aria-label/title). Full control inventory needs audit. |

## Verified-good (direct testing, 2026-06-07)
- Toolbar container exposes `role="toolbar"`.
- Sampled toolbar controls: **0 without an accessible name**, **0 not keyboard-focusable**.
- Editing region: `role="textbox"`, `aria-multiline="true"`, `aria-label` present and **persisting across document remounts** (`setHTMLCode`).
- Editing document `lang` present.
- A built-in **Accessibility Checker** plugin audits heading structure, image alt text, and table headers inside the editor and offers click-to-fix.

## Honest open items (the remediation backlog → in priority order)
1. **Color-contrast measurement** (1.4.3 / 1.4.11) across the default skin in all states — the single most common AA failure. *Partly done:* programmatic text sweep run (one failure fixed); sprite-icon/dialog pixel contrast still pending.
2. **Dialog/popup semantics (4.1.2 / 1.3.1 / 3.3.2)** — **FIXED 2026-06-07** via `dialoga11y.js`: dialog popups now get `role="dialog"` + an accessible name from their header ("Insert Link", "Insert Table"), and fields are labelled from their `rte-dialog-line-*` wrapper (URL→"URL", etc.); natively-labelled fields are preserved and plain dropdowns are left alone. Focus-in and Esc-to-close already worked. *Remaining:* sweep the less-common dialogs (gallery, equation, etc.) to confirm coverage.
3. **Remaining keyboard/focus items** — focus-visible measurement (2.4.7), full dialog sweep, and optionally a roving-tabindex toolbar pattern (2.1.1 already met).
3. **Screen-reader testing** with NVDA + JAWS (Windows) and VoiceOver (macOS/iOS) — required for any credible 4.1.2 claim.
4. **WCAG 2.2 new criteria** (2.4.11 Focus Not Obscured, 2.5.8 Target Size, 3.3.7/3.3.8 if forms apply).
5. **Complete control inventory** — confirm accessible names on *all* toolbar/menu items, not just the sampled set.

## Path to a published VPAT
1. Complete items 1–5 above (vendor-side remediation).
2. Engage an independent accessibility auditor to test against WCAG 2.2 AA with AT.
3. Publish the resulting **VPAT 2.5 (WCAG/Section 508/EN 301 549)** and a plain-language
   **Accessibility Statement** on the product site.

Until then, the honest public claim is: *"WCAG 2.2 AA self-assessment available; in-editor
accessibility checker included; formal VPAT in progress."* — not "WCAG 2.2 AA conformant."
