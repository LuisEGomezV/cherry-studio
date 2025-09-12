#!/bin/bash
set -e

# -----------------------------
# 1. Fetch upstream tags
# -----------------------------
git fetch upstream --tags
git fetch origin

# -----------------------------
# 2. Find the latest version-like tag (vX.Y.Z)
# -----------------------------
latest_tag=$(git tag --sort=-v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1)

if [ -z "$latest_tag" ]; then
  echo "❌ No version-like tags found!"
  exit 1
fi

echo "👉 Latest stable tag detected: $latest_tag"

# -----------------------------
# 3. Ask user how to update upstream-stable
# -----------------------------
echo "Choose how to update upstream-stable:"
echo "1) Merge the tag (preserve history)"
echo "2) Force update via reset --hard (overwrite local branch)"
read -p "Enter 1 or 2 [default 1]: " update_choice

git checkout upstream-stable

if [[ "$update_choice" == "2" ]]; then
    echo "⚠️ You chose to force update. Local upstream-stable will be reset to $latest_tag"
    read -p "Are you sure? This can overwrite commits. [y/N]: " force_confirm
    if [[ "$force_confirm" =~ ^[Yy]$ ]]; then
        git reset --hard "$latest_tag"
        git push origin upstream-stable --force
        echo "✅ upstream-stable has been force-updated to $latest_tag"
    else
        echo "❌ Force update canceled."
        exit 0
    fi
else
    git merge --no-ff "$latest_tag" -m "chore: update upstream-stable to $latest_tag"
    git push origin upstream-stable
    echo "✅ upstream-stable has been merged with $latest_tag"
fi

# -----------------------------
# 4. Attempt rebase of main
# -----------------------------
read -p "Do you want to attempt rebasing main onto the updated upstream-stable? [y/N]: " rebase_confirm
if [[ ! "$rebase_confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Skipping rebase."
    echo "🎉 Script completed!"
    exit 0
fi

git checkout main

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️ main has uncommitted changes. Please stash or commit them first."
    exit 1
fi

# Attempt rebase
echo "➡️ Rebasing main onto upstream-stable..."
if git rebase upstream-stable; then
    echo "✅ Rebase completed successfully!"
    # Push automatically using safe force
    git push origin main --force-with-lease
    echo "✅ main branch pushed to origin with --force-with-lease"
else
    echo "⚠️ Rebase encountered conflicts."
    echo "Please resolve conflicts manually:"
    echo "  git status          # see conflicting files"
    echo "  git rebase --continue"
    echo "  git rebase --abort  # if you want to cancel"
fi

echo "🎉 Script completed!"