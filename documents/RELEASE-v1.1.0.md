# Release notes — v1.1.0 (draft)

Use this document when tagging **`v1.1.0`** on GitHub. Adjust dates and demo URLs before publishing the release.

## Highlights

- Trip access control and auth hardening on the API
- Expanded backend test suite with SonarCloud coverage gate
- Documentation set under `documents/` (architecture, API, deployment, AI)
- Optional GCP on-demand deployment workflow
- Frontend Vitest unit tests for core helpers
- Open-source hygiene: `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates

## Upgrade notes

- Set `ALLOW_REGISTRATION` explicitly in production
- Rotate `SECRET` and database credentials when forking or going public
- Set the default **admin** password after first deploy on a new database

## Full change list

See [CHANGELOG.md](CHANGELOG.md) **Unreleased** section at release time.

## Suggested GitHub release title

`v1.1.0 — Public-ready docs, tests, and auth hardening`
