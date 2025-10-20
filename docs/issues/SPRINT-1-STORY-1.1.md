# Sprint 1 - Story 1.1: NestJS Project Scaffolding

## Status
- **Created**: 2025-10-20
- **Status**: Planning
- **Assignee**: GitHub Copilot Agent
- **Story Points**: 2
- **Sprint**: Sprint 1
- **Epic**: Epic 1 - Project Foundation & Setup

## Sprint Context
This story is part of Sprint 1's foundational work to establish the NestJS project structure per the architecture defined in `docs/architecture/ARCHITECTURE.md`.

## Story Description
Set up NestJS project with TypeScript strict mode, module directory structure, and development tooling including ESLint, Prettier, and pre-commit hooks.

## Architecture Reference
- **Architecture Document**: `docs/architecture/ARCHITECTURE.md` Section 4.2 (Module Structure), Section 7.1 (Development View)
- **Module Structure** (from Section 7.1):
  ```
  src/
  ├── core/           # CoreModule - shared infrastructure
  ├── auth/           # AuthModule - security
  ├── metrics/        # MetricsModule - business logic
  ├── computation/    # ComputationModule - extensible layer
  ├── data-access/    # DataAccessModule - external systems
  └── admin/          # AdminModule - operational APIs
  ```

## Related Requirements
This story supports implementation of multiple SRS requirements:
- **REQ-FN-014** — Secrets and Configuration Management (CoreModule)
- **REQ-FN-019** — SOLID and CUPID Principles Guidance (module structure)
- **REQ-FN-020** — Structured Logging with Correlation IDs (CoreModule)
- **REQ-FN-023** — Authentication and Authorization Framework (AuthModule)
- **REQ-NF-015** — Developer Onboarding and Architecture Comprehension (consistent structure)
- **REQ-NF-020** — Security Testing and Compliance Validation (pre-commit hooks)

## Current State Assessment
**Existing Implementation**:
- ✅ NestJS CLI project initialized with basic structure
- ✅ TypeScript, ESLint, Prettier configured
- ✅ Jest testing framework configured
- ✅ Basic module files: `app.module.ts`, `app.controller.ts`, `app.service.ts`
- ✅ `.gitignore` configured with environment variable exclusions

**Missing Components**:
- ❌ Module directory structure (core, auth, metrics, computation, data-access, admin)
- ❌ Barrel exports (`index.ts`) in each module
- ❌ TypeScript strict mode (currently `noImplicitAny: false`)
- ❌ Pre-commit hooks with Husky
- ❌ `.editorconfig` for consistent formatting across editors

## Acceptance Criteria
- [ ] All module directories created per architecture (Section 7.1)
  - [ ] `src/core/` directory with `index.ts`
  - [ ] `src/auth/` directory with `index.ts`
  - [ ] `src/metrics/` directory with `index.ts`
  - [ ] `src/computation/` directory with `index.ts`
  - [ ] `src/data-access/` directory with `index.ts`
  - [ ] `src/admin/` directory with `index.ts`
- [ ] Barrel exports (`index.ts`) in each module for clean imports
- [ ] TypeScript strict mode enabled in `tsconfig.json`:
  - [ ] `strict: true` (enables all strict checks)
  - [ ] OR individual flags: `noImplicitAny: true`, `strictNullChecks: true`, `strictFunctionTypes: true`, etc.
- [ ] ESLint + Prettier configured and working (verify with `yarn lint`)
- [ ] Git pre-commit hooks set up with Husky:
  - [ ] Runs ESLint on staged files
  - [ ] Runs Prettier format check
  - [ ] Prevents commit if checks fail
- [ ] `.editorconfig` created for consistent formatting
- [ ] All changes documented in comments referencing architecture sections
- [ ] `AppModule` remains functional after refactoring

## Tasks
- [ ] **Task 1.1.1**: Create module directory structure
  - Create directories: `src/core/`, `src/auth/`, `src/metrics/`, `src/computation/`, `src/data-access/`, `src/admin/`
  - Create barrel export files: `src/*/index.ts` in each module
  - Add placeholder NestJS module files: `src/*/[module-name].module.ts`
  
- [ ] **Task 1.1.2**: Enable TypeScript strict mode
  - Update `tsconfig.json` to enable strict mode
  - Fix any type errors that arise from strict mode
  - Verify build succeeds with `yarn build`
  
- [ ] **Task 1.1.3**: Set up Husky pre-commit hooks
  - Install Husky: `yarn add -D husky`
  - Initialize Husky: `npx husky init`
  - Create pre-commit hook script
  - Configure hook to run lint-staged
  - Install lint-staged: `yarn add -D lint-staged`
  - Configure lint-staged in `package.json`
  
