# ADR-002: Session-based authentication

## Status

Accepted

## Date

2026-07-07

## Context

The SPA needs authenticated access to REST endpoints. Requirements:

- Works with browser clients on a **different origin** (Vercel frontend, Render API).
- Avoids storing long-lived tokens in `localStorage` (XSS risk).
- Supports existing login/register flows in the React app.

Alternatives considered:

1. **JWT in Authorization header only** — SPA must store token; refresh flow needed.
2. **OAuth / third-party IdP** — heavy for current scope.
3. **Server-side sessions with httpOnly cookies** — familiar Express pattern; works with `withCredentials`.

The codebase also stores a JWT in the session after login for `verifyToken` middleware compatibility.

## Decision

Use **`express-session`** with:

- **Development / test:** default memory store (or no PostgreSQL session table in test).
- **Production:** **`connect-pg-simple`** store backed by the same PostgreSQL database.

Cookie settings in production:

- `httpOnly: true`
- `secure: true`
- `sameSite: 'none'` (required for cross-site cookies Vercel → Render)

CORS configured with `credentials: true` and explicit allowed origins plus Vercel/Render suffix rules.

Auth routes live under `/api/auth` in `controllers/users.js`.

## Consequences

### Positive

- Frontend uses axios `withCredentials: true` without custom token storage.
- Sessions can be invalidated server-side (logout destroys session).
- PostgreSQL session store survives API restarts on Render.

### Negative

- Cross-origin cookie setup is fragile — misconfigured `CORS_ORIGINS` breaks login.
- Session store adds DB table and connection usage.
- Dual auth paths in middleware (session user + JWT in session) add complexity.

### Follow-ups

- Consolidate on one verification path if legacy JWT-in-session can be simplified.
- Document cookie requirements in [06-deployment.md](../06-deployment.md).
