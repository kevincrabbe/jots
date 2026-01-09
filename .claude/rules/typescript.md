# TypeScript Guidelines

## Types

### Avoid using 'any'
Always use proper types. If you must use a flexible type, prefer `unknown` with type guards.

### Do not define inline object types
Do not define object/record types inline in parameter lists or return types. Create a named type/interface and use that name in the signature.

```typescript
// Bad
async execute(args: { sessionId: string; voiceId: string }): Promise<{ result: string }> { … }

// Good
export type ExecuteArgs = {
  sessionId: string
  voiceId: string
}

export type ExecuteResult = {
  result: string
}

export async function execute(args: ExecuteArgs): Promise<ExecuteResult> {
  …
}
```

### Use 'is' and 'has' prefixes for booleans
```typescript
// Good
const isCompleted = true
const hasChildren = items.length > 0

// Bad
const completed = true
const children = items.length > 0
```

## Functions

### Use the RORO pattern
Receive an Object, Return an Object. This makes functions easier to extend and test.

```typescript
// Good
function createTask(args: CreateTaskArgs): CreateTaskResult {
  return { id: generateId(), ...args }
}

// Bad
function createTask(content: string, priority: number): string {
  return generateId()
}
```

## Complexity

### Keep cyclomatic complexity below 6
If you have a large switch case, consider strategy pattern/dispatch table.

### Do not chain more than 2 array iteration methods
Store as variable and continue on next line if more processing is needed.

```typescript
// Bad
const result = items.filter(x => x.active).map(x => x.name).filter(n => n.length > 0).sort()

// Good
const activeItems = items.filter(x => x.active)
const names = activeItems.map(x => x.name).filter(n => n.length > 0)
const result = names.sort()
```

### Do not nest blocks more than 3 levels deep
Use early returns and extract functions to flatten nesting.
