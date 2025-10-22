# Automate Upstream Synchronization

## Problem Statement

The current manual process for syncing this fork with the upstream Cherry Studio repository has critical issues:

1. **Manual Intervention Required**: Updates require running `scripts/update_upsteam.sh` manually, leading to delayed integration of upstream fixes and features.

2. **Accumulating Conflicts**: When merging newer upstream versions into main, older commits from previous upstream versions conflict with their newer counterparts. Git doesn't recognize these as related changes from the same source, causing:
   - More conflicts with each version update
   - Manual resolution of "false conflicts" where both versions are from upstream
   - Increased maintenance burden over time

3. **Inconsistent Branch History**: The main branch contains a mix of:
   - Custom fork-specific commits
   - Old upstream commits from previous versions
   - Merge commits from multiple upstream updates
   
   This makes it difficult for Git to properly track the relationship between old and new upstream changes.

## Proposed Solution

Implement a **manual-trigger workflow** with intelligent automation that follows the industry-standard **merging rebase strategy** (inspired by git-for-windows/git approach documented in [GitHub's fork management guide](https://github.blog/developer-skills/github/friend-zone-strategies-friendly-fork-management/)):

1. **Manual Trigger Only**: Workflow triggered manually when you decide to sync (via GitHub Actions UI or command)
2. **Smart Detection**: Validates and processes specified upstream version tag (semantic versioning: v*.*.*)\n3. **Merging Rebase Strategy**:
   - Updates `upstream-stable` to the new tag using `git merge -s ours` (creates clean slate)
   - Rebases custom commits from `main` on top of new upstream
   - Uses `git range-diff` to automatically identify commits that were already upstreamed
   - Skips duplicate commits, presents only genuine conflicts for review
4. **Safe Conflict Handling**:
   - **No auto-acceptance of conflicts** - all conflicts require manual review
   - Intelligent detection of upstreamed commits (eliminates false conflicts)
   - Creates detailed conflict report with resolution guidance
   - All changes presented in PR for review before merging

## Benefits

- **Controlled Updates**: You decide when to sync, maintaining full control over timing
- **Eliminates False Conflicts**: Merging rebase strategy recognizes when commits were upstreamed, preventing old vs new upstream conflicts
- **Safer Process**: All conflicts require manual review - no auto-acceptance means zero risk of data loss
- **Intelligent Automation**: Automated detection of duplicate commits reduces manual work
- **Reduced Manual Effort**: ~80% reduction in conflicts to resolve (by eliminating false conflicts from upstreamed commits)
- **Audit Trail**: GitHub PRs provide clear history of what changed in each update
- **Industry Standard**: Based on proven strategies used by Microsoft, GitHub, and Git for Windows teams

## Scope

### In Scope
- GitHub Actions workflow for manual-trigger sync with intelligent automation
- Merging rebase script with range-diff based duplicate commit detection
- Enhanced conflict reporting with resolution guidance
- Documentation for the manual workflow
- Integration with existing `scripts/update_upsteam.sh` pattern

### Out of Scope
- Automated/scheduled sync triggers (intentionally manual-only)
- Automatic conflict resolution or auto-merge (all conflicts require review)
- Automated testing of fork-specific features after sync (can be added in future iteration)
- Sync of non-stable/pre-release versions

## Alternatives Considered

1. **Pure Merge Strategy** (current approach with enhancements)
   - Rejected: Accumulates false conflicts when old upstream commits conflict with their newer versions
   - Git doesn't recognize commits that were upstreamed and modified
   - Leads to exponentially growing conflict resolution burden

2. **Auto-Conflict Resolution Strategy**
   - Rejected: Too risky - could silently lose custom changes in main
   - No industry standard supports auto-accepting conflicts in production code
   - Violates "safety first" principle for fork management

3. **Pure Rebase Strategy** (microsoft/git approach with version branches)
   - Considered but deferred: More complex, requires changing branch structure
   - Would need version-specific branches (vfs-2.X.Y pattern)
   - Can be adopted later if merging rebase proves insufficient

4. **Keep Current Manual Process**
   - Rejected: False conflicts continue to accumulate
   - Doesn't solve the root cause (Git not recognizing upstreamed commits)
   - Manual burden increases with each version

## Success Criteria

1. **Manual Control**: Workflow executes only when manually triggered, never autonomously
2. **False Conflict Elimination**: 80-90% reduction in conflicts by automatically detecting upstreamed commits
3. **Zero Data Loss**: All conflicts presented for manual review - no auto-acceptance
4. **Conflict Classification**: Automated identification of duplicate commits using range-diff
5. **Transparency**: Clear PR descriptions showing genuine conflicts vs detected duplicates
6. **Safety**: All changes reviewed before merge, with rollback capability

## Implementation Notes

- Reimplement `scripts/update_upsteam.sh` using merging rebase strategy
- Use GitHub Actions for manual workflow execution
- Implement `git range-diff` based duplicate commit detection
- Provide interactive conflict resolution with detailed guidance
- Add comprehensive logging for troubleshooting
- Reference implementation: [git-for-windows shears.sh script](https://github.com/git-for-windows/build-extra/blob/HEAD/shears.sh)
