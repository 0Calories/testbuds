# Deploying Testbuds to Fly.io

Single-app deploy: one Docker container running Next.js + worker + Caddy (reverse proxy), one persistent volume for the SQLite DB and rrweb archives, one public hostname.

Target URL after deploy: `https://testbuds.fly.dev`

## Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed: `brew install flyctl`
- A Fly.io account with a payment method on file (required even for free tier)
- An Anthropic API key

## First-time setup

```bash
# 1. Authenticate
fly auth login

# 2. Create the app (uses the name from fly.toml — must be globally unique)
fly apps create testbuds

# 3. Create the persistent volume in the same region as the app
fly volumes create testbuds_data --size 1 --region iad

# 4. Set secrets
fly secrets set ANTHROPIC_API_KEY="<your-key-here>"

# 5. Deploy
fly deploy
```

The first deploy takes ~5–10 minutes (Docker build, Chromium-base image pull). Subsequent deploys cache the heavy layers and finish in ~1–3 minutes.

When `fly deploy` finishes, your app is live at `https://testbuds.fly.dev`.

## What's running inside the container

```
                  Caddy (foreground, :8080)
                       │
              ┌────────┴────────┐
              ▼                 ▼
       /_w/*  →  worker      everything else  →  Next.js
       (strip /_w)            (3000)
       (5174)
```

- **Next.js** (`:3000`) serves the UI + `/api/runs` proxy
- **Worker** (`:5174`) owns Chromium, the Stagehand agent, the SQLite DB, the rrweb archives
- **Caddy** (`:8080`) reverse-proxies — Fly's edge routes public `:443` → `:8080`

The client connects to both `https://testbuds.fly.dev/api/runs` (Next.js) and `wss://testbuds.fly.dev/_w/runs/<id>/live` (worker, via Caddy).

## Day-to-day commands

```bash
# Deploy a new build
fly deploy

# Tail logs (separate worker / next / caddy lines visible)
fly logs

# SSH into the running machine
fly ssh console

# Inspect the persistent volume
fly ssh console -C "ls -la /app/data/runs"

# Scale up if 1-2 concurrent runs starts maxing out CPU
fly scale vm shared-cpu-4x --memory 4096

# Stop machines (saves credits when no judging is happening)
fly scale count 0
# ...and bring it back
fly scale count 1
```

## Cost expectations

Roughly:
- `shared-cpu-2x` / 2GB memory machine running 24/7: **~$5/month**
- 1GB persistent volume: **~$0.15/month**
- Bandwidth: free up to 160GB/mo (we won't hit this)
- **Anthropic API**: each persona run is ~$0.10–$0.30 in Sonnet 4.6 tokens. Set a hard monthly cap in the Anthropic dashboard before sharing the URL.

## After judging closes

```bash
# Pause the app — keeps volume + config but stops the running machine
fly scale count 0

# Or delete everything
fly apps destroy testbuds
fly volumes destroy <volume-id>
```

## Troubleshooting

### Worker won't start, port 5174 already in use
The `preworker` hook should clean stale listeners. If something gets really stuck:
```bash
fly ssh console -C "pkill -f 'src/worker/index'"
```

### Image build fails on the Playwright base image tag
If `mcr.microsoft.com/playwright:v1.60.0-jammy` doesn't exist (Microsoft sometimes lags publishing), edit `Dockerfile` and try one of:
- `mcr.microsoft.com/playwright:next-jammy`
- `mcr.microsoft.com/playwright:v1.60.0-noble`
- `mcr.microsoft.com/playwright:latest`

### WebSocket connects but no events flow
1. Confirm `NEXT_PUBLIC_WORKER_WS` matches your actual Fly hostname in both `fly.toml` `[build.args]` and `[env]` (they should be identical).
2. Rebuild after changing — `NEXT_PUBLIC_*` is baked in at build time.
3. Check Caddy logs: `fly logs | grep caddy` — should show successful WS upgrades on `/_w/runs/...`.

### Live view is blank
Same as local: hard-refresh the run page. The first-event MutationObserver fix should make this rare in prod.
