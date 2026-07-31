import { useMemo, useState } from 'react'
import {
  Button,
  Input,
  Segmented,
  Modal,
  Empty,
  App as AntApp,
  InputNumber,
  Switch,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  TrophyOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { useStore, useAuth, createTournament, updateTournament, setActive, deleteTournament } from '../store'
import {
  WIN_POINT_PRESETS,
  scoreRules,
  scoreRuleLabel,
  planTournament,
  suggestGroupPlans,
} from '../logic'

const FORMAT_LABEL = {
  'round-robin': 'Vòng tròn tính điểm',
  knockout: 'Nhánh loại trực tiếp',
  'group-knockout': 'Vòng bảng + Loại trực tiếp',
}

const FORMAT_OPTIONS = [
  { label: 'Vòng tròn', value: 'round-robin' },
  { label: 'Nhánh loại', value: 'knockout' },
  { label: 'Bảng + Loại', value: 'group-knockout' },
]

const formatDesc = (format, numGroups) =>
  format === 'round-robin'
    ? 'Mọi cặp gặp nhau 1 lần, xếp hạng theo thắng → hiệu số.'
    : format === 'knockout'
      ? 'Đấu loại trực tiếp, có tranh nhất/nhì và đồng giải ba.'
      : `Đấu vòng tròn trong ${numGroups} bảng, nhất + nhì mỗi bảng vào nhánh loại trực tiếp.`

export default function TournamentsPage() {
  const { modal, message } = AntApp.useApp()
  const tournaments = useStore((s) => s.tournaments)
  const activeId = useStore((s) => s.activeId)
  const canEdit = useAuth().unlocked
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null) // null = tạo mới, id = sửa
  const [name, setName] = useState('')
  const [format, setFormat] = useState('round-robin')
  const [numGroups, setNumGroups] = useState(2)
  const [numAthletes, setNumAthletes] = useState(16)
  const [advanceThirds, setAdvanceThirds] = useState(true)
  const [winPoint, setWinPoint] = useState(11)
  const [winCustom, setWinCustom] = useState(false) // đang ở chế độ nhập tay điểm thắng
  const [scoreMode, setScoreMode] = useState('by2')
  const winBy2 = scoreMode !== 'touch'
  const capPoint = winPoint + 4

  const sorted = Object.values(tournaments).sort((a, b) => b.createdAt - a.createdAt)

  // tóm tắt phương án theo lựa chọn hiện tại (tính trước, chưa cần VĐV thật)
  const plan = useMemo(
    () => planTournament({ numAthletes, format, numGroups, advanceThirds }),
    [numAthletes, format, numGroups, advanceThirds],
  )
  const groupPlans = useMemo(
    () => (format === 'group-knockout' ? suggestGroupPlans(numAthletes, advanceThirds) : []),
    [format, numAthletes, advanceThirds],
  )

  const openCreate = () => {
    setEditId(null)
    setName('')
    setFormat('round-robin')
    setNumGroups(2)
    setNumAthletes(16)
    setAdvanceThirds(true)
    setWinPoint(11)
    setWinCustom(false)
    setScoreMode('by2')
    setOpen(true)
  }

  const openEdit = (t) => {
    setEditId(t.id)
    setName(t.name)
    setFormat(t.format)
    setNumGroups(t.numGroups || 2)
    setNumAthletes(t.athletes?.length || t.numAthletes || 16)
    setAdvanceThirds(t.advanceThirds !== false)
    const wp = t.winPoint || 11
    setWinPoint(wp)
    setWinCustom(!WIN_POINT_PRESETS.includes(wp))
    setScoreMode(scoreRules(t).mode)
    setOpen(true)
  }

  const submit = () => {
    if (editId) {
      const t = tournaments[editId]
      const formatChanged = t.format !== format
      const groupsChanged =
        format === 'group-knockout' &&
        ((t.numGroups || 2) !== numGroups || (t.advanceThirds !== false) !== advanceThirds)
      const needReset =
        (formatChanged || groupsChanged) && (t.scheduled || t.matches.length > 0)

      const apply = () =>
        updateTournament(editId, (cur) => {
          const next = {
            ...cur,
            name: name.trim() || cur.name,
            format,
            numGroups: format === 'group-knockout' ? numGroups : null,
            numAthletes,
            advanceThirds: format === 'group-knockout' ? advanceThirds : null,
            winPoint,
            scoreMode,
            winBy2,
          }
          if (formatChanged || groupsChanged) {
            // đổi thể thức → lịch cũ không còn hợp lệ, giữ VĐV & cặp
            next.matches = []
            next.groups = []
            next.scheduled = false
            next.stage = format === 'group-knockout' ? 'group' : null
          }
          return next
        })

      if (needReset) {
        modal.confirm({
          title: 'Đổi thể thức?',
          content: 'Lịch thi đấu và tỉ số đã nhập sẽ bị xoá. VĐV và các cặp được giữ nguyên.',
          okText: 'Đổi',
          okButtonProps: { danger: true },
          cancelText: 'Huỷ',
          onOk: () => {
            apply()
            message.success('Đã cập nhật giải đấu')
            close()
          },
        })
        return
      }
      apply()
      message.success('Đã cập nhật giải đấu')
      close()
      return
    }

    createTournament({
      name: name.trim() || 'Giải mới',
      format,
      numGroups: format === 'group-knockout' ? numGroups : undefined,
      numAthletes,
      advanceThirds,
      winPoint,
      scoreMode,
      winBy2,
    })
    close()
  }

  const close = () => {
    setOpen(false)
    setEditId(null)
    setName('')
    setFormat('round-robin')
    setNumGroups(2)
    setNumAthletes(16)
    setAdvanceThirds(true)
    setWinPoint(11)
    setWinCustom(false)
    setScoreMode('by2')
  }

  const confirmDelete = (t) => {
    modal.confirm({
      title: 'Xoá giải đấu?',
      content: `Xoá "${t.name}" cùng toàn bộ VĐV, cặp và trận đấu. Không thể hoàn tác.`,
      okText: 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: () => deleteTournament(t.id),
    })
  }

  return (
    <>
      <div className="app-topbar" style={{ margin: '-14px -14px 14px' }}>
        <TrophyOutlined style={{ fontSize: 22, color: 'var(--shell-accent)' }} />
        <div style={{ flex: 1 }}>
          <h1>Giải đấu</h1>
          <p className="sub">Phân cặp & tính điểm pickleball</p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="glass-card">
          <Empty
            description={<span style={{ color: 'var(--shell-muted)' }}>Chưa có giải nào</span>}
          >
            {canEdit && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Tạo giải đầu tiên
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div className="stack">
          {sorted.map((t) => {
            const isActive = t.id === activeId
            return (
              <div
                key={t.id}
                className="glass-card"
                style={{
                  marginBottom: 0,
                  cursor: 'pointer',
                  outline: isActive ? '1px solid var(--shell-accent)' : 'none',
                }}
                onClick={() => setActive(t.id)}
              >
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                      {t.name}
                      {isActive && (
                        <CheckCircleFilled style={{ color: 'var(--shell-accent)', fontSize: 15 }} />
                      )}
                    </div>
                    <div style={{ color: 'var(--shell-muted)', fontSize: 13, marginTop: 2 }}>
                      {FORMAT_LABEL[t.format]} · {t.athletes.length} VĐV · {t.pairs.length} cặp
                      <br />
                      {scoreRuleLabel(t)}
                    </div>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex' }}>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(t)
                        }}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmDelete(t)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        title={editId ? 'Sửa giải đấu' : 'Tạo giải đấu'}
        open={open}
        onOk={submit}
        onCancel={close}
        okText={editId ? 'Lưu' : 'Tạo'}
        cancelText="Huỷ"
      >
        <div className="stack" style={{ marginTop: 12 }}>
          <div>
            <div className="section-title">Tên giải</div>
            <Input
              placeholder="VD: Chicken Cup lần 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={submit}
              autoFocus
            />
          </div>
          <div>
            <div className="section-title">Số vận động viên dự kiến</div>
            <InputNumber
              min={2}
              max={200}
              step={2}
              value={numAthletes}
              onChange={(v) => setNumAthletes(v || 2)}
              style={{ width: '100%' }}
              addonAfter="VĐV"
            />
            <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
              {plan.numPairs} cặp đôi
              {plan.leftover ? ' · lẻ 1 người sẽ phải chờ ghép thêm' : ''}. Con số này chỉ dùng để
              tính trước lịch, nhập VĐV thật ở tab Vận động viên.
            </div>
          </div>

          <div>
            <div className="section-title">Thể thức</div>
            <Segmented block value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
            <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
              {formatDesc(format, numGroups)}
            </div>
          </div>

          {format === 'group-knockout' && (
            <>
              <div>
                <div className="section-title">Số bảng</div>
                <InputNumber
                  min={2}
                  max={8}
                  value={numGroups}
                  onChange={(v) => setNumGroups(v || 2)}
                  style={{ width: '100%' }}
                  addonAfter="bảng"
                />
                {groupPlans.length > 0 && (
                  <div className="plan-options">
                    {groupPlans.map((g) => (
                      <button
                        type="button"
                        key={g.numGroups}
                        className={`plan-option${g.numGroups === numGroups ? ' is-on' : ''}`}
                        onClick={() => setNumGroups(g.numGroups)}
                      >
                        <span className="plan-option-head">
                          {g.sizeLabel}
                          {g.recommended && <Tag color="green">nên chọn</Tag>}
                        </span>
                        <span className="plan-option-sub">
                          {g.groupMatches} trận bảng · {g.knockoutMatches} trận loại ·{' '}
                          {g.qualifiers} cặp đi tiếp
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
                  Các cặp rải đều vào {numGroups} bảng (kiểu snake): {plan.sizes.join(' - ')} cặp.
                </div>
              </div>

              <div>
                <div className="row-between" style={{ alignItems: 'center' }}>
                  <div>
                    <div className="section-title" style={{ marginBottom: 2 }}>
                      Vớt hạng ba cho đủ nhánh
                    </div>
                    <div style={{ color: 'var(--shell-muted)', fontSize: 12 }}>
                      Khi nhất + nhì các bảng không đủ 4/8/16 cặp, lấy tiếp các cặp hạng ba có thành
                      tích tốt nhất.
                    </div>
                  </div>
                  <Switch checked={advanceThirds} onChange={setAdvanceThirds} />
                </div>
              </div>
            </>
          )}

          <div>
            <div className="section-title">Điểm thắng một trận</div>
            <Segmented
              block
              value={winCustom ? 'custom' : winPoint}
              onChange={(v) => {
                if (v === 'custom') {
                  setWinCustom(true)
                } else {
                  setWinCustom(false)
                  setWinPoint(v)
                }
              }}
              options={[
                ...WIN_POINT_PRESETS.map((p) => ({ label: `${p}`, value: p })),
                { label: 'Khác', value: 'custom' },
              ]}
            />
            {winCustom && (
              <InputNumber
                min={1}
                max={99}
                value={winPoint}
                onChange={(v) => setWinPoint(v || 1)}
                style={{ width: '100%', marginTop: 8 }}
                addonAfter="điểm"
                placeholder="Nhập điểm thắng"
                autoFocus
              />
            )}
          </div>

          <div>
            <div className="section-title">Luật kết thúc</div>
            <Segmented
              block
              value={scoreMode}
              onChange={setScoreMode}
              options={[
                { label: 'Cách 2 điểm', value: 'by2' },
                { label: `Cách 2, chạm ${capPoint}`, value: 'cap' },
                { label: 'Chạm là thắng', value: 'touch' },
              ]}
            />
            <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
              {scoreMode === 'by2'
                ? `Tới ${winPoint - 1}–${winPoint - 1} thì đánh tiếp cho tới khi hơn đúng 2 điểm (VD ${winPoint + 1}–${winPoint - 1}).`
                : scoreMode === 'cap'
                  ? `Tới ${winPoint - 1}–${winPoint - 1} thì đánh tiếp cách 2, nhưng bên nào chạm ${capPoint} điểm trước thì thắng luôn (VD ${capPoint}–${capPoint - 1}).`
                  : `Bên nào chạm ${winPoint} điểm trước là thắng, không đánh deuce.`}
            </div>
          </div>

          <div className="plan-summary">
            <div className="plan-summary-title">Tóm tắt phương án</div>
            <div className="plan-grid">
              <div className="plan-cell">
                <span className="plan-k">Quy mô</span>
                <span className="plan-v">
                  {plan.numAthletes} VĐV → {plan.numPairs} cặp
                </span>
              </div>
              <div className="plan-cell">
                <span className="plan-k">Thể thức</span>
                <span className="plan-v">{FORMAT_LABEL[format]}</span>
              </div>
              {format === 'group-knockout' && (
                <>
                  <div className="plan-cell">
                    <span className="plan-k">Chia bảng</span>
                    <span className="plan-v">
                      {plan.numGroups} bảng · {plan.sizes.join('-')} cặp
                    </span>
                  </div>
                  <div className="plan-cell">
                    <span className="plan-k">Vào knockout</span>
                    <span className="plan-v">
                      {plan.qualifiers} cặp
                      {plan.thirdsUsed > 0 ? ` (nhất+nhì + ${plan.thirdsUsed} hạng ba)` : ' (nhất+nhì)'}
                    </span>
                  </div>
                  <div className="plan-cell">
                    <span className="plan-k">Trận vòng bảng</span>
                    <span className="plan-v">{plan.groupMatches} trận</span>
                  </div>
                  <div className="plan-cell">
                    <span className="plan-k">Trận knockout</span>
                    <span className="plan-v">
                      {plan.knockoutMatches} trận (nhánh {plan.bracketSize})
                    </span>
                  </div>
                </>
              )}
              {format === 'round-robin' && (
                <div className="plan-cell">
                  <span className="plan-k">Tổng số trận</span>
                  <span className="plan-v">{plan.groupMatches} trận (mọi cặp gặp nhau 1 lần)</span>
                </div>
              )}
              {format === 'knockout' && (
                <div className="plan-cell">
                  <span className="plan-k">Trận knockout</span>
                  <span className="plan-v">
                    {plan.knockoutMatches} trận (nhánh {plan.bracketSize}
                    {plan.byes ? `, ${plan.byes} cặp được bye` : ''})
                  </span>
                </div>
              )}
              <div className="plan-cell">
                <span className="plan-k">Luật điểm</span>
                <span className="plan-v">{scoreRuleLabel({ winPoint, scoreMode, winBy2 })}</span>
              </div>
              <div className="plan-cell plan-total">
                <span className="plan-k">Tổng cộng</span>
                <span className="plan-v">{plan.totalMatches} trận</span>
              </div>
            </div>
            {plan.warnings.map((w, i) => (
              <div className="plan-warn" key={i}>
                {w}
              </div>
            ))}
          </div>

          {editId && (
            <div style={{ color: 'var(--shell-muted)', fontSize: 12 }}>
              Đổi thể thức sẽ xoá lịch thi đấu & tỉ số đã nhập, nhưng giữ nguyên VĐV và các cặp. Đổi
              luật điểm chỉ áp cho các tỉ số nhập sau đó.
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
