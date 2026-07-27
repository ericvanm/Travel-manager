# Contributing to Travel Manager

Thank you for your interest in contributing. This project is maintained in the open; small, focused pull requests are easiest to review.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

1. Read the [developer guide](documents/05-developer-guide.md) for local setup.
2. Check [open issues](https://github.com/ericvanm/Travel-manager/issues) or open one to discuss larger changes.
3. For security issues, follow [SECURITY.md](SECURITY.md) — do not open public issues.

## Development workflow

```bash
# Backend
cd travelmgr-backend
cp .env.example .env
npm ci
npm run lint
npm test

# Frontend
cd travelmgr-frontend
npm ci
npm run lint
npm test
npm run build
```

Backend tests require PostgreSQL and `TEST_DATABASE_URL` (see `.env.example`). Frontend unit tests use Vitest and do not need a database.

## Pull request guidelines

- **One concern per PR** when possible (feature, fix, or chore — not all three).
- Keep commits logical; squash on merge is fine if history is noisy.
- Update docs when behavior or env vars change.
- Ensure CI passes (lint + tests + SonarCloud on `main`).

## Code style

- Match existing patterns in each package (ESLint is enforced in CI).
- Backend: Express controllers, Sequelize models, Node test runner.
- Frontend: React + TypeScript + MUI; avoid debug `console.log` in production paths.

## Auth and trip ownership

User-facing trip, stage, and activity routes require authentication. Trips are scoped to the logged-in user via `trip_lists` (see `utils/trip-ownership.js` and `utils/trip-access.js`). Admin operations belong on `/api/admin/*`.

When adding routes that touch trip data, reuse the existing access helpers rather than querying trips directly.

## Environment variables

Document new variables in `travelmgr-backend/.env.example` and the deployment guide. Never commit secrets.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC).
