# API Reference

Library exports for programmatic use of jots.

```typescript
import {
  // Types
  State, Epic, Task, Subtask, Status, Priority,
  // Operations
  addEpic, addTask, addSubtask, markComplete,
  // Queries
  getNext, getContext, flattenState,
  // Storage
  readState, writeState
} from 'jots'
```

---

## Types

### State

Root container for all tasks.

```typescript
type State = {
  version: 1
  epics: Epic[]
}
```

### Epic

Top-level initiative.

```typescript
type Epic = {
  id: string
  content: string
  priority: Priority      // 1-5
  status: Status
  created_at: string      // ISO 8601
  updated_at?: string
  completed_at?: string
  notes?: string[]
  tasks: Task[]
}
```

### Task

Concrete deliverable within an epic.

```typescript
type Task = {
  id: string
  content: string
  priority: Priority
  status: Status
  created_at: string
  updated_at?: string
  completed_at?: string
  notes?: string[]
  subtasks: Subtask[]
}
```

### Subtask

Single action within a task.

```typescript
type Subtask = {
  id: string
  content: string
  priority: Priority
  status: Status
  created_at: string
  updated_at?: string
  completed_at?: string
  notes?: string[]
}
```

### Status

```typescript
type Status = 'pending' | 'in_progress' | 'completed' | 'blocked'
```

### Priority

```typescript
type Priority = 1 | 2 | 3 | 4 | 5
// 1 = highest (critical)
// 5 = lowest (nice-to-have)
```

### FlatItem

Flattened representation with parent context.

```typescript
type FlatItem = {
  id: string
  type: 'epic' | 'task' | 'subtask'
  content: string
  priority: Priority
  status: Status
  created_at: string
  updated_at?: string
  completed_at?: string
  notes?: string[]
  // Parent references (for tasks/subtasks)
  epicId?: string
  epicContent?: string
  taskId?: string
  taskContent?: string
  // Progress (for epics/tasks with children)
  progress?: { completed: number; total: number }
}
```

### OperationResult

Result wrapper for operations.

```typescript
type OperationResult<T> =
  | { success: true; state: State; item: T }
  | { success: false; error: string }
```

---

## Operations

Pure functions that return new state. No I/O performed.

### addEpic

```typescript
function addEpic(args: {
  state: State
  input: { content: string; priority?: Priority; status?: Status; notes?: string[] }
}): OperationResult<Epic>
```

**Example:**

```typescript
const result = addEpic({
  state: currentState,
  input: { content: 'Build auth system', priority: 1 }
})

if (result.success) {
  console.log('Created epic:', result.item.id)
  // result.state contains updated state
}
```

### addTask

```typescript
function addTask(args: {
  state: State
  epicId: string
  input: { content: string; priority?: Priority; status?: Status; notes?: string[] }
}): OperationResult<Task>
```

**Example:**

```typescript
const result = addTask({
  state: currentState,
  epicId: 'abc123',
  input: { content: 'Implement JWT validation' }
})
```

### addSubtask

```typescript
function addSubtask(args: {
  state: State
  epicId: string
  taskId: string
  input: { content: string; priority?: Priority; status?: Status; notes?: string[] }
}): OperationResult<Subtask>
```

### updateEpic / updateTask / updateSubtask

```typescript
function updateEpic(args: {
  state: State
  epicId: string
  input: { content?: string; priority?: Priority; status?: Status; notes?: string[] }
}): OperationResult<Epic>

function updateTask(args: {
  state: State
  epicId: string
  taskId: string
  input: { content?: string; priority?: Priority; status?: Status; notes?: string[] }
}): OperationResult<Task>

function updateSubtask(args: {
  state: State
  epicId: string
  taskId: string
  subtaskId: string
  input: { content?: string; priority?: Priority; status?: Status; notes?: string[] }
}): OperationResult<Subtask>
```

### markComplete

```typescript
function markComplete(args: {
  state: State
  id: string
}): OperationResult<Epic | Task | Subtask>
```

Finds the item by ID at any level and marks it completed.

### createEmptyState

```typescript
function createEmptyState(): State
// Returns: { version: 1, epics: [] }
```

---

## Queries

Pure selectors. No I/O performed.

