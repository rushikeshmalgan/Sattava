# Release runbook

The manual steps that take the AI-gateway and MongoDB work from the `feat/mongodb` branch to production. Written on 2026-09-21 after a final pre-production audit, and revised when the database moved from Firestore to MongoDB.

**None of these steps has been run.** No push, backend deploy, EAS build or update, MongoDB Atlas setup or key rotation has happened. Every command here is for you to run, in order.

## What was verified before this was written

Verified on a developer machine (Windows, Node 22), from a clean clone of the committed branch:

| Area | Result |
|---|---|
| Mobile | typecheck passes; lint has 0 errors (72 warnings, all pre-existing: unused symbols and hook dependency hints); 22 suites, 325 tests pass |
| End to end, as a real user | A real Firebase account (created through the Identity Toolkit, deleted afterwards) against the built server and a real local MongoDB: sign-in sync, onboarding, plan, logging a meal, water and a workout, reading the day back, deleting an entry and seeing exactly its own values come back out, a second delete 404, a date range, sample data, profile edits. 55 checks. A second real account saw none of the first's data and could not delete its entries. Refused, as they should be: no token, a forged token, an impossible date, a date far in the future, negative calories, an absurd entry, a MongoDB operator in the body, an unknown field. The day calorie cap held under repeated writes, and a 140-request burst from one user was rate limited with Retry-After |
| The app in a browser | The web build served from an allowed origin and driven in headless Chrome: the sign-in screen renders, no console errors, no uncaught exceptions. Signing up through the form created the Firebase account, the app called `/api/v1/me/sync` and `/api/v1/me` with the new session, and the user landed on onboarding step 1. Served from a port the allowlist does not name, the same flow is blocked by CORS and the app shows its "Cannot reach Sattava" screen — which is the allowlist working |
| AI, against the real provider | `smoke:vision` recognised a dish and served the repeat from cache (6.1 s, then 11 ms). All six `smoke:coach` tasks returned valid output, and the fallback chain earned its keep in that one run: the weekly report fell through a timeout and the plan through a rate limit, both answered by the next model |
| Backend | typecheck passes; 24 suites, 412 tests pass, stable across repeated runs, including on a cold clean clone; the production build passes |
| Data API | The tests run against a real in-memory MongoDB (atomic totals, caps under concurrency, deletes, isolation between users, injection attempts). A smoke run of the whole flow against a local MongoDB 8 service also passed |
| Trust boundary | no Gemini key, SDK or endpoint, and no MongoDB driver, connection string or variable, outside `backend/` (a script and two Jest guards, each shown to fail when violated); no secret files tracked; the mobile `.env.example` documents every `EXPO_PUBLIC_` the app reads and names no server-side secret (a guard, shown to fail when violated) |
| Authentication | every route that costs money or touches user data rejects a request with no token and one with a bad token, including the FatSecret proxy, which does not reach FatSecret at all without a verified caller. The owner of a document is always the token's uid; no body, query or path carries an identity |
| App bundle | an Android export of the final code contains no Gemini endpoint, variable name or SDK marker, no MongoDB driver, connection string or variable, and no Firestore client. Its only Google-key-shaped string is the public Firebase web key. Neither the local Gemini key nor the local FatSecret credentials appear in it, and it contains the backend URL from the local `.env` |
| Built server | started with `node dist/index.js` against a local MongoDB 8: `/health` is 200 and `/health/ready` reports `database: ok`; an unauthenticated request to a data route, and to the food proxy, is 401 (UNAUTHENTICATED) and a malformed token is 401 (INVALID_TOKEN); an unknown path is 404; a missing or unreachable `MONGODB_URI` exits 1 without printing the string; invalid config exits 1 naming variables only; no key, token or connection-string text reached the log |
| Provider | at 2026-09-20 19:57 UTC all four chain models answered a real vision request |

