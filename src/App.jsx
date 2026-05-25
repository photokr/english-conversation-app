import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { storage } from './lib/storage'

import LoginPage        from './pages/LoginPage'
import HomePage         from './pages/HomePage'
import ScenarioListPage from './pages/ScenarioListPage'
import ConversationPage from './pages/ConversationPage'
import ProgressPage     from './pages/ProgressPage'

function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  // 대화 화면에서는 탭 바 숨김
  if (path.startsWith('/conversation')) return null

  const tabs = [
    { path: '/',          icon: '🏠', label: '홈' },
    { path: '/scenarios', icon: '📚', label: '시나리오' },
    { path: '/progress',  icon: '📈', label: '진도' },
  ]

  return (
    <nav className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.path}
          className={`tab-item ${path === t.path ? 'active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

function AppContent() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = storage.getUser()
    setUser(saved)
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner-dark" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  return (
    <>
      <Routes>
        <Route path="/"                   element={<HomePage user={user} />} />
        <Route path="/scenarios"          element={<ScenarioListPage />} />
        <Route path="/conversation/:id"   element={<ConversationPage />} />
        <Route path="/progress"           element={<ProgressPage user={user} />} />
      </Routes>
      <TabBar />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppContent />
      </div>
    </BrowserRouter>
  )
}
