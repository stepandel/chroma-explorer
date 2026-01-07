import { TabsState } from '../types/tabs'

interface TabsStoreData {
  tabs: TabsState['tabs']
  activeTabId: string
  sidebarCollapsed: boolean
  lastSaveTime: number
}

// Use Electron IPC to interact with electron-store
// The main process will handle the actual store operations

export const tabsPersistence = {
  save: async (state: TabsState): Promise<void> => {
    try {
      const data: TabsStoreData = {
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        sidebarCollapsed: state.sidebarCollapsed,
        lastSaveTime: Date.now(),
      }

      await window.electronAPI.tabs.save(data)
    } catch (error) {
      console.error('Failed to save tabs state:', error)
    }
  },

  load: async (): Promise<TabsState | null> => {
    try {
      const data = await window.electronAPI.tabs.load()

      if (!data || !data.tabs || data.tabs.length === 0) {
        return null
      }

      return {
        tabs: data.tabs,
        activeTabId: data.activeTabId,
        sidebarCollapsed: data.sidebarCollapsed || false,
      }
    } catch (error) {
      console.error('Failed to load tabs state:', error)
      return null
    }
  },

  clear: async (): Promise<void> => {
    try {
      await window.electronAPI.tabs.clear()
    } catch (error) {
      console.error('Failed to clear tabs state:', error)
    }
  },
}
