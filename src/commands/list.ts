import { defineCommand } from 'citty'
import { readState } from '../storage/file.js'
import { filterItems, listEpics, listTasks, listSubtasks } from '../core/queries.js'
import type { FlatItem, Status, Priority, State } from '../core/schema.js'

const STATUS_ICONS: Record<Status, string> = { pending: '○', in_progress: '◐', completed: '●', blocked: '◌' }
const PRIORITY_COLORS: Record<Priority, string> = { 1: '\x1b[31m', 2: '\x1b[33m', 3: '\x1b[36m', 4: '\x1b[34m', 5: '\x1b[90m' }
const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

function outputError(error: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ error }))
  else console.error(`Error: ${error}`)
}

function printItem(item: FlatItem): void {
  const indent = '  '.repeat(item.depth)
  const icon = STATUS_ICONS[item.status]
  const priorityLabel = `${PRIORITY_COLORS[item.priority]}P${item.priority}${RESET}`
  let line = `${indent}${icon} ${item.content} ${DIM}[${item.id}]${RESET} ${priorityLabel}`
  if (item.hasChildren) line += ` ${DIM}(${item.completedChildrenCount}/${item.childrenCount})${RESET}`
  // eslint-disable-next-line no-console
  console.log(line)
}

function getItemsByType(state: State, type: string, epic?: string, task?: string): FlatItem[] | null {
  if (type === 'epics') return listEpics(state)
  if (type === 'tasks') return listTasks(state, epic)
  if (type === 'subtasks') return listSubtasks(state, task)
  if (type === 'all') return filterItems({ state })
  return null
}

function applyFilters(items: FlatItem[], statusArg?: string, priorityArg?: string): FlatItem[] {
  let filtered = items
  if (statusArg) {
    const statuses = statusArg.split(',') as Status[]
    filtered = filtered.filter((i) => statuses.includes(i.status))
  }
  if (priorityArg) {
    const priorities = priorityArg.split(',').map((p) => parseInt(p.replace(/^p/i, ''), 10)) as Priority[]
    filtered = filtered.filter((i) => priorities.includes(i.priority))
  }
  return filtered
}

export default defineCommand({
  meta: { name: 'list', description: 'List epics, tasks, or subtasks' },
  args: {
    type: { type: 'positional', description: 'Type: epics, tasks, subtasks, or all', default: 'epics' },
    epic: { type: 'string', alias: 'e', description: 'Filter by epic ID or name' },
    task: { type: 'string', alias: 't', description: 'Filter by task ID or name' },
    status: { type: 'string', alias: 's', description: 'Filter by status' },
    priority: { type: 'string', alias: 'p', description: 'Filter by priority' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const result = await readState()
    if (!result.success) {
      outputError(result.error, args.json as boolean)
      process.exit(1)
    }

    const items = getItemsByType(result.state, args.type as string, args.epic as string, args.task as string)
    if (items === null) {
      outputError(`Unknown type: ${args.type}. Use: epics, tasks, subtasks, all`, args.json as boolean)
      process.exit(1)
    }

    const filtered = applyFilters(items, args.status as string, args.priority as string)

    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ items: filtered, count: filtered.length }))
    } else {
      if (filtered.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No items found.')
        return
      }
      for (const item of filtered) printItem(item)
      // eslint-disable-next-line no-console
      console.log(`${DIM}(${filtered.length} items)${RESET}`)
    }
  },
})
