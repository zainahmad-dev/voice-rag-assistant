# Phase 8 Output — Design Tokens ("Reading Room")

Final token values for the approved reading-room dashboard mockup. These are implementation-ready for Phase 9 (global CSS + font loading).

## Color tokens

### Light mode

| Token | Hex | Usage |
|---|---|---|
| `--color-background` | `#FAF6EE` | App background (warm bone-white) |
| `--color-surface` | `#FFFFFF` | Cards, panels, modals |
| `--color-surface-raised` | `#FDFBF6` | Elevated surfaces (sticky headers, popovers) |
| `--color-border` | `#E6DFD0` | Dividers, input borders |
| `--color-foreground` | `#16211F` | Primary text (deep ink) |
| `--color-foreground-muted` | `#6E6659` | Secondary text, captions |
| `--color-accent` | `#0E3B3C` | Deep ink-teal — primary actions, active states |
| `--color-accent-hover` | `#0A2C2D` | Ink-teal hover/pressed |
| `--color-accent-subtle` | `#DEEAE9` | Ink-teal tint — selected rows, focus rings |
| `--color-secondary` | `#B08A4E` | Muted gold — secondary accent, highlights |
| `--color-secondary-hover` | `#96733D` | Gold hover/pressed |
| `--color-secondary-subtle` | `#F1E6D3` | Gold tint — badges, subtle emphasis |
| `--color-danger` | `#A1423B` | Errors, destructive actions |

### Dark mode

| Token | Hex | Usage |
|---|---|---|
| `--color-background` | `#0D1817` | App background (deep ink-teal, near-black) |
| `--color-surface` | `#132422` | Cards, panels, modals |
| `--color-surface-raised` | `#1B302D` | Elevated surfaces |
| `--color-border` | `#243936` | Dividers, input borders |
| `--color-foreground` | `#F3EEE2` | Primary text (warm bone) |
| `--color-foreground-muted` | `#9CA39B` | Secondary text, captions |
| `--color-accent` | `#4FB8B4` | Ink-teal, brightened for contrast on dark |
| `--color-accent-hover` | `#6ECAC6` | Ink-teal hover/pressed |
| `--color-accent-subtle` | `#1D3634` | Ink-teal tint — selected rows, focus rings |
| `--color-secondary` | `#D9AE68` | Muted gold, brightened for dark surfaces |
| `--color-secondary-hover` | `#E6C286` | Gold hover/pressed |
| `--color-secondary-subtle` | `#332A19` | Gold tint — badges, subtle emphasis |
| `--color-danger` | `#D9756C` | Errors, destructive actions |

## Font roles

| Token | Family | Role |
|---|---|---|
| `--font-display` | Space Grotesk | Headings, page titles, orb status label |
| `--font-body` | Inter | Body copy, UI labels, buttons, chat messages |
| `--font-mono` | JetBrains Mono | Transcripts, source citations, code/data snippets |

## Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Inputs, chips, small buttons |
| `--radius-md` | `12px` | Cards, panels, buttons |
| `--radius-lg` | `20px` | Modals, large containers |
| `--radius-full` | `9999px` | Listening orb, avatars, pill toggles |

## Animation timing

| Token | Value | Usage |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default easing for enter/exit transitions |
| `--duration-fast` | `150ms` | Hover/press micro-interactions |
| `--duration-base` | `240ms` | Panel/modal enter, theme toggle crossfade |
| `--duration-slow` | `400ms` | Route/page transitions |
| `--orb-pulse-duration` | `1.8s` | Listening orb pulse cycle (`ease-in-out infinite alternate`) |
| `--orb-pulse-scale` | `1 → 1.08` | Orb scale range while listening |
| `--orb-pulse-opacity` | `0.7 → 1` | Orb opacity range while listening |

**Reduced motion:** when `prefers-reduced-motion: reduce` is set, the orb pulse drops the scale animation entirely and keeps only the opacity crossfade (`0.85 → 1`, same `1.8s ease-in-out infinite alternate`), and all `--duration-*` transitions collapse to `1ms`.
