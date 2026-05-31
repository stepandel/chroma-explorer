import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { getTransformersCacheDir } from '../../electron/transformers-cache'

describe('Transformers cache configuration', () => {
  it('keeps model cache under Electron user data', () => {
    const userDataPath = path.join('/Users/example/Library/Application Support', 'Chroma Explorer')

    expect(getTransformersCacheDir(userDataPath)).toBe(
      path.join(userDataPath, 'transformers-cache')
    )
  })
})
