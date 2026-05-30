import { describe, expect, it } from 'vitest'
import {
  parseConnectionProfile,
  parseCreateCollectionParams,
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

  it('only allows http and https external URLs', () => {
    expect(validateExternalUrl('https://trychroma.com/docs')).toBe('https://trychroma.com/docs')
    expect(() => validateExternalUrl('file:///etc/passwd')).toThrow(/http: or https:/)
  })
})

