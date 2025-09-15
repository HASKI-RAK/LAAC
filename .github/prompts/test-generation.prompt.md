---
mode: "edit"
description: "Generate tests aligned to README conventions"
---

Use #file:README.md and #file:.github/copilot-instructions.md as anchors.

When asked to add tests
- Prefer Jest unit tests colocated with source or in test directories per project standards. TODO: Document exact layout in README.
- Provide 1 happy path and 1 edge case per public function/controller.
- Ensure e2e tests use NestJS testing utilities when applicable.
- Keep commands compatible with README: `yarn test`, `yarn test:e2e`, `yarn test:cov`.
