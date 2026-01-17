/**
 * Pinecone configuration options for serverless indexes
 */

import { PineconeCloud, PineconeMetric } from './types'

export interface RegionOption {
  value: string
  label: string
}

export interface CloudConfig {
  label: string
  regions: RegionOption[]
  defaultRegion: string
}

/**
 * Serverless regions by cloud provider
 * Based on Pinecone documentation: https://docs.pinecone.io/guides/indexes/understanding-serverless#regions
 */
export const PINECONE_CLOUDS: Record<PineconeCloud, CloudConfig> = {
  aws: {
    label: 'AWS',
    regions: [
      { value: 'us-east-1', label: 'US East (N. Virginia)' },
      { value: 'us-west-2', label: 'US West (Oregon)' },
      { value: 'eu-west-1', label: 'Europe (Ireland)' },
    ],
    defaultRegion: 'us-east-1',
  },
  gcp: {
    label: 'GCP',
    regions: [
      { value: 'us-central1', label: 'US Central (Iowa)' },
      { value: 'europe-west4', label: 'Europe West (Netherlands)' },
    ],
    defaultRegion: 'us-central1',
  },
  azure: {
    label: 'Azure',
    regions: [
      { value: 'eastus2', label: 'East US 2' },
    ],
    defaultRegion: 'eastus2',
  },
}

/**
 * Metric options for Pinecone indexes
 */
export const PINECONE_METRICS: { value: PineconeMetric; label: string; description: string }[] = [
  {
    value: 'cosine',
    label: 'Cosine',
    description: 'Measures the cosine of the angle between vectors. Best for text embeddings.',
  },
  {
    value: 'euclidean',
    label: 'Euclidean',
    description: 'Measures straight-line distance between vectors. Best for dense vectors.',
  },
  {
    value: 'dotproduct',
    label: 'Dot Product',
    description: 'Measures the product of vector magnitudes. Use with normalized vectors.',
  },
]

/**
 * Default configuration values
 */
export const PINECONE_DEFAULTS = {
  cloud: 'aws' as PineconeCloud,
  region: 'us-east-1',
  metric: 'cosine' as PineconeMetric,
}

/**
 * Get available regions for a cloud provider
 */
export function getRegionsForCloud(cloud: PineconeCloud): RegionOption[] {
  return PINECONE_CLOUDS[cloud]?.regions || []
}

/**
 * Get the default region for a cloud provider
 */
export function getDefaultRegionForCloud(cloud: PineconeCloud): string {
  return PINECONE_CLOUDS[cloud]?.defaultRegion || 'us-east-1'
}

/**
 * Validate if a region is valid for a given cloud
 */
export function isValidRegion(cloud: PineconeCloud, region: string): boolean {
  const regions = getRegionsForCloud(cloud)
  return regions.some(r => r.value === region)
}
