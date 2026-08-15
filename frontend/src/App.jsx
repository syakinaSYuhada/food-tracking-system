import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import RequireRole from './components/RequireRole'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetails from './pages/ProductDetails'
import Batches from './pages/Batches'
import BatchDetails from './pages/BatchDetails'
import Defects from './pages/Defects'
import DefectDetails from './pages/DefectDetails'
import CorrectiveActions from './pages/CorrectiveActions'
import CorrectiveActionDetails from './pages/CorrectiveActionDetails'
import Reports from './pages/Reports'
import Users from './pages/Users'
import ActivityLog from './pages/ActivityLog'
import Profile from './pages/Profile'
import api from './api/client'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  async function restoreSession() {
    const token = localStorage.getItem('token')
    if (!token) {
      setAuthLoading(false)
      return
    }

    try {
      const res = await api.get('/auth/me')
      setUser(res.data.data)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    restoreSession()
  }, [])

  useEffect(() => {
    function handleLogout() {
      setUser(null)
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading session...</div>
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={handleLogout}>
        <RequireRole user={user}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/products" element={<Products user={user} />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/batches" element={<Batches user={user} />} />
            <Route path="/batches/:id" element={<BatchDetails />} />
            <Route path="/defects" element={<Defects user={user} />} />
            <Route path="/defects/:id" element={<DefectDetails user={user} />} />
            <Route path="/corrective-actions" element={<CorrectiveActions user={user} />} />
            <Route path="/corrective-actions/:id" element={<CorrectiveActionDetails user={user} />} />
            <Route path="/reports" element={<Reports user={user} />} />
            <Route path="/users" element={<Users />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/profile" element={<Profile user={user} />} />
          </Routes>
        </RequireRole>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
