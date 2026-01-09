interface ConnectionProfile {
  id: string
  name: string
  url: string
  tenant?: string
  database?: string
  apiKey?: string
  createdAt: number
  lastUsed?: number
}

interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
  dimension?: number | null
  embeddingFunction?: {
    name: string
    type: 'known' | 'legacy' | 'unknown'
    config?: Record<string, unknown>
  } | null
}

interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

interface SearchDocumentsParams {
  collectionName: string
  queryText?: string
  nResults?: number
  metadataFilter?: Record<string, any>
  limit?: number
  offset?: number
}

interface ElectronAPI {
  chromadb: {
    connect: (profileId: string, profile: ConnectionProfile) => Promise<void>
    listCollections: (profileId: string) => Promise<CollectionInfo[]>
    getDocuments: (profileId: string, collectionName: string) => Promise<DocumentRecord[]>
    searchDocuments: (profileId: string, params: SearchDocumentsParams) => Promise<DocumentRecord[]>
  }
  profiles: {
    getAll: () => Promise<ConnectionProfile[]>
    save: (profile: ConnectionProfile) => Promise<void>
    delete: (id: string) => Promise<void>
    getLastActive: () => Promise<string | null>
    setLastActive: (id: string | null) => Promise<void>
  }
  window: {
    createConnection: (profile: ConnectionProfile) => Promise<{ windowId: string }>
    getInfo: () => Promise<{ type: string; windowId?: string; profileId?: string }>
    closeCurrent: () => Promise<void>
    getProfile: (profileId: string) => Promise<ConnectionProfile>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
