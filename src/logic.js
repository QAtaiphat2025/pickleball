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

// Số cặp mỗi bảng khi rải snake (chỉ tính số lượng, không cần cặp thật).
export function groupSizes(numPairs, numGroups) {
  const n = Math.max(1, Math.min(numGroups, numPairs || 1))
  const sizes = Array.from({ length: n }, () => 0)
  let dir = 1
  let col = 0
  for (let i = 0; i < numPairs; i++) {
    sizes[col]++
    if (dir === 1) {
      if (col === n - 1) dir = -1
      else col++
    } else {
      if (col === 0) dir = 1
      else col--
    }
  }
  return sizes
}

// Tóm tắt một phương án giải đấu: số cặp, số bảng, số trận từng vòng.
// numAthletes: số VĐV dự kiến (2 người / cặp, lẻ 1 người sẽ bị dư).
export function planTournament({ numAthletes, format, numGroups, advanceThirds = true }) {
  const athletes = Math.max(0, Math.floor(Number(numAthletes) || 0))
  const numPairs = Math.floor(athletes / 2)
  const leftover = athletes % 2
  const plan = {
    numAthletes: athletes,
    numPairs,
    leftover,
    format,
    groupMatches: 0,
    knockoutMatches: 0,
    totalMatches: 0,
    sizes: [],
    qualifiers: 0,
    thirdsUsed: 0,
    bracketSize: 0,
    byes: 0,
    warnings: [],
  }
  if (numPairs < 2) {
    plan.warnings.push('Cần tối thiểu 4 VĐV (2 cặp) để có trận đấu.')
    return plan
  }

  if (format === 'round-robin') {
    plan.groupMatches = (numPairs * (numPairs - 1)) / 2
    plan.totalMatches = plan.groupMatches
    return plan
  }

  if (format === 'knockout') {
    plan.bracketSize = nextPow2(numPairs)
    plan.byes = plan.bracketSize - numPairs
    plan.qualifiers = numPairs
    plan.knockoutMatches = numPairs - 1
    plan.totalMatches = plan.knockoutMatches
    return plan
  }

  // group-knockout
  const n = Math.max(2, Math.min(Number(numGroups) || 2, numPairs))
  const sizes = groupSizes(numPairs, n)
  plan.sizes = sizes
  plan.numGroups = sizes.length
  plan.groupMatches = sizes.reduce((s, k) => s + (k * (k - 1)) / 2, 0)

  const base = sizes.filter((k) => k >= 1).length + sizes.filter((k) => k >= 2).length
  const thirdsAvailable = sizes.filter((k) => k >= 3).length
  let qualifiers = base
  let thirdsUsed = 0
  if (advanceThirds) {
    const need = nextPow2(base) - base
    thirdsUsed = Math.min(need, thirdsAvailable)
    qualifiers += thirdsUsed
  }
  plan.qualifiers = qualifiers
  plan.thirdsUsed = thirdsUsed
  plan.bracketSize = nextPow2(qualifiers)
  plan.byes = plan.bracketSize - qualifiers
  plan.knockoutMatches = qualifiers - 1
  plan.totalMatches = plan.groupMatches + plan.knockoutMatches

  if (sizes.some((k) => k < 2)) {
    plan.warnings.push(`${n} bảng là quá nhiều cho ${numPairs} cặp, có bảng chỉ 1 cặp.`)
  } else if (sizes.some((k) => k < 3)) {
    plan.warnings.push('Có bảng chỉ 2 cặp: bảng đó không có hạng ba để vớt.')
  }
  if (plan.byes > 0) {
    plan.warnings.push(
      `${plan.qualifiers} cặp vào nhánh ${plan.bracketSize} → ${plan.byes} cặp được miễn vòng 1 (bye).`,
    )
  }
  return plan
}

