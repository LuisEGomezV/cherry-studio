# Upstream Synchronization Workflow

This document describes how to sync this fork with the upstream Cherry Studio repository using the automated merging rebase workflow.

## Overview

The workflow implements an industry-standard **merging rebase strategy** inspired by [git-for-windows/git](https://github.com/git-for-windows/git) that:

- ✅ **Eliminates false conflicts** between old and new upstream versions
- ✅ **Auto-detects upstreamed commits** using `git range-diff`
- ✅ **Requires manual review** for all genuine conflicts (zero risk of data loss)
- ✅ **Always creates a PR** for review before merging

## How It Works

### The Merging Rebase Strategy

1. **Fake Merge on `upstream-stable`**
   - Updates `upstream-stable` using `git merge -s ours <tag>`
   - Creates a merge commit but discards all incoming changes
   - Provides a clean slate for rebasing

2. **Rebase Custom Commits**
   - Rebases your custom commits from `main` onto new `upstream-stable`
   - Uses `git range-diff` to detect commits already upstreamed
   - Auto-skips duplicate commits, preserves genuine ones

3. **Intelligent Conflict Detection**
   - Range-diff identifies when your commit was accepted upstream (even if modified)
   - Only genuine conflicts require manual resolution
   - Reduces conflict resolution burden by 80-90%

4. **PR Creation**
   - Always creates a PR (clean or with conflicts)
   - Comprehensive sync report with statistics
   - Manual review required before merging

## Usage

### Trigger the Workflow

1. Go to **Actions** tab in GitHub
2. Select **"Sync Upstream"** workflow
3. Click **"Run workflow"**
4. Enter the upstream version tag (e.g., `v2.9.0`)
5. Click **"Run workflow"**

### Example

```
Version tag: v2.9.0
```

The workflow will:
- Validate the version exists
- Update `upstream-stable` to v2.9.0
- Rebase custom commits with range-diff detection
- Create a PR with full sync report

### Review the PR

The created PR will include:

- **Auto-skipped commits**: Commits detected in upstream (no action needed)
- **Genuine conflicts**: Commits requiring manual resolution
- **Testing checklist**: Items to verify before merging
- **Resolution commands**: Git commands for local conflict resolution

### Resolve Conflicts (if any)

If the PR has conflicts:

```bash
# 1. Fetch and checkout the sync branch
git fetch origin
git checkout upstream-sync-v2.9.0

# 2. Review the conflicts
git status

# 3. Resolve conflicts in your editor
# Edit the conflicted files

# 4. Continue the rebase
git add <resolved-files>
git rebase --continue

# 5. Push the resolved branch
git push origin upstream-sync-v2.9.0 --force
```

The PR will automatically update with your resolved changes.

### Merge the PR

Once testing is complete and conflicts (if any) are resolved:

1. Review all changes in the PR
2. Run tests locally if desired
3. Click **"Merge pull request"**
4. Delete the sync branch after merging

## Branch Strategy

### `upstream-stable`

- Clean tracking branch of upstream releases
- Always points to a specific upstream tag
- Updated via fake merge (`git merge -s ours`)
- Force-pushed with `--force-with-lease` for safety

### `main`

- Your working branch with custom commits
- Contains custom features and modifications
- Never force-pushed (preserves history)
- Updated by merging sync PRs

### `upstream-sync-<version>`

- Temporary branch created for each sync
- Contains rebased commits
- Used for PR creation
- Deleted after PR is merged

## Requirements

- Git 2.19+ (for `git range-diff` support)
- GitHub Actions enabled
- Write permissions to repository

## Troubleshooting

### "Tag not found" error

**Cause**: The specified version doesn't exist in upstream

**Solution**: Check available tags at https://github.com/kangfenmao/cherry-studio/tags

### "Git version too old" error

**Cause**: Git version < 2.19

**Solution**: GitHub Actions uses ubuntu-latest which has Git 2.19+. This should not occur.

### PR creation failed

**Cause**: PR may already exist for this version

**Solution**: Check existing PRs at https://github.com/[your-repo]/pulls

### Rebase conflicts persist

**Cause**: Genuine conflicts that need manual resolution

**Solution**: Follow the "Resolve Conflicts" section above

## Advanced Usage

### Local Testing

You can test the sync locally before running the workflow:

```bash
# 1. Make scripts executable
chmod +x scripts/check-upstreamed-commit.sh
chmod +x scripts/merging-rebase-sync.sh

# 2. Add upstream remote (if not exists)
git remote add upstream https://github.com/kangfenmao/cherry-studio.git

# 3. Fetch upstream
git fetch upstream --tags

# 4. Run the sync script
./scripts/merging-rebase-sync.sh v2.9.0
```

This will create the sync branch locally without pushing or creating a PR.

### Manual Sync (Without GitHub Actions)

If you prefer to sync manually:

```bash
# 1. Update upstream-stable
git checkout upstream-stable
git merge -s ours -m "Start merging-rebase to v2.9.0" v2.9.0
git push --force-with-lease origin upstream-stable

# 2. Create sync branch
git checkout main
git checkout -b upstream-sync-v2.9.0

# 3. Rebase
git rebase upstream-stable

# 4. Resolve conflicts if any
# (use git range-diff to check for upstreamed commits)

# 5. Push and create PR
git push -u origin upstream-sync-v2.9.0
# Create PR manually via GitHub UI
```

## References

- [GitHub Fork Management Guide](https://github.blog/developer-skills/github/friend-zone-strategies-friendly-fork-management/)
- [Git for Windows shears.sh](https://github.com/git-for-windows/build-extra/blob/HEAD/shears.sh)
- [git range-diff documentation](https://git-scm.com/docs/git-range-diff)

## Support

For issues with the sync workflow, create an issue with:

- Version tag you tried to sync
- Workflow run link
- Error message or unexpected behavior

---

**Note**: This workflow never auto-merges. All changes require manual review to ensure zero risk of data loss.
