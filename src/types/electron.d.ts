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
    connect: (profile: ConnectionProfile) => Promise<void>
    listCollections: () => Promise<CollectionInfo[]>
    getDocuments: (collectionName: string) => Promise<DocumentRecord[]>
    searchDocuments: (params: SearchDocumentsParams) => Promise<DocumentRecord[]>
  }
  profiles: {
    getAll: () => Promise<ConnectionProfile[]>
    save: (profile: ConnectionProfile) => Promise<void>
    delete: (id: string) => Promise<void>
    getLastActive: () => Promise<string | null>
    setLastActive: (id: string | null) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
