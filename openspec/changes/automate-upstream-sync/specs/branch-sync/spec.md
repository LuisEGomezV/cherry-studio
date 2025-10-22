# Capability: Branch Synchronization

## Overview
Execute merging rebase strategy to sync fork with upstream while preserving custom commits.

## ADDED Requirements

### Requirement: Fake Merge on Upstream-Stable
The upstream-stable branch MUST be updated using git merge -s ours to create a clean slate.

**Acceptance Criteria:**
- Uses `git merge -s ours <tag>` to create fake merge
- Discards all incoming changes initially
- Creates merge commit for traceability
- Allows fast-forward from previous state
- Prepares for rebase phase

#### Scenario: Execute fake merge
```gherkin
Given upstream-stable is at v2.8.0
And new version v2.9.0 specified
When executing fake merge
Then it should run git merge -s ours v2.9.0
And create merge commit "Start merging-rebase to v2.9.0"
And upstream-stable HEAD should be merge commit
And working tree should match v2.8.0 content
```

#### Scenario: Fake merge on first sync
```gherkin
Given upstream-stable is empty or uninitialized
When executing first fake merge
Then it should initialize upstream-stable from tag
And create initial merge commit
And set up tracking relationship
```

### Requirement: Force Push with Safety
The updated upstream-stable MUST be pushed to fork's remote with safety checks.

**Acceptance Criteria:**
- Uses `--force-with-lease` for safety
- Verifies remote state before push
- Retries on concurrent modifications
- Logs push status and commit SHA

#### Scenario: Successful force push
```gherkin
Given upstream-stable has been reset to v2.9.0
And remote upstream-stable matches local previous state
When pushing updated branch
Then it should use git push --force-with-lease
And push should succeed
And remote upstream-stable should match new tag
```

#### Scenario: Concurrent modification detected
```gherkin
Given upstream-stable has been reset locally
But remote was modified by another process
When attempting to push with --force-with-lease
Then push should fail
And workflow should fetch latest
And retry the entire sync process
```

### Requirement: Rebase Custom Commits
The system MUST rebase custom commits from main onto updated upstream-stable.

**Acceptance Criteria:**
- Creates temporary sync branch from main
- Rebases onto upstream-stable
- Identifies custom commits only
- Applies range-diff duplicate detection
- Stops on genuine conflicts

#### Scenario: Rebase with no conflicts
```gherkin
Given upstream-stable fake merged to v2.9.0
And main has 5 custom commits with no conflicts
When rebasing custom commits
Then it should create sync-v2.9.0 branch
And rebase all 5 commits onto upstream-stable
And complete without conflicts
And preserve all custom commits
```

#### Scenario: Rebase with upstreamed commits
```gherkin
Given upstream-stable at v2.9.0
And main has 3 custom commits
And 1 commit was already upstreamed
When rebasing custom commits
Then it should detect upstreamed commit via range-diff
And auto-skip that commit
And rebase remaining 2 commits
And log skipped commit with reason
```

### Requirement: Atomic Operation Guarantee
The sync operation MUST be atomic - either fully succeed or leave branches unchanged.

**Acceptance Criteria:**
- No partial updates on failure
- Branches return to original state on error
- Workflow exits with clear error code
- Detailed failure logs provided
- Temporary branches cleaned up on failure

#### Scenario: Failure during rebase
```gherkin
Given upstream-stable fake merge succeeded
But rebase encounters unexpected error
When error occurs
Then it should abort rebase
And delete sync branch
And upstream-stable should NOT be pushed
And main should remain unchanged
And workflow should exit with error code
```

#### Scenario: Failure during push
```gherkin
Given rebase completed successfully
But push to remote fails
When push error occurs
Then it should preserve local sync branch
And log the error
And mark workflow as failed
And provide manual recovery instructions
```

### Requirement: Sync Branch Creation
The system MUST create a properly named sync branch for the rebase.

**Acceptance Criteria:**
- Branch name includes version tag
- Created from main branch
- Used for rebasing onto upstream-stable
- Preserved for PR creation
- Includes descriptive commit messages

#### Scenario: Create sync branch
```gherkin
Given syncing to v2.9.0
When creating sync branch
Then it should be named "upstream-sync-v2.9.0"
And branch from current main
And set up for rebase
And include metadata in branch description
```

#### Scenario: Generate sync summary
```gherkin
Given completed rebase to v2.9.0
When generating sync summary
Then it should include:
  - Upstream version: v2.9.0
  - Previous version: v2.8.0
  - Custom commits rebased: 5
  - Commits auto-skipped: 2
  - Genuine conflicts: 1
  - Workflow run: [link]
```

### Requirement: PR Creation Mandatory
The workflow MUST always create a PR for manual review, never direct push.

**Acceptance Criteria:**
- Always creates PR regardless of conflicts
- Never pushes directly to main
- Requires manual review and merge
- Includes comprehensive sync report
- Links sync branch for review

#### Scenario: Create PR after clean rebase
```gherkin
Given rebase completed with no conflicts
And all upstreamed commits auto-skipped
When workflow completes
Then it should create PR from sync branch to main
And title "Sync upstream v2.9.0"
And include conflict report (no conflicts)
And require manual merge
```

#### Scenario: Create PR with conflicts
```gherkin
Given rebase stopped on genuine conflict
When creating PR
Then it should push sync branch with conflicts
And mark as draft
And include conflict resolution guidance
And list files requiring manual resolution
```
