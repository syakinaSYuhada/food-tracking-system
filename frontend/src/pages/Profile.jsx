import { UserCircle } from 'lucide-react'

import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { getUserInitials } from '../utils/roleAccess'

function ProfileField({ label, value, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-brand-muted">{label}</p>
      <div className="mt-1 font-semibold text-brand-ink">{children ?? value ?? '—'}</div>
    </div>
  )
}

function Profile({ user }) {
  const initials = getUserInitials(user?.full_name || user?.username)

  return (
    <div className="list-page">
      <PageHeader
        title="My Profile"
        subtitle="Your account details for this session."
        eyebrow="Account"
      />

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start gap-4 border-b border-brand-border/60 pb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
            {initials || <UserCircle size={24} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="typo-display text-xl">{user?.full_name || 'User'}</h2>
            <p className="mt-1 text-sm text-brand-muted">@{user?.username}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={user?.role} />
              <StatusBadge value={user?.account_status} />
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <ProfileField label="Full Name" value={user?.full_name} />
          <ProfileField label="Username" value={user?.username ? `@${user.username}` : '—'} />
          <ProfileField label="Email" value={user?.email} />
          <ProfileField label="Role">
            <StatusBadge value={user?.role} />
          </ProfileField>
          <ProfileField label="Account Status">
            <StatusBadge value={user?.account_status} />
          </ProfileField>
          <ProfileField label="User ID" value={user?.id != null ? String(user.id) : '—'} />
        </dl>
      </div>
    </div>
  )
}

export default Profile
