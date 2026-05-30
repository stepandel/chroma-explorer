import { test, expect, _electron as electron } from '@playwright/test'

test('Electron app starts and exposes the preload API', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  try {
    const window = await app.firstWindow()
    await expect(window).toHaveTitle(/Chroma Explorer|Settings|Setup/)
    await expect.poll(async () => {
      return window.evaluate(() => typeof window.electronAPI === 'object')
    }).toBe(true)
  } finally {
    await app.close()
  }
})

