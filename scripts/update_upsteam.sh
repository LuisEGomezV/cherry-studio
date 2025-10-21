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
# 4. Offer to merge into main
# -----------------------------
read -p "Do you want to merge upstream-stable into main? [y/N]: " merge_confirm
if [[ ! "$merge_confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Skipping main merge."
    echo "🎉 Script completed!"
    exit 0
fi

# Switch to main
git checkout main

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️ main has uncommitted changes. Please stash or commit them first."
    exit 1
fi

# Merge upstream-stable into main
echo "➡️ Merging upstream-stable into main..."
if git merge --no-ff upstream-stable -m "chore: merge upstream-stable into main"; then
    echo "✅ Merge completed successfully!"
    git push origin main
    echo "✅ main branch pushed to origin"
else
    echo "⚠️ Merge encountered conflicts."
    echo "Please resolve them manually, then run:"
    echo "  git add <resolved-files>"
    echo "  git merge --continue"
    echo "Or abort with:"
    echo "  git merge --abort"
fi

echo "🎉 Script completed!"