### flattenState

Convert hierarchical state to flat array.

```typescript
function flattenState(state: State): FlatItem[]
```

**Example:**

```typescript
const items = flattenState(state)
// Returns all epics, tasks, subtasks as flat array
// Each item includes parent context (epicId, taskId, etc.)
```

### getNext

Get highest-priority actionable item.

```typescript
function getNext(args: {
  state: State
  level?: 'epic' | 'task' | 'subtask' | 'any'
}): {
  item: FlatItem | null
  queue: { pending: number; in_progress: number }
}
```

**Example:**

```typescript
const { item, queue } = getNext({ state })
if (item) {
  console.log(`Next: ${item.content} (${queue.pending} pending)`)
}
```

### getContext

Get full state summary.

```typescript
type ContextSummary = {
  progress: {
    epics: { completed: number; total: number }
    tasks: { completed: number; total: number }
    subtasks: { completed: number; total: number }
  }
  in_progress: FlatItem[]
  blocked: FlatItem[]
  next: FlatItem | null
}

function getContext(state: State): ContextSummary
```

### filterItems

Filter items by criteria.

```typescript
function filterItems(args: {
  state: State
  type?: 'epic' | 'task' | 'subtask' | 'all'
  status?: Status[]
  priority?: Priority[]
  epicId?: string
  taskId?: string
}): FlatItem[]
```

### listEpics / listTasks / listSubtasks

```typescript
function listEpics(state: State): Epic[]
function listTasks(state: State, epicId?: string): Task[]
function listSubtasks(state: State, taskId?: string): Subtask[]
```

### findById

```typescript
function findById(state: State, id: string): FlatItem | null
```

### fuzzyFind

Search by ID or content.

```typescript
function fuzzyFind(state: State, query: string): FlatItem[]
```

Returns all items where:
- ID starts with the query, or
- Content includes the query (case-insensitive)

---

## Validation

### validateState

Validate raw data against schema.

```typescript
function validateState(raw: unknown):
  | { success: true; state: State }
  | { success: false; errors: string[] }
```

### lintState

Check for consistency issues.

```typescript
type LintResult = {
  warnings: string[]   // Problems (e.g., completed parent with incomplete children)
  suggestions: string[] // Recommendations (e.g., mark parent as complete)
}

function lintState(state: State): LintResult
```

---

## Storage

Functions that perform file I/O.

### readState

```typescript
function readState(path?: string): Promise<
  | { success: true; state: State; path: string }
  | { success: false; error: string }
>
```

If no path provided, searches up directory tree for `jots.json`.

### writeState

```typescript
function writeState(state: State, path?: string): Promise<
  | { success: true; path: string }
  | { success: false; error: string }
>
```

### initState

```typescript
function initState(path: string): Promise<
  | { success: true; path: string }
  | { success: false; error: string }
>
```

Creates a new `jots.json` with empty state.

### findJotsFile

```typescript
function findJotsFile(startDir?: string): string | null
```

Searches up directory tree for `jots.json`. Returns path or null.

---

## Utilities

### generateId

```typescript
function generateId(): string
// Returns short unique ID (e.g., "abc123")
```

### timestamp

```typescript
function timestamp(): string
// Returns ISO 8601 timestamp (e.g., "2024-01-15T10:30:00.000Z")
```

---

## Usage Example

```typescript
import {
  readState, writeState,
  addEpic, addTask, markComplete,
  getNext
} from 'jots'

async function main() {
  // Load state
  const loaded = await readState()
  if (!loaded.success) {
    console.error(loaded.error)
    return
  }

  let state = loaded.state

  // Add an epic
  const epicResult = addEpic({
    state,
    input: { content: 'Build authentication', priority: 1 }
  })

  if (!epicResult.success) {
    console.error(epicResult.error)
    return
  }

  state = epicResult.state
  const epic = epicResult.item

  // Add a task
  const taskResult = addTask({
    state,
    epicId: epic.id,
    input: { content: 'Implement login flow' }
  })

  if (taskResult.success) {
    state = taskResult.state
  }

  // Get next item
  const { item } = getNext({ state })
  console.log('Next:', item?.content)

  // Save state
  await writeState(state)
}
```
