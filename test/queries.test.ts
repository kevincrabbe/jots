import { describe, it, expect } from 'vitest'
import { createEmptyState, addEpic, addTask, addSubtask, markComplete, updateEpic } from '../src/core/operations.js'
import {
  flattenState,
  getNext,
  getContext,
  filterItems,
  listEpics,
  listTasks,
  listSubtasks,
  findById,
  fuzzyFind,
} from '../src/core/queries.js'

function createTestState() {
  let state = createEmptyState()

  const e1 = addEpic({ state, input: { content: 'First test epic', priority: 2 } })
  if (!e1.success) throw new Error('Setup failed')
  state = e1.data.state

  const t1 = addTask({ state, input: { content: 'First task here', priority: 1, epicId: e1.data.epic.id } })
  if (!t1.success) throw new Error('Setup failed')
  state = t1.data.state

  const s1 = addSubtask({
    state,
    input: { content: 'First subtask content', priority: 2, epicId: e1.data.epic.id, taskId: t1.data.task.id },
  })
  if (!s1.success) throw new Error('Setup failed')
  state = s1.data.state

  const e2 = addEpic({ state, input: { content: 'Second test epic', priority: 1 } })
  if (!e2.success) throw new Error('Setup failed')
  state = e2.data.state

  return { state, epicId1: e1.data.epic.id, epicId2: e2.data.epic.id, taskId: t1.data.task.id, subtaskId: s1.data.subtask.id }
}

describe('flattenState', () => {
  it('flattens empty state to empty array', () => {
    const state = createEmptyState()
    expect(flattenState(state)).toEqual([])
  })

  it('flattens state with epics, tasks, and subtasks', () => {
    const { state } = createTestState()
    const flat = flattenState(state)

    expect(flat).toHaveLength(4) // 2 epics + 1 task + 1 subtask
    expect(flat.filter((i) => i.type === 'epic')).toHaveLength(2)
    expect(flat.filter((i) => i.type === 'task')).toHaveLength(1)
    expect(flat.filter((i) => i.type === 'subtask')).toHaveLength(1)
  })

  it('includes depth information', () => {
    const { state } = createTestState()
    const flat = flattenState(state)

    expect(flat.find((i) => i.type === 'epic')?.depth).toBe(0)
    expect(flat.find((i) => i.type === 'task')?.depth).toBe(1)
    expect(flat.find((i) => i.type === 'subtask')?.depth).toBe(2)
  })
})

describe('getNext', () => {
  it('returns null for empty state', () => {
    const state = createEmptyState()
    const result = getNext({ state })

    expect(result.item).toBeNull()
    expect(result.queueDepth).toBe(0)
  })

  it('returns highest priority item', () => {
    const { state, epicId2 } = createTestState()
    const result = getNext({ state })

    // Epic 2 has priority 1 but no children
    // Task has priority 1 and is deeper
    // By default (any level), deepest + highest priority wins
    expect(result.item).not.toBeNull()
    expect(result.item?.priority).toBe(1)
  })

  it('filters by level', () => {
    const { state } = createTestState()
    const epicResult = getNext({ state, level: 'epic' })
    const taskResult = getNext({ state, level: 'task' })

    expect(epicResult.item?.type).toBe('epic')
    expect(taskResult.item?.type).toBe('task')
  })

  it('skips items with incomplete deps', () => {
    let state = createEmptyState()

    const e1 = addEpic({ state, input: { content: 'First epic content', priority: 1 } })
    if (!e1.success) throw new Error('Setup failed')
    state = e1.data.state

    const e2 = addEpic({ state, input: { content: 'Second epic content', priority: 1, deps: [e1.data.epic.id] } })
    if (!e2.success) throw new Error('Setup failed')
    state = e2.data.state

    // e2 depends on e1, so getNext should return e1 first
    const result = getNext({ state, level: 'epic' })
    expect(result.item?.id).toBe(e1.data.epic.id)
    expect(result.blockedByDeps).toBe(1)
  })

  it('returns item with deps when deps are completed', () => {
    let state = createEmptyState()

    const e1 = addEpic({ state, input: { content: 'First epic content', priority: 2 } })
    if (!e1.success) throw new Error('Setup failed')
    state = e1.data.state

    const e2 = addEpic({ state, input: { content: 'Second epic content', priority: 1, deps: [e1.data.epic.id] } })
    if (!e2.success) throw new Error('Setup failed')
    state = e2.data.state

    // Mark e1 as completed
    const completeResult = markComplete({ state, id: e1.data.epic.id })
    if (!completeResult.success) throw new Error('Setup failed')
    state = completeResult.data

    // Now e2 should be returned (higher priority after e1 is done)
    const result = getNext({ state, level: 'epic' })
    expect(result.item?.id).toBe(e2.data.epic.id)
    expect(result.blockedByDeps).toBe(0)
  })

  it('reports blockedByDeps count correctly', () => {
    let state = createEmptyState()

    const e1 = addEpic({ state, input: { content: 'First epic content', priority: 2 } })
    if (!e1.success) throw new Error('Setup failed')
    state = e1.data.state

    // Add 3 epics that depend on e1
    for (let i = 0; i < 3; i++) {
      const e = addEpic({
        state,
        input: { content: `Dependent epic ${i}`, priority: 1, deps: [e1.data.epic.id] },
      })
      if (!e.success) throw new Error('Setup failed')
      state = e.data.state
    }

    const result = getNext({ state, level: 'epic' })
    expect(result.item?.id).toBe(e1.data.epic.id)
    expect(result.blockedByDeps).toBe(3)
    expect(result.queueDepth).toBe(1)
  })
})

