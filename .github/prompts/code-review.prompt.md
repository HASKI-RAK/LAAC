---
mode: "ask"
description: "PR code review using repo instructions"
---

Review the diff against #file:README.md, #file:.github/copilot-instructions.md, and files under #file:.github/instructions/.

Instructions
- Identify deviations from canonical commands and conventions.
- Group findings by severity (blocker, major, minor) and area (API, tests, types, tooling).
- Check presence of unit/e2e tests for new behavior per README test commands.
- Flag TODOs that should be resolved or documented in README.
- Suggest concrete fixes with file/line references when possible.
