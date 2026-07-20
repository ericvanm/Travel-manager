# Testing Strategy

## Goals

- Catch regressions in trip planning, imports, and authentication before merge to `main`.
- Maintain **SonarCloud coverage ≥ 83%** on backend code included in analysis.
- Keep CI fast and deterministic (no external API calls in default test runs).

## Test pyramid

```mermaid
flowchart TB
  subgraph CI["GitHub Actions (every push/PR)"]
    INT[Backend integration tests\nSupertest + PostgreSQL]
    UNIT[Backend unit tests\nPure helpers]
    FE[Frontend lint + tsc + build]
    SONAR[SonarCloud + Quality Gate]
  end

  subgraph Future["Not yet implemented"]
    E2E[Browser E2E]
  end

  INT --> SONAR
  UNIT --> SONAR
  FE --> SONAR
```

| Level | Location | Tooling | Scope |
|-------|----------|---------|--------|
| Unit | `travelmgr-backend/tests/*.test.js` | Node.js built-in `node --test` | Helpers (`csv-import-helpers`, `ics-import-helpers`, `logger`, etc.) |
| Integration | Same folder | Supertest + real PostgreSQL | HTTP routes, auth, DB persistence |
| Frontend | `travelmgr-frontend/` | ESLint, `tsc`, Vite build | No runtime test suite yet |
| Static analysis | Whole repo | ESLint, SonarCloud | Security, smells, duplication |

## Backend test runner

Scripts in `travelmgr-backend/package.json`:

```bash
npm test              # all tests in tests/
npm run test:coverage # LCOV → coverage/lcov.info
```

Configuration highlights:

- **`NODE_ENV=test`** — memory session store (no PostgreSQL session table required for auth tests).
- **`--test-concurrency=1`** — avoids race conditions when tests share one database.
- **Coverage reporter** — `lcov.info` consumed by SonarCloud.

## Test database

| Variable | Purpose |
|----------|---------|
| `TEST_DATABASE_URL` | Primary URL used by `tests/setup.js` |
| `DATABASE_URL` | Fallback if `TEST_DATABASE_URL` unset |

### Local setup

1. Create database: `travel_mgr_test`
2. Set in `.env` (see `.env.example`):

```env
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/travel_mgr_test
```

3. Run tests — migrations run via app bootstrap / setup helpers.

### CI setup

The `backend` job in `.github/workflows/ci.yml`:

- Starts **PostgreSQL 15** service container
- Sets `TEST_DATABASE_URL` and `DATABASE_URL` to the CI database
- Runs `npm run lint` then `npm run test:coverage`
- Uploads `coverage/lcov.info` as artifact for SonarCloud job

## Test file inventory

| File | Type | Focus |
|------|------|-------|
| `setup.js` | Fixture | DB reset, factories (`createUser`, `createTrip`, `createStage`, `createActivity`) |
| `auth.test.js` | Integration | Register, login, verify |
| `trips.test.js` | Integration | Trip CRUD |
| `stages.test.js` | Integration | Stages, merge |
| `activities.test.js` | Integration | Activities, timeline |
| `import.test.js` | Integration | ICS + CSV import |
| `users-profile.test.js` | Integration | Profile update, password change |
| `login.test.js` | Integration | Legacy login router (isolated) |
| `ai-service.test.js` | Unit | Pattern parsing |
| `csv-import-helpers.test.js` | Unit | CSV parsing |
| `ics-import-helpers.test.js` | Unit | ICS parsing |
| `activity-update-helpers.test.js` | Unit | Hotel date logic |
| `log-sanitizer.test.js` | Unit | URL redaction |
| `logger.test.js` | Unit | Logger API |
| `middleware.test.js` | Unit | Token extractor |
| `list_helper.test.js` | Unit | Legacy helper |

Shared fixtures (e.g. sample CSV) may live in repository root `tests/` and are referenced from backend tests.

## Writing new tests

### Integration test pattern

```javascript
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const app = require('../app')
const { resetDatabase, createUser } = require('./setup')

before(async () => { await resetDatabase() })
after(async () => { /* cleanup if needed */ })

test('GET /api/trips returns empty list', async () => {
  const user = await createUser()
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ username: user.username, password: 'secret' })
  const res = await agent.get('/api/trips')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body))
})
```

### Guidelines

1. **Reset DB** in `before` hooks when tests mutate shared tables.
2. **Use factories** from `setup.js`; include required fields (`countryId` for stages).
3. **Avoid OpenAI** in CI — mock or test pattern-only paths in `ai-service`.
4. **No secrets in assertions** — do not log passwords or connection strings.
5. **Prefer unit tests** for new pure helpers before adding heavy integration coverage.

## SonarCloud integration

```mermaid
flowchart LR
  BE[Backend job\ntest:coverage]
  ART[coverage/lcov.info artifact]
  FE[Frontend lint:report]
  SC[SonarCloud scan]
  QG{Quality Gate}

  BE --> ART
  ART --> SC
  FE --> SC
  SC --> QG
```

Key settings (`sonar-project.properties`):

- Monorepo sources: backend + frontend
- LCOV path: `travelmgr-backend/coverage/lcov.info`
- Frontend and generated files excluded from coverage where appropriate
- **`sonar.qualitygate.wait=true`** in CI — pipeline fails if gate fails

### Common quality gate failures

| Symptom | Typical fix |
|---------|-------------|
| Coverage below threshold | Add tests for uncovered branches in controllers/utils |
| Security hotspot | Review Sonar issue; use secure logger, redact URLs |
| Code smell | ESLint fix or refactor per Sonar suggestion |
| Duplication | Extract shared helper (imports, activity updates) |

## Frontend testing (current state)

CI validates:

```bash
npm run lint
npm run tsc
npm run build
```

There is **no Vitest/Jest** suite yet. Recommended next step: component tests for critical dialogs (import, merge stages) or Playwright smoke tests against staging.

## Local pre-push checklist

```bash
cd "travelmgr-backend"
npm run lint
npm run test:coverage

cd "../travelmgr-frontend"
npm run lint
npm run tsc
npm run build
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` PostgreSQL | Start local Postgres; verify `TEST_DATABASE_URL` |
| Flaky parallel failures | Tests already run with concurrency 1; check for missing `resetDatabase` |
| Stage creation fails | Ensure `countryId` is set in test data |
| Coverage missing in Sonar | Confirm artifact upload and `lcov.info` path in workflow |
