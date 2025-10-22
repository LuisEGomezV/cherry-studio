# Implementation Tasks

## Status: MVI Completed ✅

The Minimum Viable Implementation (MVI) has been completed with core functionality:
- ✅ GitHub Actions workflow with manual trigger and validation
- ✅ Merging rebase strategy with fake merge
- ✅ range-diff duplicate commit detection
- ✅ PR creation with comprehensive reports
- ✅ Basic documentation

Remaining tasks for future iterations are marked below.

## Phase 1: Foundation (Capability: upstream-detection)

### Task 1.1: Create GitHub Actions workflow scaffold ✅ COMPLETED
- [x] Create `.github/workflows/sync-upstream.yml`
- [x] Add manual-only trigger (workflow_dispatch) with REQUIRED version input
- [x] No scheduled triggers (intentional design choice)
- [x] Configure necessary permissions (contents: write, pull-requests: write)
- [x] Set up job to run on ubuntu-latest with Git 2.19+
- **Validation**: Workflow appears in Actions tab with version input field
- **Dependencies**: None

### Task 1.2: Implement Git version check ✅ COMPLETED
- [x] Verify Git version is 2.19 or later (required for range-diff)
- [x] Display clear error if version insufficient
- [x] Provide upgrade instructions in error message
- [x] Log Git version for debugging
- **Validation**: Workflow fails gracefully on Git < 2.19
- **Dependencies**: Task 1.1

### Task 1.3: Implement upstream remote validation ✅ COMPLETED
- [x] Add step to verify upstream remote exists
- [x] Validate upstream URL matches expected repository (kangfenmao/cherry-studio)
- [x] Configure git user for commits (bot user or github-actions)
- [x] Fail gracefully with clear error if misconfigured
- **Validation**: Workflow fails with clear message when upstream is missing/wrong
- **Dependencies**: Task 1.2

### Task 1.4: Implement version tag validation ✅ COMPLETED
- [x] Parse required version input parameter
- [x] Fetch tags from upstream remote
- [x] Verify specified version exists in upstream
- [x] Validate semantic versioning pattern (v*.*.*)
- [x] Reject pre-release tags (alpha, beta, rc) with clear message
- **Validation**: Workflow fails with "Tag not found" for invalid versions
- **Dependencies**: Task 1.3

## Phase 2: Merging Rebase Implementation (Capability: branch-sync)

### Task 2.1: Implement fake merge on upstream-stable ✅ COMPLETED
- [x] Checkout upstream-stable branch
- [x] Execute `git merge -s ours -m "Start merging-rebase to <version>" <tag>`
- [x] Verify merge commit created
- [x] Confirm working tree matches previous upstream-stable
- [x] Log previous version and new target version
- **Validation**: Creates fake merge commit, discards incoming changes
- **Dependencies**: Task 1.4

### Task 2.2: Implement safe force push for upstream-stable ✅ COMPLETED
- [x] Use `git push --force-with-lease origin upstream-stable`
- [x] Add retry logic for concurrent modifications
- [x] Log push status and commit SHA
- [x] Handle push failures gracefully
- **Validation**: Push succeeds with --force-with-lease, retries on lease failure
- **Dependencies**: Task 2.1

### Task 2.3: Create sync branch from main ✅ COMPLETED
- [x] Checkout main branch
- [x] Create new branch named `upstream-sync-<version>`
- [x] Verify branch created from main HEAD
- [x] Log custom commits to be rebased
- [x] Set up branch tracking
- **Validation**: Sync branch created with proper naming convention
- **Dependencies**: Task 2.2

### Task 2.4: Initiate rebase onto upstream-stable ✅ COMPLETED
- [x] Execute `git rebase upstream-stable` on sync branch
- [x] Capture rebase status
- [x] Log initial rebase progress
- [x] Prepare for conflict detection phase
- **Validation**: Rebase starts and processes first commits
- **Dependencies**: Task 2.3

## Phase 3: range-diff Duplicate Detection (Capability: conflict-resolution)

