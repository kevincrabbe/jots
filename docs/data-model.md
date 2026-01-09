# Data Model

Specification for the jots.json file format and data structures.

## Overview

Jots uses a three-level hierarchy:

```
State
└── Epic (large initiative)
    └── Task (concrete deliverable)
        └── Subtask (single action)
```

Data is stored in `jots.json` in the project root.

---

## File Format

### jots.json

```json
{
  "version": 1,
  "epics": [
    {
      "id": "abc123",
      "content": "Build user authentication system",
      "priority": 1,
      "status": "in_progress",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-16T14:30:00.000Z",
      "tasks": [
        {
          "id": "def456",
          "content": "Implement JWT token validation",
          "priority": 1,
          "status": "in_progress",
          "created_at": "2024-01-15T10:05:00.000Z",
          "subtasks": [
            {
              "id": "ghi789",
              "content": "Write token expiry check",
              "priority": 1,
              "status": "pending",
              "created_at": "2024-01-15T10:10:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Schema

### State (root)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `1` | Yes | Schema version (literal value) |
| `epics` | `Epic[]` | Yes | Array of epics (default: []) |

### Epic

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (auto-generated) |
| `content` | string | Yes | Description (min 10 chars) |
| `priority` | 1-5 | Yes | Priority level |
| `status` | Status | Yes | Current status |
| `created_at` | string | Yes | ISO 8601 timestamp |
| `updated_at` | string | No | Last modification timestamp |
| `completed_at` | string | No | Completion timestamp |
| `notes` | string[] | No | Additional annotations |
| `tasks` | Task[] | Yes | Child tasks (default: []) |

### Task

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `content` | string | Yes | Description (min 10 chars) |
| `priority` | 1-5 | Yes | Priority level |
| `status` | Status | Yes | Current status |
| `created_at` | string | Yes | ISO 8601 timestamp |
| `updated_at` | string | No | Last modification timestamp |
| `completed_at` | string | No | Completion timestamp |
| `notes` | string[] | No | Additional annotations |
| `subtasks` | Subtask[] | Yes | Child subtasks (default: []) |

### Subtask

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `content` | string | Yes | Description (min 10 chars) |
| `priority` | 1-5 | Yes | Priority level |
| `status` | Status | Yes | Current status |
| `created_at` | string | Yes | ISO 8601 timestamp |
| `updated_at` | string | No | Last modification timestamp |
| `completed_at` | string | No | Completion timestamp |
| `notes` | string[] | No | Additional annotations |

---

## Enums

### Status

| Value | Description |
|-------|-------------|
| `pending` | Not started, ready to work on |
| `in_progress` | Currently being worked on |
| `completed` | Finished successfully |
| `blocked` | Cannot proceed (waiting on something) |

### Priority

| Value | CLI | Description |
|-------|-----|-------------|
| `1` | p1 | Critical - highest priority |
| `2` | p2 | High (default for new items) |
| `3` | p3 | Medium |
| `4` | p4 | Low |
| `5` | p5 | Nice-to-have - lowest priority |

---

## ID Format

IDs are short, URL-safe strings:
- 6-8 characters
- Alphanumeric lowercase
- Generated using nanoid

Examples: `abc123`, `x7k9m2`, `def456`

---

## Timestamps

All timestamps use ISO 8601 format in UTC:

```
2024-01-15T10:30:00.000Z
```

- `created_at` - Set when item is created
- `updated_at` - Set on any modification
- `completed_at` - Set when status changes to `completed`

---

## Validation Rules

### Content

- Minimum 10 characters
- No maximum length
- Should be human-readable description

### Hierarchy Constraints

- Epics contain tasks
- Tasks contain subtasks
- Subtasks are leaf nodes (no children)

### Status Consistency

The `validate` command checks for these warnings:

| Warning | Description |
|---------|-------------|
| Completed parent with incomplete children | Epic marked complete but has pending/in_progress tasks |
| Task marked complete but has incomplete subtasks | Same for task/subtask level |

### Suggestions

| Suggestion | Description |
|------------|-------------|
| All children complete | Parent could be marked as completed |

---

## File Discovery

Jots searches for `jots.json` by walking up the directory tree from the current working directory:

```
/home/user/project/src/components/  <- Start here
/home/user/project/src/
/home/user/project/                 <- jots.json found here
/home/user/
/home/
/
```

This allows running jots from any subdirectory.

---

## Direct Editing

The file is designed to be human-readable and editable. You can:

1. Open `jots.json` in any text editor
2. Modify content, priority, status directly
3. Add/remove items manually
4. Run `jots validate` to check for errors

Tips for manual editing:

- Keep IDs unique across all items
- Use ISO 8601 for timestamps
- Priority must be 1-5 (not p1-p5)
- Status must be exact enum value
- Content minimum 10 characters

---

## Version Migration

Currently only version 1 exists. Future versions will include migration instructions.

```json
{
  "version": 1,  // Check this to determine schema version
  ...
}
```
