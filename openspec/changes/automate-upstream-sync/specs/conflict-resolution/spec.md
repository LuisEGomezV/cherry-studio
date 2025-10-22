# Capability: Smart Conflict Resolution

## Overview
Intelligently detect duplicate commits using range-diff and present genuine conflicts for manual resolution.

## ADDED Requirements

### Requirement: Duplicate Commit Detection
The system MUST use git range-diff to automatically detect commits that were upstreamed.

**Acceptance Criteria:**
- Uses `git range-diff --left-only` to compare commits
- Checks each conflicting commit against upstream range
- Automatically skips commits found in upstream
- Logs skipped commits with reasoning
- Requires Git 2.19 or later

#### Scenario: Detect upstreamed commit
```gherkin
Given rebase encounters conflict in commit abc123
And commit was previously submitted upstream
When running range-diff check
Then it should detect commit in upstream range
And automatically skip with git rebase --skip
And log "Skipped abc123: found in upstream"
```

#### Scenario: Detect modified upstreamed commit
```gherkin
Given rebase encounters conflict in commit def456
And commit was upstreamed with modifications
When running range-diff check
Then it should detect similar commit in upstream
And automatically skip
And log "Skipped def456: modified version in upstream"
```

#### Scenario: Genuine custom commit
```gherkin
Given rebase encounters conflict in commit ghi789
And commit is not present in upstream
When running range-diff check
Then it should find no match in upstream
And preserve conflict for manual review
And log "Conflict requires review: ghi789"
```

#### Scenario: range-diff unavailable
```gherkin
Given Git version is < 2.19
When attempting range-diff check
Then it should fail workflow
And display error "Git 2.19+ required for range-diff"
And provide upgrade instructions
```

### Requirement: Manual Conflict Resolution
The system MUST present all genuine conflicts for manual review without auto-resolution.

**Acceptance Criteria:**
- Never automatically resolves conflicts
- Preserves conflict markers in files
- Stops rebase at first genuine conflict
- Provides conflict context and guidance
- Allows maintainer to resolve and continue

#### Scenario: Genuine conflict detected
```gherkin
Given rebase encounters genuine conflict
And range-diff found no upstream match
When conflict occurs
Then it should pause rebase
And preserve conflict markers in files
And generate conflict report
And wait for manual resolution
```

#### Scenario: Multiple genuine conflicts
```gherkin
Given rebase will encounter 3 genuine conflicts
When processing commits
Then it should stop at first conflict
And provide resolution guidance
And allow manual resolution
And continue to next conflict after resolution
```

### Requirement: Conflict Context Provision
The system MUST provide comprehensive context for each genuine conflict.

**Acceptance Criteria:**
- Shows commit message and SHA
- Displays conflicted files
- Provides before/after context
- Suggests resolution strategies
- Links to upstream changes if available

#### Scenario: Provide conflict context
```gherkin
Given genuine conflict in commit abc123
When generating conflict report
Then it should include:
  - Commit: abc123 "Add custom feature"
  - Files: src/App.tsx, src/utils/helper.ts
  - Upstream changes: refactored component structure
  - Suggestion: Review both changes, merge manually
  - Command: git diff HEAD
```

#### Scenario: Link upstream changes
```gherkin
Given conflict relates to upstream PR #1234
When providing context
Then it should include link to PR
And summarize upstream change intent
And help maintainer understand conflict
```

### Requirement: Interactive Resolution Support
The system MUST support interactive conflict resolution with clear commands.

**Acceptance Criteria:**
- Provides git commands to resolve conflicts
- Supports continuing rebase after resolution
- Allows skipping commits if needed
- Provides abort option
- Logs resolution decisions

#### Scenario: Resolve and continue
```gherkin
Given conflict in src/App.tsx resolved manually
When maintainer runs git rebase --continue
Then it should stage resolved files
And continue to next commit
And log "Resolved conflict in src/App.tsx"
```

#### Scenario: Skip conflicting commit
```gherkin
Given maintainer decides to skip commit
When running git rebase --skip
Then it should skip current commit
And continue to next commit
And log "Skipped commit abc123 (manual decision)"
```

#### Scenario: Abort rebase
```gherkin
Given maintainer encounters unexpected issue
When running git rebase --abort
Then it should restore original branch state
And exit safely
And log "Rebase aborted, branches unchanged"
```

### Requirement: Conflict Analysis Report
The system MUST generate a detailed analysis of all conflicts.

**Acceptance Criteria:**
- Groups conflicts by resolution strategy
- Shows before/after for auto-resolved files
- Highlights high-risk changes
- Provides resolution recommendations

#### Scenario: Generate conflict report
```gherkin
Given rebase with mixed outcomes:
  | Commit  | Status              | Action       |
  | abc123  | upstreamed          | auto-skipped |
  | def456  | upstreamed-modified | auto-skipped |
  | ghi789  | genuine-conflict    | manual       |
When generating report
Then it should create structured markdown:
  """
  ## Merging Rebase Report: v2.8.0 → v2.9.0
  
  ### Auto-Skipped (2 commits)
  - abc123 "Add feature X" - Found in upstream (exact match)
  - def456 "Fix bug Y" - Found in upstream (modified version)
  
  ### Genuine Conflicts (1 commit)
  - ghi789 "Custom UI enhancement" - Not in upstream
    Files: src/App.tsx, src/components/Header.tsx
    Resolution: Review upstream refactor, merge custom changes manually
    Commands:
      git diff HEAD  # See conflicts
      # Resolve conflicts in editor
      git add <files>
      git rebase --continue
  """
```

### Requirement: Safe Fallback on Errors
The system MUST handle unexpected errors safely without data loss.

**Acceptance Criteria:**
- Never silently discard changes
- Aborts on unexpected errors
- Preserves branch state
- Provides clear error messages
- Logs full error context

#### Scenario: range-diff execution error
```gherkin
Given range-diff command fails unexpectedly
When processing commit
Then it should abort workflow
And preserve current state
And log full error details
And create issue with diagnostic info
```

#### Scenario: Corrupt rebase state
```gherkin
Given rebase enters corrupt state
When detected
Then it should abort rebase
And restore original branches
And notify maintainer
And provide recovery instructions
```

### Requirement: Rollback Capability
The system MUST support rollback if auto-resolution produces invalid state.

**Acceptance Criteria:**
- Detects invalid state (syntax errors, missing files)
- Reverts to pre-merge state
- Creates issue with error details
- Notifies maintainers

#### Scenario: Rollback after failed rebase
```gherkin
Given rebase completed with conflicts
But testing reveals broken functionality
When rollback requested
Then it should restore pre-rebase state
And preserve rebase branch for review
And create issue with details
```
