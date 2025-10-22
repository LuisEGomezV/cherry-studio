# Capability: Pull Request Automation

## Overview
Always create PRs with comprehensive sync reports for mandatory manual review.

## ADDED Requirements

### Requirement: Mandatory PR Creation
The system MUST always create a PR regardless of conflict status, never auto-merge.

**Acceptance Criteria:**
- Creates PR for all syncs (conflicts or not)
- Never pushes directly to main
- Requires explicit manual merge
- No auto-merge option available
- All changes reviewed before integration

#### Scenario: Clean rebase creates PR
```gherkin
Given rebase completed with zero conflicts
And all upstreamed commits auto-skipped
When workflow completes
Then it should create PR
And mark as ready for review (not draft)
And include sync report showing clean rebase
And require manual merge approval
```

#### Scenario: Rebase with conflicts creates draft PR
```gherkin
Given rebase stopped on genuine conflicts
When workflow creates PR
Then it should mark as draft
And include conflict resolution guidance
And list unresolved conflicts
And wait for manual conflict resolution
```

#### Scenario: Partial rebase creates PR
```gherkin
Given rebase completed 3 of 5 commits
And stopped on conflict
When creating PR
Then it should include partial progress
And show which commits succeeded
And show which commits need resolution
And provide continue/abort instructions
```

### Requirement: PR Creation and Metadata
PRs MUST be created with comprehensive context and proper metadata.

**Acceptance Criteria:**
- Title format: "Sync upstream v{version}"
- Body includes conflict report
- Labels: `upstream-sync`, `automated`
- Assigns to maintainer(s)
- Links to upstream release notes

#### Scenario: Create PR for manual conflicts
```gherkin
Given sync from v2.8.0 to v2.9.0
And manual review required
When creating PR
Then PR should have:
  - Title: "Sync upstream v2.9.0"
  - Labels: ["upstream-sync", "needs-review"]
  - Body containing conflict analysis
  - Link to https://github.com/kangfenmao/cherry-studio/releases/tag/v2.9.0
  - Assignment to default maintainer
```

#### Scenario: PR body structure
```gherkin
Given creating PR for upstream sync
When generating PR description
Then it should include sections:
  """
  ## 🔄 Upstream Sync: v2.8.0 → v2.9.0
  
  [Release Notes](https://github.com/kangfenmao/cherry-studio/releases/tag/v2.9.0)
  
  ## 📊 Change Summary
  - Files changed: 45
  - Auto-resolved: 3 files
  - Manual review: 2 files
  
  ## ✅ Auto-Resolved Conflicts
  ### Upstream Preferred (2)
  - `package.json` - Dependency updates
  - `yarn.lock` - Lock file sync
  
  ### Fork Preferred (1)
  - `README.md` - Kept fork docs
  
  ## ⚠️ Manual Review Required (2)
  - `src/renderer/App.tsx` - Custom UI vs upstream refactor
  - `src/main/window.ts` - Window config conflicts
  
  ## 🧪 Testing Checklist
  - [ ] Verify fork-specific features still work
  - [ ] Check UI for regressions
  - [ ] Test custom integrations
  
  ## 🔗 Resources
  - Workflow: [Link to run]
  - Upstream diff: [Link to compare view]
  """
```

### Requirement: Sync Success Notification
Successfully created PRs MUST generate informative notifications.

**Acceptance Criteria:**
- Comments on PR with sync summary
- Includes commit skip analysis
- Lists any conflicts
- Provides testing checklist
- Links to upstream changes

#### Scenario: Clean sync notification
```gherkin
Given PR created for clean rebase
When adding notification comment
Then it should include:
  - "✅ Clean sync to v2.9.0"
  - "Auto-skipped: 2 upstreamed commits"
  - "Rebased: 3 custom commits"
  - "Conflicts: 0"
  - Testing checklist
  - Upstream release notes link
```

### Requirement: PR Review Assignment
PRs requiring manual review MUST be assigned appropriately.

