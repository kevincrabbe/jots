import { defineCommand } from 'citty'
import { readState, writeState } from '../storage/file.js'
import { markComplete, updateEpic, updateTask, updateSubtask, updateStandaloneTask, updateStandaloneSubtask } from '../core/operations.js'
import { fuzzyFind } from '../core/queries.js'
import type { State, FlatItem, OperationResult, UpdateItemInput } from '../core/schema.js'

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
    console.error('\nUse the exact ID to mark done.')
  }
}

function outputAlreadyComplete(item: FlatItem, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ success: true, alreadyComplete: true, item }))
  // eslint-disable-next-line no-console
  else console.log(`Already completed: ${item.content}`)
}

function outputSuccess(item: FlatItem, json: boolean): void {
  if (json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ success: true, completed: { id: item.id, type: item.type, content: item.content } }))
  } else {
    // eslint-disable-next-line no-console
    console.log(`Completed: ${item.content} (${item.id})`)
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

function completeWithImpl(state: State, item: FlatItem, impl: string): OperationResult<State> {
  const input: UpdateItemInput = { status: 'completed', implementation_description: impl }

  if (item.type === 'epic') return updateEpic({ state, epicId: item.id, input })
  if (item.type === 'task') {
    if (item.isStandalone) return updateStandaloneTask({ state, taskId: item.id, input })
    if (!item.epicId) return { success: false, error: 'Task has no epic reference' }
    return updateTask({ state, epicId: item.epicId, taskId: item.id, input })
  }
  if (!item.taskId) return { success: false, error: 'Subtask has no task reference' }
  if (item.isStandalone) {
    return updateStandaloneSubtask({ state, taskId: item.taskId, subtaskId: item.id, input })
  }
  if (!item.epicId) return { success: false, error: 'Subtask has no epic reference' }
  return updateSubtask({ state, epicId: item.epicId, taskId: item.taskId, subtaskId: item.id, input })
}

export default defineCommand({
  meta: { name: 'done', description: 'Mark an item as completed' },
  args: {
    identifier: { type: 'positional', description: 'ID or text to match', required: true },
    impl: { type: 'string', alias: 'i', description: 'Implementation description (what was done)' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const result = await readState()
    if (!result.success) {
      outputError(result.error, args.json as boolean)
      process.exit(1)
    }

    const { state, path } = result
    const findResult = findItem(state, args.identifier as string)

    if (!findResult.found) {
      if (findResult.error === 'multiple') {
        outputMultipleMatches(findResult.matches!, args.json as boolean)
      } else {
        outputError(`No item found matching: ${args.identifier}`, args.json as boolean)
      }
      process.exit(1)
    }

    const { item } = findResult
    if (item.status === 'completed') {
      outputAlreadyComplete(item, args.json as boolean)
      return
    }

    const impl = args.impl as string | undefined
    const opResult = impl
      ? completeWithImpl(state, item, impl)
      : markComplete({ state, id: item.id })

    if (!opResult.success) {
      outputError(opResult.error, args.json as boolean)
      process.exit(1)
    }

    await writeState(opResult.data, path)
    outputSuccess(item, args.json as boolean)
  },
})
