import { defineCommand } from 'citty'
import { readState } from '../storage/file.js'
import { lintState } from '../core/validation.js'
import type { LintResult } from '../core/validation.js'

function printWarnings(lint: LintResult): void {
  if (lint.warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.log('')
    // eslint-disable-next-line no-console
    console.log('Warnings:')
    for (const w of lint.warnings) {
      // eslint-disable-next-line no-console
      console.log(`  ⚠️  ${w}`)
    }
  }

  if (lint.suggestions.length > 0) {
    // eslint-disable-next-line no-console
    console.log('')
    // eslint-disable-next-line no-console
    console.log('Suggestions:')
    for (const s of lint.suggestions) {
      // eslint-disable-next-line no-console
      console.log(`  💡 ${s}`)
    }
  }
}

export default defineCommand({
  meta: { name: 'validate', description: 'Validate jots.json schema and check for issues' },
  args: { json: { type: 'boolean', description: 'Output as JSON', default: false } },
  async run({ args }) {
    const result = await readState()

    if (!result.success) {
      if (args.json) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ valid: false, error: result.error }))
      } else {
        console.error(`❌ Validation failed: ${result.error}`)
      }
      process.exit(1)
    }

    const lint = lintState(result.state)

    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ valid: true, path: result.path, warnings: lint.warnings, suggestions: lint.suggestions }))
    } else {
      // eslint-disable-next-line no-console
      console.log(`✅ ${result.path} is valid.`)
      printWarnings(lint)
    }
  },
})
