interface CollectionInfo {
  name: string
  id: string
  metadata: Record<string, unknown> | null
  count: number
}

interface ElectronAPI {
  chromadb: {
    connect: (host: string, port: number) => Promise<void>
    listCollections: () => Promise<CollectionInfo[]>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
