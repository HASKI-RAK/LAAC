---
agent: 'agent'
model: 'GPT-5 mini'
tools:
  [
    'githubRepo',
    'search/codebase',
    'search',
    'edit',
    'todos',
    'usages',
    'runTasks',
    'runCommands',
    'vscodeAPI',
  ]
description: 'Run full analysis workflow from implement-feature, but output only a local Markdown issue and stop (no GitHub actions)'
---

# Local Feature Implementation Pipeline (Stops After Local Issue Creation)

You are an expert software architect and developer. Run the full analysis and planning workflow from `.github/prompts/implement-feature.prompt.md`, but instead of creating/assigning a GitHub issue and proceeding to implementation, create a fully populated local Markdown issue file and STOP. Do not perform any GitHub actions, commits, branches, or PRs.

## Input

**Target Requirement ID**: ${input:requirementId:Enter the requirement ID (e.g., REQ-FN-003, REQ-NF-005)}
**Title (optional)**: `${input:title:Short, human-friendly title}`

## Phase 1: Requirements Analysis & Traceability Check

1. Parse the SRS
   - Read `docs/SRS.md` and `docs/srs/${input:requirementId}.md`
   - Extract description, acceptance criteria, verification methods, dependencies
   - Identify category (Functional/Non-Functional), stakeholders, priority

2. Traceability Matrix
   - Read `docs/architecture/traceability.md`
   - Determine mapping of `${input:requirementId}` to components
   - Note implementation status (IMPLEMENTED | PARTIALLY_MAPPED | NOT_MAPPED | FUTURE)

3. Code Artifact Verification (especially for NOT_MAPPED)
   - Search `src/` for relevant modules/controllers/services
   - Check interfaces (e.g., IMetricComputation, ICacheService, ILRSClient)
   - Look for DTOs, guards, middleware, config, Docker compose bits
   - Record explicit file references if found

4. Related Requirements & ADRs
   - Identify related/dependent requirements
   - Check `docs/architecture/ARCHITECTURE.md` and ADR constraints

5. Current Architecture & Conventions
   - Review module structure (ARCHITECTURE.md Section 4.2)
   - Confirm patterns, interfaces (Section 11.1), and testing locations

## Phase 2: Create Local Markdown Issue

Create a Markdown issue file with full populated content from your analysis.

- Directory: `docs/issues/` (create if missing)
- Filename:
  - If `requirementId` provided: `docs/issues/${input:requirementId}-${slug(${input:title or 'feature'})}.md`
  - Else: `docs/issues/${date(YYYYMMDD-HHmmss)}-${slug(${input:title or 'feature'})}.md`

### Local Issue Body Template (Populate All Fields)

Use the template below and replace placeholders with concrete results from Phase 1.

```
# Implement ${input:requirementId}: [Requirement Name]

Summary
- Requirement: ${input:requirementId}
- Category: [Functional|Non-Functional]
- Priority: [from SRS]
- Stakeholders: [from SRS]

Traceability
- Status: [IMPLEMENTED|PARTIALLY_MAPPED|NOT_MAPPED|FUTURE]
- Architecture Mapping: [Modules/Services/Interfaces]
- Code Verification: [Artifacts exist / missing with file refs]
- Related Requirements: [IDs]
- Dependencies & ADRs: [list]

Acceptance Criteria
- [ ] [criteria 1 from docs/srs/${input:requirementId}.md]
- [ ] [criteria 2]
- [ ] Module structure per architecture (4.2)
- [ ] Interfaces per Section 11.1
- [ ] DTOs with validation (REQ-FN-024)
- [ ] OpenAPI decorators (REQ-FN-008/009)
- [ ] Guards & security (REQ-FN-023) if applicable
- [ ] Logging/metrics (REQ-FN-020/021) if applicable
- [ ] Env vars documented (.env.example) (REQ-FN-014)
- [ ] Unit/E2E tests and ~80% coverage (REQ-NF-020)

Implementation Scope
- [FULL_IMPLEMENTATION_AND_TESTS | TESTS_ONLY | ARCHITECTURE_INTEGRATION | REVIEW_ONLY]

Verification Methods
- [from SRS]

Notes
- Implementation considerations and constraints
- Open questions / risks
```

Rules for the local issue body
- Populate all fields with concrete findings; avoid generic placeholders.
- Include file paths for any code artifacts found (e.g., `src/module/file.ts:42`).
- Keep concise and actionable; use checklists where appropriate.

## Operational Rules

- Do not interact with GitHub (no remote issue creation, assigning, or comments).
- Do not modify source code, create branches, commits, or PRs.
- Only create the local Markdown issue file under `docs/issues/`.
- Follow repository conventions and the SRS as the source of truth.

## Output

- Return the full path of the created file, e.g., `docs/issues/REQ-FN-003-implement-caching.md`.

## Execution Plan

1. Complete Phase 1 analysis (SRS, traceability, code verification)
2. Generate the fully populated local issue body
3. Write the Markdown file under `docs/issues/`
4. STOP – No further actions