describe('getContext', () => {
  it('returns summary for empty state', () => {
    const state = createEmptyState()
    const ctx = getContext(state)

    expect(ctx.totalEpics).toBe(0)
    expect(ctx.totalTasks).toBe(0)
    expect(ctx.totalSubtasks).toBe(0)
    expect(ctx.nextItem).toBeNull()
  })

  it('counts items correctly', () => {
    const { state } = createTestState()
    const ctx = getContext(state)

    expect(ctx.totalEpics).toBe(2)
    expect(ctx.totalTasks).toBe(1)
    expect(ctx.totalSubtasks).toBe(1)
    expect(ctx.completedEpics).toBe(0)
  })
})

describe('filterItems', () => {
  it('filters by status', () => {
    const { state, epicId1 } = createTestState()

    // Mark one item as completed
    const completeResult = markComplete({ state, id: epicId1 })
    if (!completeResult.success) throw new Error('Failed to complete')

    const pending = filterItems({ state: completeResult.data, status: 'pending' })
    const completed = filterItems({ state: completeResult.data, status: 'completed' })

    expect(completed.length).toBeGreaterThan(0)
    expect(pending.every((i) => i.status === 'pending')).toBe(true)
    expect(completed.every((i) => i.status === 'completed')).toBe(true)
  })

  it('filters by priority', () => {
    const { state } = createTestState()
    const p1Items = filterItems({ state, priority: 1 })

    expect(p1Items.every((i) => i.priority === 1)).toBe(true)
    expect(p1Items.length).toBeGreaterThan(0)
  })

  it('filters by type', () => {
    const { state } = createTestState()
    const epics = filterItems({ state, type: 'epic' })
    const tasks = filterItems({ state, type: 'task' })

    expect(epics.every((i) => i.type === 'epic')).toBe(true)
    expect(tasks.every((i) => i.type === 'task')).toBe(true)
  })

  it('filters by search', () => {
    const { state } = createTestState()
    const results = filterItems({ state, search: 'First' })

    expect(results.every((i) => i.content.toLowerCase().includes('first'))).toBe(true)
  })
})

describe('listEpics', () => {
  it('lists all epics', () => {
    const { state } = createTestState()
    const epics = listEpics(state)

    expect(epics).toHaveLength(2)
    expect(epics.every((e) => e.type === 'epic')).toBe(true)
  })
})

describe('listTasks', () => {
  it('lists all tasks', () => {
    const { state } = createTestState()
    const tasks = listTasks(state)

    expect(tasks).toHaveLength(1)
    expect(tasks.every((t) => t.type === 'task')).toBe(true)
  })

  it('filters by epicId', () => {
    const { state, epicId1 } = createTestState()
    const tasks = listTasks(state, epicId1)

    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.epicId).toBe(epicId1)
  })
})

describe('findById', () => {
  it('finds epic by id', () => {
    const { state, epicId1 } = createTestState()
    const result = findById(state, epicId1)

    expect(result.item).not.toBeNull()
    expect(result.item?.id).toBe(epicId1)
  })

  it('returns null for nonexistent id', () => {
    const { state } = createTestState()
    const result = findById(state, 'nonexistent')

    expect(result.item).toBeNull()
  })
})

describe('fuzzyFind', () => {
  it('finds by exact id', () => {
    const { state, epicId1 } = createTestState()
    const results = fuzzyFind(state, epicId1)

    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe(epicId1)
  })

  it('finds by content match', () => {
    const { state } = createTestState()
    const results = fuzzyFind(state, 'First')

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.content.toLowerCase().includes('first'))).toBe(true)
  })
})
