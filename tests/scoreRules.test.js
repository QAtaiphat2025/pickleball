import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreRuleLabel, validateScore } from '../src/scoreRules.js'

test('validateScore supports capped win-by-2 mode', () => {
  const rules = { winPoint: 11, scoreMode: 'cap' }

  assert.deepEqual(validateScore(11, 9, rules), { ok: true })
  assert.deepEqual(validateScore(12, 10, rules), { ok: true })
  assert.deepEqual(validateScore(15, 14, rules), { ok: true })
  assert.deepEqual(validateScore(15, 13, rules), { ok: true })
  assert.equal(validateScore(11, 10, rules).ok, false)
  assert.equal(validateScore(14, 13, rules).ok, false)
  assert.equal(validateScore(16, 14, rules).ok, false)
})

test('scoreRuleLabel describes capped mode', () => {
  assert.equal(scoreRuleLabel({ winPoint: 15, scoreMode: 'cap' }), '15 điểm · cách 2, chạm 19')
})