**Not verified** (this is what the rest of the file is for): a physical device, an EAS build or update, a Render deployment, a MongoDB Atlas cluster, a real Firebase ID token against the deployed backend, a real SIGTERM, cold-start time, real photo sizes on high-resolution phones, and recognition accuracy.

## Order of operations

1. Deal with the exposed legacy credentials (section 1). This is independent of the release, so do it first.
2. Push the branch, open a pull request and get CI green (section 2).
3. Set up MongoDB and deploy the backend to Render with a backend-only Gemini key, then check it (sections 6 and 3). The server will not start without a reachable database.
4. Ship the app, as an over-the-air update or a new build (section 4).
5. Validate on a physical phone (section 5).
6. Repeat the device checks that write data, then lock the old Firestore database once every install has updated (section 6, step 5).
7. Retire the old Gemini key (section 7).

The backend routes are additive, but the new app keeps its data in MongoDB while older installs keep using Firestore, so ship the app to everyone in one step and expect the history not to carry over. MongoDB comes before the deploy because the backend will not start without it. The old Gemini key goes last because installed older builds may still call Gemini directly with it.

## 0. Run it locally first

Nothing below is worth doing until the release candidate runs on your own machine. The README has the full
setup; this is the short version, and the same commands CI runs.

```bash
# 1. MongoDB. Either a local server (Windows: the "MongoDB" service; macOS/Linux: mongod or Docker)
#    or an Atlas cluster (section 6). Then, in backend/.env:
#      MONGODB_URI=mongodb://127.0.0.1:27017        # local
#      MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/  # Atlas: URL-encode the password
cd backend && npm run smoke:data   # proves the string end to end; uses a scratch database and drops it
npm run dev                        # or: npm run dev:memory  (no MongoDB at all; data is lost on exit)

# 2. The app, in another terminal, from the repo root.
#    Leave EXPO_PUBLIC_PROXY_BASE_URL unset (or commented out) in .env, or the app calls the deployed
#    backend instead of yours.
npx expo start -c                  # phone: Expo Go on the same Wi-Fi; browser: press w

# 3. The checks CI runs.
npm run typecheck && npm run lint && npm test          # app
cd backend && npm run typecheck && npm test && npm run build
bash scripts/check-client-boundary.sh                  # trust boundary (from the repo root)
```

**Firebase Auth.** The app and the backend must name the same Firebase project: `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
in `.env` and `FIREBASE_PROJECT_ID` in `backend/.env`. In the Firebase console, Authentication must have the
sign-in providers you use enabled (Email/Password is the one the app is verified with), and for Expo web the
origin you open must be in Authentication → Settings → Authorized domains (`localhost` is there by default).
The backend needs no service-account key: it verifies ID tokens against Google's public certificates.

**CORS.** Native apps do not use CORS. In development the backend allows the Expo web origins
(`http://localhost:8081`, `http://localhost:19006`) with no configuration. In production it allows no browser
origin unless `CORS_ORIGINS` lists it, and setting `CORS_ORIGINS` replaces the development default.

## 1. Exposed legacy credentials

**What was found.** The remote branch `origin/Notifications` is an old, unrelated history (it shares no commit with `main` and predates the move from Clerk to Firebase Auth). It tracks a `.env` file in six commits from 2026-03-01 to 2026-04-25, and its tip still does. The variable names in it are `EXPO_PUBLIC_GEMINI_API_KEY` (a Google API key), `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` and `EXPO_PUBLIC_` copies of the FatSecret pair, plus the Firebase web config and a Clerk publishable key (both public by design). The repository is public. `main` and `feat/ai-gateway` have never contained a `.env`. Compared by hash, none of those values equals a current local secret, including the backend's Gemini key.

**What to do:**

