# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Public-readiness hardening:** `CORS_ALLOW_HOSTED_SUFFIXES`, production `SECRET` fail-fast, PR template, Dependabot for GitHub Actions, demo user production seed requires `DEMO_USER_PASSWORD`.
- **Trip access control:** authentication required on trip/stage/activity routes; users only access owned trips (`utils/trip-access.js`). Admins use `/api/admin/*`.
- **Auth hardening:** rate limiting on `/api/auth/*`, minimum 8-character passwords on register/change-password, `ALLOW_REGISTRATION` env flag (off by default in production).
- **Health check:** `/api/health` reports database connectivity.
- **`CONTRIBUTING.md`** and CI badge in root README.
- **Demo read-only user** and admin user management (create/update/delete users, set passwords, toggle read-only).
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
- Root `LICENSE` (ISC) and `SECURITY.md` for public repository readiness.

### Changed

- Root README: suggested GitHub About metadata, demo URL placeholders, frontend test commands.
- Sonar/docker-compose comments translated to English; `sonar-project.properties` uses placeholder org keys for forks.
- Production DB SSL is skipped when `DATABASE_URL` uses a Cloud SQL Unix socket (`/cloudsql/...`) so Cloud Run + Cloud SQL connector works; Render / public Postgres still use SSL.
- Backend `test` and `test:coverage` scripts run all files under `tests/`.
- Dockerfiles: non-root `nodejs` user (UID/GID 1001); fixed Render build (`--gid 1001`).
- SonarCloud and ESLint fixes across backend and frontend (optional chaining, `Number.parseInt`, React context memoization).
- Frontend translation key `auth_credential_label` (security-friendly naming).
- Replaced obsolete `docs/Technical Guide.md` content with pointers to maintained documentation under `documents/`.
- Removed legacy Patientor Docker scripts from frontend `package.json`.
- Cleaned legacy JWT/session debug code in `tokenExtractor` middleware.
- Removed legacy blog demo code (`controllers/unused/`, `list_helper`, obsolete `cli.js` and `logout.js` router).
- Dropped unused npm dependencies (`mongoose`, `morgan`, frontend `express`).
- Aligned CI Node.js version with production Docker images (**20** LTS).
- SonarCloud CI: migrate from deprecated `sonarcloud-github-action` (Java 17) to `sonarqube-scan-action` v8 (Java 21 scanner runtime).
- CI frontend build uses placeholder `VITE_BACKEND_URL=http://localhost:3001/api` (no hardcoded Render URL).
- Anonymized GCP examples in docs/tests (placeholders instead of a real project id).
- Removed MongoDB-specific error handling from Express middleware.

### Security

- Disabled Express `x-powered-by` header.
- Session cookies: `httpOnly`, `secure` + `sameSite: none` in production.
- Reduced user-controlled data in logs; strict logger API; removed session dump from request middleware.
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
