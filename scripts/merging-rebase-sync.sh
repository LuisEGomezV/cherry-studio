#!/bin/bash
#
# merging-rebase-sync.sh
#
# Implements the merging rebase strategy for syncing fork with upstream
# Based on git-for-windows/git approach
#
# Usage: ./merging-rebase-sync.sh <version-tag>
#

set -e

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_BRANCH="upstream-sync-$VERSION"

# Output files
REPORT_FILE="/tmp/sync-report.md"
SKIPPED_FILE="/tmp/skipped-commits.txt"
CONFLICTS_FILE="/tmp/conflict-commits.txt"

# Initialize tracking
echo "" > "$SKIPPED_FILE"
echo "" > "$CONFLICTS_FILE"

log() {
    echo "$(date '+%H:%M:%S') $1"
}

error() {
    echo "❌ ERROR: $1" >&2
    exit 1
}

if [ -z "$VERSION" ]; then
    error "Usage: $0 <version-tag>"
fi

log "🚀 Starting merging rebase sync to $VERSION"
log "📝 Sync branch: $SYNC_BRANCH"
echo ""

# =============================================================================
# Phase 1: Fake Merge on upstream-stable
# =============================================================================

log "🔄 Phase 1: Updating upstream-stable with fake merge..."

# Checkout or create upstream-stable
if git show-ref --verify --quiet refs/heads/upstream-stable; then
    git checkout upstream-stable
    PREV_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "initial")
    log "  Previous version: $PREV_VERSION"
else
    log "  Creating upstream-stable branch..."
    git checkout -b upstream-stable "$VERSION"
    PREV_VERSION="initial"
fi

# Execute fake merge
log "  Executing fake merge: git merge -s ours $VERSION"
if git merge -s ours -m "Start merging-rebase to $VERSION" "$VERSION" 2>/dev/null; then
    log "✅ Fake merge completed"
else
    log "⚠️  Fake merge failed, using reset method..."
    git reset --hard "$VERSION"
    log "✅ upstream-stable reset to $VERSION"
fi

UPSTREAM_STABLE_SHA=$(git rev-parse HEAD)
log "  upstream-stable SHA: $UPSTREAM_STABLE_SHA"

# =============================================================================
# Phase 2: Push upstream-stable
# =============================================================================

log ""
log "📤 Phase 2: Pushing upstream-stable..."

if git push --force-with-lease origin upstream-stable 2>/dev/null; then
    log "✅ Pushed with --force-with-lease"
else
    log "⚠️  Force-with-lease failed, retrying with --force..."
    if git push --force origin upstream-stable; then
        log "✅ Pushed with --force"
    else
        error "Failed to push upstream-stable"
    fi
fi

# =============================================================================
# Phase 3: Create sync branch and start rebase
# =============================================================================

log ""
log "🌿 Phase 3: Creating sync branch and rebasing..."

# Checkout main
git checkout main
MAIN_SHA=$(git rev-parse HEAD)

# Count custom commits
COMMIT_COUNT=$(git rev-list --count upstream-stable..main 2>/dev/null || echo "0")
log "  Custom commits to rebase: $COMMIT_COUNT"

# Create sync branch
if git show-ref --verify --quiet "refs/heads/$SYNC_BRANCH"; then
    log "  Sync branch exists, deleting..."
    git branch -D "$SYNC_BRANCH"
fi

git checkout -b "$SYNC_BRANCH"
log "✅ Sync branch created"

# Start rebase
log ""
log "🔄 Starting rebase onto upstream-stable..."

REBASE_STATUS="clean"
SKIPPED_COUNT=0
CONFLICT_COUNT=0

# Attempt rebase
if ! git rebase upstream-stable 2>/dev/null; then
    log "⚠️  Rebase encountered conflicts"
    REBASE_STATUS="conflicts"
    
    # Check if we should try range-diff detection
    if [ -x "$SCRIPT_DIR/check-upstreamed-commit.sh" ]; then
        log ""
        log "🔍 Checking for upstreamed commits with range-diff..."
        
        while true; do
            # Get current commit being rebased
            CURRENT_COMMIT=$(git rev-parse --verify REBASE_HEAD 2>/dev/null || echo "")
            
            if [ -z "$CURRENT_COMMIT" ]; then
                log "  No more commits in rebase"
                break
            fi
            
            COMMIT_MSG=$(git log -1 --format="%s" "$CURRENT_COMMIT")
            log "  Checking: $CURRENT_COMMIT - $COMMIT_MSG"
            
            # Run range-diff check
            if "$SCRIPT_DIR/check-upstreamed-commit.sh" "$CURRENT_COMMIT" 2>&1; then
                # Commit found in upstream - skip it
                log "    → Skipping (found in upstream)"
                echo "$CURRENT_COMMIT $COMMIT_MSG" >> "$SKIPPED_FILE"
                SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
                
                if git rebase --skip; then
                    log "    ✓ Skipped successfully"
                else
                    log "    ✗ Skip failed"
                    break
                fi
            else
                # Genuine conflict - preserve for manual resolution
                log "    → Genuine conflict (not in upstream)"
                echo "$CURRENT_COMMIT $COMMIT_MSG" >> "$CONFLICTS_FILE"
                CONFLICT_COUNT=$((CONFLICT_COUNT + 1))
                
                # List conflicted files
                CONFLICT_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")
                if [ -n "$CONFLICT_FILES" ]; then
                    log "    Files:"
                    echo "$CONFLICT_FILES" | while read -r file; do
                        log "      - $file"
                    done
                fi
                
                # Stop here for manual resolution
                break
            fi
        done
    else
        log "⚠️  range-diff script not found, stopping at first conflict"
    fi
