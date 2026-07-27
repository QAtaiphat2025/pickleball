import { Empty, Table, Tag } from 'antd'
import {
  OrderedListOutlined,
  ApartmentOutlined,
  TrophyOutlined,
  RightCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useActive } from '../store'
import {
  roundRobinStandings,
  knockoutResults,
  computeGroupStandings,
  groupStageComplete,
  knockoutProgress,
  knockoutSeeds,
  seedLabel,
  pairLabel,
} from '../logic'

const MEDALS = ['🥇', '🥈', '🥉']

export default function StandingsPage() {
  const t = useActive()

  if (!t) {
    return (
      <div className="glass-card">
        <Empty description={<span style={{ color: 'var(--shell-muted)' }}>Chưa chọn giải nào.</span>} />
      </div>
    )
  }

  const isKnockout = t.format === 'knockout'
  const isGroupKO = t.format === 'group-knockout'
  const hasMatches = t.matches.length > 0
  const formatLabel = isGroupKO
    ? 'Vòng bảng + loại trực tiếp'
    : isKnockout
      ? 'Nhánh loại trực tiếp'
      : 'Vòng tròn tính điểm'

  return (
    <>
      <div className="app-topbar" style={{ margin: '-14px -14px 14px' }}>
        <OrderedListOutlined style={{ fontSize: 22, color: 'var(--shell-accent)' }} />
        <div style={{ flex: 1 }}>
          <h1>Bảng xếp hạng</h1>
          <p className="sub">
            {t.name} · {formatLabel}
          </p>
        </div>
      </div>

      {!hasMatches ? (
        <div className="glass-card">
          <div className="empty-hint">Chưa có lịch thi đấu. Sang tab Trận để tạo lịch.</div>
        </div>
      ) : isGroupKO ? (
        <GroupKnockoutView t={t} />
      ) : isKnockout ? (
        <KnockoutView t={t} />
      ) : (
        <RoundRobinView t={t} />
      )}
    </>
  )
}

function Podium({ champion, runnerUp, third }) {
  return (
    <div className="glass-card">
      <div className="section-title">Kết quả chung cuộc</div>
      <div className="stack">
        <PodiumRow medal="🥇" title="Nhất" pair={champion} accent="#fde047" />
        <PodiumRow medal="🥈" title="Nhì" pair={runnerUp} accent="#cbd5e1" />
        {third && third.length > 0 ? (
          third.map((p, i) => (
            <PodiumRow
              key={p.pairId || i}
              medal="🥉"
              title="Đồng giải ba"
              pair={p}
              accent="#f0a868"
            />
          ))
        ) : (
          <PodiumRow medal="🥉" title="Đồng giải ba" pair={null} accent="#f0a868" />
        )}
      </div>
    </div>
  )
}

