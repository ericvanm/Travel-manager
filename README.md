# Travel Manager

Full-stack web application for planning trips: stages, activities, calendar imports (ICS/CSV), optional AI document import, and **AI-assisted trip planning** from user preferences.

## Quick links

| Resource | Location |
|----------|----------|
| **Full documentation** | [`documents/README.md`](documents/README.md) |
| Architecture | [`documents/01-architecture.md`](documents/01-architecture.md) |
| Developer guide | [`documents/05-developer-guide.md`](documents/05-developer-guide.md) |
| Deployment | [`documents/06-deployment.md`](documents/06-deployment.md) |
| API reference | [`documents/07-api-reference.md`](documents/07-api-reference.md) |
| Changelog | [`documents/CHANGELOG.md`](documents/CHANGELOG.md) |

## Stack

- **Backend:** Node.js, Express, Sequelize, PostgreSQL (`travelmgr backend/`)
- **Frontend:** React, TypeScript, Vite, Material UI (`travelmgr frontend/`)
- **CI / quality:** GitHub Actions, ESLint, SonarCloud
- **Production:** Render (API + database), Vercel (frontend)

## Local development (summary)

```bash
# Backend
cd "travelmgr backend"
cp .env.example .env   # configure DATABASE_URL, SECRET
npm ci
npm run dev            # http://localhost:3001

# Frontend (separate terminal)
cd "travelmgr frontend"
npm ci
npm run dev            # http://localhost:5173
```

Set `VITE_BACKEND_URL=http://localhost:3001/api` for the frontend. See the [developer guide](documents/05-developer-guide.md) for details.

## Tests

```bash
cd "travelmgr backend"
npm test
npm run test:coverage
```

Requires a running PostgreSQL instance and `TEST_DATABASE_URL` (see `.env.example`).

## License

ISC (see package manifests).
