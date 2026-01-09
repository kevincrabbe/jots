/**
 * Generate a short, URL-safe ID for items.
 * Format: 8 character base36 string (lowercase alphanumeric)
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `${timestamp.slice(-4)}${random}`.toLowerCase()
}

/**
 * Get current ISO timestamp
 */
export function timestamp(): string {
  return new Date().toISOString()
}
