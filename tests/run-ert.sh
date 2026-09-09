#!/bin/sh
# Run from any directory, without the user's Emacs initialization.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export DENOTE_EXPLORE_TEST_ROOT="$ROOT"
cd "$ROOT"
exec "${EMACS:-emacs}" --batch -Q -l tests/bootstrap.el \
  --eval "(ert-run-tests-batch-and-exit ${1:-t})"
