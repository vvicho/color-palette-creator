# Color Palette Creator - Design Document

## Overview

`color-palette-creator` is a client-side React + TypeScript app for creating, organizing, and analyzing color palettes.

The app focuses on three workflows:

1. Build/import palettes from raw HEX values.
2. Evaluate contrast and readability combinations.
3. Generate palette-snapped harmony and cel-shading suggestions.

All primary data is stored in browser `localStorage`; there is no backend.

## Product Goals

- Let users quickly transform raw HEX text into a named palette workspace.
- Keep a reusable local library of palettes (built-in + user-created).
- Provide practical visual tools for:
  - export-ready palette strings and maps,
  - text/background contrast checks,
  - cel-shading and harmony exploration constrained to the current palette.

## Non-Goals (Current Scope)

- No account system or cloud sync.
- No collaborative editing.
- No server-side persistence.
- No palette version history/undo stack.

## Tech Stack

- Runtime: React 19
- Language: TypeScript
- Build tool: Vite
- Styling: Tailwind CSS utility classes
- Storage: browser `localStorage`
- External API: [The Color API](https://www.thecolorapi.com/) for color names (with local caching)

## App Architecture

## Top-Level Composition

`src/App.tsx` is the orchestration layer and owns the main state:

- Workspace input (`input`)
- Workspace colors (`colors`)
- Library (`savedPalettes`)
- Active palette pointer (`activePaletteId`)
- UI mode (`workspaceTab`)
- Sort mode (`sortMode`)
- Toast messages
- Contrast selections

UI is split into tab panels:

- `PaletteBuilderPanel`
- `ContrastLabPanel`
- `HarmonyAssistantPanel`

Global helpers:

- `PaletteLibraryDrawer` (palette load/delete UI)
- `WorkspaceTabBar`
- `useLocalStorage` hook

## Data Model

Defined in `src/types.ts`:

- `PaletteColor`
  - `hex: string` (normalized six-char uppercase, no `#`)
  - `name: string`
- `SavedPalette`
  - `id: string`
  - `name: string`
  - `colors: PaletteColor[]`
  - `sourceText?: string`
  - `lastUpdated: string` (ISO timestamp)
  - `builtIn?: boolean`

## Built-In Palettes

Built-ins are file-driven and loaded from `src/data/palettes/*.txt` via `import.meta.glob` in `src/data/defaultPalette.ts`.

Behavior:

- Every `.txt` file in that folder is loaded eagerly as raw text.
- Filename (without extension) becomes palette display name.
- Palette IDs are deterministic and path-derived (`built-in-...`).
- Text is parsed into normalized HEX values through `parseHexInput`.
- Color names are resolved from cache (`getCachedColorName`) or default to `#HEX`.
- Empty/invalid files are filtered out.
- Built-ins are sorted by file path for stable ordering.

`DEFAULT_BASE_PALETTE_ID` is currently the first palette ID from the sorted built-in list.

## Storage and Persistence

## localStorage Keys

- `spectrum-library` (`STORAGE_KEYS.library`)
- `spectrum-active-palette-id` (`STORAGE_KEYS.activePaletteId`)
- `spectrum-color-name-cache` (service-level color-name cache)

## Library Merge Strategy on Startup

On app startup, `App.tsx` normalizes `savedPalettes`:

1. Drops all previously stored `builtIn` palettes.
2. Prepends the current file-driven `BUILT_IN_PALETTES`.
3. Keeps all user palettes.

This guarantees built-ins always reflect palette files and prevents stale built-in entries from older app versions.

## Feature Set

## 1) Palette Builder

Primary panel for ingesting, sorting, saving, and exporting.

### Input Modes

- Manual bulk text input with syntax-highlighted overlay (`CodePaletteInput`).
- Multi-file import (`.txt`, plain text) using "Import Palette Files".

### Text Parsing Rules

Implemented by `parseHexInput` (`src/utils/hexParser.ts`):

- Supports with/without `#`.
- Accepts mixed delimiters (commas, semicolons, whitespace/new lines).
- Accepts 3-8 hex token lengths but normalizes to six-char uppercase:
  - 3-char values are expanded.
  - 6+ chars are truncated to first 6.
- Strips single-line comments starting with `//`.
- Deduplicates colors while preserving first occurrence order.

### Import Colors Flow (Workspace)

When "Import Colors" is clicked:

1. Parse current input text into unique HEX list.
2. Resolve names asynchronously through `fetchColorName`.
3. Set workspace `colors`.
4. Show toast feedback.

### Import Palette Files Flow (Library)

When one or more files are selected:

1. Read each file text.
2. Parse each file for HEX values.
3. Skip files with zero valid colors.
4. Resolve names for each palette color.
5. Create user palettes (`builtIn: false`) with:
   - name = file name (without extension),
   - source text = file body.
6. Prepend palettes to library.
7. Activate the first imported palette and open the library drawer.

### Sorting

Sort modes:

- None (import order)
- Hue
- Lightness
- Name (A-Z)

Hue sorting includes special neutral handling (`chroma < 0.04`) so grays are grouped and ordered by lightness.

### Save/Update Behavior

"Save Palette" writes the current workspace to library:

- If editing a built-in palette, save creates a new user palette (does not overwrite built-in).
- If editing an existing user palette, it updates in place.
- If no active palette, creates new.
- Name defaults to `Untitled Palette` when blank.

### Export Actions

- `Export String`: copies sorted display colors as `#HEX, #HEX, ...`.
- `Export PNG`: generates a compact swatch map in an offscreen canvas and triggers download using sanitized palette name.

### Color Cards

Each workspace swatch:

- Displays color name + hex.
- Click copies `#HEX` to clipboard.
- Uses luminance-based foreground text color for legibility.

## 2) Palette Library Drawer

The library drawer provides:

- Load palette into workspace.
- Delete user palettes.
- Built-ins are protected from deletion and labeled "Built-in".

Loading a palette sets:

- active palette id,
- workspace colors,
- input/source text.

## 3) Contrast Lab

Evaluates text/background combinations from the active display palette.

Capabilities:

- Select foreground/background by:
  - left-click (foreground),
  - right-click (background),
  - drag/drop onto explicit text/background targets.
- Live preview panel updates in real time.
- Ratio calculation uses WCAG relative luminance formula (`contrastRatioHex`).
- Badge categories:
  - AAA (`>= 7`)
  - AA (`>= 4.5`)
  - AA Large (`>= 3`)
  - Fail
- Additional practical messaging based on cel-edge thresholds:
  - strong (`>= 3`)
  - weak/usable (`2-3`)
  - very low (`< 2`)

## 4) Harmony Assistant

Generates palette-snapped ramps and harmonies from a selected base color.

### Core Algorithm

1. Start from selected base hex.
2. Apply HSV offsets for suggested shadow/light/highlight/complementary/analogous values.
3. Snap each suggestion to nearest color in the current master palette via RGB distance (`closestPaletteHex`).

### Ramp Modes

- 2-tone: shadow + base
- 3-tone: shadow + base + highlight
- 4-tone: shadow + base + light + highlight

### Overrides

User can select any ramp/harmony slot and override it with a palette swatch.

Key detail: overrides are preview-level in-memory state; they are not automatically written back to library unless user explicitly saves the palette.

### Sprite Preview

A small canvas preview renders quantized shading bands from the current ramp.

- Highlight size slider widens/shrinks highlight band.
- Shadow size slider widens/shrinks shadow band.
- Sliders alter preview appearance only; they do not mutate output HEX values.

## Name Resolution and Caching

`fetchColorName` (`src/services/colorApi.ts`) resolves names with this fallback chain:

1. Runtime cache (includes static JSON cache)
2. The Color API network request
3. Fallback to `#HEX` when unavailable/error

Resolved names are persisted in `spectrum-color-name-cache`.

## Error Handling and Edge Cases

- Invalid or empty text input -> toast + no workspace colors.
- File import with no parseable colors -> skipped file; if all invalid, user gets toast.
- API failures for name lookup do not break import; values fall back to `#HEX`.
- Built-ins cannot be deleted.
- Active palette pointer is auto-corrected to `DEFAULT_BASE_PALETTE_ID` when missing/invalid.

## UX and Interaction Notes

- A "How to use" panel exists in each major tab.
- Toasts are short-lived and used for success/error/status feedback.
- Library is a slide-over drawer toggled from header.
- Tabbed workspace keeps task areas separate while sharing the same active palette context.

## File/Module Map

- `src/App.tsx`: application state orchestration and workflows
- `src/components/tabs/PaletteBuilderPanel.tsx`: import/export/save workspace UI
- `src/components/tabs/ContrastLabPanel.tsx`: contrast analysis
- `src/components/tabs/HarmonyAssistantPanel.tsx`: harmony + shading assistant
- `src/components/PaletteLibraryDrawer.tsx`: palette library management UI
- `src/components/CodePaletteInput.tsx`: syntax-highlighted textarea overlay
- `src/data/defaultPalette.ts`: built-in palette loader (`src/data/palettes/*.txt`)
- `src/hooks/useLocalStorage.ts`: generic localStorage state hook
- `src/services/colorApi.ts`: color-name resolution and cache persistence
- `src/utils/hexParser.ts`: palette text parsing/normalization
- `src/utils/colorSort.ts`: workspace sort strategies
- `src/utils/colorSpace.ts`: contrast and color-space math
- `src/utils/harmonyPalette.ts`: snapping and HSV offset helpers

## Current Constraints and Future Opportunities

### Constraints

- localStorage limits can cap very large palette libraries.
- name lookups are serial per color list item batch (via `Promise.all` network fan-out), with no request throttling.
- no explicit migration/versioning for stored palette schema.

### Potential Enhancements

- Import/export full palette library as JSON.
- Palette tags, search, and grouping.
- Better conflict handling for duplicate user palette names.
- Worker/off-main-thread processing for very large palettes.
- Optional color-difference metrics (Delta E) for improved snapping.

## Design Amendment: Variant Placement

`Variant Creator` is currently implemented as an internal mode inside `Asset Validator`, not as a top-level workspace tab.

Current internal mode structure:

- `Validation`
- `Cleanup / Remap`
- `Variant Creator`

All three modes share one validator workspace state (uploaded image, extracted analysis, remap table, preview zoom/highlights, and export flow), so switching modes does not force re-upload/re-parse or reset user progress.

