import { BrowserWindow, Menu, app, shell } from 'electron'
import { windowManager } from './window-manager'
import { connectionStore } from './connection-store'
import { checkForUpdates } from './auto-updater'
import { settingsStore, Theme } from './settings-store'

// Helper to send menu events to the focused window
function sendToFocusedWindow(channel: string, ...args: unknown[]) {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send(channel, ...args)
  }
}

// Helper to set theme and broadcast to all windows
function setThemeAndBroadcast(theme: Theme) {
  settingsStore.setTheme(theme)
  // Broadcast to all windows
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('settings:theme-changed', theme)
  })
  // Rebuild menu to update checkmarks
  updateThemeMenu()
}

/**
 * Build the Theme submenu items
 */
function buildThemeSubmenu(): Electron.MenuItemConstructorOptions[] {
  const currentTheme = settingsStore.getTheme()

  return [
    {
      label: 'Light',
      type: 'radio',
      checked: currentTheme === 'light',
      click: () => setThemeAndBroadcast('light'),
    },
    {
      label: 'Dark',
      type: 'radio',
      checked: currentTheme === 'dark',
      click: () => setThemeAndBroadcast('dark'),
    },
    {
      label: 'System',
      type: 'radio',
      checked: currentTheme === 'system',
      click: () => setThemeAndBroadcast('system'),
    },
  ]
}

/**
 * Build the Recent Connections submenu items
 */
function buildRecentConnectionsSubmenu(): Electron.MenuItemConstructorOptions[] {
  const profiles = connectionStore.getProfiles()
  const lastActiveId = connectionStore.getLastActiveProfileId()

  if (profiles.length === 0) {
    return [{ label: 'No Recent Connections', enabled: false }]
  }

  const items: Electron.MenuItemConstructorOptions[] = profiles.map(profile => ({
    label: profile.name,
    type: 'normal' as const,
    checked: profile.id === lastActiveId,
    click: () => {
      windowManager.createConnectionWindow(profile)
    },
  }))

  items.push({ type: 'separator' })
  items.push({
    label: 'Clear Recent...',
    enabled: false, // Placeholder - profiles are managed in setup window
  })

  return items
}

/**
 * Build the complete menu template.
 * This is the single source of truth for the application menu structure.
 */
function buildMenuTemplate(): Electron.MenuItemConstructorOptions[] {
  return [
    // App menu (macOS)
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            windowManager.createSettingsWindow()
          },
        },
        {
          label: 'Check for Updates...',
          click: () => {
            checkForUpdates()
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Connection',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            windowManager.createSetupWindow()
          },
        },
        { type: 'separator' },
        {
          label: 'Recent Connections',
          submenu: buildRecentConnectionsSubmenu(),
        },
        { type: 'separator' },
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Copy Documents',
          accelerator: 'CmdOrCtrl+C',
          click: () => {
            sendToFocusedWindow('menu:copy-documents')
          },
          registerAccelerator: false, // Don't override system copy
        },
        {
          label: 'Paste Documents',
          accelerator: 'CmdOrCtrl+V',
          click: () => {
            sendToFocusedWindow('menu:paste-documents')
          },
          registerAccelerator: false, // Don't override system paste
        },
        { type: 'separator' },
        {
          label: 'Delete Selected',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            sendToFocusedWindow('menu:delete-selected')
          },
        },
        { type: 'separator' },
        { role: 'selectAll' },
        {
          label: 'Select All Documents',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            sendToFocusedWindow('menu:select-all-documents')
          },
        },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Refresh Data',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            sendToFocusedWindow('app:refresh')
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle Collections Panel',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            sendToFocusedWindow('menu:toggle-left-panel')
          },
        },
        {
          label: 'Toggle Details Panel',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            sendToFocusedWindow('menu:toggle-right-panel')
          },
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: buildThemeSubmenu(),
        },
        { type: 'separator' },
        {
          label: 'Focus Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            sendToFocusedWindow('menu:focus-search')
          },
        },
        {
          label: 'Clear Filters',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            sendToFocusedWindow('menu:clear-filters')
          },
        },
        { type: 'separator' },
        {
          label: 'Reload Window',
          accelerator: 'CmdOrCtrl+Shift+R',
          role: 'reload',
        },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Alt+R' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Collection menu
    {
      label: 'Collection',
      submenu: [
        {
          label: 'New Collection...',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            sendToFocusedWindow('menu:new-collection')
          },
        },
        { type: 'separator' },
        {
          label: 'Duplicate Collection',
          click: () => {
            sendToFocusedWindow('menu:duplicate-collection')
          },
        },
        {
          label: 'Rename Collection',
          click: () => {
            sendToFocusedWindow('menu:rename-collection')
          },
        },
        { type: 'separator' },
        {
          label: 'Delete Collection',
          click: () => {
            sendToFocusedWindow('menu:delete-collection')
          },
        },
        { type: 'separator' },
        {
          label: 'Copy Collection',
          click: () => {
            sendToFocusedWindow('menu:copy-collection')
          },
        },
        {
          label: 'Paste Collection',
          click: () => {
            sendToFocusedWindow('menu:paste-collection')
          },
        },
      ],
    },

    // Document menu
    {
      label: 'Document',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            sendToFocusedWindow('menu:new-document')
          },
        },
        { type: 'separator' },
        {
          label: 'Edit Selected Document',
          accelerator: 'Return',
          click: () => {
            sendToFocusedWindow('menu:edit-document')
          },
          registerAccelerator: false, // Don't override return key globally
        },
        { type: 'separator' },
        {
          label: 'Delete Selected Documents',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            sendToFocusedWindow('menu:delete-selected')
          },
          registerAccelerator: false, // Already registered in Edit menu
        },
        { type: 'separator' },
        {
          label: 'Configure Embedding Function...',
          click: () => {
            sendToFocusedWindow('menu:configure-embedding')
          },
        },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: 'Disconnect',
          click: () => {
            sendToFocusedWindow('menu:disconnect')
          },
        },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' },
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Chroma Documentation',
          click: async () => {
            await shell.openExternal('https://docs.trychroma.com/')
          },
        },
        {
          label: 'Chroma Website',
          click: async () => {
            await shell.openExternal('https://www.trychroma.com/')
          },
        },
        { type: 'separator' },
        {
          label: 'Chroma Explorer Website',
          click: async () => {
            await shell.openExternal('https://chroma-explorer.com/')
          },
        },
        {
          label: 'Report an Issue...',
          click: async () => {
            await shell.openExternal('https://github.com/stepandel/chroma-explorer/issues')
          },
        },
        {
          label: 'Propose a Feature...',
          click: async () => {
            await shell.openExternal('https://github.com/stepandel/chroma-explorer/issues')
          },
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            windowManager.createSettingsWindow('shortcuts')
          },
        },
      ],
    },
  ]
}

/**
 * Create the initial application menu
 */
export function createApplicationMenu() {
  const template = buildMenuTemplate()
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Update the menu (rebuilds with current recent connections)
 * Call this when profiles change to refresh the Recent Connections submenu
 */
export function updateRecentConnectionsMenu() {
  // Simply rebuild the entire menu - this ensures Recent Connections is fresh
  const template = buildMenuTemplate()
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Update the menu to reflect the current theme selection
 * Call this when theme changes to update the radio button checkmarks
 */
export function updateThemeMenu() {
  // Rebuild the entire menu to update theme radio buttons
  const template = buildMenuTemplate()
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
