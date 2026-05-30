import { shell } from 'electron'
import { validateExternalUrl } from './ipc-contract'

export async function openValidatedExternalUrl(value: unknown): Promise<void> {
  await shell.openExternal(validateExternalUrl(value))
}

