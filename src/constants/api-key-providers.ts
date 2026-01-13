export interface ApiKeyProvider {
  id: string
  name: string
  description: string
  envVars: string[]
  docsUrl?: string
}

export const API_KEY_PROVIDERS: ApiKeyProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models and embeddings',
    envVars: ['OPENAI_API_KEY'],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Enterprise AI platform',
    envVars: ['COHERE_API_KEY'],
    docsUrl: 'https://dashboard.cohere.com/api-keys',
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    description: 'Google AI embeddings',
    envVars: ['GEMINI_API_KEY'],
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'jina',
    name: 'Jina AI',
    description: 'Neural search embeddings',
    envVars: ['JINA_API_KEY'],
    docsUrl: 'https://jina.ai/embeddings/',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Open-weight models',
    envVars: ['MISTRAL_API_KEY'],
    docsUrl: 'https://console.mistral.ai/api-keys/',
  },
  {
    id: 'voyageai',
    name: 'Voyage AI',
    description: 'Domain-specific embeddings',
    envVars: ['VOYAGE_API_KEY'],
    docsUrl: 'https://dash.voyageai.com/api-keys',
  },
  {
    id: 'together-ai',
    name: 'Together AI',
    description: 'Open-source model hosting',
    envVars: ['TOGETHER_API_KEY'],
    docsUrl: 'https://api.together.xyz/settings/api-keys',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    description: 'Edge AI models',
    envVars: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_KEY'],
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
  {
    id: 'morph',
    name: 'Morph',
    description: 'Morph embeddings',
    envVars: ['MORPH_API_KEY'],
  },
]
