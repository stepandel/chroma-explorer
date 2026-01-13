import { ChromaClient, Collection, CloudClient, ChromaClientArgs, Metadata } from 'chromadb'
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
import { EmbeddingFunctionFactory } from './embedding-function-factory'

class ChromaDBService {
  private client: ChromaClient | CloudClient | null = null
  private efFactory: EmbeddingFunctionFactory | null = null
  private profile: ConnectionProfile | null = null
  private collectionsCache: CollectionInfo[] = []

  constructor() {
    // Factory will be initialized when client connects
  }

  getProfile(): ConnectionProfile | null {
    return this.profile
  }

  async connect(profile: ConnectionProfile): Promise<void> {
    try {
      // Auto-detect connection type based on provided fields
      const hasCloudFields = profile.tenant || profile.database

      if (!!hasCloudFields) {
        // Cloud connection using CloudClient
        const cloudConfig = {
          tenant: profile.tenant,
          database: profile.database,
          apiKey: profile.apiKey,
        }

        this.client = new CloudClient(cloudConfig)
      } else {
        // Local or remote connection using ChromaClient
        // Parse the URL to extract host, port, and SSL
        const url = new URL(profile.url)
        const host = url.hostname
        const ssl = url.protocol === 'https:'

        const clientConfig: ChromaClientArgs = {
          host,
          port: url.port ? parseInt(url.port, 10) : 8000,
          ssl,
        }

        this.client = new ChromaClient(clientConfig)
      }

      // Test connection with heartbeat
      await this.client.heartbeat()

      // Initialize embedding function factory
      this.efFactory = new EmbeddingFunctionFactory(this.client)

      // Store profile on successful connection
      this.profile = profile
    } catch (error) {
      this.client = null
      this.efFactory = null
      this.profile = null
      throw error
    }
  }

  disconnect(): void {
    this.efFactory?.clearCache()
    this.efFactory = null
    this.client = null
    this.profile = null
    this.collectionsCache = []
  }

  async listCollections(): Promise<CollectionInfo[]> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    const collectionsList = await this.client.listCollections()

    const collectionsWithCounts = await Promise.all(
      collectionsList.map(async (collection: Collection) => {
        const count = await collection.count()

        // Extract embedding function info from configuration
        // Note: API returns snake_case (embedding_function), client interface uses camelCase
        const config = collection.configuration as any
        const efConfig = config?.embedding_function ?? config?.embeddingFunction
        let embeddingFunction: CollectionInfo['embeddingFunction'] = null

        if (efConfig) {
          if (efConfig.type === 'known') {
            embeddingFunction = {
              name: efConfig.name,
              type: 'known',
              config: efConfig.config as Record<string, unknown> | undefined
            }
          } else if (efConfig.type === 'legacy') {
            embeddingFunction = {
              name: 'legacy',
              type: 'legacy'
            }
          } else {
            embeddingFunction = {
              name: 'unknown',
              type: 'unknown'
            }
          }
        }

        return {
          name: collection.name,
          id: collection.id,
          metadata: collection.metadata ?? null,
          count,
          embeddingFunction,
        }
      })
    )

