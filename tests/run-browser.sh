#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
export PLAYWRIGHT_BROWSERS_PATH="$ROOT/tests/.deps/browsers"
TASK_DIR=${TASK_DIR:-"$ROOT/.agents/plans/$(date +%Y%m%dT%H%M%S)--browser-test-run-artifacts__in_progress"}
export DENOTE_EXPLORE_TEST_ARTIFACTS="$TASK_DIR/browser"
mkdir -p "$DENOTE_EXPLORE_TEST_ARTIFACTS"
exec node --test --test-concurrency=1 --test-name-pattern="${1:-.}" tests/browser-*.test.mjs
