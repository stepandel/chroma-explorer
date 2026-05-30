const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')

function getResourcesDir(context) {
  if (context.electronPlatformName === 'darwin') {
    return path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
  }

  return path.join(context.appOutDir, 'resources')
}

function getPackagePathParts(packageName) {
  return packageName.split('/')
}

function getPackageRoot(packageName, searchPaths) {
  for (const searchPath of searchPaths) {
    const packageJsonPath = path.join(searchPath, 'node_modules', ...getPackagePathParts(packageName), 'package.json')

    if (fs.existsSync(packageJsonPath)) {
      return path.dirname(fs.realpathSync(packageJsonPath))
    }
  }

  const packageJsonPath = require.resolve(`${packageName}/package.json`, {
    paths: searchPaths,
  })

  return path.dirname(fs.realpathSync(packageJsonPath))
}

function getPackageDestination(resourcesDir, packageName) {
  return path.join(resourcesDir, 'node_modules', ...getPackagePathParts(packageName))
}

function readPackage(packageDir) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
}

function copyPackage(packageName, resourcesDir, copied, searchPaths = [projectRoot]) {
  if (copied.has(packageName)) {
    return
  }

  let sourceDir
  try {
    sourceDir = getPackageRoot(packageName, searchPaths)
  } catch {
    return
  }

  copied.add(packageName)

  const destinationDir = getPackageDestination(resourcesDir, packageName)
  fs.rmSync(destinationDir, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(destinationDir), { recursive: true })
  fs.cpSync(sourceDir, destinationDir, {
    recursive: true,
    dereference: true,
  })

  const pkg = readPackage(sourceDir)
  const dependencyNames = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ])

  for (const dependencyName of dependencyNames) {
    copyPackage(dependencyName, resourcesDir, copied, [
      sourceDir,
      path.dirname(path.dirname(sourceDir)),
      projectRoot,
    ])
  }
}

module.exports = async function afterPack(context) {
  const resourcesDir = getResourcesDir(context)
  const copied = new Set()

  for (const packageName of ['onnxruntime-node', 'sharp']) {
    copyPackage(packageName, resourcesDir, copied)
  }
}
