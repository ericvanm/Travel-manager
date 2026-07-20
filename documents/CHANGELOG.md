# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **GCP on-demand environment:** Firebase Hosting + Cloud Run + Cloud SQL as a second deployment target beside Vercel+Render. Workflow [`.github/workflows/deploy-gcp.yml`](../.github/workflows/deploy-gcp.yml) (`workflow_dispatch`: start/deploy/stop), PowerShell tools `gcp-start` / `gcp-stop` / `gcp-deploy` / `gcp-setup-autostop`, and daily FinOps auto-stop at 22:00 Europe/Paris. See [06-deployment.md](06-deployment.md#gcp-on-demand-firebase-hosting--cloud-run--cloud-sql). Workload Identity Federation setup documents both **Cloud Console** steps and **`gcloud`** commands.
- **Developer tools:** PowerShell scripts in `tools/` — `reset-database.ps1` (empty DB) and `rebuild-docker.ps1` (Docker rebuild). See [tools/README.md](../tools/README.md).
- **AI trip planning:** form-based wizard (zone, duration, style, transport, accommodation, budget) with validation, synthesis, itinerary generation, revision, and trip creation. Sessions persisted in `trip_planning_sessions`. See [07-api-reference.md](07-api-reference.md#ai-trip-planning--ai-planning).
- Project documentation in `documents/` (architecture, structure, testing, developer guide, deployment, API reference).
- Architecture Decision Records in `documents/decisions/`.
- Root `README.md` with quick start and links to documentation.
- Backend test suite expansion (integration + unit tests) with coverage reporting for SonarCloud.
- CI pipeline: backend lint/test/coverage, frontend lint/tsc/build, SonarCloud with Quality Gate wait.
- Secure logging utilities (`logger.js`, `log-sanitizer.js`) and `DB_LOG_CONTEXT` for safe database connection logs.
- CSV import helpers and ICS import helpers with dedicated unit tests.

### Changed

- Production DB SSL is skipped when `DATABASE_URL` uses a Cloud SQL Unix socket (`/cloudsql/...`) so Cloud Run + Cloud SQL connector works; Render / public Postgres still use SSL.
- Backend `test` and `test:coverage` scripts run all files under `tests/`.
- Dockerfiles: non-root `nodejs` user (UID/GID 1001); fixed Render build (`--gid 1001`).
- SonarCloud and ESLint fixes across backend and frontend (optional chaining, `Number.parseInt`, React context memoization).
- Frontend translation key `auth_credential_label` (security-friendly naming).

### Security

- Disabled Express `x-powered-by` header.
- Session cookies: `httpOnly`, `secure` + `sameSite: none` in production.
- Reduced user-controlled data in logs; strict logger API.
- Docker production image runs as non-root user.

### Fixed

- CI test failures: `countryId` required for stage creation in tests; hotel activity same-day dates; import test fixtures.
- Render Docker build failure on Debian (`adduser --gid` numeric GID).

## [1.0.0] — prior baseline

Initial Travel Manager release:

- React frontend for trip/stage/activity management.
- Express + Sequelize + PostgreSQL backend.
- ICS and CSV import.
- Optional AI document import (pattern-based + OpenAI).
- Session-based authentication.
- Deployment on Render (API + DB) and Vercel (frontend).

---

[Unreleased]: https://github.com/ericvanm/Travel-manager/compare/main...HEAD
[1.0.0]: https://github.com/ericvanm/Travel-manager/releases/tag/v1.0.0
