const API_BASE = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')

let memoryToken = null
let memoryEmail = null

const LS_TOKEN = 'mertflix_auth_token'
const LS_EMAIL = 'mertflix_auth_email'

// Load persisted auth once at startup.
if (typeof window !== 'undefined') {
  try {
    const t = localStorage.getItem(LS_TOKEN)
    const e = localStorage.getItem(LS_EMAIL)
    if (t) memoryToken = t
    if (e) memoryEmail = e
  } catch {
  }
}

export function getApiBase() {
  return API_BASE
}

export function getAuthToken() {
  return memoryToken
}

export function clearAuthToken() {
  memoryToken = null
  memoryEmail = null

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_EMAIL)
    } catch {
    }
  }
}

export function setAuthToken(token, { email = null, persist = true } = {}) {
  memoryToken = token
  if (email) memoryEmail = email

  if (persist && typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_TOKEN, token)
      if (email) localStorage.setItem(LS_EMAIL, email)
    } catch {
    }
  }
}

export function getAuthEmail() {
  return memoryEmail
}

export function setAuthEmail(email, { persist = true } = {}) {
  memoryEmail = email
  if (persist && typeof window !== 'undefined') {
    try {
      if (email) localStorage.setItem(LS_EMAIL, String(email))
      else localStorage.removeItem(LS_EMAIL)
    } catch {
    }
  }
}

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = { Accept: 'application/json' }

  const auth = token || memoryToken
  if (auth) headers.Authorization = `Bearer ${auth}`

  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(url, { method, headers, body: payload })

  let data = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try {
      data = await res.json()
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) ? String(data.error || data.message) : `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}
