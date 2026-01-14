declare global {
  type EmbeddingFunctionType =
    | 'default'
    | 'openai'
    | 'ollama'
    | 'cohere'
    | 'google-gemini'
    | 'jina'
    | 'mistral'
    | 'voyageai'
    | 'together-ai'
    | 'huggingface-server'
    | 'cloudflare-worker-ai'
    | 'morph'
    | 'chroma-cloud-qwen'
    | 'sentence-transformer'

  interface EmbeddingFunctionOverride {
    type: EmbeddingFunctionType
    modelName?: string
    url?: string // For Ollama, HuggingFace Server
    accountId?: string // For Cloudflare Workers AI
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
    ids?: string[] // Filter by specific IDs (no embedding function needed)
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

  interface CreateDocumentsBatchParams {
    collectionName: string
    documents: Array<{
      id: string
      document?: string
      metadata?: Record<string, unknown>
    }>
    generateEmbeddings?: boolean
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
      type: EmbeddingFunctionType
      modelName?: string
      url?: string // For Ollama, HuggingFace Server
      accountId?: string // For Cloudflare Workers AI
    }
    metadata?: Record<string, unknown>
    hnsw?: HNSWConfig
    firstDocument?: {
      id: string
      document?: string
      metadata?: Record<string, unknown>
    }
  }

  interface CopyCollectionParams {
    sourceCollectionName: string
    targetName: string
    embeddingFunction?: {
      type: EmbeddingFunctionType
      modelName?: string
      url?: string // For Ollama, HuggingFace Server
      accountId?: string // For Cloudflare Workers AI
    }
    hnsw?: HNSWConfig
    metadata?: Record<string, unknown>
    regenerateEmbeddings: boolean
  }

  interface CopyCollectionResult {
    success: boolean
    collectionInfo?: CollectionInfo
    totalDocuments: number
    copiedDocuments: number
    error?: string
  }

  interface CopyProgress {
    phase: 'creating' | 'copying' | 'complete' | 'error' | 'cancelled'
    totalDocuments: number
    processedDocuments: number
    message: string
  }

  interface UpdateInfo {
    version: string
    releaseDate?: string
    releaseNotes?: string | null
  }

  interface UpdateStatus {
    status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    info?: UpdateInfo
    progress?: {
      percent: number
      bytesPerSecond: number
      transferred: number
      total: number
    }
    error?: string
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
      createDocumentsBatch: (profileId: string, params: CreateDocumentsBatchParams) => Promise<{ createdIds: string[]; errors: string[] }>
      createCollection: (profileId: string, params: CreateCollectionParams) => Promise<CollectionInfo>
      deleteCollection: (profileId: string, collectionName: string) => Promise<void>
      copyCollection: (profileId: string, params: CopyCollectionParams) => Promise<CopyCollectionResult>
      onCopyProgress: (callback: (progress: CopyProgress) => void) => () => void
      cancelCopy: (profileId: string) => Promise<void>
    }
    contextMenu: {
      showCollectionMenu: (collectionName: string, options?: { hasCopiedCollection?: boolean }) => void
      showCollectionPanelMenu: (options?: { hasCopiedCollection?: boolean }) => void
      onAction: (callback: (action: { action: string; collectionName: string }) => void) => () => void
      showDocumentMenu: (documentId: string, options?: { hasCopiedDocuments?: boolean }) => void
      showDocumentsPanelMenu: (options?: { hasCopiedDocuments?: boolean }) => void
      onDocumentAction: (callback: (action: { action: string; documentId?: string }) => void) => () => void
      showProfileMenu: (profileId: string) => void
      onProfileAction: (callback: (action: { action: string; profileId: string }) => void) => () => void
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
    settings: {
      getApiKeys: () => Promise<Record<string, string>>
      setApiKeys: (apiKeys: Record<string, string>) => Promise<void>
    }
    shell: {
      openExternal: (url: string) => Promise<void>
    }
    updater: {
      checkForUpdates: () => Promise<UpdateInfo | undefined>
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onStatus: (callback: (status: UpdateStatus) => void) => () => void
    }
    onRefresh: (callback: () => void) => () => void
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
