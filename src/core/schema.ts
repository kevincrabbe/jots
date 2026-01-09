import { z } from 'zod'

// Minimum description length for meaningful task descriptions
const MIN_DESCRIPTION_LENGTH = 10

export const StatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked'])
export type Status = z.infer<typeof StatusSchema>

export const PrioritySchema = z.number().int().min(1).max(5)
export type Priority = z.infer<typeof PrioritySchema>

export const SubtaskSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(MIN_DESCRIPTION_LENGTH, {
    message: `Subtask content must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
  }),
  priority: PrioritySchema,
  status: StatusSchema.default('pending'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  notes: z.array(z.string()).optional(),
})

export type Subtask = z.infer<typeof SubtaskSchema>

export const TaskSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(MIN_DESCRIPTION_LENGTH, {
    message: `Task content must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
  }),
  priority: PrioritySchema,
  status: StatusSchema.default('pending'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  notes: z.array(z.string()).optional(),
  subtasks: z.array(SubtaskSchema).default([]),
})

export type Task = z.infer<typeof TaskSchema>

export const EpicSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(MIN_DESCRIPTION_LENGTH, {
    message: `Epic content must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
  }),
  priority: PrioritySchema,
  status: StatusSchema.default('pending'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  notes: z.array(z.string()).optional(),
  tasks: z.array(TaskSchema).default([]),
})

export type Epic = z.infer<typeof EpicSchema>

export const StateSchema = z.object({
  version: z.literal(1),
  epics: z.array(EpicSchema).default([]),
})

export type State = z.infer<typeof StateSchema>

// Input types for creating new items (without auto-generated fields)
export type CreateEpicInput = {
  content: string
  priority: Priority
  notes?: string[]
}

export type CreateTaskInput = {
  content: string
  priority: Priority
  epicId: string
  notes?: string[]
}

export type CreateSubtaskInput = {
  content: string
  priority: Priority
  epicId: string
  taskId: string
  notes?: string[]
}

// Update types (partial, for modifications)
export type UpdateItemInput = {
  content?: string
  priority?: Priority
  status?: Status
  notes?: string[]
}

// Result types for operations
export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Item reference for unified handling
export type ItemType = 'epic' | 'task' | 'subtask'

export type ItemReference = {
  type: ItemType
  id: string
  epicId?: string
  taskId?: string
}

// Flattened item for queries (includes parent context)
// Using `| undefined` for exactOptionalPropertyTypes compatibility
export type FlatItem = {
  type: ItemType
  id: string
  content: string
  priority: Priority
  status: Status
  created_at: string
  updated_at?: string | undefined
  completed_at?: string | undefined
  notes?: string[] | undefined
  epicId?: string | undefined
  epicContent?: string | undefined
  taskId?: string | undefined
  taskContent?: string | undefined
  depth: number
  hasChildren: boolean
  childrenCount: number
  completedChildrenCount: number
}
