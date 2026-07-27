import { useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { Spin, Result, Button } from 'antd'
import {
  TrophyOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ScheduleOutlined,
  OrderedListOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import TournamentsPage from './pages/TournamentsPage'
import AthletesPage from './pages/AthletesPage'
import PairingPage from './pages/PairingPage'
import MatchesPage from './pages/MatchesPage'
import StandingsPage from './pages/StandingsPage'
import AuthControl from './components/AuthControl'
import GuideDrawer from './components/GuideDrawer'
import { initStore, reload, useAppStatus } from './store'

const TABS = [
  { to: '/tournaments', label: 'Giải', icon: <TrophyOutlined /> },
  { to: '/athletes', label: 'VĐV', icon: <TeamOutlined /> },
  { to: '/pairing', label: 'Phân cặp', icon: <ApartmentOutlined /> },
  { to: '/matches', label: 'Trận', icon: <ScheduleOutlined /> },
  { to: '/standings', label: 'BXH', icon: <OrderedListOutlined /> },
]

export default function App() {
  const location = useLocation()
  const { loading, error, ready } = useAppStatus()

  useEffect(() => {
    initStore()
  }, [])

  // Chưa cấu hình Supabase (thiếu env) — báo rõ thay vì crash.
  if (!ready) {
    return (
      <div className="app-shell" style={{ paddingBottom: 0 }}>
        <Result
          status="warning"
          title="Chưa cấu hình Supabase"
          subTitle="Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Xem file .env.example."
          style={{ margin: 'auto' }}
        />
      </div>
    )
  }

  // Đang tải lần đầu.
  if (loading) {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Đang tải dữ liệu…" style={{ margin: 'auto' }}>
          <div style={{ padding: 40 }} />
        </Spin>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AuthControl />
      <GuideDrawer />
      {error && (
        <div
          style={{
            background: 'rgba(220,38,38,0.15)',
            border: '1px solid rgba(248,113,113,0.5)',
            color: '#fecaca',
            padding: '8px 14px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'center',
          }}
        >
          <span>Lỗi kết nối: {error}</span>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => reload()}>
            Thử lại
          </Button>
        </div>
      )}
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/tournaments" replace />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/athletes" element={<AthletesPage />} />
          <Route path="/pairing" element={<PairingPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/standings" element={<StandingsPage />} />
        </Routes>
      </main>
      <nav className="bottom-nav">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              'nav-tab' + (isActive || location.pathname === t.to ? ' active' : '')
            }
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
