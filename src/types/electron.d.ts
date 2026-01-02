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

interface ElectronAPI {
  chromadb: {
    connect: (host: string, port: number) => Promise<void>
    listCollections: () => Promise<CollectionInfo[]>
    getDocuments: (collectionName: string) => Promise<DocumentRecord[]>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
