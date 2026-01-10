import type {
  State,
  Epic,
  Task,
  Subtask,
  Priority,
  CreateEpicInput,
  CreateTaskInput,
  CreateSubtaskInput,
  UpdateItemInput,
  OperationResult,
} from './schema.js'
import { generateId, timestamp } from './id.js'

// ============================================================================
// Helper: Find items by index
// ============================================================================

type EpicLookup = { epic: Epic; index: number }
type TaskLookup = { epic: Epic; epicIndex: number; task: Task; taskIndex: number }
type SubtaskLookup = TaskLookup & { subtask: Subtask; subtaskIndex: number }

function findEpic(state: State, epicId: string): EpicLookup | null {
  const index = state.epics.findIndex((e) => e.id === epicId)
  const epic = state.epics[index]
  return epic ? { epic, index } : null
}

function findTask(state: State, epicId: string, taskId: string): TaskLookup | null {
  const epicLookup = findEpic(state, epicId)
  if (!epicLookup) return null

  const taskIndex = epicLookup.epic.tasks.findIndex((t) => t.id === taskId)
  const task = epicLookup.epic.tasks[taskIndex]
  return task ? { ...epicLookup, epicIndex: epicLookup.index, task, taskIndex } : null
}

function findSubtask(
  state: State,
  epicId: string,
  taskId: string,
  subtaskId: string
): SubtaskLookup | null {
  const taskLookup = findTask(state, epicId, taskId)
  if (!taskLookup) return null

  const subtaskIndex = taskLookup.task.subtasks.findIndex((s) => s.id === subtaskId)
  const subtask = taskLookup.task.subtasks[subtaskIndex]
  return subtask ? { ...taskLookup, subtask, subtaskIndex } : null
}

// ============================================================================
// Helper: Find standalone (top-level) tasks
// ============================================================================

type StandaloneTaskLookup = { task: Task; index: number }

function findStandaloneTask(state: State, taskId: string): StandaloneTaskLookup | null {
  const tasks = state.tasks ?? []
  const index = tasks.findIndex((t) => t.id === taskId)
  const task = tasks[index]
  return task ? { task, index } : null
}

function updateStandaloneTaskInState(state: State, index: number, task: Task): State {
  const newTasks = [...(state.tasks ?? [])]
  newTasks[index] = task
  return { ...state, tasks: newTasks }
}

// ============================================================================
// Helper: Update state immutably
// ============================================================================

function updateEpicInState(state: State, index: number, epic: Epic): State {
  const newEpics = [...state.epics]
  newEpics[index] = epic
  return { ...state, epics: newEpics }
}

function updateTaskInEpic(epic: Epic, taskIndex: number, task: Task, now: string): Epic {
  const updatedTasks = [...epic.tasks]
  updatedTasks[taskIndex] = task
  return { ...epic, tasks: updatedTasks, updated_at: now }
}

function updateSubtaskInTask(task: Task, subtaskIndex: number, subtask: Subtask, now: string): Task {
  const updatedSubtasks = [...task.subtasks]
  updatedSubtasks[subtaskIndex] = subtask
  return { ...task, subtasks: updatedSubtasks, updated_at: now }
}

// ============================================================================
// Add Operations
// ============================================================================

export type AddEpicArgs = { state: State; input: CreateEpicInput }
export type AddEpicResult = { state: State; epic: Epic }

export function addEpic(args: AddEpicArgs): OperationResult<AddEpicResult> {
  const { state, input } = args
  const now = timestamp()

  const epic: Epic = {
    id: generateId(),
    content: input.content,
    priority: input.priority,
    status: 'pending',
    created_at: now,
    notes: input.notes,
    deps: input.deps,
    tasks: [],
  }

  const newState: State = { ...state, epics: [...state.epics, epic] }
  return { success: true, data: { state: newState, epic } }
}

export type AddTaskArgs = { state: State; input: CreateTaskInput }
export type AddTaskResult = { state: State; task: Task }

