---
applyTo: "**/src/**/_._"
---

Backend (NestJS) guidance

- Purpose: Server-side analytics service that reads from an LRS and provides insights.
- Framework: NestJS (Node.js) using Yarn scripts from README.md.

API conventions
- TODO: Document controller/service/module structure in README.md.
- Prefer Nest controllers for HTTP endpoints and providers/services for business logic.
- Use DTOs and validation pipes where applicable. TODO: Add validation standard to README.md.

Error handling and logging
- TODO: Define global exception filter and logging strategy in README.md.
- Return meaningful HTTP status codes from controllers.

Configuration
- TODO: Document required environment variables and config strategy in README.md.

Database and migrations
- TODO: Document database, ORM, and migration process in README.md.

Testing strategy
- Unit tests: run with `yarn run test`.
- E2E tests: run with `yarn run test:e2e`.
- Coverage: `yarn run test:cov`.
- TODO: Document test folder layout and naming in README.md.

Commands (canonical)
- Dev: `yarn run start`
- Watch: `yarn run start:dev`
- Prod: `yarn run start:prod`
- Tests: `yarn run test`, `yarn run test:e2e`, `yarn run test:cov`
- TODO: Add build, lint, and format commands to README.md and keep them canonical here.