**Acceptance Criteria:**
- Uses CODEOWNERS if present
- Falls back to default maintainer
- Assigns based on file paths
- Notifies via GitHub notifications

#### Scenario: Assign based on file paths
```gherkin
Given PR with conflicts in src/renderer/**
And CODEOWNERS defines @frontend-team for src/renderer/
When assigning reviewers
Then it should request review from @frontend-team
And add label "frontend"
```

#### Scenario: No CODEOWNERS present
```gherkin
Given PR requires review
And no CODEOWNERS file exists
When assigning reviewers
Then it should assign to repository default maintainer
And add label "needs-triage"
```

### Requirement: Failure Notification
Failed syncs MUST alert maintainers with actionable information.

**Acceptance Criteria:**
- Creates GitHub issue on failure
- Includes error logs and context
- Provides manual recovery steps
- Links to workflow run

#### Scenario: Sync failure notification
```gherkin
Given sync workflow failed
And error occurred during merge
When generating failure notification
Then it should create issue:
  - Title: "❌ Upstream sync failed: v2.9.0"
  - Labels: ["upstream-sync", "bug", "needs-attention"]
  - Body with:
    - Error message
    - Failed step
    - Workflow logs link
    - Manual sync instructions
  - Assigned to maintainer
```

#### Scenario: Repeated failure alert
```gherkin
Given sync workflow failed
And previous 3 syncs also failed
When generating notification
Then it should escalate priority
And add label "critical"
And mention maintainer in issue
And provide troubleshooting guide
```

### Requirement: Superseding PR Handling
The system MUST handle open PRs when new sync is manually triggered.

**Acceptance Criteria:**
- Detects existing upstream-sync PRs
- Comments on old PR before closing
- Closes outdated sync PRs
- Creates new PR with reference to old
- Preserves useful context from old PR

#### Scenario: Manual trigger with open PR
```gherkin
Given open PR for v2.9.0 sync
And user manually triggers v2.10.0 sync
When new workflow starts
Then it should:
  - Comment on v2.9.0 PR: "Superseded by manual v2.10.0 sync"
  - Close v2.9.0 PR without merging
  - Create new v2.10.0 PR
  - Link to v2.9.0 PR in description
  - Suggest reviewing v2.9.0 discussion
```

### Requirement: Workflow Status Badge
Repository README MUST show sync status and current version.

**Acceptance Criteria:**
- Badge shows last sync attempt status
- Badge shows merged upstream version
- Badge links to latest workflow run
- Updates when PR is merged

#### Scenario: Display sync status
```gherkin
Given v2.9.0 sync PR merged
And workflow completed successfully
When README is viewed
Then sync badge should show:
  - Text: "upstream: v2.9.0"
  - Color: green
  - Link: Latest successful workflow run
```

#### Scenario: Display pending sync
```gherkin
Given v2.10.0 sync PR open
And not yet merged
When README is viewed
Then sync badge should show:
  - Text: "upstream: v2.9.0 (v2.10.0 pending)"
  - Color: yellow
  - Link: Open PR
```

### Requirement: GitHub Actions UI Trigger
The system MUST provide clear UI for manual triggering via GitHub Actions.

**Acceptance Criteria:**
- Workflow visible in Actions tab
- Version input clearly labeled
- Input validation messages shown
- Provides usage instructions
- Shows recent workflow runs

#### Scenario: Trigger sync via Actions UI
```gherkin
Given user navigates to Actions tab
And selects "Sync Upstream" workflow
When clicking "Run workflow"
Then it should show input form:
  - Label: "Upstream version tag (e.g. v2.9.0)"
  - Required: true
  - Description: "Semantic version tag from upstream"
  - Button: "Run workflow"
```

#### Scenario: Invalid input in UI
```gherkin
Given user enters "latest" as version
When clicking run
Then it should fail validation
And show error: "Must specify exact version tag (v*.*.*)"
And not start workflow
```