### Task 3.1: Implement range-diff wrapper script ✅ COMPLETED
- [x] Create `scripts/check-upstreamed-commit.sh`
- [x] Accepts commit SHA as parameter
- [x] Executes `git range-diff --left-only <commit>^! <commit>..upstream-stable`
- [x] Parses output to detect matches
- [x] Returns exit code indicating match status
- **Validation**: Script correctly identifies upstreamed commits
- **Dependencies**: Task 2.4

### Task 3.2: Integrate range-diff during rebase ✅ COMPLETED
- [x] Hook into rebase conflict detection
- [x] For each conflicting commit, run range-diff check
- [x] If match found: auto-skip with `git rebase --skip`
- [x] If no match: preserve conflict for manual review
- [x] Log decision with reasoning
- **Validation**: Upstreamed commits auto-skipped, genuine conflicts preserved
- **Dependencies**: Task 3.1

### Task 3.3: Implement conflict context generation ✅ COMPLETED
- [x] For each genuine conflict, extract commit info
- [x] Get commit SHA, message, author, date
- [x] List conflicted files with diff stats
- [x] Suggest resolution approach based on file types
- [x] Generate markdown report section
- **Validation**: Conflict report includes full context for each conflict
- **Dependencies**: Task 3.2

### Task 3.4: Implement conflict tracking ✅ COMPLETED
- [x] Maintain list of auto-skipped commits
- [x] Maintain list of genuine conflicts
- [x] Track rebase progress (completed/pending commits)
- [x] Store data for final PR report
- **Validation**: Tracking data accurate and complete
- **Dependencies**: Task 3.3

### Task 3.5: Add error handling for range-diff failures ✅ COMPLETED
- [x] Catch range-diff execution errors
- [x] Handle Git version incompatibilities
- [x] Abort workflow on unexpected errors
- [x] Preserve rebase state for debugging
- [x] Create detailed error report
- **Validation**: Workflow fails safely on range-diff errors
- **Dependencies**: Task 3.2

## Phase 4: PR Creation (Capability: pr-automation)

### Task 4.1: Implement mandatory PR creation ✅ COMPLETED
- [x] Always create PR regardless of conflict status
- [x] Push sync branch to origin
- [x] Set PR title: "Sync upstream v<version>"
- [x] Mark as draft if conflicts exist, ready if clean
- [x] Never push directly to main
- **Validation**: PR always created, no direct pushes to main
- **Dependencies**: Task 3.5

### Task 4.2: Generate comprehensive PR body ✅ COMPLETED
- [x] Format merging rebase report as PR description
- [x] Include sections: summary, auto-skipped commits, genuine conflicts, testing
- [x] Show commit-by-commit analysis
- [x] Link to upstream release notes
- [x] Link to workflow run
- [x] Add testing checklist
- [x] Provide git commands for conflict resolution
- **Validation**: PR description is comprehensive and actionable
- **Dependencies**: Task 4.1

### Task 4.3: Add PR labels and assignments ⚠️ PARTIAL
- [x] Add labels: `upstream-sync`, `manual-review-required`
- [ ] Conditionally add `has-conflicts` if rebase stopped
- [ ] Check for CODEOWNERS file
- [ ] Assign reviewers based on CODEOWNERS or default maintainer
- [ ] Request review via GitHub API
- **Validation**: PR properly labeled and assigned
- **Dependencies**: Task 4.2
- **Note**: Basic labels implemented, CODEOWNERS support deferred to iteration 2

### Task 4.4: Implement superseding PR detection ⏸️ DEFERRED
- [ ] Check for existing open upstream-sync PRs
- [ ] Comment on old PR: "Superseded by v<new-version>"
- [ ] Close old PR without merging
- [ ] Link old PR in new PR description
- [ ] Preserve context from old PR discussion
- **Validation**: Old PRs properly closed when new sync triggered
- **Dependencies**: Task 4.1
- **Note**: Deferred to iteration 2, manual PR management for now

