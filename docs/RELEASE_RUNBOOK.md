# Release runbook

The manual steps that take the AI-gateway work from the `feat/ai-gateway` branch to production. Written on 2026-09-21 after a final pre-production audit.

**None of these steps has been run.** No push, backend deploy, EAS build or update, Firestore rules deploy or key rotation has happened. Every command here is for you to run, in order.

## What was verified before this was written

Verified on a developer machine (Windows, Node 22), from a clean clone of the committed branch:

| Area | Result |
|---|---|
| Mobile | typecheck passes; lint has 0 errors (82 warnings, none in files changed by the audit); 11 suites, 207 tests pass |
| Backend | typecheck passes; 16 suites, 247 tests pass; the production build passes |
| Firestore rules | 149 tests pass against the local emulator, including the app's real write functions |
| AI boundary | no Gemini key, SDK or endpoint outside `backend/`; no secret files tracked |
| App bundle | an Android export of the final code contains no Gemini endpoint, variable name, SDK marker or key value; its only Google-key-shaped string is the public Firebase web key, and it contains the backend URL |
| Built server | started with `node dist/index.js`: `/health` is 200; an unauthenticated or malformed-token request is 401; an unknown path is 404; invalid config exits 1 naming variables only; no key or token text reached the log |
| Provider | at 2026-09-20 19:57 UTC all four chain models answered a real vision request |

**Not verified** (this is what the rest of the file is for): a GitHub Actions run, a physical device, an EAS build or update, a Render deployment, a real Firebase ID token against the deployed backend, the rules on the production project, a real SIGTERM, cold-start time, real photo sizes on high-resolution phones, and recognition accuracy.

## Order of operations

1. Deal with the exposed legacy credentials (section 1). This is independent of the release, so do it first.
2. Push the branch, open a pull request and get CI green (section 2).
3. Deploy the backend to Render with a backend-only Gemini key and check it (section 3).
4. Ship the app, as an over-the-air update or a new build (section 4).
5. Validate on a physical phone (section 5).
6. Deploy the Firestore rules (section 6), then repeat the device checks that write data.
7. Retire the old Gemini key (section 7).

The backend routes are additive, so deploying it first breaks nothing already in the field. The rules go late because a wrong rule stops people logging food, and the previous rules stay one step away. The old Gemini key goes last because installed older builds may still call Gemini directly with it.

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
git push -u origin feat/ai-gateway
# then open the pull request in the browser:
#   https://github.com/rushikeshmalgan/Sattava/pull/new/feat/ai-gateway
# or, with the GitHub CLI signed in:
gh pr create --base main --head feat/ai-gateway --title "AI gateway: move Gemini behind an authenticated backend"
```

`.github/workflows/ci.yml` runs four jobs: Mobile (typecheck, lint, tests), Backend (typecheck, tests, production build), Firestore rules (emulator) and Security checks. All four must be green before merging. They have been run from a clean clone on Windows, never on GitHub Actions, so expect to read the first run's logs. The likely first-run differences are Linux paths and line endings, the emulator download (about 60 MB, cached by key afterwards) and the Java 21 setup.

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
| `TRUST_PROXY_HOPS` | `1` |
| `NODE_ENV` | `production` (only hides the development LAN-URL log lines) |
| `NODE_VERSION` | 20.3 or newer (the backend needs `AbortSignal.any`; CI uses 22) |
| `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` | **Leave unset** |
| `CORS_ORIGINS` | Leave empty (native apps do not use CORS) |
| `PORT` | Do not set; Render provides it |

The build needs `--include=dev` because TypeScript is a dev dependency and `npm ci` skips dev dependencies whenever `NODE_ENV` is `production`.

### The 14 backend checks

Set `BASE` to the service URL first: `BASE=https://<your-service>.onrender.com`.

1. **Build.** The deploy log shows `npm ci --include=dev` and then `tsc` finishing without errors.
2. **Boot.** The log has `"event":"server.started"` with the expected `firebaseProjectId`, `modelChain`, `"thinkingLevel":"minimal"`, `"trustProxyHops":1`, `"nodeEnv":"production"` and `"foodsProxyConfigured":false`. A wrong project here is why every token would later be rejected.
3. **Health.** `curl -i $BASE/health` returns 200 and `{"status":"ok",...}`.
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
14. **Log hygiene.** Search the deployed logs for `AIza`, `Bearer ` and `inlineData`: no hits. Then save the logs to a file and run `npm run --silent summarize:logs < logs.txt` in `backend/` for the failure rate, fallback share, latency and cache hit rate.

## 4. The app: over-the-air update or a new build

### Which one

Compared with `main` (`fbf88b4`), this branch changes no native layer:

