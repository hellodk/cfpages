# Cloudflare API token for Git deploy

Deploy fails with **`Authentication error [code: 10000]`** when the build token cannot access Pages — even if your user is Super Admin. The **API token scopes** are separate from your dashboard role.

## Fix (5 minutes)

### 1. Create a new token

1. Open [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token** → **Create Custom Token**

| Field | Value |
|-------|--------|
| Token name | `cfpages-git-deploy` |
| Account resources | Include → **hellodk** |
| Account permissions | **Cloudflare Pages** → **Edit** |
| | **Workers Scripts** → **Edit** (required for `/api/*` Functions) |
| | **Workers AI** → **Read** (optional, for chat binding) |
| User permissions | **User Details** → **Read** (wrangler `whoami`) |

3. **Continue to summary** → **Create Token**
4. Copy the token once (you won’t see it again)

### 2. Add to the Cloudflare build environment

**Workers & Pages → cfpages → Settings → Variables and secrets**

Add as **encrypted** secrets (Production + Preview):

| Name | Value |
|------|--------|
| `CLOUDFLARE_API_TOKEN` | *(paste new token — no quotes, no spaces)* |
| `CLOUDFLARE_ACCOUNT_ID` | `d78f7ab0a83aeb09e9d06ad8dc6757c3` |

Also update the project’s **API token** field (build configuration) if it uses a separate “cfpages build token” — replace it with this new token or ensure that token has the same permissions above.

### 3. Build settings checklist

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Deploy command | `npm run cf:deploy` |
| Build output directory | `dist` |
| Version command | *(leave empty if optional — not needed for Pages)* |

### 4. Retry deployment

**Deployments → Retry deployment**

---

## Verify token locally (optional)

```bash
export CLOUDFLARE_API_TOKEN="your-token"
curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | head -c 200
```

Should return `"status": "active"`.

---

## Still failing?

1. **No whitespace** in the token when pasted into CF dashboard
2. **Delete build cache** — Settings → Build cache → Clear cache
3. Token must be for account **hellodk** (`d78f7ab0a83aeb09e9d06ad8dc6757c3`), not a personal zone-only token
4. Project name must be **`cfpages`** (matches `wrangler.toml` and `--project-name`)

See also [DEPLOY-AND-SECURITY.md](./DEPLOY-AND-SECURITY.md).
