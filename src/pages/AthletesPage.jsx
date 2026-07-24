import { useState } from 'react'
import { Button, Input, Segmented, Modal, Empty, Tag, App as AntApp } from 'antd'
import {
  PlusOutlined,
  TeamOutlined,
  DeleteOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import { useActive, updateTournament, uid } from '../store'
import { LEVELS } from '../logic'
import { LEVEL_COLORS } from '../theme'

function LevelBadge({ level }) {
  return (
    <span className="level-badge" style={{ background: LEVEL_COLORS[level] || '#94a3b8' }}>
      {level}
    </span>
  )
}

export default function AthletesPage() {
  const { modal, message } = AntApp.useApp()
  const t = useActive()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('B')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkLevel, setBulkLevel] = useState('B')

  if (!t) {
    return (
      <div className="glass-card">
        <Empty description={<span style={{ color: 'var(--shell-muted)' }}>Chưa chọn giải nào. Vào tab Giải để tạo hoặc chọn.</span>} />
      </div>
    )
  }

  const locked = t.paired
  const athletes = t.athletes

  const add = () => {
    const nm = name.trim()
    if (!nm) return
    updateTournament(t.id, (cur) => ({
      ...cur,
      athletes: [...cur.athletes, { id: uid('a'), name: nm, level }],
    }))
    setName('')
  }

  const remove = (id) => {
    updateTournament(t.id, (cur) => ({
      ...cur,
      athletes: cur.athletes.filter((a) => a.id !== id),
    }))
  }

  const changeLevel = (id, lv) => {
    updateTournament(t.id, (cur) => ({
      ...cur,
      athletes: cur.athletes.map((a) => (a.id === id ? { ...a, level: lv } : a)),
    }))
  }

  const doBulk = () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()) // bỏ "1. " đầu dòng
      .filter(Boolean)
    if (!lines.length) {
      setBulkOpen(false)
      return
    }
    const added = lines.map((nm) => ({ id: uid('a'), name: nm, level: bulkLevel }))
    updateTournament(t.id, (cur) => ({ ...cur, athletes: [...cur.athletes, ...added] }))
    message.success(`Đã thêm ${added.length} VĐV`)
    setBulkText('')
    setBulkOpen(false)
  }

  const counts = LEVELS.reduce((acc, lv) => {
    acc[lv] = athletes.filter((a) => a.level === lv).length
    return acc
  }, {})

  return (
    <>
      <div className="app-topbar" style={{ margin: '-14px -14px 14px' }}>
        <TeamOutlined style={{ fontSize: 22, color: 'var(--shell-accent)' }} />
        <div style={{ flex: 1 }}>
          <h1>{t.name}</h1>
          <p className="sub">{athletes.length} vận động viên</p>
        </div>
        <Button icon={<ImportOutlined />} onClick={() => setBulkOpen(true)} disabled={locked}>
          Dán
        </Button>
      </div>

      {locked && (
        <div className="glass-card" style={{ borderColor: 'var(--shell-accent)' }}>
          <div style={{ fontSize: 13, color: 'var(--shell-muted)' }}>
            Giải đã phân cặp — danh sách VĐV bị khoá. Xoá cặp ở tab Phân cặp để sửa lại.
          </div>
        </div>
      )}

      {!locked && (
        <div className="glass-card">
          <div className="section-title">Thêm VĐV</div>
          <div className="stack">
            <Input
              placeholder="Tên vận động viên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={add}
            />
            <div className="row-between">
              <Segmented
                value={level}
                onChange={setLevel}
                options={LEVELS.map((lv) => ({ label: lv, value: lv }))}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={add}>
                Thêm
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div className="section-title" style={{ margin: 0 }}>
            Danh sách
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {LEVELS.map((lv) => (
              <Tag
                key={lv}
                style={{
                  margin: 0,
                  background: 'transparent',
                  borderColor: LEVEL_COLORS[lv],
                  color: LEVEL_COLORS[lv],
                  borderRadius: 999,
                }}
              >
                {lv}:{counts[lv]}
              </Tag>
            ))}
          </div>
        </div>

        {athletes.length === 0 ? (
          <div className="empty-hint">Chưa có VĐV. Thêm thủ công hoặc dán danh sách.</div>
        ) : (
          <div>
            {athletes.map((a, i) => (
              <div key={a.id} className="pair-row">
                <span style={{ color: 'var(--shell-muted)', width: 22, fontSize: 13 }}>{i + 1}</span>
                <LevelBadge level={a.level} />
                <span style={{ flex: 1, fontWeight: 600 }}>{a.name}</span>
                {!locked && (
                  <>
                    <Segmented
                      size="small"
                      value={a.level}
                      onChange={(lv) => changeLevel(a.id, lv)}
                      options={LEVELS.map((lv) => ({ label: lv, value: lv }))}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(a.id)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        title="Dán danh sách VĐV"
        open={bulkOpen}
        onOk={doBulk}
        onCancel={() => setBulkOpen(false)}
        okText="Thêm"
        cancelText="Huỷ"
      >
        <div className="stack" style={{ marginTop: 12 }}>
          <div style={{ color: 'var(--shell-muted)', fontSize: 12 }}>
            Mỗi dòng một tên. Số thứ tự đầu dòng (VD "1. ") sẽ tự bỏ.
          </div>
          <Input.TextArea
            rows={8}
            placeholder={'Nguyễn Văn A\nTrần Thị B\n...'}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div>
            <div className="section-title">Gán trình độ cho cả nhóm</div>
            <Segmented
              value={bulkLevel}
              onChange={setBulkLevel}
              options={LEVELS.map((lv) => ({ label: lv, value: lv }))}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
