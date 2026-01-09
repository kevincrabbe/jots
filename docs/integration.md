# AI Integration Guide

How to use jots with AI coding agents like Claude Code.

## Overview

Jots is designed with AI agents in mind. Two commands are specifically optimized for agent workflows:

- **`jots next`** - Get the single most important thing to do
- **`jots context`** - Get a structured summary of all work

Both support `--json` for easy parsing.

---

## Claude Code Integration

### Automatic Setup

Running `jots init` sets up Claude Code integration automatically:

1. **CLAUDE.md section** - Instructions for the AI on how to use jots
2. **Validation hook** - Validates jots.json whenever it's modified

### CLAUDE.md Section

The init command adds this to your CLAUDE.md:

```markdown
## Task Management with Jots

This project uses jots for task management. Before starting work:

1. Run `jots context` to understand current state
2. Run `jots next` to get your next task
3. Mark tasks done with `jots done <id>` when complete

Commands:
- `jots next` - Get highest priority item
- `jots done <id>` - Mark item complete
- `jots context` - See full state
- `jots add <type> <content>` - Add new items
```

### Validation Hook

The hook at `.claude/hooks/validate-jots.sh` runs `jots validate` whenever jots.json is modified, catching errors immediately.

---

## Agent Workflow

### Starting a Session

```bash
# Get full context
jots context

# Or just get next item
jots next
```

### Working on Tasks

```bash
# Get next item with full context
$ jots next
Next: Write token expiry check [def456]
  Priority: p1 | Status: pending
  Epic: Build authentication system
  Task: Implement JWT validation
  Queue: 3 pending, 1 in progress

# Work on the task...

# Mark complete when done
$ jots done def456
Completed: Write token expiry check [def456]
```

### Adding Work Discovered During Development

```bash
# Found a bug while working? Add it
jots add subtask "Fix edge case in token refresh" -e auth -t jwt

# New requirement emerged? Add a task
jots add task "Add rate limiting to auth endpoints" -e auth
```

### Handling Blockers

```bash
# Mark something as blocked
jots update abc123 -s blocked

# Add a note about why (edit jots.json directly or use notes)
```

---

## JSON Output for Parsing

All commands support `--json` for structured output.

### jots next --json

```json
{
  "item": {
    "id": "def456",
    "type": "subtask",
    "content": "Write token expiry check",
    "priority": 1,
    "status": "pending",
    "created_at": "2024-01-15T10:00:00.000Z",
    "epicId": "abc123",
    "epicContent": "Build authentication system",
    "taskId": "ghi789",
    "taskContent": "Implement JWT validation"
  },
  "queue": {
    "pending": 3,
    "in_progress": 1
  }
}
```

### jots context --json

```json
{
  "progress": {
    "epics": { "completed": 1, "total": 3 },
    "tasks": { "completed": 4, "total": 12 },
    "subtasks": { "completed": 8, "total": 20 }
  },
  "in_progress": [
    {
      "id": "abc123",
      "type": "task",
      "content": "Implement JWT validation",
      "priority": 1,
      "status": "in_progress"
    }
  ],
  "blocked": [],
  "next": {
    "id": "def456",
    "type": "subtask",
    "content": "Write token expiry check"
  }
}
```

---

## Programmatic Usage

For agents that can execute code:

```typescript
import { readState, getNext, markComplete, writeState } from 'jots'

async function agentLoop() {
  const loaded = await readState()
  if (!loaded.success) return

  let state = loaded.state

  // Get next task
  const { item } = getNext({ state })
  if (!item) {
    console.log('All tasks complete!')
    return
  }

  console.log(`Working on: ${item.content}`)

  // ... do work ...

  // Mark complete
  const result = markComplete({ state, id: item.id })
  if (result.success) {
    await writeState(result.state)
  }
}
```

---

## Best Practices for AI Agents

### 1. Check Context First

Always run `jots context` or `jots next` before starting work. This ensures you're working on the right thing.

### 2. Mark Progress Incrementally

Don't batch completions. Mark each item done as you finish it:

```bash
# Good: Mark done immediately
jots done abc123
# Continue to next item...

# Bad: Wait until end of session to mark everything done
```

### 3. Add Discovered Work

When you find new work during implementation, add it immediately:

```bash
jots add subtask "Handle null case in parser" -e feature -t parser
```

### 4. Use Appropriate Granularity

- **Epic** - Multi-session initiative (hours to days of work)
- **Task** - Single session deliverable (30 min to 2 hours)
- **Subtask** - Atomic action (5-30 minutes)

### 5. Keep Content Descriptive

Good: `"Implement JWT token refresh with sliding expiration window"`
Bad: `"Do the JWT thing"`

### 6. Use Priority Wisely

- **p1** - Blocking other work, critical path
- **p2** - Important, do soon (default)
- **p3** - Should do, not urgent
- **p4** - Nice to have
- **p5** - Backlog, do if time permits

---

## Handling Edge Cases

### No Next Item

When `jots next` returns nothing, all actionable work is done:

```bash
$ jots next
No pending or in-progress items.
```

Check `jots context` to see if items are blocked.

### Multiple Matches

Fuzzy matching can match multiple items:

```bash
$ jots done auth
Error: Multiple items match "auth":
  - Build authentication system [abc123] (epic)
  - Add auth middleware [def456] (task)
Use exact ID to specify which item.
```

Use the exact ID from the error message.

### Validation Errors

If `jots validate` shows issues, fix them before continuing:

```bash
$ jots validate
Warnings:
  - Epic "Auth system" is completed but has 2 incomplete tasks

# Fix: Either mark those tasks complete or un-complete the epic
jots update abc123 -s in_progress
```

---

## Integration with Other Tools

### Git Hooks

Add jots validation to pre-commit:

```bash
#!/bin/bash
# .git/hooks/pre-commit
if [ -f jots.json ]; then
  jots validate --json | jq -e '.warnings | length == 0' > /dev/null
  if [ $? -ne 0 ]; then
    echo "jots.json has validation warnings"
    jots validate
    exit 1
  fi
fi
```

### CI/CD

Check task status in CI:

```yaml
# GitHub Actions example
- name: Check jots status
  run: |
    jots validate
    echo "## Task Progress" >> $GITHUB_STEP_SUMMARY
    jots context >> $GITHUB_STEP_SUMMARY
```

### IDE Integration

The jots.json file is standard JSON, so it works with any JSON-aware tooling:

- VSCode JSON schema validation
- JetBrains JSON support
- Any JSON linter
