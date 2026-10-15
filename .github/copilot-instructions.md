# Mona Mayhem

## Commands

Run from the repository root using npm and the committed `package-lock.json`:

- `npm ci` installs dependencies (also used by the devcontainer).
- `npm run dev` starts Astro at `http://localhost:4321`.
- `npm run build` builds the server application into `dist/`.
- `npm run preview` previews the built application.
- `npm run astro -- <command>` invokes the Astro CLI.
- `npm test` runs Vitest unit tests.
- `npm test -- src/lib/contributions.test.ts` runs one test file.
- `npm test -- src/lib/contributions.test.ts -t "expires cached data"` runs a
  single named test.
- `npm run typecheck` generates Astro types and checks TypeScript code.

With the dev server running, inspect the contribution route with
`curl -i http://localhost:4321/api/contributions/octocat`.

## Application architecture

This is an intentionally incomplete workshop template for a retro arcade app
comparing two GitHub users' contribution graphs. Workshop examples and the README
screenshot describe the intended result, not features already implemented.

The application uses Astro 6 with the `@astrojs/node` standalone adapter.
`astro.config.mjs` selects server output. `src/pages/index.astro` currently
renders only a title and welcome paragraph.

`src/pages/api/contributions/[username].ts` defines the runtime endpoint
`/api/contributions/:username`: a typed Astro `APIRoute` GET handler with
`prerender = false`. It delegates to `src/lib/contributions.ts`, which validates
usernames, fetches `https://github.com/{username}.contribs`, and normalizes its
observed JSON v2 schema. Days derive from each week's `first_day` plus
`weekday` using UTC arithmetic, including partial weeks.
Keep upstream requests server-side and the route's success/error contracts
stable; README documents their fields and status mappings.

The service has a ten-second fetch/body deadline, a 1 MiB body limit, and
no redirects or retries. Its five-minute, 500-user process-local cache includes
in-flight entries and coalesces same-user requests. Cache only validated
successes; never serve stale data. HTTP responses use `Cache-Control: no-store`
because caching is handled inside the service.

The planned battle page fetches both users in parallel and renders daily grids,
totals, and date ranges, with loading/error states and Enter-key submission.
Use the relevant `workshop/02-plan-and-scaffold.md` and
`workshop/03-agent-mode.md` requirements when implementing that flow.

## Code and design conventions

- Follow test-first development: establish meaningful failing behavior tests
  before implementing a change, then confirm they pass. Service tests inject
  fetch/time rather than contacting GitHub. Keep route tests in `tests/`, not
  `src/pages/`, where Astro would treat them as routes.
- TypeScript extends `astro/tsconfigs/strict`. Preserve typed Astro route
  handlers and use explicit interfaces for contribution data shared by the API
  and client.
- The starter uses Astro markup, page-local styles/scripts when added, and plain
  TypeScript; its dependencies are Astro and the Node adapter. Keep ordinary
  battle interaction in Astro client scripts rather than introducing a UI
  framework solely for that flow.
- Match the existing application code's tab indentation and single-quoted
  TypeScript imports/strings. API responses use `Response`, explicit HTTP status,
  and `Content-Type: application/json`.
- When implementing the workshop's retro theme, follow
  `workshop/04-design-vibes.md`: dark background `#0a0a1a`, green `#5fed83`,
  purple `#8a2be2`, and the Google Fonts Press Start 2P font. These are planned
  design requirements, not existing styles.

## Workshop site and localization

`docs/` is a separate static workshop website, not the Astro application.
Its step pages fetch workshop Markdown and render it with Marked.
Preserve paired `<!-- track:vscode:start -->` / `<!-- track:vscode:end -->`
and equivalent `cli` markers: the site filters content by the selected track.

`.github/workflows/deploy.yml` copies `docs/` and the Spanish/Brazilian Portuguese
workshop directories into a Pages artifact; it does not build or deploy `src/`.
The live contribution proxy requires server hosting. Do not switch the app to
static output merely to fit this documentation deployment.

For translation changes, read `.github/skills/localizations/SKILL.md` and the
matching locale rule. The repository workflow overrides the skill's generic
layout: `README.md` maps to `README.<locale>.md`, English workshop files to
`workshop/<locale>/`, and `docs/index.html` / `docs/step.html` to `docs/<locale>/`.
Supported workflow locales are `es`, `pt_BR`, and `ko`.
`localizations/<locale>/.localization-state.json` stores per-source commit and
normalized SHA-256 baselines; preserve human edits and update a baseline only
after reviewing the corresponding translation. Consult
`.github/workflows/localization-sync.yml` and `scripts/localization_sync.py`
before changing this mapping or metadata.

When working in the local multi-repository workspace, consult the parent
`../AGENTS.md` memory index and its referenced notes when available. Confirm
snapshots against current code and keep local reference notes outside this
repository.
