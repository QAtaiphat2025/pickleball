import { useState } from 'react'
import { Button, Segmented, Empty, App as AntApp, Select } from 'antd'
import {
  ApartmentOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useActive, updateTournament } from '../store'
import {
  pairByLevel,
  pairRandom,
  makePair,
  pairLabel,
  LEVELS,
} from '../logic'
import { LEVEL_COLORS } from '../theme'

const MODES = [
  { label: 'Theo trình độ', value: 'level' },
  { label: 'Ngẫu nhiên', value: 'random' },
  { label: 'Phân tay', value: 'manual' },
]

export default function PairingPage() {
  const { modal, message } = AntApp.useApp()
  const t = useActive()
  const [mode, setMode] = useState('level')
  const [selA, setSelA] = useState(null)
  const [selB, setSelB] = useState(null)

  if (!t) {
    return (
      <div className="glass-card">
        <Empty description={<span style={{ color: 'var(--shell-muted)' }}>Chưa chọn giải nào.</span>} />
      </div>
    )
  }

  const athletes = t.athletes
  const pairs = t.pairs
  const byId = Object.fromEntries(athletes.map((a) => [a.id, a]))

  // VĐV đã nằm trong cặp nào đó
  const usedIds = new Set(pairs.flatMap((p) => p.players))
  const freeAthletes = athletes.filter((a) => !usedIds.has(a.id))

  const commitPairs = (result, replace) => {
    updateTournament(t.id, (cur) => ({
      ...cur,
      pairs: replace ? result.pairs : [...cur.pairs, ...result.pairs],
      paired: (replace ? result.pairs : [...cur.pairs, ...result.pairs]).length > 0,
      scheduled: false,
      matches: [],
    }))
  }

  const autoPair = () => {
    if (athletes.length < 2) {
      message.warning('Cần ít nhất 2 VĐV')
      return
    }
    const run = () => {
      const result = mode === 'level' ? pairByLevel(athletes) : pairRandom(athletes)
      commitPairs(result, true)
      const odd = result.unpaired.length
      message.success(
        `Đã tạo ${result.pairs.length} cặp` + (odd ? ` · ${odd} VĐV lẻ chưa ghép` : ''),
      )
    }
    if (pairs.length) {
      modal.confirm({
        title: 'Phân cặp lại?',
        content: 'Sẽ xoá toàn bộ cặp và lịch thi đấu hiện tại.',
        okText: 'Phân lại',
        cancelText: 'Huỷ',
        onOk: run,
      })
    } else {
      run()
    }
  }

  const addManual = () => {
    if (!selA || !selB || selA === selB) {
      message.warning('Chọn 2 VĐV khác nhau')
      return
    }
    const p = makePair([byId[selA], byId[selB]])
    updateTournament(t.id, (cur) => ({
      ...cur,
      pairs: [...cur.pairs, p],
      paired: true,
      scheduled: false,
      matches: [],
    }))
    setSelA(null)
    setSelB(null)
  }

  const removePair = (pid) => {
    updateTournament(t.id, (cur) => {
      const next = cur.pairs.filter((p) => p.id !== pid)
      return { ...cur, pairs: next, paired: next.length > 0, scheduled: false, matches: [] }
    })
  }

  const clearAll = () => {
    modal.confirm({
      title: 'Xoá toàn bộ cặp?',
      content: 'Lịch thi đấu cũng sẽ bị xoá.',
      okText: 'Xoá hết',
      cancelText: 'Huỷ',
      okButtonProps: { danger: true },
      onOk: () =>
        updateTournament(t.id, (cur) => ({
          ...cur,
          pairs: [],
          paired: false,
          scheduled: false,
          matches: [],
        })),
    })
  }

  const freeOptions = freeAthletes.map((a) => ({
    label: `${a.name} (${a.level})`,
    value: a.id,
  }))

  return (
    <>
      <div className="app-topbar" style={{ margin: '-14px -14px 14px' }}>
        <ApartmentOutlined style={{ fontSize: 22, color: 'var(--shell-accent)' }} />
        <div style={{ flex: 1 }}>
          <h1>Phân cặp</h1>
          <p className="sub">{pairs.length} cặp · {freeAthletes.length} VĐV chưa ghép</p>
        </div>
        {pairs.length > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={clearAll}>
            Xoá hết
          </Button>
        )}
      </div>

      <div className="glass-card">
        <div className="section-title">Chế độ</div>
        <Segmented block value={mode} onChange={setMode} options={MODES} />

        {mode === 'level' && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--shell-muted)' }}>
            Ghép A với D, B với C (ngẫu nhiên trong nhóm). Phần dư ghép ngẫu nhiên với nhau.
          </div>
        )}
        {mode === 'random' && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--shell-muted)' }}>
            Xáo trộn toàn bộ danh sách rồi ghép đôi.
          </div>
        )}

        {mode === 'manual' ? (
          <div className="stack" style={{ marginTop: 12 }}>
            <Select
              placeholder="VĐV thứ nhất"
              value={selA}
              onChange={setSelA}
              options={freeOptions.filter((o) => o.value !== selB)}
              showSearch
              optionFilterProp="label"
            />
            <Select
              placeholder="VĐV thứ hai"
              value={selB}
              onChange={setSelB}
              options={freeOptions.filter((o) => o.value !== selA)}
              showSearch
              optionFilterProp="label"
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={addManual} block>
              Ghép cặp
            </Button>
          </div>
        ) : (
          <Button
            type="primary"
            icon={pairs.length ? <ReloadOutlined /> : <ThunderboltOutlined />}
            onClick={autoPair}
            block
            style={{ marginTop: 12 }}
          >
            {pairs.length ? 'Phân cặp lại' : 'Phân cặp tự động'}
          </Button>
        )}
      </div>

      <div className="glass-card">
        <div className="section-title">Danh sách cặp</div>
        {pairs.length === 0 ? (
          <div className="empty-hint">Chưa có cặp nào.</div>
        ) : (
          pairs.map((p, i) => (
            <div key={p.id} className="pair-row">
              <span style={{ color: 'var(--shell-accent)', fontWeight: 800, width: 30 }}>
                #{i + 1}
              </span>
              <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {p.players.map((pid) => {
                  const a = byId[pid]
                  return (
                    <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span
                        className="level-badge"
                        style={{ background: LEVEL_COLORS[a?.level] || '#94a3b8' }}
                      >
                        {a?.level}
                      </span>
                      <span style={{ fontWeight: 600 }}>{a?.name || '?'}</span>
                    </span>
                  )
                })}
              </div>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removePair(p.id)}
              />
            </div>
          ))
        )}
      </div>
    </>
  )
}
