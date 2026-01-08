import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { Tab, TabsState } from '../types/tabs'
import { DocumentFilters } from '../types/filters'
import { useTabsQuery, useSaveTabsMutation } from '../hooks/useChromaQueries'

interface TabsContextValue {
  // State
  tabs: Tab[]
  activeTabId: string
  activeTab: Tab | null
  sidebarCollapsed: boolean

  // Tab Management
  createTab: (collectionName?: string) => string
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  updateTabFilters: (tabId: string, filters: DocumentFilters) => void

  // UI
  toggleSidebar: () => void

  // Persistence
  loadState: () => Promise<void>
  clearAllTabs: () => Promise<void>
}

const TabsContext = createContext<TabsContextValue | null>(null)

// Helper to get default filters
function getDefaultFilters(): DocumentFilters {
  return {
    queryText: '',
    nResults: 10,
    metadataFilters: [],
  }
}

interface TabsProviderProps {
  windowId: string
  children: ReactNode
}

export function TabsProvider({ windowId, children }: TabsProviderProps) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Use React Query for loading tabs
  const { data: savedTabsData } = useTabsQuery(windowId)
  const saveTabsMutation = useSaveTabsMutation(windowId)

  // Get active tab
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || null
  }, [tabs, activeTabId])

  // Debounced save function
  const debouncedSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout

    return (state: TabsState) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        saveTabsMutation.mutate(state)
      }, 500)
    }
  }, [windowId, saveTabsMutation])

  // Save state whenever it changes
  useEffect(() => {
    if (isLoaded && tabs.length > 0) {
      debouncedSave({ tabs, activeTabId, sidebarCollapsed })
    }
  }, [tabs, activeTabId, sidebarCollapsed, isLoaded, debouncedSave])

  // Load state on mount from React Query
  const loadState = useCallback(async () => {
    if (savedTabsData && savedTabsData.tabs.length > 0) {
      setTabs(savedTabsData.tabs)
      setActiveTabId(savedTabsData.activeTabId)
      setSidebarCollapsed(savedTabsData.sidebarCollapsed)
    }

    setIsLoaded(true)
  }, [savedTabsData])

  // Create a new tab
  const createTab = useCallback((collectionName?: string): string => {
    // Always create a new tab (allows multiple tabs for same collection)
    const newTab: Tab = {
      id: crypto.randomUUID(),
      collectionName: collectionName || null,
      filters: getDefaultFilters(),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    }

    setTabs(prevTabs => [...prevTabs, newTab])
    setActiveTabId(newTab.id)

    return newTab.id
  }, [tabs])

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const filtered = prevTabs.filter(t => t.id !== tabId)

      // If closing the active tab, switch to another tab
      if (tabId === activeTabId) {
        if (filtered.length > 0) {
          // Switch to the next tab, or the previous one if it was the last tab
          const closingIndex = prevTabs.findIndex(t => t.id === tabId)
          const nextIndex = closingIndex < filtered.length ? closingIndex : filtered.length - 1
          setActiveTabId(filtered[nextIndex].id)
        } else {
          // No tabs left - create a blank tab
          const blankTab: Tab = {
            id: crypto.randomUUID(),
            collectionName: null,
            filters: getDefaultFilters(),
            createdAt: Date.now(),
            lastAccessed: Date.now(),
          }
          setActiveTabId(blankTab.id)
          return [blankTab]
        }
      }

      return filtered
    })
  }, [activeTabId])

  // Switch to a different tab
  const switchTab = useCallback((tabId: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId
          ? { ...tab, lastAccessed: Date.now() }
          : tab
      )
    )
    setActiveTabId(tabId)
  }, [])

  // Update tab filters
  const updateTabFilters = useCallback((tabId: string, filters: DocumentFilters) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId
          ? { ...tab, filters, lastAccessed: Date.now() }
          : tab
      )
    )
  }, [])

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  // Clear all tabs and persistence
  const clearAllTabs = useCallback(async () => {
    setTabs([])
    setActiveTabId('')
    await window.electronAPI.tabs.clear(windowId)
  }, [windowId])

  const value: TabsContextValue = {
    tabs,
    activeTabId,
    activeTab,
    sidebarCollapsed,
    createTab,
    closeTab,
    switchTab,
    updateTabFilters,
    toggleSidebar,
    loadState,
    clearAllTabs,
  }

  return (
    <TabsContext.Provider value={value}>
      {children}
    </TabsContext.Provider>
  )
}

export function useTabs() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider')
  }
  return context
}
