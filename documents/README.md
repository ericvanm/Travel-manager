# Travel Manager — Documentation Index

Central documentation for the Travel Manager monorepo. All documents are written in **English**.

## Audiences

| Audience | Start here |
|----------|------------|
| New developer | [05-developer-guide.md](05-developer-guide.md) → [02-source-code-structure.md](02-source-code-structure.md) |
| Architect / tech lead | [01-architecture.md](01-architecture.md) → [decisions/](decisions/) |
| QA / CI maintainer | [04-testing-strategy.md](04-testing-strategy.md) |
| DevOps / deployment | [06-deployment.md](06-deployment.md) |
| API consumer | [07-api-reference.md](07-api-reference.md) |

## Document map

| # | Document | Description |
|---|----------|-------------|
| 01 | [Architecture](01-architecture.md) | System design, stack, deployment topology, main flows |
| 02 | [Source code structure](02-source-code-structure.md) | Monorepo layout, backend and frontend modules |
| 04 | [Testing strategy](04-testing-strategy.md) | Unit vs integration tests, CI, SonarCloud coverage |
| 05 | [Developer guide](05-developer-guide.md) | Local setup, env vars, scripts, troubleshooting |
| 06 | [Deployment](06-deployment.md) | Render, Vercel, Docker, environment variables |
| 07 | [API reference](07-api-reference.md) | REST endpoints, auth, request/response examples |

## Additional artifacts

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Notable project changes |
| [decisions/](decisions/) | Architecture Decision Records (ADRs) |
| [tools/README.md](../tools/README.md) | PowerShell scripts (DB reset, Docker rebuild) |

## Planned documentation (future)

These were scoped but not written in the first batch:

- **03-user-manual.md** — End-user guide (trips, imports, profile)
- **08-database.md** — ER diagram, migrations, reference data
- **09-security-and-quality.md** — Security controls, SonarCloud, CI gates
- **10-contribution-and-conventions.md** — Git workflow, code style, Definition of Done

## Conventions

- Diagrams use [Mermaid](https://mermaid.js.org/) embedded in Markdown.
- API paths are relative to `/api` unless stated otherwise.
- File paths use forward slashes from the repository root.

## Repository root

The [root README](../README.md) provides a short project overview and quick-start commands.
