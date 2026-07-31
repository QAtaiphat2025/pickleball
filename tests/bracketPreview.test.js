import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBracketPreview,
  buildGroupCrossSlots,
  buildPlannedGroupKnockoutPreview,
} from '../src/bracketPreview.js'

test('buildBracketPreview creates quarterfinal, semifinal, and final placeholders for 8 seeds', () => {
  const rounds = buildBracketPreview(
    Array.from({ length: 8 }, (_, i) => ({
      seedNo: i + 1,
      label: `Seed ${i + 1}`,
    })),
  )

  assert.deepEqual(
    rounds.map((r) => r.name),
    ['Tứ kết', 'Bán kết', 'Chung kết'],
  )
  assert.deepEqual(rounds[0].matches[0], {
    no: 1,
    a: { seedNo: 1, label: 'Seed 1' },
    b: { seedNo: 8, label: 'Seed 8' },
  })
  assert.deepEqual(rounds[0].matches[1], {
    no: 2,
    a: { seedNo: 4, label: 'Seed 4' },
    b: { seedNo: 5, label: 'Seed 5' },
  })
  assert.equal(rounds[1].matches[0].a.label, 'Thắng Tứ kết 1')
  assert.equal(rounds[1].matches[0].b.label, 'Thắng Tứ kết 3')
  assert.equal(rounds[1].matches[1].a.label, 'Thắng Tứ kết 2')
  assert.equal(rounds[1].matches[1].b.label, 'Thắng Tứ kết 4')
  assert.equal(rounds[2].matches[0].a.label, 'Thắng Bán kết 1')
})

test('buildBracketPreview marks first seeds as byes when bracket has empty slots', () => {
  const rounds = buildBracketPreview(
    Array.from({ length: 6 }, (_, i) => ({
      seedNo: i + 1,
      label: `Seed ${i + 1}`,
    })),
  )

  assert.equal(rounds[0].name, 'Tứ kết')
  assert.equal(rounds[0].matches[0].a.label, 'Seed 1')
  assert.equal(rounds[0].matches[0].b, null)
  assert.equal(rounds[0].matches[1].a.label, 'Seed 4')
  assert.equal(rounds[0].matches[1].b.label, 'Seed 5')
})

test('buildBracketPreview avoids first round rematches from the same group when possible', () => {
  const rounds = buildBracketPreview([
    { seedNo: 1, label: 'Nhất D', groupIndex: 3 },
    { seedNo: 2, label: 'Nhất A', groupIndex: 0 },
    { seedNo: 3, label: 'Nhất B', groupIndex: 1 },
    { seedNo: 4, label: 'Nhất C', groupIndex: 2 },
    { seedNo: 5, label: 'Nhì D', groupIndex: 3 },
    { seedNo: 6, label: 'Nhì B', groupIndex: 1 },
    { seedNo: 7, label: 'Nhì C', groupIndex: 2 },
    { seedNo: 8, label: 'Nhì A', groupIndex: 0 },
  ])

  const firstRoundMatches = rounds[0].matches
  assert.equal(
    firstRoundMatches.some((m) => m.a?.groupIndex === m.b?.groupIndex),
    false,
  )
  assert.notEqual(firstRoundMatches[3].b.label, 'Nhì B')
})

test('buildPlannedGroupKnockoutPreview creates a full bracket before group scores exist', () => {
  const rounds = buildPlannedGroupKnockoutPreview(
    ['A', 'B', 'C', 'D'].map((name, i) => ({
      name: `Bảng ${name}`,
      order: i,
      pairIds: [`p${i * 2 + 1}`, `p${i * 2 + 2}`],
    })),
    true,
  )

  assert.deepEqual(
    rounds.map((r) => r.name),
    ['Tứ kết', 'Bán kết', 'Chung kết'],
  )
  assert.equal(rounds[0].matches.length, 4)
  assert.equal(rounds[0].matches.some((m) => m.a.groupIndex === m.b.groupIndex), false)
  assert.equal(rounds[1].matches[0].a.label, 'Thắng Tứ kết 1')
  assert.equal(rounds[1].matches[0].b.label, 'Thắng Tứ kết 3')
  assert.equal(rounds[1].matches[1].a.label, 'Thắng Tứ kết 2')
  assert.equal(rounds[1].matches[1].b.label, 'Thắng Tứ kết 4')
  assert.equal(rounds[2].matches[0].a.label, 'Thắng Bán kết 1')
  assert.equal(rounds[2].matches[0].b.label, 'Thắng Bán kết 2')
})

test('buildGroupCrossSlots pairs four group winners against runners-up two groups away', () => {
  const slots = buildGroupCrossSlots([
    { label: 'Nhất A', groupIndex: 0, tier: 1 },
    { label: 'Nhất B', groupIndex: 1, tier: 1 },
    { label: 'Nhất C', groupIndex: 2, tier: 1 },
    { label: 'Nhất D', groupIndex: 3, tier: 1 },
    { label: 'Nhì A', groupIndex: 0, tier: 2 },
    { label: 'Nhì B', groupIndex: 1, tier: 2 },
    { label: 'Nhì C', groupIndex: 2, tier: 2 },
    { label: 'Nhì D', groupIndex: 3, tier: 2 },
  ])

  assert.deepEqual(
    slots.map((s) => s.label),
    ['Nhất A', 'Nhì C', 'Nhất B', 'Nhì D', 'Nhất C', 'Nhì A', 'Nhất D', 'Nhì B'],
  )
})
