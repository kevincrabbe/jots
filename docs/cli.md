# CLI Reference

Complete documentation for all jots commands.

## Global Options

All commands support:

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format for programmatic use |
| `--help` | Show help for the command |

---

## jots init

Initialize jots in the current directory.

```bash
jots init [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--force, -f` | Overwrite existing jots.json |
| `--skip-claude` | Skip Claude Code integration setup |

### What it creates

1. **jots.json** - Empty task file with version 1 schema
2. **CLAUDE.md section** - Instructions for Claude Code integration (appended if file exists)
3. **.claude/hooks/validate-jots.sh** - Hook that validates jots.json on edits

### Example

```bash
$ jots init
Created jots.json
Updated CLAUDE.md with jots integration guide
Created .claude/hooks/validate-jots.sh

Next steps:
  jots add epic "Your first epic"
```

---

## jots add

Add an epic, task, or subtask.

```bash
jots add <type> <content> [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `type` | Item type: `epic`, `task`, or `subtask` |
| `content` | Description (minimum 10 characters) |

### Options

| Option | Description |
|--------|-------------|
| `--epic, -e` | Parent epic (ID or text match). Required for task/subtask |
| `--task, -t` | Parent task (ID or text match). Required for subtask |
| `--priority, -p` | Priority level: p1-p5 (default: p2) |

### Priority Levels

| Priority | Meaning |
|----------|---------|
| p1 | Critical - highest priority |
| p2 | High (default) |
| p3 | Medium |
| p4 | Low |
| p5 | Nice-to-have - lowest priority |

### Examples

```bash
# Add an epic
jots add epic "Build authentication system" -p p1

# Add a task to an epic (fuzzy match on "auth")
jots add task "Implement JWT validation" -e auth

# Add a subtask (fuzzy match on both)
jots add subtask "Write expiry check" -e auth -t jwt

# Full IDs work too
jots add task "Add refresh tokens" -e abc123
```

### Fuzzy Matching

The `-e` and `-t` options support fuzzy matching:
- Exact ID match (e.g., `abc123`)
- Partial ID match (e.g., `abc`)
- Text content match (e.g., `auth` matches "Build authentication system")

If multiple items match, you'll get an error listing the matches.

---

## jots list

Display items filtered by type and criteria.

```bash
jots list [type] [options]
```

### Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `type` | What to list: `epics`, `tasks`, `subtasks`, `all` | `epics` |

### Options

| Option | Description |
|--------|-------------|
| `--epic, -e` | Filter by epic (ID or text match) |
| `--task, -t` | Filter by task (ID or text match) |
| `--status, -s` | Filter by status (comma-separated) |
| `--priority, -p` | Filter by priority (comma-separated) |

### Status Values

- `pending` - Not started
- `in_progress` - Currently being worked on
- `completed` - Finished
- `blocked` - Cannot proceed

### Examples

```bash
# List all epics (default)
jots list

# List all tasks
jots list tasks

# List tasks in a specific epic
jots list tasks -e auth

# List only pending and in_progress items
jots list all -s pending,in_progress

# List high-priority items
jots list all -p p1,p2

# Combine filters
jots list tasks -e auth -s pending -p p1
```

### Output Format

```
Build authentication system [abc123]
  Priority: p1 | Status: in_progress | Progress: 2/5 tasks
