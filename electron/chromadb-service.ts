import { ChromaClient, Collection, CloudClient, ChromaClientArgs } from 'chromadb'
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed'
import {
  ConnectionProfile,
  CollectionInfo,
  DocumentRecord,
  SearchDocumentsParams,
} from './types'

class ChromaDBService {
  private client: ChromaClient | CloudClient | null = null
  private embedder: DefaultEmbeddingFunction

  constructor() {
    this.embedder = new DefaultEmbeddingFunction()
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
    } catch (error) {
      this.client = null
      throw error
    }
  }

  async listCollections(): Promise<CollectionInfo[]> {
    if (!this.client) {
      throw new Error('ChromaDB client not connected. Please connect first.')
    }

    const collectionsList = await this.client.listCollections()

    const collectionsWithCounts = await Promise.all(
      collectionsList.map(async (collection: Collection) => {
        const count = await collection.count()
        return {
          name: collection.name,
          id: collection.id,
          metadata: collection.metadata,
          count,
        }
      })
    )

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

    const collection = await this.client.getCollection({
      name: params.collectionName,
      embeddingFunction: this.embedder,
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

export const chromaDBService = new ChromaDBService()
