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

function lintEpic(epic: Epic): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = []
  const suggestions: string[] = []

  const epicWarning = checkEpicCompletion(epic)
  if (epicWarning) warnings.push(epicWarning)

  for (const task of epic.tasks) {
    const taskWarning = checkTaskCompletion(task)
    if (taskWarning) warnings.push(taskWarning)

    const taskSuggestion = suggestTaskCompletion(task)
    if (taskSuggestion) suggestions.push(taskSuggestion)
  }

  const epicSuggestion = suggestEpicCompletion(epic)
  if (epicSuggestion) suggestions.push(epicSuggestion)

  return { warnings, suggestions }
}

export function lintState(state: State): LintResult {
  const warnings: string[] = []
  const suggestions: string[] = []

  for (const epic of state.epics) {
    const result = lintEpic(epic)
    warnings.push(...result.warnings)
    suggestions.push(...result.suggestions)
  }

  return { warnings, suggestions }
}
