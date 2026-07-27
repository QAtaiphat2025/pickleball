import { useEffect, useState } from 'react'
import { Button, Drawer, App as AntApp, Tag } from 'antd'
import {
  SwapOutlined,
  ReloadOutlined,
  RetweetOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { bracketSlotCount, defaultSlotOrder, koRoundName } from '../logic'

// Sắp nhánh loại trực tiếp thủ công: bấm 1 suất rồi bấm suất khác để đổi chỗ.
// Cách này gọn trên mobile và không bao giờ tạo ra trùng/thiếu cặp.
export default function BracketArrange({
  open,
  onClose,
  pairIds,
  initialSlots,
  labelOf,
  seedTagOf = {},
  onSave,
  hasScores,
}) {
  const { modal, message } = AntApp.useApp()
  const size = bracketSlotCount(pairIds.length)
  const [slots, setSlots] = useState([])
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    if (open) {
      // mở ra là hiện đúng nhánh hiện tại (nếu đã bốc), chưa bốc thì theo seed chuẩn
      setSlots(
        initialSlots && initialSlots.length === size ? [...initialSlots] : defaultSlotOrder(pairIds),
      )
      setPicked(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (size < 2) return null

  const tapSlot = (i) => {
    if (picked == null) {
      setPicked(i)
      return
    }
    if (picked === i) {
      setPicked(null)
      return
    }
    const next = [...slots]
    const tmp = next[i]
    next[i] = next[picked]
    next[picked] = tmp
    // đổi chỗ mà tạo ra trận cả 2 bên trống thì cây bị treo → không cho
    const dead = deadMatchIndex(next)
    if (dead >= 0) {
      message.warning(`Không đổi được: trận ${dead + 1} sẽ không còn cặp nào`)
      setPicked(null)
      return
    }
    setSlots(next)
    setPicked(null)
  }

  const reset = () => {
    setSlots(defaultSlotOrder(pairIds))
    setPicked(null)
  }

  const shuffle = () => {
    // xáo trộn các suất thật, giữ nguyên vị trí các slot bye
    const real = slots.filter(Boolean)
    for (let i = real.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = real[i]
      real[i] = real[j]
      real[j] = tmp
    }
    let k = 0
    setSlots(slots.map((s) => (s ? real[k++] : null)))
    setPicked(null)
  }

  const save = () => {
    const run = () => {
      onSave(slots)
      onClose()
    }
    if (hasScores) {
      modal.confirm({
        title: 'Áp dụng nhánh mới?',
        content: 'Tỉ số vòng loại trực tiếp đã nhập sẽ bị xoá.',
        okText: 'Áp dụng',
        cancelText: 'Huỷ',
        onOk: run,
      })
    } else {
      run()
    }
  }

  const rounds = Math.log2(size)
  const roundLabel = koRoundName(1, rounds)
  const pairsOfSlots = []
  for (let i = 0; i < size; i += 2) pairsOfSlots.push([i, i + 1])

  return (
    <Drawer
      title="Tự sắp nhánh loại trực tiếp"
      placement="bottom"
      height="86%"
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 14 } }}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={reset} style={{ flex: 1 }}>
            Theo seed
          </Button>
          <Button icon={<RetweetOutlined />} onClick={shuffle} style={{ flex: 1 }}>
            Xáo trộn
          </Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={save} style={{ flex: 1.2 }}>
            Áp dụng
          </Button>
        </div>
      }
    >
      <div className="arr-hint">
        Bấm một suất rồi bấm suất khác để <b>đổi chỗ</b>. {roundLabel} gồm{' '}
        {pairsOfSlots.length} trận
        {size > pairIds.length ? ` · ${size - pairIds.length} suất trống (bye)` : ''}.
      </div>

      <div className="arr-list">
        {pairsOfSlots.map(([ia, ib], idx) => (
          <div key={ia} className="arr-match">
            <div className="arr-match-no">Trận {idx + 1}</div>
            <div className="arr-slots">
              <Slot
                i={ia}
                pid={slots[ia]}
                picked={picked === ia}
                labelOf={labelOf}
                seedTagOf={seedTagOf}
                onTap={tapSlot}
              />
              <span className="arr-vs">VS</span>
              <Slot
                i={ib}
                pid={slots[ib]}
                picked={picked === ib}
                labelOf={labelOf}
                seedTagOf={seedTagOf}
                onTap={tapSlot}
              />
            </div>
            {(slots[ia] || slots[ib]) && !(slots[ia] && slots[ib]) && (
              <div className="arr-bye-note">
                <Tag color="processing">Miễn vòng</Tag>
                {labelOf(slots[ia] || slots[ib])} vào thẳng vòng sau
              </div>
            )}
          </div>
        ))}
      </div>
    </Drawer>
  )
}

// Trận đầu tiên không có cặp nào (2 slot đều trống) → -1 nếu nhánh hợp lệ.
function deadMatchIndex(slots) {
  for (let i = 0; i < slots.length; i += 2) {
    if (!slots[i] && !slots[i + 1]) return i / 2
  }
  return -1
}

function Slot({ i, pid, picked, labelOf, seedTagOf, onTap }) {
  const empty = !pid
  return (
    <button
      type="button"
      className={`arr-slot${picked ? ' is-picked' : ''}${empty ? ' is-empty' : ''}`}
      onClick={() => onTap(i)}
      aria-label={empty ? 'Suất trống' : labelOf(pid)}
      aria-pressed={picked}
    >
      {picked && <SwapOutlined className="arr-slot-icon" />}
      {empty ? (
        <span className="arr-slot-empty">— trống —</span>
      ) : (
        <>
          {seedTagOf[pid] && <span className="arr-slot-seed">{seedTagOf[pid]}</span>}
          <span className="arr-slot-name">{labelOf(pid)}</span>
        </>
      )}
    </button>
  )
}
