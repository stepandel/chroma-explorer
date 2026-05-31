import { existsSync, renameSync, rmSync } from 'fs'

export function removeCorruptedStore(storePath: string, logPrefix: string): void {
  if (!existsSync(storePath)) {
    return
  }

  const backupPath = `${storePath}.corrupt-${Date.now()}`

  try {
    renameSync(storePath, backupPath)
    console.warn(`${logPrefix} Moved unreadable store to ${backupPath}`)
  } catch (error) {
    console.warn(`${logPrefix} Could not back up unreadable store, removing it:`, error)
    try {
      rmSync(storePath, { force: true })
    } catch {
      // Ignore deletion errors.
    }
  }
}
