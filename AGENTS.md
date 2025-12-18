# AGENTS.md

## Build & Run
- `bun run dev` - Run CLI (`packages/cli/src/cli.ts`)
- `bun run dev:tui` - Run TUI (`packages/tui/src/index.tsx`)
- `bun run build` - Build all packages; `bun run lint` - Lint web package only
- No test framework configured yet

## Code Style
- TypeScript strict with `noUncheckedIndexedAccess`; use `import type { X }` for type-only imports
- Include `.ts`/`.tsx` extension in relative imports (e.g., `./presets.ts`)
- Naming: files kebab-case, functions camelCase, constants SCREAMING_SNAKE_CASE, types PascalCase, hooks `useXxx`

## Error Handling
- Return `{ success: boolean, error?: string }` for failable operations
- Parse ffmpeg errors into `{ message, suggestion }` via `packages/cli/src/ffmpeg/errors.ts`
- CLI fatal errors: `process.exit(1)`; graceful failures return `null`

## Adding Features
- New CLI command: Create `packages/cli/src/commands/<name>.ts`, export yargs command, wire in `commands/index.ts`
- New ffmpeg preset: Update `packages/cli/src/ffmpeg/presets.ts`, extend `types.ts` if needed
- New TUI component: Add under `packages/tui/src/components/` using `@opentui/react` primitives

## Architecture
- Monorepo: `@ffwrap/cli` (yargs-based), `@ffwrap/tui` (@opentui/react), `@ffwrap/web` (Next.js)
- CLI entry: `cli.ts`; args built via `ffmpeg/builder.ts`; presets in `ffmpeg/presets.ts`
- TUI entry: `index.tsx`; uses context providers (app, theme) and `fuzzysort` for autocomplete
