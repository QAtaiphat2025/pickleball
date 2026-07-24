import { uid } from './store'

// ---------- utils ----------
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const LEVELS = ['A', 'B', 'C', 'D']

export function pairLabel(pair, athletes) {
  const byId = Object.fromEntries(athletes.map((a) => [a.id, a]))
  const names = pair.players.map((pid) => byId[pid]?.name || '?')
  return names.join(' & ')
}

// ---------- pairing ----------
// mode 'level': ghép A với D, B với C. Trong mỗi nhóm ghép ngẫu nhiên,
// phần còn dư ghép ngẫu nhiên với nhau.
export function pairByLevel(athletes) {
  const byLevel = { A: [], B: [], C: [], D: [] }
  const others = []
  athletes.forEach((a) => {
    if (byLevel[a.level]) byLevel[a.level].push(a)
    else others.push(a)
  })
  Object.keys(byLevel).forEach((k) => {
    byLevel[k] = shuffle(byLevel[k])
  })

  const pairs = []
  const leftover = []

  const zip = (highArr, lowArr) => {
    const high = [...highArr]
    const low = [...lowArr]
    while (high.length && low.length) {
      pairs.push(makePair([high.shift(), low.shift()]))
    }
    // đẩy phần dư vào leftover
    leftover.push(...high, ...low)
  }

  zip(byLevel.A, byLevel.D) // A ↔ D
  zip(byLevel.B, byLevel.C) // B ↔ C

  // gom phần dư + nhóm lạ, ghép ngẫu nhiên
  const rest = shuffle([...leftover, ...others])
  while (rest.length >= 2) {
    pairs.push(makePair([rest.shift(), rest.shift()]))
  }
  const unpaired = rest // 0 hoặc 1 người lẻ

  return { pairs, unpaired }
}

// mode 'random': xáo trộn toàn bộ rồi ghép đôi
export function pairRandom(athletes) {
  const rest = shuffle(athletes)
  const pairs = []
  while (rest.length >= 2) {
    pairs.push(makePair([rest.shift(), rest.shift()]))
  }
  return { pairs, unpaired: rest }
}

export function makePair(twoAthletes) {
  return {
    id: uid('p'),
    players: twoAthletes.map((a) => a.id),
  }
}

// ---------- scheduling ----------
// Vòng tròn: mọi cặp gặp nhau đúng 1 lần
export function scheduleRoundRobin(pairs) {
  const matches = []
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      matches.push(makeMatch(pairs[i].id, pairs[j].id, { round: 0 }))
    }
  }
  return matches
}

// ---------- vòng bảng ----------
const GROUP_NAMES = 'ABCDEFGH'.split('')

export function groupName(index) {
  return GROUP_NAMES[index] || `${index + 1}`
}

// Chia cặp vào n bảng theo kiểu rắn (snake) để các bảng đều nhau.
// vd 8 cặp, 2 bảng: A=[0,3,4,7] B=[1,2,5,6]
export function distributeGroups(pairs, numGroups) {
  const n = Math.max(1, Math.min(numGroups, pairs.length))
  const buckets = Array.from({ length: n }, () => [])
  let dir = 1
  let col = 0
  pairs.forEach((p) => {
    buckets[col].push(p.id)
    if (dir === 1) {
      if (col === n - 1) dir = -1
      else col++
    } else {
      if (col === 0) dir = 1
      else col--
    }
  })
  return buckets.map((pairIds, i) => ({
    id: uid('g'),
    name: `Bảng ${groupName(i)}`,
    order: i,
    pairIds,
  }))
}

// Lịch vòng tròn cho từng bảng. Mỗi trận gắn stage:'group' + groupId.
export function scheduleGroupStage(groups) {
  const matches = []
  groups.forEach((g) => {
    for (let i = 0; i < g.pairIds.length; i++) {
      for (let j = i + 1; j < g.pairIds.length; j++) {
        matches.push(
          makeMatch(g.pairIds[i], g.pairIds[j], {
            round: 0,
            stage: 'group',
            groupId: g.id,
          }),
        )
      }
    }
  })
  return matches
}

// Đã nhập đủ tỉ số toàn bộ trận vòng bảng?
export function groupStageComplete(matches) {
  const groupMatches = matches.filter((m) => m.stage === 'group')
  if (groupMatches.length === 0) return false
  return groupMatches.every((m) => m.scoreA != null && m.scoreB != null)
}

