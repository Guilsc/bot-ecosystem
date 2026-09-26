import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createGreekBuilding } from '../src/world/greek-buildings.js'
import { Agora } from '../src/world/agora.js'
import { PLANETS, PLANET_ORDER, terrainHeight, createTerrain, SKY_MARGIN } from '../src/world/planet.js'
import { createHexIsland } from '../src/world/hexisland.js'
import { Settings } from '../src/core/settings.js'

test('only three realms remain and retired saved selections migrate to Olympus', () => {
  assert.deepEqual(Object.keys(PLANETS), ['olympus', 'moon', 'terra'])
  assert.deepEqual(PLANET_ORDER, ['olympus', 'moon', 'terra'])
  const before = globalThis.localStorage
  globalThis.localStorage = { getItem: () => JSON.stringify({ planet: 'ocean' }) }
  try {
    const settings = new Settings()
    assert.equal(settings.get('planet'), 'olympus')
    assert.equal(settings.needsRealmSelection, true)
    settings.applyAll({ planet: 'mars' })
    assert.equal(settings.get('planet'), 'olympus')
    assert.equal(settings.selectRealm('unknown'), false)
    assert.equal(settings.needsRealmSelection, true)
    assert.equal(settings.selectRealm('olympus'), true)
    assert.equal(settings.needsRealmSelection, false)
    clearTimeout(settings._saveTimer)
  } finally {
    globalThis.localStorage = before
  }
})

test('a returning visitor keeps the last available world as the preview', () => {
  const before = globalThis.localStorage
  globalThis.localStorage = { getItem: () => JSON.stringify({ planet: 'moon' }) }
  try {
    const settings = new Settings()
    assert.equal(settings.needsRealmSelection, false)
    assert.equal(settings.get('planet'), 'moon')
  } finally {
    globalThis.localStorage = before
  }
})

test('Olympus uses the floating island footprint and restored rock underside', () => {
  assert.equal(PLANETS.olympus.shape, 'sky')
  assert.equal(PLANETS.olympus.water, undefined)
  const cells = [{ x: 0, z: 0 }, { x: 11.4, z: 6.58 }]
  const terrain = createTerrain(PLANETS.olympus, 'low')
  assert.equal(typeof terrain.userData.setFootprint, 'function')
  terrain.userData.setFootprint(cells, 7.6 + SKY_MARGIN)
  const island = createHexIsland({ cells, cellRadius: 7.6, margin: SKY_MARGIN, palette: PLANETS.olympus.skyIsland, quality: 'low' })
  assert.ok(island.group.children.length >= 2)
  assert.ok(Math.abs(terrainHeight(0, 0, PLANETS.olympus)) < 0.5)
  island.dispose()
  terrain.geometry.dispose()
  terrain.material.dispose()
})

test('Olympus buildings keep the colony mesh contract across all four silhouettes', () => {
  const kinds = new Set()
  for (let seed = 1; seed <= 64; seed++) {
    const mesh = createGreekBuilding({ seed })
    kinds.add(mesh.userData.kind)
    assert.ok(mesh.geometry.getAttribute('position').count > 0)
    assert.ok(mesh.userData.footprint <= 2)
    mesh.userData.setProgress(0.4)
    assert.equal(mesh.userData.progress, 0.4)
    assert.equal(mesh.scale.y, 0.4)
    mesh.geometry.dispose()
    mesh.material.dispose()
  }
  assert.equal(kinds.size, 4)
})

test('agora exposes the arrival and departure points required by navigation', () => {
  const scene = new THREE.Scene()
  const agora = new Agora(scene, new THREE.Vector3(12, 0, 4))
  const door = agora.shipDoor()
  const airlock = agora.shipAirlock()
  assert.ok(door.distanceTo(airlock) > 2)
  assert.ok(door.distanceTo(agora.group.position) < 6)
  agora.ping()
  agora.update(0.1, 2)
  agora.dispose()
  assert.equal(scene.children.length, 0)
  assert.equal(PLANETS.olympus.shape, 'sky')
})