    // Update cache for searchDocuments to use
    this.collectionsCache = collectionsWithCounts
    return collectionsWithCounts
  }

  async getCollectionDocuments(collectionName: string): Promise<DocumentRecord[]> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    const collection = await this.client.getCollection({ name: collectionName })
    const results = await collection.get()

    // Transform ChromaDB response to our document format
    const documents: DocumentRecord[] = []
    const count = results.ids.length

    for (let i = 0; i < count; i++) {
      documents.push({
        id: results.ids[i],
        document: results.documents?.[i] || null,
        metadata: results.metadatas?.[i] || null,
        embedding: results.embeddings?.[i] || null,
      })
    }

    return documents
  }

  async searchDocuments(
    params: SearchDocumentsParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<DocumentRecord[]> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    // Find the collection's embedding function config from cache
    const collectionInfo = this.collectionsCache.find(c => c.name === params.collectionName)

    // Use override if provided, otherwise fall back to server config
    let efConfig: CollectionInfo['embeddingFunction'] = null
    if (embeddingOverride) {
      // Convert override to the format expected by the factory
      efConfig = {
        name: embeddingOverride.type === 'default' ? 'default' : 'openai',
        type: 'known',
        config: embeddingOverride.type === 'openai'
          ? { model_name: embeddingOverride.modelName }
          : { model_name: embeddingOverride.modelName || 'Xenova/all-MiniLM-L6-v2' }
      }
    } else {
      efConfig = collectionInfo?.embeddingFunction
    }

    // Get the appropriate embedding function for this collection
    const embeddingFunction = await this.efFactory?.getEmbeddingFunction(
      params.collectionName,
      efConfig
    )

    const collection = await this.client.getCollection({
      name: params.collectionName,
      embeddingFunction,
    })

    // If queryText is provided, use semantic search (query method)
    if (params.queryText && params.queryText.trim() !== '') {
      // Use queryTexts parameter - ChromaDB will handle embedding on the server side
      // nResults: 0 means no limit - omit to use ChromaDB's default behavior
      const queryOptions: {
        queryTexts: string[]
        nResults?: number
        where?: Record<string, any>
        include: ('documents' | 'metadatas' | 'embeddings' | 'distances')[]
      } = {
        queryTexts: [params.queryText],
        where: params.metadataFilter,
        include: ['documents', 'metadatas', 'embeddings', 'distances'],
      }
      // Only specify nResults if not "no limit" (0)
      if (params.nResults !== 0) {
        queryOptions.nResults = params.nResults || 10
      }
      const queryResults = await collection.query(queryOptions)

      // Transform query results to DocumentRecord format by mapping over documents[0]
      const documents: DocumentRecord[] = (queryResults.ids?.[0] || []).map((id, i) => ({
        id: queryResults.ids?.[0]?.[i] || '',
        document: queryResults.documents?.[0]?.[i] || null,
        metadata: queryResults.metadatas?.[0]?.[i] || null,
        embedding: queryResults.embeddings?.[0]?.[i] || null,
        distance: queryResults.distances?.[0]?.[i] ?? null,
      }));

      return documents
    } else {
      // Use get method for metadata filtering only
      // nResults: 0 means no limit, omit the limit parameter
      const getOptions: {
        where?: Record<string, any>
        limit?: number
        offset?: number
        include: ('documents' | 'metadatas' | 'embeddings')[]
      } = {
        where: params.metadataFilter,
        offset: params.offset || 0,
        include: ['documents', 'metadatas', 'embeddings'],
      }
      // Only specify limit if not "no limit" (0)
      if (params.nResults !== 0) {
        getOptions.limit = params.limit || 300
      }
      const getResults = await collection.get(getOptions)

      // Transform get results to DocumentRecord format
      const documents: DocumentRecord[] = (getResults.ids || []).map((id, i) => ({
        id,
        document: getResults.documents?.[i] || null,
        metadata: getResults.metadatas?.[i] || null,
        embedding: getResults.embeddings?.[i] || null,
      }));

      return documents
    }
  }

  async updateDocument(
    params: UpdateDocumentParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    // Find the collection's embedding function config from cache
    const collectionInfo = this.collectionsCache.find(c => c.name === params.collectionName)

    // Build embedding function if regeneration is requested
    let efConfig: CollectionInfo['embeddingFunction'] = null
    if (params.regenerateEmbedding && params.document !== undefined) {
      if (embeddingOverride) {
        efConfig = {
          name: embeddingOverride.type === 'default' ? 'default' : 'openai',
          type: 'known',
          config: embeddingOverride.type === 'openai'
            ? { model_name: embeddingOverride.modelName }
            : { model_name: embeddingOverride.modelName || 'Xenova/all-MiniLM-L6-v2' }
        }
      } else {
        efConfig = collectionInfo?.embeddingFunction
      }
    }

    // Get embedding function only if regenerating
    const embeddingFunction = params.regenerateEmbedding
      ? await this.efFactory?.getEmbeddingFunction(params.collectionName, efConfig)
      : undefined

    const collection = await this.client.getCollection({
      name: params.collectionName,
      embeddingFunction,
    })

    // Build update payload
    const updatePayload: {
      ids: string[]
      documents?: string[]
      metadatas?: Metadata[]
      embeddings?: number[][]
      uris?: string[]
    } = {
      ids: [params.documentId],
    }

    // Include document if provided
    if (params.document !== undefined) {
      updatePayload.documents = [params.document]
    }

    // Include metadata if provided
    if (params.metadata !== undefined) {
      updatePayload.metadatas = [params.metadata]
    }

    // Include embedding if provided (only when not regenerating - ChromaDB handles it)
    if (params.embedding !== undefined && !params.regenerateEmbedding) {
      updatePayload.embeddings = [params.embedding]
    }

    await collection.update(updatePayload)
  }

  async createDocument(
    params: CreateDocumentParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    // Find the collection's embedding function config from cache
    const collectionInfo = this.collectionsCache.find(c => c.name === params.collectionName)

    // Build embedding function if generation is requested
    let efConfig: CollectionInfo['embeddingFunction'] = null
    if (params.generateEmbedding && params.document) {
      if (embeddingOverride) {
        efConfig = {
          name: embeddingOverride.type === 'default' ? 'default' : 'openai',
          type: 'known',
          config: embeddingOverride.type === 'openai'
            ? { model_name: embeddingOverride.modelName }
            : { model_name: embeddingOverride.modelName || 'Xenova/all-MiniLM-L6-v2' }
        }
      } else {
        efConfig = collectionInfo?.embeddingFunction
      }
    }

    // Get embedding function only if generating
    const embeddingFunction = params.generateEmbedding
      ? await this.efFactory?.getEmbeddingFunction(params.collectionName, efConfig)
      : undefined

    const collection = await this.client.getCollection({
      name: params.collectionName,
      embeddingFunction,
    })

    // Build add payload
    const addPayload: {
      ids: string[]
      documents?: string[]
      metadatas?: Metadata[]
      embeddings?: number[][]
    } = {
      ids: [params.id],
    }

    // Include document if provided
    if (params.document !== undefined) {
      addPayload.documents = [params.document]
    }

    // Include metadata if provided
    if (params.metadata !== undefined) {
      addPayload.metadatas = [params.metadata]
    }

    // Include embedding if provided (only when not generating - ChromaDB handles it)
    if (params.embedding !== undefined && !params.generateEmbedding) {
      addPayload.embeddings = [params.embedding]
    }

    await collection.add(addPayload as any)
  }

  async deleteDocuments(params: DeleteDocumentsParams): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    const collection = await this.client.getCollection({
      name: params.collectionName,
    })

    await collection.delete({
      ids: params.ids,
    })
  }

  async createDocumentsBatch(
    params: CreateDocumentsBatchParams,
    embeddingOverride?: EmbeddingFunctionOverride | null
  ): Promise<{ createdIds: string[]; errors: string[] }> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    const BATCH_SIZE = 100

    // Find the collection's embedding function config from cache
    const collectionInfo = this.collectionsCache.find(c => c.name === params.collectionName)

    // Build embedding function if generation is requested
    let efConfig: CollectionInfo['embeddingFunction'] = null
    if (params.generateEmbeddings) {
      if (embeddingOverride) {
        efConfig = {
          name: embeddingOverride.type === 'default' ? 'default' : 'openai',
          type: 'known',
          config: embeddingOverride.type === 'openai'
            ? { model_name: embeddingOverride.modelName }
            : { model_name: embeddingOverride.modelName || 'Xenova/all-MiniLM-L6-v2' }
        }
      } else {
        efConfig = collectionInfo?.embeddingFunction
      }
    }

    // Get embedding function only if generating
    const embeddingFunction = params.generateEmbeddings
      ? await this.efFactory?.getEmbeddingFunction(params.collectionName, efConfig)
      : undefined

    const collection = await this.client.getCollection({
      name: params.collectionName,
      embeddingFunction,
    })

    const createdIds: string[] = []
    const errors: string[] = []

    // Process documents in batches
    const totalDocs = params.documents.length
    const totalBatches = Math.ceil(totalDocs / BATCH_SIZE)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, totalDocs)
      const batch = params.documents.slice(start, end)

      try {
        const addPayload: {
          ids: string[]
          documents?: string[]
          metadatas?: Metadata[]
        } = {
          ids: batch.map(d => d.id),
        }

        // Include documents if any have document text
        const documents = batch.map(d => d.document).filter((d): d is string => d !== undefined)
        if (documents.length > 0) {
          addPayload.documents = batch.map(d => d.document || '')
        }

        // Include metadatas if any have metadata
        const metadatas = batch.map(d => d.metadata).filter((m): m is Record<string, unknown> => m !== undefined)
        if (metadatas.length > 0) {
          addPayload.metadatas = batch.map(d => (d.metadata || {}) as Metadata)
        }

        await collection.add(addPayload as any)
        createdIds.push(...batch.map(d => d.id))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Batch ${i + 1}: ${message}`)
      }
    }

    return { createdIds, errors }
  }

  async createCollection(params: CreateCollectionParams): Promise<CollectionInfo> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    // Build embedding function config for the factory
    let efConfig: CollectionInfo['embeddingFunction'] = null
    if (params.embeddingFunction) {
      efConfig = {
        name: params.embeddingFunction.type === 'default' ? 'default' : 'openai',
        type: 'known',
        config: params.embeddingFunction.type === 'openai'
          ? { model_name: params.embeddingFunction.modelName }
          : { model_name: params.embeddingFunction.modelName || 'Xenova/all-MiniLM-L6-v2' }
      }
    }

    // Get the appropriate embedding function
    let embeddingFunction = await this.efFactory?.getEmbeddingFunction(
      params.name,
      efConfig
    )

    // Log warning if embedding function couldn't be created
    if (efConfig && !embeddingFunction) {
      console.warn(
        `[ChromaDB Service] Could not create embedding function for "${params.name}". ` +
        `Collection will be created without an embedding function.`
      )
    }

    // Build collection metadata including HNSW config
    const collectionMetadata: Record<string, unknown> = { ...params.metadata }

    // Add HNSW configuration to metadata if provided
    if (params.hnsw) {
      if (params.hnsw.space) collectionMetadata['hnsw:space'] = params.hnsw.space
      if (params.hnsw.efConstruction !== undefined) collectionMetadata['hnsw:construction_ef'] = params.hnsw.efConstruction
      if (params.hnsw.efSearch !== undefined) collectionMetadata['hnsw:search_ef'] = params.hnsw.efSearch
      if (params.hnsw.maxNeighbors !== undefined) collectionMetadata['hnsw:M'] = params.hnsw.maxNeighbors
      if (params.hnsw.numThreads !== undefined) collectionMetadata['hnsw:num_threads'] = params.hnsw.numThreads
      if (params.hnsw.batchSize !== undefined) collectionMetadata['hnsw:batch_size'] = params.hnsw.batchSize
      if (params.hnsw.syncThreshold !== undefined) collectionMetadata['hnsw:sync_threshold'] = params.hnsw.syncThreshold
      if (params.hnsw.resizeFactor !== undefined) collectionMetadata['hnsw:resize_factor'] = params.hnsw.resizeFactor
    }

    // Create the collection - only pass embeddingFunction if it was successfully created
    const collection = await this.client.createCollection({
      name: params.name,
      embeddingFunction: embeddingFunction,
      metadata: Object.keys(collectionMetadata).length > 0 ? collectionMetadata as Metadata : undefined,
    })

    // Optionally add first document
    if (params.firstDocument) {
      const addPayload: {
        ids: string[]
        documents?: string[]
        metadatas?: Metadata[]
      } = {
        ids: [params.firstDocument.id],
      }

      // Check for document text (allow empty string but not undefined/null)
      if (params.firstDocument.document !== undefined && params.firstDocument.document !== null) {
        addPayload.documents = [params.firstDocument.document]
      }

      if (params.firstDocument.metadata && Object.keys(params.firstDocument.metadata).length > 0) {
        addPayload.metadatas = [params.firstDocument.metadata as Metadata]
      }

      // Only add if we have documents (required by ChromaDB unless providing embeddings)
      if (addPayload.documents && addPayload.documents.length > 0 && addPayload.documents[0]) {
        await collection.add(addPayload as any)
      } else {
        console.warn('[ChromaDB Service] Skipping first document - no document text provided')
      }
    }

    // Return collection info
    const count = await collection.count()
    return {
      name: collection.name,
      id: collection.id,
      metadata: collection.metadata ?? null,
      count,
      embeddingFunction: efConfig,
    }
  }

  async copyCollection(
    params: CopyCollectionParams,
    embeddingOverride: EmbeddingFunctionOverride | null,
    onProgress: (progress: CopyProgress) => void,
    signal?: AbortSignal
  ): Promise<CopyCollectionResult> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    const BATCH_SIZE = 100

    try {
      // Phase 1: Creating target collection
      onProgress({
        phase: 'creating',
        totalDocuments: 0,
        processedDocuments: 0,
        message: 'Creating collection...',
      })

      // Check for cancellation
      if (signal?.aborted) {
        return {
          success: false,
          totalDocuments: 0,
          copiedDocuments: 0,
          error: 'Operation cancelled',
        }
      }

      // Build embedding function config
      let efConfig: CollectionInfo['embeddingFunction'] = null
      if (params.embeddingFunction) {
        efConfig = {
          name: params.embeddingFunction.type === 'default' ? 'default' : 'openai',
          type: 'known',
          config: params.embeddingFunction.type === 'openai'
            ? { model_name: params.embeddingFunction.modelName }
            : { model_name: params.embeddingFunction.modelName || 'Xenova/all-MiniLM-L6-v2' }
        }
      } else if (embeddingOverride) {
        efConfig = {
          name: embeddingOverride.type === 'default' ? 'default' : 'openai',
          type: 'known',
          config: embeddingOverride.type === 'openai'
            ? { model_name: embeddingOverride.modelName }
            : { model_name: embeddingOverride.modelName || 'Xenova/all-MiniLM-L6-v2' }
        }
      }

      // Get embedding function for the new collection
      const embeddingFunction = await this.efFactory?.getEmbeddingFunction(
        params.targetName,
        efConfig
      )

      // Build collection metadata including HNSW config
      const collectionMetadata: Record<string, unknown> = { ...params.metadata }

      if (params.hnsw) {
        if (params.hnsw.space) collectionMetadata['hnsw:space'] = params.hnsw.space
        if (params.hnsw.efConstruction !== undefined) collectionMetadata['hnsw:construction_ef'] = params.hnsw.efConstruction
        if (params.hnsw.efSearch !== undefined) collectionMetadata['hnsw:search_ef'] = params.hnsw.efSearch
        if (params.hnsw.maxNeighbors !== undefined) collectionMetadata['hnsw:M'] = params.hnsw.maxNeighbors
        if (params.hnsw.numThreads !== undefined) collectionMetadata['hnsw:num_threads'] = params.hnsw.numThreads
        if (params.hnsw.batchSize !== undefined) collectionMetadata['hnsw:batch_size'] = params.hnsw.batchSize
        if (params.hnsw.syncThreshold !== undefined) collectionMetadata['hnsw:sync_threshold'] = params.hnsw.syncThreshold
        if (params.hnsw.resizeFactor !== undefined) collectionMetadata['hnsw:resize_factor'] = params.hnsw.resizeFactor
      }

      // Create the target collection
      const targetCollection = await this.client.createCollection({
        name: params.targetName,
        embeddingFunction,
        metadata: Object.keys(collectionMetadata).length > 0 ? collectionMetadata as Metadata : undefined,
      })

      // Phase 2: Fetch source documents
      const sourceCollection = await this.client.getCollection({
        name: params.sourceCollectionName,
      })

      const allDocs = await sourceCollection.get({
        include: ['documents', 'metadatas', 'embeddings'],
      })

      const totalDocuments = allDocs.ids.length

      // If no documents, we're done
      if (totalDocuments === 0) {
        onProgress({
          phase: 'complete',
          totalDocuments: 0,
          processedDocuments: 0,
          message: 'Collection copied (empty)',
        })

        return {
          success: true,
          collectionInfo: {
            name: targetCollection.name,
            id: targetCollection.id,
            metadata: targetCollection.metadata ?? null,
            count: 0,
            embeddingFunction: efConfig,
          },
          totalDocuments: 0,
          copiedDocuments: 0,
        }
      }

      // Phase 3: Copy documents in batches
      const totalBatches = Math.ceil(totalDocuments / BATCH_SIZE)
      let copiedDocuments = 0

      for (let i = 0; i < totalBatches; i++) {
        // Check for cancellation
        if (signal?.aborted) {
          // Delete the partially created collection on cancellation
          try {
            await this.client.deleteCollection({ name: params.targetName })
          } catch {
            // Ignore cleanup errors
          }

          return {
            success: false,
            totalDocuments,
            copiedDocuments,
            error: 'Operation cancelled',
          }
        }

        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, totalDocuments)

        onProgress({
          phase: 'copying',
          totalDocuments,
          processedDocuments: copiedDocuments,
          message: `Copying documents... ${copiedDocuments}/${totalDocuments}`,
        })

        // Build batch add payload
        const batchPayload: {
          ids: string[]
          documents?: (string | null)[]
          metadatas?: (Metadata | null)[]
          embeddings?: (number[] | null)[]
        } = {
          ids: allDocs.ids.slice(start, end),
        }

        // Always include documents and metadatas
        if (allDocs.documents) {
          batchPayload.documents = allDocs.documents.slice(start, end)
        }
        if (allDocs.metadatas) {
          batchPayload.metadatas = allDocs.metadatas.slice(start, end)
        }

        // Include embeddings only if not regenerating
        if (!params.regenerateEmbeddings && allDocs.embeddings) {
          batchPayload.embeddings = allDocs.embeddings.slice(start, end)
        }

        await targetCollection.add(batchPayload as any)
        copiedDocuments = end
      }

      // Phase 4: Complete
      onProgress({
        phase: 'complete',
        totalDocuments,
        processedDocuments: copiedDocuments,
        message: `Copied ${copiedDocuments} documents`,
      })

      const finalCount = await targetCollection.count()

      return {
        success: true,
        collectionInfo: {
          name: targetCollection.name,
          id: targetCollection.id,
          metadata: targetCollection.metadata ?? null,
          count: finalCount,
          embeddingFunction: efConfig,
        },
        totalDocuments,
        copiedDocuments,
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy collection'

      onProgress({
        phase: 'error',
        totalDocuments: 0,
        processedDocuments: 0,
        message,
      })

      return {
        success: false,
        totalDocuments: 0,
        copiedDocuments: 0,
        error: message,
      }
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    await this.client.deleteCollection({ name: collectionName })
  }

  isConnected(): boolean {
    return this.client !== null
  }
}

/**
 * Connection pool for managing multiple ChromaDB connections by profile
 */
class ChromaDBConnectionPool {
  private connections: Map<string, { service: ChromaDBService; refCount: number }> = new Map()

  /**
   * Connect to a profile (or increment refCount if already connected)
   */
  async connect(profileId: string, profile: ConnectionProfile): Promise<ChromaDBService> {
    const existing = this.connections.get(profileId)

    if (existing) {
      // Connection already exists, increment reference count
      existing.refCount++
      console.log(`[ChromaDB Pool] Reusing connection for profile ${profileId} (refCount: ${existing.refCount})`)
      return existing.service
    }

    // Create new connection
    const service = new ChromaDBService()
    await service.connect(profile)

    this.connections.set(profileId, {
      service,
      refCount: 1,
    })

    console.log(`[ChromaDB Pool] Created new connection for profile ${profileId}`)
    return service
  }

  /**
   * Decrement refCount for a profile connection
   * Disconnects and removes if refCount reaches 0
   */
  disconnect(profileId: string): void {
    const connection = this.connections.get(profileId)

    if (!connection) {
      console.warn(`[ChromaDB Pool] Attempted to disconnect unknown profile ${profileId}`)
      return
    }

    connection.refCount--
    console.log(`[ChromaDB Pool] Decremented refCount for profile ${profileId} (refCount: ${connection.refCount})`)

    if (connection.refCount <= 0) {
      connection.service.disconnect()
      this.connections.delete(profileId)
      console.log(`[ChromaDB Pool] Disconnected and removed profile ${profileId}`)
    }
  }

  /**
   * Get an existing connection (without incrementing refCount)
   */
  getConnection(profileId: string): ChromaDBService | null {
    return this.connections.get(profileId)?.service || null
  }

  /**
   * Check if a profile is connected
   */
  isConnected(profileId: string): boolean {
    return this.connections.has(profileId)
  }

  /**
   * Get refCount for a profile
   */
  getRefCount(profileId: string): number {
    return this.connections.get(profileId)?.refCount || 0
  }
}

// Export singleton connection pool
export const chromaDBConnectionPool = new ChromaDBConnectionPool()

// Keep legacy export for backwards compatibility (will be removed)
export const chromaDBService = new ChromaDBService()