// BXH của 1 bảng: tái dùng roundRobinStandings với trận đã lọc.
export function computeGroupStandings(group, pairs, matches, athletes) {
  const pairsInGroup = pairs.filter((p) => group.pairIds.includes(p.id))
  const groupMatches = matches.filter((m) => m.groupId === group.id)
  return roundRobinStandings(pairsInGroup, groupMatches, athletes)
}

// Lấy nhất + nhì mỗi bảng. Trả { first:[pairId...], second:[pairId...] }
// theo đúng thứ tự bảng (index).
export function qualifiersFromGroups(groups, pairs, matches, athletes) {
  const first = []
  const second = []
  groups.forEach((g) => {
    const st = computeGroupStandings(g, pairs, matches, athletes)
    first.push(st[0] ? st[0].pairId : null)
    second.push(st[1] ? st[1].pairId : null)
  })
  return { first, second }
}

// Dựng nhánh knockout từ kết quả bảng, cross-seed cố định:
// nhất bảng A gặp nhì bảng kế (B), nhất B gặp nhì C, ... nhất cuối gặp nhì A.
export function buildKnockoutFromGroups(groups, pairs, matches, athletes) {
  const { first, second } = qualifiersFromGroups(groups, pairs, matches, athletes)
  const n = groups.length
  const seedPairs = []
  for (let i = 0; i < n; i++) {
    const f = first[i]
    const s = second[(i + 1) % n] // nhì của bảng kế tiếp (cuộn vòng)
    if (f) seedPairs.push({ id: f })
    if (s) seedPairs.push({ id: s })
  }
  const ko = scheduleKnockout(seedPairs)
  return ko.map((m) => ({ ...m, stage: 'knockout' }))
}

// Nhánh loại trực tiếp: seed theo thứ tự hiện có, chèn bye khi lẻ.
// Sinh đầy đủ cây trận (các vòng sau để trống, điền dần khi có kết quả).
export function scheduleKnockout(pairs) {
  const n = pairs.length
  if (n < 2) return []
  const size = nextPow2(n)
  const seeds = [...pairs.map((p) => p.id)]
  while (seeds.length < size) seeds.push(null) // bye

  const rounds = Math.log2(size)
  const matches = []

  // vòng 1
  let roundSlots = []
  for (let i = 0; i < size; i += 2) {
    const m = makeMatch(seeds[i], seeds[i + 1], { round: 1, slot: i / 2 })
    // auto-advance nếu gặp bye
    if (seeds[i] && !seeds[i + 1]) m.winner = seeds[i]
    else if (!seeds[i] && seeds[i + 1]) m.winner = seeds[i + 1]
    matches.push(m)
    roundSlots.push(m)
  }

  // các vòng sau (trống)
  let prev = roundSlots
  for (let r = 2; r <= rounds; r++) {
    const cur = []
    for (let i = 0; i < prev.length; i += 2) {
      const m = makeMatch(null, null, {
        round: r,
        slot: i / 2,
        feeds: [prev[i].id, prev[i + 1].id],
      })
      matches.push(m)
      cur.push(m)
    }
    prev = cur
  }
  // đánh dấu trận chung kết & tranh 3 (bán kết thua)
  propagateByes(matches)
  return matches
}

function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

// đẩy winner của bye tiến lên vòng sau ngay khi tạo cây
function propagateByes(matches) {
  const byId = Object.fromEntries(matches.map((m) => [m.id, m]))
  const sorted = [...matches].sort((a, b) => a.round - b.round || a.slot - b.slot)
  sorted.forEach((m) => {
    if (m.winner && m.feedsInto == null) {
      // tìm trận vòng sau nhận winner này
    }
  })
  // liên kết feeds → child; rồi advance winner bye
  sorted.forEach((m) => {
    if (m.feeds) {
      m.feeds.forEach((fid, idx) => {
        const child = byId[fid]
        if (child) child.feedInfo = { parent: m.id, index: idx }
      })
    }
  })
  // advance các trận bye đã có winner
  sorted.forEach((m) => {
    if (m.winner && m.feedInfo) {
      const parent = byId[m.feedInfo.parent]
      if (parent) {
        if (m.feedInfo.index === 0) parent.a = m.winner
        else parent.b = m.winner
      }
    }
  })
}

