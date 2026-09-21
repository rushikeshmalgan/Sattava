#!/usr/bin/env bash
# Guards the trust boundary of the mobile app. Two kinds of thing may exist only in backend/:
#   - the Gemini key, SDK and endpoint (the app calls the backend, never Gemini)
#   - the MongoDB driver, connection string and its variable (the app calls the backend, never the database)
# Run locally with `bash scripts/check-client-boundary.sh`; CI runs it on every push.
#
# It scans every tracked file EXCEPT a short allow-list of places that legitimately
# mention these terms, so a new mobile directory is covered automatically. A grep
# that fails to run is reported as an error, never silently treated as "no match".
set -uo pipefail

cd "$(git rev-parse --show-toplevel)"

EXCLUDES=(
  ':(exclude)backend'                                # the only legitimate caller of Gemini and MongoDB
  ':(exclude)__tests__'                              # the guard tests name the patterns
  ':(exclude).github'                                # workflows name the patterns
  ':(exclude)scripts/check-client-boundary.sh'       # this file
  ':(exclude)*.md'                                   # docs
  ':(exclude)package-lock.json'
  ':(exclude).agents'
  ':(exclude)skills-lock.json'
)

failed=0

check() {
  local title="$1" pattern="$2" hint="$3" hits code
  hits="$(git grep -InE "$pattern" -- . "${EXCLUDES[@]}")"
  code=$?
  if [ "$code" -eq 0 ]; then
    echo "FAIL  $title"
    echo "$hits" | sed 's/^/        /'
    echo "      -> $hint"
    failed=1
  elif [ "$code" -eq 1 ]; then
    echo "ok    $title"
  else
    echo "ERROR $title: git grep failed (exit $code)"
    failed=1
  fi
}

check "No Gemini API key variable outside backend/" \
  'EXPO_PUBLIC_GEMINI|GEMINI_API_KEY' \
  "The Gemini key must live only in backend/ (server-side)."

check "No Gemini SDK outside backend/" \
  '@google/generative-ai|@google/genai|GoogleGenerativeAI' \
  "The mobile app must not bundle a Gemini SDK; all AI calls go through the backend."

check "No direct Gemini endpoint outside backend/" \
  'generativelanguage\.googleapis\.com' \
  "Only the backend may call Gemini."

check "No MongoDB connection string outside backend/" \
  'mongodb(\+srv)?://' \
  "A connection string holds the database password; it belongs only in backend/ (server-side)."

check "No MongoDB variable outside backend/" \
  'MONGODB_URI|EXPO_PUBLIC_MONGO' \
  "Anything EXPO_PUBLIC_ is bundled into the app and public. The database is configured only on the server."

check "No MongoDB driver outside backend/" \
  "(from|require\\()[[:space:]]*['\"]mongodb['\"]|\"(mongodb|mongoose)\"[[:space:]]*:" \
  "The mobile app talks to the backend API; it must not bundle a database driver."

exit "$failed"
