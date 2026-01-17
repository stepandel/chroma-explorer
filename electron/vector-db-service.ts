/**
 * Abstract interface for vector database services.
 * Implementations: ChromaDBService, PineconeService
 */

import {
  ConnectionProfile,
  CollectionInfo,
  DocumentRecord,
  SearchDocumentsParams,
  UpdateDocumentParams,
  CreateDocumentParams,
  DeleteDocumentsParams,
  CreateDocumentsBatchParams,
  CreateCollectionParams,
  CopyCollectionParams,
  CopyCollectionResult,
  CopyProgress,
  EmbeddingFunctionOverride,
} from './types'

/**
 * Result of a search/list operation that may include pagination info
 */
export interface SearchResult {
  documents: DocumentRecord[]
  paginationToken?: string // For Pinecone pagination
  totalCount?: number // Total available (if known)
}

/**
 * Abstract interface that both ChromaDB and Pinecone services must implement
 */
export interface VectorDBService {
  /**
   * Get the current connection profile
   */
  getProfile(): ConnectionProfile | null

  /**
   * Connect to the database using the provided profile
   */
  connect(profile: ConnectionProfile): Promise<void>

  /**
   * Disconnect from the database and clean up resources
   */
  disconnect(): void

  /**
   * Check if currently connected
   */
  isConnected(): boolean

  /**
   * List all collections/indexes
   * For Pinecone: Returns indexes with their namespaces as separate "collections"
   */
  listCollections(): Promise<CollectionInfo[]>

  /**
   * Create a new collection/index
   */
  createCollection(params: CreateCollectionParams): Promise<CollectionInfo>

  /**
   * Delete a collection/index
   * @param collectionName For Pinecone: can be "indexName" or "indexName::namespace"
   */
  deleteCollection(collectionName: string): Promise<void>

  /**
   * Search documents in a collection
   * - Semantic search: when queryText is provided
   * - Filter by IDs: when ids is provided
   * - List/paginate: when neither queryText nor ids are provided
   */
  searchDocuments(
    params: SearchDocumentsParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<SearchResult>

  /**
   * Create a single document
   */
  createDocument(
    params: CreateDocumentParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<void>

  /**
   * Update an existing document
   */
  updateDocument(
    params: UpdateDocumentParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<void>

  /**
   * Delete documents by their IDs
   */
  deleteDocuments(params: DeleteDocumentsParams): Promise<void>

  /**
   * Create multiple documents in batch
   */
  createDocumentsBatch(
    params: CreateDocumentsBatchParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<{ createdIds: string[]; errors: string[] }>

  /**
   * Copy a collection with its documents
   */
  copyCollection(
    params: CopyCollectionParams,
    embeddingOverride: EmbeddingFunctionOverride | null,
    onProgress: (progress: CopyProgress) => void,
    signal?: AbortSignal
  ): Promise<CopyCollectionResult>
}

/**
 * Factory type for creating VectorDBService instances
 */
export type VectorDBServiceFactory = () => VectorDBService
