import { describe, it, expect } from 'vitest'
import {
  createEmptyState,
  addEpic,
  addTask,
  addSubtask,
  updateEpic,
  updateTask,
  updateSubtask,
  markComplete,
} from '../src/core/operations.js'
import type { State } from '../src/core/schema.js'

describe('createEmptyState', () => {
  it('creates state with version 1 and empty epics array', () => {
    const state = createEmptyState()
    expect(state.version).toBe(1)
    expect(state.epics).toEqual([])
  })
})

describe('addEpic', () => {
  it('adds epic to empty state', () => {
    const state = createEmptyState()
    const result = addEpic({ state, input: { content: 'Test epic content', priority: 2 } })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected success')

    expect(result.data.epic.content).toBe('Test epic content')
    expect(result.data.epic.priority).toBe(2)
    expect(result.data.epic.status).toBe('pending')
    expect(result.data.state.epics).toHaveLength(1)
  })

  it('adds multiple epics', () => {
    let state = createEmptyState()
    const r1 = addEpic({ state, input: { content: 'First epic here', priority: 1 } })
    expect(r1.success).toBe(true)
    if (!r1.success) throw new Error('Expected success')
    state = r1.data.state

    const r2 = addEpic({ state, input: { content: 'Second epic here', priority: 3 } })
    expect(r2.success).toBe(true)
    if (!r2.success) throw new Error('Expected success')

    expect(r2.data.state.epics).toHaveLength(2)
  })
})

describe('addTask', () => {
  it('adds task to existing epic', () => {
    const state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Parent epic for task', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')

    const taskResult = addTask({
      state: epicResult.data.state,
      input: { content: 'Child task content', priority: 1, epicId: epicResult.data.epic.id },
    })

    expect(taskResult.success).toBe(true)
    if (!taskResult.success) throw new Error('Expected success')

    expect(taskResult.data.task.content).toBe('Child task content')
    expect(taskResult.data.state.epics[0]?.tasks).toHaveLength(1)
  })

  it('fails when epic does not exist', () => {
    const state = createEmptyState()
    const result = addTask({
      state,
      input: { content: 'Task without parent', priority: 1, epicId: 'nonexistent' },
    })

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected failure')
    expect(result.error).toContain('Epic not found')
  })
})

describe('addSubtask', () => {
  it('adds subtask to existing task', () => {
    let state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Epic for subtask', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')
    state = epicResult.data.state

    const taskResult = addTask({
      state,
      input: { content: 'Task for subtask', priority: 2, epicId: epicResult.data.epic.id },
    })
    if (!taskResult.success) throw new Error('Expected success')
    state = taskResult.data.state

    const subtaskResult = addSubtask({
      state,
      input: {
        content: 'Subtask content here',
        priority: 1,
        epicId: epicResult.data.epic.id,
        taskId: taskResult.data.task.id,
      },
    })

    expect(subtaskResult.success).toBe(true)
    if (!subtaskResult.success) throw new Error('Expected success')
    expect(subtaskResult.data.subtask.content).toBe('Subtask content here')
  })
})

describe('updateEpic', () => {
  it('updates epic content', () => {
    const state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Original content', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')

    const updateResult = updateEpic({
      state: epicResult.data.state,
      epicId: epicResult.data.epic.id,
      input: { content: 'Updated epic content' },
    })

    expect(updateResult.success).toBe(true)
    if (!updateResult.success) throw new Error('Expected success')
    expect(updateResult.data.epics[0]?.content).toBe('Updated epic content')
  })

  it('updates epic status', () => {
    const state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Epic to update', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')

    const updateResult = updateEpic({
      state: epicResult.data.state,
      epicId: epicResult.data.epic.id,
      input: { status: 'in_progress' },
    })

    expect(updateResult.success).toBe(true)
    if (!updateResult.success) throw new Error('Expected success')
    expect(updateResult.data.epics[0]?.status).toBe('in_progress')
  })
})

describe('markComplete', () => {
  it('marks epic as completed', () => {
    const state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Epic to complete', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')

    const result = markComplete({ state: epicResult.data.state, id: epicResult.data.epic.id })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected success')
    expect(result.data.epics[0]?.status).toBe('completed')
    expect(result.data.epics[0]?.completed_at).toBeDefined()
  })

  it('cascades completion from subtask to task to epic', () => {
    let state = createEmptyState()

    const epicResult = addEpic({ state, input: { content: 'Epic for cascade', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')
    state = epicResult.data.state
    const epicId = epicResult.data.epic.id

    const taskResult = addTask({ state, input: { content: 'Task for cascade', priority: 2, epicId } })
    if (!taskResult.success) throw new Error('Expected success')
    state = taskResult.data.state
    const taskId = taskResult.data.task.id

    const subtaskResult = addSubtask({
      state,
      input: { content: 'Subtask for cascade', priority: 2, epicId, taskId },
    })
    if (!subtaskResult.success) throw new Error('Expected success')
    state = subtaskResult.data.state
    const subtaskId = subtaskResult.data.subtask.id

    const completeResult = markComplete({ state, id: subtaskId })
    if (!completeResult.success) throw new Error('Expected success')

    // Subtask should be completed
    const task = completeResult.data.epics[0]?.tasks[0]
    expect(task?.subtasks[0]?.status).toBe('completed')
    // Task should also be completed (all subtasks done)
    expect(task?.status).toBe('completed')
    // Epic should also be completed (all tasks done)
    expect(completeResult.data.epics[0]?.status).toBe('completed')
  })
})