1. **Check for abuse.** In Google Cloud Console, open APIs & Services, then Credentials, and find the key whose last four characters match the one in that file (never paste the key anywhere). Look at Generative Language API metrics and billing for traffic you do not recognise.
2. **Revoke or cap the Gemini key.** Because it is public, treat it as compromised. Deleting it stops any abuse now. The cost: if older installed app builds embed this same key, their tips and insights fall back to local text and their photo scans keep the old placeholder behaviour until users update. If you have real users on old builds and see no abuse, cap the key's quota instead and delete it after section 7. Whether old builds embed this key is something only your EAS environment history can tell you.
3. **Regenerate the FatSecret client secret** on the FatSecret platform. Nothing in the current app uses FatSecret. Leave `FATSECRET_CLIENT_ID` and `FATSECRET_CLIENT_SECRET` unset on Render: the route `/api/foods/search` is unauthenticated (IP rate limit only), and unset it answers 503.
4. **Do not merge `Notifications`.** It would bring the `.env` and Clerk back. Delete the branch on GitHub when nobody needs it. Deleting a branch does not remove its commits from forks, clones or GitHub's cached views, so steps 2 and 3 are what protect you. Removing the history needs a rewrite (`git filter-repo`) and a request to GitHub Support to purge cached views, and is only worth doing after the keys are dead.
5. **Clerk.** If the old Clerk application is unused, delete it in the Clerk dashboard.
6. **GitHub secret scanning.** In the repository's Settings, Code security, confirm secret scanning and push protection are on.
7. **This machine.** `ai-service/.env` is still on disk. Git ignores it, so it cannot be committed, but delete the folder when you are sure you do not need it. The code lives on the local branch `archive/ai-service`.
8. **Preserve the archive.** `archive/ai-service` exists only on this machine. To keep it elsewhere: `git push origin archive/ai-service`.

## 2. GitHub: push, pull request, CI

```bash
git push -u origin feat/mongodb
# then open the pull request in the browser:
#   https://github.com/rushikeshmalgan/Sattava/pull/new/feat/mongodb
# or, with the GitHub CLI signed in:
gh pr create --base main --head feat/mongodb --title "AI gateway and MongoDB data API"
```

`.github/workflows/ci.yml` runs three jobs: Mobile (typecheck, lint, tests), Backend (typecheck, tests against a real in-memory MongoDB, production build) and Security checks. All three must be green before merging. They have been run from a clean clone on Windows, never on GitHub Actions, so expect to read the first run's logs. The likely first-run differences are Linux paths and line endings, and the one-time download of the MongoDB test binary (about 75 MB, cached by key afterwards).

## 3. Backend on Render

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |

| Environment variable | Value |
|---|---|
| `GEMINI_API_KEY` | A **new** key that has never been in a client bundle or in git (section 7) |
| `FIREBASE_PROJECT_ID` | The Firebase project the app signs in against (`.firebaserc` and the app's `EXPO_PUBLIC_FIREBASE_PROJECT_ID` agree with the backend's local value as of this audit) |
| `LOG_SALT` | 16 or more random characters. For example: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `MONGODB_URI` | The connection string for your MongoDB (section 6). A secret: it contains the database password |
| `MONGODB_DB` | Optional. The database name (default `sattava`) |
| `TRUST_PROXY_HOPS` | `1` |
| `NODE_ENV` | `production` (only hides the development LAN-URL log lines) |
| `NODE_VERSION` | 20.3 or newer (the backend needs `AbortSignal.any`; CI uses 22) |
| `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` | **Leave unset** |
| `CORS_ORIGINS` | Leave empty (native apps do not use CORS) |
| `PORT` | Do not set; Render provides it |

The build needs `--include=dev` because TypeScript is a dev dependency and `npm ci` skips dev dependencies whenever `NODE_ENV` is `production`.

### The 16 backend checks

Set `BASE` to the service URL first: `BASE=https://<your-service>.onrender.com`.