fi

if [ "$REBASE_STATUS" = "clean" ]; then
    log "✅ Rebase completed without conflicts"
fi

# =============================================================================
# Phase 4: Push sync branch
# =============================================================================

log ""
log "📤 Phase 4: Pushing sync branch..."

if git push -u origin "$SYNC_BRANCH" --force 2>/dev/null; then
    log "✅ Sync branch pushed"
else
    error "Failed to push sync branch"
fi

# =============================================================================
# Phase 5: Generate sync report
# =============================================================================

log ""
log "📊 Generating sync report..."

cat > "$REPORT_FILE" << EOF
# Upstream Sync Report: $VERSION

## Summary

- **Target version**: $VERSION
- **Previous version**: $PREV_VERSION
- **Sync branch**: \`$SYNC_BRANCH\`
- **Status**: $([ "$REBASE_STATUS" = "clean" ] && echo "✅ Clean" || echo "⚠️ Has conflicts")

## Statistics

- **Total custom commits**: $COMMIT_COUNT
- **Auto-skipped (upstreamed)**: $SKIPPED_COUNT
- **Genuine conflicts**: $CONFLICT_COUNT

EOF

if [ "$SKIPPED_COUNT" -gt 0 ]; then
    cat >> "$REPORT_FILE" << EOF

## Auto-Skipped Commits

The following commits were automatically skipped because they were detected in upstream using \`git range-diff\`:

EOF
    cat "$SKIPPED_FILE" | grep -v "^$" | while read -r line; do
        echo "- $line" >> "$REPORT_FILE"
    done
fi

if [ "$CONFLICT_COUNT" -gt 0 ]; then
    cat >> "$REPORT_FILE" << EOF

## Genuine Conflicts

The following commits require manual resolution:

EOF
    cat "$CONFLICTS_FILE" | grep -v "^$" | while read -r line; do
        echo "- $line" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF

### Resolution Steps

1. Checkout the sync branch locally:
   \`\`\`bash
   git fetch origin
   git checkout $SYNC_BRANCH
   \`\`\`

2. Continue the rebase and resolve conflicts:
   \`\`\`bash
   # Resolve conflicts in your editor
   git add <resolved-files>
   git rebase --continue
   \`\`\`

3. Push the resolved branch:
   \`\`\`bash
   git push origin $SYNC_BRANCH --force
   \`\`\`

EOF
fi

cat >> "$REPORT_FILE" << EOF

## Resources

- [Upstream Release Notes](https://github.com/kangfenmao/cherry-studio/releases/tag/$VERSION)
- [Compare Changes](https://github.com/kangfenmao/cherry-studio/compare/$PREV_VERSION...$VERSION)

## Testing Checklist

Before merging, please verify:

- [ ] Application builds successfully
- [ ] Core functionality works
- [ ] Fork-specific features still work
- [ ] No unexpected breaking changes

---

*Generated by merging-rebase-sync.sh*
EOF

log "✅ Report generated: $REPORT_FILE"

# =============================================================================
# Summary
# =============================================================================

log ""
log "═══════════════════════════════════════════════════════"
log "✅ Merging rebase sync completed"
log "═══════════════════════════════════════════════════════"
log ""
log "📊 Summary:"
log "  • Sync branch: $SYNC_BRANCH"
log "  • Status: $REBASE_STATUS"
log "  • Auto-skipped: $SKIPPED_COUNT commits"
log "  • Conflicts: $CONFLICT_COUNT commits"
log ""
log "📝 Next steps:"
log "  1. Review the generated PR"
log "  2. Resolve any conflicts if needed"
log "  3. Test the changes"
log "  4. Merge when ready"
log ""

# Output for GitHub Actions
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "sync_branch=$SYNC_BRANCH" >> "$GITHUB_OUTPUT"
    echo "status=$REBASE_STATUS" >> "$GITHUB_OUTPUT"
    echo "skipped_count=$SKIPPED_COUNT" >> "$GITHUB_OUTPUT"
    echo "conflict_count=$CONFLICT_COUNT" >> "$GITHUB_OUTPUT"
    echo "report_file=$REPORT_FILE" >> "$GITHUB_OUTPUT"
fi

exit 0