export function addTask(args: AddTaskArgs): OperationResult<AddTaskResult> {
  const { state, input } = args

  const now = timestamp()
  const task: Task = {
    id: generateId(),
    content: input.content,
    priority: input.priority,
    status: 'pending',
    created_at: now,
    notes: input.notes,
    deps: input.deps,
    subtasks: [],
  }

  // If no epicId, add as standalone task
  if (!input.epicId) {
    const newTasks = [...(state.tasks ?? []), task]
    const newState: State = { ...state, tasks: newTasks }
    return { success: true, data: { state: newState, task } }
  }

  // Otherwise, add to epic
  const lookup = findEpic(state, input.epicId)
  if (!lookup) return { success: false, error: `Epic not found: ${input.epicId}` }

  const updatedEpic: Epic = { ...lookup.epic, tasks: [...lookup.epic.tasks, task], updated_at: now }
  const newState = updateEpicInState(state, lookup.index, updatedEpic)
  return { success: true, data: { state: newState, task } }
}

export type AddSubtaskArgs = { state: State; input: CreateSubtaskInput }
export type AddSubtaskResult = { state: State; subtask: Subtask }

export function addSubtask(args: AddSubtaskArgs): OperationResult<AddSubtaskResult> {
  const { state, input } = args
  const lookup = findTask(state, input.epicId, input.taskId)
  if (!lookup) return { success: false, error: `Task not found: ${input.taskId}` }

  const now = timestamp()
  const subtask: Subtask = {
    id: generateId(),
    content: input.content,
    priority: input.priority,
    status: 'pending',
    created_at: now,
    notes: input.notes,
    deps: input.deps,
  }

  const updatedTask = { ...lookup.task, subtasks: [...lookup.task.subtasks, subtask], updated_at: now }
  const updatedEpic = updateTaskInEpic(lookup.epic, lookup.taskIndex, updatedTask, now)
  const newState = updateEpicInState(state, lookup.epicIndex, updatedEpic)
  return { success: true, data: { state: newState, subtask } }
}

export type AddStandaloneSubtaskInput = {
  content: string
  priority: Priority
  taskId: string
  notes?: string[] | undefined
  deps?: string[] | undefined
}

export type AddStandaloneSubtaskArgs = { state: State; input: AddStandaloneSubtaskInput }

export function addStandaloneSubtask(args: AddStandaloneSubtaskArgs): OperationResult<AddSubtaskResult> {
  const { state, input } = args
  const lookup = findStandaloneTask(state, input.taskId)
  if (!lookup) return { success: false, error: `Standalone task not found: ${input.taskId}` }

  const now = timestamp()
  const subtask: Subtask = {
    id: generateId(),
    content: input.content,
    priority: input.priority,
    status: 'pending',
    created_at: now,
    notes: input.notes,
    deps: input.deps,
  }

  const updatedTask: Task = { ...lookup.task, subtasks: [...lookup.task.subtasks, subtask], updated_at: now }
  const newState = updateStandaloneTaskInState(state, lookup.index, updatedTask)
  return { success: true, data: { state: newState, subtask } }
}

// ============================================================================
// Update Operations
// ============================================================================

function applyUpdate<T extends { updated_at?: string | undefined; completed_at?: string | undefined; implementation_description?: string | undefined }>(
  item: T,
  input: UpdateItemInput,
  now: string
): T {
  return {
    ...item,
    ...(input.content !== undefined && { content: input.content }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.implementation_description !== undefined && { implementation_description: input.implementation_description }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.deps !== undefined && { deps: input.deps }),
    updated_at: now,
    ...(input.status === 'completed' && { completed_at: now }),
  }
}

export type UpdateEpicArgs = { state: State; epicId: string; input: UpdateItemInput }

export function updateEpic(args: UpdateEpicArgs): OperationResult<State> {
  const lookup = findEpic(args.state, args.epicId)
  if (!lookup) return { success: false, error: `Epic not found: ${args.epicId}` }

  const updatedEpic = applyUpdate(lookup.epic, args.input, timestamp())
  return { success: true, data: updateEpicInState(args.state, lookup.index, updatedEpic) }
}

export type UpdateTaskArgs = { state: State; epicId: string; taskId: string; input: UpdateItemInput }

