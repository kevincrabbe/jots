# Unit Testing Guidelines

## Mental Model

**inputs → output**

Functions are the purest form of unit testing. Given inputs, assert the output.

## When to Write Tests

- Cyclomatic complexity > 2
- Functions with branching logic
- Data transformations
- Validation logic
- Business rules

## What to Mock

### Always mock (externalities):
- Network/API calls
- Time (`Date.now`, timers)
- Randomness (`Math.random`)
- File system operations
- Environment variables

### Never mock:
- Pure helper functions in the same module
- Standard library functions
- The function's own internal logic

## Test Structure

```typescript
describe('calculateDiscount', () => {
  it('returns 0 for orders under minimum threshold', () => {
    const result = calculateDiscount({ orderTotal: 10, minThreshold: 50 })
    expect(result).toBe(0)
  })

  it('applies percentage discount for qualifying orders', () => {
    const result = calculateDiscount({ orderTotal: 100, minThreshold: 50, discountPercent: 10 })
    expect(result).toBe(10)
  })

  it('caps discount at maximum allowed', () => {
    const result = calculateDiscount({ orderTotal: 1000, discountPercent: 50, maxDiscount: 100 })
    expect(result).toBe(100)
  })
})
```

## Best Practices

1. **Test the contract, not implementation** - assert what the function returns, not how it computes it
2. **One assertion per behavior** - each test should verify one specific behavior
3. **Use descriptive test names** - "it applies percentage discount for qualifying orders" not "it works"
4. **Cover edge cases** - empty inputs, boundary values, error conditions
5. **Keep tests deterministic** - mock anything that could vary between runs
