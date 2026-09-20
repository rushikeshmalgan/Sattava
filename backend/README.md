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

`FIREBASE_PROJECT_ID` must be the Firebase project the mobile app signs in against (the value of `EXPO_PUBLIC_FIREBASE_PROJECT_ID`). A different project makes every token fail verification, so every AI request returns 401. The startup log line shows the project the server is using.

The Gemini key is backend-only: it exists only in this service's environment, never in the app or in EAS variables. CI fails if the key variable, a Gemini SDK or the Gemini endpoint appears outside `backend/`.

## Verify after the first deploy

Static checks, tests and a local run of the built server all pass, but these cannot be checked until the service is running on Render. **None of them has been done yet.**

| Check | How | What it proves |
|---|---|---|
| Boot | Deploy log shows `server.started` with the expected `firebaseProjectId`, `modelChain`, `thinkingLevel`, `trustProxyHops` | Configuration reached the process |
| Health | `GET /health` returns 200 | The health check and start command work |
| Real auth | Sign in on a device or emulator, scan a photo, get a 200 | The Firebase project matches and token verification works in production (only a real ID token can prove this) |
| Real Gemini | The scan above returns a food analysis; check `ai.request` shows `outcome: success` and the serving model | The production key and chain work; run `npm run check:models` if not |
| Client IP | Set `AI_IP_RATE_PER_MINUTE` low, send requests from two different networks | `TRUST_PROXY_HOPS=1` yields a per-client `req.ip`. If both networks are throttled together, `req.ip` is a shared proxy address: raise the hop count |
| Cold start | Time the first request after the service has been idle | Real latency; decide from this whether a warm-up ping is worth adding |
| Graceful redeploy | Redeploy while a scan is in flight; logs show `server.shutdown_started` then `server.shutdown_complete` | SIGTERM handling works on Render (it could not be tested on Windows) |
| Image sizes | After some traffic, read `imageBytes` in the `ai.request` lines | Whether real photos stay under the 5 MB limit |

## Release checklist

1. `npm test` and `npm run typecheck` pass; `npm run check:models` reports every chain model usable.
2. Deploy the backend first. The routes are additive, so builds already in the field keep working.
3. Deploy the Firestore rules (`firebase deploy --only firestore:rules`) once `npm run test:rules` passes. Merging does not deploy them. They accept exactly what the current app writes, so they suit old and new app builds, but log a meal, delete it and edit your targets against a non-production Firebase project first if you have one. To roll back, redeploy the previous `firestore.rules` from git.
4. Get the new app JavaScript (no Gemini key inside) onto users' devices. The change is JavaScript-only and `runtimeVersion` uses the `appVersion` policy, so `eas update --channel production` can reach installed builds of the same app version; verify that the native dependency set of those builds is unchanged, otherwise ship a new build.
5. Delete `EXPO_PUBLIC_GEMINI_API_KEY` from every EAS environment (development, preview, production).
6. **Rotate the Gemini key only after the new JavaScript is on devices.** Older installs still call Gemini directly with the old key. After rotation their tips and insights fall back to local copy, and their photo scans hit the old behaviour of returning a placeholder "Unknown food" result, which only the new code removes.
7. After some real traffic, run `npm run summarize:logs` on the deployed logs and decide from the numbers whether cold-start or latency work is worthwhile.

## Operating notes

- Shutdown: on SIGTERM (every Render deploy) the server stops accepting connections, lets in-flight requests finish for up to 25 s, then exits; anything still running after that is cut off. Keep-alive is 120 s so a proxy never reuses a connection the server has just closed.
- Time bounds: each Gemini attempt is capped (`GEMINI_ATTEMPT_TIMEOUT_MS`, 12 s) and one request never exceeds `AI_DEADLINE_MS` (30 s) across all fallbacks.
- Memory: a vision request holds the image several times over (request body, decoded bytes, provider payload; roughly 3 times its size), and there is no global concurrency cap. Fine at expected traffic; add a cap or a larger instance if you ever see out-of-memory restarts.
- Rate limits, the vision cache and the daily attempt budget are in memory and per instance. That is correct for one instance and resets on restart. Running more than one instance needs shared state.
- `ai.request` log lines never contain images, prompts, model output, tokens or keys. User IDs appear only as a salted HMAC.
- If every request starts returning `AI_UNAVAILABLE`, search the logs for attempt reasons: `MODEL_NOT_FOUND` means a model was retired (update `GEMINI_MODEL_CHAIN`), `API_KEY_INVALID` means the key is wrong or revoked, `BUDGET_EXHAUSTED` means the day's `AI_DAILY_ATTEMPT_BUDGET` is used up (it resets at 00:00 UTC).
- The daily attempt budget is a cost guard and an availability limit at once: it is shared by all users, and each fallback attempt counts. A scan uses one attempt plus one per fallback, so the default 3,000 is at most 3,000 scans a day, and fewer whenever fallbacks happen. The per-user limits (6 a minute, 60 a day) mean a few dozen heavy users, or one abuser with many accounts, can use it up; watch `BUDGET_EXHAUSTED` in the logs and raise it deliberately rather than removing it. Closing sign-ups to unverified accounts (or Firebase App Check) is the fix for account farming, and neither is in place yet.
