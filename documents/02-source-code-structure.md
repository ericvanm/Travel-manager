# Source Code Structure

## Repository layout

```
Travel-manager/
├── README.md                 # Project overview (links to documents/)
├── documents/                # Project documentation (this folder)
├── render.yaml               # Render Blueprint (API + PostgreSQL)
├── sonar-project.properties  # SonarCloud analysis config
├── .github/workflows/ci.yml  # CI: backend tests, frontend build, SonarCloud
├── tests/                    # Shared test fixtures (e.g. sample CSV)
├── travelmgr-backend/        # Node.js / Express API
└── travelmgr-frontend/       # React / Vite SPA
```

## Backend (`travelmgr-backend/`)

```
travelmgr-backend/
├── index.js              # HTTP server entry (listen on PORT)
├── app.js                # Express app: middleware, routes, DB connect
├── cli.js                # CLI utilities (optional)
├── run-migration.js      # Standalone migration runner
├── Dockerfile            # Production container (non-root user)
├── dev.Dockerfile        # Development container
├── package.json
├── .env.example
├── controllers/          # Route handlers (Express routers)
├── models/
│   └── DBmodels.js       # Sequelize models + associations
├── migrations/           # Umzug migration scripts (ordered by filename)
├── utils/                # Shared backend logic
└── tests/                # Automated tests (*.test.js)
```

### Controllers (active routes)

Mounted in `app.js`:

| File | Mount path | Responsibility |
|------|------------|----------------|
| `users.js` | `/api/auth` | Login, register, profile, logout, verify |
| `trips.js` | `/api/trips` | Trip CRUD, CSV import |
| `stages.js` | `/api/stages` | Stage CRUD, merge |
| `activities.js` | `/api/activities` | Activity CRUD, timeline, duplicates, structure-trip |
| `countries.js` | `/api/countries` | Country list with translations |
| `languages.js` | `/api/languages` | Language reference CRUD |
| `activityTypes.js` | `/api/activity-types` | Activity type reference |
| `transportTypes.js` | `/api/transport-types` | Transport types |
| `accommodationTypes.js` | `/api/accommodation-types` | Accommodation types |
| `expenseCategories.js` | `/api/expense-categories` | Expense categories |
| `notificationTypes.js` | `/api/notification-types` | Notification types |
| `import.js` | `/api/import` | ICS trip import |
| `ai-import.js` | `/api/ai-import` | Document upload + AI/pattern analysis |
| `ai-planning.js` | `/api/ai-planning` | AI trip planning wizard (form → synthesis → itinerary → create trip) |

**Legacy (not mounted):** `controllers/unused/` (blogs, authors, etc.), standalone `login.js` (superseded by `users.js`).

### Utils

| Module | Purpose |
|--------|---------|
| `db.js` | Sequelize connection, Umzug migrations on connect |
| `config.js` | Environment config, safe DB log context |
| `middleware.js` | Request logger, error handler, token/session extractor |
| `logger.js` | Secure logging API (`info`, `infoWithCounts`, `infoWithContext`, `error`) |
| `log-sanitizer.js` | Redact secrets and connection URLs in logs |
| `ics-import-helpers.js` | Parse ICS, map events → activities/stages |
| `csv-import-helpers.js` | Parse CSV export format, hotel grouping |
| `activity-update-helpers.js` | Hotel date sync, grouped activity updates |
| `ai-service.js` | Pattern-based and optional OpenAI reservation parsing |
| `ai-planning-service.js` | Form validation, synthesis, itinerary generation (OpenAI + fallback) |
| `list_helper.js` | Legacy blog statistics (course demo code) |

### Tests

```
tests/
├── setup.js                    # DB reset, factories (user, trip, stage, activity)
├── auth.test.js                # Auth API integration
├── trips.test.js               # Trips API integration
├── stages.test.js              # Stages + merge
├── activities.test.js          # Activities + timeline
├── import.test.js              # ICS + CSV import
├── users-profile.test.js       # Profile + password
├── login.test.js               # Legacy login router (isolated)
├── ai-service.test.js          # Unit
├── ai-planning-service.test.js # Unit (form validation, synthesis)
├── csv-import-helpers.test.js  # Unit
├── ics-import-helpers.test.js  # Unit
├── activity-update-helpers.test.js
├── log-sanitizer.test.js
├── logger.test.js
├── middleware.test.js
└── list_helper.test.js
```

## Frontend (`travelmgr-frontend/`)

```
travelmgr-frontend/
├── index.html
├── vite.config.ts
├── vercel.json
├── package.json
├── src/
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Auth gate, trip list / detail routing
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── constants.ts
│   ├── translations.ts       # i18n strings (en, fr, es, nl)
│   ├── utils.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── CountriesContext.tsx
│   │   └── LanguageContext.tsx
│   ├── services/
│   │   ├── auth.ts           # Axios instance + auth API
│   │   ├── ai-planning.ts    # AI trip planning API
│   │   └── trips.ts          # Trip/stage/activity API calls
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── UserProfile.tsx
│   │   ├── AIDocumentImport.tsx
│   │   ├── AITripPlanning/     # AI trip planning wizard
│   │   ├── TripList/         # List, dialogs, CSV export, import
│   │   └── TripDetail/       # Stages, activities, timeline, merge
│   └── utils/
│       └── dateTimeInputHelpers.ts
└── dist/                     # Production build output (generated)
```

### UI module map

```mermaid
flowchart TB
  App[App.tsx]
  Auth[AuthContext]
  Lang[LanguageContext]
  Countries[CountriesContext]

  App --> Auth
  App --> Lang
  App --> Countries

  App --> Login
  App --> Register
  App --> TripList
  App --> TripDetail

  TripList --> TripDialog
  TripList --> ImportDialog
  TripList --> TripActionsMenu

  TripDetail --> StageDialog
  TripDetail --> ActivityDialog
  TripDetail --> MergeStagesDialog
  TripDetail --> AIDocumentImport
  TripList --> AITripPlanning
  TripDetail --> TimelineActivityRow
```

### Frontend ↔ backend communication

- Base URL: `import.meta.env.VITE_BACKEND_URL` (default `http://localhost:3001/api`).
- All API calls use cookies (`withCredentials: true`).
- Types in `types.ts` mirror API JSON shapes.

## Cross-cutting configuration

| File | Scope |
|------|--------|
| `sonar-project.properties` | SonarCloud sources, exclusions, LCOV path |
| `.github/workflows/ci.yml` | Backend job, frontend job, SonarCloud job |
| `render.yaml` | Production backend + database |
| `travelmgr-frontend/vercel.json` | SPA build and rewrites |

## Naming conventions

| Element | Convention |
|---------|------------|
| Backend files | `camelCase.js` or `kebab-case` for multi-word helpers |
| React components | `PascalCase.tsx` |
| Tests | `*.test.js` under `travelmgr-backend/tests/` |
| Migrations | `YYYYMMDD_NN_description.js` |
| API routes | kebab-case path segments (`/api/activity-types`) |

## Code to avoid in new features

- Do not mount or extend `controllers/unused/` without explicit cleanup plan.
- Prefer `utils/logger.js` over raw `console.log` for application logs.
- Add tests alongside new helpers (`tests/<module>.test.js`) or integration tests for new routes.