// Gợi ý các phương án số bảng cho số cặp cho trước.
// Ưu tiên bảng 4–5 cặp: đủ trận để xếp hạng mà không quá dài.
export function suggestGroupPlans(numAthletes, advanceThirds = true) {
  const numPairs = Math.floor((Number(numAthletes) || 0) / 2)
  const out = []
  for (let n = 2; n <= Math.min(8, Math.floor(numPairs / 2)); n++) {
    const plan = planTournament({
      numAthletes,
      format: 'group-knockout',
      numGroups: n,
      advanceThirds,
    })
    const sizes = plan.sizes
    const min = Math.min(...sizes)
    const max = Math.max(...sizes)
    if (min < 2) continue
    out.push({
      numGroups: n,
      sizes,
      sizeLabel:
        min === max ? `${n} bảng × ${min} cặp` : `${n} bảng (${sizes.join('-')} cặp)`,
      groupMatches: plan.groupMatches,
      knockoutMatches: plan.knockoutMatches,
      totalMatches: plan.totalMatches,
      qualifiers: plan.qualifiers,
      thirdsUsed: plan.thirdsUsed,
      recommended: min >= 3 && max <= 5,
    })
  }
  return out
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

// Lấy nhất + nhì mỗi bảng, kèm danh sách hạng ba đã xếp theo thành tích.
// Trả { first:[pairId...], second:[pairId...], thirds:[stat...] }
// first/second theo đúng thứ tự bảng (index); thirds xếp tốt nhất trước.
export function qualifiersFromGroups(groups, pairs, matches, athletes) {
  const first = []
  const second = []
  const thirds = []
  groups.forEach((g, gi) => {
    const st = computeGroupStandings(g, pairs, matches, athletes)
    first.push(st[0] ? { ...st[0], groupIndex: gi } : null)
    second.push(st[1] ? { ...st[1], groupIndex: gi } : null)
    if (st[2]) thirds.push({ ...st[2], groupIndex: gi })
  })
  thirds.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pf - x.pf)
  return { first, second, thirds }
}

// So sánh thành tích 2 cặp (dùng chung cho việc xếp seed knockout)
function byPerformance(x, y) {
  return y.wins - x.wins || y.diff - x.diff || y.pf - x.pf
}

// Danh sách cặp đi tiếp, xếp theo seed: nhất bảng trước (mạnh nhất seed 1),
// rồi nhì bảng, rồi các cặp hạng ba tốt nhất được vớt lên cho đủ nhánh.
export function knockoutSeeds(groups, pairs, matches, athletes, opts = {}) {
  const fillWithThirds = opts.fillWithThirds !== false
  const { first, second, thirds } = qualifiersFromGroups(groups, pairs, matches, athletes)
  const firsts = first.filter(Boolean).sort(byPerformance).map((s) => ({ ...s, tier: 1 }))
  const seconds = second.filter(Boolean).sort(byPerformance).map((s) => ({ ...s, tier: 2 }))
  const seeds = [...firsts, ...seconds]
  if (fillWithThirds) {
    const need = nextPow2(seeds.length) - seeds.length
    thirds.slice(0, need).forEach((s) => seeds.push({ ...s, tier: 3 }))
  }
  return seeds
}

// Dựng nhánh knockout từ kết quả bảng.
// Seed chuẩn 1–N (1 gặp N, 2 gặp N-1...) nên bye luôn rơi vào seed mạnh nhất
// và không bao giờ có trận BYE gặp BYE. Sau đó tránh cặp cùng bảng gặp lại
// nhau ngay vòng 1 nếu còn cách đổi được.
export function buildKnockoutFromGroups(groups, pairs, matches, athletes, opts = {}) {
  const seeds = knockoutSeeds(groups, pairs, matches, athletes, opts)
  const ko = scheduleKnockout(seeds.map((s) => ({ id: s.pairId })))
  const groupOf = Object.fromEntries(seeds.map((s) => [s.pairId, s.groupIndex]))
  avoidSameGroupRound1(ko, groupOf)
  return ko.map((m) => ({ ...m, stage: 'knockout' }))
}

