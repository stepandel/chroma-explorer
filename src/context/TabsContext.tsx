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
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  updateTabFilters: (tabId: string, filters: DocumentFilters) => void
  openCollection: (collectionName: string) => void

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
      const { tabs: savedTabs, activeTabId: savedActiveTabId, sidebarCollapsed: savedSidebarCollapsed } = savedTabsData

      setTabs(savedTabs)
      // If only 1 tab, always use that tab's ID regardless of saved activeTabId
      setActiveTabId(savedTabs.length === 1 ? savedTabs[0].id : savedActiveTabId)
      setSidebarCollapsed(savedSidebarCollapsed)
    } else {
      // No saved tabs - start with empty state
      setTabs([])
      setActiveTabId('')
    }

    setIsLoaded(true)
  }, [savedTabsData])

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const filtered = prevTabs.filter(t => t.id !== tabId)

      // If no tabs left, clear active tab
      if (filtered.length === 0) {
        setActiveTabId('')
        return []
      }

      // If only 1 tab left, make it active
      if (filtered.length === 1) {
        setActiveTabId(filtered[0].id)
        return filtered
      }

      // If closing the active tab, switch to another tab
      if (tabId === activeTabId) {
        const closingIndex = prevTabs.findIndex(t => t.id === tabId)
        const nextIndex = closingIndex < filtered.length ? closingIndex : filtered.length - 1
        setActiveTabId(filtered[nextIndex].id)
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

  // Open a collection - create a new tab for it
  const openCollection = useCallback((collectionName: string) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      collectionName,
      filters: getDefaultFilters(),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    }

    setTabs(prevTabs => [...prevTabs, newTab])
    setActiveTabId(newTab.id)
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
    closeTab,
    switchTab,
    updateTabFilters,
    openCollection,
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
