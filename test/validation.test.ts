import { describe, it, expect } from 'vitest'
import { validateState, lintState } from '../src/core/validation.js'
import { createEmptyState, addEpic, addTask, addSubtask, updateEpic, updateTask } from '../src/core/operations.js'

describe('validateState', () => {
  it('validates empty state', () => {
    const result = validateState({ version: 1, epics: [] })
    expect(result.valid).toBe(true)
  })

  it('rejects invalid version', () => {
    const result = validateState({ version: 2, epics: [] })
    expect(result.valid).toBe(false)
  })

  it('rejects missing version', () => {
    const result = validateState({ epics: [] })
    expect(result.valid).toBe(false)
  })

  it('validates state with epics', () => {
    const state = createEmptyState()
    const r = addEpic({ state, input: { content: 'Valid epic content', priority: 2 } })
    if (!r.success) throw new Error('Setup failed')

    const result = validateState(r.data.state)
    expect(result.valid).toBe(true)
  })

  it('rejects epic with short content', () => {
    const result = validateState({
      version: 1,
      epics: [
        {
          id: 'test',
          content: 'Short', // Less than 10 chars
          priority: 2,
          status: 'pending',
          created_at: new Date().toISOString(),
          tasks: [],
        },
      ],
    })
    expect(result.valid).toBe(false)
  })
})

describe('lintState', () => {
  it('returns empty warnings for empty state', () => {
    const state = createEmptyState()
    const result = lintState(state)

    expect(result.warnings).toHaveLength(0)
    expect(result.suggestions).toHaveLength(0)
  })

  it('warns when completed epic has incomplete tasks', () => {
    let state = createEmptyState()

    const e = addEpic({ state, input: { content: 'Epic to complete', priority: 2 } })
    if (!e.success) throw new Error('Setup failed')
    state = e.data.state

    const t = addTask({ state, input: { content: 'Task incomplete', priority: 2, epicId: e.data.epic.id } })
    if (!t.success) throw new Error('Setup failed')
    state = t.data.state

    // Mark epic complete without completing task
    const u = updateEpic({ state, epicId: e.data.epic.id, input: { status: 'completed' } })
    if (!u.success) throw new Error('Setup failed')

    const result = lintState(u.data)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('incomplete task')
  })

  it('suggests completing task when all subtasks are done', () => {
    let state = createEmptyState()

    const e = addEpic({ state, input: { content: 'Epic for suggestion', priority: 2 } })
    if (!e.success) throw new Error('Setup failed')
    state = e.data.state

    const t = addTask({ state, input: { content: 'Task for suggestion', priority: 2, epicId: e.data.epic.id } })
    if (!t.success) throw new Error('Setup failed')
    state = t.data.state

    const s = addSubtask({
      state,
      input: { content: 'Subtask complete', priority: 2, epicId: e.data.epic.id, taskId: t.data.task.id },
    })
    if (!s.success) throw new Error('Setup failed')
    state = s.data.state

    // Complete subtask but not task
    const ut = updateTask({
      state,
      epicId: e.data.epic.id,
      taskId: t.data.task.id,
      input: { status: 'pending' }, // Keep task pending
    })
    if (!ut.success) throw new Error('Setup failed')

    // Now complete subtask
    const us = updateTask({
      state: ut.data,
      epicId: e.data.epic.id,
      taskId: t.data.task.id,
      input: { status: 'pending' },
    })
    if (!us.success) throw new Error('Setup failed')

    // Directly update state to have completed subtask but pending task
    const manualState = {
      ...state,
      epics: state.epics.map((epic) => ({
        ...epic,
        tasks: epic.tasks.map((task) => ({
          ...task,
          subtasks: task.subtasks.map((sub) => ({ ...sub, status: 'completed' as const })),
        })),
      })),
    }

    const result = lintState(manualState)
    expect(result.suggestions.some((s) => s.includes('all subtasks complete'))).toBe(true)
  })
})
