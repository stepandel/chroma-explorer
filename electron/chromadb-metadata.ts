import { Collection, Metadata } from 'chromadb'
import {
  CollectionInfo,
  EmbeddingFunctionOverride,
  HNSWConfig,
  JsonRecord,
} from './types'

interface ChromaCollectionConfig {
  embedding_function?: unknown
  embeddingFunction?: unknown
}

interface ChromaEmbeddingConfig {
  name?: unknown
  type?: unknown
  config?: unknown
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function buildEfConfigFromOverride(override: EmbeddingFunctionOverride): CollectionInfo['embeddingFunction'] {
  const config: JsonRecord = {}

  if (override.modelName) config.model_name = override.modelName
  if (override.url) config.url = override.url
  if (override.accountId) config.account_id = override.accountId

  return {
    name: override.type,
    type: 'known',
    config,
  }
}

export function extractEmbeddingFunction(collection: Collection): CollectionInfo['embeddingFunction'] {
  const config = collection.configuration as ChromaCollectionConfig | undefined
  const efConfig = (config?.embedding_function ?? config?.embeddingFunction) as ChromaEmbeddingConfig | undefined

  if (!efConfig) return null

  if (efConfig.type === 'known') {
    return {
      name: typeof efConfig.name === 'string' ? efConfig.name : 'unknown',
      type: 'known',
      config: isRecord(efConfig.config) ? efConfig.config : undefined,
    }
  }

  if (efConfig.type === 'legacy') {
    return { name: 'legacy', type: 'legacy' }
  }

  return { name: 'unknown', type: 'unknown' }
}

export function buildCollectionMetadata(metadata?: JsonRecord, hnsw?: HNSWConfig): Metadata | undefined {
  const collectionMetadata: JsonRecord = { ...metadata }

  if (hnsw?.space) collectionMetadata['hnsw:space'] = hnsw.space
  if (hnsw?.efConstruction !== undefined) collectionMetadata['hnsw:construction_ef'] = hnsw.efConstruction
  if (hnsw?.efSearch !== undefined) collectionMetadata['hnsw:search_ef'] = hnsw.efSearch
  if (hnsw?.maxNeighbors !== undefined) collectionMetadata['hnsw:M'] = hnsw.maxNeighbors
  if (hnsw?.numThreads !== undefined) collectionMetadata['hnsw:num_threads'] = hnsw.numThreads
  if (hnsw?.batchSize !== undefined) collectionMetadata['hnsw:batch_size'] = hnsw.batchSize
  if (hnsw?.syncThreshold !== undefined) collectionMetadata['hnsw:sync_threshold'] = hnsw.syncThreshold
  if (hnsw?.resizeFactor !== undefined) collectionMetadata['hnsw:resize_factor'] = hnsw.resizeFactor

  return Object.keys(collectionMetadata).length > 0 ? collectionMetadata as Metadata : undefined
}

