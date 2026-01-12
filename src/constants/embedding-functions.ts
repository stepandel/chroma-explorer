export const EMBEDDING_FUNCTIONS = [
  {
    id: 'default',
    label: 'Default (MiniLM)',
    type: 'default' as const,
    modelName: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
  {
    id: 'openai-ada',
    label: 'OpenAI Ada',
    type: 'openai' as const,
    modelName: 'text-embedding-ada-002',
    dimensions: 1536,
  },
  {
    id: 'openai-3-small',
    label: 'OpenAI 3-Small',
    type: 'openai' as const,
    modelName: 'text-embedding-3-small',
    dimensions: 1536,
  },
  {
    id: 'openai-3-large',
    label: 'OpenAI 3-Large',
    type: 'openai' as const,
    modelName: 'text-embedding-3-large',
    dimensions: 3072,
  },
] as const

export type EmbeddingFunctionConfig = (typeof EMBEDDING_FUNCTIONS)[number]
export type EmbeddingFunctionType = EmbeddingFunctionConfig['type']

// Helper to get config by ID
export const getEmbeddingFunctionById = (id: string) =>
  EMBEDDING_FUNCTIONS.find((ef) => ef.id === id)

// Helper to get config by type+model
export const getEmbeddingFunctionByModel = (type: string, modelName: string) =>
  EMBEDDING_FUNCTIONS.find((ef) => ef.type === type && ef.modelName === modelName)
