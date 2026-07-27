# Travel Manager — Documentation Index

Central documentation for the Travel Manager monorepo. All documents are written in **English**.

## Audiences

| Audience | Start here |
|----------|------------|
| New developer | [05-developer-guide.md](05-developer-guide.md) → [02-source-code-structure.md](02-source-code-structure.md) |
| Architect / tech lead | [01-architecture.md](01-architecture.md) → [decisions/](decisions/) |
| QA / CI maintainer | [04-testing-strategy.md](04-testing-strategy.md) |
| DevOps / deployment | [06-deployment.md](06-deployment.md) |
| Security / responsible disclosure | [../SECURITY.md](../SECURITY.md) |
| API consumer | [07-api-reference.md](07-api-reference.md) |

## Document map

| # | Document | Description |
|---|----------|-------------|
| 01 | [Architecture](01-architecture.md) | System design, stack, deployment topology, main flows |
| 02 | [Source code structure](02-source-code-structure.md) | Monorepo layout, backend and frontend modules |
| 04 | [Testing strategy](04-testing-strategy.md) | Unit vs integration tests, CI, SonarCloud coverage |
| 05 | [Developer guide](05-developer-guide.md) | Local setup, env vars, scripts, troubleshooting |
| 06 | [Deployment](06-deployment.md) | Render, Vercel, Docker, GCP on-demand (Firebase + Cloud Run + Cloud SQL) |
| 07 | [API reference](07-api-reference.md) | REST endpoints, auth, request/response examples |
| 08 | [AI integration](08-ai-integration.md) | AI workflows, OpenAI setup, prompt configuration, logging and fallbacks |
| 09 | [AI document import](09-ai-document-import.md) | Reservation upload, extraction, analyze/execute API |
| — | [Trip consistency rules](trip-consistency-rules.md) | Health/budget rules, error codes, timezone behavior |

## Additional artifacts

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Notable project changes |
| [RELEASE-v1.1.0.md](RELEASE-v1.1.0.md) | Draft release notes for the next tagged version |
| [decisions/](decisions/) | Architecture Decision Records (ADRs) |
| [archive/](archive/) | Non-English or superseded docs (e.g. French trip rules) |
| [tools/README.md](../tools/README.md) | PowerShell scripts (DB reset, Docker rebuild, GCP start/stop/deploy) |
| [../docs/archive/](../docs/archive/) | Legacy diagram exports (not maintained) |

## Planned documentation (future)

- **03-user-manual.md** — End-user guide (trips, imports, profile)
- **08-database.md** — ER diagram, migrations, reference data
- **09-security-and-quality.md** — Expanded security controls and quality gates (see also root [SECURITY.md](../SECURITY.md))

## Conventions

- Diagrams use [Mermaid](https://mermaid.js.org/) embedded in Markdown.
- API paths are relative to `/api` unless stated otherwise.
- File paths use forward slashes from the repository root.

## Repository root

The [root README](../README.md) provides a short project overview and quick-start commands.

​
