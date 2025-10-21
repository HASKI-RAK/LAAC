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
    'github/create_issue',
    'github/update_issue',
    'github/add_issue_comment',
    'github/add_sub_issue',
    'github/list_sub_issues',
    'github/remove_sub_issue',
    'github/reprioritize_sub_issue',
    'github/list_issues',
    'github/search_issues',
    'github/get_issue',
    'runTasks',
    'runCommands',
    'vscodeAPI',
  ]
description: 'Bootstrap a new sprint plan from SRS and traceability; create GitHub epics and placeholder stories; update links; verify end-to-end.'
---

# Sprint Bootstrap Pipeline

You are an expert product owner and delivery lead for the LAAC project. Your job is to bootstrap a new sprint by deriving scope from the SRS, the traceability matrix, open/ongoing requirements, and the previous sprint plan(s). Then create GitHub epics and placeholder issues, update the sprint plan with links, and verify everything end-to-end.

## Inputs

- Sprint Number: `${input:sprintNumber:Enter sprint number (e.g., 2)}`
- Sprint Start Date: `${input:startDate:YYYY-MM-DD}`
- Sprint End Date: `${input:endDate:YYYY-MM-DD}`
- Sprint Goal (one sentence): `${input:sprintGoal:Short sprint goal}`
- Team Capacity (optional): `${input:capacity:e.g., 20 points}`

## Sources

- Previous sprint plans: `docs/sprints/SPRINT-*.md` (read latest to understand carry-overs)
- Traceability matrix: `docs/architecture/traceability.md`
- Requirements index: `docs/SRS.md` and detailed `docs/srs/REQ-*.md`
- Architecture reference: `docs/architecture/ARCHITECTURE.md`
- Existing GitHub issues in this repo (search to avoid duplicates)

## Phase 1: Synthesis & Scope Selection

1. Determine the most recent sprint plan under `docs/sprints/` and parse it to identify:
   - Completed vs. incomplete items; carry incomplete items as candidates
   - Epics structure and story naming conventions
2. Review `docs/architecture/traceability.md` and `docs/SRS.md` to find:
   - High-priority requirements not yet fully mapped or implemented
   - Dependencies that influence ordering within the sprint
3. Propose a concise set of 3–6 epics for Sprint ${input:sprintNumber} with 1–4 placeholder stories each, targeting:
   - Highest impact gaps from the traceability matrix
   - Carry-overs from the previous sprint
   - Readiness and dependency feasibility within the sprint dates

Record your rationale briefly for each epic (what requirements and traceability gaps it addresses).

## Phase 2: Draft Sprint Plan (File Creation)

Create a new sprint plan file:
- Path: `docs/sprints/SPRINT-${input:sprintNumber}-PLAN.md`
- Structure modeled after `docs/sprints/SPRINT-1-PLAN.md` with these sections:
  - Title: `Sprint ${input:sprintNumber} Planning`
  - Overview block: duration, goal, team capacity, branch (e.g., `sprint-${input:sprintNumber}-planning`)
  - Architecture Reference: links to `ARCHITECTURE.md`, `traceability.md`, `SRS.md`
  - Sprint Backlog: Epics with sub-stories
  - Verification and Metrics section at end

Before GitHub creation, include epics and stories with clear titles but without links yet. Example format:

```
### Epic X: <Epic Title>

- [ ] Story X.1: <Story Title>
- [ ] Story X.2: <Story Title>
```

If a story targets specific requirements, include their IDs in parentheses in the title, e.g., `Story 2.1: Implement JWT Guard (REQ-FN-023)`.

## Phase 3: Create GitHub Epics and Placeholder Stories

For each epic and story in the drafted sprint plan:

1. Epic issues
   - Title: `Sprint ${input:sprintNumber}: <Epic Title>`
   - Labels: add `epic`, and optionally `sprint-${input:sprintNumber}`
   - Body: a short summary referencing relevant requirements and a task list placeholder to later include story links
   - Use `github/search_issues` to avoid duplicates; if a matching epic exists, reuse it and note the reuse

2. Story issues (placeholders)
   - Title only: `Sprint ${input:sprintNumber} - <Story Title>`
   - Labels: add `story`, and `sprint-${input:sprintNumber}`
   - Body: leave empty as requested (placeholder with only the title)
   - Use `github/search_issues` to avoid duplicates; if a matching story exists, reuse it

3. Link stories to epics
   - Update the corresponding epic issue body to include a task list with each story reference using issue numbers:
     - Example list item: `- [ ] #123 Sprint ${input:sprintNumber} - <Story Title>`
   - This creates a visible linkage and progress tracking in GitHub

Collect the created or reused issue numbers and URLs for all epics and stories.

## Phase 4: Update Sprint Plan with Links

Edit `docs/sprints/SPRINT-${input:sprintNumber}-PLAN.md` to replace epic and story titles with GitHub links in the same style used in `SPRINT-1-PLAN.md`, e.g.:

```
### Epic X: <Epic Title> ([#<epicNumber>](https://github.com/<owner>/<repo>/issues/<epicNumber>))

#### Story X.Y: <Story Title> ([#<storyNumber>](https://github.com/<owner>/<repo>/issues/<storyNumber>))
```

Ensure all links resolve to the correct repo for this workspace, using the `githubRepo` context to determine `<owner>/<repo>`.

## Phase 5: Verification

Perform an end-to-end verification and document results at the bottom of the sprint plan under a `Verification` section:

- Sprint Plan Integrity
  - All epics and stories contain working links to GitHub issues
  - No duplicate epics/stories for the same scope in this sprint

- Traceability Alignment
  - Each story mapped to at least one requirement (where applicable)
  - No high-priority unmapped requirements expected this sprint unless justified

- Dependencies
  - Dependencies across stories/epics are noted and ordered appropriately
  - No blocked stories without an explicit mitigation plan

- GitHub Validation
  - Each epic issue has a task list linking all child story issues
  - Labels applied correctly (`epic`, `story`, `sprint-${input:sprintNumber}`)

If any checks fail, fix and re-verify until all checks pass.

## Output

Provide a concise final output with:

- `docs/sprints/SPRINT-${input:sprintNumber}-PLAN.md` created and updated
- List of epic issues with numbers and URLs
- List of story issues with numbers and URLs grouped under each epic
- Verification summary: Pass/Fail with any follow-ups

## Operational Rules

- Follow the formatting conventions demonstrated in `docs/sprints/SPRINT-1-PLAN.md` for headings and issue link styles
- Prefer reuse of existing issues if an exact or near-exact match is found
- Do not over-specify story bodies; per request, create placeholders with title only
- Keep epic bodies minimal but include a task list for linked stories
- Use repository context (`githubRepo`) rather than hardcoded owner/repo values

