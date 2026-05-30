import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const failures = []

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dist-electron') {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }

  return files
}

function relative(file) {
  return path.relative(root, file)
}

function fail(file, message) {
  failures.push(`${relative(file)}: ${message}`)
}

const srcFiles = await listFiles(path.join(root, 'src'))
const electronFiles = await listFiles(path.join(root, 'electron'))

for (const file of srcFiles.filter((file) => /\.[tj]sx?$/.test(file))) {
  const text = await readFile(file, 'utf8')

  if (/from ['"]electron['"]/.test(text)) {
    fail(file, 'renderer code must not import the Electron runtime directly')
  }

  if (/from ['"]\.\.\/\.\.\/electron\/types['"]/.test(text) || /from ['"]\.\.\/electron\/types['"]/.test(text)) {
    fail(file, 'renderer code must import shared IPC types from @/types/electron, not electron/types')
  }
}

for (const file of electronFiles.filter((file) => /\.[tj]s$/.test(file))) {
  const text = await readFile(file, 'utf8')

  if (relative(file) !== 'electron/external-url.ts' && /shell\.openExternal\(/.test(text)) {
    fail(file, 'shell.openExternal must go through openValidatedExternalUrl from electron/external-url.ts')
  }
}

for (const file of [...srcFiles, ...electronFiles].filter((file) => /\.[tj]sx?$/.test(file))) {
  const lineCount = (await readFile(file, 'utf8')).split('\n').length
  if (lineCount > 1000) {
    fail(file, `file has ${lineCount} lines; split before it grows beyond 1000 lines`)
  }
}

if (failures.length > 0) {
  console.error('Architecture lint failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Architecture lint passed')
