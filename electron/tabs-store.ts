import Store from 'electron-store'

interface TabsStoreData {
  tabs: any[]
  activeTabId: string
  sidebarCollapsed: boolean
  lastSaveTime: number
}

const store = new Store<{ tabsData: TabsStoreData }>({
  defaults: {
    tabsData: {
      tabs: [],
      activeTabId: '',
      sidebarCollapsed: false,
      lastSaveTime: 0,
    },
  },
})

export const tabsStore = {
  save(data: Omit<TabsStoreData, 'lastSaveTime'>): void {
    store.set('tabsData', {
      ...data,
      lastSaveTime: Date.now(),
    })
  },

  load(): TabsStoreData | null {
    const data = store.get('tabsData')
    if (!data || !data.tabs || data.tabs.length === 0) {
      return null
    }
    return data
  },

  clear(): void {
    store.set('tabsData', {
      tabs: [],
      activeTabId: '',
      sidebarCollapsed: false,
      lastSaveTime: 0,
    })
  },
}
