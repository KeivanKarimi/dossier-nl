# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dossier is a single-user, self-hosted job-search app: one profile, AI-tailored resumes and cover letters per application, PDF printing, and application tracking. Next.js 16 (App Router) + Prisma 7 + PostgreSQL 18, Yarn 4, Node 24. `DEVELOPMENT.md` is the authoritative developer guide and goes deeper on every section below; read the relevant part before changing a subsystem.

## Commands

Nothing runs on the host: every command goes through the Compose containers. `docker/bin/yarn` runs yarn in the running `app` container (or a one-off one).

```bash
docker compose up                    # dev stack: db + app (next dev, source bind-mounted, hot reload) on :3000
docker/bin/yarn test                 # vitest, all tests once
docker/bin/yarn vitest run path/to/file.test.ts      # one file
docker/bin/yarn vitest run path/to/file.test.ts -t "name"  # one test
docker/bin/yarn lint
docker/bin/yarn typecheck            # next typegen && tsc --noEmit
docker/bin/yarn build && docker/bin/yarn test:e2e    # Playwright, against a production build
docker/bin/yarn prisma migrate dev --name <name> && docker compose restart app   # new migration (restart regenerates the client)
docker/bin/yarn prisma db seed -- --demo [--reset]   # load the sample data
docker/bin/yarn hash-password        # hash for DOSSIER_PASSWORD
```

Setup: `cp .env.example .env`, set `DOSSIER_PASSWORD` (a hash) and `DOSSIER_SECRET` (≥32 chars); the server refuses to start otherwise. On each start the dev container runs `prisma generate`, `migrate deploy`, the idempotent seed, then `next dev`.

## Tests

- Tests live next to the code. `*.test.ts` run in Node, `*.test.tsx` in jsdom with Testing Library.
- `*.db.test.ts` run against a real Postgres `dossier_test` database (or `TEST_DATABASE_URL`), migrated per run; empty it with `resetDatabase()` from `src/test/db.ts`. They refuse any DB not ending in `_test`.
- AI tests use a mock provider. `*.live.test.ts` hit real services and are skipped unless `AI_LIVE=…` / `JOBS_LIVE=…` is set (see DEVELOPMENT.md).
- E2E (`e2e/`) starts its own server on :3100 with a `dossier_e2e` DB and fakes for the AI (`e2e/fake-ai.mts`, :3999), job sources (`e2e/fake-jobs.mts`, :3998) and Google (`e2e/fake-google.mts`, :3997). `e2e/accessibility.spec.ts` enforces no serious/critical axe WCAG 2.2 AA violations.
- Coverage thresholds in `vitest.config.mts` ratchet; CI fails if coverage drops below them. Raise them when adding tests.

## Architecture

**Routing** (`src/app`): `(app)/` is the signed-in area (dashboard, applications, profile, resume, jobs, startups, agent, inbox, settings); `login/`, `print/` (pages Chromium renders to PDF), `api/` (route handlers), `oauth/` and `api/mcp`. `src/proxy.ts` runs on every request. Shared logic is in `src/lib`, UI in `src/components`.

**Mutations always go through one of two wrappers**, both of which check the session, validate input, and log unexpected errors without user data:
- Server Actions (the default): `action(zodSchema, handler)` from `@/lib/action` in a `"use server"` file. They return `{ ok: true, data, toast? } | { ok: false, error, fieldErrors? }`. Throw `ActionError("…")` for a message shown to the user; on the client use `toastResult()` from `@/components/toast`.
- Route handlers, only for files, uploads and streams (bodies over 1 MB, PDFs, exports): wrap in `route()` from `@/lib/route`, which also rejects cross-origin (403) and signed-out (401) requests and sets `Cache-Control: private, no-store`.
- Pages and layouts call `verifySession()`; anything else uses `getSession()` (`src/lib/auth/session.ts`).

**Conventions that keep data consistent:**
- Read config from the validated `env` in `@/lib/env`, never `process.env`. Use the shared `prisma` from `@/lib/prisma`.
- JSON columns are validated with the zod schemas in `src/lib/application-data.ts`.
- Change an application's status only through `setStatus` (`src/lib/status-actions.ts`), or `changeStatus()` on the client, so funnel figures stay right.
- Secrets saved in Settings (AI keys, job-source keys) are encrypted with keys derived from `DOSSIER_SECRET`, one per kind (`src/lib/secrets.ts`), and never sent to the browser.

**Auth:** one user and no accounts. The password hash is argon2id written as `argon2id:m=…:<salt>:<hash>` (no `$`, because `.env` expands it). The session is a stateless JWE cookie keyed from `DOSSIER_SECRET` that carries a password fingerprint. Failed sign-ins are throttled in the `LoginThrottle` table.

**AI** (`src/lib/ai`): pluggable providers (Ollama/llama.cpp, LM Studio, OpenAI-compatible, Anthropic, Mistral), chosen in Settings, falling back to `DOSSIER_AI_*`. Prompts are in `src/lib/ai/tasks`. Strict mode's fact guard flags names and numbers that aren't in the profile or the posting.

**Background jobs** (`src/lib/jobs`): long AI tasks run as `Job` rows with named steps that the page follows and re-attaches to after a reload. Job input and output hold personal data and are deleted with their application (`startJob(…, { applicationId })`) or by the retention sweep (`src/lib/jobs/retention.ts`). Don't keep anything in a job that has to outlast that.

**Naming:** "job" means a background task. A job ad is a **posting**, and job search lives in `src/lib/job-search`: one adapter per source (`jsearch.ts`, `adzuna.ts`, `arbeitsagentur.ts`) behind `index.ts`, with a 30-minute in-memory cache and a `JobSearchError` for the user. Saved and dismissed postings are in `src/lib/postings.ts`, and past searches in `src/lib/posting-searches.ts`.

**Job agent** (`src/lib/agent`): `agent-scan` (`run.ts`) scores new postings into `AgentCandidate`s. `agent-draft` (`draft.ts`) claims a candidate (SCORED → DRAFTING → DRAFTED) and builds the application with `createApplicationFromDocuments()` (`src/lib/application-create.ts`, shared with New application) as `origin: AGENT` with `awaitingReview`, which hides it everywhere until it's approved. Runs are recorded in the `agentRuns` setting, not as Job rows.

**In-process timers:** nightly backups and the agent schedule are timers inside the app process, so only one app instance may run.

**Data export/import:** one JSON file. An import replaces everything in one transaction after writing a backup to `DOSSIER_DATA_DIR/backups`. Install-specific settings (`INSTALL_SETTINGS` in `src/lib/data-export.ts`) are left out of exports. Imports are capped at 10 MB by `proxyClientMaxBodySize` in `next.config.ts` together with `IMPORT_MAX_BYTES` in `src/lib/import-limits.ts`; change both together.

**Usage ping:** opt-in and production-only (`src/lib/usage-ping.ts`). When the question's text changes, raise `USAGE_PING_TEXT_VERSION`. Change what it sends only together with the receiving service and the Privacy docs.

## Images and deploy

The `Dockerfile` has a `dev` stage (used by `compose.yml`) and a `production` stage: a standalone Next.js server, Playwright's Chromium for PDFs, and the Prisma CLI. It starts with `docker/start.sh` (migrate, seed, serve). `compose.production.yml` runs the published image. CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests with coverage and E2E, and pushes `ghcr.io/<owner>/<repo>:<sha>` from `main`. `site/` is the static project website, built by `site/build.sh`.
