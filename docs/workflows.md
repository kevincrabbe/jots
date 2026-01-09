# Workflows & Best Practices

Common patterns and recommended approaches for using jots effectively.

## Breaking Down Work

### The Epic → Task → Subtask Flow

Start broad and refine:

```bash
# 1. Create the epic (the "what")
jots add epic "Implement user authentication system" -p p1

# 2. Break into tasks (the "how")
jots add task "Set up authentication infrastructure" -e auth
jots add task "Implement login/logout flow" -e auth
jots add task "Add password reset functionality" -e auth
jots add task "Write authentication tests" -e auth

# 3. Break tasks into subtasks when you start working
jots add subtask "Install passport.js" -e auth -t infrastructure
jots add subtask "Configure JWT strategy" -e auth -t infrastructure
jots add subtask "Create auth middleware" -e auth -t infrastructure
```

### When to Create Each Level

| Level | Create When | Typical Scope |
|-------|-------------|---------------|
| Epic | Starting a new feature/initiative | Days to weeks |
| Task | Planning implementation approach | Hours to a day |
| Subtask | Starting actual work on a task | Minutes to hours |

### Just-in-Time Breakdown

Don't over-plan upfront. Create subtasks when you start a task:

```bash
# Morning: See what's next
$ jots next
Next: Implement login flow [abc123]

# Now break it down
jots add subtask "Create login form component" -e auth -t login
jots add subtask "Add form validation" -e auth -t login
jots add subtask "Connect to auth API" -e auth -t login
jots add subtask "Handle auth errors" -e auth -t login
jots add subtask "Add loading states" -e auth -t login
```

---

## Priority Management

### The Priority Matrix

| Priority | Use For | Examples |
|----------|---------|----------|
| p1 | Blocking work, critical bugs | "Fix production crash", "Unblock deploy" |
| p2 | Core feature work (default) | "Implement login", "Add API endpoint" |
| p3 | Important but not urgent | "Improve error messages", "Add logging" |
| p4 | Nice to have | "Refactor for readability", "Add comments" |
| p5 | Backlog | "Research alternatives", "Tech debt" |

### Priority Inheritance

Child items don't automatically inherit parent priority. Set explicitly:

```bash
# p1 epic
jots add epic "Fix critical security issue" -p p1

# Tasks should also be p1 if they're critical
jots add task "Patch XSS vulnerability" -e security -p p1
jots add task "Update security docs" -e security -p p3  # Less urgent
```

### Re-prioritizing

Adjust priorities as context changes:

```bash
# Something became urgent
jots update abc123 -p p1

# Something can wait
jots update def456 -p p4
```

---

## Status Transitions

### Normal Flow

```
pending → in_progress → completed
```

### With Blockers

```
pending → in_progress → blocked → in_progress → completed
```

### Status Meanings

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Ready to start | Pick up when it's next |
| `in_progress` | Actively working | Continue or complete |
| `completed` | Done | Nothing |
| `blocked` | Can't proceed | Resolve blocker first |

### Blocked Items

When something is blocked:

1. Mark it blocked: `jots update abc123 -s blocked`
2. Add context (edit jots.json notes field)
3. Create work to unblock if needed

```bash
# Mark blocked
jots update "deploy feature" -s blocked

# Add work to unblock
jots add task "Get security team approval" -e feature -p p1
```

---

## Multi-Session Work

### Starting a Session

```bash
# Quick: Just get next item
jots next

# Thorough: See full context
jots context
```

### Ending a Session

```bash
# Make sure current work is marked appropriately
jots list all -s in_progress

# Either complete them or leave as in_progress for next session
```

### Handoff to Another Person/Agent

The context command provides everything needed:

```bash
$ jots context
Progress:
  Epics: 1/3 | Tasks: 4/12 | Subtasks: 8/20

In Progress:
  ◐ Implement JWT validation [abc123]

Next:
  Write token expiry check [def456] (p1)
```

---

## Team Workflows

### Parallel Work Streams

Use separate epics for parallel work:

```bash
jots add epic "Frontend: User dashboard" -p p2
jots add epic "Backend: API redesign" -p p2
jots add epic "DevOps: CI/CD pipeline" -p p3
```

### Task Assignment

Use notes to track ownership:

```json
{
  "id": "abc123",
  "content": "Implement login flow",
  "notes": ["Assigned: @alice", "PR: #123"]
}
```

### Code Review Workflow

```bash
# Add review as a subtask
jots add subtask "Code review login implementation" -e auth -t login

# Or as a task for larger reviews
jots add task "Review and merge auth feature" -e auth
```

---

## Maintenance Patterns

### Regular Validation

Run validate periodically:

```bash
$ jots validate
Suggestions:
  - Task "Setup auth" has all subtasks completed - consider marking done
```

### Cleanup Completed Items

Completed items stay in jots.json for history. To clean up:

1. Export/archive the file
2. Remove completed epics manually
3. Or create a new jots.json and migrate pending work

### Handling Stale Items

Items sitting too long in pending:

```bash
# List all pending items
jots list all -s pending

# Re-evaluate priorities or remove if no longer needed
jots update stale-item -p p5  # Deprioritize
```

---

## Common Patterns

### Bug Fix Flow

```bash
# Create task under existing epic or standalone
jots add task "Fix login timeout issue" -e auth -p p1

# Break down investigation
jots add subtask "Reproduce the bug locally" -e auth -t timeout
jots add subtask "Identify root cause" -e auth -t timeout
jots add subtask "Implement fix" -e auth -t timeout
jots add subtask "Add regression test" -e auth -t timeout
```

### Feature Development

```bash
# Epic for the feature
jots add epic "Add dark mode support"

# Implementation tasks
jots add task "Design theme system architecture" -e dark
jots add task "Implement theme context/provider" -e dark
jots add task "Update components for theming" -e dark
jots add task "Add theme toggle UI" -e dark
jots add task "Test across browsers" -e dark
```

### Refactoring

```bash
# Keep refactoring focused
jots add epic "Refactor authentication module" -p p3

jots add task "Extract auth utilities" -e refactor
jots add task "Consolidate auth types" -e refactor
jots add task "Update auth tests" -e refactor
jots add task "Update documentation" -e refactor
```

### Tech Debt

```bash
# Dedicated epic for tech debt
jots add epic "Q1 Tech Debt Cleanup" -p p4

# Add items as discovered
jots add task "Remove deprecated API usage" -e debt
jots add task "Update outdated dependencies" -e debt
jots add task "Fix TypeScript strict mode errors" -e debt
```

---

## Anti-Patterns to Avoid

### Over-Planning

**Bad:** Creating 50 subtasks before starting work

**Good:** Create subtasks as you start each task

### Stale In-Progress

**Bad:** 10 items marked in_progress for days

**Good:** Only mark in_progress what you're actively working on

### Missing Context

**Bad:** `"Do the thing"` as content

**Good:** `"Implement JWT refresh token rotation with 7-day expiry"`

### Priority Inflation

**Bad:** Everything is p1

**Good:** Reserve p1 for truly critical items; most work is p2-p3

### Ignoring Blocked Items

**Bad:** Blocked items sit forever

**Good:** Actively work to unblock or remove if no longer needed
