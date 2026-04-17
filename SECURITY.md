# Security

This repository is shared as-is for entertainment and transparency.

- Do not contact `support@yaniv.games` about repository changes.
- If you want to propose a fix, open a GitHub PR.
- If you want to discuss a problem before fixing it, open a GitHub issue with only the level of detail you are comfortable sharing publicly.

## Deployment guidance

- Use your own Cloudflare account, D1 database, KV namespace, and analytics dataset for forks.
- Review and set `ALLOWED_ORIGINS` before exposing a public deployment.
- If you later add privileged auth flows, keep them separate from the guest nickname session path.
