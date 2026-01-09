import { defineCommand } from 'citty'
import { existsSync } from 'node:fs'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { initState } from '../storage/file.js'

const CLAUDE_MD_SECTION = `<!-- jots:start -->
## Task Management (Jots)

This project uses **jots** for task management.

### Commands
| Command | Description |
|---------|-------------|
| \`jots next\` | Get highest-priority actionable item |
| \`jots context\` | Full state summary (progress, in-progress, blocked) |
| \`jots list [type]\` | List items (epics, tasks, subtasks, all) |
| \`jots list all --deps\` | List all items with dependencies shown |
| \`jots done <id>\` | Mark item as completed |
| \`jots update <id> -s in_progress\` | Mark item as in-progress |
| \`jots update <id> --add-dep <dep>\` | Add a dependency |
| \`jots update <id> --remove-dep <dep>\` | Remove a dependency |
| \`jots add epic "Description"\` | Add a new epic |
| \`jots add task "Desc" -e <epic>\` | Add task to epic |
| \`jots add subtask "Desc" -e <epic> -t <task>\` | Add subtask |
| \`jots add task "Desc" -e <epic> -d "other task"\` | Add task with dependency |

### Key Features
- **Fuzzy matching**: Use partial names instead of IDs (e.g., \`jots done "auth"\` matches "Implement auth")
- **JSON output**: Add \`--json\` to any command for structured output
- **Filtering**: \`jots list tasks -e <epic>\` to filter by parent
- **Dependencies**: Items can depend on other items at the same level (subtasks within same task, tasks within same epic, epics globally). Items with incomplete deps are blocked from \`jots next\`.

### Workflow
1. Run \`jots next\` to see what to work on (skips items with incomplete deps)
2. Run \`jots update <id> -s in_progress\` when starting
3. Run \`jots done <id>\` when complete
4. Work highest priority first (P1 > P2 > P3 > P4 > P5)
<!-- jots:end -->`

const HOOK_SCRIPT = `#!/bin/bash
# Validate jots.json on edit

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

if [[ "$file_path" == *"jots.json" ]]; then
  cd "$CLAUDE_PROJECT_DIR" || exit 0
  output=$(npx jots validate 2>&1)
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "$output" >&2
    exit 2
  fi
fi

exit 0
`

type InitResult = { created: string[]; modified: string[]; skipped: string[] }

function outputError(error: string, json: boolean): void {
  // eslint-disable-next-line no-console
  if (json) console.log(JSON.stringify({ error }))
  else console.error(`Error: ${error}`)
}

async function createJotsFile(cwd: string, force: boolean, result: InitResult): Promise<boolean> {
  const jotsPath = `${cwd}/jots.json`
  if (existsSync(jotsPath) && !force) {
    result.skipped.push('jots.json (already exists)')
    return true
  }

  const initResult = await initState(jotsPath)
  if (initResult.success) {
    result.created.push('jots.json')
    return true
  }

  if (force && existsSync(jotsPath)) {
    const { createEmptyState } = await import('../core/operations.js')
    const { writeState } = await import('../storage/file.js')
    await writeState(createEmptyState(), jotsPath)
    result.created.push('jots.json')
    return true
  }

  return false
}

async function updateClaudeMd(cwd: string, result: InitResult): Promise<void> {
  const claudeMdPath = `${cwd}/CLAUDE.md`
  if (existsSync(claudeMdPath)) {
    const content = await readFile(claudeMdPath, 'utf-8')
    if (content.includes('<!-- jots:start -->')) {
      const updated = content.replace(/<!-- jots:start -->[\s\S]*?<!-- jots:end -->/, CLAUDE_MD_SECTION)
      await writeFile(claudeMdPath, updated, 'utf-8')
      result.modified.push('CLAUDE.md (updated jots section)')
    } else {
      await writeFile(claudeMdPath, content + '\n\n' + CLAUDE_MD_SECTION, 'utf-8')
      result.modified.push('CLAUDE.md (added jots section)')
    }
  } else {
    await writeFile(claudeMdPath, `# Project\n\n${CLAUDE_MD_SECTION}\n`, 'utf-8')
    result.created.push('CLAUDE.md')
  }
}

async function createHook(cwd: string, force: boolean, result: InitResult): Promise<void> {
  const claudeDir = `${cwd}/.claude`
  const hooksDir = `${claudeDir}/hooks`
  if (!existsSync(claudeDir)) await mkdir(claudeDir, { recursive: true })
  if (!existsSync(hooksDir)) await mkdir(hooksDir, { recursive: true })

  const hookPath = `${hooksDir}/validate-jots.sh`
  if (!existsSync(hookPath) || force) {
    await writeFile(hookPath, HOOK_SCRIPT, { mode: 0o755 })
    result.created.push('.claude/hooks/validate-jots.sh')
  }
}

function printResult(result: InitResult): void {
  // eslint-disable-next-line no-console
  console.log('Initialized jots!\n')
  if (result.created.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Created:')
    // eslint-disable-next-line no-console
    for (const f of result.created) console.log(`  ✓ ${f}`)
  }
  if (result.modified.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Modified:')
    // eslint-disable-next-line no-console
    for (const f of result.modified) console.log(`  ✓ ${f}`)
  }
  if (result.skipped.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Skipped:')
    // eslint-disable-next-line no-console
    for (const f of result.skipped) console.log(`  - ${f}`)
  }
  // eslint-disable-next-line no-console
  console.log('\nNext steps:')
  // eslint-disable-next-line no-console
  console.log('  1. Run `jots add epic "Your first epic"` to create an epic')
  // eslint-disable-next-line no-console
  console.log('  2. Run `jots list` to see your tasks')
}

export default defineCommand({
  meta: { name: 'init', description: 'Initialize jots in the current project' },
  args: {
    force: { type: 'boolean', alias: 'f', description: 'Overwrite existing files', default: false },
    'skip-claude': { type: 'boolean', description: 'Skip Claude Code integration', default: false },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    const cwd = process.cwd()
    const result: InitResult = { created: [], modified: [], skipped: [] }

    const jotsOk = await createJotsFile(cwd, args.force as boolean, result)
    if (!jotsOk) {
      outputError('Failed to create jots.json', args.json as boolean)
      process.exit(1)
    }

    if (!args['skip-claude']) {
      await updateClaudeMd(cwd, result)
      await createHook(cwd, args.force as boolean, result)
    }

    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ success: true, ...result }))
    } else {
      printResult(result)
    }
  },
})