1. **Build.** The deploy log shows `npm ci --include=dev` and then `tsc` finishing without errors.
2. **Boot.** The log has `"event":"server.started"` with the expected `firebaseProjectId`, `databaseName`, `modelChain`, `"thinkingLevel":"minimal"`, `"trustProxyHops":1`, `"nodeEnv":"production"` and `"foodsProxyConfigured":false`. A wrong project here is why every token would later be rejected. If the database cannot be reached, the log has `database.connect_failed` instead and the service exits.
3. **Health.** `curl -i $BASE/health` returns 200 and `{"status":"ok",...}`, and `curl -i $BASE/health/ready` returns 200 and `{"status":"ok","database":"ok"}`.
4. **No token.** `curl -i -X POST $BASE/api/v1/vision/analyze-food -H 'Content-Type: application/json' -d '{}'` returns 401 with `"code":"UNAUTHENTICATED"` and an `X-Request-Id` header.
5. **Bad token.** The same request to `/api/v1/coach/generate` with `-H 'Authorization: Bearer not-a-token'` returns 401 `INVALID_TOKEN`.
6. **Legacy food route off.** `curl -i "$BASE/api/foods/search?query=dal"` returns 503 `FATSECRET_NOT_CONFIGURED`.
7. **Real token.** This is the only check that proves the Firebase project matches and the production Gemini key works together. Create a throwaway email/password user in the Firebase console (Authentication, then Users; `firebase.json` declares email/password sign-in, but confirm it is enabled in the console), then:

   ```bash
   FIREBASE_WEB_API_KEY=<EXPO_PUBLIC_FIREBASE_API_KEY from your .env; it is public by design>
   ID_TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_WEB_API_KEY" \
     -H 'Content-Type: application/json' \
     -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"returnSecureToken\":true}" \
     | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).idToken")
   curl -s -X POST "$BASE/api/v1/coach/generate" \
     -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
     -d '{"task":"daily_tip","input":{"calories":1200,"water":1500,"steps":4000}}'
   ```

   Expect 200 and `{"task":"daily_tip","text":"...","meta":{"model":"gemini-...","promptVersion":"...","requestId":"..."}}`. Use a throwaway account, never your own, do not print `ID_TOKEN`, and clear your shell history afterwards. An ID token expires after one hour.
8. **Provider.** From `backend/`, run `npm run check:models` with the same key as Render (put it in `backend/.env` temporarily). Every chain model should report `OK`. Re-run it after any Gemini deprecation notice.
9. **Vision on a device.** After a scan from the app (section 5, step 8) the log has an `ai.request` line with `"outcome":"success"`, `finalModel`, `imageBytes` and `"cache":"miss"`. Scan the same photo again and the line says `"cache":"hit"`.
10. **Nothing burned.** Search the logs for `BUDGET_EXHAUSTED`, `API_KEY_INVALID` and `MODEL_NOT_FOUND`: there should be none.
11. **Client IP.** Temporarily set `AI_IP_RATE_PER_MINUTE=5`. From one network send six requests to `$BASE/api/v1/coach/generate` without a token: the sixth is 429 `RATE_LIMITED` with a `Retry-After` header. From a different network (phone data) the first request is still 401, not 429. That proves `TRUST_PROXY_HOPS=1` gives a per-client address. If both networks are throttled together, `req.ip` is a shared proxy address: raise the hop count. Restore the variable afterwards.
12. **Cold start.** After the service has been idle long enough to spin down, time the first request: `curl -o /dev/null -s -w '%{time_total}\n' $BASE/health`. The app tolerates 45 s for a scan and 30 s for text. Decide from the number whether a warm-up ping is worth adding.
13. **Graceful redeploy.** Trigger a manual deploy while a scan is in flight. The log shows `server.shutdown_started` then `server.shutdown_complete`, and the scan completes. This could not be tested on Windows.
14. **Log hygiene.** Search the deployed logs for `AIza`, `Bearer `, `inlineData` and `mongodb`: no hits. Then save the logs to a file and run `npm run --silent summarize:logs < logs.txt` in `backend/` for the failure rate, fallback share, latency and cache hit rate.
15. **Data with a real token.** With the `ID_TOKEN` from check 7: `curl -s -X POST "$BASE/api/v1/me/sync" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{}'` returns `{"user":{"id":"<the test user's uid>",...}}`. Then add an entry, and read the day back: `curl -s -X POST "$BASE/api/v1/logs/$(date -u +%F)/entries" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' -d '{"type":"water","name":"Paani","amountMl":250}'` returns the day with `"totalWater":250`. Without the header every one of these is 401.
16. **Database access.** In Atlas, Browse Collections shows the test user in `users` and the day in `dailyLogs`, and Network Access lists the addresses Render connects from. Delete the test user's documents afterwards.