### Task 4.5: Implement failure notifications ⏸️ DEFERRED
- [ ] Detect workflow failures at any stage
- [ ] Create GitHub issue with error details
- [ ] Include full workflow logs link
- [ ] Provide manual recovery instructions
- [ ] Add labels: `upstream-sync`, `bug`, `needs-attention`
- [ ] Assign to default maintainer
- **Validation**: Failed sync creates detailed issue
- **Dependencies**: Task 4.1
- **Note**: Deferred to iteration 2, GitHub Actions failure notifications sufficient for MVI

### Task 4.6: Add workflow status badge ⏸️ DEFERRED
- [ ] Add badge to README showing sync status
- [ ] Show current merged upstream version
- [ ] Show pending version if PR open
- [ ] Link to latest workflow run or open PR
- **Validation**: Badge shows accurate sync status
- **Dependencies**: Task 4.5
- **Note**: Deferred to iteration 2, nice-to-have feature

## Phase 5: Documentation & Enhancement

### Task 5.1: Create merging rebase workflow documentation ✅ COMPLETED
- [x] Document manual trigger process via Actions UI
- [x] Explain merging rebase strategy and fake merge concept
- [x] Describe range-diff duplicate detection
- [x] Provide conflict resolution guide
- [x] Add examples with screenshots
- [x] Update openspec/project.md
- **Validation**: Documentation clearly explains merging rebase workflow
- **Dependencies**: All Phase 1-4 tasks
- **Note**: Created docs/UPSTREAM_SYNC.md with comprehensive guide

### Task 5.2: Create conflict resolution guide ✅ COMPLETED
- [x] Document how to resolve conflicts in PR
- [x] Provide git commands for continuing rebase
- [x] Explain when to skip vs resolve
- [x] Add examples of common conflict types
- [x] Link to upstream changes for context
- **Validation**: Guide helps maintainers resolve conflicts
- **Dependencies**: Task 5.1
- **Note**: Included in docs/UPSTREAM_SYNC.md

### Task 5.3: Create local testing guide ✅ COMPLETED
- [x] Document how to test merging rebase locally
- [x] Provide commands to simulate workflow
- [x] Add test scenarios with expected outcomes
- [x] Create mock upstream setup instructions
- **Validation**: Can test workflow locally before running in Actions
- **Dependencies**: Task 5.2
- **Note**: Included in docs/UPSTREAM_SYNC.md under "Advanced Usage"

### Task 5.4: Implement enhanced logging ⏸️ DEFERRED
- [ ] Log each phase of merging rebase
- [ ] Include timing for each operation
- [ ] Log range-diff results for each commit
- [ ] Add structured logging (JSON) for parsing
- [ ] Ensure logs useful for debugging failures
- **Validation**: Workflow logs provide complete audit trail
- **Dependencies**: All Phase 1-4 tasks
- **Note**: Current logging is sufficient for MVI, structured logging deferred to iteration 2

### Task 5.5: Add rebase continuation support ✅ COMPLETED
- [x] Document how to continue stopped rebase locally
- [x] Provide commands to push updated sync branch
- [x] Allow updating existing PR with resolved conflicts
- [x] Add validation that conflicts resolved
- **Validation**: Can resolve conflicts locally and update PR
- **Dependencies**: Task 5.4
- **Note**: Documented in docs/UPSTREAM_SYNC.md "Resolve Conflicts" section

### Task 5.6: Implement rollback capability ⏸️ DEFERRED
- [ ] Create manual workflow to rollback merged sync
- [ ] Accept version parameter to rollback to
- [ ] Validate rollback target exists
- [ ] Revert main to previous state
- [ ] Create rollback PR with context
- **Validation**: Can safely rollback problematic sync
- **Dependencies**: Task 5.5
- **Note**: Deferred to iteration 2, manual git revert sufficient for now

## Phase 6: Testing & Validation ⏸️ DEFERRED TO ACTUAL USAGE

**Note**: These tasks will be validated when the workflow is first used for a real upstream sync.

