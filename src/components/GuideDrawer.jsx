import { useEffect, useState } from 'react'
import { Button, Drawer, Tag, Tooltip } from 'antd'
import {
  QuestionCircleOutlined,
  TrophyOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ScheduleOutlined,
  OrderedListOutlined,
  EyeOutlined,
  UnlockOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from '@ant-design/icons'

// Hướng dẫn sử dụng trực quan: nút "?" cố định góc trên phải, mở panel
// 5 bước theo đúng 5 tab dưới đáy + luật tính điểm + cách chia bảng.
// Tự mở lần đầu người dùng vào app (ghi cờ vào localStorage).

const SEEN_KEY = 'pk_guide_seen_v1'

const STEPS = [
  {
    icon: <TrophyOutlined />,
    tab: 'Giải',
    title: 'Tạo giải đấu',
    lines: [
      'Bấm nút **Tạo** ở góc trên phải, đặt tên giải.',
      'Chọn thể thức: **Vòng tròn** (mọi cặp gặp nhau 1 lần), **Loại trực tiếp** (thua là ra), hoặc **Vòng bảng + loại trực tiếp**.',
      'Nhập **số VĐV dự kiến** để app tính trước số cặp, gợi ý số bảng hợp lý và tóm tắt số trận.',
      'Chọn thể thức vòng bảng thì chọn thêm **Số bảng** (2–8) — bấm vào phương án gợi ý là nhanh nhất.',
      'Chọn **Điểm thắng** (11 / 15 / 21 / khác) và **Luật kết thúc** (cách 2 điểm hay chạm là thắng).',
      'Bấm vào thẻ giải để chọn làm giải đang thi đấu (viền sáng xanh).',
    ],
  },
  {
    icon: <TeamOutlined />,
    tab: 'VĐV',
    title: 'Nhập vận động viên',
    lines: [
      'Gõ tên, chọn trình độ **A / B / C / D** rồi bấm **Thêm**.',
      'Có sẵn danh sách? Bấm **Dán**, mỗi dòng một tên — số thứ tự đầu dòng tự bỏ.',
      'A là mạnh nhất, D là yếu nhất. Trình độ chỉ dùng để ghép cặp cho cân sức.',
      'Sửa trình độ hoặc xoá VĐV ngay trên từng dòng.',
    ],
  },
  {
    icon: <ApartmentOutlined />,
    tab: 'Phân cặp',
    title: 'Ghép đôi',
    lines: [
      '**Theo trình độ**: ghép A với D, B với C — hai cặp ra sân cân nhau.',
      '**Ngẫu nhiên**: xáo trộn toàn bộ rồi ghép đôi.',
      '**Phân tay**: tự chọn từng 2 người một.',
      'Số VĐV lẻ thì còn 1 người chưa ghép, dùng chế độ Phân tay để xử lý.',
    ],
  },
  {
    icon: <ScheduleOutlined />,
    tab: 'Trận',
    title: 'Tạo lịch & nhập tỉ số',
    lines: [
      'Bấm **Tạo lịch thi đấu** — app tự sinh toàn bộ trận theo thể thức đã chọn.',
      'Nhập 2 số vào ô tỉ số rồi bấm **Lưu**. Kết quả hiện ngay cho mọi người đang xem.',
      'Thể thức vòng bảng: nhập đủ tỉ số cả vòng bảng rồi bấm **Chốt vòng bảng** để bốc nhánh loại trực tiếp.',
      'Loại trực tiếp: cặp thắng tự động được đẩy lên vòng sau.',
    ],
  },
  {
    icon: <OrderedListOutlined />,
    tab: 'BXH',
    title: 'Xem bảng xếp hạng',
    lines: [
      'Bảng xếp hạng tự cập nhật sau mỗi tỉ số, không cần tải lại trang.',
      '2 hàng **tô sáng** đầu mỗi bảng là 2 cặp đi tiếp; cặp hạng ba có thể được vớt thêm cho đủ nhánh.',
      'Xong nhánh loại trực tiếp thì hiện bục podium 🥇 🥈 🥉.',
    ],
  },
]

// in đậm phần **...** trong câu hướng dẫn
function RichLine({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <b key={i} style={{ color: 'var(--shell-text)' }}>
            {p.slice(2, -2)}
          </b>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  )
}

function StepCard({ step, index }) {
  return (
    <div className="guide-step">
      <div className="guide-step-rail">
        <div className="guide-step-num">{index + 1}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="guide-step-head">
          <span style={{ color: 'var(--shell-accent)', fontSize: 17 }}>{step.icon}</span>
          <span className="guide-step-title">{step.title}</span>
          <Tag className="guide-tab-tag">tab {step.tab}</Tag>
        </div>
        <ul className="guide-list">
          {step.lines.map((l, i) => (
            <li key={i}>
              <RichLine text={l} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className="guide-section">
      <div className="guide-section-title">
        <span style={{ color: 'var(--shell-accent)' }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function GuideDrawer() {
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(() => window.innerWidth >= 720)

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 720)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // lần đầu vào app thì mở sẵn hướng dẫn
  useEffect(() => {
    let seen = null
    try {
      seen = localStorage.getItem(SEEN_KEY)
    } catch {
      seen = 'skip' // trình duyệt chặn storage → đừng tự mở
    }
    if (!seen) setOpen(true)
  }, [])

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* bỏ qua */
    }
  }

  return (
    <>
      <Tooltip title="Hướng dẫn sử dụng" placement="left">
        <button
          type="button"
          className="guide-fab"
          onClick={() => setOpen(true)}
          aria-label="Mở hướng dẫn sử dụng"
        >
          <QuestionCircleOutlined />
        </button>
      </Tooltip>

      <Drawer
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BulbOutlined style={{ color: 'var(--shell-accent)' }} />
            Hướng dẫn sử dụng
          </span>
        }
        open={open}
        onClose={close}
        placement={wide ? 'right' : 'bottom'}
        width={wide ? 460 : undefined}
        height={wide ? undefined : '88vh'}
        className="guide-drawer"
        footer={
          <Button type="primary" block onClick={close}>
            Đã hiểu, bắt đầu thôi
          </Button>
        }
      >
        <div className="guide-hero">
          <div className="guide-hero-title">Chạy một giải pickleball trong 5 bước</div>
          <div className="guide-hero-sub">
            Làm theo đúng thứ tự 5 tab ở đáy màn hình, từ trái sang phải.
          </div>
        </div>

        {STEPS.map((s, i) => (
          <StepCard key={s.tab} step={s} index={i} />
        ))}

        <Section icon={<EyeOutlined />} title="Ai làm được gì">
          <div className="guide-role">
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              <EyeOutlined /> Khách
            </Tag>
            <span>
              Không cần đăng nhập. Xem được mọi thông tin: lịch, tỉ số, bảng xếp hạng — tự cập nhật
              theo thời gian thực khi ban tổ chức nhập điểm.
            </span>
          </div>
          <div className="guide-role">
            <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
              <UnlockOutlined /> Quản trị
            </Tag>
            <span>
              Bấm <b>Đăng nhập</b> ở góc trên phải, nhập mật khẩu ban tổ chức. Sau khi đăng nhập mới
              hiện các nút tạo giải, thêm VĐV, phân cặp và nhập tỉ số.
            </span>
          </div>
        </Section>

        <Section icon={<ThunderboltOutlined />} title="Luật tính điểm">
          <ul className="guide-list">
            <li>
              Khi tạo giải bạn chọn <b>điểm thắng</b> (11, 15, 21 hoặc số khác) và{' '}
              <b>luật kết thúc</b>. Luật này áp cho mọi trận của giải đó.
            </li>
            <li>
              <b>Cách 2 điểm</b>: tới sát điểm thắng mà hoà (VD 10–10 với bàn 11) thì đánh tiếp cho
              tới khi một bên hơn đúng 2 — 12–10, 13–11, 14–12…
            </li>
            <li>
              <b>Chạm là thắng</b>: bên nào tới đúng số điểm thắng trước là thắng, không đánh deuce.
            </li>
            <li>Không có kết quả hoà. Nhập sai luật app sẽ báo lỗi và không lưu.</li>
          </ul>
        </Section>

        <Section icon={<OrderedListOutlined />} title="Cách xếp hạng">
          <ul className="guide-list">
            <li>
              Thứ tự ưu tiên: <b>số trận thắng</b> → <b>hiệu số điểm</b> → <b>tổng điểm ghi được</b>.
            </li>
            <li>Cột HS là hiệu số: tổng điểm ghi trừ tổng điểm bị ghi.</li>
          </ul>
        </Section>

        <Section icon={<ApartmentOutlined />} title="Cách chia bảng">
          <ul className="guide-list">
            <li>
              Các cặp được rải kiểu <b>snake</b> (A→B→C rồi quay ngược C→B→A), nên số cặp giữa các
              bảng chênh nhau nhiều nhất 1.
            </li>
            <li>Ví dụ 15 cặp chia 6 bảng → 3-3-3-2-2-2 cặp.</li>
            <li>
              Cần ít nhất <b>số bảng × 2</b> cặp, vì bảng chỉ có 1 cặp thì không có trận nào.
            </li>
          </ul>
        </Section>

        <Section icon={<ApartmentOutlined />} title="Vào nhánh loại trực tiếp">
          <ul className="guide-list">
            <li>
              Mỗi bảng lấy <b>nhất + nhì</b>. Nếu tổng số cặp đi tiếp không tròn 4/8/16, app{' '}
              <b>vớt thêm các cặp hạng ba</b> có thành tích tốt nhất (thắng → hiệu số → điểm ghi) cho
              đủ nhánh. Có thể tắt tuỳ chọn này khi tạo giải.
            </li>
            <li>
              Ví dụ 3 bảng: 3 nhất + 3 nhì = 6 cặp, vớt thêm 2 hạng ba tốt nhất → đủ 8 cặp, 4 cặp tứ
              kết, không có trận trống.
            </li>
            <li>
              Xếp nhánh theo <b>hạt giống</b>: cặp mạnh nhất gặp cặp yếu nhất. Nếu vẫn thiếu để tròn
              nhánh, các cặp đầu bảng được <b>miễn vòng 1 (bye)</b>.
            </li>
            <li>App tự tránh cho 2 cặp cùng bảng gặp lại nhau ngay vòng đầu knockout.</li>
          </ul>
        </Section>

        <div className="guide-foot">
          Đổi thể thức hoặc chia lại bảng sẽ xoá lịch và tỉ số đã nhập — app luôn hỏi xác nhận trước
          khi xoá.
        </div>
      </Drawer>
    </>
  )
}
