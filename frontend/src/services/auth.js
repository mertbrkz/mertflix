import { apiFetch, clearAuthToken, setAuthToken } from './api'

export async function register(email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: { email, password },
  })
}

export async function verifyEmail(email, code) {
  return apiFetch('/auth/verify-email', {
    method: 'POST',
    body: { email, code },
  })
}

export async function login(email, password, { persist = true } = {}) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  if (data?.token) {
    setAuthToken(data.token, { email, persist })
    return { ok: true }
  }

  if (data?.requires2fa) {
    return { requires2fa: true, challengeId: data.challengeId || null }
  }

  throw new Error('Unexpected login response')
}

export async function login2fa(email, challengeId, code, { persist = true } = {}) {
  const data = await apiFetch('/auth/login-2fa', {
    method: 'POST',
    body: { email, challengeId, code },
  })

  if (!data?.token) throw new Error('Token missing')
  setAuthToken(data.token, { email, persist })
  return { ok: true }
}

export function logout() {
  clearAuthToken()
}

export async function requestPasswordReset(email) {
  return apiFetch('/auth/request-password-reset', {
    method: 'POST',
    body: { email },
  })
}

export async function resetPassword(email, code, newPassword) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  })
}