### Task 6.1: Test with historical version ⏸️ DEFERRED
- [ ] Set up test fork with known history
- [ ] Test sync from old version (e.g., v2.6.0 → v2.8.0)
- [ ] Verify fake merge creates proper commit
- [ ] Verify range-diff detects upstreamed commits
- [ ] Verify genuine conflicts detected
- **Validation**: Merging rebase works correctly on real data
- **Dependencies**: Phase 5 complete
- **Note**: Will be validated during first real sync

### Task 6.2: Test range-diff scenarios ⏸️ DEFERRED
- [ ] Create commits that were upstreamed unchanged
- [ ] Create commits that were upstreamed with modifications
- [ ] Create genuinely unique custom commits
- [ ] Verify range-diff correctly categorizes each
- **Validation**: range-diff detection is accurate
- **Dependencies**: Task 6.1
- **Note**: Will be validated during first real sync

### Task 6.3: Test conflict resolution workflow ⏸️ DEFERRED
- [ ] Trigger sync that will have genuine conflicts
- [ ] Verify PR created with conflict markers
- [ ] Test resolving conflicts locally
- [ ] Test continuing rebase after resolution
- [ ] Test pushing updated sync branch
- **Validation**: Complete conflict resolution workflow works
- **Dependencies**: Task 6.2
- **Note**: Will be validated during first sync with conflicts

### Task 6.4: Test edge cases ⏸️ DEFERRED
- [ ] Test with empty main (no custom commits)
- [ ] Test with all commits upstreamed
- [ ] Test with corrupt rebase state
- [ ] Test concurrent workflow runs
- [ ] Test invalid version inputs
- **Validation**: All edge cases handled gracefully
- **Dependencies**: Task 6.3
- **Note**: Will be validated as edge cases are encountered

### Task 6.5: Optimize workflow performance ⏸️ DEFERRED
- [ ] Minimize unnecessary git operations
- [ ] Optimize range-diff batch processing
- [ ] Parallelize independent steps where possible
- [ ] Reduce workflow run time
- **Validation**: Workflow completes in <10 minutes for typical sync
- **Dependencies**: Task 6.4
- **Note**: Deferred to iteration 2 based on actual performance metrics

### Task 6.6: Final integration test ⏸️ READY FOR FIRST USE
- [ ] Run complete workflow end-to-end on production fork
- [ ] Verify all phases complete successfully
- [ ] Test PR review and merge process
- [ ] Validate merged result
- [ ] Verify no data loss
- [ ] Get stakeholder approval
- **Validation**: Workflow ready for production use
- **Dependencies**: All tasks complete
- **Note**: MVI is ready - this will be done during first actual upstream sync

## Parallel Work Opportunities

- Tasks 1.1-1.4 must be sequential (Phase 1 foundation)
- Tasks 2.1-2.4 must be sequential (Phase 2 merging rebase)
- Tasks 3.1-3.2 must be sequential, but 3.3-3.4 can parallel after 3.2
- Tasks 4.2-4.3 can be done in parallel (both depend on 4.1)
- Tasks 4.6 can be done in parallel with 4.2-4.5
- Tasks 5.1-5.3 can overlap with 5.4-5.6
- All Phase 6 testing tasks can have some parallel execution

## Critical Path

Phase 1 (validation) → Phase 2 (merging rebase) → Phase 3 (range-diff) → Phase 4 (PR creation) → Phase 5 (docs) → Phase 6 (testing)

**Estimated Timeline**: 2-3 weeks for full implementation and validation
- Phase 1: 2-3 days
- Phase 2: 3-4 days (core merging rebase logic)
- Phase 3: 4-5 days (range-diff integration)
- Phase 4: 2-3 days
- Phase 5: 3-4 days (documentation is critical)
- Phase 6: 3-5 days (thorough testing required)

## Key Implementation References

- **Git for Windows shears.sh**: https://github.com/git-for-windows/build-extra/blob/HEAD/shears.sh
- **GitHub Fork Management Guide**: https://github.blog/developer-skills/github/friend-zone-strategies-friendly-fork-management/
- **git range-diff docs**: https://git-scm.com/docs/git-range-diff
- **Merging Rebase Strategy**: Inspired by git-for-windows/git approach
