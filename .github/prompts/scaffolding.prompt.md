---
mode: "agent"
description: "Bootstrap repo per README.md"
---

Use README.md as the single source of truth. Confirm before destructive changes.

Checklist
1) Read #file:README.md and #file:.github/copilot-instructions.md.
2) Extract tech stack, package manager, commands for install/run/test.
3) Ensure package manager setup matches README (Yarn). If mismatch, STOP and ask.
4) Install dependencies: run `yarn install`.
5) Lint/format tooling: TODO: If README documents lint/format, set up configs and scripts accordingly. Otherwise, STOP and propose options.
6) Build tooling: TODO: If README documents a build command, wire it; else, document gap.
7) Testing: Ensure `yarn test`, `yarn test:e2e`, `yarn test:cov` run. Fix minimal config issues only if non-destructive.
8) CI: TODO: If README defines CI, add workflow; otherwise, propose minimal CI in a plan and ask to confirm.
9) App scaffolds: For NestJS, keep defaults. Do not generate frontend code unless README requires it.
10) Write a brief summary of actions, commands validated, and TODOs due to missing README details.