## 4. The app: over-the-air update or a new build

### Which one

Compared with `main` (`fbf88b4`), this branch changes no native layer:

- The only dependency change is `@google/generative-ai` removed (pure JavaScript). The Firestore client is no longer imported, which changes JavaScript only.
- The locked versions of every native-relevant package (`expo*`, `react-native*`, `@react-native*`, `@expo/*`, `@react-navigation/*`, `firebase`, `react`) are identical in `package-lock.json`.
- `app.json` (plugins, permissions, version) and `eas.json` are unchanged.

So an over-the-air update (`eas update`) can deliver it to installs whose native layer matches `main`'s. **Confirm that first.** `runtimeVersion` uses the `appVersion` policy (currently `2.0.0`), so an update reaches every installed build labelled 2.0.0 whatever native code it contains, and a mismatch can crash the app on launch. Find the git commit of the build you shipped (the EAS build page shows it) and run:

```bash
git diff <build-commit>..HEAD -- package.json package-lock.json app.json eas.json
```

Any change to a native package, plugin, permission or SDK version means a new build, not an update. For a stronger check, run `npx expo-updates fingerprint:generate --platform android` at the build commit and at this commit (with dependencies installed at each); equal hashes mean the same native layer. If in doubt, build: bump `version` in `app.json` (for example to `2.0.1`) so the new build gets its own runtime version and older installs are untouched by updates.

### Before publishing either

- `EXPO_PUBLIC_*` values are baked into the bundle when it is created. The EAS environment you publish from must define every `EXPO_PUBLIC_FIREBASE_*` value and `EXPO_PUBLIC_PROXY_BASE_URL=https://<your-service>.onrender.com`. Use `https`: release Android builds refuse cleartext HTTP by default. Without the URL, the app reports a configuration error and every AI feature falls back or fails.
- **No Gemini key variable may exist in any EAS environment.** List each environment and delete `EXPO_PUBLIC_GEMINI_API_KEY` if it is there: `eas env:list production` (then `preview`, `development`), and `eas env:delete` to remove it. Do not add `--include-sensitive`.
- When you publish from your own machine, your local `.env` also feeds the bundle. It must not hold a LAN or localhost URL. (At this audit the local value was an `https` URL for the service that is deployed today. That service runs the old backend, which has no data API, so an app built before you deploy this branch (section 3) cannot load or save anything.)
- Check the bundle before publishing. This needs no EAS access:

  ```bash
  npx expo export --platform android --output-dir dist   # dist/ is git-ignored
  grep -rl "generativelanguage.googleapis.com" dist || echo "ok: no Gemini endpoint"
  grep -rlE "EXPO_PUBLIC_GEMINI|GEMINI_API_KEY" dist || echo "ok: no Gemini variable name"
  grep -rlE "mongodb(\+srv)?://|MONGODB_URI|MongoClient" dist || echo "ok: no MongoDB string, variable or driver"
  grep -rlE "firestore.googleapis.com|getFirestore" dist || echo "ok: no Firestore client"
  grep -rahoE "AIza[0-9A-Za-z_-]{35}" dist | sort -u | wc -l   # expect 1: the public Firebase web key
  grep -rl "<your-service>.onrender.com" dist                  # expect a match
  rm -rf dist
  ```

