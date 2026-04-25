#!/usr/bin/env node
import { ChromaClient } from 'chromadb'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '8000' },
    auth: { type: 'string', default: 'none' },
  },
})

const port = Number(values.port)
const authMode = values.auth

const TOKEN = process.env.CHROMA_TEST_TOKEN || 'test-token-abc123'
const BASIC = process.env.CHROMA_TEST_BASIC || 'admin:secret'

const headers = {}
if (authMode === 'token') {
  headers['Authorization'] = `Bearer ${TOKEN}`
} else if (authMode === 'basic') {
  headers['Authorization'] = 'Basic ' + Buffer.from(BASIC).toString('base64')
} else if (authMode !== 'none') {
  console.error(`Unknown --auth mode: ${authMode}. Use none|token|basic.`)
  process.exit(1)
}

const client = new ChromaClient({ host: 'localhost', port, ssl: false, headers })

const EMBED_DIM = 8

function seededVector(seed) {
  // Deterministic pseudo-random vector so re-seeds produce stable embeddings.
  const out = new Array(EMBED_DIM)
  let s = seed
  for (let i = 0; i < EMBED_DIM; i++) {
    s = (s * 9301 + 49297) % 233280
    out[i] = s / 233280 - 0.5
  }
  return out
}

const collections = [
  {
    name: 'articles',
    metadata: { description: 'Sample blog articles for explorer testing' },
    docs: [
      { id: 'a1', document: 'Getting started with vector databases.', metadata: { topic: 'intro', words: 5 } },
      { id: 'a2', document: 'Embeddings turn text into numbers.', metadata: { topic: 'embeddings', words: 6 } },
      { id: 'a3', document: 'HNSW is a graph-based index for ANN search.', metadata: { topic: 'indexing', words: 9 } },
      { id: 'a4', document: 'Chroma stores documents, embeddings, and metadata together.', metadata: { topic: 'intro', words: 8 } },
      { id: 'a5', document: 'Filtering by metadata narrows down query results.', metadata: { topic: 'queries', words: 8 } },
    ],
  },
  {
    name: 'code_snippets',
    metadata: { description: 'Code snippets across languages' },
    docs: [
      { id: 'c1', document: 'def hello():\n    print("hi")', metadata: { language: 'python', lines: 2 } },
      { id: 'c2', document: 'const add = (a, b) => a + b', metadata: { language: 'javascript', lines: 1 } },
      { id: 'c3', document: 'fn main() { println!("hi"); }', metadata: { language: 'rust', lines: 1 } },
      { id: 'c4', document: 'package main\nfunc main() {}', metadata: { language: 'go', lines: 2 } },
      { id: 'c5', document: 'puts "hello"', metadata: { language: 'ruby', lines: 1 } },
    ],
  },
]

async function main() {
  await client.heartbeat()
  console.log(`[seed] connected to http://localhost:${port} (auth=${authMode})`)

  for (const spec of collections) {
    const col = await client.getOrCreateCollection({ name: spec.name, metadata: spec.metadata })
    let seedBase = 0
    for (let i = 0; i < spec.name.length; i++) seedBase += spec.name.charCodeAt(i)
    const ids = spec.docs.map((d) => d.id)
    const documents = spec.docs.map((d) => d.document)
    const metadatas = spec.docs.map((d) => d.metadata)
    const embeddings = spec.docs.map((_, idx) => seededVector(seedBase + idx + 1))
    await col.upsert({ ids, documents, metadatas, embeddings })
    console.log(`[seed] upserted ${ids.length} docs into "${spec.name}"`)
  }

  console.log('[seed] done')
}

main().catch((err) => {
  console.error('[seed] failed:', err.message || err)
  process.exit(1)
})