export function updateTask(args: UpdateTaskArgs): OperationResult<State> {
  const lookup = findTask(args.state, args.epicId, args.taskId)
  if (!lookup) return { success: false, error: `Task not found: ${args.taskId}` }

  const now = timestamp()
  const updatedTask = applyUpdate(lookup.task, args.input, now)
  const updatedEpic = updateTaskInEpic(lookup.epic, lookup.taskIndex, updatedTask, now)
  return { success: true, data: updateEpicInState(args.state, lookup.epicIndex, updatedEpic) }
}

export type UpdateSubtaskArgs = {
  state: State
  epicId: string
  taskId: string
  subtaskId: string
  input: UpdateItemInput
}

export function updateSubtask(args: UpdateSubtaskArgs): OperationResult<State> {
  const lookup = findSubtask(args.state, args.epicId, args.taskId, args.subtaskId)
  if (!lookup) return { success: false, error: `Subtask not found: ${args.subtaskId}` }

  const now = timestamp()
  const updatedSubtask = applyUpdate(lookup.subtask, args.input, now)
  const updatedTask = updateSubtaskInTask(lookup.task, lookup.subtaskIndex, updatedSubtask, now)
  const updatedEpic = updateTaskInEpic(lookup.epic, lookup.taskIndex, updatedTask, now)
  return { success: true, data: updateEpicInState(args.state, lookup.epicIndex, updatedEpic) }
}

export type UpdateStandaloneTaskArgs = { state: State; taskId: string; input: UpdateItemInput }

export function updateStandaloneTask(args: UpdateStandaloneTaskArgs): OperationResult<State> {
  const lookup = findStandaloneTask(args.state, args.taskId)
  if (!lookup) return { success: false, error: `Standalone task not found: ${args.taskId}` }

  const updatedTask = applyUpdate(lookup.task, args.input, timestamp())
  return { success: true, data: updateStandaloneTaskInState(args.state, lookup.index, updatedTask) }
}

export type UpdateStandaloneSubtaskArgs = { state: State; taskId: string; subtaskId: string; input: UpdateItemInput }

export function updateStandaloneSubtask(args: UpdateStandaloneSubtaskArgs): OperationResult<State> {
  const lookup = findStandaloneTask(args.state, args.taskId)
  if (!lookup) return { success: false, error: `Standalone task not found: ${args.taskId}` }

  const subtaskIndex = lookup.task.subtasks.findIndex((s) => s.id === args.subtaskId)
  if (subtaskIndex === -1) return { success: false, error: `Subtask not found: ${args.subtaskId}` }

  const now = timestamp()
  const updatedSubtask = applyUpdate(lookup.task.subtasks[subtaskIndex]!, args.input, now)
  const updatedSubtasks = [...lookup.task.subtasks]
  updatedSubtasks[subtaskIndex] = updatedSubtask
  const updatedTask: Task = { ...lookup.task, subtasks: updatedSubtasks, updated_at: now }
  return { success: true, data: updateStandaloneTaskInState(args.state, lookup.index, updatedTask) }
}

// ============================================================================
// Mark Complete
// ============================================================================

export type MarkCompleteArgs = { state: State; id: string }

export function markComplete(args: MarkCompleteArgs): OperationResult<State> {
  const { state, id } = args

  // Check epics and their tasks/subtasks
  for (const epic of state.epics) {
    if (epic.id === id) return markEpicComplete(state, id)

    const taskResult = findAndCompleteTask(state, epic, id)
    if (taskResult) return taskResult
  }

  // Check standalone tasks
  const standaloneTasks = state.tasks ?? []
  for (const task of standaloneTasks) {
    if (task.id === id) return completeStandaloneTask(state, id)

    // Check subtasks of standalone tasks
    const subtaskResult = findAndCompleteStandaloneSubtask(state, task, id)
    if (subtaskResult) return subtaskResult
  }

  return { success: false, error: `Item not found: ${id}` }
}

function markEpicComplete(state: State, epicId: string): OperationResult<State> {
  return updateEpic({ state, epicId, input: { status: 'completed' } })
}

function findAndCompleteTask(state: State, epic: Epic, id: string): OperationResult<State> | null {
  for (const task of epic.tasks) {
    if (task.id === id) return completeTaskAndCascade(state, epic.id, id)

    const subtaskResult = findAndCompleteSubtask(state, epic, task, id)
    if (subtaskResult) return subtaskResult
  }
  return null
}

