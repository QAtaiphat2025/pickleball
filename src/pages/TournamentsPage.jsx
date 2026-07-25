import { useState } from 'react'
import { Button, Input, Segmented, Modal, Empty, App as AntApp, InputNumber } from 'antd'
import {
  PlusOutlined,
  TrophyOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { useStore, useAuth, createTournament, updateTournament, setActive, deleteTournament } from '../store'

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
      : `Các cặp rải đều vào ${numGroups} bảng (kiểu snake). Nhất bảng gặp nhì bảng kế.`

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

  const sorted = Object.values(tournaments).sort((a, b) => b.createdAt - a.createdAt)

  const openCreate = () => {
    setEditId(null)
    setName('')
    setFormat('round-robin')
    setNumGroups(2)
    setOpen(true)
  }

  const openEdit = (t) => {
    setEditId(t.id)
    setName(t.name)
    setFormat(t.format)
    setNumGroups(t.numGroups || 2)
    setOpen(true)
  }

  const submit = () => {
    if (editId) {
      const t = tournaments[editId]
      const formatChanged = t.format !== format
      const groupsChanged =
        format === 'group-knockout' && (t.numGroups || 2) !== numGroups
      const needReset =
        (formatChanged || groupsChanged) && (t.scheduled || t.matches.length > 0)

      const apply = () =>
        updateTournament(editId, (cur) => {
          const next = {
            ...cur,
            name: name.trim() || cur.name,
            format,
            numGroups: format === 'group-knockout' ? numGroups : null,
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
    })
    close()
  }

  const close = () => {
    setOpen(false)
    setEditId(null)
    setName('')
    setFormat('round-robin')
    setNumGroups(2)
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
            <div className="section-title">Thể thức</div>
            <Segmented block value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
            <div style={{ color: 'var(--shell-muted)', fontSize: 12, marginTop: 8 }}>
              {formatDesc(format, numGroups)}
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

          {editId && (
            <div style={{ color: 'var(--shell-muted)', fontSize: 12 }}>
              Đổi thể thức sẽ xoá lịch thi đấu & tỉ số đã nhập, nhưng giữ nguyên VĐV và các cặp.
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
