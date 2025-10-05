# Repository Guidelines

## Generic Guidelines
Be precise and practical. Tell it like it is; don't sugar-coat responses.
Do not try to cover up inaccessible resources during search, especially when reading source code or documents.
When writing code, format it properly to match the context.

## Project Structure & Module Organization
- `src/` - application code
  - `components/` - PascalCase `.jsx` components (e.g., `App.jsx`, `StoryItem.jsx`, `Comments.jsx`)
  - `utils/` - lowerCamelCase `.js` helpers (e.g., `dom.js`, `time.js`)
  - `main.js`, `style.css` - app bootstrap and global styles
  - `sw.js` - PWA service worker used by `vite-plugin-pwa`
- `public/` - static assets served at root
- `index.html` - app entry
- `vite.config.js` - Vite + PWA configuration
- `dist/` - production build output (gitignored)

## Build, Test, and Development Commands
- `pnpm install` - install dependencies
- `pnpm dev` - start Vite dev server with HMR
- `pnpm build` - create production build in `dist/`
- `pnpm preview` - preview the production build locally
- Resolver checks (optional): `node test-resolve.mjs <specifier> esm|cjs [sync] [linking]`

## Coding Style & Naming Conventions
- Formatting: tabs (width 2), single quotes, no semicolons, print width 120, no trailing commas.
  - Enforced by `.editorconfig` and `.prettierrc`.
  - Format before committing: `pnpm dlx prettier -w .`
- Files: components in PascalCase `.jsx`; utilities in lowerCamelCase `.js`.
- ESM by default (`"type": "module"`); prefer `import`/`export`.

## Testing Guidelines
- No formal test runner. Validate manually:
  - Navigate sections (Top/New/Best/Ask/Show/Job), "Load more", open comments, dark mode toggle, offline-ready banner, install prompt.
  - After `pnpm build`, run `pnpm preview` and verify the same flows.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subjects (e.g., "Add scrolling reset", "Update rEFui"), ~50 chars, no trailing period.
- PRs include:
  - Clear description and scope; link issues if applicable.
  - Screenshots/GIFs for UI changes.
  - Steps to test and expected results.
  - Confirmation that `pnpm build` passes and Prettier is applied.
- Do not commit `dist/` or `node_modules/`.

## Security & Configuration Tips
- No secrets required; uses public Hacker News API.
- When changing `sw.js`/PWA config, clear caches or bump versions, rebuild, and reload when testing updates.

---

# rEFui Guide for Contributors

This project uses rEFui (retained-mode) with the DOM renderer and the Browser preset. It is not React.

## Non-Negotiables
- Do not write React patterns (hooks, state in components, `setState`, `useMemo`, etc.).
- Keep changes minimal and scoped; do not reformat unrelated code.
- Preserve existing names, structure, and behavior. Fix root causes, not symptoms.
- Prefer signals and rEFui components over manual DOM access, except where `$ref` is intended.

## Runtime and JSX
- Renderer: `createDOMRenderer(defaults)` from `refui/dom` and `refui/browser`.
- JSX transform: Classic. See `vite.config.js` - `jsxFactory: 'R.c'`, `jsxFragment: 'R.f'`.
- Component shape: `const C = (props, ...children) => (R) => <div/>`.
- Automatic runtime exists (`refui/jsx-runtime.wrap(R)`), but is not used here.

## Signals and Reactivity
- Create: `const x = signal(0)`; derive: `const y = $(() => x.value * 2)`; template: `const url = t\`/p/${id}\``.
- Reading in JSX: placing a signal as a child is reactive (`<div>{count}</div>`). Use `$(() => expr)` when you need a computed expression combining values.
- Read helpers: `read(val)`, `readAll(a, b)`, `peek(sig)` (no dependency), `touch(sig)`.
- Write helpers: `write(sig, v)`, `poke(sig, v)` (no notify), `sig.trigger()` (manual notify after in-place mutation).
- Boolean/compare helpers: `sig.hasValue()`, `sig.eq(v)`, `sig.neq(v)`, `sig.gt(v)`, `sig.lt(v)`, `sig.and(v)`, `sig.or(v)`, `sig.inverse()`.
- Structure helpers: `derive(objSig, 'key')`, `derivedExtract(objSig, 'a', 'b')`, `extract(objSig, 'a', 'b')`.

## Effects and Lifecycle
- `watch(fn)`: runs reactively; returns a disposer.
- `useEffect(setup, ...args)`: runs `setup`, uses its return as cleanup; automatically cleans up on component dispose.
- `onDispose(cb)`: register cleanup for the current component scope.
- `nextTick(cb)`, `tick()`: scheduling utilities.

## Control Flow and Lists
- `If`: `<If condition={cond}>{() => <A/>}{() => <B/>}</If>`; the `else` prop is an alias of the second child.
- `For`: `<For entries={items} track='id' indexed>{({ item, index }) => <Row/>}</For>`
  - `entries`: array signal or computed.
  - `track`: string key of the item used for stable identity (e.g., `'id'`).
  - `indexed`: when true, `index` is an index signal passed to the template.
  - Instance exposes `getItem(key)`, `remove(key)`, `clear()`.
- `Fn`: executes an inline render function with its own lifecycle; accepts `ctx` and `catch`.

## Async and Dynamic
- `Async`: `<Async future={promise} fallback={F} catch={E}>{(val) => <UI/>}</Async>`; also used implicitly when a component function is `async` and returns `(R) => JSX` once resolved.
- `Dynamic`: `<Dynamic is={ComponentOrTag} {...props}/>`.

## DOM Props, Directives, and Events
- Props vs attributes: use `prop:name` or `attr:name` to force; most common attributes are handled automatically. Browser preset exposes directives:
  - `class:x={bool}` toggles class; `style:x={val}` sets inline style.
- Events:
  - `on:click={handler}` normal listener.
  - `on-once:click={handler}` one-time.
  - `on-passive:scroll={handler}` passive option.
  - `on-capture:click={handler}` capture phase.
  - Do not use non-standard modifiers like `prevent` - call `event.preventDefault()` in the handler instead.

## Refs
- `$ref`: set a ref to the created node or instance.
  - Signal form: `$ref={el}` where `el` is a signal; rEFui writes the node to `el.value`.
  - Function form: `$ref={(node) => { /*...*/ }}`.

## Patterns Used in This Codebase
- Async component with fallbacks (see `src/components/StoryItem.jsx`).
- Rich text rendering via `Parse` from `refui/extras/parse.js` for HN HTML.
- Derived object access via `derivedExtract` (see `Comments.jsx`).
- URL building via `t` template literals.
- Event options using `on-once:*` and `on-passive:*`.

## Build and Debug Tips
- Use `pnpm build` to check type and build errors. `pnpm dev` starts a server and does not exit automatically.
- A successful build does not guarantee runtime correctness. Verify flows manually and watch for missing variables or wrong reactivity.

## Quick Reference
- Renderer setup: see `vite.config.js` for PWA and JSX config.
- Entry: `src/main.js` initializes the DOM renderer and mounts `App`.
- rEFui package: `node_modules/refui/src` (and the linked source under `rEFui/src`) contains the authoritative API for version `0.6.3` used here.
- Docs (local, clickable): `rEFui/docs/index.md`, `rEFui/docs/API.md`, `rEFui/docs/Components.md`, `rEFui/docs/Signal.md`, `rEFui/docs/DOMRenderer.md`, `rEFui/docs/JSX.md`.
