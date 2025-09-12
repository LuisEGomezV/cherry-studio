#!/bin/bash
set -e

# Usage:
#   ./update-upstream-stable.sh [current=vX.Y.Z]

# Ensure upstream exists
if ! git remote get-url upstream &>/dev/null; then
  echo "⚠️ No 'upstream' remote found. Add it with:"
  echo "   git remote add upstream <URL-of-original-repo>"
  exit 1
fi

# Parse parameter
current_param=""
for arg in "$@"; do
  case $arg in
    current=*)
      current_param="${arg#current=}"
      ;;
  esac
done

# Fetch tags
git fetch upstream --tags

# Checkout branch
git checkout upstream-stable

# Determine current tag
if [ -n "$current_param" ]; then
  current_tag="$current_param"
else
  current_tag=$(git describe --tags --abbrev=0 --exact-match 2>/dev/null || true)
fi

# Get all tags (including rc/beta), sorted by version
all_tags=($(git tag --sort=v:refname))

# If no current tag, pick first
if [ -z "$current_tag" ]; then
  current_tag="${all_tags[0]}"
fi

echo "📌 Current tag on upstream-stable: $current_tag"

# Collect newer tags
apply_tags=()
found=false
for tag in "${all_tags[@]}"; do
  if [ "$tag" == "$current_tag" ]; then
    found=true
    continue
  fi
  if [ "$found" == true ]; then
    apply_tags+=("$tag")
  fi
done

if [ ${#apply_tags[@]} -eq 0 ]; then
  echo "✅ Already up to date with the latest tag ($current_tag)"
  exit 0
fi

echo "🆕 Tags to apply: ${apply_tags[*]}"

# Ask confirmation
read -p "Do you want to update upstream-stable through these tags? [y/N]: " answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "❌ Update canceled."
  exit 1
fi

# Apply sequentially
for tag in "${apply_tags[@]}"; do
  echo "➡️ Updating to $tag ..."
  git merge --ff-only "$tag" || {
    echo "❌ Fast-forward failed at $tag. History might have diverged."
    echo "You may need to reset manually:"
    echo "   git reset --hard $tag"
    exit 1
  }
done

git push origin upstream-stable

echo "🎉 Updated upstream-stable to ${apply_tags[-1]}"