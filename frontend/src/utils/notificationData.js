import api from '../api/client'
import { isManager } from './roleAccess'

export async function fetchNotificationData(user) {
  if (isManager(user)) {
    const [actionsRes, defectsRes] = await Promise.all([
      api.get('/corrective-actions'),
      api.get('/defects')
    ])
    return {
      actions: actionsRes.data.data || [],
      defects: defectsRes.data.data || []
    }
  }

  if (user?.id) {
    const [actionsRes, defectsRes] = await Promise.all([
      api.get('/corrective-actions', { params: { assigned_to: user.id } }),
      api.get('/defects')
    ])
    return {
      actions: actionsRes.data.data || [],
      defects: defectsRes.data.data || []
    }
  }

  return { actions: [], defects: [] }
}
