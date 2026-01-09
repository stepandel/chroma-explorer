import { ChromaClient, CloudClient, EmbeddingFunction } from 'chromadb'
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed'
import { CollectionInfo } from './types'

// Python name -> JS package name mapping
const PYTHON_TO_JS_PACKAGE: Record<string, string> = {
  'default': 'default-embed',
  'onnx_mini_lm_l6_v2': 'default-embed',
  'openai': 'openai',
  'together_ai': 'together-ai',
  'sentence_transformer': 'sentence-transformer',
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
          // buildFromConfig accepts snake_case config (model_name, etc.)
          // which matches the collection config format
          return DefaultEmbeddingFunction.buildFromConfig(efConfig.config as any || {})
        }

        case 'openai': {
          // Dynamic import for openai
          const { OpenAIEmbeddingFunction } = await import('@chroma-core/openai')
          const config = efConfig.config as Record<string, unknown> || {}

          // Read API key from environment variable
          const apiKeyEnvVar = (config.api_key_env_var as string) || 'OPENAI_API_KEY'
          const apiKey = process.env[apiKeyEnvVar]

          if (!apiKey) {
            console.warn(
              `[EF Factory] Environment variable "${apiKeyEnvVar}" not set. ` +
              `OpenAI embedding function will fail.`
            )
          }

          return new OpenAIEmbeddingFunction({
            apiKey,
            modelName: (config.model_name as string) || 'text-embedding-ada-002',
            organizationId: config.organization_id as string | undefined,
            dimensions: config.dimensions as number | undefined,
            apiBase: config.api_base as string | undefined,
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
      console.error(
        `[EF Factory] Failed to build "${packageName}" for collection "${collectionName}":`,
        error
      )
      return undefined
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}
