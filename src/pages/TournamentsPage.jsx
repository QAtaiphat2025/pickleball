import { useState } from 'react'
import { Button, Input, Segmented, Modal, Empty, App as AntApp, InputNumber } from 'antd'
import {
  PlusOutlined,
  TrophyOutlined,
  DeleteOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { useStore, createTournament, setActive, deleteTournament } from '../store'

const FORMAT_LABEL = {
  'round-robin': 'Vòng tròn tính điểm',
  knockout: 'Nhánh loại trực tiếp',
  'group-knockout': 'Vòng bảng + Loại trực tiếp',
}

export default function TournamentsPage() {
  const { modal } = AntApp.useApp()
  const tournaments = useStore((s) => s.tournaments)
  const activeId = useStore((s) => s.activeId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [format, setFormat] = useState('round-robin')
  const [numGroups, setNumGroups] = useState(2)

  const sorted = Object.values(tournaments).sort((a, b) => b.createdAt - a.createdAt)

  const submit = () => {
    createTournament({
      name: name.trim() || 'Giải mới',
      format,
      numGroups: format === 'group-knockout' ? numGroups : undefined,
    })
    setName('')
    setFormat('round-robin')
    setNumGroups(2)
    setOpen(false)
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Tạo
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="glass-card">
          <Empty
            description={<span style={{ color: 'var(--shell-muted)' }}>Chưa có giải nào</span>}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Tạo giải đầu tiên
            </Button>
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
                    </div>
                  </div>
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
              </div>
            )
          })}
        </div>
      )}

      <Modal
        title="Tạo giải đấu"
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="Tạo"
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
            <div className="section-title">Thể thức</div>
            <Segmented
              block
              value={format}
              onChange={setFormat}
              options={[
                { label: 'Vòng tròn', value: 'round-robin' },
                { label: 'Nhánh loại', value: 'knockout' },
                { label: 'Bảng + Loại', value: 'group-knockout' },
              ]}
            />
            <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
              {format === 'round-robin'
                ? 'Mọi cặp gặp nhau 1 lần, xếp hạng theo thắng → hiệu số.'
                : format === 'knockout'
                  ? 'Đấu loại trực tiếp, có tranh nhất/nhì và đồng giải ba.'
                  : 'Chia bảng đá vòng tròn, nhất + nhì mỗi bảng vào nhánh loại trực tiếp.'}
            </div>
          </div>

          {format === 'group-knockout' && (
            <div>
              <div className="section-title">Số bảng</div>
              <InputNumber
                min={2}
                max={8}
                value={numGroups}
                onChange={(v) => setNumGroups(v || 2)}
                style={{ width: '100%' }}
              />
              <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
                Các cặp sẽ được rải đều vào {numGroups} bảng (kiểu snake). Nhất bảng gặp nhì bảng kế.
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
