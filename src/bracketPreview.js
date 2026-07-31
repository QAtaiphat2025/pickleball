function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

function seedOrder(size) {
  let arr = [1, 2]
  while (arr.length < size) {
    const total = arr.length * 2 + 1
    const next = []
    arr.forEach((s) => {
      next.push(s, total - s)
    })
    arr = next
  }
  return arr
}

function roundName(round, maxRound) {
  if (round === maxRound) return 'Chung kết'
  if (round === maxRound - 1) return 'Bán kết'
  if (round === maxRound - 2) return 'Tứ kết'
  if (round === maxRound - 3) return 'Vòng 1/8'
  return `Vòng ${round}`
}

function winnerLabel(name, no) {
  return { label: `Thắng ${name} ${no}` }
}

function nextRoundSources(previousWinners) {
  if (previousWinners.length === 4) {
    return [previousWinners[0], previousWinners[2], previousWinners[1], previousWinners[3]]
  }
  return previousWinners
}

function groupName(group, index) {
  const explicit = group?.name?.replace(/^Bảng\s+/i, '').trim()
  if (explicit) return explicit
  return 'ABCDEFGH'[index] || `${index + 1}`
}

function sameGroup(a, b) {
  return a && b && a.groupIndex != null && a.groupIndex === b.groupIndex
}

function avoidSameGroupRound1(matches) {
  matches.forEach((m, i) => {
    if (!sameGroup(m.a, m.b)) return
    for (let j = 0; j < matches.length; j++) {
      if (j === i) continue
      const other = matches[j]
      if (!other.a || !other.b) continue
      if (!sameGroup(m.a, other.b) && !sameGroup(other.a, m.b)) {
        const tmp = m.b
        m.b = other.b
        other.b = tmp
        return
      }
    }
  })
}

export function buildGroupCrossSlots(seeds) {
  const firsts = seeds.filter((s) => s.tier === 1 && s.groupIndex != null)
  const seconds = seeds.filter((s) => s.tier === 2 && s.groupIndex != null)
  const groupIndexes = [...new Set([...firsts, ...seconds].map((s) => s.groupIndex))].sort(
    (a, b) => a - b,
  )
  const groupCount = groupIndexes.length

  if (groupCount < 2 || groupCount % 2 !== 0) return null
  if (firsts.length !== groupCount || seconds.length !== groupCount) return null

  const firstByGroup = Object.fromEntries(firsts.map((s) => [s.groupIndex, s]))
  const secondByGroup = Object.fromEntries(seconds.map((s) => [s.groupIndex, s]))
  const offset = groupCount / 2
  const slots = []

  for (let i = 0; i < groupCount; i++) {
    const groupIndex = groupIndexes[i]
    const opponentGroupIndex = groupIndexes[(i + offset) % groupCount]
    const first = firstByGroup[groupIndex]
    const second = secondByGroup[opponentGroupIndex]
    if (!first || !second) return null
    slots.push(first, second)
  }

  const others = seeds.filter((s) => s.tier !== 1 && s.tier !== 2)
  return others.length > 0 ? null : slots
}

export function buildBracketPreview(seeds) {
  if (!Array.isArray(seeds) || seeds.length < 2) return []

  const size = nextPow2(seeds.length)
  const crossSlots = buildGroupCrossSlots(seeds)
  const orderedSlots = crossSlots
    ? Array.from({ length: size }, (_, i) => crossSlots[i] || null)
    : seedOrder(size).map((seedNo) => seeds[seedNo - 1] || null)
  const maxRound = Math.log2(size)
  const rounds = []

  let previousWinners = []
  for (let round = 1; round <= maxRound; round++) {
    const name = roundName(round, maxRound)
    const source = round === 1 ? orderedSlots : nextRoundSources(previousWinners)
    const matches = []

    for (let i = 0; i < source.length; i += 2) {
      matches.push({
        no: i / 2 + 1,
        a: source[i] || null,
        b: source[i + 1] || null,
      })
    }
    if (round === 1) avoidSameGroupRound1(matches)

    rounds.push({ round, name, matches })
    previousWinners = matches.map((m) => winnerLabel(name, m.no))
  }

  return rounds
}

export function buildPlannedGroupKnockoutPreview(groups, advanceThirds = true) {
  if (!Array.isArray(groups) || groups.length < 2) return []

  const orderedGroups = [...groups].sort((a, b) => (a.order || 0) - (b.order || 0))
  const firsts = []
  const seconds = []
  const thirds = []

  orderedGroups.forEach((group, groupIndex) => {
    const name = groupName(group, groupIndex)
    const size = group.pairIds?.length || 0
    if (size >= 1) firsts.push({ label: `Nhất ${name}`, groupIndex, tier: 1 })
    if (size >= 2) seconds.push({ label: `Nhì ${name}`, groupIndex, tier: 2 })
    if (size >= 3) thirds.push({ label: `Ba ${name}`, groupIndex, tier: 3 })
  })

  const seeds = [...firsts, ...seconds]
  if (advanceThirds) {
    const need = nextPow2(seeds.length) - seeds.length
    seeds.push(...thirds.slice(0, need))
  }

  return buildBracketPreview(seeds.map((seed, i) => ({ ...seed, seedNo: i + 1 })))
}
