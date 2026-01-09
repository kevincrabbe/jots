# jots

Hierarchical task management for AI coding agents and humans.

```
Epic → Task → Subtask
```

Jots provides a simple CLI and library for managing work in a three-level hierarchy. Designed with AI agents in mind—commands like `next` and `context` give agents exactly what they need to stay on track.

## Installation

```bash
npm install -g jots
```

## Quick Start

```bash
# Initialize in your project
jots init

# Add an epic (large initiative)
jots add epic "Build user authentication system" -p p1

# Add a task to the epic
jots add task "Implement JWT token validation" -e auth

# Add a subtask
jots add subtask "Write token expiry check" -e auth -t jwt

# Get the next thing to work on
jots next

# Mark it done when complete
jots done <id>
```

## Commands

| Command | Description |
|---------|-------------|
| `jots init` | Initialize jots.json in current directory |
| `jots add <type> <content>` | Add epic, task, or subtask |
| `jots list [type]` | List items (epics, tasks, subtasks, all) |
| `jots next` | Get highest-priority actionable item |
| `jots context` | Get full state summary (for AI agents) |
| `jots done <id>` | Mark item as completed |
| `jots remove <id>` | Remove item (and its children) |
| `jots update <id>` | Modify content, priority, or status |
| `jots validate` | Check for schema and consistency issues |

All commands support `--json` for programmatic use.

## For AI Agents

Jots is designed for AI coding assistants. Two commands are particularly useful:

**`jots next`** - Returns the single highest-priority item ready to work on:
```bash
$ jots next
Next: Write token expiry check [abc123]
  Priority: p1 | Status: pending
  Epic: Build user authentication system
  Task: Implement JWT token validation
  Queue: 3 pending, 1 in progress
```

**`jots context`** - Returns a structured summary of all work:
```bash
$ jots context --json
{
  "progress": { "epics": "1/3", "tasks": "4/12", "subtasks": "8/20" },
  "in_progress": [...],
  "blocked": [...],
  "next": {...}
}
```

## Data Storage

Tasks are stored in `jots.json`—a human-readable file you can edit directly or commit to version control.

## Documentation

- [CLI Reference](docs/cli.md) - Full command documentation
- [API Reference](docs/api.md) - Library exports for programmatic use
- [Data Model](docs/data-model.md) - Schema specification
- [AI Integration](docs/integration.md) - Claude Code hooks and agent workflows
- [Workflows](docs/workflows.md) - Best practices and patterns

## License

MIT
