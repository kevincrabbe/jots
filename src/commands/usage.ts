import { defineCommand } from 'citty'

const USAGE_SCHEMA = {
  version: '0.1.0',
  description: 'Hierarchical task management for AI coding agents and humans',
  dataFile: 'jots.json',
  hierarchy: ['epic', 'task', 'subtask'],
  statuses: ['pending', 'in_progress', 'completed', 'blocked'],
  priorities: [1, 2, 3, 4, 5],
  commands: {
    add: {
      description: 'Add epic, task, or subtask',
      args: ['type:epic|task|subtask', 'content:string'],
      flags: ['--epic/-e', '--task/-t', '--priority/-p', '--json'],
      examples: [
        'jots add epic "Build auth system"',
        'jots add task "Implement JWT" --epic abc123',
        'jots add subtask "Write tests" --epic abc123 --task def456',
      ],
    },
    list: {
      description: 'List items',
      args: ['type:epics|tasks|subtasks|all'],
      flags: ['--epic/-e', '--task/-t', '--status/-s', '--priority/-p', '--json'],
      returns: { items: 'FlatItem[]', count: 'number' },
    },
    next: {
      description: 'Get highest-priority actionable item',
      flags: ['--level/-l:epic|task|subtask|any', '--json'],
      returns: { item: 'FlatItem|null', queueDepth: 'number' },
    },
    context: {
      description: 'Get state summary for AI agents',
      flags: ['--json'],
      returns: {
        totalEpics: 'number',
        completedEpics: 'number',
        totalTasks: 'number',
        completedTasks: 'number',
        totalSubtasks: 'number',
        completedSubtasks: 'number',
        inProgressItems: 'FlatItem[]',
        blockedItems: 'FlatItem[]',
        nextItem: 'FlatItem|null',
      },
    },
    done: {
      description: 'Mark item complete by ID or fuzzy match',
      args: ['identifier:string'],
      flags: ['--json'],
      returns: { success: 'boolean', completed: 'object' },
    },
    update: {
      description: 'Update existing item',
      args: ['identifier:string'],
      flags: ['--content/-c', '--priority/-p', '--status/-s', '--json'],
    },
    validate: {
      description: 'Validate jots.json schema',
      flags: ['--json'],
      returns: { valid: 'boolean', warnings: 'string[]', suggestions: 'string[]' },
    },
    init: {
      description: 'Initialize jots in project',
      flags: ['--force/-f', '--skip-claude', '--json'],
      creates: ['jots.json', 'CLAUDE.md section', '.claude/hooks/validate-jots.sh'],
    },
    usage: {
      description: 'Show this token-efficient usage schema',
      flags: [],
    },
  },
  types: {
    FlatItem: {
      type: 'epic|task|subtask',
      id: 'string',
      content: 'string',
      priority: '1-5',
      status: 'pending|in_progress|completed|blocked',
      epicId: 'string?',
      taskId: 'string?',
      depth: '0|1|2',
      hasChildren: 'boolean',
    },
  },
}

export default defineCommand({
  meta: {
    name: 'usage',
    description: 'Show token-efficient usage schema for AI agents',
  },
  args: {},
  run() {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(USAGE_SCHEMA, null, 2))
  },
})