function PodiumRow({ medal, title, pair, accent }) {
  return (
    <div
      className="row-between"
      style={{
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${accent}44`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="rank-medal">{medal}</span>
        <div>
          <div style={{ fontSize: 12, color: 'var(--shell-muted)', fontWeight: 600 }}>{title}</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {pair?.label || <span style={{ color: 'var(--shell-muted)' }}>chưa xác định</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

const standingColumns = [
  {
    title: '#',
    dataIndex: 'rank',
    width: 44,
    render: (v) => (v <= 3 ? <span className="rank-medal">{MEDALS[v - 1]}</span> : v),
  },
  { title: 'Cặp', dataIndex: 'label', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
  { title: 'Trận', dataIndex: 'played', width: 52, align: 'center' },
  {
    title: 'T-B',
    width: 64,
    align: 'center',
    render: (_, r) => (
      <span>
        <b style={{ color: '#4ade80' }}>{r.wins}</b>
        <span style={{ color: 'var(--shell-muted)' }}> - </span>
        <b style={{ color: '#fb7185' }}>{r.losses}</b>
      </span>
    ),
  },
  {
    title: 'HS',
    dataIndex: 'diff',
    width: 56,
    align: 'center',
    render: (v) => (
      <span style={{ color: v > 0 ? '#4ade80' : v < 0 ? '#fb7185' : 'var(--shell-muted)' }}>
        {v > 0 ? `+${v}` : v}
      </span>
    ),
  },
]

function StandingTable({ rows, qualifyCount = 0 }) {
  // tô đậm 2 hàng đầu (đi tiếp) nếu qualifyCount > 0
  return (
    <Table
      rowKey="pairId"
      dataSource={rows}
      columns={standingColumns}
      pagination={false}
      size="small"
      rowClassName={(_, i) => (qualifyCount && i < qualifyCount ? 'qualify-row' : '')}
    />
  )
}

// Danh sách cặp đi tiếp từ vòng bảng, kèm nhãn Nhất A / Nhì B / Ba C
function QualifierList({ t, seeds, labelOf }) {
  if (!seeds || seeds.length === 0) return null
  const thirds = seeds.filter((s) => s.tier === 3).length
  return (
    <div className="glass-card">
      <div className="section-title">
        <TrophyOutlined style={{ marginRight: 6, color: 'var(--shell-accent)' }} />
        {seeds.length} cặp qua vòng bảng
      </div>
      <div className="qual-list">
        {seeds.map((s, i) => (
          <div key={s.pairId} className={`qual-row tier-${s.tier}`}>
            <span className="qual-seed">#{i + 1}</span>
            <span className="qual-body">
              <span className="qual-name">{labelOf(s.pairId)}</span>
              <span className="qual-meta">
                {s.wins != null ? `${s.wins} thắng` : ''}
                {s.diff != null ? ` · hiệu số ${s.diff > 0 ? '+' : ''}${s.diff}` : ''}
              </span>
            </span>
            <span className={`qual-tag tier-${s.tier}`}>{seedLabel(s)}</span>
          </div>
        ))}
      </div>
      {thirds > 0 && (
        <div className="qual-note">
          {thirds} cặp hạng ba có thành tích tốt nhất được vớt lên cho đủ nhánh.
        </div>
      )}
    </div>
  )
}

// Tiến trình nhánh: mỗi vòng ai đi tiếp, ai bị loại
function KnockoutProgressView({ koMatches, labelOf }) {
  const rounds = knockoutProgress(koMatches)
  if (rounds.length === 0) return null
  return (
    <div className="glass-card">
      <div className="section-title">
        <ApartmentOutlined style={{ marginRight: 6, color: 'var(--shell-accent)' }} />
        Tiến trình vòng loại trực tiếp
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {rounds.map((r) => (
          <div key={r.round} className="ko-round">
            <div className="ko-round-head">
              <span className="ko-round-name">{r.name}</span>
              <span className="ko-round-count">{r.entrants.length} cặp</span>
              {r.pending > 0 && (
                <Tag color="warning" style={{ marginLeft: 'auto' }}>
                  còn {r.pending} trận
                </Tag>
              )}
              {r.pending === 0 && (
                <Tag color="success" style={{ marginLeft: 'auto' }}>
                  đã xong
                </Tag>
              )}
            </div>

            {r.advanced.length > 0 && (
              <div className="ko-group">
                <div className="ko-group-title ok">
                  <RightCircleOutlined />
                  {r.isFinal ? 'Vô địch' : `Vào ${r.nextName?.toLowerCase()}`}
                </div>
                {r.advanced.map((pid) => (
                  <div key={pid} className="ko-item ok">
                    {labelOf(pid)}
                    {r.byes.includes(pid) && <span className="ko-item-note">miễn vòng này</span>}
                  </div>
                ))}
              </div>
            )}

            {r.eliminated.length > 0 && (
              <div className="ko-group">
                <div className="ko-group-title out">
                  <CloseCircleOutlined />
                  Bị loại
                </div>
                {r.eliminated.map((e) => (
                  <div key={e.pairId} className="ko-item out">
                    {labelOf(e.pairId)}
                    <span className="ko-item-note">
                      thua {labelOf(e.byPairId)}
                      {e.score ? ` ${e.score}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {r.advanced.length === 0 && r.eliminated.length === 0 && (
              <div className="ko-item wait">Chờ kết quả vòng trước</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function GroupKnockoutView({ t }) {
  const groups = t.groups || []
  const groupDone = groupStageComplete(t.matches)
  const koMatches = t.matches.filter((m) => m.stage === 'knockout')
  const hasKnockout = koMatches.length > 0

  const pairMap = Object.fromEntries(t.pairs.map((p) => [p.id, p]))
  const labelOf = (pid) => (pid && pairMap[pid] ? pairLabel(pairMap[pid], t.athletes) : '—')

  // suất đi tiếp: dùng bản đã chốt lúc bốc nhánh, giải cũ thì tính lại
  const seeds =
    t.koSeeds && t.koSeeds.length
      ? t.koSeeds
      : hasKnockout && groupDone
        ? knockoutSeeds(groups, t.pairs, t.matches, t.athletes, {
            fillWithThirds: t.advanceThirds !== false,
          }).filter((s) => koMatches.some((m) => m.a === s.pairId || m.b === s.pairId))
        : []

  // số cặp đi tiếp mỗi bảng để tô sáng đúng (2, hoặc 3 nếu bảng đó có suất vớt)
  const qualifyIn = (g) => {
    if (seeds.length === 0) return 2
    const n = seeds.filter((s) => g.pairIds.includes(s.pairId)).length
    return n || 2
  }

  // podium từ cây knockout (nếu đã bốc nhánh)
  const koResult = hasKnockout
    ? knockoutResults(t.pairs, koMatches, t.athletes)
    : null

  return (
    <>
      {koResult && <Podium champion={koResult.champion} runnerUp={koResult.runnerUp} third={koResult.third} />}
      {koResult && !koResult.finalDone && (
        <div className="glass-card">
          <div className="empty-hint">Nhánh knockout chưa xong — nhập đủ tỉ số để chốt thứ hạng.</div>
        </div>
      )}

      {hasKnockout && <KnockoutProgressView koMatches={koMatches} labelOf={labelOf} />}
      <QualifierList t={t} seeds={seeds} labelOf={labelOf} />

      {groups.map((g) => {
        const rows = computeGroupStandings(g, t.pairs, t.matches, t.athletes)
        return (
          <div key={g.id} className="glass-card" style={{ padding: 10 }}>
            <div className="section-title" style={{ padding: '4px 6px 8px' }}>
              <ApartmentOutlined style={{ marginRight: 6, color: 'var(--shell-accent)' }} />
              {g.name}
              <Tag style={{ marginLeft: 8 }} color={groupDone ? 'success' : 'warning'}>
                {groupDone ? 'đã xong' : 'đang diễn ra'}
              </Tag>
            </div>
            <StandingTable rows={rows} qualifyCount={qualifyIn(g)} />
          </div>
        )
      })}

      {!hasKnockout && (
        <div className="glass-card">
          <div className="empty-hint">
            2 cặp đầu mỗi bảng (tô sáng) sẽ vào nhánh loại trực tiếp
            {t.advanceThirds !== false
              ? ', cộng thêm các cặp hạng ba tốt nhất nếu cần cho đủ nhánh.'
              : '.'}
            {groupDone
              ? ' Sang tab Trận, bấm "Chốt vòng bảng" để bốc nhánh.'
              : ' Nhập đủ tỉ số vòng bảng trước.'}
          </div>
        </div>
      )}
    </>
  )
}

function KnockoutView({ t }) {
  const r = knockoutResults(t.pairs, t.matches, t.athletes)
  if (!r) return null
  const pairMap = Object.fromEntries(t.pairs.map((p) => [p.id, p]))
  const labelOf = (pid) => (pid && pairMap[pid] ? pairLabel(pairMap[pid], t.athletes) : '—')
  return (
    <>
      <Podium champion={r.champion} runnerUp={r.runnerUp} third={r.third} />
      <KnockoutProgressView koMatches={t.matches} labelOf={labelOf} />
      {!r.finalDone && (
        <div className="glass-card">
          <div className="empty-hint">
            Giải chưa kết thúc — nhập đủ tỉ số các trận để chốt thứ hạng.
          </div>
        </div>
      )}
    </>
  )
}

function RoundRobinView({ t }) {
  const rows = roundRobinStandings(t.pairs, t.matches, t.athletes)
  const allDone =
    t.matches.length > 0 && t.matches.every((m) => m.scoreA != null && m.scoreB != null)

  const champion = rows[0] ? { label: rows[0].label } : null
  const runnerUp = rows[1] ? { label: rows[1].label } : null
  // đồng giải ba: các cặp cùng hạng 3 (nếu tie theo wins+diff+pf)
  const third = []
  if (rows[2]) {
    const r3 = rows[2]
    rows.slice(2).forEach((s) => {
      if (s.wins === r3.wins && s.diff === r3.diff && s.pf === r3.pf) {
        third.push({ label: s.label })
      }
    })
  }

  return (
    <>
      {allDone && <Podium champion={champion} runnerUp={runnerUp} third={third} />}
      <div className="glass-card" style={{ padding: 10 }}>
        <div className="section-title" style={{ padding: '4px 6px 8px' }}>
          Xếp hạng · thắng → hiệu số
          {!allDone && (
            <Tag style={{ marginLeft: 8 }} color="warning">
              đang diễn ra
            </Tag>
          )}
        </div>
        <StandingTable rows={rows} />
      </div>
    </>
  )
}
