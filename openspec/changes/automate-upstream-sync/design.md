# Design: Automate Upstream Synchronization

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                   │
│                      (manual trigger only)                   │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├─> 1. Validate Version Tag
                │    └─> Fetch upstream tags
                │    └─> Verify specified tag exists
                │    └─> Exit if invalid
                │
                ├─> 2. Merging Rebase: Create Clean Slate
                │    └─> git merge -s ours <upstream-tag>
                │    └─> Creates "fake merge" on upstream-stable
                │
                ├─> 3. Rebase Custom Commits
                │    └─> Identify custom commits from main
                │    └─> Rebase onto new upstream-stable
                │    └─> Use range-diff to detect upstreamed commits
                │    └─> Auto-skip duplicates, present real conflicts
                │
                └─> 4. Create PR for Review
                     └─> All changes in PR with conflict analysis
                     └─> Highlight genuine conflicts vs skipped duplicates
                     └─> Manual review and merge required
```

## Component Design

### 1. GitHub Actions Workflow
**File**: `.github/workflows/sync-upstream.yml`

**Triggers**:
- Manual only: `workflow_dispatch` with required version parameter
- No scheduled runs (intentional design choice for control)
- No webhooks (manual trigger provides full control)

**Jobs**:
```yaml
merging-rebase-sync:
  steps:
    - Checkout repository
    - Configure git
    - Validate version tag input
    - Execute merging rebase on upstream-stable
    - Rebase custom commits with range-diff
    - Create PR with conflict analysis
    - Notify on failure
```

### 2. Merging Rebase Script
**File**: `scripts/merging-rebase-sync.sh`

**Merging Rebase Strategy** (inspired by git-for-windows/git):

**Phase 1: Create Clean Slate ("Fake Merge")**
```bash
# Switch to upstream-stable
git checkout upstream-stable

# Create "fake merge" using ours strategy
# This discards all upstream changes but creates merge commit
# Allows fast-forward from previous states
git merge -s ours -m "Start merging-rebase to <version>" <upstream-tag>

# Push updated upstream-stable
git push --force-with-lease origin upstream-stable
```

**Phase 2: Rebase Custom Commits**
```bash
# Create temporary branch from main
git checkout -b sync-<version> main

# Rebase custom commits onto new upstream-stable
git rebase upstream-stable

# During rebase conflicts:
# 1. Check if commit was upstreamed using range-diff
$ git range-diff --left-only <commit>^! <commit>..upstream-stable

# 2. If commit found in upstream → skip it
$ git rebase --skip

