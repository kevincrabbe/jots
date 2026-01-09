import { defineCommand } from 'citty'
import { readState } from '../storage/file.js'
import { getNext } from '../core/queries.js'
import type { FlatItem } from '../core/schema.js'

function outputError(error: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ error }))
  else console.error(`Error: ${error}`)
}

function printNextItem(item: FlatItem, queueDepth: number, blockedByDeps: number): void {
  // eslint-disable-next-line no-console
  console.log(`Next ${item.type}:`)
  // eslint-disable-next-line no-console
  console.log(`  ${item.content}`)
  // eslint-disable-next-line no-console
  console.log(`  ID: ${item.id} | Priority: P${item.priority} | Status: ${item.status}`)
  if (item.epicContent && item.type !== 'epic') {
    // eslint-disable-next-line no-console
    console.log(`  Epic: ${item.epicContent}`)
  }
  if (item.taskContent && item.type === 'subtask') {
    // eslint-disable-next-line no-console
    console.log(`  Task: ${item.taskContent}`)
  }
  let queueLine = `\n(${queueDepth} items in queue`
  if (blockedByDeps > 0) queueLine += `, ${blockedByDeps} blocked by deps`
  queueLine += ')'
  // eslint-disable-next-line no-console
  console.log(queueLine)
}

export default defineCommand({
  meta: { name: 'next', description: 'Get the next highest-priority actionable item' },
  args: {
    level: { type: 'string', alias: 'l', description: 'Level: epic, task, subtask, or any', default: 'any' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const result = await readState()
    if (!result.success) {
      outputError(result.error, args.json as boolean)
      process.exit(1)
    }

    const level = args.level as 'epic' | 'task' | 'subtask' | 'any'
    const { item, queueDepth, blockedByDeps } = getNext({ state: result.state, level })

    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ item, queueDepth, blockedByDeps, hasMore: queueDepth > 1 }))
      return
    }

    if (!item) {
      // eslint-disable-next-line no-console
      console.log('No pending items.')
      return
    }

    printNextItem(item, queueDepth, blockedByDeps)
  },
})
