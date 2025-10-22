#!/bin/bash

# Script to update upstream-stable branch and merge it into main
#
# Workflow:
# 1. upstream-stable → reset to latest stable tag (clean tracking branch)
# 2. main → merge from upstream-stable (preserves your custom commits)
#
# Why this approach:
# - upstream-stable is kept clean (no merge commits) to avoid false conflicts
# - main uses merge (not rebase) so only YOUR changes can conflict
# - Conflicts only occur when your custom commits genuinely conflict with upstream

set -e

UPSTREAM_REMOTE="upstream"
UPSTREAM_STABLE_BRANCH="upstream-stable"
MAIN_BRANCH="main"

echo "🔄 Fetching latest changes from upstream..."
git fetch "$UPSTREAM_REMOTE"

echo ""
echo "📋 Fetching tags from upstream..."
git fetch "$UPSTREAM_REMOTE" --tags

echo ""
echo "🔍 Finding latest stable tag..."
# Get the latest tag that matches semantic versioning (v1.2.3 format)
LATEST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -n 1)

if [ -z "$LATEST_TAG" ]; then
    echo "❌ No stable tags found!"
    exit 1
fi

echo "👉 Latest stable tag detected: $LATEST_TAG"

echo ""
echo "🔄 Switching to $UPSTREAM_STABLE_BRANCH..."
git checkout "$UPSTREAM_STABLE_BRANCH"

# Check if upstream-stable has local commits
CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "none")
if [ "$CURRENT_TAG" != "$LATEST_TAG" ] && [ "$(git rev-list HEAD...$LATEST_TAG --count)" -eq 0 ]; then
    echo "⚠️  Warning: $UPSTREAM_STABLE_BRANCH has local commits not in upstream"
    echo "   These will be lost when updating to $LATEST_TAG"
    read -p "Continue? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

echo ""
echo "🔄 Updating $UPSTREAM_STABLE_BRANCH to $LATEST_TAG..."
echo "   Using reset --hard to keep branch clean (prevents false conflicts)"
git reset --hard "$LATEST_TAG"

echo ""
echo "✅ $UPSTREAM_STABLE_BRANCH updated to $LATEST_TAG"

echo ""
echo "🔄 Switching to $MAIN_BRANCH..."
git checkout "$MAIN_BRANCH"

echo ""
echo "🔀 Merging $UPSTREAM_STABLE_BRANCH into $MAIN_BRANCH..."
echo ""
echo "⚠️  Note: Due to your branch having mixed upstream/custom commits,"
echo "   we'll use a strategy that prefers upstream changes for conflicts"
echo ""
echo "Choose merge strategy:"
echo "1) Standard merge (you resolve conflicts manually) - Recommended for first time"
echo "2) Auto-resolve: prefer upstream (use for version bumps, package.json, etc.)"
echo "3) Auto-resolve: prefer your changes (dangerous - may lose upstream fixes)"
read -p "Enter 1, 2, or 3 [default 1]: " strategy
strategy=${strategy:-1}

MERGE_SUCCESS=false

case $strategy in
    2)
        echo "Using strategy: preferring upstream changes..."
        if git merge "$UPSTREAM_STABLE_BRANCH" -X theirs --no-edit; then
            MERGE_SUCCESS=true
        fi
        ;;
    3)
        echo "⚠️  Using strategy: preferring YOUR changes (may lose upstream updates)..."
        if git merge "$UPSTREAM_STABLE_BRANCH" -X ours --no-edit; then
            MERGE_SUCCESS=true
        fi
        ;;
    *)
        echo "Using standard merge..."
        if git merge "$UPSTREAM_STABLE_BRANCH" --no-edit; then
            MERGE_SUCCESS=true
        fi
        ;;
esac

if [ "$MERGE_SUCCESS" = true ]; then
    echo ""
    echo "✅ Successfully merged $UPSTREAM_STABLE_BRANCH into $MAIN_BRANCH"
    echo ""
    echo "📝 Summary:"
    echo "  - $UPSTREAM_STABLE_BRANCH: now at $LATEST_TAG"
    echo "  - $MAIN_BRANCH: merged with $UPSTREAM_STABLE_BRANCH"
    echo ""
    echo "💡 Next steps:"
    echo "  1. IMPORTANT: Review the changes carefully!"
    echo "     git diff HEAD~1"
    echo "  2. Test that your custom features still work"
    echo "  3. Push upstream-stable: git push origin $UPSTREAM_STABLE_BRANCH --force-with-lease"
    echo "  4. Push main: git push origin $MAIN_BRANCH"
else
    echo ""
    echo "❌ Merge encountered conflicts!"
    echo ""
    if [ "$strategy" = "1" ]; then
        echo "🛠️  Manual resolution required:"
        echo ""
        echo "For files like package.json, electron-builder.yml, version files:"
        echo "  - Use upstream version (accept theirs): git checkout --theirs <file>"
        echo ""
        echo "For your custom code:"
        echo "  - Carefully merge both changes"
        echo ""
        echo "After resolving:"
        echo "  1. Stage files: git add <file>"
        echo "  2. Complete merge: git commit"
        echo "  Or abort: git merge --abort"
        echo ""
        echo "💡 Tip: If you have too many false conflicts, run this script again"
        echo "   and choose option 2 (auto-resolve with upstream)"
    fi
    exit 1
fi