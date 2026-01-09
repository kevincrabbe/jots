// Core schema types
export type {
  State,
  Epic,
  Task,
  Subtask,
  Status,
  Priority,
  FlatItem,
  ItemType,
  CreateEpicInput,
  CreateTaskInput,
  CreateSubtaskInput,
  UpdateItemInput,
  OperationResult,
} from './core/schema.js'

export { StateSchema, EpicSchema, TaskSchema, SubtaskSchema } from './core/schema.js'

// Operations
export {
  addEpic,
  addTask,
  addSubtask,
  updateEpic,
  updateTask,
  updateSubtask,
  markComplete,
  createEmptyState,
} from './core/operations.js'

// Queries
export {
  flattenState,
  getNext,
  getContext,
  filterItems,
  listEpics,
  listTasks,
  listSubtasks,
  findById,
  fuzzyFind,
} from './core/queries.js'

// Validation
export { validateState, lintState } from './core/validation.js'

// Storage
export { readState, writeState, initState, findJotsFile } from './storage/file.js'

// ID generation
export { generateId, timestamp } from './core/id.js'
