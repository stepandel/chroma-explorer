import { BrowserWindow, Menu, app, shell } from 'electron'
import { windowManager } from './window-manager'
import { connectionStore } from './connection-store'
import { checkForUpdates } from './auto-updater'

// Helper to send menu events to the focused window
function sendToFocusedWindow(channel: string, ...args: any[]) {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send(channel, ...args)
  }
}

// Helper to check if the focused window is a connection window
function isConnectionWindow(): boolean {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (!focusedWindow) return false

  for (const { window } of windowManager.getAllConnectionWindows()) {
    if (window === focusedWindow) {
      return true
    }
  }
  return false
}

export function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
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
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            windowManager.createSetupWindow()
          },
        },
        { type: 'separator' },
        {
          label: 'Recent Connections',
          submenu: [], // Will be populated dynamically
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
          accelerator: 'CmdOrCtrl+D',
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
          click: () => {
            sendToFocusedWindow('menu:show-shortcuts')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Update the Recent Connections submenu dynamically
export function updateRecentConnectionsMenu() {
  const menu = Menu.getApplicationMenu()
  if (!menu) return

  const fileMenu = menu.items.find(item => item.label === 'File')
  if (!fileMenu || !fileMenu.submenu) return

  const recentItem = fileMenu.submenu.items.find(item => item.label === 'Recent Connections')
  if (!recentItem) return

  // Get all saved profiles
  const profiles = connectionStore.getProfiles()
  const lastActiveId = connectionStore.getLastActiveProfileId()

  // Build submenu items
  const submenuItems: Electron.MenuItemConstructorOptions[] = profiles.map(profile => ({
    label: profile.name,
    type: 'normal' as const,
    checked: profile.id === lastActiveId,
    click: () => {
      // Create a connection window for this profile
      windowManager.createConnectionWindow(profile)
    },
  }))

  if (submenuItems.length === 0) {
    submenuItems.push({
      label: 'No Recent Connections',
      enabled: false,
    })
  } else {
    submenuItems.push({ type: 'separator' })
    submenuItems.push({
      label: 'Clear Recent...',
      enabled: false, // Placeholder - profiles are managed in setup window
    })
  }

  // Rebuild the menu with updated recent connections
  // Note: Electron doesn't allow dynamic submenu updates, so we rebuild the entire menu
  const template: Electron.MenuItemConstructorOptions[] = [
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

    // File menu with dynamic recent connections
    {
      label: 'File',
      submenu: [
        {
          label: 'New Connection',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            windowManager.createSetupWindow()
          },
        },
        { type: 'separator' },
        {
          label: 'Recent Connections',
          submenu: submenuItems,
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
          registerAccelerator: false,
        },
        {
          label: 'Paste Documents',
          accelerator: 'CmdOrCtrl+V',
          click: () => {
            sendToFocusedWindow('menu:paste-documents')
          },
          registerAccelerator: false,
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
          accelerator: 'CmdOrCtrl+D',
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
          registerAccelerator: false,
        },
        { type: 'separator' },
        {
          label: 'Delete Selected Documents',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            sendToFocusedWindow('menu:delete-selected')
          },
          registerAccelerator: false,
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
          label: 'Report an Issue...',
          click: async () => {
            await shell.openExternal('https://github.com/anthropics/chroma-explorer/issues')
          },
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            sendToFocusedWindow('menu:show-shortcuts')
          },
        },
      ],
    },
  ]

  const newMenu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(newMenu)
}
