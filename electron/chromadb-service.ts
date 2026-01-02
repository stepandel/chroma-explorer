import { ChromaClient, Collection } from 'chromadb'

interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
}

class ChromaDBService {
  private client: ChromaClient | null = null

  async connect(host: string, port: number): Promise<void> {
    try {
      this.client = new ChromaClient({ host, port })
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

  isConnected(): boolean {
    return this.client !== null
  }
}

export const chromaDBService = new ChromaDBService()
