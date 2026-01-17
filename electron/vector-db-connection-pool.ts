/**
 * Unified connection pool for vector database services.
 * Supports both ChromaDB and Pinecone backends.
 */

import { ConnectionProfile } from './types'
import { VectorDBService } from './vector-db-service'
import { ChromaDBService } from './chromadb-service'
// PineconeService will be imported dynamically to avoid loading it when not needed

interface PooledConnection {
  service: VectorDBService
  refCount: number
}

/**
 * Connection pool that manages VectorDBService instances by profile ID.
 * Uses factory pattern to create the appropriate service based on profile type.
 */
class VectorDBConnectionPool {
  private connections: Map<string, PooledConnection> = new Map()

  /**
   * Connect to a profile (or increment refCount if already connected)
   */
  async connect(profileId: string, profile: ConnectionProfile): Promise<VectorDBService> {
    const existing = this.connections.get(profileId)

    if (existing) {
      // Connection already exists, increment reference count
      existing.refCount++
      console.log(`[VectorDB Pool] Reusing connection for profile ${profileId} (refCount: ${existing.refCount})`)
      return existing.service
    }

    // Create new connection based on profile type
    const service = await this.createService(profile)
    await service.connect(profile)

    this.connections.set(profileId, {
      service,
      refCount: 1,
    })

    console.log(`[VectorDB Pool] Created new ${profile.type || 'chroma'} connection for profile ${profileId}`)
    return service
  }

  /**
   * Create the appropriate service based on profile type
   */
  private async createService(profile: ConnectionProfile): Promise<VectorDBService> {
    const backendType = profile.type || 'chroma'

    if (backendType === 'pinecone') {
      // Dynamically import PineconeService to avoid loading when not needed
      const { PineconeService } = await import('./pinecone-service')
      return new PineconeService()
    }

    // Default to ChromaDB
    return new ChromaDBService()
  }

  /**
   * Decrement refCount for a profile connection
   * Disconnects and removes if refCount reaches 0
   */
  disconnect(profileId: string): void {
    const connection = this.connections.get(profileId)

    if (!connection) {
      console.warn(`[VectorDB Pool] Attempted to disconnect unknown profile ${profileId}`)
      return
    }

    connection.refCount--
    console.log(`[VectorDB Pool] Decremented refCount for profile ${profileId} (refCount: ${connection.refCount})`)

    if (connection.refCount <= 0) {
      connection.service.disconnect()
      this.connections.delete(profileId)
      console.log(`[VectorDB Pool] Disconnected and removed profile ${profileId}`)
    }
  }

  /**
   * Get an existing connection (without incrementing refCount)
   */
  getConnection(profileId: string): VectorDBService | null {
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
export const vectorDBConnectionPool = new VectorDBConnectionPool()
