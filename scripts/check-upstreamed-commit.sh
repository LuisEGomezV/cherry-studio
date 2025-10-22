#!/bin/bash
#
# check-upstreamed-commit.sh
# 
# Uses git range-diff to detect if a commit was already upstreamed
# Returns 0 if commit found in upstream (should be skipped)
# Returns 1 if commit not found (genuine custom commit)
#

set -e

COMMIT_SHA="$1"

if [ -z "$COMMIT_SHA" ]; then
    echo "Usage: $0 <commit-sha>" >&2
    exit 2
fi

# Verify Git version supports range-diff (2.19+)
GIT_VERSION=$(git --version | grep -oP '\d+\.\d+' | head -1)
if [[ $(echo "$GIT_VERSION 2.19" | awk '{print ($1 >= $2)}') -eq 0 ]]; then
    echo "ERROR: Git 2.19+ required for range-diff" >&2
    exit 2
fi

# Get commit info
COMMIT_MSG=$(git log -1 --format="%s" "$COMMIT_SHA" 2>/dev/null || echo "unknown")

# Run range-diff to check if commit exists in upstream
# Compare this single commit against the upstream range
RANGE_DIFF_OUTPUT=$(git range-diff --left-only "${COMMIT_SHA}^!..${COMMIT_SHA}" "${COMMIT_SHA}..upstream-stable" 2>/dev/null || echo "")

if [ -z "$RANGE_DIFF_OUTPUT" ]; then
    # No output from range-diff means commit was found in upstream
    echo "✓ Commit $COMMIT_SHA found in upstream (upstreamed)" >&2
    echo "  Message: $COMMIT_MSG" >&2
    exit 0
else
    # Output present means commit not in upstream
    echo "✗ Commit $COMMIT_SHA not found in upstream (custom commit)" >&2
    echo "  Message: $COMMIT_MSG" >&2
    exit 1
fi
