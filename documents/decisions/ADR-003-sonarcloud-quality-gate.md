# ADR-003: SonarCloud Quality Gate in CI

## Status

Accepted

## Date

2026-07-07

## Context

The project needed automated code quality and security checks beyond ESLint:

- Enforce minimum **test coverage** on backend code.
- Detect security hotspots (logging secrets, Docker root user, user-controlled log data).
- Block merges when quality regresses.

SonarCloud integrates with GitHub and supports monorepo analysis with LCOV coverage import.

Alternatives considered:

1. **ESLint only in CI** — no coverage gate or security rules beyond plugins.
2. **Codecov + separate SAST** — multiple tools to maintain.
3. **SonarCloud with Quality Gate wait** — single dashboard, fails CI on gate failure.

## Decision

Add a **`sonarcloud` job** in `.github/workflows/ci.yml` that:

1. Depends on backend and frontend jobs.
2. Downloads backend `coverage/lcov.info` artifact.
3. Runs ESLint JSON reports for both packages.
4. Executes SonarCloud scan with:
   - `sonar.qualitygate.wait=true`
   - `sonar.qualitygate.timeout=300`

Configure analysis in root `sonar-project.properties` (sources, exclusions, LCOV path).

Target: **≥ 83% coverage** on included backend code (per SonarCloud project settings).

Complement Sonar with secure coding practices:

- Dedicated `logger.js` API instead of logging arbitrary objects.
- `log-sanitizer.js` for connection URL redaction.

## Consequences

### Positive

- PRs cannot merge (when branch protection enabled) if Quality Gate fails.
- Security and maintainability issues visible in SonarCloud dashboard.
- Coverage trend tracked over time.

### Negative

- CI runtime increases (Sonar scan + artifact handoff).
- Requires `SONAR_TOKEN` and `SONAR_ORGANIZATION` secrets.
- Frontend lacks unit tests — coverage metric reflects backend only; Sonar still analyzes frontend for smells.

### Follow-ups

- Add frontend tests or exclude non-tested frontend paths explicitly if noise increases.
- Document troubleshooting in [04-testing-strategy.md](../04-testing-strategy.md).
