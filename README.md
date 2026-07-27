# Travel Manager

Full-stack web application for planning trips: stages, activities, calendar imports (ICS/CSV), optional AI document import, and **AI-assisted trip planning** from user preferences.

## Quick links

| Resource | Location |
|----------|----------|
| **Full documentation** | [`documents/README.md`](documents/README.md) |
| **Developer tools (PowerShell)** | [`tools/README.md`](tools/README.md) |
| **VS Code / Cursor workspace** | [`Travel-manager.code-workspace`](Travel-manager.code-workspace) |
| Architecture | [`documents/01-architecture.md`](documents/01-architecture.md) |
| Developer guide | [`documents/05-developer-guide.md`](documents/05-developer-guide.md) |
| Deployment | [`documents/06-deployment.md`](documents/06-deployment.md) |
| API reference | [`documents/07-api-reference.md`](documents/07-api-reference.md) |
| Changelog | [`documents/CHANGELOG.md`](documents/CHANGELOG.md) |
| Security | [`SECURITY.md`](SECURITY.md) |
<<<<<<< Updated upstream
=======
| Contributing | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Code of Conduct | [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) |

## GitHub repository metadata (suggested)

When publishing or refreshing the repo **About** section:

- **Description:** Full-stack trip planner — React, Node, PostgreSQL, ICS/CSV import, optional OpenAI planning.
- **Topics:** `travel`, `trip-planner`, `react`, `typescript`, `nodejs`, `express`, `postgresql`, `sequelize`, `openai`, `material-ui`
- **Website:** your Vercel or demo URL (optional)

## Demo / live instance

Replace with your deployment URLs when available:

| Component | URL |
|-----------|-----|
| Frontend (example) | `https://YOUR_APP.vercel.app` |
| API (example) | `https://YOUR_API.onrender.com/api/health` |

Self-hosters: follow [deployment](documents/06-deployment.md). Any fresh database ships with user `admin` and **no password** until first login — set credentials before exposing the app.
>>>>>>> Stashed changes

## Stack

- **Backend:** Node.js, Express, Sequelize, PostgreSQL (`travelmgr-backend/`)
- **Frontend:** React, TypeScript, Vite, Material UI (`travelmgr-frontend/`)
- **CI / quality:** GitHub Actions, ESLint, SonarCloud (Node **20** LTS, aligned with production Docker images)
- **Production (default):** Render (API + database), Vercel (frontend)
- **On-demand alternate:** GCP — Firebase Hosting + Cloud Run + Cloud SQL (see [deployment](documents/06-deployment.md#gcp-on-demand-firebase-hosting--cloud-run--cloud-sql))

## Local development (summary)

```bash
# Backend
cd "travelmgr-backend"
cp .env.example .env   # configure DATABASE_URL, SECRET
npm ci
npm run dev            # http://localhost:3001

# Frontend (separate terminal)
cd "travelmgr-frontend"
npm ci
npm run dev            # http://localhost:5173
```

Set `VITE_BACKEND_URL=http://localhost:3001/api` for the frontend. See the [developer guide](documents/05-developer-guide.md) for details.

### Docker (dev stack)

```powershell
docker compose -f docker-compose.dev.yml up -d
# Rebuild after Dockerfile changes:
.\tools\rebuild-docker.ps1
# Reset database to empty:
.\tools\reset-database.ps1 -Force
```

See [`tools/README.md`](tools/README.md) for script options.

## Tests

```bash
# Backend (PostgreSQL required)
cd "travelmgr-backend"
npm test
npm run test:coverage

# Frontend (Vitest, no database)
cd "travelmgr-frontend"
npm test
```

Backend tests need `TEST_DATABASE_URL` (see `.env.example`).

## Default admin account

After migrations on an **empty** database, user **`admin`** exists with **no password** until you set one at first login (`must_set_password`). Do this immediately on any shared or internet-facing deployment. Details: [SECURITY.md](SECURITY.md).

## License

ISC — see [LICENSE](LICENSE).
