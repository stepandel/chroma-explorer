export type EmbeddingFunctionType =
  | 'default'
  | 'openai'
  | 'ollama'
  | 'cohere'
  | 'google-gemini'
  | 'jina'
  | 'mistral'
  | 'voyageai'
  | 'together-ai'
  | 'huggingface-server'
  | 'cloudflare-worker-ai'

export interface EmbeddingFunctionConfig {
  id: string
  label: string
  type: EmbeddingFunctionType
  modelName: string
  dimensions: number | null // null means variable/unknown
  url?: string // For Ollama, HuggingFace Server
  accountId?: string // For Cloudflare Workers AI
  group: string // For UI grouping
}

export const EMBEDDING_FUNCTIONS: EmbeddingFunctionConfig[] = [
  // Default (Local)
  {
    id: 'default',
    label: 'Default (MiniLM)',
    type: 'default',
    modelName: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    group: 'Local',
  },

  // Ollama (Local)
  {
    id: 'ollama-nomic',
    label: 'Ollama (nomic-embed-text)',
    type: 'ollama',
    modelName: 'nomic-embed-text',
    dimensions: 768,
    url: 'http://localhost:11434',
    group: 'Local',
  },
  {
    id: 'ollama-mxbai',
    label: 'Ollama (mxbai-embed-large)',
    type: 'ollama',
    modelName: 'mxbai-embed-large',
    dimensions: 1024,
    url: 'http://localhost:11434',
    group: 'Local',
  },
  {
    id: 'ollama-all-minilm',
    label: 'Ollama (all-minilm)',
    type: 'ollama',
    modelName: 'all-minilm',
    dimensions: 384,
    url: 'http://localhost:11434',
    group: 'Local',
  },

  // HuggingFace Server (Self-hosted)
  {
    id: 'huggingface-server',
    label: 'HuggingFace Server',
    type: 'huggingface-server',
    modelName: 'custom',
    dimensions: null,
    url: '',
    group: 'Local',
  },

  // OpenAI
  {
    id: 'openai-3-small',
    label: 'OpenAI 3-Small',
    type: 'openai',
    modelName: 'text-embedding-3-small',
    dimensions: 1536,
    group: 'OpenAI',
  },
  {
    id: 'openai-3-large',
    label: 'OpenAI 3-Large',
    type: 'openai',
    modelName: 'text-embedding-3-large',
    dimensions: 3072,
    group: 'OpenAI',
  },
  {
    id: 'openai-ada',
    label: 'OpenAI Ada (legacy)',
    type: 'openai',
    modelName: 'text-embedding-ada-002',
    dimensions: 1536,
    group: 'OpenAI',
  },

  // Cohere
  {
    id: 'cohere-embed-v3',
    label: 'Cohere Embed v3',
    type: 'cohere',
    modelName: 'embed-english-v3.0',
    dimensions: 1024,
    group: 'Cohere',
  },
  {
    id: 'cohere-embed-v3-multilingual',
    label: 'Cohere Embed v3 Multilingual',
    type: 'cohere',
    modelName: 'embed-multilingual-v3.0',
    dimensions: 1024,
    group: 'Cohere',
  },
  {
    id: 'cohere-embed-v3-light',
    label: 'Cohere Embed v3 Light',
    type: 'cohere',
    modelName: 'embed-english-light-v3.0',
    dimensions: 384,
    group: 'Cohere',
  },

  // Google Gemini
  {
    id: 'google-gemini-embedding',
    label: 'Google Gemini Embedding',
    type: 'google-gemini',
    modelName: 'text-embedding-004',
    dimensions: 768,
    group: 'Google',
  },

  // Jina
  {
    id: 'jina-embeddings-v3',
    label: 'Jina Embeddings v3',
    type: 'jina',
    modelName: 'jina-embeddings-v3',
    dimensions: 1024,
    group: 'Jina',
  },
  {
    id: 'jina-embeddings-v2-base',
    label: 'Jina Embeddings v2 Base',
    type: 'jina',
    modelName: 'jina-embeddings-v2-base-en',
    dimensions: 768,
    group: 'Jina',
  },

  // Mistral
  {
    id: 'mistral-embed',
    label: 'Mistral Embed',
    type: 'mistral',
    modelName: 'mistral-embed',
    dimensions: 1024,
    group: 'Mistral',
  },

  // VoyageAI
  {
    id: 'voyage-3',
    label: 'Voyage 3',
    type: 'voyageai',
    modelName: 'voyage-3',
    dimensions: 1024,
    group: 'Voyage AI',
  },
  {
    id: 'voyage-3-lite',
    label: 'Voyage 3 Lite',
    type: 'voyageai',
    modelName: 'voyage-3-lite',
    dimensions: 512,
    group: 'Voyage AI',
  },
  {
    id: 'voyage-code-3',
    label: 'Voyage Code 3',
    type: 'voyageai',
    modelName: 'voyage-code-3',
    dimensions: 1024,
    group: 'Voyage AI',
  },

  // Together AI
  {
    id: 'together-m2-bert',
    label: 'Together M2-BERT',
    type: 'together-ai',
    modelName: 'togethercomputer/m2-bert-80M-8k-retrieval',
    dimensions: 768,
    group: 'Together AI',
  },

  // Cloudflare Workers AI
  {
    id: 'cloudflare-bge-base',
    label: 'Cloudflare BGE Base',
    type: 'cloudflare-worker-ai',
    modelName: '@cf/baai/bge-base-en-v1.5',
    dimensions: 768,
    group: 'Cloudflare',
  },
  {
    id: 'cloudflare-bge-small',
    label: 'Cloudflare BGE Small',
    type: 'cloudflare-worker-ai',
    modelName: '@cf/baai/bge-small-en-v1.5',
    dimensions: 384,
    group: 'Cloudflare',
  },
  {
    id: 'cloudflare-bge-large',
    label: 'Cloudflare BGE Large',
    type: 'cloudflare-worker-ai',
    modelName: '@cf/baai/bge-large-en-v1.5',
    dimensions: 1024,
    group: 'Cloudflare',
  },
]

// Get unique groups in order
export const EMBEDDING_FUNCTION_GROUPS = [...new Set(EMBEDDING_FUNCTIONS.map(ef => ef.group))]

// Helper to get config by ID
export const getEmbeddingFunctionById = (id: string) =>
  EMBEDDING_FUNCTIONS.find((ef) => ef.id === id)

// Helper to get config by type+model
export const getEmbeddingFunctionByModel = (type: string, modelName: string) =>
  EMBEDDING_FUNCTIONS.find((ef) => ef.type === type && ef.modelName === modelName)

// Helper to get functions by group
export const getEmbeddingFunctionsByGroup = (group: string) =>
  EMBEDDING_FUNCTIONS.filter((ef) => ef.group === group)
