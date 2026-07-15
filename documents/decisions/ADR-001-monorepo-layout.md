# ADR-001: Monorepo layout

## Status

Accepted

## Date

2026-07-07

## Context

Travel Manager consists of a Node.js API and a React SPA that release together. We needed a repository structure that:

- Keeps frontend and backend in sync for features (imports, auth, trip model).
- Allows a single CI pipeline and SonarCloud project for the whole product.
- Supports independent deployment (Render for API, Vercel for static frontend).

Alternatives considered:

1. **Two repositories** — simpler permissions per team, but harder to coordinate API/UI changes.
2. **Monorepo with shared packages** — useful if types/utils are shared; adds tooling cost for a small team.
3. **Monorepo with sibling folders** — minimal tooling, clear separation.

## Decision

Use a **monorepo** with two top-level application folders:

- `travelmgr backend/` — Express API, Sequelize, tests
- `travelmgr frontend/` — React, Vite, TypeScript

Shared configuration at repository root:

- `render.yaml`, `.github/workflows/ci.yml`, `sonar-project.properties`
- Documentation in `documents/`

Folder names retain a space (historical); CI and deployment reference them explicitly via `working-directory` and `rootDir`.

## Consequences

### Positive

- One PR can update API contract and UI together.
- Single SonarCloud project with combined quality view.
- Blueprint and CI live beside the code they deploy.

### Negative

- Path names with spaces require quoting in shell commands.
- No shared TypeScript types package — frontend `types.ts` must be updated manually when API shapes change.

### Follow-ups

- Consider npm workspaces or a `packages/shared-types` package if API surface grows significantly.
- Document folder conventions in [02-source-code-structure.md](../02-source-code-structure.md).
