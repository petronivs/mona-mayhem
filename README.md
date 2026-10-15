🌐 English | [Español](README.es.md) | [Português (Brasil)](README.pt_BR.md) | [한국어](README.ko.md)

# 🎮 Mona Mayhem

**VS Code & GitHub Copilot CLI Workshop** — Build a GitHub Contribution Battle Arena

A workshop template for building a retro arcade-themed website with Astro that compares GitHub contribution graphs of two users. This is the **starting point** — you'll build the app step by step using GitHub Copilot.

![Mona Mayhem Screenshot](https://github.com/user-attachments/assets/5eca79e2-cb9f-4e93-aa0d-23666ebde3b7)
*What you'll build by the end of the workshop*

## 📚 Workshop

The workshop supports two tracks — follow the one that matches your preferred workflow:

- **VS Code track** — Chat, Plan Mode, Agent Mode, background agents, and editor-native review loops
- **CLI track** — `copilot`, `@file` context, `/plan`, autonomous edits, `/fleet`, `/delegate`, and `/review`

| Part | Title | Copilot Focus |
|------|-------|---------------|
| [00](workshop/00-overview.md) | Overview | Track selection and learning goals |
| [01](workshop/01-setup.md) | Setup & Context Engineering | Instructions, permissions, and environment setup |
| [02](workshop/02-plan-and-scaffold.md) | Plan & Scaffold | Planning the API and page architecture |
| [03](workshop/03-agent-mode.md) | Build the Game | Agentic implementation and iteration |
| [04](workshop/04-design-vibes.md) | Design-First Theming | Visual design planning and implementation |
| [05](workshop/05-polish.md) | Polish & Parallel Work | Parallelism, reviews, and quality passes |
| [06](workshop/06-bonus.md) | Bonus & Extensions | Open-ended feature ideas and extra Copilot experiments |

## 🚀 Quick Start

1. **Create your own repo first** by either:
   - clicking **Use this template** to create a new repo, or
   - forking this repository.
2. Choose your workshop path:
   - **VS Code:** clone your repo and open it in VS Code.
   - **GitHub Copilot CLI:** clone your repo locally, install `copilot`, and work from your terminal.
3. Follow the [workshop guide](workshop/00-overview.md)

## Prerequisites

### Shared

- GitHub Copilot (Pro, Business, or Enterprise)
- Git
- Node.js

### VS Code track

- VS Code v1.107+
- GitHub Copilot extension signed in

### CLI track

- GitHub Copilot CLI (`copilot`)
- Node.js 22+ if you plan to install the CLI via `npm install -g @github/copilot`
- Or Homebrew / WinGet if you prefer a native package manager install

## Technology Stack

- **Framework**: [Astro](https://astro.build/) v6
- **Runtime**: Node.js with [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/) adapter
- **Font**: Press Start 2P (retro gaming font)
- **API**: GitHub's contribution graph API

## Development and validation

```bash
npm ci
npm run dev
```

The development server runs at `http://localhost:4321`.

```bash
npm test
npm test -- src/lib/contributions.test.ts
npm test -- src/lib/contributions.test.ts -t "expires cached data"
npm run typecheck
npm run build
npm run preview
```

Unit tests use Vitest with mocked upstream requests and deterministic clocks.
`typecheck` generates Astro types and checks TypeScript code; `build` creates
the standalone Node application.

## Contribution API

`GET /api/contributions/:username` fetches public contribution data from
`https://github.com/{username}.contribs` on the server and normalizes GitHub's
JSON v2 format. The battle-page UI is still a starter.

```bash
curl -i http://localhost:4321/api/contributions/octocat
curl -i http://localhost:4321/api/contributions/bad_name
```

Successful responses have this shape (illustrative values):

```json
{
  "username": "octocat",
  "totalContributions": 3,
  "from": "2026-10-14",
  "to": "2026-10-14",
  "days": [
    { "date": "2026-10-14", "count": 3, "level": 1 }
  ]
}
```

Dates are inclusive, UTC-derived `YYYY-MM-DD` values. Days are sorted
chronologically; counts are nonnegative integers and levels range from 0 to 4.
Usernames are case-insensitive and returned in lowercase. They must contain
1-39 ASCII letters, digits, or hyphens, without leading, trailing, or consecutive
hyphens.

Errors return `{"error":"Human-readable message","code":"STABLE_ERROR_CODE"}`:

| HTTP status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_USERNAME` | Invalid username |
| 404 | `USER_NOT_FOUND` | GitHub user does not exist |
| 502 | `UPSTREAM_ERROR` | Network failure or other unexpected upstream status/redirect |
| 502 | `INVALID_UPSTREAM_DATA` | Invalid JSON, unsupported schema/content, inconsistent data, or oversized body |
| 503 | `UPSTREAM_UNAVAILABLE` | GitHub throttling or upstream server failure |
| 503 | `SERVICE_BUSY` | All local cache slots have in-flight requests |
| 504 | `UPSTREAM_TIMEOUT` | GitHub request exceeded ten seconds |
| 500 | `INTERNAL_ERROR` | Unexpected internal failure |

Each upstream request has a ten-second deadline including body consumption and
a 1 MiB body limit. Requests are not retried and redirects are not followed.

Validated successes are cached for five minutes after fetching completes.
The process-local cache holds at most 500 usernames, including in-flight
requests; concurrent requests for the same username share one fetch.
Expired entries are removed before least-recently-used completed entries are
evicted. Failures are not cached and stale results are never served. The cache
resets on restart and is not shared across server instances. HTTP responses
use `Cache-Control: no-store` so browsers/CDNs do not add a separate cache.

## Deployment Notes

### Current GitHub Pages setup

The workflow in `.github/workflows/deploy.yml` currently deploys static workshop/docs content from `docs/` and `workshop/` to GitHub Pages. It does not build or deploy the Astro app from `src/`.

### Deploying the Astro application

The contribution proxy needs a runtime server. Keep server output and the
standalone Node adapter, build with `npm run build`, and run
`node dist/server/entry.mjs` on a Node host. `HOST` and `PORT` control the
listening address.

GitHub Pages cannot host this application unchanged. A static-only deployment
would require removing or moving the contribution API to a separate backend
and adapting the client first; changing Astro output alone is insufficient.

## License

MIT
