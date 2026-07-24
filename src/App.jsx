import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import {
  TrophyOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ScheduleOutlined,
  OrderedListOutlined,
} from '@ant-design/icons'
import TournamentsPage from './pages/TournamentsPage'
import AthletesPage from './pages/AthletesPage'
import PairingPage from './pages/PairingPage'
import MatchesPage from './pages/MatchesPage'
import StandingsPage from './pages/StandingsPage'

const TABS = [
  { to: '/tournaments', label: 'Giải', icon: <TrophyOutlined /> },
  { to: '/athletes', label: 'VĐV', icon: <TeamOutlined /> },
  { to: '/pairing', label: 'Phân cặp', icon: <ApartmentOutlined /> },
  { to: '/matches', label: 'Trận', icon: <ScheduleOutlined /> },
  { to: '/standings', label: 'BXH', icon: <OrderedListOutlined /> },
]

export default function App() {
  const location = useLocation()
  return (
    <div className="app-shell">
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
