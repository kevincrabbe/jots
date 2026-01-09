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
  removeItem,
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

describe('deps in operations', () => {
  it('adds epic with deps', () => {
    let state = createEmptyState()
    const e1 = addEpic({ state, input: { content: 'First epic content', priority: 2 } })
    if (!e1.success) throw new Error('Expected success')
    state = e1.data.state

    const e2 = addEpic({ state, input: { content: 'Second epic content', priority: 2, deps: [e1.data.epic.id] } })
    expect(e2.success).toBe(true)
    if (!e2.success) throw new Error('Expected success')

    expect(e2.data.epic.deps).toEqual([e1.data.epic.id])
  })

  it('adds task with deps within same epic', () => {
    let state = createEmptyState()
    const e = addEpic({ state, input: { content: 'Epic for tasks', priority: 2 } })
    if (!e.success) throw new Error('Expected success')
    state = e.data.state

    const t1 = addTask({ state, input: { content: 'First task content', priority: 2, epicId: e.data.epic.id } })
    if (!t1.success) throw new Error('Expected success')
    state = t1.data.state

    const t2 = addTask({
      state,
      input: { content: 'Second task content', priority: 2, epicId: e.data.epic.id, deps: [t1.data.task.id] },
    })
    expect(t2.success).toBe(true)
    if (!t2.success) throw new Error('Expected success')

    expect(t2.data.task.deps).toEqual([t1.data.task.id])
  })

  it('adds subtask with deps within same task', () => {
    let state = createEmptyState()
    const e = addEpic({ state, input: { content: 'Epic for subtasks', priority: 2 } })
    if (!e.success) throw new Error('Expected success')
    state = e.data.state
    const epicId = e.data.epic.id

    const t = addTask({ state, input: { content: 'Task for subtasks', priority: 2, epicId } })
    if (!t.success) throw new Error('Expected success')
    state = t.data.state
    const taskId = t.data.task.id

    const s1 = addSubtask({ state, input: { content: 'First subtask here', priority: 2, epicId, taskId } })
    if (!s1.success) throw new Error('Expected success')
    state = s1.data.state

    const s2 = addSubtask({
      state,
      input: { content: 'Second subtask here', priority: 2, epicId, taskId, deps: [s1.data.subtask.id] },
    })
    expect(s2.success).toBe(true)
    if (!s2.success) throw new Error('Expected success')

    expect(s2.data.subtask.deps).toEqual([s1.data.subtask.id])
  })

  it('updates epic deps', () => {
    let state = createEmptyState()
    const e1 = addEpic({ state, input: { content: 'First epic here', priority: 2 } })
    if (!e1.success) throw new Error('Expected success')
    state = e1.data.state

    const e2 = addEpic({ state, input: { content: 'Second epic here', priority: 2 } })
    if (!e2.success) throw new Error('Expected success')
    state = e2.data.state

    const updateResult = updateEpic({ state, epicId: e2.data.epic.id, input: { deps: [e1.data.epic.id] } })
    expect(updateResult.success).toBe(true)
    if (!updateResult.success) throw new Error('Expected success')

    expect(updateResult.data.epics[1]?.deps).toEqual([e1.data.epic.id])
  })
})

describe('removeItem', () => {
  it('removes an epic', () => {
    const state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Epic to remove', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')

    const result = removeItem({ state: epicResult.data.state, id: epicResult.data.epic.id })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected success')
    expect(result.data.epics).toHaveLength(0)
  })

  it('removes a task and keeps epic', () => {
    let state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Epic with task', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')
    state = epicResult.data.state

    const taskResult = addTask({
      state,
      input: { content: 'Task to remove', priority: 2, epicId: epicResult.data.epic.id },
    })
    if (!taskResult.success) throw new Error('Expected success')
    state = taskResult.data.state

    const result = removeItem({ state, id: taskResult.data.task.id })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected success')
    expect(result.data.epics).toHaveLength(1)
    expect(result.data.epics[0]?.tasks).toHaveLength(0)
  })

  it('removes a subtask and keeps task', () => {
    let state = createEmptyState()
    const epicResult = addEpic({ state, input: { content: 'Epic hierarchy', priority: 2 } })
    if (!epicResult.success) throw new Error('Expected success')
    state = epicResult.data.state
    const epicId = epicResult.data.epic.id

    const taskResult = addTask({ state, input: { content: 'Task with sub', priority: 2, epicId } })
    if (!taskResult.success) throw new Error('Expected success')
    state = taskResult.data.state
    const taskId = taskResult.data.task.id

    const subtaskResult = addSubtask({
      state,
      input: { content: 'Subtask to remove', priority: 2, epicId, taskId },
    })
    if (!subtaskResult.success) throw new Error('Expected success')
    state = subtaskResult.data.state

    const result = removeItem({ state, id: subtaskResult.data.subtask.id })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected success')
    expect(result.data.epics[0]?.tasks[0]?.subtasks).toHaveLength(0)
  })

  it('fails for nonexistent id', () => {
    const state = createEmptyState()
    const result = removeItem({ state, id: 'nonexistent' })

    expect(result.success).toBe(false)
    if (result.success) throw new Error('Expected failure')
    expect(result.error).toContain('Item not found')
  })
})
