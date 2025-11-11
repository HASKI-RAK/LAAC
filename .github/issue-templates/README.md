# GitHub Issue Templates

This directory contains standardized templates for creating GitHub issues in the LAAC project.

## Available Templates

### 1. Feature Implementation Template

**File**: `feature-implementation.md`  
**Use For**: Implementing requirements from the SRS (REQ-FN-_ or REQ-NF-_)  
**Key Sections**: Requirement Traceability, Acceptance Criteria, Definition of Done, Implementation Scope, Architecture Context, Testing Guidelines

**When to Use**:

- ✅ Implementing a feature from `docs/srs/`
- ✅ Creating a new NestJS controller/service/module
- ✅ Adding new API endpoints
- ✅ Implementing security or observability features

**When NOT to Use**:

- ❌ Bug fixes (no SRS traceability)
- ❌ Documentation-only updates
- ❌ Infrastructure/DevOps tasks
- ❌ Internal refactoring without feature impact

## How to Use GitHub Issue Templates

### Option 1: Web UI (Recommended)

1. Go to Issues → "New Issue"
2. Click "Feature Implementation" under template options
3. GitHub pre-fills the template structure
4. Fill in all sections

### Option 2: GitHub CLI

```bash
gh issue create \
  --title "Implement REQ-FN-003: Metrics Catalog" \
  --template feature-implementation.md
```

### Option 3: Manual Copy

1. Copy contents of `feature-implementation.md`
2. Paste into new GitHub issue
3. Edit sections as needed

## Template Structure Overview

| Section                   | Purpose                         | Required |
| ------------------------- | ------------------------------- | -------- |
| Quick Summary             | 1-2 sentence overview           | Yes      |
| Status                    | Metadata (sprint, points)       | Yes      |
| Requirement Traceability  | SRS link, priority, module      | Yes      |
| Acceptance Criteria       | Specific, testable requirements | Yes      |
| Verification Methods      | How to validate                 | Yes      |
| Definition of Done        | Quality gates                   | Yes      |
| Implementation Scope      | Files, action level             | Yes      |
| Architectural Context     | Module, dependencies            | Yes      |
| Implementation Guidelines | NestJS patterns, examples       | Yes      |
| References                | Documentation links             | Yes      |
| Related Issues            | Blockers, dependencies          | Yes      |
| Implementation Checklist  | Progress tracking               | Optional |

## Best Practices

### Before Creating an Issue

- [ ] Verify the requirement exists in `docs/srs/REQ-*.md`
- [ ] Check `docs/architecture/traceability.md` for mapping
- [ ] Search existing issues to avoid duplicates
- [ ] Identify NestJS module that owns this feature

### When Filling the Template

- [ ] Use concrete file paths (e.g., `src/metrics/controllers/metrics.controller.ts`)
- [ ] Reference project standards (REQ-IDs, patterns)
- [ ] Provide test structure examples
- [ ] Link to architecture documentation

### After Creating an Issue

- [ ] Add labels: `sprint:current`, `requirement`, priority level, REQ-ID label
- [ ] Link to parent epic (if applicable)
- [ ] Assign to Copilot or team member
- [ ] Add to sprint/milestone

## Reference Documentation

- **Feature Implementation Guide**: See [`docs/ISSUE-TEMPLATE-GUIDE.md`](../ISSUE-TEMPLATE-GUIDE.md)
- **Project Standards**: See [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **SRS Requirements**: See [`docs/SRS.md`](../SRS.md)
- **Architecture**: See [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)

## Questions?

Refer to the **Feature Implementation Guide** (`docs/ISSUE-TEMPLATE-GUIDE.md`) for detailed explanations of each section and best practices.

---

**Last Updated**: 2025-11-11  
**Maintainer**: Architecture Team
