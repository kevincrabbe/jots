import type { State, FlatItem, Status, Priority, ItemType, Epic, Task } from './schema.js'

// ============================================================================
// Flatten State - Build flat item from epic
// ============================================================================

function flattenEpic(epic: Epic): FlatItem {
  const epicTasksCount = epic.tasks.length
  const epicCompletedTasks = epic.tasks.filter((t) => t.status === 'completed').length

  return {
    type: 'epic',
    id: epic.id,
    content: epic.content,
    priority: epic.priority,
    status: epic.status,
    created_at: epic.created_at,
    updated_at: epic.updated_at,
    completed_at: epic.completed_at,
    notes: epic.notes,
    depth: 0,
    hasChildren: epicTasksCount > 0,
    childrenCount: epicTasksCount,
    completedChildrenCount: epicCompletedTasks,
  }
}

function flattenTask(epic: Epic, task: Task): FlatItem {
  const taskSubtasksCount = task.subtasks.length
  const taskCompletedSubtasks = task.subtasks.filter((s) => s.status === 'completed').length

  return {
    type: 'task',
    id: task.id,
    content: task.content,
    priority: task.priority,
    status: task.status,
    created_at: task.created_at,
    updated_at: task.updated_at,
    completed_at: task.completed_at,
    notes: task.notes,
    epicId: epic.id,
    epicContent: epic.content,
    depth: 1,
    hasChildren: taskSubtasksCount > 0,
    childrenCount: taskSubtasksCount,
    completedChildrenCount: taskCompletedSubtasks,
  }
}

function flattenSubtask(epic: Epic, task: Task, subtask: Task['subtasks'][0]): FlatItem {
  return {
    type: 'subtask',
    id: subtask.id,
    content: subtask.content,
    priority: subtask.priority,
    status: subtask.status,
    created_at: subtask.created_at,
    updated_at: subtask.updated_at,
    completed_at: subtask.completed_at,
    notes: subtask.notes,
    epicId: epic.id,
    epicContent: epic.content,
    taskId: task.id,
    taskContent: task.content,
    depth: 2,
    hasChildren: false,
    childrenCount: 0,
    completedChildrenCount: 0,
  }
}

export function flattenState(state: State): FlatItem[] {
  const items: FlatItem[] = []

  for (const epic of state.epics) {
    items.push(flattenEpic(epic))
    for (const task of epic.tasks) {
      items.push(flattenTask(epic, task))
      for (const subtask of task.subtasks) {
        items.push(flattenSubtask(epic, task, subtask))
      }
    }
  }

  return items
}

// ============================================================================
// Get Next Item
// ============================================================================

export type GetNextArgs = { state: State; level?: 'epic' | 'task' | 'subtask' | 'any' }
export type GetNextResult = { item: FlatItem | null; queueDepth: number }

export function getNext(args: GetNextArgs): GetNextResult {
  const { state, level = 'any' } = args
  const flat = flattenState(state)

  const actionable = flat.filter((item) => item.status === 'pending' || item.status === 'in_progress')
  const filtered = level === 'any' ? actionable : actionable.filter((item) => item.type === level)

  const sorted = filtered.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return level === 'any' ? b.depth - a.depth : 0
  })

  return { item: sorted[0] ?? null, queueDepth: filtered.length }
}

// ============================================================================
// Get Context (State Summary)
// ============================================================================

export type ContextSummary = {
  totalEpics: number
  completedEpics: number
  totalTasks: number
  completedTasks: number
  totalSubtasks: number
  completedSubtasks: number
  inProgressItems: FlatItem[]
  blockedItems: FlatItem[]
  nextItem: FlatItem | null
}

export function getContext(state: State): ContextSummary {
  const flat = flattenState(state)

  const epics = flat.filter((i) => i.type === 'epic')
  const tasks = flat.filter((i) => i.type === 'task')
  const subtasks = flat.filter((i) => i.type === 'subtask')

  return {
    totalEpics: epics.length,
    completedEpics: epics.filter((e) => e.status === 'completed').length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    totalSubtasks: subtasks.length,
    completedSubtasks: subtasks.filter((s) => s.status === 'completed').length,
    inProgressItems: flat.filter((i) => i.status === 'in_progress'),
    blockedItems: flat.filter((i) => i.status === 'blocked'),
    nextItem: getNext({ state }).item,
  }
}

// ============================================================================
// Filter Items
// ============================================================================

export type FilterArgs = {
  state: State
  status?: Status | Status[]
  priority?: Priority | Priority[]
  type?: ItemType | ItemType[]
  epicId?: string
  taskId?: string
  search?: string
}

function applyStatusFilter(items: FlatItem[], status: Status | Status[]): FlatItem[] {
  const statuses = Array.isArray(status) ? status : [status]
  return items.filter((i) => statuses.includes(i.status))
}

function applyPriorityFilter(items: FlatItem[], priority: Priority | Priority[]): FlatItem[] {
  const priorities = Array.isArray(priority) ? priority : [priority]
  return items.filter((i) => priorities.includes(i.priority))
}

function applyTypeFilter(items: FlatItem[], type: ItemType | ItemType[]): FlatItem[] {
  const types = Array.isArray(type) ? type : [type]
  return items.filter((i) => types.includes(i.type))
}

export function filterItems(args: FilterArgs): FlatItem[] {
  let items = flattenState(args.state)

  if (args.status !== undefined) items = applyStatusFilter(items, args.status)
  if (args.priority !== undefined) items = applyPriorityFilter(items, args.priority)
  if (args.type !== undefined) items = applyTypeFilter(items, args.type)
  if (args.epicId !== undefined) items = items.filter((i) => i.epicId === args.epicId || i.id === args.epicId)
  if (args.taskId !== undefined) items = items.filter((i) => i.taskId === args.taskId || i.id === args.taskId)
  if (args.search !== undefined) {
    const searchLower = args.search.toLowerCase()
    items = items.filter((i) => i.content.toLowerCase().includes(searchLower))
  }

  return items
}

// ============================================================================
// List (convenience wrappers)
// ============================================================================

export function listEpics(state: State): FlatItem[] {
  return filterItems({ state, type: 'epic' })
}

export function listTasks(state: State, epicId?: string): FlatItem[] {
  return filterItems({ state, type: 'task', ...(epicId && { epicId }) })
}

export function listSubtasks(state: State, taskId?: string): FlatItem[] {
  return filterItems({ state, type: 'subtask', ...(taskId && { taskId }) })
}

// ============================================================================
// Find by ID
// ============================================================================

export type FindByIdResult = { item: FlatItem | null }

export function findById(state: State, id: string): FindByIdResult {
  const flat = flattenState(state)
  return { item: flat.find((i) => i.id === id) ?? null }
}

// ============================================================================
// Fuzzy Find by Content
// ============================================================================

export function fuzzyFind(state: State, query: string): FlatItem[] {
  const flat = flattenState(state)
  const exactId = flat.find((i) => i.id === query)
  if (exactId) return [exactId]

  const queryLower = query.toLowerCase()
  return flat.filter((i) => i.content.toLowerCase().includes(queryLower))
}
