/**
 * EmbeddingGenerator - Generates embeddings using various providers
 * This is a standalone version that doesn't depend on ChromaDB client
 */

import { DefaultEmbeddingFunction } from '@chroma-core/default-embed'
import { OpenAIEmbeddingFunction } from '@chroma-core/openai'
import { OllamaEmbeddingFunction } from '@chroma-core/ollama'
import { CohereEmbeddingFunction } from '@chroma-core/cohere'
import { GoogleGeminiEmbeddingFunction } from '@chroma-core/google-gemini'
import { JinaEmbeddingFunction } from '@chroma-core/jina'
import { MistralEmbeddingFunction } from '@chroma-core/mistral'
import { VoyageAIEmbeddingFunction } from '@chroma-core/voyageai'
import { TogetherAIEmbeddingFunction } from '@chroma-core/together-ai'
import { HuggingfaceServerEmbeddingFunction } from '@chroma-core/huggingface-server'
import { CloudflareWorkerAIEmbeddingFunction } from '@chroma-core/cloudflare-worker-ai'
import { MorphEmbeddingFunction } from '@chroma-core/morph'
import { SentenceTransformersEmbeddingFunction } from '@chroma-core/sentence-transformer'
import { EmbeddingFunction } from 'chromadb'
import { CollectionInfo } from './types'

type EFConfig = CollectionInfo['embeddingFunction']

// Custom error for missing API credentials
export class EmbeddingCredentialsError extends Error {
  constructor(
    public provider: string,
    public envVar: string,
    message?: string
  ) {
    super(message || `${provider} API key not configured. Set the ${envVar} in the connection settings.`)
    this.name = 'EmbeddingCredentialsError'
  }
}

// Python name -> JS package name mapping
const PYTHON_TO_JS_PACKAGE: Record<string, string> = {
  'default': 'default-embed',
  'onnx_mini_lm_l6_v2': 'default-embed',
  'openai': 'openai',
  'ollama': 'ollama',
  'cohere': 'cohere',
  'google_generative_ai': 'google-gemini',
  'google-gemini': 'google-gemini',
  'jina': 'jina',
  'mistral': 'mistral',
  'voyageai': 'voyageai',
  'together_ai': 'together-ai',
  'together-ai': 'together-ai',
  'huggingface_server': 'huggingface-server',
  'huggingface-server': 'huggingface-server',
  'cloudflare_worker_ai': 'cloudflare-worker-ai',
  'cloudflare-worker-ai': 'cloudflare-worker-ai',
  'morph': 'morph',
  'sentence_transformer': 'sentence-transformer',
  'sentence-transformer': 'sentence-transformer',
}

export class EmbeddingGenerator {
  private cache = new Map<string, EmbeddingFunction>()

  /**
   * Generate embedding for a single text
   * @param collectionName - Name of the collection
   * @param text - Text to embed
   * @param efConfig - Embedding function configuration (dimension should be in config.dimensions for OpenAI)
   */
  async generateEmbedding(
    collectionName: string,
    text: string,
    efConfig?: EFConfig | null
  ): Promise<number[]> {
    const ef = await this.getEmbeddingFunction(collectionName, efConfig)

    if (!ef) {
      throw new Error(
        'No embedding function configured. Please configure an embedding function in the collection settings.'
      )
    }

    const embeddings = await ef.generate([text])
    return embeddings[0]
  }

  /**
   * Generate embeddings for multiple texts
   * @param collectionName - Name of the collection
   * @param texts - Texts to embed
   * @param efConfig - Embedding function configuration (dimension should be in config.dimensions for OpenAI)
   */
  async generateEmbeddings(
    collectionName: string,
    texts: string[],
    efConfig?: EFConfig | null
  ): Promise<number[][]> {
    const ef = await this.getEmbeddingFunction(collectionName, efConfig)

    if (!ef) {
      throw new Error(
        'No embedding function configured. Please configure an embedding function in the collection settings.'
      )
    }

    return await ef.generate(texts)
  }

  private async getEmbeddingFunction(
    collectionName: string,
    efConfig?: EFConfig | null
  ): Promise<EmbeddingFunction | undefined> {
    // No config or not a known type - return undefined
    if (!efConfig || efConfig.type !== 'known') {
      console.warn(
        `[Embedding Generator] Collection "${collectionName}" has no known EF config.`
      )
      return undefined
    }

    // Generate cache key from collection + config (dimension is included in config)
    const cacheKey = this.getCacheKey(collectionName, efConfig)

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    // Build new EF
    const ef = await this.buildEmbeddingFunction(collectionName, efConfig)
    if (ef) {
      this.cache.set(cacheKey, ef)
    }

    return ef
  }

  private getCacheKey(collectionName: string, config: NonNullable<EFConfig>): string {
    const configStr = JSON.stringify(config)
    return `${collectionName}:${configStr}`
  }

