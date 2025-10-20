---
mode: 'agent'
model: 'Claude Sonnet 4'
tools: ['githubRepo', 'codebase', 'copilotCodingAgent', 'search', 'edit','todos','usages', 'create_issue', 'update_issue', 'activePullRequest', 'add_issue_comment', 'list_issues', 'assign_copilot_to_issue', 'runTasks', 'runCommands','vscodeAPI', 'get_issue', 'list_issues', 'search_issues']
description: 'Implement a system feature from SRS requirements with full traceability'
---

# Feature Implementation Pipeline

You are an expert software architect and developer tasked with implementing system features from the TOEFL Website project's Software Requirements Specification (SRS).

## Input
**Target Feature ID**: ${input:featureId:Enter the feature ID (e.g., FEAT-EDIT-001)}

## Your Mission

### Phase 1: Requirements Analysis & Traceability Check

1. **Parse the SRS Document**
   - Read `docs/SRS.md` and locate the target feature `${input:featureId}`
   - Extract the complete requirement description, acceptance criteria, and context
   - Identify the system feature category (e.g., Authentication, Reading Test Delivery, Editor Mode)

2. **Traceability Matrix Analysis**
   - Read `docs/traceability.md` to check current implementation status
   - Verify if `${input:featureId}` or any sub-features are already implemented
   - Check for existing test coverage referencing this feature
   - Identify partial implementations that need completion vs full implementations

3. **Implementation Status Assessment**
   Based on traceability matrix status, determine the required action:
   
   - **IMPLEMENTED_OK**: Feature is complete with tests, create issue noting "Implementation Review Required"
   - **FAILING**: Feature implemented but tests are failing, create issue for test fixes
   - **NO_TESTS**: **CRITICAL** - Requires code inspection to determine next steps:
     - If implementation artifacts exist (check `src/actions/`, `src/app/types/`, etc.), create issue for "Add comprehensive test coverage"
     - If NO implementation artifacts exist, create issue for "Full implementation with tests"
   - **FUTURE**: Feature marked as future work, create issue noting timeline considerations
   
   **Important**: For NO_TESTS status, you MUST verify actual code existence before proceeding. Search for:
   - Function/class names mentioned in the requirement
   - Type definitions, interfaces, or enums related to the feature
   - Server actions or components that implement the functionality
   - Database schema changes that support the feature
   
   Document both the traceability status AND code verification results in the issue.

4. **Find Related Features**
   - Scan the SRS for technically related features that should be implemented together
   - Cross-reference with traceability matrix to avoid duplicate work
   - Look for dependencies (features that must be implemented before this one)
   - Identify features that share similar components, data models, or UI patterns
   - Consider the project architecture (Next.js 15, TypeScript, React, Prisma)

5. **Analyze Current Implementation**
   - Check the system architecture under `docs/architecture/`
   - Review `src/app/` for relevant pages and layouts
   - (optional) Examine the existing codebase structure under `src/`
   - (optional) Check `src/actions/` for related server actions
   - (optional) Inspect `src/client-components/` and `src/server-components/` for reusable components
   - Check `prisma/schema.prisma` for relevant data models
   - (optional) Scan `__tests__/` for existing test files referencing the feature ID
   
   **For NO_TESTS features - Code Artifact Verification**:
   Search for specific implementation evidence:
   - Functions, classes, or constants that implement the requirement
   - Type definitions (enums, interfaces) related to the feature
   - Database models or schema that support the functionality
   - UI components that provide the user-facing behavior
   - Server actions that handle the business logic
   
   **Document findings clearly**: "Implementation EXISTS" or "Implementation MISSING" with specific file references.

### Phase 2: Issue Documentation Creation

Create a comprehensive issue document at `docs/issues/${input:featureId}.md` with this structure:

```markdown
# ${input:featureId}: [Feature Title]

## Status
- **Created**: [Current Date]
- **Status**: Planning
- **Assignee**: GitHub Copilot Agent
- **Story Points**: [Estimated]

## Requirement Traceability
- **SRS Reference**: docs/SRS.md, Section [X.X]
- **Primary Requirement**: ${input:featureId}
- **Related Features**: [List discovered related features]
- **Dependencies**: [List prerequisite features]
- **Traceability Matrix Status**: [IMPLEMENTED_OK / FAILING / NO_TESTS / FUTURE from docs/traceability.md]
- **Code Verification Result**: [Implementation EXISTS in files X,Y,Z / Implementation MISSING - needs full development]
- **Existing Test Coverage**: [List any existing tests referencing this feature]
- **Implementation Notes**: [Any warnings about duplicate implementation or review needs]

## Acceptance Criteria
- [ ] [Specific, testable criteria from SRS]
- [ ] Implementation follows project architecture (`docs/architecture/system-overview.md`)
- [ ] Server actions created in `src/actions/` if needed
- [ ] Client/Server components follow existing patterns
- [ ] Database schema updated via Prisma if needed
- [ ] Unit tests reference ${input:featureId} in comments
- [ ] Integration with existing authentication system
- [ ] Responsive design using existing styling patterns
- [ ] Playwright screenshot in the issue for visual reference


## Definition of Done
- [ ] Feature implemented according to SRS specification
- [ ] Code follows project TypeScript/ESLint standards
- [ ] Database migrations created and tested
- [ ] Unit tests written with ${input:featureId} traceability
- [ ] Integration tests pass
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Feature verified against acceptance criteria

# Implementation Advisory
[Space for implementation details, challenges, and decisions]
${input:advisory:Any special wishes how the implementation should be approached?}

## Related Files
- SRS: `docs/SRS.md`
- System Overview: `docs/architecture/system-overview.md`
- Schema: `prisma/schema.prisma`
- [Other relevant files discovered]
```

