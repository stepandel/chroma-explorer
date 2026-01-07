import { DocumentFilters } from './filters'

export interface Tab {
  id: string                    // UUID
  collectionName: string | null // null = blank search tab
  filters: DocumentFilters      // Query state per tab
  label?: string                // Custom label for blank tabs
  createdAt: number             // Timestamp
  lastAccessed: number          // Timestamp for tracking
}

export interface TabsState {
  tabs: Tab[]
  activeTabId: string
  sidebarCollapsed: boolean
}
