# Security

If you discover a vulnerability, please avoid opening a public issue with exploit details.

- Contact: `support@yaniv.games`
- Include: reproduction steps, impact, and any relevant logs or request samples

## Deployment guidance

- Use your own Cloudflare account, D1 database, KV namespace, and analytics dataset for forks.
- Review and set `ALLOWED_ORIGINS` before exposing a public deployment.
- If you later add privileged auth flows, keep them separate from the guest nickname session path.
