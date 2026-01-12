declare global {
  interface EmbeddingFunctionOverride {
    type: 'default' | 'openai'
    modelName?: string
  }

  interface ConnectionProfile {
    id: string
    name: string
    url: string
    tenant?: string
    database?: string
    apiKey?: string
    createdAt: number
    lastUsed?: number
    embeddingOverrides?: Record<string, EmbeddingFunctionOverride>
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

  interface UpdateDocumentParams {
    collectionName: string
    documentId: string
    document?: string | null
    metadata?: Record<string, unknown> | null
    embedding?: number[] | null
    regenerateEmbedding?: boolean
  }

  interface CreateDocumentParams {
    collectionName: string
    id: string
    document?: string
    metadata?: Record<string, unknown>
    embedding?: number[]
    generateEmbedding?: boolean
  }

  interface DeleteDocumentsParams {
    collectionName: string
    ids: string[]
  }

  interface HNSWConfig {
    space?: 'l2' | 'cosine' | 'ip'
    efConstruction?: number
    efSearch?: number
    maxNeighbors?: number
    numThreads?: number
    batchSize?: number
    syncThreshold?: number
    resizeFactor?: number
  }

  interface CreateCollectionParams {
    name: string
    embeddingFunction?: {
      type: 'default' | 'openai'
      modelName?: string
    }
    metadata?: Record<string, unknown>
    hnsw?: HNSWConfig
    firstDocument?: {
      id: string
      document?: string
      metadata?: Record<string, unknown>
    }
  }

  interface ElectronAPI {
    chromadb: {
      connect: (profileId: string, profile: ConnectionProfile) => Promise<void>
      listCollections: (profileId: string) => Promise<CollectionInfo[]>
      getDocuments: (profileId: string, collectionName: string) => Promise<DocumentRecord[]>
      searchDocuments: (profileId: string, params: SearchDocumentsParams) => Promise<DocumentRecord[]>
      updateDocument: (profileId: string, params: UpdateDocumentParams) => Promise<void>
      createDocument: (profileId: string, params: CreateDocumentParams) => Promise<void>
      deleteDocuments: (profileId: string, params: DeleteDocumentsParams) => Promise<void>
      createCollection: (profileId: string, params: CreateCollectionParams) => Promise<CollectionInfo>
      deleteCollection: (profileId: string, collectionName: string) => Promise<void>
    }
    profiles: {
      getAll: () => Promise<ConnectionProfile[]>
      save: (profile: ConnectionProfile) => Promise<void>
      delete: (id: string) => Promise<void>
      getLastActive: () => Promise<string | null>
      setLastActive: (id: string | null) => Promise<void>
      getEmbeddingOverride: (profileId: string, collectionName: string) => Promise<EmbeddingFunctionOverride | null>
      setEmbeddingOverride: (profileId: string, collectionName: string, override: EmbeddingFunctionOverride) => Promise<void>
      clearEmbeddingOverride: (profileId: string, collectionName: string) => Promise<void>
    }
    window: {
      createConnection: (profile: ConnectionProfile) => Promise<{ windowId: string }>
      getInfo: () => Promise<{ type: string; windowId?: string; profileId?: string }>
      closeCurrent: () => Promise<void>
      getProfile: (profileId: string) => Promise<ConnectionProfile>
    }
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