- The only dependency changes are `@google/generative-ai` removed (pure JavaScript) and `@firebase/rules-unit-testing` added (dev only).
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
- When you publish from your own machine, your local `.env` also feeds the bundle. It must not hold a LAN or localhost URL. (At this audit the local value was an `https` URL.)
- Check the bundle before publishing. This needs no EAS access:

  ```bash
  npx expo export --platform android --output-dir dist   # dist/ is git-ignored
  grep -rl "generativelanguage.googleapis.com" dist || echo "ok: no Gemini endpoint"
  grep -rlE "EXPO_PUBLIC_GEMINI|GEMINI_API_KEY" dist || echo "ok: no Gemini variable name"
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
4. **Log a food** from search. It shows in Recent Activity, the totals move, and nothing says permission denied.
5. **Nonsense search.** In the Diet tab search for `zzqxjv`: "No results found", not an invented food.
6. **Manual calories validation.** `-500`, `0x10`, `1e3`, `Infinity` and `10001` are all refused with a clear message. `250` with macros saves.
7. **Manual exercise validation.** Same refusals; a valid value saves, shows a flame icon and "cal burned".
8. **Photo scan.** A well-lit Indian dish gives a result; log it. Record the time from tap to result, and check the backend `ai.request` line (check 9 in section 3).
9. **Photo of a non-food object.** An explicit failure message, and nothing is logged.
10. **Photo scan in airplane mode.** A network failure message; after reconnecting, retry works.
11. **Highest-resolution phone you have.** Read the `[scan] capture attempt` lines (`adb logcat -s ReactNativeJS` on Android). Record photo size and the quality used, and confirm no image-too-large failure. This is the measurement the README lists as missing.
12. **Barcode.** A packaged product gives plausible values scaled to its serving and can be logged. An unknown barcode says "No barcode match found".
13. **Deleting entries.** Delete a cardio, a weight and a manual exercise: "calories burned" falls each time. Delete a food and a water entry: the totals fall.
14. **Streak.** With calories at 80 to 120% of target, water at 80% or more, and a cardio or weight exercise logged, today counts toward the streak.
15. **Text features and their fallback.** The daily tip, calorie insight, diet-score explanation, weekly report and voice coach each show AI text. In airplane mode each shows local text and nothing crashes.
16. **Sessions.** After more than an hour idle (ID tokens last one hour) a scan succeeds without a sign-in prompt. After signing out, a scan is refused with a sign-in message.
17. **Rate limit.** Seven scans inside a minute: the seventh says you have scanned a lot; after a minute scanning works again.

After section 6, repeat checks 4, 6, 7, 8 and 13, and edit your daily targets, because those write to Firestore.

## 6. Firestore rules: the 5 steps

`npm run test:rules` is a local emulator test. Merging changes nothing in production until you deploy.

1. **Confirm the project.** `.firebaserc` names the default project. It must equal the app's `EXPO_PUBLIC_FIREBASE_PROJECT_ID` and the backend's `FIREBASE_PROJECT_ID` (they agreed locally at this audit).
2. **Save what is live.** In the Firebase console (Firestore Database, then Rules) copy the current rules text into a file outside the repository. The console also keeps a history of published versions.
3. **Re-test the exact commit** you will deploy: `npm run test:rules` (149 tests). On Windows, stop any leftover emulator `java.exe` first.
4. **Deploy only the rules:**

   ```bash
   firebase deploy --only firestore:rules --project <project-id>
   ```

   Always pass `--only`: `firebase.json` also holds an `auth` block and an indexes file that a bare `firebase deploy` would push as well. `--dry-run` exists in firebase-tools 15.30.2 (it validates without releasing, and needs you signed in). Deploy after the new app is on devices.
5. **Check on a device at once**: log a food, a manual entry, delete each, log water, log exercise, edit targets, and run onboarding. Watch the rules monitoring in the console for denials.

**Rollback.** Publish the previous version from the console's rules history, or paste the text you saved in step 2, or restore the file from git (`git show main:firestore.rules > firestore.rules`) and run the same deploy command. If a legitimate action is denied, roll back first, then write down the exact operation and fix the rules or the app.

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
| Firestore rules | Publish the previous version (section 6). |
| Gemini key | Restore the old value in Render (section 7). |
| Daily budget used up | Raise `AI_DAILY_ATTEMPT_BUDGET` in Render deliberately and redeploy. |

## 9. After release

- Read the `ai.request` lines, or run `npm run --silent summarize:logs < logs.txt`, for failure rate, fallback share, latency and cache hit rate. Decide from those numbers whether cold-start or latency work is worthwhile.
- Watch for `BUDGET_EXHAUSTED` (the shared daily budget is also an availability limit), `RATE_LIMITED`, `AI_UNAVAILABLE` and `MODEL_NOT_FOUND` (a model was retired: update `GEMINI_MODEL_CHAIN` and run `npm run check:models`).
- Watch Render's memory graph and restarts. A vision request holds the image roughly three times over and there is no global concurrency cap.
- Watch the Firestore rules monitoring for denials, and Google Cloud billing for the Gemini key.

## Known limitations to accept or fix later

- **Targets form.** Saving a daily calorie target outside 100 to 20,000 is refused by the rules, and the screen shows a generic "check your connection" message. The other targets are saved as text with no validation.
- **Three malformed dataset rows.** Three of the 1,014 rows in the bundled CSV (`csv-113`, `csv-234`, `csv-576`) have a stray leading quote in the name and 0 calories, and show up in the Diet tab search. Logging refuses food with 0 calories, so nothing bad is saved. The fix belongs in `scripts/processCsv.js` (quote handling) and a regenerated dataset.
- **A barcode with implausible data** is reported as "No barcode match found", the same message as an unknown barcode.
- **Shared daily budget.** A few dozen heavy or malicious accounts can use it up. Closing sign-ups to unverified accounts or adding Firebase App Check is the fix, and neither exists yet.
- **`/api/foods/search`** is unauthenticated by design (legacy contract). Keep `FATSECRET_*` unset.
- **Everything in memory.** Rate limits, the vision cache and the budget are per instance and reset on restart. More than one instance needs shared state.
