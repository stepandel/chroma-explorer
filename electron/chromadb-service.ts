import { ChromaClient, Collection, CloudClient, ChromaClientArgs } from 'chromadb'
import { ConnectionProfile } from './types.js'

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

class ChromaDBService {
  private client: ChromaClient | CloudClient | null = null

  async connect(profile: ConnectionProfile): Promise<void> {
    console.log('connect', profile)
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

  isConnected(): boolean {
    return this.client !== null
  }
}

export const chromaDBService = new ChromaDBService()
