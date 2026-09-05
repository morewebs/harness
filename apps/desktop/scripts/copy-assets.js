import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// 1. Copy renderer UI assets
const srcRenderer = resolve(root, 'src/renderer')
const distRenderer = resolve(root, 'dist/renderer')

if (existsSync(srcRenderer)) {
  mkdirSync(distRenderer, { recursive: true })
  cpSync(srcRenderer, distRenderer, { recursive: true })
  console.log('Copied renderer assets to dist/renderer')
}

// 2. Copy CommonJS preload script
const srcPreloadCjs = resolve(root, 'src/preload/index.cjs')
const distPreloadCjs = resolve(root, 'dist/preload/index.cjs')
if (existsSync(srcPreloadCjs)) {
  mkdirSync(resolve(root, 'dist/preload'), { recursive: true })
  cpSync(srcPreloadCjs, distPreloadCjs)
  console.log('Copied preload.cjs to dist/preload')
}

// 3. Stage local Node runtime executable for packaging into extraResources
const binDir = resolve(root, 'build/bin')
mkdirSync(binDir, { recursive: true })
const nodeExeName = process.platform === 'win32' ? 'node.exe' : 'node'
const targetNodeExe = resolve(binDir, nodeExeName)

if (!existsSync(targetNodeExe)) {
  try {
    cpSync(process.execPath, targetNodeExe)
    console.log(`Staged runtime Node binary (${process.execPath}) to build/bin/${nodeExeName}`)
  } catch (err) {
    console.warn(`Warning: could not copy runtime Node binary: ${err.message}`)
  }
}