export function makeMatch(a, b, extra = {}) {
  return {
    id: uid('m'),
    a, // pairId hoặc null
    b,
    scoreA: null,
    scoreB: null,
    winner: null, // pairId
    ...extra,
  }
}

// ---------- scoring: 11 điểm, hơn 2 ----------
export function validateScore(scoreA, scoreB) {
  const a = Number(scoreA)
  const b = Number(scoreB)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return { ok: false, msg: 'Tỉ số phải là số nguyên ≥ 0' }
  }
  if (a === b) return { ok: false, msg: 'Không thể hoà' }
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  // phải đạt tối thiểu 11
  if (hi < 11) return { ok: false, msg: 'Bên thắng phải đạt tối thiểu 11 điểm' }
  // hơn đúng 2 khi đã tới 11: nếu thua < 10 thì thắng phải = 11
  if (lo <= 9 && hi !== 11) {
    return { ok: false, msg: 'Thắng ở 11 khi đối thủ ≤ 9 (không đánh tiếp)' }
  }
  // deuce: từ 10-10 trở đi phải hơn đúng 2
  if (lo >= 10 && hi - lo !== 2) {
    return { ok: false, msg: 'Deuce: bên thắng phải hơn đúng 2 điểm' }
  }
  return { ok: true }
}

export function winnerOf(match) {
  if (match.scoreA == null || match.scoreB == null) return null
  return match.scoreA > match.scoreB ? match.a : match.b
}

// khi nhập xong 1 trận knockout, đẩy winner lên trận cha
export function advanceWinner(matches, matchId) {
  const byId = Object.fromEntries(matches.map((m) => [m.id, m]))
  const m = byId[matchId]
  if (!m || !m.winner || !m.feedInfo) return matches
  const parent = byId[m.feedInfo.parent]
  if (parent) {
    if (m.feedInfo.index === 0) parent.a = m.winner
    else parent.b = m.winner
  }
  return matches
}

// ---------- standings ----------
// Vòng tròn: thắng → hiệu số điểm
export function roundRobinStandings(pairs, matches, athletes) {
  const stats = {}
  pairs.forEach((p) => {
    stats[p.id] = {
      pairId: p.id,
      label: pairLabel(p, athletes),
      played: 0,
      wins: 0,
      losses: 0,
      pf: 0, // points for
      pa: 0, // points against
      diff: 0,
    }
  })
  matches.forEach((m) => {
    if (m.scoreA == null || m.scoreB == null) return
    const sa = stats[m.a]
    const sb = stats[m.b]
    if (!sa || !sb) return
    sa.played++
    sb.played++
    sa.pf += m.scoreA
    sa.pa += m.scoreB
    sb.pf += m.scoreB
    sb.pa += m.scoreA
    if (m.scoreA > m.scoreB) {
      sa.wins++
      sb.losses++
    } else {
      sb.wins++
      sa.losses++
    }
  })
  const list = Object.values(stats)
  list.forEach((s) => {
    s.diff = s.pf - s.pa
  })
  list.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pf - x.pf)
  list.forEach((s, i) => {
    s.rank = i + 1
  })
  return list
}

// Knockout: nhất = vô địch, nhì = thua CK, đồng ba = 2 cặp thua bán kết
export function knockoutResults(pairs, matches, athletes) {
  if (!matches.length) return null
  const maxRound = Math.max(...matches.map((m) => m.round || 0))
  const final = matches.find((m) => m.round === maxRound)
  const semis = matches.filter((m) => m.round === maxRound - 1)

  const label = (pid) => {
    const p = pairs.find((x) => x.id === pid)
    return p ? pairLabel(p, athletes) : null
  }

  let champion = null
  let runnerUp = null
  if (final && final.winner) {
    champion = final.winner
    runnerUp = final.winner === final.a ? final.b : final.a
  }

  const third = []
  semis.forEach((m) => {
    if (m.winner) {
      const loser = m.winner === m.a ? m.b : m.a
      if (loser) third.push(loser)
    }
  })

  return {
    champion: champion ? { pairId: champion, label: label(champion) } : null,
    runnerUp: runnerUp ? { pairId: runnerUp, label: label(runnerUp) } : null,
    third: third.map((pid) => ({ pairId: pid, label: label(pid) })),
    finalDone: !!(final && final.winner),
  }
}
