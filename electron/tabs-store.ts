import Store from 'electron-store'

interface TabsStoreData {
  tabs: any[]
  activeTabId: string
  sidebarCollapsed: boolean
  lastSaveTime: number
}

// Use a generic store that can hold multiple window-scoped tab states
const store = new Store<Record<string, TabsStoreData>>()

export const tabsStore = {
  /**
   * Save tab state for a specific window
   */
  save(windowId: string, data: Omit<TabsStoreData, 'lastSaveTime'>): void {
    const key = `tabs:${windowId}`
    store.set(key, {
      ...data,
      lastSaveTime: Date.now(),
    })
  },

  /**
   * Load tab state for a specific window
   */
  load(windowId: string): TabsStoreData | null {
    const key = `tabs:${windowId}`
    const data = store.get(key)

    if (!data || !data.tabs || data.tabs.length === 0) {
      return null
    }

    return data
  },

  /**
   * Clear tab state for a specific window
   */
  clear(windowId: string): void {
    const key = `tabs:${windowId}`
    store.delete(key)
  },

  /**
   * Clear all tab states (for debugging)
   */
  clearAll(): void {
    store.clear()
  },
}
