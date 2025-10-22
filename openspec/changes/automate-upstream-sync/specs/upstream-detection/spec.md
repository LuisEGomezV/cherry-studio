# Capability: Upstream Version Detection

## Overview
Validate upstream version tags when manually triggered to sync the fork.

## ADDED Requirements

### Requirement: Version Tag Validation
The system MUST validate the specified upstream version tag before proceeding with sync.

**Acceptance Criteria:**
- Workflow accepts version tag as required input parameter
- Fetches tags from upstream remote
- Verifies specified tag exists in upstream
- Fails with clear error if tag invalid or missing

#### Scenario: Valid version tag specified
```gherkin
Given user triggers workflow with version "v2.9.0"
And v2.9.0 exists in upstream
When validation runs
Then it should verify tag exists
And proceed to sync workflow
```

#### Scenario: Invalid version tag
```gherkin
Given user triggers workflow with version "v99.99.99"
And v99.99.99 does not exist in upstream
When validation runs
Then it should fail with error "Tag v99.99.99 not found in upstream"
And not modify any branches
```

#### Scenario: Missing version parameter
```gherkin
Given user triggers workflow
But does not provide version parameter
When workflow starts
Then it should fail with error "Version parameter required"
And provide usage instructions
```

### Requirement: Manual Trigger Support
The workflow MUST support manual triggering with required version specification.

**Acceptance Criteria:**
- Accepts only `workflow_dispatch` trigger (no scheduled runs)
- Required input parameter for specific version tag
- Validates specified version exists in upstream
- No default version - user must explicitly specify

#### Scenario: Manual trigger with specific version
```gherkin
Given workflow is triggered manually
And version input is "v2.7.0"
And v2.7.0 exists in upstream
When the workflow runs
Then it should sync to v2.7.0
And skip version detection step
```

#### Scenario: Successful manual trigger
```gherkin
Given workflow is triggered manually
And version input is "v2.9.0"
And v2.9.0 exists in upstream
When the workflow runs
Then it should validate the version
And proceed with merging rebase
```

### Requirement: Stable Version Filtering
The system MUST only consider semantic versioned stable releases.

**Acceptance Criteria:**
- Matches tags with pattern `v*.*.*` (e.g., v2.8.0)
- Ignores pre-release tags (alpha, beta, rc)
- Uses version sorting (not lexicographic)
- Handles tags with and without 'v' prefix

#### Scenario: Filter pre-release versions
```gherkin
Given upstream has tags:
  | v2.8.0      |
  | v2.9.0-beta |
  | v2.9.0-rc1  |
  | v2.7.5      |
When detecting latest stable version
Then it should select v2.8.0
And ignore all pre-release tags
```

#### Scenario: Semantic version sorting
```gherkin
Given upstream has tags:
  | v2.10.0 |
  | v2.9.15 |
  | v2.2.1  |
When detecting latest version
Then it should select v2.10.0
And not v2.9.15 (avoid lexicographic sort)
```

### Requirement: Upstream Remote Validation
The workflow MUST validate the upstream remote configuration.

**Acceptance Criteria:**
- Verifies upstream remote exists
- Validates upstream URL matches expected repository
- Fails safely if misconfigured
- Logs remote information for debugging

#### Scenario: Valid upstream remote
```gherkin
Given upstream remote is configured
And points to github.com/kangfenmao/cherry-studio
When workflow starts
Then it should proceed with version detection
```

#### Scenario: Missing upstream remote
```gherkin
Given upstream remote is not configured
When workflow starts
Then it should fail with error "Upstream remote not found"
And provide setup instructions
And not attempt any git operations
```

#### Scenario: Wrong upstream URL
```gherkin
Given upstream remote exists
But points to different repository
When workflow validates remote
Then it should fail with error "Upstream URL mismatch"
And log expected vs actual URL
```
