# Travel Manager — Backend API

Express + Sequelize + PostgreSQL API for the Travel Manager monorepo.

## Requirements

- Node.js **20+**
- PostgreSQL **15+**

## Setup

```bash
npm ci
cp .env.example .env   # if present; configure DATABASE_URL, SECRET, etc.
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Nodemon development server |
| `npm run start` | Production start |
| `npm run lint` | ESLint |
| `npm run test` | Node test runner (requires test DB) |

Migrations run automatically on startup via Umzug (`utils/db.js`).

See [documents/05-developer-guide.md](../documents/05-developer-guide.md) and [documents/07-api-reference.md](../documents/07-api-reference.md).
