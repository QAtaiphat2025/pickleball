import { useEffect, useState } from 'react'
import { Button, Empty, App as AntApp, InputNumber, Modal, Select, Tag } from 'antd'
import {
  ScheduleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  ApartmentOutlined,
  TrophyOutlined,
  DragOutlined,
} from '@ant-design/icons'
import { useActive, useAuth, updateTournament } from '../store'
import BracketArrange from '../components/BracketArrange'
import { buildManualGroups, validateManualGroupAssignments } from '../manualGroups'
import {
  scheduleRoundRobin,
  scheduleKnockout,
  scheduleKnockoutFromSlots,
  bracketSlotCount,
  scheduleGroupStage,
  distributeGroups,
  groupStageComplete,
  buildKnockoutFromGroups,
  knockoutSeeds,
  seedLabel,
  koRoundName,
  validateScore,
  scoreRuleLabel,
  advanceWinner,
  pairLabel,
} from '../logic'

const roundName = koRoundName

export default function MatchesPage() {
  const { modal, message } = AntApp.useApp()
  const t = useActive()
  const [draft, setDraft] = useState({}) // matchId -> {a,b}
  const [arrangeOpen, setArrangeOpen] = useState(false)
  const [manualGroupsOpen, setManualGroupsOpen] = useState(false)
  const canEdit = useAuth().unlocked

  if (!t) {
    return (
      <div className="glass-card">
        <Empty description={<span style={{ color: 'var(--shell-muted)' }}>Chưa chọn giải nào.</span>} />
      </div>
    )
  }

  const pairs = t.pairs
  const matches = t.matches
  const isKnockout = t.format === 'knockout'
  const isGroupKO = t.format === 'group-knockout'
  const groups = t.groups || []
  const pairMap = Object.fromEntries(pairs.map((p) => [p.id, p]))
  const label = (pid) => (pid && pairMap[pid] ? pairLabel(pairMap[pid], t.athletes) : null)

  const koMatches = matches.filter((m) => m.stage === 'knockout')
  const groupMatches = matches.filter((m) => m.stage === 'group')
  const hasKnockout = koMatches.length > 0

  // suất đi tiếp đã chốt khi bốc nhánh: pairId -> 'Nhất A' / 'Nhì B' / 'Ba C'.
  // Giải bốc nhánh từ trước khi có koSeeds thì tính lại từ BXH bảng.
  const koSeeds =
    t.koSeeds && t.koSeeds.length
      ? t.koSeeds
      : isGroupKO && koMatches.length > 0 && groupStageComplete(matches)
        ? knockoutSeeds(groups, pairs, matches, t.athletes, {
            fillWithThirds: t.advanceThirds !== false,
          }).filter((s) => koMatches.some((m) => m.a === s.pairId || m.b === s.pairId))
        : []
  const seedTagOf = Object.fromEntries(koSeeds.map((s) => [s.pairId, seedLabel(s)]))
  const firstKoRound = hasKnockout ? Math.min(...koMatches.map((m) => m.round || 1)) : 0

  // ----- tự sắp nhánh -----
  // Các cặp có suất trong nhánh: lấy từ nhánh đang có, chưa bốc thì tính từ BXH bảng.
  const koTree = isGroupKO ? koMatches : isKnockout ? matches : []
  const treeFirstRound = koTree.filter((m) => (m.round || 1) === (firstKoRound || 1))
  const currentSlots =
    treeFirstRound.length > 0
      ? [...treeFirstRound]
          .sort((a, b) => (a.slot || 0) - (b.slot || 0))
          .flatMap((m) => [m.a || null, m.b || null])
      : null
  const arrangePairIds =
    currentSlots && currentSlots.filter(Boolean).length > 0
      ? currentSlots.filter(Boolean)
      : isKnockout
        ? pairs.map((p) => p.id)
        : isGroupKO && groupStageComplete(matches)
          ? knockoutSeeds(groups, pairs, matches, t.athletes, {
              fillWithThirds: t.advanceThirds !== false,
            }).map((s) => s.pairId)
          : []
  const canArrange = canEdit && bracketSlotCount(arrangePairIds.length) >= 2
  const koHasScores = koTree.some((m) => m.scoreA != null && m.scoreB != null)

  const applyArrangement = (slotIds) => {
    const ko = scheduleKnockoutFromSlots(slotIds)
    if (ko.length === 0) {
      message.warning('Không đủ cặp để tạo nhánh')
      return
    }
    updateTournament(t.id, (cur) => {
      if (isGroupKO) {
        return {
          ...cur,
          matches: [
            ...cur.matches.filter((m) => m.stage === 'group'),
            ...ko.map((m) => ({ ...m, stage: 'knockout' })),
          ],
          stage: 'knockout',
        }
      }
      return { ...cur, matches: ko, scheduled: true }
    })
    message.success(`Đã áp dụng nhánh tự sắp · ${ko.filter((m) => m.round === 1).length} trận vòng đầu`)
  }

  const genSchedule = () => {
    if (pairs.length < 2) {
      message.warning('Cần ít nhất 2 cặp')
      return
    }
    const run = () => {
      if (isGroupKO) {
        const n = t.numGroups || 2
        if (pairs.length < n * 2) {
          message.warning(`Cần ít nhất ${n * 2} cặp cho ${n} bảng (mỗi bảng ≥ 2 cặp)`)
          return
        }
        const gs = distributeGroups(pairs, n)
        const ms = scheduleGroupStage(gs)
        updateTournament(t.id, (cur) => ({
          ...cur,
          groups: gs,
          matches: ms,
          scheduled: true,
          stage: 'group',
        }))
        message.success(`Đã chia ${gs.length} bảng · ${ms.length} trận vòng bảng`)
        return
      }
      const ms = isKnockout ? scheduleKnockout(pairs) : scheduleRoundRobin(pairs)
      updateTournament(t.id, (cur) => ({ ...cur, matches: ms, scheduled: true }))
      message.success(`Đã tạo lịch ${ms.length} trận`)
    }
    if (matches.length) {
      modal.confirm({
        title: 'Tạo lại lịch?',
        content: 'Toàn bộ tỉ số đã nhập sẽ bị xoá.',
        okText: 'Tạo lại',
        cancelText: 'Huỷ',
        onOk: run,
      })
    } else {
      run()
    }
  }

  const applyManualGroups = (assignments) => {
    const n = t.numGroups || 2
    const validation = validateManualGroupAssignments(pairs, n, assignments)
    if (!validation.ok) {
      message.warning(validation.msg)
      return
    }

    const run = () => {
      const gs = buildManualGroups(pairs, n, assignments)
      const ms = scheduleGroupStage(gs)
      updateTournament(t.id, (cur) => ({
        ...cur,
        groups: gs,
        matches: ms,
        scheduled: true,
        stage: 'group',
        koSeeds: [],
      }))
      message.success(`Đã tự chia ${gs.length} bảng · ${ms.length} trận vòng bảng`)
      setManualGroupsOpen(false)
    }

    if (matches.length) {
      modal.confirm({
        title: 'Chia lại bảng?',
        content: 'Toàn bộ lịch, tỉ số vòng bảng và nhánh knockout hiện tại sẽ bị xoá.',
        okText: 'Chia lại',
        cancelText: 'Huỷ',
        onOk: run,
      })
    } else {
      run()
    }
  }

  const buildBracket = () => {
    if (!groupStageComplete(matches)) {
      message.warning('Cần nhập đủ tỉ số toàn bộ trận vòng bảng')
      return
    }
    const run = () => {
      const fillWithThirds = t.advanceThirds !== false
      const seeds = knockoutSeeds(groups, pairs, matches, t.athletes, { fillWithThirds })
      const ko = buildKnockoutFromGroups(groups, pairs, matches, t.athletes, { fillWithThirds })
      if (ko.length === 0) {
        message.warning('Không đủ cặp đi tiếp để tạo nhánh')
        return
      }
      updateTournament(t.id, (cur) => ({
        ...cur,
        matches: [...cur.matches.filter((m) => m.stage === 'group'), ...ko],
        stage: 'knockout',
        // lưu lại suất đi tiếp để hiện "Nhất A / Nhì B / Ba C" về sau
        koSeeds: seeds.map((s) => ({
          pairId: s.pairId,
          tier: s.tier,
          groupIndex: s.groupIndex,
          rank: s.rank,
          wins: s.wins,
          diff: s.diff,
          pf: s.pf,
        })),
      }))
      const thirds = seeds.filter((s) => s.tier === 3).length
      message.success(
        thirds > 0
          ? `Đã tạo nhánh ${seeds.length} cặp: nhất + nhì mỗi bảng và ${thirds} cặp hạng ba tốt nhất`
          : `Đã tạo nhánh ${seeds.length} cặp từ nhất/nhì mỗi bảng`,
      )
    }
    if (hasKnockout) {
      modal.confirm({
        title: 'Tạo lại nhánh knockout?',
        content: 'Toàn bộ tỉ số vòng knockout sẽ bị xoá và bốc lại theo BXH bảng hiện tại.',
        okText: 'Tạo lại',
        cancelText: 'Huỷ',
        onOk: run,
      })
    } else {
      run()
    }
  }

  const saveScore = (m) => {
    const d = draft[m.id] || {}
    const sa = d.a ?? m.scoreA
    const sb = d.b ?? m.scoreB
    const v = validateScore(sa, sb, t)
    if (!v.ok) {
      message.error(v.msg)
      return
    }
    updateTournament(t.id, (cur) => {
      const next = cur.matches.map((x) =>
        x.id === m.id
          ? { ...x, scoreA: Number(sa), scoreB: Number(sb), winner: Number(sa) > Number(sb) ? x.a : x.b }
          : x,
      )
      // knockout: đẩy winner lên trận cha (chỉ trong cây knockout)
      if (m.stage === 'knockout' || cur.format === 'knockout') {
        advanceWinner(next, m.id)
      }
      return { ...cur, matches: next }
    })
    message.success('Đã lưu tỉ số')
    setDraft((prev) => {
      const n = { ...prev }
      delete n[m.id]
      return n
    })
  }

  const setDraftVal = (id, side, val) =>
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [side]: val } }))

  // ----- chưa có lịch -----
  if (matches.length === 0) {
    const formatDesc = isGroupKO
      ? `Vòng bảng + loại trực tiếp (${t.numGroups || 2} bảng)`
      : isKnockout
        ? 'Nhánh loại trực tiếp'
        : 'Vòng tròn tính điểm'
    return (
      <>
        <Header t={t} />
        <div className="glass-card">
          <div className="empty-hint">
            Chưa có lịch thi đấu.<br />
            Thể thức: <b>{formatDesc}</b>
          </div>
          {canEdit && (
            isGroupKO ? (
              <div className="stack">
                <Button type="primary" icon={<ThunderboltOutlined />} onClick={genSchedule} block>
                  Chia tự động ({pairs.length} cặp)
                </Button>
                <Button icon={<ApartmentOutlined />} onClick={() => setManualGroupsOpen(true)} block>
                  Tự chia bảng
                </Button>
                <ManualGroupsModal
                  open={manualGroupsOpen}
                  onClose={() => setManualGroupsOpen(false)}
                  pairs={pairs}
                  groups={groups}
                  numGroups={t.numGroups || 2}
                  labelOf={(pid) => label(pid) || '—'}
                  onSave={applyManualGroups}
                />
              </div>
            ) : (
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={genSchedule} block>
                Tạo lịch thi đấu ({pairs.length} cặp)
              </Button>
            )
          )}
        </div>
      </>
    )
  }

  // ----- render trận (dùng chung) -----
  const renderMatch = (m, idx, count) => {
    const done = m.scoreA != null && m.scoreB != null
    const d = draft[m.id] || {}
    const bothPresent = m.a && m.b
    // chỉ vòng knockout đầu tiên mới ghi "Nhất A / Nhì B" — vòng sau là người thắng
    const showSeed = m.stage === 'knockout' && m.round === firstKoRound
    const seedA = showSeed ? seedTagOf[m.a] : null
    const seedB = showSeed ? seedTagOf[m.b] : null
    return (
      <div
        key={m.id}
        style={{
          padding: '12px 0',
          borderBottom: idx < count - 1 ? '1px solid rgba(145,245,255,0.12)' : 'none',
        }}
      >
        <div className="row-between" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
          <span style={{ flex: 1 }}>
            {seedA && <span className="seed-tag">{seedA}</span>}
            <span style={{ fontWeight: 700, display: 'block' }}>
              {label(m.a) || <i style={{ color: 'var(--shell-muted)' }}>chờ…</i>}
            </span>
          </span>
          <span className="vs-chip">VS</span>
          <span style={{ flex: 1, textAlign: 'right' }}>
            {seedB && <span className="seed-tag">{seedB}</span>}
            <span style={{ fontWeight: 700, display: 'block' }}>
              {label(m.b) || <i style={{ color: 'var(--shell-muted)' }}>chờ…</i>}
            </span>
          </span>
        </div>

        {bothPresent ? (
          canEdit ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InputNumber
                min={0}
                max={99}
                placeholder="0"
                value={d.a ?? m.scoreA}
                onChange={(v) => setDraftVal(m.id, 'a', v)}
                style={{ flex: 1 }}
              />
              <span style={{ color: 'var(--shell-muted)' }}>–</span>
              <InputNumber
                min={0}
                max={99}
                placeholder="0"
                value={d.b ?? m.scoreB}
                onChange={(v) => setDraftVal(m.id, 'b', v)}
                style={{ flex: 1 }}
              />
              <Button type="primary" onClick={() => saveScore(m)}>
                Lưu
              </Button>
            </div>
          ) : (
            <div className="score-big" style={{ textAlign: 'center' }}>
              {done ? `${m.scoreA} – ${m.scoreB}` : <span style={{ fontSize: 12, color: 'var(--shell-muted)', fontWeight: 400 }}>Chưa có tỉ số</span>}
            </div>
          )
        ) : (
          <div style={{ fontSize: 12, color: 'var(--shell-muted)' }}>Chờ kết quả vòng trước</div>
        )}

        {done && (
          <div style={{ marginTop: 6 }}>
            <Tag icon={<CheckCircleFilled />} color="success">
              {m.winner === m.a ? label(m.a) : label(m.b)} thắng {Math.max(m.scoreA, m.scoreB)}–
              {Math.min(m.scoreA, m.scoreB)}
            </Tag>
          </div>
        )}
      </div>
    )
  }

  // ----- thể thức vòng bảng + knockout -----
  if (isGroupKO) {
    const groupDone = groupStageComplete(matches)
    const maxRound = koMatches.length ? Math.max(...koMatches.map((m) => m.round || 0)) : 0
    const koRounds = [...new Set(koMatches.map((m) => m.round))]
      .sort((a, b) => a - b)
      .map((r) => ({ round: r, items: koMatches.filter((m) => m.round === r) }))

    return (
      <>
        <Header t={t} />
        <div className="glass-card">
          <div className="row-between">
            <div className="section-title" style={{ margin: 0 }}>
              Vòng bảng · {groups.length} bảng · {groupMatches.length} trận
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button size="small" icon={<ReloadOutlined />} onClick={genSchedule}>
                  Chia tự động
                </Button>
                <Button size="small" icon={<ApartmentOutlined />} onClick={() => setManualGroupsOpen(true)}>
                  Tự chia
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* các bảng */}
        {groups.map((g) => {
          const items = groupMatches.filter((m) => m.groupId === g.id)
          return (
            <div key={g.id} className="glass-card">
              <div className="section-title">
                <ApartmentOutlined style={{ marginRight: 6, color: 'var(--shell-accent)' }} />
                {g.name} · {g.pairIds.length} cặp
              </div>
              {items.length === 0 ? (
                <div className="empty-hint">Bảng chỉ có 1 cặp — không có trận.</div>
              ) : (
                items.map((m, idx) => renderMatch(m, idx, items.length))
              )}
            </div>
          )
        })}

        {/* chốt vòng bảng → tạo nhánh */}
        {(canEdit || !groupDone) && (
          <div className="glass-card">
            {!groupDone ? (
              <div className="empty-hint">Nhập đủ tỉ số các bảng để mở nhánh loại trực tiếp.</div>
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<ApartmentOutlined />}
                  onClick={buildBracket}
                  block
                >
                  {hasKnockout ? 'Bốc lại nhánh knockout' : 'Chốt vòng bảng → Tạo nhánh knockout'}
                </Button>
                {canArrange && (
                  <>
                    <Button
                      icon={<DragOutlined />}
                      onClick={() => setArrangeOpen(true)}
                      block
                      style={{ marginTop: 8 }}
                    >
                      Tự sắp cặp đấu knockout
                    </Button>
                    <div className="empty-hint" style={{ marginTop: 8, marginBottom: 0 }}>
                      Bốc lại theo BXH bảng, hoặc tự sắp để đổi chỗ cặp đấu theo ý mình.
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* danh sách cặp đi tiếp */}
        {hasKnockout && koSeeds.length > 0 && (
          <div className="glass-card">
            <div className="section-title">
              <TrophyOutlined style={{ marginRight: 6, color: 'var(--shell-accent)' }} />
              {koSeeds.length} cặp vào vòng loại trực tiếp
            </div>
            <div className="qual-list">
              {koSeeds.map((s, i) => (
                <div key={s.pairId} className={`qual-row tier-${s.tier}`}>
                  <span className="qual-seed">#{i + 1}</span>
                  <span className="qual-body">
                    <span className="qual-name">{label(s.pairId) || '—'}</span>
                    <span className="qual-meta">
                      {s.wins != null ? `${s.wins} thắng` : ''}
                      {s.diff != null ? ` · hiệu số ${s.diff > 0 ? '+' : ''}${s.diff}` : ''}
                    </span>
                  </span>
                  <span className={`qual-tag tier-${s.tier}`}>{seedLabel(s)}</span>
                </div>
              ))}
            </div>
            {koSeeds.some((s) => s.tier === 3) && (
              <div className="qual-note">
                {koSeeds.filter((s) => s.tier === 3).length} cặp hạng ba có thành tích tốt nhất được
                vớt lên cho đủ nhánh {koSeeds.length <= 4 ? 4 : koSeeds.length <= 8 ? 8 : 16}.
              </div>
            )}
          </div>
        )}

        {/* cây knockout */}
        {koRounds.map((g) => (
          <div key={g.round} className="glass-card">
            <div className="section-title">{roundName(g.round, maxRound)}</div>
            {g.items.map((m, idx) => renderMatch(m, idx, g.items.length))}
          </div>
        ))}

        <BracketArrange
          open={arrangeOpen}
          onClose={() => setArrangeOpen(false)}
          pairIds={arrangePairIds}
          initialSlots={currentSlots}
          labelOf={(pid) => label(pid) || '—'}
          seedTagOf={seedTagOf}
          onSave={applyArrangement}
          hasScores={koHasScores}
        />
        <ManualGroupsModal
          open={manualGroupsOpen}
          onClose={() => setManualGroupsOpen(false)}
          pairs={pairs}
          groups={groups}
          numGroups={t.numGroups || 2}
          labelOf={(pid) => label(pid) || '—'}
          onSave={applyManualGroups}
        />
      </>
    )
  }

  // ----- vòng tròn / knockout thuần -----
  const maxRound = isKnockout ? Math.max(...matches.map((m) => m.round || 0)) : 0
  const groupsView = isKnockout
    ? [...new Set(matches.map((m) => m.round))]
        .sort((a, b) => a - b)
        .map((r) => ({ round: r, items: matches.filter((m) => m.round === r) }))
    : [{ round: 0, items: matches }]

  return (
    <>
      <Header t={t} />
      <div className="glass-card">
        <div className="row-between">
          <div className="section-title" style={{ margin: 0 }}>
            {isKnockout ? 'Nhánh loại trực tiếp' : 'Vòng tròn'} · {matches.length} trận
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {isKnockout && canArrange && (
              <Button size="small" icon={<DragOutlined />} onClick={() => setArrangeOpen(true)}>
                Tự sắp
              </Button>
            )}
            {canEdit && (
              <Button size="small" icon={<ReloadOutlined />} onClick={genSchedule}>
                Tạo lại
              </Button>
            )}
          </div>
        </div>
      </div>

      {groupsView.map((g) => (
        <div key={g.round} className="glass-card">
          {isKnockout && <div className="section-title">{roundName(g.round, maxRound)}</div>}
          {g.items.map((m, idx) => renderMatch(m, idx, g.items.length))}
        </div>
      ))}

      {isKnockout && (
        <BracketArrange
          open={arrangeOpen}
          onClose={() => setArrangeOpen(false)}
          pairIds={arrangePairIds}
          initialSlots={currentSlots}
          labelOf={(pid) => label(pid) || '—'}
          onSave={applyArrangement}
          hasScores={koHasScores}
        />
      )}
    </>
  )
}

const MANUAL_GROUP_NAMES = 'ABCDEFGH'.split('')

function manualGroupName(index) {
  return MANUAL_GROUP_NAMES[index] || `${index + 1}`
}

function defaultAssignments(pairs, groups, numGroups) {
  const fromCurrentGroups = {}
  groups.forEach((g, gi) => {
    ;(g.pairIds || []).forEach((pid) => {
      fromCurrentGroups[pid] = gi
    })
  })
  if (Object.keys(fromCurrentGroups).length > 0) return fromCurrentGroups

  const n = Math.max(1, Math.floor(Number(numGroups) || 1))
  const assignments = {}
  let dir = 1
  let col = 0
  pairs.forEach((p) => {
    assignments[p.id] = col
    if (dir === 1) {
      if (col === n - 1) dir = -1
      else col++
    } else {
      if (col === 0) dir = 1
      else col--
    }
  })
  return assignments
}

function ManualGroupsModal({ open, onClose, pairs, groups, numGroups, labelOf, onSave }) {
  const [assignments, setAssignments] = useState({})
  const n = Math.max(1, Math.floor(Number(numGroups) || 1))
  const groupOptions = Array.from({ length: n }, (_, i) => ({
    label: `Bảng ${manualGroupName(i)}`,
    value: i,
  }))

  useEffect(() => {
    if (open) setAssignments(defaultAssignments(pairs, groups, n))
  }, [open, pairs, groups, n])

  const counts = Array.from({ length: n }, () => 0)
  pairs.forEach((p) => {
    const gi = assignments[p.id]
    if (Number.isInteger(gi) && gi >= 0 && gi < n) counts[gi]++
  })

  const setGroup = (pairId, groupIndex) => {
    setAssignments((prev) => ({ ...prev, [pairId]: groupIndex }))
  }

  const resetAuto = () => {
    setAssignments(defaultAssignments(pairs, [], n))
  }

  return (
    <Modal
      title="Tự chia bảng"
      open={open}
      onOk={() => onSave(assignments)}
      onCancel={onClose}
      okText="Tạo lịch từ bảng đã chia"
      cancelText="Huỷ"
      width={720}
    >
      <div className="stack" style={{ marginTop: 12 }}>
        <div className="arr-hint">
          Chọn bảng cho từng cặp. Mỗi bảng cần ít nhất 2 cặp để có trận vòng bảng.
        </div>

        <div className="manual-group-summary">
          {counts.map((count, i) => (
            <div key={i} className={`manual-group-count${count < 2 ? ' is-warn' : ''}`}>
              <span>Bảng {manualGroupName(i)}</span>
              <b>{count} cặp</b>
            </div>
          ))}
        </div>

        <Button onClick={resetAuto} icon={<ReloadOutlined />} block>
          Gợi ý chia đều tự động
        </Button>

        <div className="manual-group-list">
          {pairs.map((p, i) => (
            <div key={p.id} className="manual-group-row">
              <span className="manual-group-index">#{i + 1}</span>
              <span className="manual-group-name">{labelOf(p.id)}</span>
              <Select
                value={assignments[p.id]}
                onChange={(v) => setGroup(p.id, v)}
                options={groupOptions}
                style={{ width: 120 }}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function Header({ t }) {
  const done = t.matches.filter((m) => m.scoreA != null && m.scoreB != null).length
  return (
    <div className="app-topbar" style={{ margin: '-14px -14px 14px' }}>
      <ScheduleOutlined style={{ fontSize: 22, color: 'var(--shell-accent)' }} />
      <div style={{ flex: 1 }}>
        <h1>Trận đấu</h1>
        <p className="sub">
          {t.name} · {done}/{t.matches.length} trận đã có tỉ số · {scoreRuleLabel(t)}
        </p>
      </div>
    </div>
  )
}
