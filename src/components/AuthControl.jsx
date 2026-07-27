import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Input, App as AntApp, Dropdown } from 'antd'
import {
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useAuth, login, logout } from '../store'

// Màn hình hẹp (điện thoại): nút chỉ còn icon để chừa chỗ cho tiêu đề + nút
// hành động của trang.
function useCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 480,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 479px)')
    const on = (e) => setCompact(e.matches)
    setCompact(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return compact
}

// Nút đăng nhập/đăng xuất quản trị (Supabase, một mật khẩu chung).
//  - khách (chưa đăng nhập) → nút "Đăng nhập"
//  - admin (đã đăng nhập)  → nút "Quản trị" (menu: Đăng xuất)
export default function AuthControl() {
  const { message } = AntApp.useApp()
  const auth = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const boxRef = useRef(null)
  const compact = useCompact()

  // Nút này nổi (fixed) nên không chiếm chỗ trong luồng: đo bề rộng thật rồi
  // ghi vào --auth-slot-w để .app-topbar chừa đúng khoảng đó, tránh đè lên
  // nút hành động bên phải của từng trang (Tạo / Dán / Xoá hết…).
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const apply = () => {
      const w = Math.ceil(el.getBoundingClientRect().width)
      if (w > 0) document.documentElement.style.setProperty('--auth-slot-w', `${w}px`)
    }
    apply()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', apply)
      return () => window.removeEventListener('resize', apply)
    }
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [auth.unlocked, compact])

  const doLogin = async () => {
    setBusy(true)
    const r = await login(pw)
    setBusy(false)
    if (!r.ok) {
      message.error(r.msg)
      return
    }
    message.success('Đã đăng nhập · chế độ quản trị')
    setLoginOpen(false)
    setPw('')
  }

  const doLogout = async () => {
    await logout()
    message.success('Đã đăng xuất · chế độ chỉ xem')
  }

  let trigger
  if (!auth.unlocked) {
    trigger = (
      <Button
        size="small"
        type="primary"
        icon={<LoginOutlined />}
        onClick={() => setLoginOpen(true)}
        title="Đăng nhập quản trị"
        aria-label="Đăng nhập quản trị"
      >
        {compact ? null : 'Đăng nhập'}
      </Button>
    )
  } else {
    trigger = (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất' }],
          onClick: ({ key }) => {
            if (key === 'logout') doLogout()
          },
        }}
      >
        <Button size="small" icon={<UnlockOutlined />} title="Quản trị" aria-label="Quản trị">
          {compact ? null : 'Quản trị'}
        </Button>
      </Dropdown>
    )
  }

  return (
    <>
      <div className="auth-control" ref={boxRef}>
        {trigger}
      </div>

      <Modal
        title="Đăng nhập quản trị"
        open={loginOpen}
        onOk={doLogin}
        onCancel={() => {
          setLoginOpen(false)
          setPw('')
        }}
        okText="Đăng nhập"
        cancelText="Huỷ"
        confirmLoading={busy}
      >
        <div className="stack" style={{ marginTop: 12 }}>
          <div style={{ color: 'var(--shell-muted)', fontSize: 12 }}>
            Nhập mật khẩu quản trị để tạo/sửa giải. Không có mật khẩu vẫn xem được mọi thông tin.
          </div>
          <Input.Password
            placeholder="Mật khẩu"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            prefix={<LockOutlined />}
            onPressEnter={doLogin}
            autoFocus
          />
        </div>
      </Modal>
    </>
  )
}
