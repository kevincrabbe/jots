# Jots - Task Management Package

## Project Overview
Jots is an npm package for hierarchical task management (epics → tasks → subtasks) designed for both AI coding agents and humans.

## Development Workflow

- After implementing something, run `npm run lint` to check for issues
- After implementing something, run `npm run typecheck` to verify types
- Run `npm test` to ensure tests pass

## Architecture

```
src/
├── cli.ts           # CLI entry point (citty)
├── index.ts         # Library exports
├── core/
│   ├── schema.ts    # Zod types for State, Epic, Task, Subtask
│   ├── operations.ts # Pure functions: add, update, remove, markComplete
│   ├── queries.ts   # Pure selectors: getNext, getContext, filter
│   └── validation.ts # Schema validation
├── storage/
│   └── file.ts      # Read/write jots.json
└── commands/        # CLI command implementations
```

## Key Design Principles

1. **Pure core logic** - All operations and queries are pure functions (no I/O)
2. **Testable by design** - Core logic is 100% unit testable
3. **Human-readable data** - jots.json should be understandable when opened directly
4. **LLM-friendly CLI** - Commands like `next` and `context` optimize for agent use

## Data Model

Three-level hierarchy:
- **Epic** - Large initiative (e.g., "Build auth system")
- **Task** - Concrete deliverable (e.g., "Implement JWT tokens")
- **Subtask** - Single action (e.g., "Write token validation")

Priority: 1 (highest) to 5 (lowest)
Status: pending, in_progress, completed, blocked