### Phase 3: Implementation Execution

After creating the issue documentation, **DELEGATE TO GITHUB COPILOT CODING AGENT**:

**IMPORTANT**: Do NOT implement the feature yourself. Instead, create a GitHub issue and assign it to the Copilot coding agent for remote implementation.

**Implementation Delegation Process**:

1. **Create GitHub Issue**: Use the `create_issue` tool to create an issue with:
   - **Title**: `Implement ${input:featureId}: [Feature Name]`
   - **Body**: 
   ```
   Implements system requirement ${input:featureId} as specified in docs/SRS.md.

   ## Implementation Scope
   [Summary of what will be implemented based on Phase 1 & 2 analysis]
   **Action Required**: [FULL_IMPLEMENTATION_AND_TESTS / TESTS_ONLY / IMPLEMENTATION_ONLY / REVIEW_ONLY]

   ## Related Requirements
   [List of related features discovered that should be implemented together]

   ## Technical Approach
   [Advisory notes from Phase 2]

   ## Traceability Requirements
   - Issue Documentation: docs/issues/${input:featureId}.md
   - SRS Reference: [Section reference from analysis]
   - Test Requirements: All tests must reference ${input:featureId} in comments
   - Follow project architecture: Next.js 15 + TypeScript + Prisma

   ## Acceptance Criteria
   [Copy key acceptance criteria from the created issue documentation]

   ## Implementation Guidelines
   - Check system architecture in docs/architecture/system-overview.md
   - Follow existing patterns in src/actions/, src/app/, src/client-components/, src/server-components/
   - Update prisma/schema.prisma if database changes needed
   - Create unit tests in __tests__/ with ${input:featureId} traceability
   - Ensure integration with existing authentication system
   - Use existing styling patterns and responsive design
   
   **CRITICAL**: Based on code verification results:
   - If "Implementation EXISTS": Focus ONLY on comprehensive test coverage with ${input:featureId} traceability
   - If "Implementation MISSING": Implement both the feature logic AND comprehensive test coverage
   ```

2. **Assign to Copilot**: After creating the issue, use the `assign_copilot_to_issue` tool to delegate the implementation to the GitHub Copilot coding agent.

**Your role ends here - the remote coding agent will handle the actual implementation.**

### Phase 4: Post-Implementation Validation & Traceability Update

**Note**: This phase occurs after the remote GitHub Copilot coding agent completes the implementation and creates a pull request. The user will prompt you to proceed with these steps.

1. **Post-Implementation Tasks** (to be done after PR is created):
   - Update the status in `docs/issues/${input:featureId}.md` to reflect completion using the tool `update_issue` as well as Definition of Done and Acceptance Criteria
   - Take a screenshot of the implemented feature for documentation by adding a comment to the issue using `add_issue_comment`
   - Add implementation notes about any deviations from the plan
   - Document any new dependencies or side effects discovered
   - Update the "Related Files" section with actual files modified

2. **Verify Traceability** (when reviewing the PR):
   - Ensure tests reference ${input:featureId} in comments
   - Verify SRS requirements are fully addressed
   - Check that related features are properly handled

3. **Generate Updated Traceability Matrix**:
   - Run `yarn trace` to update the traceability matrix with new implementation status
   - This will execute unit tests, E2E tests, and regenerate `docs/traceability.md`
   - Verify that ${input:featureId} status changed from NO_TESTS to IMPLEMENTED_OK or appropriate status
   - Check that test coverage is properly detected and linked

4. **Commit Traceability Updates**:
   - Stage the updated traceability matrix: `git add docs/traceability.md`
   - Stage the issue documentation: `git add docs/issues/${input:featureId}.md`
   - Commit with descriptive message: `git commit -m "Update traceability matrix for ${input:featureId} implementation"`
   - This ensures the documentation changes are captured alongside the feature implementation

## Quality Assurance

Throughout the process, ensure:

- **Consistency**: Follow existing project patterns and conventions
- **Traceability**: Maintain clear links between requirements, implementation, and tests
- **Documentation**: Keep issue documentation accurate and up-to-date
- **Testing**: Comprehensive test coverage with proper requirement references
- **Architecture**: Respect the Next.js 15 + TypeScript + Prisma architecture
- **Matrix Synchronization**: Always run `yarn trace` after implementation to update traceability status
- **Version Control**: Commit documentation updates alongside code changes for complete history

## Success Criteria

The feature delegation is successful when:
1. ✅ All SRS requirements for ${input:featureId} are analyzed and documented
2. ✅ Related features are identified and coordinated
3. ✅ Issue documentation is complete and accurate at `docs/issues/${input:featureId}.md`
4. ✅ GitHub issue is created with comprehensive implementation requirements
5. ✅ GitHub Copilot coding agent is assigned to the issue for remote implementation
6. ✅ Full traceability requirements are specified for the remote implementation
7. ✅ Implementation guidelines and project standards are clearly communicated
8. ✅ Acceptance criteria are properly transferred to the GitHub issue

**Post-Implementation** (after remote agent completes work):
9. ✅ Traceability matrix is updated via `yarn trace` and committed
10. ✅ Feature status in `docs/traceability.md` reflects implementation completion
11. ✅ Documentation changes are committed alongside code changes

---

**EXECUTION PLAN**:
1. Complete Phase 1: Requirements Analysis & Traceability Check
2. Complete Phase 2: Issue Documentation Creation 
3. Complete Phase 3: Create GitHub issue and assign to Copilot coding agent
4. **STOP** - Remote agent will handle implementation
5. Phase 4 activities will be completed after the remote implementation is done

**Start the analysis and delegation process now with feature ID: ${input:featureId}**