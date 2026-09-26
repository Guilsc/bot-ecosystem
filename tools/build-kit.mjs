/**
 * Packs a KayKit asset pack into one glb.
 *
 * Both packs the colony uses are built the same way: a directory of single-model .gltf
 * files that all reference one gradient atlas. Loading them as shipped would be a request
 * per model for what is, in the end, a single material and a bag of geometry — so they are
 * merged here into one document with one texture, and every model kept as a named scene
 * node the runtime can look up.
 *
 * Usage: build-kit.mjs <src-gltf-dir> <out.glb> [model,model,...]
 * With no model list, everything in the directory is packed.
 */
import { NodeIO } from '@gltf-transform/core'
import { dedup, mergeDocuments, prune, unpartition, weld } from '@gltf-transform/functions'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const [SRC, OUT, WANTED] = process.argv.slice(2)
if (!SRC || !OUT) {
  console.error('usage: build-kit.mjs <src-gltf-dir> <out.glb> [model,model,...]')
  process.exit(1)
}

// The raw packs are not checked in — the built glb is. Re-running this without them is what
// happens on a fresh clone, and it should be a no-op rather than a broken install.
if (!existsSync(SRC)) {
  if (existsSync(OUT)) {
    console.log(`build-kit: no source pack, keeping the existing ${OUT}`)
    process.exit(0)
  }
  console.error(`build-kit: missing ${SRC} — see README, "Where the art comes from"`)
  process.exit(1)
}

const keep = WANTED ? new Set(WANTED.split(',').map((s) => s.trim())) : null
const files = readdirSync(SRC)
  .filter((f) => f.endsWith('.gltf'))
  .filter((f) => !keep || keep.has(basename(f, '.gltf')))
  .sort()

if (keep) {
  const missing = [...keep].filter((n) => !files.includes(`${n}.gltf`))
  if (missing.length) throw new Error(`${SRC}: no such model: ${missing.join(', ')}`)
}
if (!files.length) throw new Error(`${SRC}: nothing to pack`)

const io = new NodeIO()
const doc = await io.read(join(SRC, files[0]))
const scene = doc.getRoot().getDefaultScene()

for (const file of files.slice(1)) {
  mergeDocuments(doc, await io.read(join(SRC, file)))
}

// mergeDocuments brings each source document's scene along with it; fold them all into the
// first so the result is one scene of named nodes rather than one scene per model.
for (const s of doc.getRoot().listScenes()) {
  if (s === scene) continue
  for (const child of s.listChildren()) scene.addChild(child)
  s.dispose()
}

await doc.transform(
  weld(),
  dedup(), // every model carries its own copy of one atlas and one material
  prune(),
  unpartition() // merged documents each bring their own buffer; a glb may only have one
)

const root = doc.getRoot()
console.log(`${basename(OUT)}: ${scene.listChildren().length} nodes, ${root.listMaterials().length} material, ${root.listTextures().length} texture`)

mkdirSync(dirname(OUT), { recursive: true })
await io.write(OUT, doc)
