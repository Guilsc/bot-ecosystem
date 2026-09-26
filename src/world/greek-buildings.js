import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { mulberry } from './planet.js'

// Small, self-contained architectural kit. One merged mesh per thread preserves the
// colony's draw-call budget, picking, navigation footprint and reveal interface.
const MARBLE = 0xe9dfc7
const SHADE = 0xb9aa91
const ROOF = 0x9b6048
const GOLD = 0xc8a45a
const DARK = 0x4d625d

export function createGreekBuilding({ seed = 1, accent = GOLD } = {}) {
  const random = mulberry(seed)
  const variant = Math.floor(random() * 4)
  const parts = []
  const add = (geometry, color, x = 0, y = 0, z = 0) => {
    geometry.translate(x, y, z)
    geometry.deleteAttribute('uv')
    const c = new THREE.Color(color)
    const values = new Float32Array(geometry.attributes.position.count * 3)
    for (let i = 0; i < values.length; i += 3) c.toArray(values, i)
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3))
    parts.push(geometry)
  }
  const box = (w, h, d, color, x, y, z) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z)
  const column = (x, z, height = 1.7) => {
    add(new THREE.CylinderGeometry(0.12, 0.15, height, 10), MARBLE, x, 0.38 + height / 2, z)
    box(0.4, 0.12, 0.4, SHADE, x, 0.43, z)
    box(0.32, 0.13, 0.32, MARBLE, x, 0.38 + height + 0.06, z)
  }

  // Crepidoma and stylobate, then a varied silhouette: shrine, library,
  // stoa or circular tholos. All stay within the original two-unit radius.
  box(3.5, 0.22, 3.5, SHADE, 0, 0.11, 0)
  box(3.15, 0.18, 3.15, MARBLE, 0, 0.31, 0)
  if (variant === 3) {
    add(new THREE.CylinderGeometry(0.52, 0.58, 0.58, 12), SHADE, 0, 0.7, 0)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      column(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 1.4)
    }
    add(new THREE.CylinderGeometry(1.7, 1.7, 0.16, 16), MARBLE, 0, 2.22, 0)
    add(new THREE.ConeGeometry(1.7, 0.42, 16), ROOF, 0, 2.5, 0)
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.19, 12), GOLD, 0, 2.79, 0)
  } else {
    const width = variant === 1 ? 2.15 : 1.6
    box(width, 1.75, 2.05, variant === 2 ? SHADE : MARBLE, 0, 1.27, 0)
    box(width + 0.16, 0.16, 2.2, SHADE, 0, 2.2, 0)
    for (const x of [-1.31, 1.31]) for (const z of [-1.22, 1.22]) column(x, z)
    box(3.25, 0.2, 2.95, MARBLE, 0, 2.31, 0)
    // A gable with a long ridge, rather than a four-sided pyramid.
    const roof = new THREE.BufferGeometry()
    roof.setAttribute('position', new THREE.Float32BufferAttribute([
      -1.75, 2.44, -1.55, 1.75, 2.44, -1.55, 0, 3.12, -1.55,
      -1.75, 2.44, 1.55, 1.75, 2.44, 1.55, 0, 3.12, 1.55,
    ], 3))
    roof.setIndex([0, 3, 5, 0, 5, 2, 2, 5, 4, 2, 4, 1, 0, 2, 1, 3, 4, 5])
    roof.computeVertexNormals()
    add(roof.toNonIndexed(), ROOF)
    roof.dispose()
    box(0.12, 0.12, 3.16, GOLD, 0, 3.15, 0)
    if (variant === 1) {
      box(0.62, 1.12, 0.04, DARK, 0, 1.02, 1.05)
      box(0.75, 0.08, 0.12, accent, 0, 1.64, 1.09)
    }
  }

  const flat = parts.map((p) => p.index ? p.toNonIndexed() : p)
  const geometry = mergeGeometries(flat, false)
  for (const p of [...parts, ...flat]) p.dispose()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = mesh.receiveShadow = true
  mesh.userData.kind = ['shrine', 'library', 'stoa', 'tholos'][variant]
  mesh.userData.label = ['Shrine', 'Library', 'Stoa', 'Tholos'][variant]
  mesh.userData.height = geometry.boundingBox.max.y
  mesh.userData.footprint = 1.9
  mesh.userData.progress = 1
  mesh.userData.setProgress = (progress) => {
    const p = THREE.MathUtils.clamp(progress, 0, 1)
    mesh.userData.progress = p
    mesh.scale.y = Math.max(p, 0.001)
    mesh.visible = p > 0.02
  }
  return mesh
}