  private async buildEmbeddingFunction(
    collectionName: string,
    efConfig: NonNullable<EFConfig>
  ): Promise<EmbeddingFunction | undefined> {
    const packageName = PYTHON_TO_JS_PACKAGE[efConfig.name] || efConfig.name

    try {
      switch (packageName) {
        case 'default-embed': {
          return DefaultEmbeddingFunction.buildFromConfig(efConfig.config as any || {})
        }

        case 'openai': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'OPENAI_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('OpenAI', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'text-embedding-ada-002'
          const dimensions = config.dimensions as number | undefined

          console.log(`[Embedding Generator] Creating OpenAI embedding function with model: ${modelName}${dimensions ? `, dimensions: ${dimensions}` : ''}`)

          return new OpenAIEmbeddingFunction({
            apiKey,
            modelName,
            organizationId: config.organization_id as string | undefined,
            dimensions,
            apiBase: config.api_base as string | undefined,
          })
        }

        case 'ollama': {
          const config = efConfig.config as Record<string, unknown> || {}
          const url = (config.url as string) || 'http://localhost:11434'
          const model = (config.model_name as string) || 'nomic-embed-text'

          console.log(`[Embedding Generator] Creating Ollama embedding function with model: ${model} at ${url}`)

          return new OllamaEmbeddingFunction({
            url,
            model,
          })
        }

        case 'cohere': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'COHERE_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Cohere', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'embed-english-v3.0'
          console.log(`[Embedding Generator] Creating Cohere embedding function with model: ${modelName}`)

          return new CohereEmbeddingFunction({
            apiKey,
            modelName,
          })
        }

        case 'google-gemini': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'GEMINI_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Google Gemini', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'text-embedding-004'
          console.log(`[Embedding Generator] Creating Google Gemini embedding function with model: ${modelName}`)

          return new GoogleGeminiEmbeddingFunction({
            apiKey,
            modelName,
          })
        }

        case 'jina': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'JINA_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Jina', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'jina-embeddings-v3'
          console.log(`[Embedding Generator] Creating Jina embedding function with model: ${modelName}`)

          return new JinaEmbeddingFunction({
            apiKey,
            modelName,
          })
        }

        case 'mistral': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'MISTRAL_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Mistral', apiKeyEnvVar)
          }

          const model = (config.model_name as string) || 'mistral-embed'
          console.log(`[Embedding Generator] Creating Mistral embedding function with model: ${model}`)

          return new MistralEmbeddingFunction({
            apiKey,
            model,
          })
        }

        case 'voyageai': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'VOYAGE_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('VoyageAI', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'voyage-3'
          console.log(`[Embedding Generator] Creating VoyageAI embedding function with model: ${modelName}`)

          return new VoyageAIEmbeddingFunction({
            apiKey,
            modelName,
          })
        }

        case 'together-ai': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'TOGETHER_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Together AI', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'togethercomputer/m2-bert-80M-8k-retrieval'
          console.log(`[Embedding Generator] Creating Together AI embedding function with model: ${modelName}`)

          return new TogetherAIEmbeddingFunction({
            apiKey,
            modelName,
          })
        }

        case 'huggingface-server': {
          const config = efConfig.config as Record<string, unknown> || {}
          const url = config.url as string

          if (!url) {
            throw new EmbeddingCredentialsError(
              'HuggingFace Server',
              'URL',
              'HuggingFace Server URL not configured. Please provide a URL in the embedding function settings.'
            )
          }

          console.log(`[Embedding Generator] Creating HuggingFace Server embedding function at: ${url}`)

          return new HuggingfaceServerEmbeddingFunction({
            url,
          })
        }

        case 'cloudflare-worker-ai': {
          const config = efConfig.config as Record<string, unknown> || {}

          const accountIdEnvVar = (config.account_id_env_var as string) || 'CLOUDFLARE_ACCOUNT_ID'
          const accountId = (config.account_id as string) || process.env[accountIdEnvVar]

          const apiKeyEnvVar = (config.api_key_env_var as string) || 'CLOUDFLARE_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!accountId) {
            throw new EmbeddingCredentialsError(
              'Cloudflare Workers AI',
              accountIdEnvVar,
              `Cloudflare account ID not configured. Set the ${accountIdEnvVar} environment variable.`
            )
          }

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Cloudflare Workers AI', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || '@cf/baai/bge-base-en-v1.5'
          console.log(`[Embedding Generator] Creating Cloudflare Workers AI embedding function with model: ${modelName}`)

          return new CloudflareWorkerAIEmbeddingFunction({
            accountId,
            apiKey,
            modelName,
          })
        }

        case 'morph': {
          const config = efConfig.config as Record<string, unknown> || {}
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'MORPH_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            throw new EmbeddingCredentialsError('Morph', apiKeyEnvVar)
          }

          const modelName = (config.model_name as string) || 'morph-embedding-base'
          console.log(`[Embedding Generator] Creating Morph embedding function with model: ${modelName}`)

          return new MorphEmbeddingFunction({
            api_key: apiKey,
            model_name: modelName,
          })
        }

        case 'sentence-transformer': {
          const config = efConfig.config as Record<string, unknown> || {}
          const modelName = (config.model_name as string) || 'Xenova/all-MiniLM-L6-v2'
          console.log(`[Embedding Generator] Creating Sentence Transformer embedding function with model: ${modelName}`)

          return new SentenceTransformersEmbeddingFunction({
            modelName,
          })
        }

        default:
          console.warn(
            `[Embedding Generator] Embedding function "${efConfig.name}" (package: ${packageName}) ` +
            `is not yet supported.`
          )
          return undefined
      }
    } catch (error) {
      if (error instanceof EmbeddingCredentialsError) {
        throw error
      }
      console.error(
        `[Embedding Generator] Failed to build "${packageName}" for collection "${collectionName}":`,
        error
      )
      throw error
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}
