import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
  AlertTriangle,
  CheckSquare,
  BarChart2,
  Users,
  ClipboardList,
  LogOut,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu
} from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import Button from '../components/Button'
import NotificationsPanel from '../components/NotificationsPanel'
import { getDefaultPathForRole, getUserInitials, isManager, isManagerOnlyPath } from '../utils/roleAccess'
import { buildNotifications } from '../utils/notifications'
import { fetchNotificationData } from '../utils/notificationData'

const managerLinks = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Batches', path: '/batches', icon: Layers },
  { label: 'Defect Records', path: '/defects', icon: AlertTriangle },
  { label: 'Corrective Actions', path: '/corrective-actions', icon: CheckSquare },
  { label: 'Reports', path: '/reports', icon: BarChart2 },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Activity Log', path: '/activity-log', icon: ClipboardList }
]

const workerLinks = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'My Reports', path: '/defects', icon: FileText },
  { label: 'My Work', path: '/corrective-actions', icon: CheckSquare }
]

function AppShell({ children, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const notificationsRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const links = isManager(user) ? managerLinks : workerLinks
  const sidebarWidth = isMobile ? 240 : (collapsed ? 64 : 240)
  const contentMargin = isMobile ? 0 : sidebarWidth

  function handleLogout() {
    if (!window.confirm('Log out of this session?')) return
    onLogout()
    setShowNotifications(false)
  }

  useEffect(() => {
    if (user?.role === 'worker' && isManagerOnlyPath(location.pathname)) {
      navigate(getDefaultPathForRole(user.role), { replace: true })
    }
  }, [user, location.pathname, navigate])

  useEffect(() => {
    async function loadCount() {
      try {
        const { actions, defects } = await fetchNotificationData(user)
        setNotificationCount(buildNotifications(user, actions, defects).count)
      } catch (error) {
        console.error(error)
        setNotificationCount(0)
      }
    }

    loadCount()
  }, [user, location.pathname])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')

    function updateViewport() {
      setIsMobile(mediaQuery.matches)
      if (!mediaQuery.matches) {
        setMobileNavOpen(false)
      }
    }

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    setMobileNavOpen(false)
    setShowNotifications(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  return (
    <div className="min-h-screen bg-softBg text-brand-ink">
      {isMobile && mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-brand-900/50 backdrop-blur-[2px] animate-fade-in"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-white/5 bg-brand-900 shadow-float transition-transform duration-300 ease-smooth md:translate-x-0',
          isMobile ? (mobileNavOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        ].join(' ')}
        style={{ width: sidebarWidth }}
      >
        {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand-900 bg-brand-500 shadow-card transition-transform duration-200 hover:scale-105"
        >
          {collapsed ? <ChevronRight size={12} color="white" /> : <ChevronLeft size={12} color="white" />}
        </button>
        )}

        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
          {isMobile ? (
            <BrandLogo inverted showTagline={false} />
          ) : collapsed ? (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-xs font-extrabold text-white shadow-card">
              KN
            </div>
          ) : (
            <BrandLogo inverted showTagline={false} />
          )}
        </div>

        {(!collapsed || isMobile) && (
          <div className="border-b border-white/10 px-4 py-4">
            <NavLink
              to="/profile"
              onClick={() => {
                if (isMobile) setMobileNavOpen(false)
              }}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-1 py-1 transition-colors duration-200',
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                ].join(' ')
              }
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-xs font-bold text-white ring-2 ring-white/10">
                {getUserInitials(user?.full_name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-white">
                  {user?.full_name || 'User'}
                </div>
                <span className="mt-1 inline-block rounded bg-brand-500/20 px-1.5 py-0.5 text-xs font-medium capitalize text-brand-300">
                  {user?.role}
                </span>
              </div>
            </NavLink>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {links.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={!isMobile && collapsed ? item.label : undefined}
                onClick={() => {
                  if (isMobile) setMobileNavOpen(false)
                }}
                className={({ isActive }) =>
                  [
                    'sidebar-link',
                    isActive ? 'sidebar-link-active' : 'sidebar-link-idle'
                  ].join(' ')
                }
              >
                <Icon size={18} className="shrink-0" />
                {(!collapsed || isMobile) && <span className="truncate text-sm font-medium">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-2 pb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-400 transition-all duration-200 ease-smooth hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            {(!collapsed || isMobile) && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="min-h-screen transition-all duration-300 ease-smooth" style={{ marginLeft: contentMargin }}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-brand-border/80 bg-white/80 px-4 shadow-xs backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
                size="sm"
                color="slate"
                variant="subtle"
              >
                <Menu size={18} /> Menu
              </Button>
            )}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                [
                  'text-body text-brand-muted rounded-xl px-2 py-1 transition-colors duration-200',
                  isActive ? 'bg-brand-50 text-brand-ink' : 'hover:bg-brand-50/60 hover:text-brand-ink'
                ].join(' ')
              }
            >
              Signed in as <span className="font-semibold text-brand-ink">{user?.full_name}</span>
              <span className="mx-2 text-brand-border">·</span>
              <span className="font-semibold capitalize text-brand-500">{user?.role}</span>
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((current) => !current)}
                className="icon-btn relative"
              >
                <Bell size={16} />
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white shadow-xs">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationsPanel
                  user={user}
                  onClose={() => setShowNotifications(false)}
                  onNavigate={navigate}
                />
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

export default AppShell