```

- Status icons: `○` pending, `◐` in_progress, `●` completed, `⊘` blocked
- Progress shows completed/total for child items

---

## jots next

Get the highest-priority actionable item.

```bash
jots next [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--level, -l` | Filter by level: `epic`, `task`, `subtask`, `any` (default: `any`) |

### Selection Logic

1. Filters to `pending` or `in_progress` items only
2. Sorts by priority (p1 first), then by creation date
3. Returns the single top item

### Example

```bash
$ jots next
Next: Write token expiry check [def456]
  Priority: p1 | Status: pending
  Epic: Build authentication system
  Task: Implement JWT validation
  Queue: 3 pending, 1 in progress

$ jots next --level task
Next: Implement JWT validation [abc123]
  Priority: p1 | Status: in_progress
  Epic: Build authentication system
  Queue: 2 pending, 1 in progress
```

### JSON Output

```bash
$ jots next --json
{
  "item": {
    "id": "def456",
    "type": "subtask",
    "content": "Write token expiry check",
    "priority": 1,
    "status": "pending",
    "epic": { "id": "...", "content": "Build authentication system" },
    "task": { "id": "...", "content": "Implement JWT validation" }
  },
  "queue": { "pending": 3, "in_progress": 1 }
}
```

---

## jots context

Get a full state summary. Designed for AI agents.

```bash
jots context [options]
```

### Output Sections

1. **Progress** - Completion stats for each level (completed/total)
2. **In Progress** - Items currently being worked on
3. **Blocked** - Items that cannot proceed
4. **Next** - The highest-priority actionable item

### Example

```bash
$ jots context
Progress:
  Epics: 1/3 | Tasks: 4/12 | Subtasks: 8/20

In Progress:
  ◐ Implement JWT validation [abc123] (task)
  ◐ Write API documentation [xyz789] (task)

Blocked:
  ⊘ Deploy to production [blocked1] - waiting on security review

Next:
  Write token expiry check [def456] (p1, subtask)
```

### JSON Output

```json
{
  "progress": {
    "epics": { "completed": 1, "total": 3 },
    "tasks": { "completed": 4, "total": 12 },
    "subtasks": { "completed": 8, "total": 20 }
  },
  "in_progress": [...],
  "blocked": [...],
  "next": {...}
}
```

---

## jots done

Mark an item as completed.

```bash
jots done <identifier>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `identifier` | Item ID or text to match |

### Behavior

- Accepts exact ID or fuzzy text match
- Idempotent: succeeds silently if already completed
- Errors if multiple items match (use exact ID)
- Sets `status` to `completed` and records `completed_at` timestamp

### Examples

```bash
# By exact ID
jots done abc123

# By partial ID
jots done abc

# By text match
jots done "token expiry"
```

### Error on Ambiguity

```bash
$ jots done auth
Error: Multiple items match "auth":
  - Build authentication system [abc123] (epic)
  - Add auth middleware [def456] (task)
Use exact ID to specify which item.
```

---

## jots remove

Remove an item and all its children.

```bash
jots remove <identifier>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `identifier` | Item ID or text to match |

### Behavior

- Accepts exact ID or fuzzy text match
- Removes the item and all nested children
- Removing an epic deletes all its tasks and subtasks
- Removing a task deletes all its subtasks
- Errors if multiple items match (use exact ID)

### Examples

```bash
# By exact ID
jots remove abc123

# By partial ID
jots remove abc

# By text match
jots remove "old feature"

# Remove epic with all children
jots remove "deprecated auth"
```

### Warning

This action is permanent. The item and all its children will be deleted from jots.json.

---

## jots update

Modify an existing item.

```bash
jots update <identifier> [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `identifier` | Item ID or text to match |

### Options

| Option | Description |
|--------|-------------|
| `--content, -c` | New description |
| `--priority, -p` | New priority (p1-p5) |
| `--status, -s` | New status |

### Examples

```bash
# Change priority
jots update abc123 -p p1

# Change status
jots update abc123 -s blocked

# Change content
jots update abc123 -c "Implement JWT with refresh tokens"

# Multiple changes
jots update abc123 -p p1 -s in_progress
```

---

## jots validate

Check schema validity and data consistency.

```bash
jots validate [options]
```

### What it Checks

**Schema Validation:**
- Valid JSON structure
- Required fields present
- Correct types and values

**Consistency Warnings:**
- Completed epic with incomplete tasks
- Completed task with incomplete subtasks

**Suggestions:**
- Task with all subtasks completed could be marked done
- Epic with all tasks completed could be marked done

### Example

```bash
$ jots validate
Validating jots.json...

Warnings:
  - Epic "Auth system" is completed but has 2 incomplete tasks

Suggestions:
  - Task "JWT validation" has all subtasks completed - consider marking done

Schema: Valid
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Valid schema, no warnings |
| 0 | Valid schema with warnings/suggestions |
| 1 | Invalid schema or file errors |

---

## File Discovery

All commands automatically find `jots.json` by searching up the directory tree from the current working directory. This means you can run jots from any subdirectory of your project.

```
/project/
  jots.json      <- Found
  src/
    components/  <- Running jots here still works
```
