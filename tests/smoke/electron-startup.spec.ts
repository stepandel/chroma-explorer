import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

test('Electron app starts and exposes the preload API', async () => {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'chroma-explorer-smoke-'))
  const app = await electron.launch({
    args: ['dist-electron/main.js'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CHROMA_EXPLORER_USER_DATA_DIR: userDataDir,
    },
  })

  try {
    await app.evaluate(async ({ app }) => app.whenReady())
    await expect.poll(async () => {
      return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
    }, { timeout: 10_000 }).toBeGreaterThan(0)

    const window = app.windows()[0] ?? await app.firstWindow({ timeout: 5_000 })
    await window.waitForLoadState('domcontentloaded')
    await expect(window).toHaveTitle(/Chroma Explorer|Settings|Setup/)
    await expect.poll(async () => {
      return window.evaluate(() => typeof window.electronAPI === 'object')
    }).toBe(true)
  } finally {
    await app.close()
  }
})
