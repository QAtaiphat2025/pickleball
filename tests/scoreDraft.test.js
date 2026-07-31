import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreDraftChanged } from '../src/scoreDraft.js'

test('scoreDraftChanged is false for saved score without draft changes', () => {
  assert.equal(scoreDraftChanged({ scoreA: 11, scoreB: 7 }, undefined), false)
  assert.equal(scoreDraftChanged({ scoreA: 11, scoreB: 7 }, { a: 11, b: 7 }), false)
})

test('scoreDraftChanged is true when a saved score changes', () => {
  assert.equal(scoreDraftChanged({ scoreA: 11, scoreB: 7 }, { a: 12, b: 7 }), true)
  assert.equal(scoreDraftChanged({ scoreA: 11, scoreB: 7 }, { a: 11, b: 9 }), true)
})

test('scoreDraftChanged is true only after entering a complete new score', () => {
  assert.equal(scoreDraftChanged({ scoreA: null, scoreB: null }, undefined), false)
  assert.equal(scoreDraftChanged({ scoreA: null, scoreB: null }, { a: 11 }), false)
  assert.equal(scoreDraftChanged({ scoreA: null, scoreB: null }, { a: 11, b: 8 }), true)
})
