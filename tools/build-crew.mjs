/**
 * Packs the crew rig into one glb: KayKit's Mannequin_Medium plus the handful of
 * animations the colony actually plays.
 *
 * The Character Animations pack ships 161 clips across eight files and four megabytes.
 * Bot Crossing has eight behaviours. Everything not on the list below is disposed here rather
 * than downloaded and thrown away in the browser.
 *
 * Both packs are CC0 (Kay Lousberg, kaylousberg.com).
 */
import { NodeIO } from '@gltf-transform/core'
import { dedup, mergeDocuments, prune, unpartition } from '@gltf-transform/functions'
import { existsSync, mkdirSync } from 'node:fs'

const SRC = 'assets-src/KayKit_Character_Animations_1.1'
const MANNEQUIN = `${SRC}/Mannequin Character/characters/Mannequin_Medium.glb`
const ANIMS = `${SRC}/Animations/gltf/Rig_Medium`
const OUT = 'public/assets/crew.glb'

/**
 * The clips to keep, by source file. Names are KayKit's own — the runtime looks them up by
 * name, so this list and `CLIPS` in `src/agents/crew.js` have to agree.
 */
const WANTED = {
  'Rig_Medium_General.glb': ['Idle_A', 'Idle_B', 'Interact', 'Hit_A', 'Spawn_Ground'],
  'Rig_Medium_MovementBasic.glb': ['Walking_A', 'Running_A', 'Jump_Full_Short'],
  'Rig_Medium_Simulation.glb': ['Cheering', 'Waving', 'Sit_Floor_Down', 'Sit_Floor_Idle', 'Sit_Floor_StandUp'],
  'Rig_Medium_Tools.glb': ['Hammering', 'Working_A'],
}

// The raw packs are not checked in — the built glb is. Re-running this without them is
// what happens on a fresh clone, and it should be a no-op rather than a broken install.
if (!existsSync(SRC)) {
  if (existsSync(OUT)) {
    console.log(`build-crew: no source pack, keeping the existing ${OUT}`)
    process.exit(0)
  }
  console.error(`build-crew: missing ${SRC} — see README, "Where the art comes from"`)
  process.exit(1)
}

const io = new NodeIO()
const doc = await io.read(MANNEQUIN)

for (const [file, clips] of Object.entries(WANTED)) {
  const src = await io.read(`${ANIMS}/${file}`)
  const keep = new Set(clips)

  // Drop the unwanted clips *before* merging. Merging first would pull every one of their
  // samplers and accessors into the target document, and prune() cannot tell a disposed
  // animation's buffer from a live one once they share a buffer.
  for (const anim of src.getRoot().listAnimations()) {
    if (!keep.has(anim.getName())) anim.dispose()
  }
  const got = src.getRoot().listAnimations().map((a) => a.getName())
  const missing = clips.filter((c) => !got.includes(c))
  if (missing.length) throw new Error(`${file}: no such clip: ${missing.join(', ')}`)

  mergeDocuments(doc, src)
}

const root = doc.getRoot()
const scene = root.getDefaultScene()

/**
 * Retarget every clip onto the mannequin's own bones.
 *
 * Each animation file ships a full copy of the rig for its channels to drive, and merging
 * brings all of them along — so a merged document ends up with five `hips` nodes and clips
 * that animate the four nobody is looking at. Left alone this loads without a single error
 * and renders the entire crew frozen in its bind pose, which is a miserable thing to debug.
 *
 * The bones are matched by name, which is exactly what a runtime retarget would do, except
 * done once here instead of on every load.
 */
const bones = new Map()
const index = (node) => {
  bones.set(node.getName(), node)
  node.listChildren().forEach(index)
}
scene.listChildren().forEach(index)

let retargeted = 0
let orphaned = 0
for (const anim of root.listAnimations()) {
  for (const channel of anim.listChannels()) {
    const target = channel.getTargetNode()
    if (!target) continue
    const mine = bones.get(target.getName())
    if (!mine) {
      // A channel for something the mannequin has not got — the tool-attachment sockets.
      channel.dispose()
      orphaned++
    } else if (mine !== target) {
      channel.setTargetNode(mine)
      retargeted++
    }
  }
}
console.log(`retargeted ${retargeted} channels, dropped ${orphaned} with no matching bone`)

for (const s of root.listScenes()) {
  if (s !== scene) s.dispose()
}

// Disposing those scenes orphans the duplicate rigs, their meshes and their skins without
// deleting them — prune() leaves meshes and skins alone — so the reachable set is walked
// here and everything else goes.
const live = new Set()
const reach = (node) => {
  live.add(node)
  node.listChildren().forEach(reach)
}
scene.listChildren().forEach(reach)

const liveMeshes = new Set([...live].map((n) => n.getMesh()).filter(Boolean))
const liveSkins = new Set([...live].map((n) => n.getSkin()).filter(Boolean))
for (const node of root.listNodes()) if (!live.has(node)) node.dispose()
for (const mesh of root.listMeshes()) if (!liveMeshes.has(mesh)) mesh.dispose()
for (const skin of root.listSkins()) if (!liveSkins.has(skin)) skin.dispose()

await doc.transform(dedup(), prune({ keepAttributes: false }), unpartition())

// A duplicate name would make three's loader rename one of them at parse time, and the
// clips would miss again — this time silently, so it is worth an assertion.
const names = root.listNodes().map((n) => n.getName())
const dupes = names.filter((n, i) => names.indexOf(n) !== i)
if (dupes.length) throw new Error(`duplicate node names survive: ${[...new Set(dupes)].join(', ')}`)

console.log(`animations ${root.listAnimations().length}`)
for (const a of root.listAnimations()) {
  const end = Math.max(...a.listSamplers().map((s) => s.getInput()?.getMax([])[0] ?? 0))
  console.log(`  ${a.getName().padEnd(20)} ${end.toFixed(2)}s`)
}
console.log(`meshes     ${root.listMeshes().length}`)
console.log(`skins      ${root.listSkins().map((s) => s.listJoints().length + ' joints').join(', ')}`)

mkdirSync('public/assets', { recursive: true })
await io.write(OUT, doc)
