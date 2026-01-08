import { DocumentFilters } from './filters'

export interface Tab {
  id: string                    // UUID
  collectionName: string        // Collection name
  filters: DocumentFilters      // Query state per tab
  createdAt: number             // Timestamp
  lastAccessed: number          // Timestamp for tracking
}

export interface TabsState {
  tabs: Tab[]
  activeTabId: string
  sidebarCollapsed: boolean
}
