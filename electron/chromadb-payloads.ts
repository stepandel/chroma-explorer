import { Collection, Metadata } from 'chromadb'

export interface ChromaAddPayload {
  ids: string[]
  documents?: Array<string | null>
  metadatas?: Array<Metadata | null>
  embeddings?: Array<number[] | null>
}

export async function addToCollection(collection: Collection, payload: ChromaAddPayload): Promise<void> {
  await collection.add(payload as Parameters<Collection['add']>[0])
}

