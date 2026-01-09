# General Coding Guidelines

## Priority Order
In order of importance:
1. Correctness and functionality
2. Readability & Maintainability
3. Performance

Focus 80% on readability and 20% on performance.

## Comments
Add comments only when they explain WHY, not WHAT.
The code itself should be readable enough to show WHAT it does.

DO NOT comment obvious operations like:
```typescript
// increment counter
counter++;
```

DO comment:
- Business logic reasoning
- Non-obvious decisions
- Workarounds or edge cases
- Complex algorithms (brief summary of approach)

Example of a good comment:
```typescript
// Using ceil() here because partial units must be charged as full units per billing policy
const billableUnits = Math.ceil(usage / unitSize);
```
