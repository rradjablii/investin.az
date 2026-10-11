# Frontend design system

Implemented from `frontend-prompt.md`: pale, low-saturation neutrals, one muted green accent, the map as the main surface.
All tokens live in `frontend/src/app/globals.css` (`@theme`); components use the token class names (`bg-surface`, `text-ink-2`,
`border-line`, `bg-accent`, …) rather than raw colours.

| Token | Value | Use |
|---|---|---|
| `bg` / `surface` / `surface-2` / `hover` | `#F7F8FA` / `#FFFFFF` / `#F1F3F5` / `#ECEFF2` | page, panels, quiet fills, hover |
| `ink` / `ink-2` / `ink-3` | `#20242A` / `#4B535E` / `#69717D` | text, secondary, muted |
| `line` / `line-2` | `#E5E8EC` / `#D9DEE5` | borders, stronger separators |
| `accent` / `accent-hover` / `accent-soft` | `#526C63` / `#43594F` / `#EDF2EF` | primary actions, selected states |
| semantic | success `#EDF2EF`, warn `#F7F0E1`, danger `#A03A33`/`#F8ECEB`, info `#EDF1F5` | status (always with text) |

**Deliberate deviation:** the brief's muted text `#858D98` is only ≈3.4:1 on white (fails WCAG AA for small text), so secondary and
muted text use `#4B535E` (≈7.6:1) and `#69717D` (≈4.9:1). Axe contrast checks pass on all scanned views.

Typography: Inter (already in use) with a system fallback; body 16px, dense UI/body copy 15px (`text-body`), labels 14px, metadata
13px; tabular numerals globally; titles 28–32px semibold. Radii: 8 / 10 / 12 / 16 / 18px. Shadow: one soft `shadow-float`, only on
floating layers (map controls, preview, dialogs). Transitions ≈160ms; `prefers-reduced-motion` disables them. Icons: Lucide only.

## Map
Light provider style (OpenFreeMap Positron) softened at runtime (water, land, parks, buildings; each tweak guarded so other style
URLs still work). Markers: white price pills with a thin border; hover = pale grey fill; selected = accent fill; clusters = neutral
white circles with a count; stacked listings fan out on a small ring. Selected and hovered markers use their own un-clustered sources.

## Layout
`/explore`: toolbar (search, filters, active-filter chips) above a map (≈68% at 1440px) and a results panel (460px ≥1280, 420px ≥1024,
340–380px tablet). Desktop can collapse the panel ("Hide results"). Mobile: full-screen map with a segmented Map/List switch and a bottom
preview. Map controls: zoom, reset to Baku.
