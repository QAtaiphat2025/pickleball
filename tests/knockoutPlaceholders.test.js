import test from 'node:test'
import assert from 'node:assert/strict'
import { knockoutPlaceholderLabel } from '../src/knockoutPlaceholders.js'

const matches = [
  { id: 'q1', round: 1, slot: 0 },
  { id: 'q2', round: 1, slot: 1 },
  { id: 'q3', round: 1, slot: 2 },
  { id: 'q4', round: 1, slot: 3 },
  { id: 's1', round: 2, slot: 0, feeds: ['q1', 'q3'] },
  { id: 's2', round: 2, slot: 1, feeds: ['q2', 'q4'] },
  { id: 'f1', round: 3, slot: 0, feeds: ['s1', 's2'] },
]

test('knockoutPlaceholderLabel labels semifinal entrants from quarterfinal winners', () => {
  assert.equal(knockoutPlaceholderLabel(matches[4], 0, matches), 'Thắng Tứ kết 1')
  assert.equal(knockoutPlaceholderLabel(matches[4], 1, matches), 'Thắng Tứ kết 3')
  assert.equal(knockoutPlaceholderLabel(matches[5], 0, matches), 'Thắng Tứ kết 2')
  assert.equal(knockoutPlaceholderLabel(matches[5], 1, matches), 'Thắng Tứ kết 4')
})

test('knockoutPlaceholderLabel labels final entrants from semifinal winners', () => {
  assert.equal(knockoutPlaceholderLabel(matches[6], 0, matches), 'Thắng Bán kết 1')
  assert.equal(knockoutPlaceholderLabel(matches[6], 1, matches), 'Thắng Bán kết 2')
})
