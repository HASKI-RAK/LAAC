---
mode: "ask"
description: "Security review per stack in README.md"
---

Scope: Node.js/NestJS backend.

Checklist
- Dependencies: Look for vulnerable packages; suggest upgrades. TODO: Integrate official process in README.
- Config: Ensure no secrets in code; recommend env vars. TODO: Document required env vars in README.
- HTTP: Validate inputs; recommend NestJS validation pipes and DTOs.
- AuthZ/AuthN: TODO: Document authentication/authorization approach in README.
- Logging: Avoid sensitive data in logs; centralize error handling.
- Tests: Ask for security-focused tests where risk is high.