# 3. If genuine conflict → stop and document
# Present conflict to user with context
```

**Phase 3: Conflict Analysis**
```bash
# For each conflict during rebase:
# - Check range-diff for duplicate
# - If duplicate: auto-skip with log
# - If genuine: preserve conflict markers
# - Generate conflict report
```

**No Auto-Resolution**: All genuine conflicts require manual review

### 3. Conflict Analysis Report
**File**: Generated in PR description

**Contents**:
- Upstream version being synced (tag name)
- Total custom commits being rebased
- Commits auto-skipped (detected as upstreamed via range-diff)
- Genuine conflicts requiring manual resolution
- For each conflict:
  - Commit SHA and message
  - Files involved
  - Suggested resolution approach
- Link to upstream changelog/release notes
- Commands to continue/test locally

## Key Design Decisions

### Decision 1: Merging Rebase vs Pure Merge or Pure Rebase
**Choice**: Merging rebase strategy (fake merge + rebase custom commits)

**Rationale**:
- Solves accumulating false conflicts problem (upstream commits conflicting with themselves)
- Clean upstream-stable branch (always points to upstream tag via fake merge)
- Custom commits rebased on top maintain clear relationship with upstream
- Industry-proven strategy (used by Git for Windows, Microsoft Git)
- Git can properly track which commits were upstreamed

**Trade-offs**:
- More complex than pure merge (requires understanding merging rebase)
- Requires force-push on upstream-stable (but safe with --force-with-lease)
- Learning curve for maintainers unfamiliar with range-diff

**Why Not Pure Merge**:
- Accumulates false conflicts between old and new upstream versions
- Git doesn't recognize upstreamed commits that were modified
- Exponentially growing maintenance burden

**Why Not Pure Rebase**:
- Would require force-push on main (breaking for contributors)
- Loses merge history
- More complex than merging rebase for this use case

### Decision 2: "Fake Merge" on upstream-stable
**Choice**: Use `git merge -s ours` to create fake merge on upstream-stable

**Rationale**:
- Creates merge commit that discards all upstream changes initially
- Allows fast-forward from previous upstream-stable state
- Provides clean slate for rebasing custom commits
- Git history shows clear sync points
- Standard practice in merging rebase strategy

**Trade-offs**:
- Counter-intuitive (merge that discards changes)
- Requires documentation to explain strategy
- Must always be followed by rebase phase

**Alternative Considered**: `git reset --hard <tag>`
- Simpler but loses ability to fast-forward
- Breaks git history continuity
- Merging rebase provides better traceability

### Decision 3: Manual Trigger Only (No Scheduled/Auto Runs)
**Choice**: Workflow runs only when manually triggered

**Rationale**:
- User requirement: maintain full control over sync timing
- Safety first: no surprise updates
- Allows planning for breaking changes
- Time to test fork-specific features after sync
- Prevents disruption during active development

**Trade-offs**:
- Not "timely" - updates delayed until manual trigger
- Requires remembering to check for new versions
- No automatic security patch integration

**Alternative Considered**: Scheduled with auto-PR
- Rejected per user requirement
- Too much risk of unreviewed changes
- Loses control over timing

### Decision 4: No Auto-Conflict Resolution (All Conflicts Manual)
**Choice**: All genuine conflicts presented for manual review

**Rationale**:
- User requirement: no risk of data loss from auto-acceptance
- Industry standard: no production fork auto-resolves source code conflicts
- Safety over convenience
- Merging rebase already eliminates most false conflicts
- Remaining conflicts are genuine and need careful review

**Trade-offs**:
- More manual work for genuine conflicts
- Slower sync process
- Requires maintainer expertise

**Alternative Considered**: Category-based auto-resolution
- Rejected: too risky for custom codebase
- Could silently lose important custom changes
- Violates "zero data loss" requirement

**Automation Provided Instead**:
- range-diff detection of upstreamed commits (auto-skip duplicates)
- Conflict classification and reporting
- Resolution guidance and suggestions

### Decision 5: range-diff for Duplicate Detection
**Choice**: Use `git range-diff` to automatically identify upstreamed commits

**Rationale**:
- Git's built-in tool for comparing commit ranges
- Detects commits even when SHA changed (mailing list patches)
- Handles commits modified during upstream review
- Industry standard for fork management
- Safe automation that reduces manual work

**Trade-offs**:
- Requires Git 2.19+ (widely available)
- Learning curve for debugging
- May miss commits with significant rewrites

**How It Works**:
```bash
# Compare single commit against upstream range
git range-diff --left-only <commit>^! <commit>..upstream
# If output shows match → commit was upstreamed → skip
# If no match → genuine custom commit → keep
```

## Error Handling

### Failure Scenarios

1. **Network Issues**
   - Retry fetch operations with exponential backoff
   - Fail gracefully and notify

2. **Merge Conflicts in Critical Files**
   - Never force through conflicts in src/
   - Create PR with detailed conflict report
   - Add labels: `upstream-sync`, `needs-review`

3. **CI Failures** (future)
   - Rollback auto-merge if tests fail
   - Notify maintainers
   - Create issue with test logs

4. **Force Push Failures**
   - Detect if upstream-stable diverged during workflow
   - Use `--force-with-lease` for safety
   - Retry with fresh fetch

## Security Considerations

1. **Token Permissions**
   - Use `GITHUB_TOKEN` with minimal required permissions
   - `contents: write` for pushing
   - `pull-requests: write` for creating PRs

2. **Upstream Verification**
   - Verify upstream remote URL matches expected repository
   - Only process signed tags (optional, can add later)

3. **Branch Protection**
   - main branch should have protection rules
   - Require PR review for auto-merged changes (optional)

## Monitoring & Observability

1. **Success Metrics**
   - Track: time to detect new version
   - Track: auto-merge success rate
   - Track: manual review frequency

2. **Notifications**
   - Slack/Discord webhook on sync failure
   - GitHub issue on repeated failures
   - Email to maintainers on critical conflicts

3. **Logging**
   - Detailed workflow logs in GitHub Actions
   - Commit messages include upstream version info
   - PR descriptions link to upstream changes

## Future Enhancements

1. **Smart Conflict Resolution AI**
   - Use LLM to suggest conflict resolutions
   - Pre-analyze conflicts and provide resolution suggestions

2. **Automated Testing Post-Sync**
   - Run E2E tests on auto-merged changes
   - Rollback if tests fail

3. **Selective Feature Sync**
   - Cherry-pick specific upstream commits
   - Skip certain upstream changes

4. **Multi-Upstream Support**
   - Support syncing from multiple upstream sources
   - Merge strategies per upstream

## Migration Plan

### Phase 1: Setup (Week 1)
- Create GitHub Actions workflow
- Enhance existing shell script with smart merge logic
- Add file categorization rules
- Test in isolated branch

### Phase 2: Validation (Week 2)
- Run workflow manually for 1-2 version updates
- Refine conflict resolution rules
- Document any edge cases
- Update categorization based on results

### Phase 3: Automation (Week 3)
- Enable scheduled runs
- Monitor first few automated syncs closely
- Adjust frequency based on upstream release cadence
- Set up notifications

### Phase 4: Optimization (Week 4+)
- Fine-tune auto-merge criteria
- Add more sophisticated conflict analysis
- Implement rollback mechanisms
- Consider adding automated testing
