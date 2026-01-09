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

    // Resolve config with API key from environment
    const resolvedConfig = this.resolveConfigWithApiKey(efConfig.config || {})

    try {
      // Handle each supported embedding function
      switch (packageName) {
        case 'default-embed': {
          return new DefaultEmbeddingFunction(resolvedConfig)
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

  private resolveConfigWithApiKey(
    config: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved = { ...config }

    // Handle api_key_env_var pattern
    if (typeof config.api_key_env_var === 'string') {
      const envVarName = config.api_key_env_var
      const apiKey = process.env[envVarName]

      if (!apiKey) {
        console.warn(
          `[EF Factory] Environment variable "${envVarName}" not set. ` +
          `API calls may fail.`
        )
      } else {
        resolved.api_key = apiKey
      }

      // Remove env var reference from config
      delete resolved.api_key_env_var
    }

    return resolved
  }

  clearCache(): void {
    this.cache.clear()
  }
}
