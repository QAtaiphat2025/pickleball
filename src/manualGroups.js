const GROUP_NAMES = 'ABCDEFGH'.split('')

function groupName(index) {
  return GROUP_NAMES[index] || `${index + 1}`
}

function pairIdOf(pairOrId) {
  return typeof pairOrId === 'string' ? pairOrId : pairOrId?.id
}

export function validateManualGroupAssignments(pairs, numGroups, assignments) {
  const n = Math.max(1, Math.floor(Number(numGroups) || 1))
  const pairIds = pairs.map(pairIdOf).filter(Boolean)
  const pairIdSet = new Set(pairIds)
  const buckets = Array.from({ length: n }, () => [])

  for (const pairId of pairIds) {
    const raw = assignments?.[pairId]
    if (raw == null || raw === '') {
      return { ok: false, msg: 'Có cặp chưa được xếp bảng' }
    }
    const groupIndex = Number(raw)
    if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex >= n) {
      return { ok: false, msg: 'Có cặp được xếp vào bảng không hợp lệ' }
    }
    buckets[groupIndex].push(pairId)
  }

  const assignedIds = Object.keys(assignments || {})
  const unknown = assignedIds.find((pairId) => !pairIdSet.has(pairId))
  if (unknown) return { ok: false, msg: 'Có cặp không còn trong danh sách hiện tại' }

  const smallIndex = buckets.findIndex((ids) => ids.length < 2)
  if (smallIndex >= 0) {
    return { ok: false, msg: `Bảng ${groupName(smallIndex)} cần ít nhất 2 cặp` }
  }

  return { ok: true }
}

export function buildManualGroups(pairs, numGroups, assignments) {
  const n = Math.max(1, Math.floor(Number(numGroups) || 1))
  const buckets = Array.from({ length: n }, () => [])

  pairs.forEach((pair) => {
    const pairId = pairIdOf(pair)
    const groupIndex = Number(assignments[pairId])
    buckets[groupIndex].push(pairId)
  })

  return buckets.map((pairIds, i) => ({
    id: `g_manual_${i + 1}`,
    name: `Bảng ${groupName(i)}`,
    order: i,
    pairIds,
  }))
}