function findAndCompleteSubtask(
  state: State,
  epic: Epic,
  task: Task,
  id: string
): OperationResult<State> | null {
  const subtask = task.subtasks.find((s) => s.id === id)
  if (!subtask) return null
  return completeSubtaskAndCascade(state, epic.id, task.id, id)
}

function completeTaskAndCascade(state: State, epicId: string, taskId: string): OperationResult<State> {
  const result = updateTask({ state, epicId, taskId, input: { status: 'completed' } })
  if (!result.success) return result
  return maybeCompleteEpic(result.data, epicId)
}

function completeSubtaskAndCascade(
  state: State,
  epicId: string,
  taskId: string,
  subtaskId: string
): OperationResult<State> {
  const result = updateSubtask({ state, epicId, taskId, subtaskId, input: { status: 'completed' } })
  if (!result.success) return result
  return maybeCompleteTaskAndEpic(result.data, epicId, taskId)
}

function maybeCompleteEpic(state: State, epicId: string): OperationResult<State> {
  const epic = state.epics.find((e) => e.id === epicId)
  if (!epic || epic.tasks.length === 0) return { success: true, data: state }

  const allComplete = epic.tasks.every((t) => t.status === 'completed')
  if (!allComplete) return { success: true, data: state }

  return updateEpic({ state, epicId, input: { status: 'completed' } })
}

function maybeCompleteTaskAndEpic(state: State, epicId: string, taskId: string): OperationResult<State> {
  const epic = state.epics.find((e) => e.id === epicId)
  const task = epic?.tasks.find((t) => t.id === taskId)
  if (!task || task.subtasks.length === 0) return { success: true, data: state }

  const allComplete = task.subtasks.every((s) => s.status === 'completed')
  if (!allComplete || task.status === 'completed') return { success: true, data: state }

  const result = updateTask({ state, epicId, taskId, input: { status: 'completed' } })
  if (!result.success) return result
  return maybeCompleteEpic(result.data, epicId)
}

function completeStandaloneTask(state: State, taskId: string): OperationResult<State> {
  return updateStandaloneTask({ state, taskId, input: { status: 'completed' } })
}

function findAndCompleteStandaloneSubtask(
  state: State,
  task: Task,
  id: string
): OperationResult<State> | null {
  const subtask = task.subtasks.find((s) => s.id === id)
  if (!subtask) return null
  return completeStandaloneSubtaskAndCascade(state, task.id, id)
}

function completeStandaloneSubtaskAndCascade(
  state: State,
  taskId: string,
  subtaskId: string
): OperationResult<State> {
  const lookup = findStandaloneTask(state, taskId)
  if (!lookup) return { success: false, error: `Standalone task not found: ${taskId}` }

  const subtaskIndex = lookup.task.subtasks.findIndex((s) => s.id === subtaskId)
  if (subtaskIndex === -1) return { success: false, error: `Subtask not found: ${subtaskId}` }

  const now = timestamp()
  const updatedSubtask = applyUpdate(lookup.task.subtasks[subtaskIndex]!, { status: 'completed' }, now)
  const updatedSubtasks = [...lookup.task.subtasks]
  updatedSubtasks[subtaskIndex] = updatedSubtask
  const updatedTask: Task = { ...lookup.task, subtasks: updatedSubtasks, updated_at: now }
  const newState = updateStandaloneTaskInState(state, lookup.index, updatedTask)

  return maybeCompleteStandaloneTask(newState, taskId)
}

function maybeCompleteStandaloneTask(state: State, taskId: string): OperationResult<State> {
  const tasks = state.tasks ?? []
  const task = tasks.find((t) => t.id === taskId)
  if (!task || task.subtasks.length === 0) return { success: true, data: state }

  const allComplete = task.subtasks.every((s) => s.status === 'completed')
  if (!allComplete || task.status === 'completed') return { success: true, data: state }

  return updateStandaloneTask({ state, taskId, input: { status: 'completed' } })
}

// ============================================================================
// Remove Operations
// ============================================================================

export type RemoveItemArgs = { state: State; id: string }

