# Architecture Decision Records

This folder contains **Architecture Decision Records (ADRs)** for Travel Manager.

## Format

Each ADR follows a lightweight template:

- **Status** — Proposed, Accepted, Deprecated, Superseded
- **Context** — Problem or forces at play
- **Decision** — What we chose
- **Consequences** — Trade-offs and follow-ups

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-monorepo-layout.md) | Monorepo with separate backend and frontend packages | Accepted |
| [ADR-002](ADR-002-session-authentication.md) | Session-based authentication with PostgreSQL session store | Accepted |
| [ADR-003](ADR-003-sonarcloud-quality-gate.md) | SonarCloud Quality Gate on main branch CI | Accepted |

## Creating a new ADR

1. Copy the template from an existing ADR.
2. Number sequentially: `ADR-00N-short-title.md`.
3. Set status to **Proposed** until reviewed.
4. Link the ADR from this index and from [01-architecture.md](../01-architecture.md) if relevant.

## References

- [Document index](../README.md)
- [Architecture](../01-architecture.md)
