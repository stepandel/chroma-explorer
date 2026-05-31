import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { env as TransformersEnv } from '@huggingface/transformers'

export function getTransformersCacheDir(userDataPath: string): string {
  return path.join(userDataPath, 'transformers-cache')
}

export function configureTransformersCache(): void {
  const cacheDir = getTransformersCacheDir(app.getPath('userData'))
  mkdirSync(cacheDir, { recursive: true })
  TransformersEnv.cacheDir = cacheDir
}
