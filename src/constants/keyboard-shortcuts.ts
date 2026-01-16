/**
 * Centralized keyboard shortcuts configuration.
 * This is the single source of truth for all keyboard shortcuts in the app.
 *
 * Format: { keys, accelerator, action, category }
 * - keys: Display format for UI (e.g., '⌘N')
 * - accelerator: Electron accelerator format (e.g., 'CmdOrCtrl+N')
 * - action: Human-readable description
 * - category: Grouping for settings display
 */

export interface KeyboardShortcut {
  id: string
  keys: string
  accelerator: string
  action: string
  category: 'general' | 'collections' | 'documents' | 'view' | 'editing'
}

// Helper to check if a keyboard event matches a shortcut
export function matchesShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const accel = shortcut.accelerator.toLowerCase()

  // Parse accelerator
  const wantsMeta = accel.includes('cmdorctrl') || accel.includes('cmd') || accel.includes('meta')
  const wantsShift = accel.includes('shift')
  const wantsAlt = accel.includes('alt') || accel.includes('option')

  // Extract the key (last part after +)
  const parts = accel.split('+')
  let wantsKey = parts[parts.length - 1].trim()

  // Normalize key names
  if (wantsKey === 'backspace') wantsKey = 'backspace'
  if (wantsKey === 'delete') wantsKey = 'delete'
  if (wantsKey === 'return' || wantsKey === 'enter') wantsKey = 'enter'
  if (wantsKey === '/') wantsKey = '/'
  if (wantsKey === ',') wantsKey = ','

  // Get actual key pressed (normalized)
  let actualKey = e.key.toLowerCase()
  if (actualKey === 'backspace') actualKey = 'backspace'
  if (actualKey === 'delete') actualKey = 'delete'
  if (actualKey === 'enter') actualKey = 'enter'

  // Check modifiers
  const hasMeta = e.metaKey || e.ctrlKey
  const hasShift = e.shiftKey
  const hasAlt = e.altKey

  return (
    hasMeta === wantsMeta &&
    hasShift === wantsShift &&
    hasAlt === wantsAlt &&
    actualKey === wantsKey
  )
}

// All keyboard shortcuts - single source of truth
export const SHORTCUTS: Record<string, KeyboardShortcut> = {
  // General
  NEW_CONNECTION: {
    id: 'new-connection',
    keys: '⌘N',
    accelerator: 'CmdOrCtrl+N',
    action: 'New Connection',
    category: 'general',
  },
  SETTINGS: {
    id: 'settings',
    keys: '⌘,',
    accelerator: 'CmdOrCtrl+,',
    action: 'Settings',
    category: 'general',
  },
  REFRESH: {
    id: 'refresh',
    keys: '⌘R',
    accelerator: 'CmdOrCtrl+R',
    action: 'Refresh Data',
    category: 'general',
  },
  CLOSE_WINDOW: {
    id: 'close-window',
    keys: '⌘W',
    accelerator: 'CmdOrCtrl+W',
    action: 'Close Window',
    category: 'general',
  },

  // Collections
  NEW_COLLECTION: {
    id: 'new-collection',
    keys: '⌘⇧N',
    accelerator: 'CmdOrCtrl+Shift+N',
    action: 'New Collection',
    category: 'collections',
  },
  PASTE_COLLECTION: {
    id: 'paste-collection',
    keys: '⌘V',
    accelerator: 'CmdOrCtrl+V',
    action: 'Paste Collection',
    category: 'collections',
  },

  // Documents
  NEW_DOCUMENT: {
    id: 'new-document',
    keys: '⌘D',
    accelerator: 'CmdOrCtrl+D',
    action: 'New Document',
    category: 'documents',
  },
  COPY_DOCUMENTS: {
    id: 'copy-documents',
    keys: '⌘C',
    accelerator: 'CmdOrCtrl+C',
    action: 'Copy Documents',
    category: 'documents',
  },
  PASTE_DOCUMENTS: {
    id: 'paste-documents',
    keys: '⌘V',
    accelerator: 'CmdOrCtrl+V',
    action: 'Paste Documents',
    category: 'documents',
  },
  DELETE_DOCUMENTS: {
    id: 'delete-documents',
    keys: '⌘⌫',
    accelerator: 'CmdOrCtrl+Backspace',
    action: 'Delete Selected',
    category: 'documents',
  },
  SELECT_ALL_DOCUMENTS: {
    id: 'select-all-documents',
    keys: '⌘⇧A',
    accelerator: 'CmdOrCtrl+Shift+A',
    action: 'Select All Documents',
    category: 'documents',
  },

  // View
  TOGGLE_LEFT_PANEL: {
    id: 'toggle-left-panel',
    keys: '⌘1',
    accelerator: 'CmdOrCtrl+1',
    action: 'Toggle Collections Panel',
    category: 'view',
  },
  TOGGLE_RIGHT_PANEL: {
    id: 'toggle-right-panel',
    keys: '⌘2',
    accelerator: 'CmdOrCtrl+2',
    action: 'Toggle Details Panel',
    category: 'view',
  },
  FOCUS_SEARCH: {
    id: 'focus-search',
    keys: '⌘F',
    accelerator: 'CmdOrCtrl+F',
    action: 'Focus Search',
    category: 'view',
  },
  CLEAR_FILTERS: {
    id: 'clear-filters',
    keys: '⌘⇧F',
    accelerator: 'CmdOrCtrl+Shift+F',
    action: 'Clear Filters',
    category: 'view',
  },

  // Editing
  SAVE: {
    id: 'save',
    keys: '⌘S',
    accelerator: 'CmdOrCtrl+S',
    action: 'Save / Confirm',
    category: 'editing',
  },
  SAVE_ENTER: {
    id: 'save-enter',
    keys: '⌘↵',
    accelerator: 'CmdOrCtrl+Return',
    action: 'Save / Confirm',
    category: 'editing',
  },
  CANCEL: {
    id: 'cancel',
    keys: 'Esc',
    accelerator: 'Escape',
    action: 'Cancel',
    category: 'editing',
  },
  UNDO: {
    id: 'undo',
    keys: '⌘Z',
    accelerator: 'CmdOrCtrl+Z',
    action: 'Undo / Cancel',
    category: 'editing',
  },
  KEYBOARD_SHORTCUTS: {
    id: 'keyboard-shortcuts',
    keys: '⌘/',
    accelerator: 'CmdOrCtrl+/',
    action: 'Keyboard Shortcuts',
    category: 'general',
  },
} as const

// Get shortcuts grouped by category for display
export function getShortcutsByCategory(): Array<{
  category: string
  label: string
  shortcuts: KeyboardShortcut[]
}> {
  const categoryLabels: Record<string, string> = {
    general: 'General',
    collections: 'Collections',
    documents: 'Documents',
    view: 'View',
    editing: 'Editing',
  }

  const categoryOrder = ['general', 'collections', 'documents', 'view', 'editing']
  const grouped: Record<string, KeyboardShortcut[]> = {}

  // Group shortcuts by category
  Object.values(SHORTCUTS).forEach(shortcut => {
    if (!grouped[shortcut.category]) {
      grouped[shortcut.category] = []
    }
    grouped[shortcut.category].push(shortcut)
  })

  // Return in order, removing duplicates (same keys shown once)
  return categoryOrder
    .filter(cat => grouped[cat]?.length > 0)
    .map(cat => {
      // Remove duplicate key displays within same category
      const seen = new Set<string>()
      const unique = grouped[cat].filter(s => {
        const key = `${s.keys}-${s.action}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return {
        category: cat,
        label: categoryLabels[cat],
        shortcuts: unique,
      }
    })
}
