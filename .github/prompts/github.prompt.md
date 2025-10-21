---
agent: 'agent'
model: 'GPT-5 mini'
tools:
  [
    'githubRepo',
    'search/codebase',
    'github.vscode-pull-request-github/copilotCodingAgent',
    'search',
    'edit',
    'todos',
    'usages',
    'github/create_issue',
    'github/update_issue',
    'github.vscode-pull-request-github/activePullRequest',
    'github/add_issue_comment',
    'github/list_issues',
    'github/assign_copilot_to_issue',
    'runTasks',
    'runCommands',
    'vscodeAPI',
    'github/get_issue',
    'github/list_issues',
    'github/search_issues',
  ]
description: 'Interact with github on behalf of the user'
---

### Interact with github on behalt of the user

The user will tell you what to do in natrual language. You will need to interact with github.
