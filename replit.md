# N-Tech C³

An Engineering Intelligence Operating System (EIOS) for NaniTech — transforms raw engineering work into structured, evidence-backed content. Local-first, dark IDE aesthetic, single-user.

## Run & Operate

- `pnpm --filter @workspace/ntech-c3 run dev` — run the frontend (PORT env required)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter routing, TanStack Query, Tailwind CSS v4
- API: Express 5, OpenAPI-first with Orval codegen
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3 + zod/v4 shim), drizzle-zod
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ntech-c3/` — React + Vite frontend, served at `/`
- `artifacts/api-server/` — Express API server, served at `/api`
- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas (used by server)
- `lib/db/src/schema/` — Drizzle table definitions

## Architecture decisions

- OpenAPI-first: all contracts defined in `lib/api-spec/openapi.yaml`, codegen runs Orval to produce typed hooks and Zod validators
- All `type: integer` fields in the spec use `type: number` because Orval generates `zod.int()` (Zod v4 syntax) for `integer`, which fails with Zod v3
- Activity feed is a simple append-only `activity` table — non-critical, errors swallowed silently
- `linkedPageIds` in knowledge pages are stored as `text[]` in PostgreSQL and converted to `number[]` at the route layer
- Dark-first UI with spaceship/cockpit aesthetic — Inter + Space Mono typography, cyan accent

## Product

N-Tech C³ has ten modules:
1. **Dashboard** — command center with stats, pipeline status, signal feed
2. **Stories** — engineering stories with status pipeline (Research → Idea → Draft → Review → Approved → Published → Archived)
3. **Campaigns** — groups of related stories with platform tracking
4. **Evidence Vault** — screenshots, terminal output, benchmarks, diagrams, etc.
5. **Knowledge Base** — personal engineering wiki with linked pages
6. **Assets** — image/icon/video/PDF library
7. **Templates** — reusable content templates (LinkedIn, Blog, X Thread, etc.)
8. **Projects** — project groupings for stories and evidence
9. **Settings** — app configuration
10. **Activity Feed** — cross-module recent activity

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Orval + Zod v3: use `type: number` not `type: integer` in the OpenAPI spec
- Always run `pnpm run typecheck:libs` before checking artifact packages — stale lib declarations cause false positives
- `pnpm --filter @workspace/db run push` must be run after any schema change
- After OpenAPI spec changes: run codegen, then restart both the API server and frontend workflows

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
