# Copilot Instructions for ffwrap

These instructions guide AI coding agents to work productively in this repo. Focus on the CLI + TUI for ffmpeg workflows.

## Project Overview
- Monorepo (`workspaces: packages/*`) with two packages:
  - `@manaskng/ffwrap`: Bun-based CLI + TUI wrapper around ffmpeg (published to npm).
  - `@ffwrap/web`: Next.js web interface for documentation (not published).
- Goal: opencode.ai-like guided ffmpeg interface for terminal.

## Build & Run
- Root scripts proxy to workspaces:
  - `bun run dev` → runs CLI (`packages/ffwrap/src/cli.ts`).
  - `bun run dev:tui` → runs TUI (`packages/ffwrap/src/tui/index.tsx`).
  - `bun run dev:web` → runs `@ffwrap/web` (Next.js dev server).
  - `bun run build` → builds all `@ffwrap/*` packages.
- `bun run lint` lints web package only; no test framework configured.

## Key Architecture
- CLI (`packages/ffwrap/src`)
  - Entry: `cli.ts` uses `yargs` to parse commands; `index.ts` exports programmatic APIs.
  - `commands/*.ts`: Individual command implementations (convert, trim, compress, etc.).
  - `ffmpeg/builder.ts`: assembles command args based on presets.
  - `ffmpeg/presets.ts`: `FORMAT_PRESETS` etc. with project-specific conversion options.
  - `ffmpeg/errors.ts`: pattern-based error parsing; return shape `{ message, suggestion }`.
  - `ffmpeg/types.ts`: Types for options/results (`ConvertOptions`, `BuildResult`).
- TUI (`packages/ffwrap/src/tui`)
  - Entry: `index.tsx` defines `launch()` with `@opentui` renderer and providers.
  - Context: `context/app.tsx` (cwd, app state), `context/theme.tsx` and `theme/*.json`.
  - UI: `components/*` (logo, prompt with autocomplete/history, dialogs, toasts, spinner).
  - Prompt stack: `components/prompt` integrates history and fuzzy search via `fuzzysort`.

## Conventions & Patterns
- TypeScript strict with `noUncheckedIndexedAccess`.
- Imports: use `import type { X }` for type-only; include `.ts` extension in relative imports.
- Naming:
  - Files: kebab-case (e.g., `file-tree.tsx`).
  - Functions: camelCase (e.g., `buildConvertArgs`).
  - Constants: SCREAMING_SNAKE_CASE (e.g., `FORMAT_PRESETS`).
  - Types/Interfaces: PascalCase (e.g., `ConvertOptions`).
  - React hooks: `useXxx` (e.g., `useApp`, `useTheme`).
- Error handling:
  - Return `{ success: boolean, error?: string }` for operations that can fail.
  - Parse ffmpeg errors into `{ message, suggestion }` via `errors.ts`.
  - CLI fatal: call `process.exit(1)`; graceful failures return `null`.
- Docs: add JSDoc `/** */` for functions and interfaces; include per-field comments for interfaces.

## Integration Points
- `@opentui/core` + `@opentui/react` power TUI rendering and keyboard input.
- `fuzzysort` used for prompt autocomplete.
- `yargs` is used for CLI command parsing.

## Common Workflows
- Add a new ffmpeg preset:
  - Update `packages/ffwrap/src/ffmpeg/presets.ts` with `FORMAT_PRESETS` entry.
  - Extend types in `types.ts` if needed.
  - Ensure `builder.ts` maps options to args.
  - Provide error pattern updates in `errors.ts` when relevant.
- Add a new CLI command:
  - Create `packages/ffwrap/src/commands/<name>.ts` exporting a `yargs` command.
  - Wire up in `packages/ffwrap/src/commands/index.ts` and `cli.ts`.
  - Follow return shape conventions and error parsing.
- Extend TUI:
  - Add components under `packages/ffwrap/src/tui/components/*` using `@opentui/react` primitives (`box`, `text`).
  - Use `DialogProvider`, `ToastProvider`, `HistoryProvider`, and app/theme contexts in `index.tsx`.
  - Bind global shortcuts via `useKeyboard` (respect `dialog.isOpen`).

## Debugging Notes
- TUI entry `index.tsx` uses `createCliRenderer()`; ensure running in a TTY.
- Keyboard: `Ctrl+C` triggers `process.exit(0)`; `Ctrl+P` opens help dialog.
- For abrupt crashes, check global handlers in `index.tsx` and provider order.

## Example References
- Prompt: `packages/ffwrap/src/tui/components/prompt/index.tsx` integrates history/autocomplete.
- Error parsing: `packages/ffwrap/src/ffmpeg/errors.ts` with pattern mapping and suggestions.
- Args building: `packages/ffwrap/src/ffmpeg/builder.ts` produces ffmpeg command arrays.

## Style & PR Tips
- Keep changes minimal and aligned with naming/import conventions.
- Prefer expanding presets/types over ad-hoc args in commands.
- Surface actionable errors and suggestions through `errors.ts` and `{ success, error }` return shapes.
