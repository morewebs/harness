import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const srcRenderer = resolve(root, 'src/renderer')
const distRenderer = resolve(root, 'dist/renderer')

if (existsSync(srcRenderer)) {
  mkdirSync(distRenderer, { recursive: true })
  cpSync(srcRenderer, distRenderer, { recursive: true })
  console.log('Copied renderer assets to dist/renderer')
}
