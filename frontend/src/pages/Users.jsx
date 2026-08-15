import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, UserCircle, Users as UsersIcon, Shield, HardHat } from 'lucide-react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import KPICard from '../components/KPICard'
import ListPagination from '../components/ListPagination'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import UserFormModal from '../components/UserFormModal'
import { paginateItems } from '../utils/pagination'
import { isManager } from '../utils/roleAccess'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'

function UserRow({ user, managerView, currentUserId, onToggleStatus, togglingUserId }) {
  const initials = String(user.full_name || user.username || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isActive = String(user.account_status || '').toLowerCase() === 'active'
  const isSelf = Number(user.id) === Number(currentUserId)
  const isToggling = togglingUserId === user.id
  const showStatusAction = managerView && !isSelf

  return (
    <article className="compact-list-row">
      <div className="list-row-inner">
        <div className="list-row-icon bg-brand-50 text-brand-700">
          {initials || <UserCircle size={14} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="list-row-title">{user.full_name}</p>
          <p className="list-row-meta">
            @{user.username} · {user.email}
          </p>
        </div>

        <div className="list-row-actions">
          <StatusBadge value={user.role} />
          <StatusBadge value={user.account_status} />
          {showStatusAction && (
            <Button
              color={isActive ? 'red' : 'green'}
              variant="subtle"
              size="sm"
              className="list-action-btn"
              disabled={isToggling}
              onClick={() => onToggleStatus(user)}
            >
              {isToggling ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function Users() {
  const toast = useToast()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState(null)

  const managerView = isManager(currentUser)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/users', { params: { include_inactive: true } })
      setUsers(res.data.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await api.get('/auth/me')
        setCurrentUser(res.data.data || null)
      } catch (error) {
        console.error(error)
      }
    }

    loadSession()
    loadUsers()
  }, [loadUsers])

  async function handleToggleStatus(user) {
    const nextStatus = String(user.account_status || '').toLowerCase() === 'active'
      ? 'inactive'
      : 'active'

    if (nextStatus === 'inactive') {
      const confirmed = await confirm({
        title: 'Deactivate this user?',
        message: `Deactivate ${user.full_name}? They will not be able to log in until reactivated.`,
        confirmLabel: 'Deactivate',
        danger: true
      })
      if (!confirmed) return
    }

    setTogglingUserId(user.id)
    try {
      await api.patch(`/users/${user.id}/status`, { account_status: nextStatus })
      await loadUsers()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Could not update account status.')
    } finally {
      setTogglingUserId(null)
    }
  }

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase()

    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesSearch =
        !keyword ||
        [user.full_name, user.username, user.email, user.role]
          .some((value) => String(value || '').toLowerCase().includes(keyword))

      return matchesRole && matchesSearch
    })
  }, [users, search, roleFilter])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page])

  const managers = users.filter((user) => user.role === 'manager').length
  const workers = users.filter((user) => user.role === 'worker').length

  if (loading) return <LoadingState label="Loading users..." />

  return (
    <div className="list-page">
      {showAdd && (
        <UserFormModal
          onClose={() => setShowAdd(false)}
          onSaved={loadUsers}
        />
      )}

      <PageHeader
        title="Users"
        subtitle="Registered accounts and role assignments, including inactive accounts."
      >
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={14} />
          Add User
        </Button>
      </PageHeader>

      <div className="list-kpi-strip">
        <KPICard title="Users" value={users.length} tone="blue" icon={<UsersIcon size={14} />} />
        <KPICard title="Managers" value={managers} tone="purple" icon={<Shield size={14} />} />
        <KPICard title="Workers" value={workers} tone="green" icon={<HardHat size={14} />} />
      </div>

      <div className="list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar-search">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, username, email..."
              className="list-toolbar-search-input"
            />
          </div>

          <select
            aria-label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="list-toolbar-select"
          >
            <option value="all">All Roles</option>
            <option value="manager">Manager</option>
            <option value="worker">Worker</option>
          </select>
        </div>

        <div className="list-panel-body">
          {paged.items.length === 0 ? (
            search || roleFilter !== 'all' ? (
              <EmptyState
                title="No users match this filter"
                description="Try a different search or role filter."
              />
            ) : (
              <EmptyState
                title="No users yet"
                description="No users are registered in the system yet."
                actionLabel="Add User"
                onAction={() => setShowAdd(true)}
              />
            )
          ) : (
            <div className="compact-list-stack">
              {paged.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  managerView={managerView}
                  currentUserId={currentUser?.id}
                  onToggleStatus={handleToggleStatus}
                  togglingUserId={togglingUserId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ListPagination
        page={paged.page}
        totalPages={paged.totalPages}
        totalItems={paged.total}
        pageSize={paged.pageSize}
        onPageChange={setPage}
      />
    </div>
  )
}
