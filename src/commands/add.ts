import { defineCommand } from 'citty'
import { readOrCreateState, writeState } from '../storage/file.js'
import { addEpic, addTask, addSubtask } from '../core/operations.js'
import { fuzzyFind } from '../core/queries.js'
import type { State, Priority } from '../core/schema.js'

type AddArgs = { type: string; content: string; epic?: string; task?: string; priority: string; json: boolean }
type AddResult = { state: State; id: string; content: string }
type ProcessResult = { success: true; data: AddResult } | { success: false; error: string }

function parsePriority(p: string): Priority {
  const match = p.match(/^p?([1-5])$/i)
  return match?.[1] ? (parseInt(match[1], 10) as Priority) : 2
}

function resolveId(state: State, query: string, type: 'epic' | 'task'): string | null {
  return fuzzyFind(state, query).filter((m) => m.type === type)[0]?.id ?? null
}

function outputError(error: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ error }))
  else console.error(`Error: ${error}`)
}

function outputSuccess(type: string, id: string, content: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ success: true, type, id, content }))
  // eslint-disable-next-line no-console
  else console.log(`Added ${type}: ${content} (${id})`)
}

function addEpicItem(state: State, content: string, priority: Priority): ProcessResult {
  const result = addEpic({ state, input: { content, priority } })
  if (!result.success) return { success: false, error: result.error }
  return { success: true, data: { state: result.data.state, id: result.data.epic.id, content: result.data.epic.content } }
}

function addTaskItem(state: State, content: string, priority: Priority, epicQuery?: string): ProcessResult {
  if (!epicQuery) return { success: false, error: '--epic is required for adding a task' }
  const epicId = resolveId(state, epicQuery, 'epic')
  if (!epicId) return { success: false, error: `Epic not found: ${epicQuery}` }
  const result = addTask({ state, input: { content, priority, epicId } })
  if (!result.success) return { success: false, error: result.error }
  return { success: true, data: { state: result.data.state, id: result.data.task.id, content: result.data.task.content } }
}

function addSubtaskItem(state: State, content: string, priority: Priority, epicQuery?: string, taskQuery?: string): ProcessResult {
  if (!epicQuery || !taskQuery) return { success: false, error: '--epic and --task are required for adding a subtask' }
  const epicId = resolveId(state, epicQuery, 'epic')
  if (!epicId) return { success: false, error: `Epic not found: ${epicQuery}` }
  const taskId = resolveId(state, taskQuery, 'task')
  if (!taskId) return { success: false, error: `Task not found: ${taskQuery}` }
  const result = addSubtask({ state, input: { content, priority, epicId, taskId } })
  if (!result.success) return { success: false, error: result.error }
  return { success: true, data: { state: result.data.state, id: result.data.subtask.id, content: result.data.subtask.content } }
}

function processAdd(state: State, args: AddArgs): ProcessResult {
  const priority = parsePriority(args.priority)
  if (args.type === 'epic') return addEpicItem(state, args.content, priority)
  if (args.type === 'task') return addTaskItem(state, args.content, priority, args.epic)
  if (args.type === 'subtask') return addSubtaskItem(state, args.content, priority, args.epic, args.task)
  return { success: false, error: `Unknown type: ${args.type}. Use: epic, task, subtask` }
}

export default defineCommand({
  meta: { name: 'add', description: 'Add an epic, task, or subtask' },
  args: {
    type: { type: 'positional', description: 'Type: epic, task, or subtask', required: true },
    content: { type: 'positional', description: 'Content/description of the item', required: true },
    epic: { type: 'string', alias: 'e', description: 'Epic ID or name (for task/subtask)' },
    task: { type: 'string', alias: 't', description: 'Task ID or name (for subtask)' },
    priority: { type: 'string', alias: 'p', description: 'Priority: p1-p5 (default: p2)', default: 'p2' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const readResult = await readOrCreateState()
    if (!readResult.success) {
      outputError(readResult.error, args.json as boolean)
      process.exit(1)
    }

    const result = processAdd(readResult.state, args as unknown as AddArgs)
    if (!result.success) {
      outputError(result.error, args.json as boolean)
      process.exit(1)
    }

    await writeState(result.data.state, readResult.path)
    outputSuccess(args.type as string, result.data.id, result.data.content, args.json as boolean)
  },
})
