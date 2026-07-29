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

- Set a strong, unique `SECRET` (session signing).
- Use HTTPS everywhere; cross-origin cookies require `secure` + `SameSite=None` when frontend and API are on different hosts.
- Change the default **`admin`** account password on first login (see [README](README.md#default-admin-account)).
- Restrict `CORS_ORIGINS` to your exact frontend URL(s). Production also allows `*.vercel.app` and `*.onrender.com` suffixes for convenience — tighten this if you run a multi-tenant or high-risk deployment.
- Keep PostgreSQL credentials in secrets (Render, GCP, etc.), never in the repository.
- Rotate credentials if you suspect exposure; scan git history before making a fork public if `.env` was ever committed.

## Secrets in git

- `.env` files are gitignored. Never commit `DATABASE_URL`, `SECRET`, API keys, or GCP/Render tokens.
- Before publishing the repository, run a secret scan on history (e.g. [gitleaks](https://github.com/gitleaks/gitleaks), [trufflehog](https://github.com/trufflesecurity/trufflehog)).

## Default admin account

Migrations seed user `admin` with **no password** until first login forces a password change (`must_set_password`). Treat fresh databases as **compromised until the admin password is set**, especially on internet-exposed deployments.

## Before making the repository public

Use this checklist on the default branch:

* [ ] Secret scan on full git history ([gitleaks](https://github.com/gitleaks/gitleaks) or [trufflehog](https://github.com/trufflesecurity/trufflehog)) — last automated note: 2026-07-27, no leaks reported
- [ ] GitHub **Private vulnerability reporting** enabled
- [ ] Repository **About** filled (description, topics, optional demo URL)
- [ ] Production deployments: `SECRET`, DB credentials, and `OPENAI_API_KEY` only in host secrets
- [ ] Default **admin** password set on any internet-facing database
- [ ] `ALLOW_REGISTRATION` reviewed for your deployment model
- [ ] Dependabot security updates monitored (resolve or document accepted risks)
