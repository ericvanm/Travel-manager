# Developer Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS (CI uses 20) |
| npm | 9+ |
| PostgreSQL | 15 recommended |
| Git | Latest |

Optional: Docker (see [06-deployment.md](06-deployment.md) for container workflow). Maintenance scripts: [`tools/README.md`](../tools/README.md) (`reset-database.ps1`, `rebuild-docker.ps1`).

## Clone and install

```bash
git clone <repository-url>
cd Travel-manager

cd "travelmgr-backend"
npm ci

cd "../travelmgr-frontend"
npm ci
```

## Environment variables

### Backend (`travelmgr-backend/.env`)

Copy from `.env.example`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET` | Yes | Session signing secret (long random string) |
| `PORT` | No | Default `3001` |
| `CORS_ORIGINS` | Production | Comma-separated frontend URLs |
| `TEST_DATABASE_URL` | Tests | Separate DB for `npm test` |
| `USE_OPENAI` | No | `true` to enable OpenAI parsing and trip planning |
| `OPENAI_API_KEY` | If OpenAI | API key from [platform.openai.com](https://platform.openai.com) |
| `OPENAI_MODEL` | No | Model for trip planning (default `gpt-4o-mini`) |

Example local `.env`:

```env
DATABASE_URL=postgres://postgres:mypassword@localhost:5432/travel_mgr
SECRET=dev-secret-change-in-production
PORT=3001
CORS_ORIGINS=http://localhost:5173
TEST_DATABASE_URL=postgres://postgres:mypassword@localhost:5432/travel_mgr_test
USE_OPENAI=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

> **ChatGPT subscription vs API:** A ChatGPT Plus/Pro account does not grant OpenAI API access. Generate an API key at [platform.openai.com](https://platform.openai.com) and set `USE_OPENAI=true`.

### Frontend (`travelmgr-frontend/.env`)

Create if needed (Vite reads `VITE_*` at build time):

```env
VITE_BACKEND_URL=http://localhost:3001/api
```

For production builds, set this to your Render API URL (e.g. `https://your-api.onrender.com/api`).

## Database setup

1. Create databases:

```sql
CREATE DATABASE travel_mgr;
CREATE DATABASE travel_mgr_test;
```

2. Start the backend — migrations run automatically on connect (`utils/db.js` + Umzug).

User trip lists return all trips (same behaviour as before admin work). New trips created while logged in are also linked in `trip_lists` for admin filtering. Admin ownership is resolved from `trip_lists`, AI planning sessions, and AI adaptation sessions.

### Reset database (empty)

PowerShell scripts in [`tools/`](../tools/README.md):

```powershell
# Docker dev stack (default)
.\tools\reset-database.ps1 -Force

# Local Postgres (uses travelmgr-backend/.env)
.\tools\reset-database.ps1 -Mode Local -Force
```

This drops and recreates `travel_mgr`. Migrations run again on the next backend start (including the default `admin` user).

## Running locally

### Terminal 1 — API

```bash
cd "travelmgr-backend"
npm run dev
```

API base: `http://localhost:3001`  
Health: `GET http://localhost:3001/api/health`

### Terminal 2 — Frontend

```bash
cd "travelmgr-frontend"
npm run dev
```

UI: `http://localhost:5173` (Vite default)

### First user

Use **Register** in the UI or:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo1234","name":"Demo User"}'
```

## AI trip planning (local)

1. Start backend and frontend as above.
2. Log in (recommended — sessions are linked to your user for history).
3. On the trip list, click **Plan Trip with AI** (or use the import menu).
4. Fill the form → validate → confirm synthesis → review itinerary.
5. Accept to create the trip, or revise/reject as needed.

To use OpenAI instead of the rule-based fallback:

```env
USE_OPENAI=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Restart the backend after changing `.env`. API details: [07-api-reference.md — AI Trip Planning](07-api-reference.md#ai-trip-planning--ai-planning).

## NPM scripts reference

### Backend

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | nodemon | Hot reload development |
| `start` | node index.js | Production start |
| `lint` | eslint | Zero warnings policy |
| `test` | node --test | All backend tests |
| `test:coverage` | node --test + lcov | Coverage for SonarCloud |

### Frontend

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | vite | Development server |
| `build` | tsc && vite build | Production bundle |
| `lint` | eslint | Lint React/TS |
| `tsc` | TypeScript check | No emit |
| `preview` | vite preview | Preview production build |

## Project workflow

```mermaid
flowchart LR
  FEAT[Feature branch]
  LOCAL[Local lint + tests]
  PR[Pull request]
  CI[GitHub Actions]
  MERGE[Merge to main]
  DEPLOY[Render + Vercel deploy]

  FEAT --> LOCAL --> PR --> CI --> MERGE --> DEPLOY
```

1. Branch from `main`.
2. Change backend and/or frontend as needed.
3. Run lint and tests locally.
4. Open PR — CI must pass including SonarCloud Quality Gate.
5. Merge triggers deployment (if connected).

## Working on common areas

### New API endpoint

1. Add route in appropriate `controllers/*.js`.
2. Mount path already set in `app.js` — only add new router if new resource.
3. Add integration test in `tests/`.
4. Update [07-api-reference.md](07-api-reference.md) if public contract changes.

### New import logic

1. Implement pure functions in `utils/*-helpers.js`.
2. Add unit tests first.
3. Wire controller to call helpers.
4. Add integration test with fixture file.

### New AI feature

1. Add service logic in `utils/ai-*-service.js` (pure functions where possible).
2. Add controller router in `controllers/ai-*.js` and mount in `app.js`.
3. Add unit tests for validation/helpers; integration tests if DB writes are involved.
4. Add frontend wizard in `components/` + API client in `services/`.
5. Add translations for all languages in `translations.ts`.
6. Update [07-api-reference.md](07-api-reference.md) and [01-architecture.md](01-architecture.md).

### Frontend feature

1. Add types in `types.ts` if new shapes.
2. Add API call in `services/trips.ts` or `services/auth.ts`.
3. Add translations in `translations.ts` for all supported languages.
4. Use existing MUI patterns from `TripList/` or `TripDetail/`.

## Debugging tips

| Issue | Check |
|-------|-------|
| CORS error in browser | `CORS_ORIGINS` includes frontend URL; credentials enabled |
| 401 on API calls | Login first; cookie `sameSite`/`secure` in production cross-origin |
| DB connection failed | `DATABASE_URL`, Postgres running, SSL settings on cloud DB |
| Migrations error | Logs on startup; conflicting migration state in `SequelizeMeta` |
| Import empty | ICS/CSV format; see `ics-import-helpers` / `csv-import-helpers` tests |
| AI planning fallback only | Set `USE_OPENAI=true` and a valid `OPENAI_API_KEY`; restart backend |
| AI planning validation errors | Check required form fields; see `ai-planning-service.test.js` |

## IDE setup

- ESLint extensions for both packages.
- Open [`Travel-manager.code-workspace`](../Travel-manager.code-workspace) in VS Code/Cursor for multi-root backend + frontend (best TypeScript and ESLint performance).
- Alternatively, open `travelmgr-frontend` or `travelmgr-backend` alone when working on one package.
- Recommended: format on save aligned with ESLint rules.

## Security reminders for developers

- Never commit `.env` files.
- Do not log `DATABASE_URL`, passwords, or request bodies in new code — use `logger.js`.
- Run SonarCloud locally via CI on PR before merging sensitive changes.

## Further reading

- [02-source-code-structure.md](02-source-code-structure.md) — module map
- [04-testing-strategy.md](04-testing-strategy.md) — test conventions
- [07-api-reference.md](07-api-reference.md) — REST API