### Path A: over-the-air update

```bash
eas update --channel production --environment production --platform all --message "AI gateway: Gemini moved behind the backend"
```

These flags were checked against the help of EAS CLI 24.7.0 (`--channel`, `--environment`, `--platform`, `--message`). `eas.json` builds the `production` profile on the `production` channel. `--rollout-percentage` exists if you want a staged rollout (read `eas update --help` for its exact behaviour first). An update downloads on the first launch and applies on the next, so close and reopen the app twice before judging it.

To roll back: `eas update:rollback` (to the embedded update or an earlier one) or `eas update:republish` (an earlier update group). `eas update:insights` shows launches per update group, which is also how you measure adoption for section 7.

### Path B: new build

```bash
eas build --platform all --profile production
```

`eas.json` has `autoIncrement` and remote version numbering. `eas submit` needs the placeholders under `submit.production` (Play service-account path, Apple IDs) filled in with your own values; never commit a service-account file (`.gitignore` now blocks the usual names).

## 5. Device validation: the 17 checks

Use a physical phone on mobile data, not your development network, with the release build or the update applied. Note the phone model and Android or iOS version next to any failure.

1. **New code is running.** In Manual Calories, `-5` is refused with "Calories can't be negative". That message exists only in this version.
2. **Sign in** with an existing account. Home loads and shows your data.
3. **New account and onboarding.** Sign up, finish onboarding, and the generated plan appears (backend log: `coach.profile_plan`).
4. **Log a food** from search. It shows in Recent Activity, the totals move, and nothing shows an error.
5. **Nonsense search.** In the Diet tab search for `zzqxjv`: "No results found", not an invented food.
6. **Manual calories validation.** `-500`, `0x10`, `1e3`, `Infinity` and `10001` are all refused with a clear message. `250` with macros saves.
7. **Manual exercise validation.** Same refusals; a valid value saves, shows a flame icon and "cal burned".
8. **Photo scan.** A well-lit Indian dish gives a result; log it. Record the time from tap to result, and check the backend `ai.request` line (check 9 in section 3).
9. **Photo of a non-food object.** Record what happens. The pipeline refuses an unnamed or impossible result but has no confidence cut-off: on a synthetic test image the model still named a food, with confidence between 0.3 and 0.85. The app labels confidence (high from 0.85, medium from 0.65, otherwise low) and only logs when you tap save, so expect either an explicit failure or a low-confidence result you can reject.
10. **Photo scan in airplane mode.** A network failure message; after reconnecting, retry works.
11. **Highest-resolution phone you have.** Read the `[scan] capture attempt` lines (`adb logcat -s ReactNativeJS` on Android). Record photo size and the quality used, and confirm no image-too-large failure. This is the measurement the README lists as missing.
12. **Barcode.** A packaged product gives plausible values scaled to its serving and can be logged. An unknown barcode says "No barcode match found".
13. **Deleting entries.** Delete a cardio, a weight and a manual exercise: "calories burned" falls each time. Delete a food and a water entry: the totals fall.
14. **Streak.** With calories at 80 to 120% of target, water at 80% or more, and a cardio or weight exercise logged, today counts toward the streak.
15. **Text features and their fallback.** The daily tip, calorie insight, diet-score explanation, weekly report and voice coach each show AI text. In airplane mode each shows local text and nothing crashes.
16. **Sessions.** After more than an hour idle (ID tokens last one hour) a scan succeeds without a sign-in prompt. After signing out, a scan is refused with a sign-in message.
17. **Rate limit.** Seven scans inside a minute: the seventh says you have scanned a lot; after a minute scanning works again.

After section 6, repeat checks 4, 6, 7, 8 and 13, and edit your daily targets, because those write to the database. Also open the same account on a second device: a change made on one appears on the other within about 30 seconds (screens poll while in the foreground).

