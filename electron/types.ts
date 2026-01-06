export interface ConnectionProfile {
  id: string // UUID
  name: string // User-friendly name (e.g., "Production Server")

  // Connection URL (required)
  url: string // e.g., "http://localhost:8000" or "https://api.trychroma.com"

  // Optional fields for remote/cloud connections
  tenant?: string // Chroma Cloud tenant ID
  database?: string // Chroma Cloud database name
  apiKey?: string // API key for authentication

  createdAt: number // Timestamp
  lastUsed?: number // Timestamp
}
