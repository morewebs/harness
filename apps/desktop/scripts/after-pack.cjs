/**
 * electron-builder afterPack hook.
 * Prunes unneeded nested node_modules, sourcemaps, and excessively long paths
 * to prevent Windows MAX_PATH (260 char) errors in WiX (MSI linker).
 */

const { rmSync, existsSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir
  const appModules = join(appOutDir, 'resources', 'app', 'node_modules')
  if (!existsSync(appModules)) return

  console.log('[afterPack] Pruning redundant files and long paths for Windows installer packaging...')

  // 1. Remove duplicate nested node_modules inside @deepseek-ai packages
  const deepseekDir = join(appModules, '@deepseek-ai')
  if (existsSync(deepseekDir)) {
    for (const pkg of readdirSync(deepseekDir)) {
      const nestedModules = join(deepseekDir, pkg, 'node_modules')
      if (existsSync(nestedModules)) {
        try {
          rmSync(nestedModules, { recursive: true, force: true })
          console.log(`[afterPack] Pruned nested node_modules in @deepseek-ai/${pkg}`)
        } catch (err) {
          console.warn(`[afterPack] Warning: could not prune ${nestedModules}: ${err.message}`)
        }
      }
    }
  }

  // 2. Prune sourcemap files and any files exceeding 240 characters
  let prunedMaps = 0
  let prunedLong = 0

  function prune(dir) {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        prune(fullPath)
      } else if (entry.name.endsWith('.js.map') || entry.name.endsWith('.mjs.map') || entry.name.endsWith('.cjs.map')) {
        try {
          rmSync(fullPath, { force: true })
          prunedMaps++
        } catch {}
      } else if (fullPath.length > 240) {
        try {
          rmSync(fullPath, { force: true })
          prunedLong++
        } catch {}
      }
    }
  }

  prune(appModules)
  console.log(`[afterPack] Pruned ${prunedMaps} sourcemaps and ${prunedLong} long paths.`)
}
