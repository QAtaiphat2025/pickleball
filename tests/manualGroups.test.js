import test from 'node:test'
import assert from 'node:assert/strict'
import { buildManualGroups, validateManualGroupAssignments } from '../src/manualGroups.js'

const pairs = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id }))

test('buildManualGroups creates ordered groups from pair assignments', () => {
  const groups = buildManualGroups(pairs, 2, {
    p1: 0,
    p2: 1,
    p3: 0,
    p4: 1,
  })

  assert.equal(groups.length, 2)
  assert.equal(groups[0].name, 'Bảng A')
  assert.deepEqual(groups[0].pairIds, ['p1', 'p3'])
  assert.equal(groups[1].name, 'Bảng B')
  assert.deepEqual(groups[1].pairIds, ['p2', 'p4'])
})

test('validateManualGroupAssignments rejects missing assignments', () => {
  const result = validateManualGroupAssignments(pairs, 2, {
    p1: 0,
    p2: 1,
    p3: 0,
  })

  assert.equal(result.ok, false)
  assert.match(result.msg, /chưa được xếp bảng/i)
})

test('validateManualGroupAssignments rejects groups with fewer than two pairs', () => {
  const result = validateManualGroupAssignments(pairs, 3, {
    p1: 0,
    p2: 0,
    p3: 1,
    p4: 2,
  })

  assert.equal(result.ok, false)
  assert.match(result.msg, /ít nhất 2 cặp/i)
})
