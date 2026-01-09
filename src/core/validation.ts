import { StateSchema } from './schema.js'
import type { State, Epic, Task } from './schema.js'

export type ValidationResult =
  | { valid: true; state: State }
  | { valid: false; errors: string[] }

/**
 * Validate raw JSON against the State schema
 */
export function validateState(raw: unknown): ValidationResult {
  const result = StateSchema.safeParse(raw)

  if (result.success) {
    return { valid: true, state: result.data }
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)'
    return `${path}: ${issue.message}`
  })

  return { valid: false, errors }
}

/**
 * Check for common issues in the state that aren't schema violations
 */
export type LintResult = {
  warnings: string[]
  suggestions: string[]
}

function checkEpicCompletion(epic: Epic): string | null {
  if (epic.status !== 'completed') return null
  const incompleteTasks = epic.tasks.filter((t) => t.status !== 'completed')
  if (incompleteTasks.length === 0) return null
  return `Epic "${epic.content.slice(0, 30)}..." is completed but has ${incompleteTasks.length} incomplete task(s)`
}

function checkTaskCompletion(task: Task): string | null {
  if (task.status !== 'completed') return null
  const incompleteSubtasks = task.subtasks.filter((s) => s.status !== 'completed')
  if (incompleteSubtasks.length === 0) return null
  return `Task "${task.content.slice(0, 30)}..." is completed but has ${incompleteSubtasks.length} incomplete subtask(s)`
}

function suggestTaskCompletion(task: Task): string | null {
  if (task.status === 'completed' || task.subtasks.length === 0) return null
  const allComplete = task.subtasks.every((s) => s.status === 'completed')
  if (!allComplete) return null
  return `Task "${task.content.slice(0, 30)}..." has all subtasks complete - consider marking it complete`
}

function suggestEpicCompletion(epic: Epic): string | null {
  if (epic.status === 'completed' || epic.tasks.length === 0) return null
  const allComplete = epic.tasks.every((t) => t.status === 'completed')
  if (!allComplete) return null
  return `Epic "${epic.content.slice(0, 30)}..." has all tasks complete - consider marking it complete`
}

// Dependency validation helpers

function checkEpicDeps(epic: Epic, allEpicIds: Set<string>): string[] {
  const warnings: string[] = []
  if (!epic.deps) return warnings

  for (const depId of epic.deps) {
    if (depId === epic.id) {
      warnings.push(`Epic "${epic.content.slice(0, 20)}..." depends on itself`)
    } else if (!allEpicIds.has(depId)) {
      warnings.push(`Epic "${epic.content.slice(0, 20)}..." has invalid dep: ${depId}`)
    }
  }
  return warnings
}

function checkTaskDeps(task: Task, epicTaskIds: Set<string>, epicContent: string): string[] {
  const warnings: string[] = []
  if (!task.deps) return warnings

  for (const depId of task.deps) {
    if (depId === task.id) {
      warnings.push(`Task "${task.content.slice(0, 20)}..." depends on itself`)
    } else if (!epicTaskIds.has(depId)) {
      warnings.push(`Task "${task.content.slice(0, 20)}..." in "${epicContent.slice(0, 15)}..." has invalid dep: ${depId}`)
    }
  }
  return warnings
}

function checkSubtaskDeps(subtask: Task['subtasks'][0], taskSubtaskIds: Set<string>, taskContent: string): string[] {
  const warnings: string[] = []
  if (!subtask.deps) return warnings

  for (const depId of subtask.deps) {
    if (depId === subtask.id) {
      warnings.push(`Subtask "${subtask.content.slice(0, 20)}..." depends on itself`)
    } else if (!taskSubtaskIds.has(depId)) {
      warnings.push(`Subtask "${subtask.content.slice(0, 20)}..." in "${taskContent.slice(0, 15)}..." has invalid dep: ${depId}`)
    }
  }
  return warnings
}

function detectCycle(id: string, deps: string[], depsMap: Map<string, string[]>, visited: Set<string>): boolean {
  if (visited.has(id)) return true
  visited.add(id)
  for (const depId of deps) {
    const depDeps = depsMap.get(depId) ?? []
    if (detectCycle(depId, depDeps, depsMap, visited)) return true
  }
  visited.delete(id)
  return false
}

function checkCycles(items: Array<{ id: string; deps?: string[] | undefined; content: string }>, typeLabel: string): string[] {
  const warnings: string[] = []
  const depsMap = new Map<string, string[]>()
  for (const item of items) depsMap.set(item.id, item.deps ?? [])

  for (const item of items) {
    if (!item.deps || item.deps.length === 0) continue
    if (detectCycle(item.id, item.deps, depsMap, new Set())) {
      warnings.push(`${typeLabel} "${item.content.slice(0, 20)}..." has circular dependency`)
    }
  }
  return warnings
}

function lintEpic(epic: Epic): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = []
  const suggestions: string[] = []

  const epicWarning = checkEpicCompletion(epic)
  if (epicWarning) warnings.push(epicWarning)

  const taskIds = new Set(epic.tasks.map((t) => t.id))
  for (const task of epic.tasks) {
    const taskWarning = checkTaskCompletion(task)
    if (taskWarning) warnings.push(taskWarning)

    warnings.push(...checkTaskDeps(task, taskIds, epic.content))

    const subtaskIds = new Set(task.subtasks.map((s) => s.id))
    for (const subtask of task.subtasks) {
      warnings.push(...checkSubtaskDeps(subtask, subtaskIds, task.content))
    }
    warnings.push(...checkCycles(task.subtasks, 'Subtask'))

    const taskSuggestion = suggestTaskCompletion(task)
    if (taskSuggestion) suggestions.push(taskSuggestion)
  }
  warnings.push(...checkCycles(epic.tasks, 'Task'))

  const epicSuggestion = suggestEpicCompletion(epic)
  if (epicSuggestion) suggestions.push(epicSuggestion)

  return { warnings, suggestions }
}

export function lintState(state: State): LintResult {
  const warnings: string[] = []
  const suggestions: string[] = []

  const epicIds = new Set(state.epics.map((e) => e.id))
  for (const epic of state.epics) {
    warnings.push(...checkEpicDeps(epic, epicIds))
    const result = lintEpic(epic)
    warnings.push(...result.warnings)
    suggestions.push(...result.suggestions)
  }
  warnings.push(...checkCycles(state.epics, 'Epic'))

  return { warnings, suggestions }
}
