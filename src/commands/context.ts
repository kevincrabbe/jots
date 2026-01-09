import { defineCommand } from 'citty'
import { readState } from '../storage/file.js'
import { getContext, type ContextSummary } from '../core/queries.js'
import type { FlatItem } from '../core/schema.js'

function outputError(error: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ error }))
  else console.error(`Error: ${error}`)
}

function printItemList(title: string, items: FlatItem[]): void {
  if (items.length === 0) return
  // eslint-disable-next-line no-console
  console.log(`${title}:`)
  for (const item of items) {
    // eslint-disable-next-line no-console
    console.log(`  [${item.type}] ${item.content} (${item.id})`)
  }
  // eslint-disable-next-line no-console
  console.log('')
}

function printContext(ctx: ContextSummary): void {
  // eslint-disable-next-line no-console
  console.log('='.repeat(50))
  // eslint-disable-next-line no-console
  console.log('JOTS CONTEXT')
  // eslint-disable-next-line no-console
  console.log('='.repeat(50))
  // eslint-disable-next-line no-console
  console.log('')
  // eslint-disable-next-line no-console
  console.log('Progress:')
  // eslint-disable-next-line no-console
  console.log(`  Epics:    ${ctx.completedEpics}/${ctx.totalEpics}`)
  // eslint-disable-next-line no-console
  console.log(`  Tasks:    ${ctx.completedTasks}/${ctx.totalTasks}`)
  // eslint-disable-next-line no-console
  console.log(`  Subtasks: ${ctx.completedSubtasks}/${ctx.totalSubtasks}`)
  // eslint-disable-next-line no-console
  console.log('')

  printItemList('In Progress', ctx.inProgressItems)
  printItemList('Blocked', ctx.blockedItems)

  if (ctx.nextItem) {
    // eslint-disable-next-line no-console
    console.log('Next:')
    // eslint-disable-next-line no-console
    console.log(`  [${ctx.nextItem.type}] ${ctx.nextItem.content} (${ctx.nextItem.id})`)
    // eslint-disable-next-line no-console
    console.log('')
  }
  // eslint-disable-next-line no-console
  console.log('='.repeat(50))
}

export default defineCommand({
  meta: { name: 'context', description: 'Get a summary of current state for AI agents' },
  args: { json: { type: 'boolean', description: 'Output as JSON', default: false } },
  async run({ args }) {
    const result = await readState()
    if (!result.success) {
      outputError(result.error, args.json as boolean)
      process.exit(1)
    }

    const ctx = getContext(result.state)

    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(ctx))
    } else {
      printContext(ctx)
    }
  },
})
