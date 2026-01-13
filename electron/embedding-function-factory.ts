import { ChromaClient, CloudClient, EmbeddingFunction } from 'chromadb'
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
import { CollectionInfo } from './types'

// Custom error for missing API credentials
export class EmbeddingCredentialsError extends Error {
  constructor(
    public provider: string,
    public envVar: string,
    message?: string
  ) {
    super(message || `${provider} API key not configured. Set the ${envVar} environment variable.`)
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
}

type EFConfig = CollectionInfo['embeddingFunction']

export class EmbeddingFunctionFactory {
  private cache = new Map<string, EmbeddingFunction>()
  private client: ChromaClient | CloudClient

  constructor(client: ChromaClient | CloudClient) {
    this.client = client
  }

  async getEmbeddingFunction(
    collectionName: string,
    efConfig?: EFConfig | null
  ): Promise<EmbeddingFunction | undefined> {
    // No config or not a known type - return undefined
    if (!efConfig || efConfig.type !== 'known') {
      console.warn(
        `[EF Factory] Collection "${collectionName}" has no known EF config. ` +
        `Queries with text may fail.`
      )
      return undefined
    }

    // Generate cache key from collection + config
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
      // Handle each supported embedding function
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
          console.log(`[EF Factory] Creating OpenAI embedding function with model: ${modelName}`)

          return new OpenAIEmbeddingFunction({
            apiKey,
            modelName,
            organizationId: config.organization_id as string | undefined,
            dimensions: config.dimensions as number | undefined,
            apiBase: config.api_base as string | undefined,
          })
        }

        case 'ollama': {
          const config = efConfig.config as Record<string, unknown> || {}
          const url = (config.url as string) || 'http://localhost:11434'
          const model = (config.model_name as string) || 'nomic-embed-text'

          console.log(`[EF Factory] Creating Ollama embedding function with model: ${model} at ${url}`)

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
          console.log(`[EF Factory] Creating Cohere embedding function with model: ${modelName}`)

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
          console.log(`[EF Factory] Creating Google Gemini embedding function with model: ${modelName}`)

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
          console.log(`[EF Factory] Creating Jina embedding function with model: ${modelName}`)

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
          console.log(`[EF Factory] Creating Mistral embedding function with model: ${model}`)

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
          console.log(`[EF Factory] Creating VoyageAI embedding function with model: ${modelName}`)

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
          console.log(`[EF Factory] Creating Together AI embedding function with model: ${modelName}`)

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

          console.log(`[EF Factory] Creating HuggingFace Server embedding function at: ${url}`)

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
          console.log(`[EF Factory] Creating Cloudflare Workers AI embedding function with model: ${modelName}`)

          return new CloudflareWorkerAIEmbeddingFunction({
            accountId,
            apiKey,
            modelName,
          })
        }

        default:
          console.warn(
            `[EF Factory] Embedding function "${efConfig.name}" (package: ${packageName}) ` +
            `is not yet supported.`
          )
          return undefined
      }
    } catch (error) {
      // Re-throw EmbeddingCredentialsError to be handled by the caller
      if (error instanceof EmbeddingCredentialsError) {
        throw error
      }
      console.error(
        `[EF Factory] Failed to build "${packageName}" for collection "${collectionName}":`,
        error
      )
      throw error
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}
