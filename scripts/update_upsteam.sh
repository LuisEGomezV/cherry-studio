#!/bin/bash
set -e

# 1. Fetch upstream tags
git fetch upstream --tags

# 2. Find the latest version-like tag (vX.Y.Z)
latest_tag=$(git tag --sort=-v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1)

if [ -z "$latest_tag" ]; then
  echo "❌ No version-like tags found!"
  exit 1
fi

echo "👉 Latest stable tag detected: $latest_tag"

# 3. Ask for confirmation
read -p "Do you want to update upstream-stable to $latest_tag? [y/N]: " confirm
case "$confirm" in
    [yY]|[yY][eE][sS])
        echo "✅ Proceeding with update..."
        ;;
    *)
        echo "❌ Update cancelled by user."
        exit 0
        ;;
esac

# 4. Checkout upstream-stable
git checkout upstream-stable

# 5. Merge the tag into upstream-stable (with a message)
git merge --no-ff "$latest_tag" -m "chore: update upstream-stable to $latest_tag"

# 6. Push safely (no --force needed)
git push origin upstream-stable

echo "🎉 Done! upstream-stable updated to $latest_tag"