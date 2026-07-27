import { useState } from 'react'
import { Button, Empty, App as AntApp, InputNumber, Tag } from 'antd'
import {
  ScheduleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  ApartmentOutlined,
} from '@ant-design/icons'
import { useActive, useAuth, updateTournament } from '../store'
import {
  scheduleRoundRobin,
  scheduleKnockout,
  scheduleGroupStage,
  distributeGroups,
  groupStageComplete,
  buildKnockoutFromGroups,
  knockoutSeeds,
  validateScore,
  scoreRuleLabel,
  advanceWinner,
  pairLabel,
} from '../logic'

const roundName = (round, maxRound) => {
  if (round === maxRound) return 'Chung kết'
  if (round === maxRound - 1) return 'Bán kết'
  if (round === maxRound - 2) return 'Tứ kết'
  return `Vòng ${round}`
}

export default function MatchesPage() {
  const { modal, message } = AntApp.useApp()
  const t = useActive()
  const [draft, setDraft] = useState({}) // matchId -> {a,b}
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
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={genSchedule} block>
              Tạo lịch thi đấu ({pairs.length} cặp)
            </Button>
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
    return (
      <div
        key={m.id}
        style={{
          padding: '12px 0',
          borderBottom: idx < count - 1 ? '1px solid rgba(145,245,255,0.12)' : 'none',
        }}
      >
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 700, flex: 1 }}>
            {label(m.a) || <i style={{ color: 'var(--shell-muted)' }}>chờ…</i>}
          </span>
          <span className="vs-chip">VS</span>
          <span style={{ fontWeight: 700, flex: 1, textAlign: 'right' }}>
            {label(m.b) || <i style={{ color: 'var(--shell-muted)' }}>chờ…</i>}
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
              <Button size="small" icon={<ReloadOutlined />} onClick={genSchedule}>
                Chia lại
              </Button>
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
              <Button
                type="primary"
                icon={<ApartmentOutlined />}
                onClick={buildBracket}
                block
              >
                {hasKnockout ? 'Bốc lại nhánh knockout' : 'Chốt vòng bảng → Tạo nhánh knockout'}
              </Button>
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
          {canEdit && (
            <Button size="small" icon={<ReloadOutlined />} onClick={genSchedule}>
              Tạo lại
            </Button>
          )}
        </div>
      </div>

      {groupsView.map((g) => (
        <div key={g.round} className="glass-card">
          {isKnockout && <div className="section-title">{roundName(g.round, maxRound)}</div>}
          {g.items.map((m, idx) => renderMatch(m, idx, g.items.length))}
        </div>
      ))}
    </>
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
