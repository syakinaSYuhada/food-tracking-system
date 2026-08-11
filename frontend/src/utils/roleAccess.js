export const MANAGER_ONLY_PREFIXES = ['/products', '/batches', '/reports', '/users', '/activity-log']

export function isManager(roleOrUser) {
  if (roleOrUser && typeof roleOrUser === 'object') {
    return roleOrUser.role === 'manager'
  }
  return roleOrUser === 'manager'
}

export function getUserInitials(fullName) {
  return String(fullName || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function isManagerOnlyPath(pathname) {
  return MANAGER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function getDefaultPathForRole(role) {
  return role === 'worker' ? '/corrective-actions' : '/'
}

export function resolveUserForRole(users, role) {
  if (!Array.isArray(users) || users.length === 0) return null
  return users.find((user) => user.role === role) || null
}

export function isAssignedToUser(record, userId) {
  if (!record || userId == null) return false
  return Number(record.assigned_to ?? record.assignedTo) === Number(userId)
}
