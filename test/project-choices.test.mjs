import test from 'node:test'
import assert from 'node:assert/strict'
import { projectChoices } from '../src/game/hidden-projects.js'

test('world choices list active projects without including archived or hidden bots', () => {
  const threads = [
    { id: '1', project: 'Alpha' },
    { id: '2', project: 'Alpha' },
    { id: '3', project: 'Beta' },
    { id: '4', project: 'Hidden' },
    { id: '5', project: 'Archived', archived: true },
  ]
  assert.deepEqual(projectChoices(threads, ['2'], ['Hidden']), [
    { name: 'Alpha', count: 1 },
    { name: 'Beta', count: 1 },
  ])
  assert.deepEqual(threads.map((t) => t.id), ['1', '2', '3', '4', '5'])
})
