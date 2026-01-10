import { defineCommand } from 'citty'
import { readState, writeState } from '../storage/file.js'
import { updateEpic, updateTask, updateSubtask, updateStandaloneTask, updateStandaloneSubtask } from '../core/operations.js'
import { fuzzyFind, flattenState } from '../core/queries.js'
import type { State, Priority, Status, UpdateItemInput, FlatItem, OperationResult } from '../core/schema.js'

type UpdateArgs = {
  content?: string
  priority?: string
  status?: string
  impl?: string
  'add-dep'?: string
  'remove-dep'?: string
}

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

function getScopedItems(state: State, item: FlatItem): FlatItem[] {
  const allItems = flattenState(state)
  if (item.type === 'epic') return allItems.filter((i) => i.type === 'epic' && i.id !== item.id)
  if (item.type === 'task') return allItems.filter((i) => i.type === 'task' && i.epicId === item.epicId && i.id !== item.id)
  return allItems.filter((i) => i.type === 'subtask' && i.taskId === item.taskId && i.id !== item.id)
}

function resolveDepId(scopedItems: FlatItem[], query: string): string | null {
  const exact = scopedItems.find((i) => i.id === query)
  if (exact) return exact.id
  const qLower = query.toLowerCase()
  return scopedItems.find((i) => i.content.toLowerCase().includes(qLower))?.id ?? null
}

function addDepToArray(deps: string[], scopedItems: FlatItem[], addDep: string): string[] {
  const depId = resolveDepId(scopedItems, addDep)
  if (depId && !deps.includes(depId)) return [...deps, depId]
  return deps
}

function removeDepFromArray(deps: string[], scopedItems: FlatItem[], removeDep: string): string[] {
  const depId = resolveDepId(scopedItems, removeDep) ?? removeDep
  return deps.filter((d) => d !== depId)
}

function buildDepsArray(item: FlatItem, scopedItems: FlatItem[], addDep?: string, removeDep?: string): string[] | undefined {
  const hasAddDep = addDep !== undefined && addDep !== ''
  const hasRemoveDep = removeDep !== undefined && removeDep !== ''
  if (!hasAddDep && !hasRemoveDep) return undefined

  let deps = [...(item.deps ?? [])]
  if (hasAddDep) deps = addDepToArray(deps, scopedItems, addDep!)
  if (hasRemoveDep) deps = removeDepFromArray(deps, scopedItems, removeDep!)
  return deps
}

function buildInput(args: UpdateArgs, item: FlatItem, scopedItems: FlatItem[]): UpdateItemInput | null {
  const input: UpdateItemInput = {}
  if (args.content) input.content = args.content
  if (args.priority) input.priority = parsePriority(args.priority)
  if (args.status) input.status = args.status as Status
  if (args.impl) input.implementation_description = args.impl

  const deps = buildDepsArray(item, scopedItems, args['add-dep'], args['remove-dep'])
  if (deps !== undefined) input.deps = deps

  return Object.keys(input).length > 0 ? input : null
}

function applyUpdate(state: State, item: FlatItem, input: UpdateItemInput): OperationResult<State> {
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
  meta: { name: 'update', description: 'Update an existing item' },
  args: {
    identifier: { type: 'positional', description: 'ID or text to match', required: true },
    content: { type: 'string', alias: 'c', description: 'New content' },
    priority: { type: 'string', alias: 'p', description: 'New priority: p1-p5' },
    status: { type: 'string', alias: 's', description: 'New status: pending, in_progress, completed, blocked' },
    impl: { type: 'string', alias: 'i', description: 'Implementation description (what was done)' },
    'add-dep': { type: 'string', description: 'Add a dependency (ID or text to match within scope)' },
    'remove-dep': { type: 'string', description: 'Remove a dependency (ID or text to match)' },
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

    const scopedItems = getScopedItems(result.state, findResult.item)
    const input = buildInput(args as unknown as UpdateArgs, findResult.item, scopedItems)
    if (!input) {
      outputError('No changes specified. Use --content, --priority, --status, --impl, --add-dep, or --remove-dep', args.json as boolean)
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
