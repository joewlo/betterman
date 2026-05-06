const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || res.statusText)
  }
  return res.json()
}

const api = {
  // Health
  health: () => request('/health'),

  // Environments
  getEnvironments: () => request('/environments/'),
  getEnvironment: (id) => request(`/environments/${id}`),
  createEnvironment: (data) => request('/environments/', { method: 'POST', body: JSON.stringify(data) }),
  updateEnvironment: (id, data) => request(`/environments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEnvironment: (id) => request(`/environments/${id}`, { method: 'DELETE' }),

  // Collections
  getCollections: () => request('/collections/'),
  getCollection: (id) => request(`/collections/${id}`),
  createCollection: (data) => request('/collections/', { method: 'POST', body: JSON.stringify(data) }),
  updateCollection: (id, data) => request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCollection: (id) => request(`/collections/${id}`, { method: 'DELETE' }),

  // Requests
  getRequests: (collectionId) => request(`/requests/${collectionId ? `?collection_id=${collectionId}` : ''}`),
  getRequest: (id) => request(`/requests/${id}`),
  createRequest: (data) => request('/requests/', { method: 'POST', body: JSON.stringify(data) }),
  updateRequest: (id, data) => request(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),

  // Execute
  execute: (data) => request('/execute', { method: 'POST', body: JSON.stringify(data) }),

  // Variables
  resolveVariables: (data) => request('/resolve-variables', { method: 'POST', body: JSON.stringify(data) }),

  // Session Variables
  getSessionVars: () => request('/session-variables/'),
  setSessionVar: (data) => request('/session-variables/', { method: 'POST', body: JSON.stringify(data) }),
  clearSessionVars: () => request('/session-variables/', { method: 'DELETE' }),
  deleteSessionVar: (key) => request(`/session-variables/${key}`, { method: 'DELETE' }),

  // Import / Export
  importCurl: (data) => request('/import/curl', { method: 'POST', body: JSON.stringify(data) }),
  importPostman: (data) => request('/import/postman', { method: 'POST', body: JSON.stringify(data) }),
  exportCurl: (id) => request(`/export/curl/${id}`),
}

export default api
