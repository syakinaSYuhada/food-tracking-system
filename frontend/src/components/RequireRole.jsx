import { Navigate, useLocation } from 'react-router-dom'
import { getDefaultPathForRole, isManagerOnlyPath } from '../utils/roleAccess'

function RequireRole({ user, children }) {
  const location = useLocation()

  if (user?.role === 'worker' && isManagerOnlyPath(location.pathname)) {
    return <Navigate to={getDefaultPathForRole(user.role)} replace />
  }

  return children
}

export default RequireRole
