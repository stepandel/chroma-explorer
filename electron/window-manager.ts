import { BrowserWindow, session } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { ConnectionProfile } from './types'
import { ConnectionWindowData } from './window-types'
import { chromaDBConnectionPool } from './chromadb-service'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Set up Content Security Policy for a window session
 */
function setupCSP(windowSession: Electron.Session): void {
  windowSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self' http: https: ws: wss:",
            "worker-src 'self' blob:",
          ].join('; ')
        ]
      }
    })
  })
}

interface WindowRegistry {
  setup: BrowserWindow | null
  settings: BrowserWindow | null
  connections: Map<string, { window: BrowserWindow; profileId: string }>
}

class WindowManager {
  private registry: WindowRegistry = {
    setup: null,
    settings: null,
    connections: new Map(),
  }

  // Cache profiles for windows (so unsaved profiles can still be used)
  private profileCache: Map<string, ConnectionProfile> = new Map()

  /**
   * Get the URL for a window based on environment
   */
  private getWindowUrl(queryParams: Record<string, string>): string {
    const params = new URLSearchParams(queryParams).toString()

    if (process.env.VITE_DEV_SERVER_URL) {
      return `${process.env.VITE_DEV_SERVER_URL}?${params}`
    }

    // Production: return just the query params, will use loadFile with query option
    return params
  }

  /**
   * Create or focus the setup window
   */
  createSetupWindow(): BrowserWindow {
    // If setup window exists and is not destroyed, focus it
    if (this.registry.setup && !this.registry.setup.isDestroyed()) {
      this.registry.setup.focus()
      this.registry.setup.show()
      return this.registry.setup
    }

    // Create new setup window
    const win = new BrowserWindow({
      width: 800,
      height: 400,
      resizable: false,
      minimizable: false,
      maximizable: false,
      titleBarStyle: 'hiddenInset',
      title: 'Chroma Explorer - Setup',
      center: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // Set up Content Security Policy
    setupCSP(win.webContents.session)

    // Load window content
    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(this.getWindowUrl({ type: 'setup' }))
    } else {
      win.loadFile(path.join(process.env.DIST!, 'index.html'), {
        query: { type: 'setup' },
      })
    }

    // Handle window close
    win.on('closed', () => {
      this.registry.setup = null
    })

    this.registry.setup = win
    return win
  }

  /**
   * Create or focus the settings window
   */
  createSettingsWindow(): BrowserWindow {
    // If settings window exists and is not destroyed, focus it
    if (this.registry.settings && !this.registry.settings.isDestroyed()) {
      this.registry.settings.focus()
      this.registry.settings.show()
      return this.registry.settings
    }

    // Create new settings window
    const win = new BrowserWindow({
      width: 500,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: false,
      titleBarStyle: 'hiddenInset',
      title: 'Settings',
      center: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // Set up Content Security Policy
    setupCSP(win.webContents.session)

    // Load window content
    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(this.getWindowUrl({ type: 'settings' }))
    } else {
      win.loadFile(path.join(process.env.DIST!, 'index.html'), {
        query: { type: 'settings' },
      })
    }

    // Handle window close
    win.on('closed', () => {
      this.registry.settings = null
    })

    this.registry.settings = win
    return win
  }

  /**
   * Get settings window
   */
  getSettingsWindow(): BrowserWindow | null {
    return this.registry.settings && !this.registry.settings.isDestroyed()
      ? this.registry.settings
      : null
  }

  /**
   * Create a new connection window for a profile
   */
  createConnectionWindow(profile: ConnectionProfile): { window: BrowserWindow; windowId: string } {
    const windowId = randomUUID()
    const profileId = profile.id

    // Cache the profile (in case it's not saved to storage yet)
    this.profileCache.set(profileId, profile)

    // Close setup window when creating a connection window
    if (this.registry.setup && !this.registry.setup.isDestroyed()) {
      this.registry.setup.close()
    }

    // Calculate cascade position (offset each window)
    const existingCount = this.registry.connections.size
    const offset = existingCount * 30

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      x: 100 + offset,
      y: 100 + offset,
      titleBarStyle: 'hiddenInset',
      title: `Chroma Explorer - ${profile.name}`,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    // Set up Content Security Policy
    setupCSP(win.webContents.session)

    // Load window content
    if (process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(this.getWindowUrl({
        type: 'connection',
        windowId,
        profileId
      }))
      win.webContents.openDevTools()
    } else {
      win.loadFile(path.join(process.env.DIST!, 'index.html'), {
        query: {
          type: 'connection',
          windowId,
          profileId
        },
      })
    }

    // Handle window close
    win.on('closed', () => {
      // Disconnect from ChromaDB connection pool (decrements refCount)
      chromaDBConnectionPool.disconnect(profileId)

      // Remove from registry
      this.registry.connections.delete(windowId)

      // Clean up profile cache if no other windows are using this profile
      const stillInUse = Array.from(this.registry.connections.values())
        .some(conn => conn.profileId === profileId)
      if (!stillInUse) {
        this.profileCache.delete(profileId)
      }

      // If no connection windows remain, show setup window
      if (this.registry.connections.size === 0) {
        this.createSetupWindow()
      }
    })

    // Store in registry
    this.registry.connections.set(windowId, {
      window: win,
      profileId,
    })

    return { window: win, windowId }
  }

  /**
   * Get all windows using a specific profile
   */
  getWindowsByProfileId(profileId: string): Array<{ windowId: string; window: BrowserWindow }> {
    const windows: Array<{ windowId: string; window: BrowserWindow }> = []

    for (const [windowId, data] of this.registry.connections.entries()) {
      if (data.profileId === profileId && !data.window.isDestroyed()) {
        windows.push({ windowId, window: data.window })
      }
    }

    return windows
  }

  /**
   * Get window data by windowId
   */
  getWindowData(windowId: string): ConnectionWindowData | null {
    const data = this.registry.connections.get(windowId)
    if (!data) return null

    return {
      windowId,
      profileId: data.profileId,
    }
  }

  /**
   * Get profileId for a given windowId
   */
  getProfileId(windowId: string): string | null {
    return this.registry.connections.get(windowId)?.profileId || null
  }

  /**
   * Close a specific window
   */
  closeWindow(windowId: string): void {
    const data = this.registry.connections.get(windowId)
    if (data && !data.window.isDestroyed()) {
      data.window.close()
    }
  }

  /**
   * Get all connection windows
   */
  getAllConnectionWindows(): Array<{ windowId: string; window: BrowserWindow; profileId: string }> {
    const windows: Array<{ windowId: string; window: BrowserWindow; profileId: string }> = []

    for (const [windowId, data] of this.registry.connections.entries()) {
      if (!data.window.isDestroyed()) {
        windows.push({
          windowId,
          window: data.window,
          profileId: data.profileId,
        })
      }
    }

    return windows
  }

  /**
   * Get setup window
   */
  getSetupWindow(): BrowserWindow | null {
    return this.registry.setup && !this.registry.setup.isDestroyed()
      ? this.registry.setup
      : null
  }

  /**
   * Get a cached profile by ID
   */
  getCachedProfile(profileId: string): ConnectionProfile | null {
    return this.profileCache.get(profileId) || null
  }
}

// Export singleton instance
export const windowManager = new WindowManager()
