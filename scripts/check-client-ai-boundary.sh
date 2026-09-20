#!/usr/bin/env bash
# Guards the AI boundary: the Gemini key, SDK and endpoint may exist only in backend/.
# Run locally with `bash scripts/check-client-ai-boundary.sh`; CI runs it on every push.
#
# It scans every tracked file EXCEPT a short allow-list of places that legitimately
# mention these terms, so a new mobile directory is covered automatically. A grep
# that fails to run is reported as an error, never silently treated as "no match".
set -uo pipefail

cd "$(git rev-parse --show-toplevel)"

EXCLUDES=(
  ':(exclude)backend'                                # the only legitimate Gemini caller
  ':(exclude)__tests__'                              # the guard test names the patterns
  ':(exclude).github'                                # workflows name the patterns
  ':(exclude)scripts/check-client-ai-boundary.sh'    # this file
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

exit "$failed"
