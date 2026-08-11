const DEFAULT_API_BASE_URL = 'http://localhost:3000/api'

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
}

export function getAuthToken() {
  return localStorage.getItem('token')
}

export function resolveEvidenceFileUrl(evidenceId) {
  if (!evidenceId) return ''

  const apiBase = getApiBaseUrl().replace(/\/$/, '')
  return `${apiBase}/evidence/${evidenceId}/file`
}

export async function fetchEvidenceBlob(evidenceId) {
  const token = getAuthToken()
  if (!token || !evidenceId) return null

  const response = await fetch(resolveEvidenceFileUrl(evidenceId), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) return null
  return response.blob()
}

export async function fetchEvidenceBlobUrl(evidenceId) {
  const blob = await fetchEvidenceBlob(evidenceId)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export function resolveAssetUrl(filePath) {
  if (!filePath) return ''

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  const apiBase = getApiBaseUrl().replace(/\/$/, '')
  const assetBase = apiBase.replace(/\/api$/, '')
  const path = filePath.startsWith('/') ? filePath : `/${filePath}`

  return `${assetBase}${path}`
}