// Đổi chỗ đối thủ giữa 2 trận vòng 1 để 2 cặp cùng bảng không gặp lại nhau.
// Chỉ đụng các trận có đủ 2 cặp (trận bye giữ nguyên).
function avoidSameGroupRound1(matches, groupOf) {
  const r1 = matches.filter((m) => m.round === 1).sort((x, y) => x.slot - y.slot)
  const clash = (m) => m.a && m.b && groupOf[m.a] === groupOf[m.b]
  r1.forEach((m, i) => {
    if (!clash(m)) return
    for (let j = 0; j < r1.length; j++) {
      if (j === i) continue
      const o = r1[j]
      if (!o.a || !o.b) continue
      // đổi đối thủ 2 trận; chỉ nhận nếu sau khi đổi cả 2 trận đều khác bảng
      if (groupOf[m.a] !== groupOf[o.b] && groupOf[o.a] !== groupOf[m.b]) {
        const tmp = m.b
        m.b = o.b
        o.b = tmp
        return
      }
    }
  })
}

// Nhánh loại trực tiếp: seed theo thứ tự hiện có, chèn bye khi lẻ.
// Sinh đầy đủ cây trận (các vòng sau để trống, điền dần khi có kết quả).
export function scheduleKnockout(pairs) {
  const n = pairs.length
  if (n < 2) return []
  const size = nextPow2(n)
  // rải bye theo thứ tự seed chuẩn: 1 gặp size, 2 gặp size-1...
  // → bye rơi vào các seed đầu, không bao giờ có 2 bye cùng 1 trận.
  const order = seedOrder(size)
  const ids = pairs.map((p) => p.id)
  const seeds = order.map((s) => (s <= n ? ids[s - 1] : null))

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

// Thứ tự seed chuẩn của nhánh loại trực tiếp size (size là luỹ thừa của 2).
// vd size 8 → [1,8,4,5,2,7,3,6]: seed 1 gặp 8, seed 4 gặp 5, ...
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

// ---------- scoring ----------
// Luật tính điểm của giải, đặt khi tạo/sửa giải:
//   winPoint: điểm thắng (11 / 15 / 21 / tuỳ ý)
//   winBy2  : true  = phải cách 2 điểm (deuce kéo dài)
//             false = chạm đúng điểm thắng là thắng, không cần cách 2
export const DEFAULT_WIN_POINT = 11
export const WIN_POINT_PRESETS = [11, 15, 21]

// Đọc luật từ object giải, có mặc định cho giải tạo trước khi có tuỳ chọn này.
export function scoreRules(t) {
  const wp = Number(t?.winPoint)
  return {
    winPoint: Number.isInteger(wp) && wp >= 1 ? wp : DEFAULT_WIN_POINT,
    winBy2: t?.winBy2 !== false,
  }
}

export function scoreRuleLabel(rules) {
  const { winPoint, winBy2 } = scoreRules(rules)
  return winBy2 ? `${winPoint} điểm · cách 2` : `${winPoint} điểm · chạm là thắng`
}

export function validateScore(scoreA, scoreB, rules) {
  const { winPoint, winBy2 } = scoreRules(rules)
  const a = Number(scoreA)
  const b = Number(scoreB)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return { ok: false, msg: 'Tỉ số phải là số nguyên ≥ 0' }
  }
  if (a === b) return { ok: false, msg: 'Không thể hoà' }
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)

  // chạm điểm thắng là thắng: bên thắng đúng winPoint, bên thua thấp hơn
  if (!winBy2) {
    if (hi !== winPoint) {
      return { ok: false, msg: `Bên thắng phải đúng ${winPoint} điểm` }
    }
    return { ok: true }
  }

  // luật cách 2
  if (hi < winPoint) {
    return { ok: false, msg: `Bên thắng phải đạt tối thiểu ${winPoint} điểm` }
  }
  // đối thủ chưa tới (winPoint - 1) → không đánh tiếp, thắng đúng winPoint
  if (lo <= winPoint - 2 && hi !== winPoint) {
    return {
      ok: false,
      msg: `Thắng ở ${winPoint} khi đối thủ ≤ ${winPoint - 2} (không đánh tiếp)`,
    }
  }
  // deuce: từ (winPoint-1) đều trở đi phải hơn đúng 2
  if (lo >= winPoint - 1 && hi - lo !== 2) {
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
