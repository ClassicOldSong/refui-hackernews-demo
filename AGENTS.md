# Repository Guidelines

## Project Structure & Module Organization
- `src/` — application code
  - `components/` — PascalCase `.jsx` components (e.g., `App.jsx`, `StoryItem.jsx`, `Comments.jsx`)
  - `utils/` — lowerCamelCase `.js` helpers (e.g., `dom.js`, `time.js`)
  - `main.js`, `style.css` — app bootstrap and global styles
  - `sw.js` — PWA service worker used by `vite-plugin-pwa`
- `public/` — static assets served at root
- `index.html` — app entry
- `vite.config.js` — Vite + PWA configuration
- `dist/` — production build output (gitignored)
- `resolve.cjs`, `test-resolve.*` — local module resolver utilities (Node-only)

## Build, Test, and Development Commands
- `pnpm install` — install dependencies
- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — create production build in `dist/`
- `pnpm preview` — preview the production build locally
- Resolver checks (optional): `node test-resolve.mjs <specifier> esm|cjs [sync] [linking]`

## Coding Style & Naming Conventions
- Formatting: tabs (width 2), single quotes, no semicolons, print width 120, no trailing commas.
  - Enforced by `.editorconfig` and `.prettierrc`.
  - Format before committing: `pnpm dlx prettier -w .`
- Files: components in PascalCase `.jsx`; utilities in lowerCamelCase `.js`.
- ESM by default (`"type": "module"`); prefer `import`/`export`.

## Testing Guidelines
- No formal test runner. Validate manually:
  - Navigate sections (Top/New/Best/Ask/Show/Job), “Load more”, open comments, dark mode toggle, offline-ready banner, install prompt.
  - After `pnpm build`, run `pnpm preview` and verify the same flows.
  - If touching resolver files, compare with Node resolution using `test-resolve.mjs`.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subjects (e.g., “Add scrolling reset”, “Update rEFui”), ~50 chars, no trailing period.
- PRs include:
  - Clear description and scope; link issues if applicable.
  - Screenshots/GIFs for UI changes.
  - Steps to test and expected results.
  - Confirmation that `pnpm build` passes and Prettier is applied.
- Do not commit `dist/` or `node_modules/`.

## Security & Configuration Tips
- No secrets required; uses public Hacker News API.
- When changing `sw.js`/PWA config, clear caches or bump versions, rebuild, and reload when testing updates.

