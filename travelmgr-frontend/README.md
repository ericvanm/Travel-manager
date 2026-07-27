# Travel Manager — Frontend

React 18 + TypeScript + Vite + Material UI SPA for the Travel Manager monorepo.

## Commands

```bash
npm ci
npm run dev          # http://localhost:5173
npm run lint
npm test             # Vitest unit tests
npm run tsc
npm run build
```

## Environment

| Variable | Purpose |
|----------|----------|
| `VITE_BACKEND_URL` | API base URL (default dev: `http://localhost:3001/api`) |

Copy from `.env.example` if present, or set in the shell before `npm run dev`.

## Documentation

- Monorepo overview: [../README.md](../README.md)
- Developer guide: [../documents/05-developer-guide.md](../documents/05-developer-guide.md)
- Source layout: [../documents/02-source-code-structure.md](../documents/02-source-code-structure.md)

## Docker

From repository root:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Vite dev server is exposed on port **5173** in the dev compose file.
