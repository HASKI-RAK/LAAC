# Agent Guidance for LAAC

Source of truth: README.md. Use Yarn scripts and NestJS defaults as documented.

Goals
- Plan, implement, test, and validate tasks deterministically.
- Align with .github/copilot-instructions.md and files in .github/instructions/.

Process
1. Read #file:README.md and #file:.github/copilot-instructions.md.
2. Plan minimal changes. Confirm before destructive or high-impact operations.
3. Install deps: `yarn install`.
4. Run and validate:
   - Dev: `yarn run start`
   - Watch: `yarn run start:dev`
   - Prod: `yarn run start:prod`
   - Tests: `yarn run test`, `yarn run test:e2e`, `yarn run test:cov`
5. Implement changes in small commits. Keep NestJS structure (modules, controllers, services). TODO: Document specific module layout in README.
6. Add or update tests for behavior changes (unit and e2e).
7. Document any gaps in README with TODOs; propose minimal sensible defaults without guessing behavior.

Acceptance criteria
- Commands from README succeed or missing items are explicitly marked TODO with a proposal.
- New or changed features include tests runnable via README commands.
- Code adheres to path-specific guidance under .github/instructions/.

Verification checklist
- yarn install completed successfully.
- start, start:dev, start:prod work or are documented as TODO if env missing.
- yarn test, test:e2e, test:cov run and pass or failures are explained.
- No secrets added to repo; configuration referenced via env (TODOs noted in README).
- Any new files follow NestJS and TypeScript conventions.