export function removeItem(args: RemoveItemArgs): OperationResult<State> {
  const { state, id } = args

  // Check epics and their tasks/subtasks
  for (let i = 0; i < state.epics.length; i++) {
    const epic = state.epics[i]!
    if (epic.id === id) return removeEpic(state, i)

    const taskResult = findAndRemoveTask(state, epic, i, id)
    if (taskResult) return taskResult
  }

  // Check standalone tasks
  const standaloneTasks = state.tasks ?? []
  for (let i = 0; i < standaloneTasks.length; i++) {
    const task = standaloneTasks[i]!
    if (task.id === id) return removeStandaloneTask(state, i)

    const subtaskResult = findAndRemoveStandaloneSubtask(state, i, task, id)
    if (subtaskResult) return subtaskResult
  }

  return { success: false, error: `Item not found: ${id}` }
}

function removeEpic(state: State, epicIndex: number): OperationResult<State> {
  const newEpics = [...state.epics]
  newEpics.splice(epicIndex, 1)
  return { success: true, data: { ...state, epics: newEpics } }
}

function findAndRemoveTask(
  state: State,
  epic: Epic,
  epicIndex: number,
  id: string
): OperationResult<State> | null {
  for (let i = 0; i < epic.tasks.length; i++) {
    const task = epic.tasks[i]!
    if (task.id === id) return removeTask(state, epicIndex, epic, i)

    const subtaskResult = findAndRemoveSubtask(state, epicIndex, epic, i, task, id)
    if (subtaskResult) return subtaskResult
  }
  return null
}

function removeTask(state: State, epicIndex: number, epic: Epic, taskIndex: number): OperationResult<State> {
  const newTasks = [...epic.tasks]
  newTasks.splice(taskIndex, 1)
  const updatedEpic = { ...epic, tasks: newTasks, updated_at: timestamp() }
  return { success: true, data: updateEpicInState(state, epicIndex, updatedEpic) }
}

function findAndRemoveSubtask(
  state: State,
  epicIndex: number,
  epic: Epic,
  taskIndex: number,
  task: Task,
  id: string
): OperationResult<State> | null {
  const subtaskIndex = task.subtasks.findIndex((s) => s.id === id)
  if (subtaskIndex === -1) return null
  return removeSubtask(state, epicIndex, epic, taskIndex, task, subtaskIndex)
}

function removeSubtask(
  state: State,
  epicIndex: number,
  epic: Epic,
  taskIndex: number,
  task: Task,
  subtaskIndex: number
): OperationResult<State> {
  const now = timestamp()
  const newSubtasks = [...task.subtasks]
  newSubtasks.splice(subtaskIndex, 1)
  const updatedTask = { ...task, subtasks: newSubtasks, updated_at: now }
  const updatedEpic = updateTaskInEpic(epic, taskIndex, updatedTask, now)
  return { success: true, data: updateEpicInState(state, epicIndex, updatedEpic) }
}

function removeStandaloneTask(state: State, taskIndex: number): OperationResult<State> {
  const newTasks = [...(state.tasks ?? [])]
  newTasks.splice(taskIndex, 1)
  return { success: true, data: { ...state, tasks: newTasks } }
}

function findAndRemoveStandaloneSubtask(
  state: State,
  taskIndex: number,
  task: Task,
  id: string
): OperationResult<State> | null {
  const subtaskIndex = task.subtasks.findIndex((s) => s.id === id)
  if (subtaskIndex === -1) return null
  return removeStandaloneSubtask(state, taskIndex, task, subtaskIndex)
}

function removeStandaloneSubtask(
  state: State,
  taskIndex: number,
  task: Task,
  subtaskIndex: number
): OperationResult<State> {
  const now = timestamp()
  const newSubtasks = [...task.subtasks]
  newSubtasks.splice(subtaskIndex, 1)
  const updatedTask: Task = { ...task, subtasks: newSubtasks, updated_at: now }
  return { success: true, data: updateStandaloneTaskInState(state, taskIndex, updatedTask) }
}

// ============================================================================
// Create empty state
// ============================================================================

export function createEmptyState(): State {
  return { version: 1, epics: [], tasks: [] }
}
