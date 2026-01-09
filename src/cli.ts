import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'jots',
    version: '0.1.0',
    description: 'Hierarchical task management for AI coding agents and humans',
  },
  subCommands: {
    add: () => import('./commands/add.js').then((m) => m.default),
    list: () => import('./commands/list.js').then((m) => m.default),
    next: () => import('./commands/next.js').then((m) => m.default),
    context: () => import('./commands/context.js').then((m) => m.default),
    done: () => import('./commands/done.js').then((m) => m.default),
    remove: () => import('./commands/remove.js').then((m) => m.default),
    update: () => import('./commands/update.js').then((m) => m.default),
    validate: () => import('./commands/validate.js').then((m) => m.default),
    init: () => import('./commands/init.js').then((m) => m.default),
    usage: () => import('./commands/usage.js').then((m) => m.default),
  },
})

runMain(main)
