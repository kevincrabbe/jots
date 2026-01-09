import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { State } from '../core/schema.js'
import { validateState } from '../core/validation.js'
import { createEmptyState } from '../core/operations.js'

const DEFAULT_FILENAME = 'jots.json'

export type ReadResult =
  | { success: true; state: State; path: string }
  | { success: false; error: string; path: string }

export type WriteResult = { success: true; path: string } | { success: false; error: string }

/**
 * Find jots.json file, searching up the directory tree
 */
export function findJotsFile(startDir: string = process.cwd()): string | null {
  let dir = startDir

  while (dir) {
    const candidate = `${dir}/${DEFAULT_FILENAME}`
    if (existsSync(candidate)) {
      return candidate
    }

    const parent = dir.substring(0, dir.lastIndexOf('/'))
    if (parent === dir || parent === '') {
      return null
    }
    dir = parent
  }

  return null
}

/**
 * Read and parse jots.json
 */
export async function readState(path?: string): Promise<ReadResult> {
  const resolvedPath = path ?? findJotsFile() ?? `${process.cwd()}/${DEFAULT_FILENAME}`

  if (!existsSync(resolvedPath)) {
    return {
      success: false,
      error: `No jots.json found. Run 'jots init' to create one.`,
      path: resolvedPath,
    }
  }

  try {
    const content = await readFile(resolvedPath, 'utf-8')
    const raw = JSON.parse(content) as unknown

    const validation = validateState(raw)
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed:\n${validation.errors.join('\n')}`,
        path: resolvedPath,
      }
    }

    return { success: true, state: validation.state, path: resolvedPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Failed to read file: ${message}`, path: resolvedPath }
  }
}

/**
 * Write state to jots.json
 */
export async function writeState(state: State, path?: string): Promise<WriteResult> {
  const resolvedPath = path ?? findJotsFile() ?? `${process.cwd()}/${DEFAULT_FILENAME}`

  try {
    const content = JSON.stringify(state, null, 2) + '\n'
    await writeFile(resolvedPath, content, 'utf-8')
    return { success: true, path: resolvedPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Failed to write file: ${message}` }
  }
}

/**
 * Initialize a new jots.json file
 */
export async function initState(path?: string): Promise<WriteResult> {
  const resolvedPath = path ?? `${process.cwd()}/${DEFAULT_FILENAME}`

  if (existsSync(resolvedPath)) {
    return { success: false, error: `File already exists: ${resolvedPath}` }
  }

  const state = createEmptyState()
  return writeState(state, resolvedPath)
}

/**
 * Read state or create empty if not found
 */
export async function readOrCreateState(path?: string): Promise<ReadResult> {
  const result = await readState(path)

  if (result.success) {
    return result
  }

  // If file not found, create it
  if (result.error.includes('No jots.json found')) {
    const initResult = await initState(path)
    if (!initResult.success) {
      return { success: false, error: initResult.error, path: result.path }
    }
    return { success: true, state: createEmptyState(), path: initResult.path }
  }

  return result
}
