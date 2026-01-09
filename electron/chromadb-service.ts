import { ChromaClient, Collection, CloudClient, ChromaClientArgs } from 'chromadb'
import {
  ConnectionProfile,
  CollectionInfo,
  DocumentRecord,
  SearchDocumentsParams,
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

  async searchDocuments(params: SearchDocumentsParams): Promise<DocumentRecord[]> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    // Find the collection's embedding function config from cache
    const collectionInfo = this.collectionsCache.find(c => c.name === params.collectionName)
    const efConfig = collectionInfo?.embeddingFunction

    // Get the appropriate embedding function for this collection
    const embeddingFunction = await this.efFactory?.getEmbeddingFunction(
      params.collectionName,
      efConfig
    )

    console.log('embeddingFunction', embeddingFunction)

    const collection = await this.client.getCollection({
      name: params.collectionName,
      embeddingFunction,
    })

    // If queryText is provided, use semantic search (query method)
    if (params.queryText && params.queryText.trim() !== '') {
      // Use queryTexts parameter - ChromaDB will handle embedding on the server side
      const queryResults = await collection.query({
        queryTexts: [params.queryText],
        nResults: params.nResults || 10,
        where: params.metadataFilter,
        include: ['documents', 'metadatas', 'embeddings', 'distances'],
      })

      // Transform query results to DocumentRecord format by mapping over documents[0]
      const documents: DocumentRecord[] = (queryResults.ids?.[0] || []).map((id, i) => ({
        id: queryResults.ids?.[0]?.[i] || '',
        document: queryResults.documents?.[0]?.[i] || null,
        metadata: queryResults.metadatas?.[0]?.[i] || null,
        embedding: queryResults.embeddings?.[0]?.[i] || null,
      }));

      return documents
    } else {
      // Use get method for metadata filtering only
      const getResults = await collection.get({
        where: params.metadataFilter,
        limit: params.limit || 300,
        offset: params.offset || 0,
        include: ['documents', 'metadatas', 'embeddings'],
      })

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
