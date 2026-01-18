/**
 * PineconeService - Implementation of VectorDBService for Pinecone
 */

import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone'
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
  PineconeCloud,
  PineconeMetric,
} from './types'
import { VectorDBService, SearchResult } from './vector-db-service'
import { PINECONE_DEFAULTS } from './pinecone-config'
import { EmbeddingGenerator } from './embedding-generator'

// Reserved metadata key for document text
const DOCUMENT_METADATA_KEY = '_document'

/**
 * Parse embedding function config from Pinecone index tags
 * Pinecone indexes can store embedding_model in tags, e.g., { embedding_model: "text-embedding-3-small" }
 */
function parseEmbeddingFunctionFromTags(
  tags: Record<string, string> | undefined
): CollectionInfo['embeddingFunction'] | null {
  if (!tags) return null

  const embeddingModel = tags.embedding_model || tags['embedding-model'] || tags.model
  if (!embeddingModel) return null

  // Map model name to provider
  const modelLower = embeddingModel.toLowerCase()

  // OpenAI models
  if (modelLower.includes('text-embedding') || modelLower.includes('ada')) {
    return {
      name: 'openai',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Cohere models
  if (modelLower.includes('embed-') && (modelLower.includes('english') || modelLower.includes('multilingual'))) {
    return {
      name: 'cohere',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // VoyageAI models
  if (modelLower.includes('voyage')) {
    return {
      name: 'voyageai',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Jina models
  if (modelLower.includes('jina')) {
    return {
      name: 'jina',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Mistral models
  if (modelLower.includes('mistral')) {
    return {
      name: 'mistral',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Google Gemini models
  if (modelLower.includes('gemini') || modelLower.includes('gecko')) {
    return {
      name: 'google-gemini',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Together AI models
  if (modelLower.includes('together') || modelLower.includes('m2-bert')) {
    return {
      name: 'together-ai',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Cloudflare models
  if (modelLower.includes('@cf/') || modelLower.includes('bge-')) {
    return {
      name: 'cloudflare-worker-ai',
      type: 'known',
      config: { model_name: embeddingModel },
    }
  }

  // Default: store as unknown with the model name
  return {
    name: embeddingModel,
    type: 'unknown',
    config: { model_name: embeddingModel },
  }
}

// Display name for the default (empty) namespace
const DEFAULT_NAMESPACE_DISPLAY = '(default)'

/**
 * Convert collection name (display) to namespace (internal)
 * The default namespace is displayed as "(default)" but internally is ""
 */
function collectionToNamespace(collectionName: string): string {
  return collectionName === DEFAULT_NAMESPACE_DISPLAY ? '' : collectionName
}

/**
 * Convert namespace (internal) to collection name (display)
 * Empty namespace is displayed as "(default)"
 */
function namespaceToCollection(namespace: string): string {
  return namespace || DEFAULT_NAMESPACE_DISPLAY
}

/**
 * Convert Pinecone filter syntax to the format expected by the SDK
 * Chroma uses { field: value }, Pinecone uses { field: { $eq: value } }
 */
function convertMetadataFilter(filter: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!filter) return undefined

  const converted: Record<string, any> = {}

  for (const [key, value] of Object.entries(filter)) {
    // If value is already an operator object, keep it
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value)
      if (keys.length > 0 && keys[0].startsWith('$')) {
        converted[key] = value
        continue
      }
    }

    // Simple value - convert to $eq
    converted[key] = { $eq: value }
  }

  return converted
}

/**
 * Extract document text from metadata
 */
function extractDocumentFromMetadata(metadata: RecordMetadata | undefined): string | null {
  if (!metadata) return null
  const doc = metadata[DOCUMENT_METADATA_KEY]
  return typeof doc === 'string' ? doc : null
}

/**
 * Strip the _document key from metadata for display
 * This is extracted to the document field, so we don't need to show it again
 */
function stripDocumentFromMetadata(metadata: RecordMetadata | undefined): Record<string, unknown> | null {
  if (!metadata) return null
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (key !== DOCUMENT_METADATA_KEY) {
      result[key] = value
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

/**
 * Clean metadata for Pinecone - filter out null/undefined values
 * Pinecone's RecordMetadata only accepts: string | number | boolean | string[]
 */
function cleanMetadataForPinecone(metadata: Record<string, unknown> | null | undefined): RecordMetadata {
  const result: RecordMetadata = {}
  if (!metadata) return result

  for (const [key, value] of Object.entries(metadata)) {
    // Skip null/undefined values
    if (value === null || value === undefined) continue

    // Accept valid Pinecone metadata types
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      (Array.isArray(value) && value.every(v => typeof v === 'string'))
    ) {
      result[key] = value as string | number | boolean | string[]
    }
  }

  return result
}

export class PineconeService implements VectorDBService {
  private client: Pinecone | null = null
  private profile: ConnectionProfile | null = null
  private indexCache: Map<string, CollectionInfo> = new Map()
  private embeddingGenerator: EmbeddingGenerator | null = null

  getProfile(): ConnectionProfile | null {
    return this.profile
  }

  async connect(profile: ConnectionProfile): Promise<void> {
    try {
      // Use profile API key, or fall back to global API key from settings
      const apiKey = profile.pineconeApiKey || process.env.PINECONE_API_KEY

      if (!apiKey) {
        throw new Error('Pinecone API key is required. Set it in the connection profile or in Settings.')
      }

      if (!profile.pineconeIndexName) {
        throw new Error('Pinecone Index Name is required. Set it in the connection profile.')
      }

      this.client = new Pinecone({ apiKey })

      // Verify the specified index exists
      const indexesResponse = await this.client.listIndexes()
      const indexExists = (indexesResponse.indexes || []).some(
        idx => idx.name === profile.pineconeIndexName
      )

      if (!indexExists) {
        throw new Error(`Index "${profile.pineconeIndexName}" not found. Available indexes: ${
          (indexesResponse.indexes || []).map(i => i.name).join(', ') || 'none'
        }`)
      }

      // Initialize embedding generator for client-side embeddings
      this.embeddingGenerator = new EmbeddingGenerator()

      this.profile = profile

      console.log(`[Pinecone Service] Connected to index: ${profile.pineconeIndexName}`)
    } catch (error) {
      this.client = null
      this.profile = null
      this.embeddingGenerator = null
      throw error
    }
  }

  /**
   * Get the index object for the profile's configured index
   */
  private getIndex(): Index {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected or index not configured.')
    }
    return this.client.index(this.profile.pineconeIndexName)
  }

  disconnect(): void {
    this.embeddingGenerator?.clearCache()
    this.embeddingGenerator = null
    this.client = null
    this.profile = null
    this.indexCache.clear()
    console.log('[Pinecone Service] Disconnected')
  }

  isConnected(): boolean {
    return this.client !== null
  }

  async listCollections(): Promise<CollectionInfo[]> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const index = this.getIndex()
    const indexName = this.profile.pineconeIndexName

    // Get index info for metadata
    const indexesResponse = await this.client.listIndexes()
    const indexInfo = (indexesResponse.indexes || []).find(i => i.name === indexName)

    if (!indexInfo) {
      throw new Error(`Index "${indexName}" not found.`)
    }

    console.log('indexInfo', JSON.stringify(indexInfo, null, 2))

    // Get index stats to discover namespaces and counts
    const stats = await index.describeIndexStats()
    const dimension = indexInfo.dimension

    // Parse embedding function from index tags
    const tags = indexInfo.tags as Record<string, string> | undefined
    const embeddingFunction = parseEmbeddingFunctionFromTags(tags)
    const embeddingModel = tags?.embedding_model || tags?.['embedding-model'] || tags?.model

    // Build index info for UI
    const pineconeInfo = {
      metric: indexInfo.metric as PineconeMetric,
      host: indexInfo.host,
      cloud: (indexInfo.spec?.serverless?.cloud || 'aws') as PineconeCloud,
      region: indexInfo.spec?.serverless?.region || 'us-east-1',
      namespaces: Object.keys(stats.namespaces || {}),
      embeddingModel,
    }

    const collections: CollectionInfo[] = []
    const namespaces = stats.namespaces || {}
    const namespaceKeys = Object.keys(namespaces)

    if (namespaceKeys.length === 0) {
      // Empty index - show default namespace as collection
      const collection: CollectionInfo = {
        name: DEFAULT_NAMESPACE_DISPLAY,
        id: DEFAULT_NAMESPACE_DISPLAY,
        metadata: null,
        count: 0,
        dimension,
        embeddingFunction,
        pinecone: pineconeInfo,
      }
      collections.push(collection)
      this.indexCache.set(DEFAULT_NAMESPACE_DISPLAY, collection)
    } else {
      // Show each namespace as a collection
      for (const [namespace, nsStats] of Object.entries(namespaces)) {
        const collectionName = namespaceToCollection(namespace)
        const collection: CollectionInfo = {
          name: collectionName,
          id: collectionName,
          metadata: namespace ? { namespace } : null,
          count: nsStats.recordCount || 0,
          dimension,
          embeddingFunction,
          pinecone: pineconeInfo,
        }
        collections.push(collection)
        this.indexCache.set(collectionName, collection)
      }
    }

    return collections
  }

  async createCollection(params: CreateCollectionParams): Promise<CollectionInfo> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    // In Pinecone, "creating a collection" means creating/using a namespace
    // Namespaces are created implicitly when you first upsert data
    // params.name is the namespace name

    const namespaceName = params.name
    const namespace = collectionToNamespace(namespaceName)
    const index = this.getIndex()

    // Get index info for the collection metadata
    const indexInfo = await this.client.describeIndex(this.profile.pineconeIndexName)

    const collection: CollectionInfo = {
      name: namespaceName,
      id: namespaceName,
      metadata: params.metadata || null,
      count: 0,
      dimension: indexInfo.dimension,
      pinecone: {
        metric: indexInfo.metric as PineconeMetric,
        host: indexInfo.host,
        cloud: (indexInfo.spec?.serverless?.cloud || 'aws') as PineconeCloud,
        region: indexInfo.spec?.serverless?.region || 'us-east-1',
        namespaces: [],
      },
    }

    // If a first document is provided, upsert it to create the namespace
    if (params.firstDocument) {
      const ns = index.namespace(namespace)
      const metadata = cleanMetadataForPinecone(params.firstDocument.metadata)
      if (params.firstDocument.document) {
        metadata[DOCUMENT_METADATA_KEY] = params.firstDocument.document
      }

      // For the first document, we need an embedding
      // If not provided, generate one
      let embedding: number[] | undefined

      if (params.firstDocument.document && this.embeddingGenerator) {
        // Get embedding function config from params if available
        const efConfig = params.embeddingFunction ? {
          name: params.embeddingFunction.type,
          type: 'known' as const,
          config: { model_name: params.embeddingFunction.modelName },
        } : null

        embedding = await this.embeddingGenerator.generateEmbedding(
          namespaceName,
          params.firstDocument.document,
          efConfig
        )
      }

      if (embedding) {
        await ns.upsert([{
          id: params.firstDocument.id,
          values: embedding,
          metadata,
        }])
        collection.count = 1
      }
    }

    this.indexCache.set(namespaceName, collection)
    console.log(`[Pinecone Service] Created namespace: ${namespaceName}`)

    return collection
  }

  async deleteCollection(collectionName: string): Promise<void> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const namespace = collectionToNamespace(collectionName)
    const index = this.getIndex()

    // Delete all vectors in the namespace
    await index.namespace(namespace).deleteAll()

    this.indexCache.delete(collectionName)
    console.log(`[Pinecone Service] Deleted namespace: ${collectionName}`)
  }

  async searchDocuments(
    params: SearchDocumentsParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<SearchResult> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const namespace = collectionToNamespace(params.collectionName)
    const index = this.getIndex()
    const ns = index.namespace(namespace)

    // Semantic search with queryText
    if (params.queryText && params.queryText.trim() !== '') {
      return this.semanticSearch(ns, params, embeddingOverride)
    }

    // Fetch by specific IDs
    if (params.ids && params.ids.length > 0) {
      return this.fetchByIds(ns, params.ids)
    }

    // List/paginate documents
    return this.listDocuments(ns, params)
  }

  private async semanticSearch(
    ns: ReturnType<Index['namespace']>,
    params: SearchDocumentsParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<SearchResult> {
    if (!this.embeddingGenerator) {
      throw new Error('Embedding generator not initialized')
    }

    // Get collection info for embedding function config
    const collectionInfo = this.indexCache.get(params.collectionName)
    const efConfig = embeddingOverride
      ? {
          name: embeddingOverride.type,
          type: 'known' as const,
          config: {
            model_name: embeddingOverride.modelName,
            url: embeddingOverride.url,
            account_id: embeddingOverride.accountId,
          },
        }
      : collectionInfo?.embeddingFunction || null

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingGenerator.generateEmbedding(
      params.collectionName,
      params.queryText!,
      efConfig
    )

    const topK = params.nResults || 10
    const filter = convertMetadataFilter(params.metadataFilter)

    const results = await ns.query({
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata: true,
      includeValues: true,
    })

    const documents: DocumentRecord[] = (results.matches || []).map(match => ({
      id: match.id,
      document: extractDocumentFromMetadata(match.metadata),
      metadata: stripDocumentFromMetadata(match.metadata),
      embedding: match.values || null,
      distance: match.score ?? null,
    }))

    return { documents }
  }

  private async fetchByIds(
    ns: ReturnType<Index['namespace']>,
    ids: string[]
  ): Promise<SearchResult> {
    const results = await ns.fetch(ids)

    const documents: DocumentRecord[] = Object.values(results.records || {}).map(record => ({
      id: record.id,
      document: extractDocumentFromMetadata(record.metadata),
      metadata: stripDocumentFromMetadata(record.metadata),
      embedding: record.values || null,
    }))

    return { documents }
  }

  private async listDocuments(
    ns: ReturnType<Index['namespace']>,
    params: SearchDocumentsParams
  ): Promise<SearchResult> {
    const limit = params.limit || 100

    // Use list to get IDs, then fetch to get full records
    const listResult = await ns.listPaginated({
      limit,
      paginationToken: params.paginationToken,
    })

    // Filter out undefined IDs from list result
    const ids = (listResult.vectors || [])
      .map(v => v.id)
      .filter((id): id is string => id !== undefined)

    if (ids.length === 0) {
      return {
        documents: [],
        paginationToken: listResult.pagination?.next,
      }
    }

    // Fetch full records for the IDs
    const fetchResult = await ns.fetch(ids)

    const documents: DocumentRecord[] = ids.map(id => {
      const record = fetchResult.records?.[id]
      return {
        id,
        document: record ? extractDocumentFromMetadata(record.metadata) : null,
        metadata: record ? stripDocumentFromMetadata(record.metadata) : null,
        embedding: record?.values || null,
      }
    })

    return {
      documents,
      paginationToken: listResult.pagination?.next,
    }
  }

  async createDocument(
    params: CreateDocumentParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<void> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const namespace = collectionToNamespace(params.collectionName)
    const index = this.getIndex()
    const ns = index.namespace(namespace)

    // Build metadata with document text (clean for Pinecone compatibility)
    const metadata = cleanMetadataForPinecone(params.metadata)
    if (params.document !== undefined) {
      metadata[DOCUMENT_METADATA_KEY] = params.document
    }

    // Get or generate embedding
    let embedding = params.embedding

    if (!embedding && params.generateEmbedding && params.document) {
      if (!this.embeddingGenerator) {
        throw new Error('Embedding generator not initialized')
      }

      const collectionInfo = this.indexCache.get(params.collectionName)
      const efConfig = embeddingOverride
        ? {
            name: embeddingOverride.type,
            type: 'known' as const,
            config: {
              model_name: embeddingOverride.modelName,
              url: embeddingOverride.url,
              account_id: embeddingOverride.accountId,
            },
          }
        : collectionInfo?.embeddingFunction || null

      embedding = await this.embeddingGenerator.generateEmbedding(
        params.collectionName,
        params.document,
        efConfig
      )
    }

    if (!embedding) {
      throw new Error('Embedding is required. Either provide an embedding or enable generateEmbedding with document text.')
    }

    await ns.upsert([
      {
        id: params.id,
        values: embedding,
        metadata,
      },
    ])

    console.log(`[Pinecone Service] Created document: ${params.id}`)
  }

  async updateDocument(
    params: UpdateDocumentParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<void> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const namespace = collectionToNamespace(params.collectionName)
    const index = this.getIndex()
    const ns = index.namespace(namespace)

    // Build metadata with document text (clean for Pinecone compatibility)
    const metadata = cleanMetadataForPinecone(params.metadata)
    if (params.document !== undefined) {
      metadata[DOCUMENT_METADATA_KEY] = params.document
    }

    // Get or generate embedding
    let embedding = params.embedding

    if (!embedding && params.regenerateEmbedding && params.document) {
      if (!this.embeddingGenerator) {
        throw new Error('Embedding generator not initialized')
      }

      const collectionInfo = this.indexCache.get(params.collectionName)
      const efConfig = embeddingOverride
        ? {
            name: embeddingOverride.type,
            type: 'known' as const,
            config: {
              model_name: embeddingOverride.modelName,
              url: embeddingOverride.url,
              account_id: embeddingOverride.accountId,
            },
          }
        : collectionInfo?.embeddingFunction || null

      embedding = await this.embeddingGenerator.generateEmbedding(
        params.collectionName,
        params.document,
        efConfig
      )
    }

    // Use update if we only have metadata changes (no embedding)
    if (!embedding && Object.keys(metadata).length > 0) {
      await ns.update({
        id: params.documentId,
        metadata,
      })
    } else if (embedding) {
      // Use upsert for full updates with embedding
      await ns.upsert([
        {
          id: params.documentId,
          values: embedding,
          metadata,
        },
      ])
    }

    console.log(`[Pinecone Service] Updated document: ${params.documentId}`)
  }

  async deleteDocuments(params: DeleteDocumentsParams): Promise<void> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const namespace = collectionToNamespace(params.collectionName)
    const index = this.getIndex()
    const ns = index.namespace(namespace)

    await ns.deleteMany(params.ids)

    console.log(`[Pinecone Service] Deleted ${params.ids.length} documents`)
  }

  async createDocumentsBatch(
    params: CreateDocumentsBatchParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<{ createdIds: string[]; errors: string[] }> {
    if (!this.client || !this.profile?.pineconeIndexName) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    const BATCH_SIZE = 100
    const namespace = collectionToNamespace(params.collectionName)
    const index = this.getIndex()
    const ns = index.namespace(namespace)

    const createdIds: string[] = []
    const errors: string[] = []

    // Get embedding function config
    const collectionInfo = this.indexCache.get(params.collectionName)
    const efConfig = embeddingOverride
      ? {
          name: embeddingOverride.type,
          type: 'known' as const,
          config: {
            model_name: embeddingOverride.modelName,
            url: embeddingOverride.url,
            account_id: embeddingOverride.accountId,
          },
        }
      : collectionInfo?.embeddingFunction || null

    // Process in batches
    const totalBatches = Math.ceil(params.documents.length / BATCH_SIZE)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, params.documents.length)
      const batch = params.documents.slice(start, end)

      try {
        const records: Array<{
          id: string
          values: number[]
          metadata: RecordMetadata
        }> = []

        for (const doc of batch) {
          // Clean metadata for Pinecone compatibility
          const metadata = cleanMetadataForPinecone(doc.metadata)
          if (doc.document !== undefined) {
            metadata[DOCUMENT_METADATA_KEY] = doc.document
          }

          // Generate embedding if needed
          let embedding: number[] | undefined

          if (params.generateEmbeddings && doc.document && this.embeddingGenerator) {
            embedding = await this.embeddingGenerator.generateEmbedding(
              params.collectionName,
              doc.document,
              efConfig
            )
          }

          if (!embedding) {
            errors.push(`Document ${doc.id}: Embedding is required`)
            continue
          }

          records.push({
            id: doc.id,
            values: embedding,
            metadata,
          })
        }

        if (records.length > 0) {
          await ns.upsert(records)
          createdIds.push(...records.map(r => r.id))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Batch ${i + 1}: ${message}`)
      }
    }

    return { createdIds, errors }
  }

  async copyCollection(
    params: CopyCollectionParams,
    embeddingOverride: EmbeddingFunctionOverride | null,
    onProgress: (progress: CopyProgress) => void,
    signal?: AbortSignal
  ): Promise<CopyCollectionResult> {
    if (!this.client) {
      throw new Error('Pinecone client not connected. Please connect first.')
    }

    // Pinecone doesn't support direct collection copy - would need to read all vectors and write to new index
    // This is a complex operation that could be very expensive for large indexes
    // For now, return an error indicating this isn't supported

    onProgress({
      phase: 'error',
      totalDocuments: 0,
      processedDocuments: 0,
      message: 'Collection copy is not yet supported for Pinecone indexes',
    })

    return {
      success: false,
      totalDocuments: 0,
      copiedDocuments: 0,
      error: 'Collection copy is not yet supported for Pinecone indexes. Please create a new index and import documents manually.',
    }
  }
}
