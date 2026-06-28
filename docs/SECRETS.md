# Secrets & sensitive data

## Never commit

| Item | Where it belongs |
|------|------------------|
| `.env`, `.dev.vars` | Local only (gitignored) |
| `BREVO_API_KEY` | Cloudflare **Variables and secrets** (encrypted) |
| `CONTACT_*` emails | Cloudflare secrets |
| GA4 / Giscus / Brevo **real** IDs | Cloudflare variables (build-time `PUBLIC_*`) |
| API tokens, SSH keys, `.pem` | Never in repo |

## Safe in git

- `.env.example` — placeholders only (`G-XXXXXXXXXX`, empty secret names)
- `wrangler.toml` — binding **names** only, no values
- `PUBLIC_*` in docs as examples

## Before every push

```bash
npm run check:secrets
```

GitHub **secret scanning** is enabled on `hellodk/cfpages`.

## Contact form

`/api/contact` requires `BREVO_API_KEY` and `CONTACT_TO_EMAIL` from the Cloudflare dashboard. No inbox address is hardcoded in source.

## If you accidentally committed a secret

1. Rotate/revoke the credential immediately (Brevo, GitHub, etc.)
2. Remove it from the repo and push a fix
3. If it reached GitHub, consider [removing from history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) or use GitHub’s secret scanning alert workflow
