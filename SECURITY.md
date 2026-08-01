# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` branch | Yes |
| Older tags | Best effort |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

1. Use [GitHub private vulnerability reporting](https://github.com/ericvanm/Travel-manager/security/advisories/new) if enabled, **or**
2. Contact the maintainer via the email on their GitHub profile with:
   - Description and impact
   - Steps to reproduce
   - Affected component (frontend, API, deployment)

We aim to acknowledge reports within a few business days.

## Deployment hardening (self-hosted)

If you deploy Travel Manager yourself:

- Set a strong, unique `SECRET` (session signing). Production startup **fails** if `SECRET` is missing or shorter than 16 characters.
- Use HTTPS everywhere; cross-origin cookies require `secure` + `SameSite=None` when frontend and API are on different hosts.
- Change the default **`admin`** account password on first login (see [README](README.md#default-accounts)).
- Restrict `CORS_ORIGINS` to your exact frontend URL(s). By default, production also allows `*.vercel.app` and `*.onrender.com` suffixes — set `CORS_ALLOW_HOSTED_SUFFIXES=false` for locked-down deployments.
- Review `ALLOW_REGISTRATION` (off by default when `NODE_ENV=production`).
- If you want the public **demo** account, set `DEMO_USER_PASSWORD` in production secrets. Without it, the demo user is **not** seeded in production (local/test still default to `DemoUser1!` when unset).
- Keep PostgreSQL credentials in secrets (Render, GCP, etc.), never in the repository.
- Rotate credentials if you suspect exposure; scan git history before making a fork public if `.env` was ever committed.

## Secrets in git

- `.env` files are gitignored. Never commit `DATABASE_URL`, `SECRET`, API keys, or GCP/Render tokens.
- Before publishing the repository, run a secret scan on history (e.g. [gitleaks](https://gitleaks.io/) or [trufflehog](https://github.com/trufflesecurity/trufflehog)).

## Default accounts

### Admin

Migrations seed user `admin` with **no password** until first login forces a password change (`must_set_password`). Treat fresh databases as **compromised until the admin password is set**, especially on internet-exposed deployments.

### Demo (read-only)

Migrations ensure user `demo` (read-only, no password reset, empty email) when a password is available:

| Environment | Behavior |
|-------------|----------|
| Non-production | Password from `DEMO_USER_PASSWORD`, or default `DemoUser1!` |
| Production | Seeded **only** if `DEMO_USER_PASSWORD` is set |

Rotate the demo password on any internet-facing demo database.

## Before making the repository public

Use this checklist on the default branch:

- [x] Secret scan on full git history ([gitleaks](https://gitleaks.io/) or [trufflehog](https://github.com/trufflesecurity/trufflehog)) — 2026-08-01, gitleaks: no leaks found
- [ ] GitHub **Private vulnerability reporting** enabled (Settings → Code security → Private vulnerability reporting)
- [ ] Repository **About** filled (description, topics, optional demo URL)
- [ ] Production deployments: `SECRET`, DB credentials, and `OPENAI_API_KEY` only in host secrets
- [ ] Default **admin** password set on any internet-facing database
- [ ] `ALLOW_REGISTRATION` reviewed for your deployment model
- [ ] `DEMO_USER_PASSWORD` set (or demo intentionally omitted) on production
- [ ] Dependabot security updates monitored (resolve or document accepted risks)
