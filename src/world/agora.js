import * as THREE from 'three'

/** Central sanctuary with the Ship's movement interface. The path between the
 * inner doorway and plaza edge is deliberately clear for arriving agents. */
export class Agora {
  constructor(scene, position) {
    this.scene = scene
    this.group = new THREE.Group()
    this.group.name = 'agora'
    this.group.position.copy(position)
    this.group.rotation.y = Math.atan2(-position.x, -position.z)
    scene.add(this.group)
    const stone = new THREE.MeshStandardMaterial({ color: 0xe8dcc1, roughness: 0.9 })
    const shadow = new THREE.MeshStandardMaterial({ color: 0xb6a582, roughness: 0.95 })
    const gold = new THREE.MeshStandardMaterial({ color: 0xc8a45a, roughness: 0.44, metalness: 0.32 })
    const terracotta = new THREE.MeshStandardMaterial({ color: 0x9e6347, roughness: 0.86 })
    const piece = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      mesh.castShadow = mesh.receiveShadow = true
      this.group.add(mesh)
      return mesh
    }
    piece(new THREE.CylinderGeometry(3.35, 3.6, 0.35, 16), shadow, 0, 0.18, 0)
    piece(new THREE.CylinderGeometry(2.9, 3.12, 0.22, 16), stone, 0, 0.45, 0)
    // Sanctuary faces away from the plaza entrance (+Z), leaving the approach open.
    piece(new THREE.BoxGeometry(3.3, 2.4, 2.25), stone, 0, 1.78, -0.55)
    piece(new THREE.BoxGeometry(3.8, 0.22, 2.8), shadow, 0, 3.05, -0.55)
    for (const x of [-2.05, 2.05]) for (const z of [-1.65, 0.55]) {
      piece(new THREE.CylinderGeometry(0.17, 0.21, 2.45, 12), stone, x, 1.78, z)
      piece(new THREE.BoxGeometry(0.48, 0.16, 0.48), shadow, x, 2.97, z)
    }
    const pediment = piece(new THREE.ConeGeometry(2.7, 0.9, 4), terracotta, 0, 3.62, -0.55)
    pediment.rotation.y = Math.PI / 4
    piece(new THREE.CylinderGeometry(0.4, 0.48, 0.85, 12), stone, 0, 0.99, 2.25)
    this.flame = piece(new THREE.ConeGeometry(0.26, 0.65, 9), gold, 0, 1.7, 2.25)
    // Keep the same exit endpoints as the lander: navigation and arrival timing use them.
    this.doorLocal = new THREE.Vector3(0, 0.22, 4.6)
    this.airlockLocal = new THREE.Vector3(0, 0.47, 1.25)
    this.traffic = 0
  }
  shipDoor(out = new THREE.Vector3()) {
    this.group.updateWorldMatrix(true, false)
    return out.copy(this.doorLocal).applyMatrix4(this.group.matrixWorld)
  }
  shipAirlock(out = new THREE.Vector3()) {
    this.group.updateWorldMatrix(true, false)
    return out.copy(this.airlockLocal).applyMatrix4(this.group.matrixWorld)
  }
  update(dt, elapsed) {
    this.traffic = Math.max(0, this.traffic - dt)
    this.flame.scale.setScalar(1 + 0.09 * Math.sin(elapsed * 5) + Math.min(this.traffic, 1) * 0.2)
  }
  ping() { this.traffic = Math.min(2, this.traffic + 1) }
  dispose() {
    const materials = new Set()
    this.group.traverse((o) => {
      if (!o.isMesh) return
      o.geometry.dispose()
      materials.add(o.material)
    })
    for (const material of materials) material.dispose()
    this.scene.remove(this.group)
  }
}
