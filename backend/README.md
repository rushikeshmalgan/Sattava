# Sattava backend

TypeScript/Express API for the Sattava app. It is the only place the Gemini API key lives.

| Route | Auth | What it does |
|---|---|---|
| `POST /api/v1/vision/analyze-food` | Firebase ID token | Photo to validated nutrition analysis |
| `POST /api/v1/coach/generate` | Firebase ID token | Server-owned text/JSON tasks (insight, tip, diet-score explanation, weekly report, voice coach, onboarding plan) |
| `GET /api/foods/search` | none, IP rate limited | FatSecret proxy (legacy response shapes) |
| `GET /health` | none | Liveness |

Every `/api/v1` error is `{ "error": { "code", "message", "requestId" } }`. Messages are fixed strings; provider errors are logged, never returned.

## Run locally

```bash
cd backend
npm install
cp .env.example .env      # fill in GEMINI_API_KEY, FIREBASE_PROJECT_ID, LOG_SALT
npm run check:models      # confirm the model chain is live
npm run dev
```

## Environment

Required: `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `LOG_SALT` (16+ random characters; used to HMAC user IDs before they are logged).
Everything else has a default and is documented in `.env.example`: model chain, thinking level, timeouts, rate limits, daily attempt budget, CORS origins, FatSecret credentials.

The server refuses to start on invalid configuration and reports variable names only, never values.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Jest + supertest. Gemini and Firebase are faked; no network or credentials needed |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run check:models` | List models from the provider and send a real vision request to each chain model with the production request shape. Exits non-zero if a model is unusable. Run before changing `GEMINI_MODEL_CHAIN` and before deploys |
| `npm run smoke:vision [-- photo.jpg]` | End-to-end run against real Gemini (fake token verifier, no login) |
| `npm run smoke:coach` | Same, for every coach task |
| `npm run summarize:logs < logs.txt` | Turn `ai.request` log lines into failure rate, fallback distribution, latency percentiles, validation-rejection rate and cache hit rate |

## Deploy (Render)

Create or update the web service with:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |
| `NODE_VERSION` | 20.3 or newer (22 is fine) |
| `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `LOG_SALT` | required secrets |
| `TRUST_PROXY_HOPS` | `1` (Render sits behind one proxy; this makes `req.ip` trustworthy) |

`--include=dev` matters: the build needs TypeScript and the type packages, which Render skips when `NODE_ENV=production`. The previous start command, `node server.js`, no longer exists.

Firebase token verification needs only the project ID (it checks signatures against Google's public keys), so no service-account credential is stored on the server.

## Release checklist

1. `npm test` and `npm run typecheck` pass; `npm run check:models` reports every chain model usable.
2. Deploy the backend first. The routes are additive, so builds already in the field keep working.
3. Get the new app JavaScript (no Gemini key inside) onto users' devices. The change is JavaScript-only and `runtimeVersion` uses the `appVersion` policy, so `eas update --channel production` can reach installed builds of the same app version; verify that the native dependency set of those builds is unchanged, otherwise ship a new build.
4. Delete `EXPO_PUBLIC_GEMINI_API_KEY` from every EAS environment (development, preview, production).
5. **Rotate the Gemini key only after the new JavaScript is on devices.** Older installs still call Gemini directly with the old key. After rotation their tips and insights fall back to local copy, and their photo scans hit the old behaviour of returning a placeholder "Unknown food" result, which only the new code removes.
6. After some real traffic, run `npm run summarize:logs` on the deployed logs and decide from the numbers whether cold-start or latency work is worthwhile.

## Operating notes

- Rate limits, the vision cache and the daily attempt budget are in memory and per instance. That is correct for one instance and resets on restart. Running more than one instance needs shared state.
- `ai.request` log lines never contain images, prompts, model output, tokens or keys. User IDs appear only as a salted HMAC.
- If every request starts returning `AI_UNAVAILABLE`, search the logs for attempt reasons: `MODEL_NOT_FOUND` means a model was retired (update `GEMINI_MODEL_CHAIN`), `API_KEY_INVALID` means the key is wrong or revoked.
