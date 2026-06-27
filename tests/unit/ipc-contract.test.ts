import { describe, expect, it } from 'vitest'
import {
  parseConnectionProfile,
  parseCopyCollectionParams,
  parseCreateCollectionParams,
  parseEmbeddingOverride,
  parseSearchDocumentsParams,
  validateExternalUrl,
} from '../../electron/ipc-contract'

describe('ipc contract validators', () => {
  it('preserves self-hosted auth fields on connection profiles', () => {
    expect(parseConnectionProfile({
      id: 'local',
      name: 'Local',
      connectionType: 'self-hosted',
      url: 'http://localhost:8000',
      authType: 'token',
      authToken: 'secret',
      authTokenHeader: 'x-chroma-token',
      createdAt: 1,
    })).toMatchObject({
      connectionType: 'self-hosted',
      authType: 'token',
      authTokenHeader: 'x-chroma-token',
    })
  })

  it('rejects invalid search payloads before service code runs', () => {
    expect(() => parseSearchDocumentsParams({ collectionName: '', ids: [1] })).toThrow(/collectionName/)
  })

  it('keeps create collection metadata and hnsw config typed', () => {
    expect(parseCreateCollectionParams({
      name: 'docs',
      metadata: { 'hnsw:space': 'cosine' },
      hnsw: { efSearch: 40 },
      regenerateEmbeddings: true,
    })).toMatchObject({
      name: 'docs',
      metadata: { 'hnsw:space': 'cosine' },
      hnsw: { efSearch: 40 },
    })
  })

  it('preserves embedding function URL and account fields', () => {
    expect(parseEmbeddingOverride({
      type: 'huggingface-server',
      modelName: 'custom',
      url: 'https://embeddings.example.com',
    })).toMatchObject({
      type: 'huggingface-server',
      modelName: 'custom',
      url: 'https://embeddings.example.com',
    })

    expect(parseCreateCollectionParams({
      name: 'docs',
      embeddingFunction: {
        type: 'ollama',
        modelName: 'nomic-embed-text',
        url: 'http://localhost:11434',
      },
    }).embeddingFunction).toMatchObject({
      type: 'ollama',
      modelName: 'nomic-embed-text',
      url: 'http://localhost:11434',
    })

    expect(parseCopyCollectionParams({
      sourceCollectionName: 'docs',
      targetName: 'docs-copy',
      regenerateEmbeddings: true,
      embeddingFunction: {
        type: 'cloudflare-worker-ai',
        modelName: '@cf/baai/bge-base-en-v1.5',
        accountId: 'account-123',
      },
    }).embeddingFunction).toMatchObject({
      type: 'cloudflare-worker-ai',
      accountId: 'account-123',
    })
  })

  it('only allows http and https external URLs', () => {
    expect(validateExternalUrl('https://trychroma.com/docs')).toBe('https://trychroma.com/docs')
    expect(() => validateExternalUrl('file:///etc/passwd')).toThrow(/http: or https:/)
  })
})
