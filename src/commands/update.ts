import { defineCommand } from 'citty'
import { readState, writeState } from '../storage/file.js'
import { updateEpic, updateTask, updateSubtask } from '../core/operations.js'
import { fuzzyFind } from '../core/queries.js'
import type { State, Priority, Status, UpdateItemInput, FlatItem, OperationResult } from '../core/schema.js'

type UpdateArgs = { content?: string; priority?: string; status?: string }

function parsePriority(p: string): Priority {
  const match = p.match(/^p?([1-5])$/i)
  return match?.[1] ? (parseInt(match[1], 10) as Priority) : 2
}

function outputError(error: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ error }))
  else console.error(`Error: ${error}`)
}

function outputMultipleMatches(matches: FlatItem[], json: boolean): void {
  if (json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      error: 'Multiple matches found',
      matches: matches.map((m) => ({ id: m.id, content: m.content, type: m.type })),
    }))
  } else {
    console.error('Multiple matches found:')
    for (const m of matches.slice(0, 5)) console.error(`  [${m.type}] ${m.content} (${m.id})`)
    console.error('\nUse the exact ID to update.')
  }
}

function outputSuccess(item: FlatItem, input: UpdateItemInput, json: boolean): void {
  if (json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ success: true, updated: { id: item.id, type: item.type, changes: input } }))
  } else {
    // eslint-disable-next-line no-console
    console.log(`Updated: ${item.content} (${item.id})`)
  }
}

type FindResult = { found: true; item: FlatItem } | { found: false; error: 'not_found' | 'multiple'; matches?: FlatItem[] }

function findItem(state: State, identifier: string): FindResult {
  const matches = fuzzyFind(state, identifier)
  if (matches.length === 0) return { found: false, error: 'not_found' }
  if (matches.length > 1 && matches[0]?.id !== identifier) return { found: false, error: 'multiple', matches }
  if (!matches[0]) return { found: false, error: 'not_found' }
  return { found: true, item: matches[0] }
}

function handleFindError(result: FindResult & { found: false }, identifier: string, json: boolean): void {
  if (result.error === 'multiple') outputMultipleMatches(result.matches!, json)
  else outputError(`No item found matching: ${identifier}`, json)
}

function buildInput(args: UpdateArgs): UpdateItemInput | null {
  const input: UpdateItemInput = {}
  if (args.content) input.content = args.content
  if (args.priority) input.priority = parsePriority(args.priority)
  if (args.status) input.status = args.status as Status
  return Object.keys(input).length > 0 ? input : null
}

function applyUpdate(state: State, item: FlatItem, input: UpdateItemInput): OperationResult<State> {
  if (item.type === 'epic') return updateEpic({ state, epicId: item.id, input })
  if (item.type === 'task') {
    if (!item.epicId) return { success: false, error: 'Task has no epic reference' }
    return updateTask({ state, epicId: item.epicId, taskId: item.id, input })
  }
  if (!item.epicId || !item.taskId) return { success: false, error: 'Subtask has no epic/task reference' }
  return updateSubtask({ state, epicId: item.epicId, taskId: item.taskId, subtaskId: item.id, input })
}

export default defineCommand({
  meta: { name: 'update', description: 'Update an existing item' },
  args: {
    identifier: { type: 'positional', description: 'ID or text to match', required: true },
    content: { type: 'string', alias: 'c', description: 'New content' },
    priority: { type: 'string', alias: 'p', description: 'New priority: p1-p5' },
    status: { type: 'string', alias: 's', description: 'New status: pending, in_progress, completed, blocked' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const result = await readState()
    if (!result.success) {
      outputError(result.error, args.json as boolean)
      process.exit(1)
    }

    const findResult = findItem(result.state, args.identifier as string)
    if (!findResult.found) {
      handleFindError(findResult, args.identifier as string, args.json as boolean)
      process.exit(1)
    }

    const input = buildInput(args as unknown as UpdateArgs)
    if (!input) {
      outputError('No changes specified. Use --content, --priority, or --status', args.json as boolean)
      process.exit(1)
    }

    const opResult = applyUpdate(result.state, findResult.item, input)
    if (!opResult.success) {
      outputError(opResult.error, args.json as boolean)
      process.exit(1)
    }

    await writeState(opResult.data, result.path)
    outputSuccess(findResult.item, input, args.json as boolean)
  },
})
