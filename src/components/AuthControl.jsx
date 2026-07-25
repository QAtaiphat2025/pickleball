import { useState } from 'react'
import { Button, Modal, Input, App as AntApp, Dropdown } from 'antd'
import {
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useAuth, login, logout } from '../store'

// Nút đăng nhập/đăng xuất quản trị (Supabase, một mật khẩu chung).
//  - khách (chưa đăng nhập) → nút "Đăng nhập"
//  - admin (đã đăng nhập)  → nút "Quản trị" (menu: Đăng xuất)
export default function AuthControl() {
  const { message } = AntApp.useApp()
  const auth = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

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
      <Button size="small" type="primary" icon={<LoginOutlined />} onClick={() => setLoginOpen(true)}>
        Đăng nhập
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
        <Button size="small" icon={<UnlockOutlined />}>
          Quản trị
        </Button>
      </Dropdown>
    )
  }

  return (
    <>
      <div className="auth-control">{trigger}</div>

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