## 6. MongoDB: setup and the 5 steps

The app no longer talks to a database directly. The backend does, so the connection string is the one new secret in this release, and it lives only in the backend's environment.

1. **Create the database.** MongoDB Atlas is the simplest: create a cluster (a free shared cluster is enough for a demo), a database user with read and write on the `sattava` database only, and open Network Access to the addresses Render connects from (Render publishes a service's outbound addresses in its dashboard; if you cannot rely on them, use `0.0.0.0/0` for a demo and tighten it later). Copy the `mongodb+srv://` string from the cluster's Connect dialog and replace `<password>`, URL-encoding any symbols in the password. Any MongoDB works: the string can equally point at your own server.
2. **Prove it from your machine.** Put the string in `backend/.env` as `MONGODB_URI` (never in the root `.env`, never with an `EXPO_PUBLIC_` name), then run `npm run smoke:data` in `backend/`. It connects, runs the whole data flow in a scratch database it drops afterwards, and ends with "All 12 checks passed". A wrong password, a blocked address or a typo shows up here as `Could not connect to MongoDB`, without printing the string.
3. **Give it to Render.** Add `MONGODB_URI` (and `MONGODB_DB` if you do not want the default `sattava`) to the service's environment and deploy. The server refuses to start without a reachable database.
4. **Check the deployed database.** `curl -i $BASE/health/ready` returns 200 and `{"status":"ok","database":"ok"}`, and the boot line shows `databaseName`. On a device, finish onboarding, log a meal and delete it, then read the entry and the totals in Atlas (Browse Collections: `users`, `dailyLogs`).
5. **Decide about the old data.** Existing installs wrote to Firestore and nothing is migrated (backend README, release checklist item 8). After every install has updated, lock the old database so nobody can read or write it: in the Firebase console open Firestore Database, then Rules, replace the rules with `allow read, write: if false;` and publish (or delete the database). Its current rules were never confirmed in this audit.

**Rollback.** Data is not part of a code rollback: redeploying an older backend does not remove documents. Check what backups your Atlas tier offers; free shared clusters may have none, so export with `mongodump` before anything risky. A bad connection string is undone by putting the previous value back in Render.
## 7. Gemini key rotation

Never rotate first. The new key must have never been in a client bundle or in git.

**Sequence:**

1. Create a new key in Google AI Studio and restrict it to the Generative Language API.
2. Put it in Render as `GEMINI_API_KEY` and redeploy. The old value stays in your password manager until step 5.
3. Verify: section 3 check 7, and a scan on a device. The log shows `"outcome":"success"` and no `API_KEY_INVALID`.
4. Ship the app without any Gemini key (section 4) and wait until almost all users have it. For an over-the-air update, `eas update:insights` shows launches per update group.
5. Delete the old key or keys in Google Cloud Console: the one embedded in old builds if it differs, and the one exposed in `origin/Notifications`.
6. Watch for a day. `API_KEY_INVALID` in the backend logs means Render is still using a revoked key: restore the right one. Complaints from old builds are expected until users update: their tips and insights fall back to local text and their photo scans return the old placeholder result.

**If the exposed key is the key old builds embed**, you cannot both stop abuse and keep those builds working. Either revoke now (section 1 step 2) and accept that old builds degrade, or cap the key's quota and wait for adoption. Because it is public on GitHub, prefer revoking now unless you have real users on old builds and no sign of abuse.

**Rollback:**

| Problem | Action |
|---|---|
| New key rejected after step 2 | Put the old value back in Render and redeploy. Nothing else changed. |
| Adoption is slow | Keep the old key alive but capped until users update. |
| The new app misbehaves | `eas update:rollback`. The backend can stay: its routes are additive. |
| Abuse of the old key while you wait | Revoke it immediately and accept old-build degradation. |

## 8. Rollback summary

| Part | How |
|---|---|
| Backend | Redeploy the previous commit in Render. The routes are additive, so older app builds keep working. |
| App update | `eas update:rollback` or `eas update:republish`. |
| Database | Not part of a code rollback: restore from a backup or a `mongodump` (section 6). A bad connection string: put the previous value back in Render. |
| Gemini key | Restore the old value in Render (section 7). |
| Daily budget used up | Raise `AI_DAILY_ATTEMPT_BUDGET` in Render deliberately and redeploy. |

## 9. After release

- Read the `ai.request` lines, or run `npm run --silent summarize:logs < logs.txt`, for failure rate, fallback share, latency and cache hit rate. Decide from those numbers whether cold-start or latency work is worthwhile.
- Watch for `BUDGET_EXHAUSTED` (the shared daily budget is also an availability limit), `RATE_LIMITED`, `AI_UNAVAILABLE` and `MODEL_NOT_FOUND` (a model was retired: update `GEMINI_MODEL_CHAIN` and run `npm run check:models`).
- Watch Render's memory graph and restarts. A vision request holds the image roughly three times over and there is no global concurrency cap.
- Watch for `DATABASE_UNAVAILABLE` and `DAY_LIMIT_EXCEEDED` in the logs, `/health/ready`, Atlas's connection and storage graphs, and Google Cloud billing for the Gemini key.

## Known limitations to accept or fix later

- **Targets form.** Saving a daily calorie target outside 100 to 20,000 is refused by the API (a 400), and the screen shows a generic "check your connection" message. The other targets are saved as text with no validation.
- **Three malformed dataset rows.** Three of the 1,014 rows in the bundled CSV (`csv-113`, `csv-234`, `csv-576`) have a stray leading quote in the name and 0 calories, and show up in the Diet tab search. Logging refuses food with 0 calories, so nothing bad is saved. The fix belongs in `scripts/processCsv.js` (quote handling) and a regenerated dataset.
- **A barcode with implausible data** is reported as "No barcode match found", the same message as an unknown barcode.
- **Shared daily budget.** A few dozen heavy or malicious accounts can use it up. Closing sign-ups to unverified accounts or adding Firebase App Check is the fix, and neither exists yet.
- **`/api/foods/search`** is unauthenticated by design (legacy contract). Keep `FATSECRET_*` unset.
- **Everything in memory.** Rate limits, the vision cache and the budget are per instance and reset on restart. More than one instance needs shared state.
- **No offline logging, and screens poll.** The Firestore write queue is gone. A log that cannot be sent shows an error; it is not retried later. Screens refresh every 30 seconds in the foreground and straight after the app's own writes.
- **Old data is not migrated.** Users who update start with an empty history, and users who have not updated keep writing to Firestore. Nothing reads Firestore any more, so lock it once everyone has updated (section 6, step 5).
- **The sample-week button** (`POST /api/v1/demo-data`) replaces a user's last seven days. It only touches the caller's own data, but it is destructive, so consider removing it before real users have data.
- **Gemini latency is uneven, and the chain order is a guess.** On 2026-09-20 (UTC) the primary model, `gemini-3.6-flash`, answered in about 3 s, then timed out at the 12 s cap on every attempt an hour later, while the models behind it ranged from about 2 s to timeouts. The chain handles it as designed (fall back, or fail with a bounded 503 after at most 30 s), but a scan can then take about 14 s. Do not reorder the default chain from one evening of numbers. After real traffic, read the per-model latency and `NETWORK_ERROR/TIMEOUT` counts from `npm run summarize:logs` and reorder `GEMINI_MODEL_CHAIN` on that. Before any live demo, run `npm run check:models` and put the models that answer fastest right now first.
- **A per-attempt timeout bug was fixed** (commit `357d1f4`): on Node 22 the 12 s cap could be garbage-collected and never fire, so a slow model ran up to the 30 s deadline. Keep the GC regression tests in `backend/tests/chainTimeouts.test.ts` if you touch `runModelChain`.
