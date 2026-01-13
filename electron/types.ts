import { Metadata } from "chromadb"

export interface EmbeddingFunctionOverride {
  type: 'default' | 'openai'
  modelName?: string // e.g., 'text-embedding-3-large', 'Xenova/all-MiniLM-L6-v2'
}

export interface ConnectionProfile {
  id: string // UUID
  name: string // User-friendly name (e.g., "Production Server")

  // Connection URL (required)
  url: string // e.g., "http://localhost:8000" or "https://api.trychroma.com"

  // Optional fields for remote/cloud connections
  tenant?: string // Chroma Cloud tenant ID
  database?: string // Chroma Cloud database name
  apiKey?: string // API key for authentication

  createdAt: number // Timestamp
  lastUsed?: number // Timestamp

  // Embedding function overrides per collection
  embeddingOverrides?: Record<string, EmbeddingFunctionOverride>
}

export interface CollectionInfo {
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

export interface DocumentRecord {
  id: string
  document: string | null
  metadata: Record<string, unknown> | null
  embedding: number[] | null
}

export interface SearchDocumentsParams {
  collectionName: string
  queryText?: string // Triggers semantic search
  nResults?: number // Max results (default: 10)
  metadataFilter?: Record<string, any> // Where clause
  limit?: number // For get() pagination
  offset?: number // For get() pagination
  ids?: string[] // Fetch specific documents by ID (ignores other filters when set)
}

export interface UpdateDocumentParams {
  collectionName: string
  documentId: string
  document?: string
  metadata?: Metadata
  embedding?: number[]
  regenerateEmbedding?: boolean // If true, regenerate embedding from document text
}

export interface CreateDocumentParams {
  collectionName: string
  id: string
  document?: string
  metadata?: Metadata
  embedding?: number[]
  generateEmbedding?: boolean // If true, generate embedding from document text
}

export interface DeleteDocumentsParams {
  collectionName: string
  ids: string[]
}

export interface HNSWConfig {
  space?: 'l2' | 'cosine' | 'ip'
  efConstruction?: number
  efSearch?: number
  maxNeighbors?: number
  numThreads?: number
  batchSize?: number
  syncThreshold?: number
  resizeFactor?: number
}

export interface CreateCollectionParams {
  name: string
  embeddingFunction?: {
    type: 'default' | 'openai'
    modelName?: string
  }
  metadata?: Record<string, unknown>
  hnsw?: HNSWConfig
  // Optional: create first document in same call
  firstDocument?: {
    id: string
    document?: string
    metadata?: Record<string, unknown>
  }
}

export interface CopyCollectionParams {
  sourceCollectionName: string
  targetName: string
  embeddingFunction?: {
    type: 'default' | 'openai'
    modelName?: string
  }
  hnsw?: HNSWConfig
  metadata?: Record<string, unknown>
  regenerateEmbeddings: boolean
}

export interface CopyCollectionResult {
  success: boolean
  collectionInfo?: CollectionInfo
  totalDocuments: number
  copiedDocuments: number
  error?: string
}

export interface CopyProgress {
  phase: 'creating' | 'copying' | 'complete' | 'error' | 'cancelled'
  totalDocuments: number
  processedDocuments: number
  message: string
}
