#!/usr/bin/env node
import { spawn } from 'node:child_process'
import http from 'node:http'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    auth: { type: 'string', default: 'none' },
    port: { type: 'string', default: '8000' },
    path: { type: 'string', default: './test-db' },
  },
})

const authMode = values.auth
const externalPort = Number(values.port)
const dataPath = values.path

if (!['none', 'token', 'basic'].includes(authMode)) {
  console.error(`Unknown --auth mode: ${authMode}. Use none|token|basic.`)
  process.exit(1)
}

const TOKEN = process.env.CHROMA_TEST_TOKEN || 'test-token-abc123'
const BASIC = process.env.CHROMA_TEST_BASIC || 'admin:secret'

const upstreamPort = authMode === 'none' ? externalPort : externalPort + 1000

const chromaProc = spawn(
  'uvx',
  ['--from', 'chromadb', 'chroma', 'run', '--path', dataPath, '--port', String(upstreamPort)],
  { stdio: 'inherit' },
)

let proxyServer = null

function shutdown() {
  if (proxyServer) proxyServer.close()
  if (!chromaProc.killed) chromaProc.kill('SIGTERM')
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
chromaProc.on('exit', (code) => {
  if (proxyServer) proxyServer.close()
  process.exit(code ?? 0)
})

if (authMode === 'none') {
  console.log(`\n[test-db] auth=none — chroma listening on http://localhost:${externalPort}\n`)
} else {
  startProxy()
}

function startProxy() {
  const expectedBasic = 'Basic ' + Buffer.from(BASIC).toString('base64')

  proxyServer = http.createServer((req, res) => {
    if (!isAuthorized(req)) {
      res.writeHead(401, {
        'content-type': 'application/json',
        'www-authenticate': authMode === 'basic' ? 'Basic realm="chroma"' : 'Bearer',
      })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }

    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: upstreamPort,
        path: req.url,
        method: req.method,
        headers: stripAuthHeaders(req.headers),
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
        proxyRes.pipe(res)
      },
    )

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'upstream', detail: err.message }))
    })

    req.pipe(proxyReq)
  })

  proxyServer.listen(externalPort, '127.0.0.1', () => {
    if (authMode === 'token') {
      console.log(
        `\n[test-db] auth=token — proxy on http://localhost:${externalPort} → chroma on :${upstreamPort}` +
          `\n[test-db] expected header: Authorization: Bearer ${TOKEN}\n`,
      )
    } else {
      const [user, pass] = BASIC.split(':')
      console.log(
        `\n[test-db] auth=basic — proxy on http://localhost:${externalPort} → chroma on :${upstreamPort}` +
          `\n[test-db] expected credentials: ${user} / ${pass}\n`,
      )
    }
  })

  function isAuthorized(req) {
    const header = req.headers['authorization']
    if (authMode === 'token') {
      if (typeof header === 'string' && header === `Bearer ${TOKEN}`) return true
      if (req.headers['x-chroma-token'] === TOKEN) return true
      return false
    }
    if (authMode === 'basic') {
      return typeof header === 'string' && header === expectedBasic
    }
    return false
  }

  function stripAuthHeaders(headers) {
    const out = { ...headers }
    delete out['authorization']
    delete out['x-chroma-token']
    return out
  }
}