- [ ] **Task 1.1.4**: Create `.editorconfig`
  - Define consistent formatting rules
  - Align with Prettier configuration
  - Include TypeScript-specific settings
  
- [ ] **Task 1.1.5**: Update `package.json` scripts
  - Add `prepare` script for Husky
  - Verify all existing scripts still work
  
- [ ] **Task 1.1.6**: Test and validate
  - Run `yarn install` to trigger Husky setup
  - Run `yarn lint` to verify ESLint works
  - Run `yarn build` to verify TypeScript compiles
  - Run `yarn test` to verify tests pass
  - Make a test commit to verify pre-commit hook runs

## Implementation Guidelines
1. **Module Structure** (Section 7.1):
   - Each module directory represents a bounded context
   - Barrel exports (`index.ts`) expose public APIs only
   - Follow NestJS module conventions: one `@Module()` decorator per module file
   - Reference: ARCHITECTURE.md Section 4.2

2. **TypeScript Strict Mode**:
   - Enable `strict: true` in `tsconfig.json` to catch type errors early
   - Aligns with REQ-NF-019 (SOLID principles) and REQ-NF-020 (security)
   - May require fixing existing code for null checks and type assertions

3. **Pre-Commit Hooks** (Husky + lint-staged):
   - Prevents committing code that doesn't pass linting/formatting
   - Aligns with REQ-NF-020 (security testing at commit time)
   - Hook should run fast (<5 seconds) to not block developer workflow

4. **EditorConfig**:
   - Ensures consistent formatting across different IDEs
   - Aligns with Prettier settings
   - Reference: https://editorconfig.org/

5. **SOLID/CUPID Principles** (Section 12):
   - Module boundaries enforce separation of concerns
   - Barrel exports provide explicit public interfaces
   - Dependency injection via NestJS supports testability

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Module directories created with placeholder files
- [ ] TypeScript strict mode enabled and build succeeds
- [ ] Pre-commit hooks installed and functional
- [ ] `.editorconfig` created and committed
- [ ] All commands succeed:
  - [ ] `yarn install`
  - [ ] `yarn lint`
  - [ ] `yarn build`
  - [ ] `yarn test`
  - [ ] Test commit triggers pre-commit hook
- [ ] No breaking changes to existing functionality
- [ ] Code follows NestJS conventions
- [ ] Documentation updated (README if needed)
- [ ] Changes reviewed and approved
- [ ] Merged to `sprint-1-planning` branch

## Files to Create/Modify

**New Files**:
- `src/core/index.ts` — Barrel export for CoreModule
- `src/core/core.module.ts` — Placeholder NestJS module
- `src/auth/index.ts` — Barrel export for AuthModule
- `src/auth/auth.module.ts` — Placeholder NestJS module
- `src/metrics/index.ts` — Barrel export for MetricsModule
- `src/metrics/metrics.module.ts` — Placeholder NestJS module
- `src/computation/index.ts` — Barrel export for ComputationModule
- `src/computation/computation.module.ts` — Placeholder NestJS module
- `src/data-access/index.ts` — Barrel export for DataAccessModule
- `src/data-access/data-access.module.ts` — Placeholder NestJS module
- `src/admin/index.ts` — Barrel export for AdminModule
- `src/admin/admin.module.ts` — Placeholder NestJS module
- `.editorconfig` — Editor configuration
- `.husky/pre-commit` — Pre-commit hook script

**Modified Files**:
- `tsconfig.json` — Enable strict mode
- `package.json` — Add Husky/lint-staged dependencies and scripts
- `.gitignore` — Verify environment files excluded (already done)

## Success Metrics
- ✅ All 6 module directories created
- ✅ TypeScript compiles with strict mode (0 errors)
- ✅ Pre-commit hook blocks commits with lint errors
- ✅ Consistent formatting across all new files
- ✅ No regressions in existing tests

## Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| TypeScript strict mode breaks existing code | Medium | Fix type errors incrementally, use `@ts-ignore` sparingly for legacy code |
| Pre-commit hooks slow down commits | Low | Use lint-staged to only lint staged files, not entire codebase |
| Team unfamiliar with new directory structure | Low | Document structure in README, reference architecture docs |

## Notes
- This is foundational work for all subsequent stories in Sprint 1
- Module placeholders will be populated in Stories 1.2-1.4 and Epic 2-3
- Strict mode may reveal existing type issues that need fixing
- Husky setup should be automatic via `prepare` script in `package.json`

## Related Files
- Sprint Plan: `docs/sprints/SPRINT-1-PLAN.md`
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Traceability: `docs/architecture/traceability.md`
- Copilot Instructions: `.github/copilot-instructions.md`
